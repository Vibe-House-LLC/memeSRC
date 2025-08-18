import { useState, useEffect, useCallback, useRef } from 'react'; // Add useCallback and useRef
import { getLayoutsForPanelCount } from '../config/CollageConfig';

// Debug flag - opt-in via localStorage while in development
const DEBUG_MODE = process.env.NODE_ENV === 'development' && typeof window !== 'undefined' && (() => {
  try { return localStorage.getItem('meme-src-collage-debug') === '1'; } catch { return false; }
})();

/**
 * Custom hook to manage collage state
 */
export const useCollageState = () => {
  // selectedImages now stores: { originalUrl: string, displayUrl: string, subtitle?: string, subtitleShowing?: boolean, metadata?: object }[]
  const [selectedImages, setSelectedImages] = useState([]);
  // panelImageMapping still maps: { panelId: imageIndex }
  const [panelImageMapping, setPanelImageMapping] = useState({});
  // panelTransforms maps: { panelId: { scaleRatio: number, positionXPercent: number, positionYPercent: number } }
  const [panelTransforms, setPanelTransforms] = useState({});
  // panelTexts maps: { panelId: { content: string, fontSize: number, fontWeight: string, fontFamily: string, color: string, strokeWidth: number } }
  const [panelTexts, setPanelTexts] = useState({});
  // lastUsedTextSettings to remember settings across panels
  const [lastUsedTextSettings] = useState({
    fontSize: 20,
    fontWeight: 400,
    fontFamily: 'Arial',
    color: '#ffffff',
    strokeWidth: 2
  });
  
  // Auto-save to library is disabled; keep state for legacy props but do not use
  const [autoSaveToLibrary, setAutoSaveToLibrary] = useState(false);
  const [libraryRefreshTrigger] = useState(null);
  
  // Track image data URLs that have been saved to prevent duplicates
  const savedImageDataUrls = useRef(new Set());
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [selectedAspectRatio, setSelectedAspectRatio] = useState('portrait');
  const [panelCount, setPanelCount] = useState(2); // Default panel count of 2
  const [finalImage, setFinalImage] = useState(null);
  const [isCreatingCollage, setIsCreatingCollage] = useState(false);
  const [borderThickness, setBorderThickness] = useState(() => {
    const savedBorderThickness = localStorage.getItem('meme-src-collage-border-thickness');
    return savedBorderThickness || 'medium'; // Default to medium border thickness
  });

  const [borderColor, setBorderColor] = useState(() => {
    const savedCustomColor = localStorage.getItem('meme-src-collage-custom-color');
    return savedCustomColor || '#FFFFFF'; // Default white border color
  });

  // Refs to track previous values for comparison
  const prevLayoutValues = useRef({
    panelCount: null,
    selectedAspectRatio: null,
    selectedTemplate: null
  });

  // Ref to track previous border thickness for transform adjustment
  const prevBorderThickness = useRef(null);

  useEffect(() => {
    localStorage.setItem('meme-src-collage-custom-color', borderColor);
  }, [borderColor]);

  useEffect(() => {
    localStorage.setItem('meme-src-collage-border-thickness', borderThickness);
  }, [borderThickness]);

  /**
   * Reset all panel transforms (zoom/pan positions) to defaults.
   * Used when layout, aspect ratio, or template changes.
   */
  const resetPanelTransforms = useCallback(() => {
    setPanelTransforms({});
    if (DEBUG_MODE) console.log("Reset all panel transforms due to layout change");
  }, []);

  /**
   * Reset all panel texts to defaults.
   * Used when layout changes significantly.
   */
  const resetPanelTexts = useCallback(() => {
    setPanelTexts({});
    if (DEBUG_MODE) console.log("Reset all panel texts due to layout change");
  }, []);

  // Initialize template on mount
  useEffect(() => {
    if (DEBUG_MODE) console.log("useCollageState initializing...");
    const initialTemplates = getLayoutsForPanelCount(panelCount, selectedAspectRatio);
    if (initialTemplates.length > 0) {
      if (DEBUG_MODE) console.log("Setting initial template:", initialTemplates[0].id);
      setSelectedTemplate(initialTemplates[0]);
    } else {
      console.warn("No initial templates found!");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once

  // Adjust transforms when border thickness changes
  useEffect(() => {
    if (prevBorderThickness.current !== null && prevBorderThickness.current !== borderThickness) {
      // Simply reset transforms when border thickness changes
      // Let DynamicCollagePreview recalculate initial scale for new panel sizes
      resetPanelTransforms();
      if (DEBUG_MODE) {
        console.log(`Border thickness changed from ${prevBorderThickness.current} to ${borderThickness}, resetting transforms`);
      }
    }
    prevBorderThickness.current = borderThickness;
  }, [borderThickness, resetPanelTransforms]);

  // Select the most suitable template when panel count or aspect ratio changes
  useEffect(() => {
    const compatibleTemplates = getLayoutsForPanelCount(panelCount, selectedAspectRatio);
    const currentTemplateIsCompatible = selectedTemplate &&
         selectedTemplate.minImages <= panelCount &&
         selectedTemplate.maxImages >= panelCount;

    if (DEBUG_MODE) {
      console.log(`[TEMPLATE DEBUG] Panel count: ${panelCount}, aspect ratio: ${selectedAspectRatio}`);
      console.log(`[TEMPLATE DEBUG] Compatible templates:`, compatibleTemplates.map(t => t.name));
      console.log(`[TEMPLATE DEBUG] Current template:`, selectedTemplate?.name);
      console.log(`[TEMPLATE DEBUG] Current template compatible:`, currentTemplateIsCompatible);
    }

    if (!currentTemplateIsCompatible && compatibleTemplates.length > 0) {
        if (DEBUG_MODE) {
          console.log(`[TEMPLATE DEBUG] Switching to template:`, compatibleTemplates[0].name);
        }
        setSelectedTemplate(compatibleTemplates[0]);
    } else if (!selectedTemplate && compatibleTemplates.length > 0) {
        if (DEBUG_MODE) {
          console.log(`[TEMPLATE DEBUG] Setting initial template:`, compatibleTemplates[0].name);
        }
        setSelectedTemplate(compatibleTemplates[0]);
    } else if (compatibleTemplates.length === 0) {
        if (DEBUG_MODE) {
          console.log(`[TEMPLATE DEBUG] No compatible templates found, setting to null`);
        }
        setSelectedTemplate(null);
    }

    // Also adjust panel mapping if template changes panel structure
    if (selectedTemplate) {
        const expectedPanelCount = selectedTemplate.layout?.panels?.length || panelCount;
        const currentMapping = {...panelImageMapping};
        let mappingChanged = false;
        Object.keys(currentMapping).forEach(panelId => {
            if (parseInt(panelId, 10) >= expectedPanelCount) {
                delete currentMapping[panelId];
                mappingChanged = true;
            }
        });
        if (mappingChanged) {
            if (DEBUG_MODE) console.log("Removing excess panel mappings due to template change");
            setPanelImageMapping(currentMapping);
        }
    }

    // Check if any layout-related values have actually changed (not just initial load)
    const prev = prevLayoutValues.current;
    const hasChanges = 
      (prev.panelCount !== null && prev.panelCount !== panelCount) ||
      (prev.selectedAspectRatio !== null && prev.selectedAspectRatio !== selectedAspectRatio) ||
      (prev.selectedTemplate !== null && prev.selectedTemplate?.id !== selectedTemplate?.id);

    // Reset all transforms when layout-related properties change
    // This ensures images get repositioned/rescaled appropriately for the new layout
    if (hasChanges) {
      resetPanelTransforms();
      // Don't reset texts - let the subtitle auto-assignment effect handle text reassignment
      if (DEBUG_MODE) console.log("Layout change detected, resetting transforms only");
    }

    // Update previous values
    prevLayoutValues.current = {
      panelCount,
      selectedAspectRatio,
      selectedTemplate
    };

  }, [panelCount, selectedAspectRatio, selectedTemplate, resetPanelTransforms, resetPanelTexts]);

  // Clean up ObjectURLs when component unmounts or images change
  useEffect(() => () => {
      selectedImages.forEach(imgObj => {
        if (imgObj.originalUrl && typeof imgObj.originalUrl === 'string' && imgObj.originalUrl.startsWith('blob:')) {
          URL.revokeObjectURL(imgObj.originalUrl);
        }
        // Revoke displayUrl only if it's different from original and is a blob
        if (imgObj.displayUrl && typeof imgObj.displayUrl === 'string' && imgObj.displayUrl.startsWith('blob:') && imgObj.displayUrl !== imgObj.originalUrl) {
          URL.revokeObjectURL(imgObj.displayUrl);
        }
      });
    }, [selectedImages]);

  /**
   * Auto-upload to library has been fully disabled per product direction.
   * This is intentionally a no-op.
   */
  const saveToLibraryIfEnabled = useCallback(async () => {}, []);

  /**
   * Add a new image to the collection.
   * Stores the same URL for both original and display initially.
   * @param {string|object} imageData - The image URL (usually base64) or object with subtitle data to add
   */
  const addImage = useCallback(async (imageData) => {
    if (!imageData) return;

    let newImageObject;
    if (typeof imageData === 'string') {
      newImageObject = {
        originalUrl: imageData,
        displayUrl: imageData
      };
      // Auto-save to library disabled
    } else if (typeof imageData === 'object') {
      newImageObject = {
        originalUrl: imageData.originalUrl || imageData.displayUrl || imageData,
        displayUrl: imageData.displayUrl || imageData.originalUrl || imageData,
        subtitle: imageData.subtitle || '',
        subtitleShowing: imageData.subtitleShowing || false,
        metadata: imageData.metadata || {}
      };
      // Auto-save to library disabled
    } else {
      return;
    }

    setSelectedImages(prev => [...prev, newImageObject]);
    if (DEBUG_MODE) console.log("Added image:", newImageObject);
  }, [saveToLibraryIfEnabled]);

  /**
   * Add multiple images to the collection at once.
   * Stores the same URL for both original and display initially for each image.
   * @param {Array} imageDataArray - Array of image URLs (usually base64) or objects with subtitle data to add
   */
  const addMultipleImages = useCallback(async (imageDataArray) => {
    if (!imageDataArray || !Array.isArray(imageDataArray) || imageDataArray.length === 0) return;

    const newImageObjects = [];

    await imageDataArray.reduce(async (prevPromise, imageData) => {
      await prevPromise;
      if (!imageData) return Promise.resolve();

      let newImageObj;
      let metadata = {};

      if (typeof imageData === 'string') {
        newImageObj = {
          originalUrl: imageData,
          displayUrl: imageData
        };
      } else if (typeof imageData === 'object') {
        metadata = imageData.metadata || {};
        newImageObj = {
          originalUrl: imageData.originalUrl || imageData.displayUrl || imageData,
          displayUrl: imageData.displayUrl || imageData.originalUrl || imageData,
          subtitle: imageData.subtitle || '',
          subtitleShowing: imageData.subtitleShowing || false,
          metadata
        };
        if (DEBUG_MODE) {
          console.log(`[SUBTITLE DEBUG] Processing image object:`, {
            originalData: imageData,
            processedData: newImageObj,
            hasSubtitle: !!newImageObj.subtitle
          });
        }
      } else {
        return Promise.resolve();
      }

      // Auto-save to library disabled

      newImageObjects.push(newImageObj);
      return Promise.resolve();
    }, Promise.resolve());

    if (newImageObjects.length > 0) {
      setSelectedImages(prev => [...prev, ...newImageObjects]);
      if (DEBUG_MODE) console.log("Added multiple images:", newImageObjects);
    }
  }, [saveToLibraryIfEnabled]);

  /**
   * Remove an image object by index and update panel mapping.
   * @param {number} indexToRemove - The index of the image object to remove
   */
  const removeImage = useCallback((indexToRemove) => {
    if (indexToRemove < 0 || indexToRemove >= selectedImages.length) return;

    const newImages = [...selectedImages];
    const removedImageObj = newImages.splice(indexToRemove, 1)[0];

    // Clean up blobs
    if (removedImageObj) {
        if (removedImageObj.originalUrl && removedImageObj.originalUrl.startsWith('blob:')) URL.revokeObjectURL(removedImageObj.originalUrl);
        if (removedImageObj.displayUrl && removedImageObj.displayUrl.startsWith('blob:') && removedImageObj.displayUrl !== removedImageObj.originalUrl) URL.revokeObjectURL(removedImageObj.displayUrl);
    }

    setSelectedImages(newImages);

    // Find the panelId(s) that used this image index
    const panelsToRemoveTransform = Object.entries(panelImageMapping)
        .filter(([, mappedIndex]) => mappedIndex === indexToRemove)
        .map(([panelId]) => panelId);

    // Update panel mapping
    const newMapping = {};
    Object.entries(panelImageMapping).forEach(([panelId, mappedIndex]) => {
      if (mappedIndex === indexToRemove) {
        // This panel pointed to the removed image, clear its mapping
      } else if (mappedIndex > indexToRemove) {
        // Adjust index for panels pointing after the removed one
        newMapping[panelId] = mappedIndex - 1;
      } else {
        // Keep index for panels pointing before the removed one
        newMapping[panelId] = mappedIndex;
      }
    });
    setPanelImageMapping(newMapping);

    // Remove transforms and texts for the affected panels
    if (panelsToRemoveTransform.length > 0) {
      setPanelTransforms(prevTransforms => {
        const newTransforms = { ...prevTransforms };
        panelsToRemoveTransform.forEach(panelId => {
          delete newTransforms[panelId];
        });
        if (DEBUG_MODE) console.log(`Removed transforms for panels: ${panelsToRemoveTransform.join(', ')}`);
        return newTransforms;
      });
      
      // Also remove texts for panels that no longer have images
      setPanelTexts(prevTexts => {
        const newTexts = { ...prevTexts };
        panelsToRemoveTransform.forEach(panelId => {
          // Only remove auto-assigned texts, keep manually edited ones
          if (newTexts[panelId] && newTexts[panelId].autoAssigned) {
            delete newTexts[panelId];
          }
        });
        if (DEBUG_MODE) console.log(`Removed auto-assigned texts for panels: ${panelsToRemoveTransform.join(', ')}`);
        return newTexts;
      });
    }

    if (DEBUG_MODE) console.log(`Removed image at index ${indexToRemove}, updated mapping`, newMapping);

  }, [selectedImages, panelImageMapping]);

  /**
   * Update only the displayUrl for an image at a specific index (after cropping).
   * @param {number} index - The index of the image object to update
   * @param {string} croppedDataUrl - The new display image URL (cropped)
   */
  const updateImage = useCallback((index, croppedDataUrl) => {
    if (index >= 0 && index < selectedImages.length && croppedDataUrl) {
      const oldImageObj = selectedImages[index];

      // Clean up the *old* displayUrl if it's a blob and different from original
      if (oldImageObj.displayUrl && typeof oldImageObj.displayUrl === 'string' && 
          oldImageObj.displayUrl.startsWith('blob:') && 
          oldImageObj.displayUrl !== oldImageObj.originalUrl) {
        URL.revokeObjectURL(oldImageObj.displayUrl);
      }

      const newImages = [...selectedImages];
      newImages[index] = {
        ...oldImageObj, // Keep originalUrl
        displayUrl: croppedDataUrl // Update displayUrl
      };
      setSelectedImages(newImages);
      if (DEBUG_MODE) console.log(`Updated display image for index ${index}`, { original: oldImageObj.originalUrl, display: croppedDataUrl });
    } else if (DEBUG_MODE) {
      console.warn(`Failed to update image display URL at index ${index}`);
    }
  }, [selectedImages]);


  /**
   * Replace an image object entirely at a specific index (for new uploads replacing existing).
   * Updates both originalUrl and displayUrl.
   * @param {number} index - The index of the image object to replace
   * @param {string} newBase64Image - The new image URL (base64)
   */
  const replaceImage = useCallback(async (index, newBase64Image) => {
    if (index >= 0 && index < selectedImages.length && newBase64Image) {
        const oldImageObj = selectedImages[index];
        // Clean up old blobs
        if (oldImageObj.originalUrl && typeof oldImageObj.originalUrl === 'string' &&
            oldImageObj.originalUrl.startsWith('blob:')) {
          URL.revokeObjectURL(oldImageObj.originalUrl);
        }
        if (oldImageObj.displayUrl && typeof oldImageObj.displayUrl === 'string' &&
            oldImageObj.displayUrl.startsWith('blob:') &&
            oldImageObj.displayUrl !== oldImageObj.originalUrl) {
          URL.revokeObjectURL(oldImageObj.displayUrl);
        }

        const newImages = [...selectedImages];
        newImages[index] = { originalUrl: newBase64Image, displayUrl: newBase64Image };
        setSelectedImages(newImages);

        // Auto-save to library disabled

        // Find the panelId(s) that use this image index and reset their transforms
        const panelsToResetTransform = Object.entries(panelImageMapping)
            .filter(([, mappedIndex]) => mappedIndex === index)
            .map(([panelId]) => panelId);

        // Reset transforms for the affected panels to default values
        if (panelsToResetTransform.length > 0) {
          setPanelTransforms(prevTransforms => {
            const newTransforms = { ...prevTransforms };
            panelsToResetTransform.forEach(panelId => {
              delete newTransforms[panelId]; // Remove transform to reset to default
            });
            if (DEBUG_MODE) console.log(`Reset transforms for panels: ${panelsToResetTransform.join(', ')}`);
            return newTransforms;
          });
        }

        if (DEBUG_MODE) console.log(`Replaced image at index ${index} with new file.`);
    } else if (DEBUG_MODE) {
      console.warn(`Failed to replace image at index ${index}`);
    }
  }, [selectedImages, panelImageMapping, saveToLibraryIfEnabled]);


  /**
   * Clear all selected images, mappings, and texts.
   */
  const clearImages = useCallback(() => {
    // Clean up all potential blob URLs first
    selectedImages.forEach(imgObj => {
      if (imgObj.originalUrl && imgObj.originalUrl.startsWith('blob:')) URL.revokeObjectURL(imgObj.originalUrl);
      if (imgObj.displayUrl && imgObj.displayUrl.startsWith('blob:') && imgObj.displayUrl !== imgObj.originalUrl) URL.revokeObjectURL(imgObj.displayUrl);
    });

    setSelectedImages([]);
    setPanelImageMapping({});
    setPanelTransforms({}); // Clear transforms as well
    setPanelTexts({}); // Clear texts as well
    // Note: We don't clear savedImageDataUrls to prevent re-saving images across collages
    if (DEBUG_MODE) console.log("Cleared all images, mapping, transforms, and texts");
  }, [selectedImages]);

  /**
   * Clear the tracking of saved image data URLs (for debugging or reset purposes)
   */
  const clearSavedImageTracking = useCallback(() => {
    savedImageDataUrls.current.clear();
    if (DEBUG_MODE) console.log("Cleared saved image data URL tracking");
  }, []);

  /**
   * Update the mapping between panels and image indices, and auto-assign subtitles.
   * @param {Object} newMapping - The new panel-to-image mapping { panelId: imageIndex }
   */
  const updatePanelImageMapping = useCallback((newMapping) => {
    if (DEBUG_MODE) {
      console.log("Updating panel image mapping:", newMapping);
    }
    setPanelImageMapping(newMapping);
  }, []);

  /**
   * Auto-assign subtitles when both mapping and images are available
   */
  useEffect(() => {
    if (DEBUG_MODE) {
      console.log(`[SUBTITLE DEBUG] Auto-assignment effect triggered:`, {
        mappingCount: Object.keys(panelImageMapping).length,
        imageCount: selectedImages.length,
        mapping: panelImageMapping,
        panelCount,
        templateId: selectedTemplate?.id
      });
    }
    
    if (Object.keys(panelImageMapping).length === 0 || selectedImages.length === 0) {
      if (DEBUG_MODE) {
        console.log(`[SUBTITLE DEBUG] Skipping auto-assignment - no mapping or images`);
      }
      return; // Nothing to process
    }

    const newPanelTexts = {};
    Object.entries(panelImageMapping).forEach(([panelId, imageIndex]) => {
      const imageData = selectedImages[imageIndex];
      if (DEBUG_MODE) {
        console.log(`[SUBTITLE DEBUG] Panel ${panelId} -> Image ${imageIndex}:`, {
          imageData,
          hasSubtitle: imageData && imageData.subtitle,
          subtitle: imageData?.subtitle,
          subtitleTrimmed: imageData?.subtitle?.trim(),
          subtitleShowing: imageData?.subtitleShowing
        });
      }
      
      // Only auto-assign subtitle if subtitleShowing is true (user enabled text display)
      if (imageData && imageData.subtitle && imageData.subtitle.trim() && imageData.subtitleShowing) {
        newPanelTexts[panelId] = {
          content: imageData.subtitle,
          fontSize: lastUsedTextSettings.fontSize,
          fontWeight: lastUsedTextSettings.fontWeight,
          fontFamily: lastUsedTextSettings.fontFamily,
          color: lastUsedTextSettings.color,
          strokeWidth: lastUsedTextSettings.strokeWidth,
          autoAssigned: true, // Mark as auto-assigned from subtitle
          subtitleShowing: imageData.subtitleShowing || false
        };
        if (DEBUG_MODE) {
          console.log(`[SUBTITLE DEBUG] Auto-assigning subtitle to ${panelId}:`, newPanelTexts[panelId]);
        }
      } else if (DEBUG_MODE) {
        console.log(`[SUBTITLE DEBUG] No subtitle data for panel ${panelId} or subtitleShowing is false`);
      }
    });
    
    if (Object.keys(newPanelTexts).length > 0) {
      setPanelTexts(prev => {
        const updated = { ...prev };
        
        // Strategy for text preservation during layout changes:
        // 1. Always assign subtitles to new panels that don't exist yet
        // 2. For existing panels, only overwrite if they have auto-assigned text
        // 3. Preserve manually edited text even during layout changes
        
        Object.entries(newPanelTexts).forEach(([panelId, textConfig]) => {
          const existingText = prev[panelId];
          
          if (!existingText) {
            // New panel - always assign subtitle
            updated[panelId] = textConfig;
            if (DEBUG_MODE) {
              console.log(`[SUBTITLE DEBUG] Assigning subtitle to new panel ${panelId}`);
            }
          } else if (existingText.autoAssigned) {
            // Existing panel with auto-assigned text - update it
            updated[panelId] = textConfig;
            if (DEBUG_MODE) {
              console.log(`[SUBTITLE DEBUG] Updating auto-assigned text for panel ${panelId}`);
            }
          } else if (DEBUG_MODE) {
            // Existing panel with manually edited text - preserve it
            console.log(`[SUBTITLE DEBUG] Preserving manually edited text for panel ${panelId}`);
          }
        });
        
        // Clean up texts for panels that no longer exist in the mapping
        const validPanelIds = new Set(Object.keys(panelImageMapping));
        Object.keys(prev).forEach(panelId => {
          if (!validPanelIds.has(panelId)) {
            delete updated[panelId];
            if (DEBUG_MODE) {
              console.log(`[SUBTITLE DEBUG] Removing text for deleted panel ${panelId}`);
            }
          }
        });
        
        return updated;
      });
      if (DEBUG_MODE) console.log("Auto-assigned subtitles to panels:", newPanelTexts);
    }
  }, [panelImageMapping, selectedImages, lastUsedTextSettings, selectedTemplate?.id]);

  /**
   * Update the transform state for a specific panel.
   * @param {string} panelId - The ID of the panel to update.
   * @param {object} transformState - The new transform state { scale, positionX, positionY }.
   */
  const updatePanelTransform = useCallback((panelId, transformState) => {
    setPanelTransforms(prevTransforms => {
      const newTransforms = {
        ...prevTransforms,
        [panelId]: transformState,
      };
      if (DEBUG_MODE) {
        console.log(`Updating transform for panel ${panelId}:`, newTransforms[panelId]);
      }
      return newTransforms;
    });
  }, []);

  /**
   * Update the text configuration for a specific panel.
   * @param {string} panelId - The ID of the panel to update.
   * @param {object} textConfig - The new text configuration { content, fontSize, fontWeight, fontFamily, color, strokeWidth }.
   */
  const updatePanelText = useCallback((panelId, textConfig, options = {}) => {
    setPanelTexts(prev => {
      const replace = options.replace === true;

      // If replacing with an empty or falsy config, remove the panel's text entry entirely
      const isEmptyConfig = !textConfig || Object.keys(textConfig).length === 0;
      if (replace && isEmptyConfig) {
        const next = { ...prev };
        delete next[panelId];
        return next;
      }

      // Merge or replace strategy
      const nextPanelText = replace
        ? { ...textConfig, autoAssigned: false }
        : { ...prev[panelId], ...textConfig, autoAssigned: false };

      return {
        ...prev,
        [panelId]: nextPanelText
      };
    });
    
    // Note: We don't update lastUsedTextSettings here to ensure text settings
    // only affect the specific caption being edited, not other captions
    
    if (DEBUG_MODE) {
      console.log(`Updating text for panel ${panelId} (${options.replace ? 'replace' : 'merge'}):`, textConfig);
    }
  }, []);

  return {
    // State
          selectedImages, // Now [{ originalUrl, displayUrl, subtitle?, subtitleShowing?, metadata? }, ...]
    panelImageMapping, // Still { panelId: imageIndex }
    panelTransforms, // { panelId: { scaleRatio: number, positionXPercent: number, positionYPercent: number } }
          panelTexts, // NEW: { panelId: { content, fontSize, fontWeight, fontFamily, color, strokeWidth, autoAssigned?, subtitleShowing? } }
    lastUsedTextSettings, // NEW: Default text settings for new panels
    selectedTemplate,
    setSelectedTemplate,
    selectedAspectRatio,
    setSelectedAspectRatio,
    panelCount,
    setPanelCount,
    finalImage,
    setFinalImage,
    isCreatingCollage,
    setIsCreatingCollage,
    borderThickness,
    setBorderThickness,
    borderColor,
    setBorderColor,

    // Operations
    addImage, // UPDATED: Adds new object with optional subtitle data
    addMultipleImages, // UPDATED: Adds multiple objects with optional subtitle data
    removeImage, // Removes object, updates mapping & transform
    updateImage, // Updates displayUrl
    replaceImage, // Replaces image object
    clearImages, // Clears images, mapping, transforms & texts
    updatePanelImageMapping, // UPDATED: Also auto-assigns subtitles
    updatePanelTransform, // Updates transform for a panel
    updatePanelText, // NEW: Updates text configuration for a panel
    resetPanelTransforms, // Resets all transforms to defaults
    resetPanelTexts, // NEW: Resets all texts to defaults
    
    // Library auto-save functionality
    autoSaveToLibrary,
    setAutoSaveToLibrary,
    libraryRefreshTrigger,
    clearSavedImageTracking, // For debugging/reset purposes
  };
};