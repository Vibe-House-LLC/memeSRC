import React, { useRef, useState, useEffect, useContext, useCallback } from 'react';
import PropTypes from 'prop-types';
import { 
  Box, 
  Typography, 
  Card,
  CardMedia,
  Chip,
  Menu,
  MenuItem,
  ListItemIcon,
  Snackbar,
  Alert,
  Button,
} from '@mui/material';
import { useTheme, styled, alpha } from '@mui/material/styles';
import {
  Add,
  Delete,
  RemoveCircle,
  Upload,
  Refresh,
  Clear,
  PhotoLibrary,
} from '@mui/icons-material';
import { LibraryPickerDialog } from '../../library';
import { UserContext } from '../../../UserContext';
import {
  buildImageObjectFromFile,
  createBlobUrlTracker,
  revokeImageObjectUrls,
  yieldFrames,
} from '../utils/imagePipeline';

const DEBUG_MODE = process.env.NODE_ENV === 'development' && typeof window !== 'undefined' && (() => {
  try { return localStorage.getItem('meme-src-collage-debug') === '1'; } catch { return false; }
})();
const debugLog = (...args) => { if (DEBUG_MODE) console.log(...args); };

// Styled components similar to CollageSettingsStep
const HorizontalScroller = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(1.5),
  padding: theme.spacing(1, 0),
  alignItems: 'center',
  justifyContent: 'flex-start',
  flexWrap: 'wrap',
  width: '100%',
}));



const PanelThumbnail = styled(Card)(({ theme, hasImage }) => ({
  cursor: 'pointer',
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  transition: theme.transitions.create(
    ['border-color', 'background-color', 'box-shadow'],
    { duration: theme.transitions.duration.shorter }
  ),
  border: hasImage 
    ? `2px solid ${theme.palette.primary.main}` 
    : `1px solid ${theme.palette.divider}`,
  backgroundColor: hasImage 
    ? alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.15 : 0.08)
    : theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius,
  '&:hover': {
    boxShadow: hasImage 
      ? `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`
      : theme.palette.mode === 'dark'
        ? '0 4px 12px rgba(0,0,0,0.25)'
        : '0 4px 12px rgba(0,0,0,0.1)',
    borderColor: hasImage ? theme.palette.primary.main : theme.palette.primary.light
  },
  width: 72,
  height: 72,
  padding: theme.spacing(0.75),
  flexShrink: 0,
  '&:active': {
    transform: 'scale(0.98)',
    transition: 'transform 0.1s',
  }
}));

const AddMoreCard = styled(Card)(({ theme }) => ({
  cursor: 'pointer',
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  transition: theme.transitions.create(
    ['border-color', 'background-color', 'box-shadow'],
    { duration: theme.transitions.duration.shorter }
  ),
  border: `2px dashed ${theme.palette.divider}`,
  backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
  borderRadius: theme.shape.borderRadius,
  '&:hover': {
    borderColor: theme.palette.primary.main,
    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
    boxShadow: theme.palette.mode === 'dark'
      ? '0 4px 12px rgba(0,0,0,0.25)'
      : '0 4px 12px rgba(0,0,0,0.1)',
  },
  width: 72,
  height: 72,
  padding: theme.spacing(0.75),
  flexShrink: 0,
  '&:active': {
    transform: 'scale(0.98)',
    transition: 'transform 0.1s',
  }
}));

const BulkUploadSection = ({
  selectedImages,
  addMultipleImages,
  panelImageMapping,
  updatePanelImageMapping,
  panelCount,
  selectedTemplate,
  setPanelCount, // Add this prop to automatically adjust panel count
  removeImage, // Add removeImage function
  replaceImage, // Add replaceImage function
  onStartFromScratch, // Add prop to handle starting without images
  libraryRefreshTrigger, // For refreshing library when new images are auto-saved
  onLibrarySelectionChange,
  onLibraryActionsReady,
  initialShowLibrary = false,
  onLibraryPickerOpenChange,
}) => {
  const theme = useTheme();
  const { user } = useContext(UserContext);
  const [libraryPickerOpen, setLibraryPickerOpen] = useState(false);
  const openLibraryPicker = useCallback(() => setLibraryPickerOpen(true), []);
  const closeLibraryPicker = useCallback(() => setLibraryPickerOpen(false), []);
  const isAdmin = user?.['cognito:groups']?.includes('admins');
  const hasLibraryAccess = isAdmin || (user?.userDetails?.magicSubscription === 'true');
  const bulkFileInputRef = useRef(null);
  const panelScrollerRef = useRef(null);
  const specificPanelFileInputRef = useRef(null);

  useEffect(() => {
    if (initialShowLibrary && hasLibraryAccess) {
      setLibraryPickerOpen(true);
    }
  }, [initialShowLibrary, hasLibraryAccess]);

  useEffect(() => {
    if (typeof onLibraryPickerOpenChange === 'function') {
      onLibraryPickerOpenChange(Boolean(libraryPickerOpen));
    }
    return () => {
      if (typeof onLibraryPickerOpenChange === 'function') {
        onLibraryPickerOpenChange(false);
      }
    };
  }, [libraryPickerOpen, onLibraryPickerOpenChange]);

  // State for context menu
  const [contextMenu, setContextMenu] = useState(null);
  const [selectedPanelForAction, setSelectedPanelForAction] = useState(null);

  // State for toast notifications
  const [toast, setToast] = useState({
    open: false,
    message: '',
    severity: 'error'
  });

  // Check if there are any selected images
  const hasImages = selectedImages && selectedImages.length > 0;

  const helperSourceLabel = hasLibraryAccess ? 'library' : 'device';

  useEffect(() => {
    if (typeof onLibrarySelectionChange === 'function') {
      if (hasLibraryAccess && !hasImages) {
        onLibrarySelectionChange({ count: 1, minSelected: 1 });
      } else {
        onLibrarySelectionChange({ count: 0, minSelected: 1 });
      }
    }
    if (typeof onLibraryActionsReady === 'function') {
      if (hasLibraryAccess && !hasImages) {
        onLibraryActionsReady({ primary: openLibraryPicker, clearSelection: () => {} });
      } else {
        onLibraryActionsReady({ primary: null, clearSelection: null });
      }
    }
  }, [hasImages, hasLibraryAccess, onLibrarySelectionChange, onLibraryActionsReady, openLibraryPicker]);

  // Check if there are any empty frames
  const hasEmptyFrames = () => {
    for (let panelIndex = 0; panelIndex < panelCount; panelIndex += 1) {
      const panelId = selectedTemplate?.layout?.panels?.[panelIndex]?.id || `panel-${panelIndex + 1}`;
      const imageIndex = panelImageMapping[panelId];
      const hasImage = imageIndex !== undefined && imageIndex !== null && selectedImages[imageIndex];
      if (!hasImage) {
        return true;
      }
    }
    return false;
  };



  // Effect to clean up orphaned mappings when images or panel count changes
  useEffect(() => {
    if (!panelImageMapping || !selectedImages) return;
    
    let needsCleanup = false;
    const cleanedMapping = {};
    
    // Check each mapping entry
    Object.entries(panelImageMapping).forEach(([panelId, imageIndex]) => {
      // Extract panel number from panelId
      const panelNumber = parseInt(panelId.split('-')[1] || '0', 10);
      
      // Check if panel number is valid (within current panel count)
      const isPanelValid = panelNumber > 0 && panelNumber <= panelCount;
      
      // Check if image index is valid (within current images array)
      const isImageValid = imageIndex !== undefined && 
                          imageIndex !== null && 
                          imageIndex >= 0 && 
                          imageIndex < selectedImages.length &&
                          selectedImages[imageIndex];
      
      if (isPanelValid && isImageValid) {
        cleanedMapping[panelId] = imageIndex;
      } else {
        needsCleanup = true;
        debugLog(`Cleaning up orphaned mapping: panel ${panelId} -> image ${imageIndex} (panelValid: ${isPanelValid}, imageValid: ${isImageValid})`);
      }
    });
    
    // Update mapping if cleanup is needed
    if (needsCleanup) {
      debugLog('Updating panel mapping after cleanup:', cleanedMapping);
      updatePanelImageMapping(cleanedMapping);
    }
  }, [selectedImages, panelCount, panelImageMapping, updatePanelImageMapping]);



  // --- Handler for bulk file upload ---
  const handleBulkFileUpload = async (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    // Check if upload exceeds 5 image limit
    if (files.length > 5) {
      setToast({
        open: true,
        message: 'Beta supports up to 5 images for now',
        severity: 'error'
      });

      // Reset file input
      if (event.target) {
        event.target.value = null;
      }
      return;
    }

    const blobUrlTracker = createBlobUrlTracker();

    const getImageObject = async (file) => {
      const normalized = await buildImageObjectFromFile(file, {
        trackBlobUrl: blobUrlTracker.track,
      });
      return {
        originalUrl: normalized.originalUrl,
        displayUrl: normalized.displayUrl,
      };
    };

    debugLog(`Bulk uploading ${files.length} files...`);

    let committed = false;
    try {
      // Process files sequentially with small yields to keep UI responsive
      const imageObjs = [];
      for (let i = 0; i < files.length; i += 1) {
        // Yield to allow paint/input between heavy operations
        // Two frames helps noticeably on slower devices
        await yieldFrames(2);
        // eslint-disable-next-line no-await-in-loop
        const obj = await getImageObject(files[i]);
        imageObjs.push(obj);
      }
      debugLog(`Loaded ${imageObjs.length} files for bulk upload`);

      // Add all images at once
      await addMultipleImages(imageObjs);
      // Mark as committed immediately after state update to avoid revoking
      // blob: URLs that are now in use if a later step throws.
      committed = true;

      // Find currently empty panels by checking existing mapping
      const emptyPanels = [];
      const assignedPanelIds = new Set(Object.keys(panelImageMapping));

      debugLog(`Current panel mapping:`, panelImageMapping);
      debugLog(`Assigned panel IDs:`, Array.from(assignedPanelIds));

      for (let panelIndex = 0; panelIndex < panelCount; panelIndex += 1) {
        const panelId = selectedTemplate?.layout?.panels?.[panelIndex]?.id || `panel-${panelIndex + 1}`;

        // Check if this panel is not assigned or assigned to undefined/null
        if (!assignedPanelIds.has(panelId) || panelImageMapping[panelId] === undefined || panelImageMapping[panelId] === null) {
          emptyPanels.push(panelId);
        }
      }

      const numEmptyPanels = emptyPanels.length;
      const numNewImages = imageObjs.length;
      const hasNoExistingImages = (selectedImages?.length || 0) === 0;

      debugLog(`Found ${numEmptyPanels} empty panels (${emptyPanels}) for ${numNewImages} new images`);

      // Calculate if we need to increase panel count
      let newPanelCount = panelCount;
      if (hasNoExistingImages) {
        const desiredPanelCount = Math.max(1, Math.min(numNewImages, 5));
        newPanelCount = desiredPanelCount;
        if (setPanelCount && newPanelCount !== panelCount) {
          setPanelCount(newPanelCount);
          debugLog(`Expanded panel count from ${panelCount} to ${newPanelCount} for first upload`);
        }
      } else if (numNewImages > numEmptyPanels) {
        // Need more panels - increase by the difference
        const additionalPanelsNeeded = numNewImages - numEmptyPanels;
        newPanelCount = Math.min(panelCount + additionalPanelsNeeded, 12); // Max 12 panels

        if (setPanelCount && newPanelCount !== panelCount) {
          setPanelCount(newPanelCount);
          debugLog(`Increased panel count from ${panelCount} to ${newPanelCount} to accommodate new images`);
        }
      }

      // Create new mapping with assignments
      const newMapping = { ...panelImageMapping };
      const currentLength = selectedImages.length;
      let newImageIndex = currentLength;

      // First, fill existing empty panels
      for (let i = 0; i < Math.min(numEmptyPanels, numNewImages); i += 1) {
        newMapping[emptyPanels[i]] = newImageIndex;
        debugLog(`Assigning new image ${newImageIndex} to empty panel ${emptyPanels[i]}`);
        newImageIndex += 1;
      }

      // Then, assign remaining images to newly created panels (if any)
      if (numNewImages > numEmptyPanels) {
        for (let panelIndex = panelCount; panelIndex < newPanelCount && newImageIndex < currentLength + numNewImages; panelIndex += 1) {
          const panelId = selectedTemplate?.layout?.panels?.[panelIndex]?.id || `panel-${panelIndex + 1}`;
          newMapping[panelId] = newImageIndex;
          debugLog(`Assigning new image ${newImageIndex} to new panel ${panelId}`);
          newImageIndex += 1;
        }
      }

      debugLog(`Final mapping:`, newMapping);
      updatePanelImageMapping(newMapping);
      debugLog(`Assigned ${numNewImages} new images to panels`);

      // Note: Scroll behavior moved to CollagePage to handle after section collapse
    } catch (error) {
      console.error("Error loading files:", error);
    } finally {
      if (!committed) {
        blobUrlTracker.revokeAll();
      } else {
        blobUrlTracker.clear();
      }
    }

    // Reset file input
    if (event.target) {
      event.target.value = null;
    }
  };

  // Handler for removing an image
  const handleRemoveImage = (imageIndex) => {
    if (removeImage) {
      const previousImage = selectedImages?.[imageIndex];
      removeImage(imageIndex);
      // Defer revocation until after state updates
      setTimeout(() => revokeImageObjectUrls(previousImage), 0);
    }
  };

  // Handler for removing a frame/panel
  const handleRemoveFrame = (panelIdToRemove) => {
    if (!setPanelCount || panelCount <= 1) {
      debugLog('Cannot remove frame: minimum panel count is 1 or setPanelCount not available');
      return;
    }

    debugLog(`Removing frame: ${panelIdToRemove}`);

    // Extract the panel number from the panel ID to remove (1-based)
    const panelNumberToRemove = parseInt(panelIdToRemove.split('-')[1] || '0', 10);
    
    debugLog(`Removing panel number: ${panelNumberToRemove} (reducing from ${panelCount} to ${panelCount - 1} panels)`);

    // Get the current panel mapping
    const currentMapping = { ...panelImageMapping };
    
    // Store the image that was in the removed panel (if any) - we'll remove it from images array
    const removedImageIndex = currentMapping[panelIdToRemove];
    const hasRemovedImage = removedImageIndex !== undefined && removedImageIndex !== null;
    
    debugLog(`Panel ${panelIdToRemove} had image at index: ${removedImageIndex}`);
    
    // Remove the image from the images array if it exists
    if (hasRemovedImage && removeImage) {
      const previousImage = selectedImages?.[removedImageIndex];
      removeImage(removedImageIndex);
      setTimeout(() => revokeImageObjectUrls(previousImage), 0);
      debugLog(`Removed image at index ${removedImageIndex} from images array`);
    }
    
    // Create new mapping by rebuilding it from scratch for remaining panels
    const updatedMapping = {};
    
    // Get all current panel-to-image mappings, excluding the removed panel
    const remainingMappings = Object.entries(currentMapping)
      .filter(([panelId]) => panelId !== panelIdToRemove)
      .map(([panelId, imageIndex]) => {
        const panelNumber = parseInt(panelId.split('-')[1] || '0', 10);
        return { panelId, panelNumber, imageIndex };
      })
      .sort((a, b) => a.panelNumber - b.panelNumber); // Sort by panel number
    
    debugLog('Remaining mappings before adjustment:', remainingMappings);
    
    // Adjust image indices for images that come after the removed image
    const adjustedMappings = remainingMappings.map(({ panelId, panelNumber, imageIndex }) => {
      let adjustedImageIndex = imageIndex;
      
      // If we removed an image and this mapping points to an image after it, shift the index down
      if (hasRemovedImage && imageIndex > removedImageIndex) {
        adjustedImageIndex = imageIndex - 1;
        debugLog(`Adjusted image index from ${imageIndex} to ${adjustedImageIndex} for panel ${panelId}`);
      }
      
      return { panelId, panelNumber, imageIndex: adjustedImageIndex };
    });
    
    debugLog('Mappings after image index adjustment:', adjustedMappings);
    
    // Now rebuild the mapping with new panel IDs for panels that need to shift
    adjustedMappings.forEach(({ panelNumber, imageIndex }) => {
      let newPanelNumber = panelNumber;
      
      // If this panel comes after the removed panel, shift it up by 1
      if (panelNumber > panelNumberToRemove) {
        newPanelNumber = panelNumber - 1;
        debugLog(`Shifting panel ${panelNumber} to panel ${newPanelNumber}`);
      }
      
      // Generate the new panel ID
      const newPanelId = selectedTemplate?.layout?.panels?.[newPanelNumber - 1]?.id || `panel-${newPanelNumber}`;
      updatedMapping[newPanelId] = imageIndex;
      
      debugLog(`Mapped panel ${newPanelId} to image index ${imageIndex}`);
    });
    
    // Update panel count first
    const newPanelCount = panelCount - 1;
    setPanelCount(newPanelCount);
    
    // Apply the updated mapping
    updatePanelImageMapping(updatedMapping);
    
    debugLog(`Frame removed. New panel count: ${newPanelCount}, Updated mapping:`, updatedMapping);
  };

  // Handler for opening context menu on empty panel click
  const handleEmptyPanelClick = (event, panel) => {
    event.preventDefault();
    event.stopPropagation();
    
    setSelectedPanelForAction(panel);
    setContextMenu({
      mouseX: event.clientX - 2,
      mouseY: event.clientY - 4,
    });
  };

  // Handler for opening context menu on panel with image click
  const handleImagePanelClick = (event, panel) => {
    event.preventDefault();
    event.stopPropagation();
    
    setSelectedPanelForAction(panel);
    setContextMenu({
      mouseX: event.clientX - 2,
      mouseY: event.clientY - 4,
    });
  };

  // Handler for closing context menu
  const handleContextMenuClose = () => {
    setContextMenu(null);
    setSelectedPanelForAction(null);
  };

  // Handler for uploading to specific panel
  const handleUploadToPanel = () => {
    if (selectedPanelForAction) {
      specificPanelFileInputRef.current?.click();
    }
    handleContextMenuClose();
  };

  // Handler for removing specific frame from context menu
  const handleRemoveFrameFromMenu = () => {
    if (selectedPanelForAction) {
      handleRemoveFrame(selectedPanelForAction.panelId);
    }
    handleContextMenuClose();
  };

  // Handler for replacing image in panel
  const handleReplaceImage = () => {
    if (selectedPanelForAction) {
      specificPanelFileInputRef.current?.click();
    }
    handleContextMenuClose();
  };

  // Handler for clearing image from panel
  const handleClearImage = () => {
    if (selectedPanelForAction && selectedPanelForAction.hasImage) {
      // Remove the image from the images array
      handleRemoveImage(selectedPanelForAction.imageIndex);
      
      // Remove the panel mapping
      const newMapping = { ...panelImageMapping };
      delete newMapping[selectedPanelForAction.panelId];
      updatePanelImageMapping(newMapping);
      
      debugLog(`Cleared image from panel ${selectedPanelForAction.panelId}`);
    }
    handleContextMenuClose();
  };

  // Handler for deleting frame with image
  const handleDeleteFrameWithImage = () => {
    if (selectedPanelForAction && selectedPanelForAction.hasImage) {
      // The handleRemoveFrame function now handles both removing the image and the frame
      // so we don't need to call handleRemoveImage separately
      handleRemoveFrame(selectedPanelForAction.panelId);
    }
    handleContextMenuClose();
  };

  // Handler for file selection for specific panel
  const handleSpecificPanelFileChange = async (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0 || !selectedPanelForAction) return;

    const blobUrlTracker = createBlobUrlTracker();
    const getImageObject = async (file) => {
      const normalized = await buildImageObjectFromFile(file, {
        trackBlobUrl: blobUrlTracker.track,
      });
      return {
        originalUrl: normalized.originalUrl,
        displayUrl: normalized.displayUrl,
      };
    };

    debugLog(`Uploading ${files.length} files to specific panel: ${selectedPanelForAction.panelId}`);

    let committed = false;
    try {
      // Process files sequentially with small yields to keep UI responsive
      const imageObjs = [];
      for (let i = 0; i < files.length; i += 1) {
        await yieldFrames(2);
        // eslint-disable-next-line no-await-in-loop
        const obj = await getImageObject(files[i]);
        imageObjs.push(obj);
      }
      debugLog(`Loaded ${imageObjs.length} files for panel ${selectedPanelForAction.panelId}`);

      if (selectedPanelForAction.hasImage) {
        // Replace existing image
        const firstImageObj = imageObjs[0];

        // Update the existing image in the array
        const updatedImages = [...selectedImages];
        updatedImages[selectedPanelForAction.imageIndex] = firstImageObj;

        // If there are additional images, add them to the collection
        if (imageObjs.length > 1) {
          const additionalImages = imageObjs.slice(1);
          updatedImages.push(...additionalImages);
        }

        // Use replaceImage if available, otherwise use addMultipleImages
        if (typeof replaceImage === 'function') {
          const previousImage = selectedImages?.[selectedPanelForAction.imageIndex];
          await replaceImage(selectedPanelForAction.imageIndex, firstImageObj);
          setTimeout(() => revokeImageObjectUrls(previousImage), 0);
          if (imageObjs.length > 1) {
            await addMultipleImages(imageObjs.slice(1));
          }
          committed = true;
        } else {
          // Fallback: add all images and update mapping
          await addMultipleImages(imageObjs);
          const newMapping = { ...panelImageMapping };
          newMapping[selectedPanelForAction.panelId] = selectedImages.length;
          updatePanelImageMapping(newMapping);
          committed = true;
        }

        debugLog(`Replaced image in panel ${selectedPanelForAction.panelId}`);
      } else {
        // Add new image to empty panel
        await addMultipleImages(imageObjs);

        // Get the starting index for new images
        const currentLength = selectedImages.length;

        // Create new mapping with the first image assigned to the selected panel
        const newMapping = { ...panelImageMapping };
        newMapping[selectedPanelForAction.panelId] = currentLength;

        debugLog(`Assigning image ${currentLength} to panel ${selectedPanelForAction.panelId}`);

        // If there are more images, they'll be available for assignment to other panels
        updatePanelImageMapping(newMapping);
        committed = true;

        debugLog(`Assigned image to specific panel. Updated mapping:`, newMapping);
      }
    } catch (error) {
      console.error("Error loading files for specific panel:", error);
    } finally {
      if (!committed) {
        blobUrlTracker.revokeAll();
      } else {
        blobUrlTracker.clear();
      }
    }

    // Reset file input
    if (event.target) {
      event.target.value = null;
    }
  };

  // Handler for selecting images from LibraryBrowser
  const handleLibrarySelect = async (items) => {
    if (!items || items.length === 0) return;

    const emptyPanels = [];
    const assignedPanelIds = new Set(Object.keys(panelImageMapping));

    for (let panelIndex = 0; panelIndex < panelCount; panelIndex += 1) {
      const panelId =
        selectedTemplate?.layout?.panels?.[panelIndex]?.id ||
        `panel-${panelIndex + 1}`;
      if (
        !assignedPanelIds.has(panelId) ||
        panelImageMapping[panelId] === undefined ||
        panelImageMapping[panelId] === null
      ) {
        emptyPanels.push(panelId);
      }
    }

    const numEmptyPanels = emptyPanels.length;
    const numNewImages = items.length;
    const hasNoExistingImages = (selectedImages?.length || 0) === 0;

    let newPanelCount = panelCount;
    if (hasNoExistingImages) {
      const desiredPanelCount = Math.max(1, Math.min(numNewImages, 5));
      newPanelCount = desiredPanelCount;
      if (setPanelCount && newPanelCount !== panelCount) {
        setPanelCount(newPanelCount);
      }
    } else if (numNewImages > numEmptyPanels) {
      const additionalPanelsNeeded = numNewImages - numEmptyPanels;
      newPanelCount = Math.min(panelCount + additionalPanelsNeeded, 12);
      if (setPanelCount && newPanelCount !== panelCount) {
        setPanelCount(newPanelCount);
      }
    }

    const newMapping = { ...panelImageMapping };
    const currentLength = selectedImages.length;
    let newImageIndex = currentLength;

    for (let i = 0; i < Math.min(numEmptyPanels, numNewImages); i += 1) {
      newMapping[emptyPanels[i]] = newImageIndex;
      newImageIndex += 1;
    }

    if (numNewImages > numEmptyPanels) {
      for (
        let panelIndex = panelCount;
        panelIndex < newPanelCount &&
        newImageIndex < currentLength + numNewImages;
        panelIndex += 1
      ) {
        const panelId =
          selectedTemplate?.layout?.panels?.[panelIndex]?.id ||
          `panel-${panelIndex + 1}`;
        newMapping[panelId] = newImageIndex;
        newImageIndex += 1;
      }
    }

    // Add items first so mapping references valid indices
    await addMultipleImages(items);

    // Update mapping after images are added
    updatePanelImageMapping(newMapping);
    setLibraryPickerOpen(false);
  };

  // Generate panel list data
  const generatePanelList = () => {
    const panels = [];
    
    for (let panelIndex = 0; panelIndex < panelCount; panelIndex += 1) {
      const panelId = selectedTemplate?.layout?.panels?.[panelIndex]?.id || `panel-${panelIndex + 1}`;
      const imageIndex = panelImageMapping[panelId];
      
      // Add safety check to ensure imageIndex is valid and image exists
      const hasValidImage = imageIndex !== undefined && 
                           imageIndex !== null && 
                           imageIndex >= 0 && 
                           imageIndex < selectedImages.length && 
                           selectedImages[imageIndex];
      
      panels.push({
        panelId,
        panelNumber: panelIndex + 1,
        imageIndex: hasValidImage ? imageIndex : undefined,
        hasImage: hasValidImage,
        image: hasValidImage ? selectedImages[imageIndex] : null
      });
    }
    
    return panels;
  };

  const panelList = generatePanelList();

  // Handler for closing toast
  const handleCloseToast = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setToast(prev => ({ ...prev, open: false }));
  };

  return (
    <Box data-testid="bulk-upload-section">
      {hasImages ? (
        // Show simple image grid
        <Box>
          <HorizontalScroller ref={panelScrollerRef}>
            {panelList.map((panel) => (
              <PanelThumbnail
                key={panel.panelId}
                hasImage={panel.hasImage}
                onClick={(event) => {
                  if (panel.hasImage) {
                    handleImagePanelClick(event, panel);
                  } else if (!panel.hasImage) {
                    if (panelCount > 1) {
                      handleEmptyPanelClick(event, panel);
                    } else {
                      setSelectedPanelForAction(panel);
                      specificPanelFileInputRef.current?.click();
                    }
                  }
                }}
                sx={{ cursor: 'pointer' }}
              >
                <Box sx={{ 
                  position: 'relative',
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Box sx={{ 
                    width: '85%', 
                    height: '85%', 
                    borderRadius: 1,
                    overflow: 'hidden',
                    border: 1,
                    borderColor: 'divider',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: panel.hasImage ? 'transparent' : 'action.hover'
                  }}>
                    {panel.hasImage ? (
                      <CardMedia
                        component="img"
                        width="100%"
                        height="100%"
                        image={panel.image.displayUrl || panel.image.originalUrl || panel.image}
                        alt={`Panel ${panel.panelNumber}`}
                        sx={{ objectFit: 'cover' }}
                      />
                    ) : (
                      <Add sx={{ color: 'text.disabled', fontSize: 24 }} />
                    )}
                  </Box>

                  <Chip
                    label={panel.panelNumber}
                    size="small"
                    variant="filled"
                    sx={{
                      position: 'absolute',
                      bottom: -6,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      height: 16,
                      fontSize: '0.6rem',
                      fontWeight: 'bold',
                      px: 0.5,
                      backgroundColor: panel.hasImage ? 'primary.main' : 'grey.400',
                      color: panel.hasImage ? 'primary.contrastText' : 'text.primary',
                      '& .MuiChip-label': { px: 0.5, py: 0 }
                    }}
                  />
                </Box>
              </PanelThumbnail>
            ))}

            {!hasEmptyFrames() && (
              <AddMoreCard onClick={() => bulkFileInputRef.current?.click()}>
                <Add sx={{ fontSize: 24, color: 'text.secondary' }} />
              </AddMoreCard>
            )}
          </HorizontalScroller>

          {/* Hidden file inputs */}
          <input
            type="file"
            ref={bulkFileInputRef}
            style={{ display: 'none' }}
            accept="image/*"
            multiple
            onChange={handleBulkFileUpload}
          />
          
          <input
            type="file"
            ref={specificPanelFileInputRef}
            style={{ display: 'none' }}
            accept="image/*"
            onChange={handleSpecificPanelFileChange}
          />

          {/* Context menu */}
          <Menu
            open={contextMenu !== null}
            onClose={handleContextMenuClose}
            anchorReference="anchorPosition"
            anchorPosition={
              contextMenu !== null
                ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
                : undefined
            }
          >
            {selectedPanelForAction?.hasImage ? (
              <>
                <MenuItem onClick={handleReplaceImage}>
                  <ListItemIcon>
                    <Refresh fontSize="small" />
                  </ListItemIcon>
                  Replace
                </MenuItem>
                <MenuItem onClick={handleClearImage}>
                  <ListItemIcon>
                    <Clear fontSize="small" />
                  </ListItemIcon>
                  Remove
                </MenuItem>
                {panelCount > 1 && (
                  <MenuItem onClick={handleDeleteFrameWithImage}>
                    <ListItemIcon>
                      <Delete fontSize="small" />
                    </ListItemIcon>
                    Delete frame
                  </MenuItem>
                )}
              </>
            ) : (
              <>
                <MenuItem onClick={handleUploadToPanel}>
                  <ListItemIcon>
                    <Upload fontSize="small" />
                  </ListItemIcon>
                  Add image
                </MenuItem>
                {panelCount > 1 && (
                  <MenuItem onClick={handleRemoveFrameFromMenu}>
                    <ListItemIcon>
                      <RemoveCircle fontSize="small" />
                    </ListItemIcon>
                    Remove frame
                  </MenuItem>
                )}
              </>
            )}
          </Menu>
        </Box>
      ) : (
        // Starting point: distinct for admins vs non-admins
        <Box>
          <Typography
            variant="subtitle1"
            sx={{
              color: 'text.secondary',
              mb: 1.5,
            }}
          >
            Add up to 5 images from your {helperSourceLabel}
          </Typography>
          {!hasLibraryAccess ? (
            // Non-admins: only the collage bulk upload dropzone
            <>
              <Box sx={{ 
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '200px',
                border: `2px dashed ${theme.palette.divider}`,
                borderRadius: 2,
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                '&:hover': {
                  borderColor: theme.palette.primary.main,
                  backgroundColor: theme.palette.action.hover,
                }
              }}>
                <Box 
                  onClick={() => bulkFileInputRef.current?.click()}
                  sx={{ textAlign: 'center', p: 3 }}
                >
                  <Add sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                  <Typography variant="h6" gutterBottom>
                    Add Images
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Upload images for your collage
                  </Typography>
                </Box>
                
                <input
                  type="file"
                  ref={bulkFileInputRef}
                  style={{ display: 'none' }}
                  accept="image/*"
                  multiple
                  onChange={handleBulkFileUpload}
                />
              </Box>
              {onStartFromScratch && (
                <Box sx={{ textAlign: 'center', mt: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    or,{' '}
                    <Typography 
                      component="span" 
                      variant="body2"
                      onClick={onStartFromScratch}
                      sx={{ 
                        color: 'primary.main',
                        textDecoration: 'underline',
                        cursor: 'pointer',
                        '&:hover': { color: 'primary.dark' }
                      }}
                    >
                      start from scratch
                    </Typography>
                  </Typography>
                </Box>
              )}
            </>
          ) : (
            <>
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  py: 6,
                  px: 2,
                  borderRadius: 2,
                  bgcolor: (theme) => theme.palette.background.paper,
                  border: 1,
                  borderColor: 'divider',
                }}
              >
                <PhotoLibrary sx={{ fontSize: 56, mb: 1, color: 'text.disabled' }} />
                <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                  New Collage
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                  Pick up to 5 photos from your Library to get started.
                </Typography>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<PhotoLibrary />}
                  onClick={openLibraryPicker}
                  sx={{ fontWeight: 700, textTransform: 'none', minWidth: 220 }}
                >
                  Select photos
                </Button>
              </Box>

              <LibraryPickerDialog
                open={libraryPickerOpen}
                onClose={closeLibraryPicker}
                title="Choose photos from your library"
                showSelectAction
                selectActionLabel="Continue"
                onSelect={(items) => { void handleLibrarySelect(items); }}
                maxWidth="lg"
                browserProps={{
                  multiple: true,
                  minSelected: 1,
                  maxSelected: 5,
                  refreshTrigger: libraryRefreshTrigger,
                  uploadEnabled: true,
                  deleteEnabled: false,
                  showActionBar: false,
                  actionBarLabel: 'Add to collage',
                  selectionEnabled: true,
                  previewOnClick: false,
                  showSelectToggle: false,
                  initialSelectMode: true,
                }}
              />
            </>
          )}
        </Box>
      )}

      {/* Toast Notification */}
      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={handleCloseToast}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseToast}
          severity={toast.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

BulkUploadSection.propTypes = {
  selectedImages: PropTypes.array.isRequired,
  addMultipleImages: PropTypes.func.isRequired,
  panelImageMapping: PropTypes.object.isRequired,
  updatePanelImageMapping: PropTypes.func.isRequired,
  panelCount: PropTypes.number.isRequired,
  selectedTemplate: PropTypes.object,
  setPanelCount: PropTypes.func,
  removeImage: PropTypes.func,
  replaceImage: PropTypes.func,
  onStartFromScratch: PropTypes.func,
  libraryRefreshTrigger: PropTypes.any,
  onLibrarySelectionChange: PropTypes.func,
  onLibraryActionsReady: PropTypes.func,
  initialShowLibrary: PropTypes.bool,
  onLibraryPickerOpenChange: PropTypes.func,
};

export default BulkUploadSection; 
