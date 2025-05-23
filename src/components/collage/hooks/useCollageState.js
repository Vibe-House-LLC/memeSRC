import { useState, useEffect, useCallback, useRef } from 'react'; // Add useCallback and useRef
import { getLayoutsForPanelCount } from '../config/CollageConfig';

// Debug flag - only enable in development mode
const DEBUG_MODE = process.env.NODE_ENV === 'development';

/**
 * Custom hook to manage collage state
 */
export const useCollageState = () => {
  // selectedImages now stores: { originalUrl: string, displayUrl: string }[]
  const [selectedImages, setSelectedImages] = useState([]);
  // panelImageMapping still maps: { panelId: imageIndex }
  const [panelImageMapping, setPanelImageMapping] = useState({});
  // panelTransforms maps: { panelId: { scale: number, positionX: number, positionY: number } }
  const [panelTransforms, setPanelTransforms] = useState({});
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [selectedAspectRatio, setSelectedAspectRatio] = useState('portrait');
  const [panelCount, setPanelCount] = useState(2); // Default panel count of 2
  const [finalImage, setFinalImage] = useState(null);
  const [isCreatingCollage, setIsCreatingCollage] = useState(false);
  const [borderThickness, setBorderThickness] = useState('thin'); // Default border thickness

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

  useEffect(() => {
    localStorage.setItem('meme-src-collage-custom-color', borderColor);
  }, [borderColor]);

  /**
   * Reset all panel transforms (zoom/pan positions) to defaults.
   * Used when layout, aspect ratio, or template changes.
   */
  const resetPanelTransforms = useCallback(() => {
    setPanelTransforms({});
    if (DEBUG_MODE) console.log("Reset all panel transforms due to layout change");
  }, [DEBUG_MODE]);

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

  // Select the most suitable template when panel count or aspect ratio changes
  useEffect(() => {
    const compatibleTemplates = getLayoutsForPanelCount(panelCount, selectedAspectRatio);
    const currentTemplateIsCompatible = selectedTemplate &&
         selectedTemplate.minImages <= panelCount &&
         selectedTemplate.maxImages >= panelCount;

    if (!currentTemplateIsCompatible && compatibleTemplates.length > 0) {
        setSelectedTemplate(compatibleTemplates[0]);
    } else if (!selectedTemplate && compatibleTemplates.length > 0) {
        setSelectedTemplate(compatibleTemplates[0]);
    } else if (compatibleTemplates.length === 0) {
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
      if (DEBUG_MODE) console.log("Layout change detected, resetting transforms");
    }

    // Update previous values
    prevLayoutValues.current = {
      panelCount,
      selectedAspectRatio,
      selectedTemplate
    };

  }, [panelCount, selectedAspectRatio, selectedTemplate, resetPanelTransforms, DEBUG_MODE]);

  // Clean up ObjectURLs when component unmounts or images change
  useEffect(() => {
    return () => {
      selectedImages.forEach(imgObj => {
        if (imgObj.originalUrl && typeof imgObj.originalUrl === 'string' && imgObj.originalUrl.startsWith('blob:')) {
          URL.revokeObjectURL(imgObj.originalUrl);
        }
        // Revoke displayUrl only if it's different from original and is a blob
        if (imgObj.displayUrl && typeof imgObj.displayUrl === 'string' && imgObj.displayUrl.startsWith('blob:') && imgObj.displayUrl !== imgObj.originalUrl) {
          URL.revokeObjectURL(imgObj.displayUrl);
        }
      });
    };
  }, [selectedImages]);

  /**
   * Add a new image to the collection.
   * Stores the same URL for both original and display initially.
   * @param {string} imageBase64Url - The image URL (usually base64) to add
   */
  const addImage = useCallback((imageBase64Url) => {
    if (!imageBase64Url) return;
    const newImageObject = {
        originalUrl: imageBase64Url,
        displayUrl: imageBase64Url
    };
    setSelectedImages(prev => [...prev, newImageObject]);
    if (DEBUG_MODE) console.log("Added image:", newImageObject);
  }, [DEBUG_MODE]);

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
        .filter(([_, mappedIndex]) => mappedIndex === indexToRemove)
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

    // Remove transforms for the affected panels
    if (panelsToRemoveTransform.length > 0) {
      setPanelTransforms(prevTransforms => {
        const newTransforms = { ...prevTransforms };
        panelsToRemoveTransform.forEach(panelId => {
          delete newTransforms[panelId];
        });
        if (DEBUG_MODE) console.log(`Removed transforms for panels: ${panelsToRemoveTransform.join(', ')}`);
        return newTransforms;
      });
    }

    if (DEBUG_MODE) console.log(`Removed image at index ${indexToRemove}, updated mapping`, newMapping);

  }, [selectedImages, panelImageMapping, DEBUG_MODE]);

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
  }, [selectedImages, DEBUG_MODE]);


  /**
   * Replace an image object entirely at a specific index (for new uploads replacing existing).
   * Updates both originalUrl and displayUrl.
   * @param {number} index - The index of the image object to replace
   * @param {string} newBase64Image - The new image URL (base64)
   */
  const replaceImage = useCallback((index, newBase64Image) => {
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

        // Find the panelId(s) that use this image index and reset their transforms
        const panelsToResetTransform = Object.entries(panelImageMapping)
            .filter(([_, mappedIndex]) => mappedIndex === index)
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
  }, [selectedImages, panelImageMapping, DEBUG_MODE]);


  /**
   * Clear all selected images and mappings.
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
    if (DEBUG_MODE) console.log("Cleared all images, mapping, and transforms");
  }, [selectedImages, DEBUG_MODE]);

  /**
   * Update the mapping between panels and image indices.
   * @param {Object} newMapping - The new panel-to-image mapping { panelId: imageIndex }
   */
  const updatePanelImageMapping = useCallback((newMapping) => {
    if (DEBUG_MODE) {
      console.log("Updating panel image mapping:", newMapping);
    }
    setPanelImageMapping(newMapping);
  }, [DEBUG_MODE]);

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
  }, [DEBUG_MODE]);

  return {
    // State
    selectedImages, // Now [{ originalUrl, displayUrl }, ...]
    panelImageMapping, // Still { panelId: imageIndex }
    panelTransforms, // New: { panelId: { scale, positionX, positionY } }
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
    addImage, // Adds new object { original, display }
    removeImage, // Removes object, updates mapping & transform
    updateImage, // Updates displayUrl
    replaceImage, // Replaces image object
    clearImages, // Clears images, mapping & transforms
    updatePanelImageMapping,
    updatePanelTransform, // New: Updates transform for a panel
    resetPanelTransforms, // New: Resets all transforms to defaults
  };
};