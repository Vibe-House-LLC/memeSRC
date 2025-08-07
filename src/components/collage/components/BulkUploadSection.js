import React, { useRef, useState, useEffect, useContext } from 'react';
import PropTypes from 'prop-types';
import { 
  Box, 
  Typography, 
  Card,
  CardMedia,
  Chip,
  Menu,
  MenuItem,
  Snackbar,
  Alert
} from '@mui/material';
import { useTheme, styled, alpha } from '@mui/material/styles';
import {
  Add,
  Delete,
  RemoveCircle,
  Upload,
  Refresh,
  Clear
} from '@mui/icons-material';
import { LibraryBrowser } from '../../library';
import { UserContext } from '../../../UserContext';

const DEBUG_MODE = process.env.NODE_ENV === 'development';
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
}) => {
  const theme = useTheme();
  const { user } = useContext(UserContext);
  const isAdmin = user?.['cognito:groups']?.includes('admins');
  const bulkFileInputRef = useRef(null);
  const panelScrollerRef = useRef(null);
  const specificPanelFileInputRef = useRef(null);

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

    // Helper function to load a single file and return a Promise with the data URL
    const loadFile = (file) => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(file);
    });

    debugLog(`Bulk uploading ${files.length} files...`);

    try {
      // Process all files
      const imageUrls = await Promise.all(files.map(loadFile));
      debugLog(`Loaded ${imageUrls.length} files for bulk upload`);

      // Add all images at once
      await addMultipleImages(imageUrls);

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
      const numNewImages = imageUrls.length;

      debugLog(`Found ${numEmptyPanels} empty panels (${emptyPanels}) for ${numNewImages} new images`);

      // Calculate if we need to increase panel count
      let newPanelCount = panelCount;
      if (numNewImages > numEmptyPanels) {
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
    }

    // Reset file input
    if (event.target) {
      event.target.value = null;
    }
  };

  // Handler for removing an image
  const handleRemoveImage = (imageIndex) => {
    if (removeImage) {
      removeImage(imageIndex);
    }
  };

  // Handler for removing a frame/panel
  const handleRemoveFrame = (panelIdToRemove) => {
    if (!setPanelCount || panelCount <= 2) {
      debugLog('Cannot remove frame: minimum panel count is 2 or setPanelCount not available');
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
      removeImage(removedImageIndex);
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

    // Helper function to load a single file and return a Promise with the data URL
    const loadFile = (file) => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    debugLog(`Uploading ${files.length} files to specific panel: ${selectedPanelForAction.panelId}`);

    try {
      // Process all files
      const imageUrls = await Promise.all(files.map(loadFile));
      debugLog(`Loaded ${imageUrls.length} files for panel ${selectedPanelForAction.panelId}`);

      if (selectedPanelForAction.hasImage) {
        // Replace existing image
        const firstImageUrl = imageUrls[0];

        // Update the existing image in the array
        const updatedImages = [...selectedImages];
        updatedImages[selectedPanelForAction.imageIndex] = {
          originalUrl: firstImageUrl,
          displayUrl: firstImageUrl
        };

        // If there are additional images, add them to the collection
        if (imageUrls.length > 1) {
          const additionalImages = imageUrls.slice(1).map(url => ({
            originalUrl: url,
            displayUrl: url
          }));
          updatedImages.push(...additionalImages);
        }

        // Use replaceImage if available, otherwise use addMultipleImages
        if (typeof replaceImage === 'function') {
          await replaceImage(selectedPanelForAction.imageIndex, firstImageUrl);
          if (imageUrls.length > 1) {
            await addMultipleImages(imageUrls.slice(1));
          }
        } else {
          // Fallback: add all images and update mapping
          await addMultipleImages(imageUrls);
          const newMapping = { ...panelImageMapping };
          newMapping[selectedPanelForAction.panelId] = selectedImages.length;
          updatePanelImageMapping(newMapping);
        }

        debugLog(`Replaced image in panel ${selectedPanelForAction.panelId}`);
      } else {
        // Add new image to empty panel
        await addMultipleImages(imageUrls);

        // Get the starting index for new images
        const currentLength = selectedImages.length;

        // Create new mapping with the first image assigned to the selected panel
        const newMapping = { ...panelImageMapping };
        newMapping[selectedPanelForAction.panelId] = currentLength;

        debugLog(`Assigning image ${currentLength} to panel ${selectedPanelForAction.panelId}`);

        // If there are more images, they'll be available for assignment to other panels
        updatePanelImageMapping(newMapping);

        debugLog(`Assigned image to specific panel. Updated mapping:`, newMapping);
      }
    } catch (error) {
      console.error("Error loading files for specific panel:", error);
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

    let newPanelCount = panelCount;
    if (numNewImages > numEmptyPanels) {
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
                    if (panelCount > 2) {
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
                  <Refresh sx={{ mr: 1, fontSize: 18 }} />
                  Replace
                </MenuItem>
                <MenuItem onClick={handleClearImage}>
                  <Clear sx={{ mr: 1, fontSize: 18 }} />
                  Remove
                </MenuItem>
                {panelCount > 2 && (
                  <MenuItem onClick={handleDeleteFrameWithImage}>
                    <Delete sx={{ mr: 1, fontSize: 18 }} />
                    Delete frame
                  </MenuItem>
                )}
              </>
            ) : (
              <>
                <MenuItem onClick={handleUploadToPanel}>
                  <Upload sx={{ mr: 1, fontSize: 18 }} />
                  Add image
                </MenuItem>
                {panelCount > 2 && (
                  <MenuItem onClick={handleRemoveFrameFromMenu}>
                    <RemoveCircle sx={{ mr: 1, fontSize: 18 }} />
                    Remove frame
                  </MenuItem>
                )}
              </>
            )}
          </Menu>
        </Box>
      ) : (
        // Simple empty state like legacy version
        <Box>
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

          {/* Start from scratch option below the upload box */}
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
                    '&:hover': {
                      color: 'primary.dark'
                    }
                  }}
                >
                  start from scratch
                </Typography>
              </Typography>
            </Box>
          )}
        </Box>
      )}

      {/* User image library below uploader */}
      {isAdmin && (
        <LibraryBrowser
          isAdmin
          multiple
          refreshTrigger={libraryRefreshTrigger}
          userSub={user?.attributes?.sub || user?.username}
          onSelect={(items) => handleLibrarySelect(items)}
        />
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
};

export default BulkUploadSection; 