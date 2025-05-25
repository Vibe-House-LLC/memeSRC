import React, { useRef, useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  useMediaQuery,
  IconButton,
  Card,
  CardMedia,
  Stack,
  Chip,
  Tooltip,
  Menu,
  MenuItem
} from '@mui/material';
import { useTheme, styled, alpha } from '@mui/material/styles';
import { 
  CloudUpload, 
  Add,
  Delete,
  Image as ImageIcon,
  PhotoLibrary,
  ChevronLeft,
  ChevronRight,
  RemoveCircle,
  Upload,
  Refresh,
  Clear
} from '@mui/icons-material';
import DisclosureCard from './DisclosureCard';

const debugLog = (...args) => { console.log(...args); };

// Styled components similar to CollageSettingsStep
const HorizontalScroller = styled(Box)(({ theme }) => ({
  display: 'flex',
  overflowX: 'auto',
  overflowY: 'hidden',
  scrollbarWidth: 'none',  // Firefox
  '&::-webkit-scrollbar': {
    display: 'none',  // Chrome, Safari, Opera
  },
  msOverflowStyle: 'none',  // IE, Edge
  gap: theme.spacing(2),
  padding: theme.spacing(1, 0, 1.25, 0),
  position: 'relative',
  scrollBehavior: 'smooth',
  alignItems: 'center',
  justifyContent: 'flex-start',
  minHeight: 80,
  maxWidth: '100%',
  width: '100%',
  boxSizing: 'border-box',
  contain: 'content',
  WebkitOverflowScrolling: 'touch',
  overscrollBehavior: 'contain',
  [theme.breakpoints.up('sm')]: {
    padding: theme.spacing(1, 0, 1.25, 0),
    gap: theme.spacing(2),
  }
}));

const ScrollButton = styled(IconButton)(({ theme, direction }) => ({
  position: 'absolute',
  top: 'calc(50% - 8px)',
  transform: 'translateY(-50%)',
  zIndex: 10,
  backgroundColor: theme.palette.mode === 'dark' 
    ? alpha(theme.palette.background.paper, 0.8)
    : alpha(theme.palette.background.paper, 0.9),
  boxShadow: `0 2px 8px ${theme.palette.mode === 'dark' 
    ? 'rgba(0,0,0,0.3)' 
    : 'rgba(0,0,0,0.15)'}`,
  border: `1px solid ${theme.palette.mode === 'dark'
    ? alpha(theme.palette.divider, 0.5)
    : theme.palette.divider}`,
  color: theme.palette.primary.main,
  '&:hover': {
    backgroundColor: theme.palette.mode === 'dark' 
      ? alpha(theme.palette.background.paper, 0.9)
      : alpha(theme.palette.background.default, 0.95),
    color: theme.palette.primary.dark,
    transform: 'translateY(-50%) scale(1.05)',
    boxShadow: `0 3px 10px ${theme.palette.mode === 'dark' 
      ? 'rgba(0,0,0,0.4)' 
      : 'rgba(0,0,0,0.2)'}`,
  },
  ...(direction === 'left' ? { left: -8 } : { right: -8 }),
  width: 32,
  height: 32,
  minWidth: 'unset',
  padding: 0,
  borderRadius: '50%',
  transition: theme.transitions.create(
    ['background-color', 'color', 'box-shadow', 'transform', 'opacity'], 
    { duration: theme.transitions.duration.shorter }
  ),
  [theme.breakpoints.up('sm')]: {
    width: 36,
    height: 36,
    ...(direction === 'left' ? { left: -12 } : { right: -12 }),
  }
}));

const ScrollIndicator = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'isVisible'
})(({ theme, direction, isVisible }) => ({
  position: 'absolute',
  top: 0,
  bottom: 0,
  width: 40,
  pointerEvents: 'none',
  zIndex: 2,
  opacity: isVisible ? 1 : 0,
  transition: 'opacity 0.3s ease',
  background: direction === 'left'
    ? `linear-gradient(90deg, ${theme.palette.mode === 'dark' 
        ? 'rgba(25,25,25,0.9)' 
        : 'rgba(255,255,255,0.9)'} 0%, transparent 100%)`
    : `linear-gradient(270deg, ${theme.palette.mode === 'dark' 
        ? 'rgba(25,25,25,0.9)' 
        : 'rgba(255,255,255,0.9)'} 0%, transparent 100%)`,
  ...(direction === 'left' ? { left: 0 } : { right: 0 })
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
  width: 80,
  height: 80,
  padding: theme.spacing(1),
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
  width: 80,
  height: 80,
  padding: theme.spacing(1),
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
  replaceImage // Add replaceImage function
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const bulkFileInputRef = useRef(null);
  const panelScrollerRef = useRef(null);
  const specificPanelFileInputRef = useRef(null);

  // State for scroll indicators
  const [panelLeftScroll, setPanelLeftScroll] = useState(false);
  const [panelRightScroll, setPanelRightScroll] = useState(false);

  // State for context menu
  const [contextMenu, setContextMenu] = useState(null);
  const [selectedPanelForAction, setSelectedPanelForAction] = useState(null);
  const [disableTooltips, setDisableTooltips] = useState(false);

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

  // Scroll functions
  const scrollLeft = (ref) => {
    if (ref.current) {
      const scrollDistance = Math.min(ref.current.clientWidth * 0.5, 250);
      ref.current.scrollBy({ left: -scrollDistance, behavior: 'smooth' });
      
      setTimeout(() => {
        handlePanelScroll();
      }, 350);
    }
  };
  
  const scrollRight = (ref) => {
    if (ref.current) {
      const scrollDistance = Math.min(ref.current.clientWidth * 0.5, 250);
      ref.current.scrollBy({ left: scrollDistance, behavior: 'smooth' });
      
      setTimeout(() => {
        handlePanelScroll();
      }, 350);
    }
  };

  // Check scroll position and update indicators
  const checkScrollPosition = (ref, setLeftScroll, setRightScroll) => {
    if (!ref.current) return;
    
    const { scrollLeft, scrollWidth, clientWidth } = ref.current;
    const hasLeft = scrollLeft > 5;
    const hasRight = scrollLeft < scrollWidth - clientWidth - 5;
    
    setLeftScroll(hasLeft);
    setRightScroll(hasRight);
  };

  const handlePanelScroll = () => {
    checkScrollPosition(panelScrollerRef, setPanelLeftScroll, setPanelRightScroll);
  };

  // Effect to handle scroll indicators
  useEffect(() => {
    handlePanelScroll();
    
    const handleResize = () => {
      handlePanelScroll();
    };
    
    const panelScrollerElement = panelScrollerRef.current;
    
    if (panelScrollerElement) {
      panelScrollerElement.addEventListener('scroll', handlePanelScroll);
    }
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      if (panelScrollerElement) {
        panelScrollerElement.removeEventListener('scroll', handlePanelScroll);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Update scroll indicators when content changes
  useEffect(() => {
    handlePanelScroll();
    
    setTimeout(() => {
      handlePanelScroll();
    }, 100);
  }, [selectedImages, panelCount, panelImageMapping]);

  // --- Handler for bulk file upload ---
  const handleBulkFileUpload = (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    // Helper function to load a single file and return a Promise with the data URL
    const loadFile = (file) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(e);
        reader.readAsDataURL(file);
      });
    };

    debugLog(`Bulk uploading ${files.length} files...`);

    // Process all files
    Promise.all(files.map(loadFile))
      .then((imageUrls) => {
        debugLog(`Loaded ${imageUrls.length} files for bulk upload`);
        
        // Add all images at once
        addMultipleImages(imageUrls);
        
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
        
        // Scroll to collage preview after a short delay to ensure DOM updates
        setTimeout(() => {
          // Look for the collage preview section
          const collagePreview = document.querySelector('[data-testid="dynamic-collage-preview-root"]') || 
                               document.querySelector('.MuiBox-root:has([data-testid="dynamic-collage-preview-root"])') ||
                               document.querySelector('h5:contains("Your Collage")') ||
                               // Fallback to any element with "collage" in data attributes or class
                               document.querySelector('[class*="collage"], [data-*="collage"]');
          
          if (collagePreview) {
            const navBarHeight = 80; // Account for navigation bar height
            const elementTop = collagePreview.getBoundingClientRect().top + window.pageYOffset;
            const offsetPosition = elementTop - navBarHeight;
            
            window.scrollTo({
              top: offsetPosition,
              behavior: 'smooth'
            });
            
            debugLog('Scrolled to collage preview');
          } else {
            // Fallback: scroll to a reasonable position down the page
            window.scrollTo({
              top: window.innerHeight * 0.6, // Scroll down about 60% of viewport
              behavior: 'smooth'
            });
            
            debugLog('Scrolled to fallback position (collage preview not found)');
          }
        }, 500); // 500ms delay to ensure DOM updates and panel count changes are applied
      })
      .catch((error) => {
        console.error("Error loading files:", error);
      });
    
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

    // Extract the panel number from the panel ID to remove
    const panelNumberToRemove = parseInt(panelIdToRemove.split('-')[1] || '0', 10);
    
    debugLog(`Removing panel number: ${panelNumberToRemove} (reducing from ${panelCount} to ${panelCount - 1} panels)`);

    // Get the current panel mapping
    const currentMapping = { ...panelImageMapping };
    
    // Remove the specific panel from mapping
    delete currentMapping[panelIdToRemove];
    
    // Create new mapping by shifting all panels after the removed one
    const updatedMapping = {};
    
    Object.entries(currentMapping).forEach(([panelId, imageIndex]) => {
      const panelNumber = parseInt(panelId.split('-')[1] || '0', 10);
      
      if (panelNumber < panelNumberToRemove) {
        // Panels before the removed one stay the same
        updatedMapping[panelId] = imageIndex;
      } else if (panelNumber > panelNumberToRemove) {
        // Panels after the removed one shift up by 1
        const newPanelNumber = panelNumber - 1;
        const newPanelId = selectedTemplate?.layout?.panels?.[newPanelNumber - 1]?.id || `panel-${newPanelNumber}`;
        updatedMapping[newPanelId] = imageIndex;
        debugLog(`Shifting panel ${panelNumber} to panel ${newPanelNumber} (${panelId} -> ${newPanelId})`);
      }
      // The removed panel (panelNumber === panelNumberToRemove) is skipped
    });
    
    // Update panel count
    const newPanelCount = panelCount - 1;
    setPanelCount(newPanelCount);
    
    // Apply the updated mapping
    updatePanelImageMapping(updatedMapping);
    
    debugLog(`Frame removed. New panel count: ${newPanelCount}, Updated mapping:`, updatedMapping);
  };

  // Handler for opening context menu on empty panel click
  const handleEmptyPanelClick = (event, panel) => {
    event.preventDefault();
    
    setDisableTooltips(true);
    setSelectedPanelForAction(panel);
    setContextMenu({
      mouseX: event.clientX - 2,
      mouseY: event.clientY - 4,
    });
  };

  // Handler for opening context menu on panel with image click
  const handleImagePanelClick = (event, panel) => {
    event.preventDefault();
    
    setDisableTooltips(true);
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
    setDisableTooltips(false);
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
      // First remove the image
      handleRemoveImage(selectedPanelForAction.imageIndex);
      
      // Then remove the frame
      handleRemoveFrame(selectedPanelForAction.panelId);
    }
    handleContextMenuClose();
  };

  // Handler for file selection for specific panel
  const handleSpecificPanelFileChange = (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0 || !selectedPanelForAction) return;

    // Helper function to load a single file and return a Promise with the data URL
    const loadFile = (file) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    };

    debugLog(`Uploading ${files.length} files to specific panel: ${selectedPanelForAction.panelId}`);

    // Process all files
    Promise.all(files.map(loadFile))
      .then((imageUrls) => {
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
            replaceImage(selectedPanelForAction.imageIndex, firstImageUrl);
            if (imageUrls.length > 1) {
              addMultipleImages(imageUrls.slice(1));
            }
          } else {
            // Fallback: add all images and update mapping
            addMultipleImages(imageUrls);
            const newMapping = { ...panelImageMapping };
            newMapping[selectedPanelForAction.panelId] = selectedImages.length;
            updatePanelImageMapping(newMapping);
          }
          
          debugLog(`Replaced image in panel ${selectedPanelForAction.panelId}`);
        } else {
          // Add new image to empty panel
          addMultipleImages(imageUrls);
          
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
      })
      .catch((error) => {
        console.error("Error loading files for specific panel:", error);
      });
    
    // Reset file input
    if (event.target) {
      event.target.value = null;
    }
  };

  // Generate panel list data
  const generatePanelList = () => {
    const panels = [];
    
    for (let panelIndex = 0; panelIndex < panelCount; panelIndex += 1) {
      const panelId = selectedTemplate?.layout?.panels?.[panelIndex]?.id || `panel-${panelIndex + 1}`;
      const imageIndex = panelImageMapping[panelId];
      const hasImage = imageIndex !== undefined && imageIndex !== null && selectedImages[imageIndex];
      
      panels.push({
        panelId,
        panelNumber: panelIndex + 1,
        imageIndex,
        hasImage,
        image: hasImage ? selectedImages[imageIndex] : null
      });
    }
    
    return panels;
  };

  const panelList = generatePanelList();

  return (
    <DisclosureCard
      title={`Image Collection`}
      icon={PhotoLibrary}
      defaultOpen
      isMobile={isMobile}
      sx={{ width: '100%' }}
    >
      {hasImages ? (
        // Show panel list matching collage state
        <Box>
          {/* Panel list with horizontal scrolling */}
          <Box sx={{ 
            position: 'relative', 
            width: '100%',
            mt: 1,
            pt: 0.5, 
            pb: 0.5,
            [theme.breakpoints.up('sm')]: {
              width: '100%',
              mt: 1,
              pt: 0.5,
              pb: 0.5
            }
          }}>
            <ScrollButton 
              direction="left" 
              onClick={() => scrollLeft(panelScrollerRef)} 
              size="small"
              aria-label="Scroll left"
              sx={{ 
                display: 'flex',
                visibility: panelLeftScroll ? 'visible' : 'hidden',
                opacity: panelLeftScroll ? 1 : 0,
              }}
            >
              <ChevronLeft fontSize="small" />
            </ScrollButton>
            
            <ScrollButton 
              direction="right" 
              onClick={() => scrollRight(panelScrollerRef)} 
              size="small"
              aria-label="Scroll right"
              sx={{ 
                display: 'flex',
                visibility: panelRightScroll ? 'visible' : 'hidden',
                opacity: panelRightScroll ? 1 : 0,
              }}
            >
              <ChevronRight fontSize="small" />
            </ScrollButton>

            <HorizontalScroller ref={panelScrollerRef}>
              {panelList.map((panel) => (
                <Tooltip 
                  key={panel.panelId}
                  title={
                    panel.hasImage 
                      ? `Panel ${panel.panelNumber} - Click for options` 
                      : panelCount > 2 
                        ? `Panel ${panel.panelNumber} - Empty (Click for options)`
                        : `Panel ${panel.panelNumber} - Empty (Click to upload)`
                  }
                  arrow
                  disableHoverListener={disableTooltips}
                  disableFocusListener={disableTooltips}
                  disableTouchListener={disableTooltips}
                >
                  <PanelThumbnail
                    hasImage={panel.hasImage}
                    onClick={(event) => {
                      if (panel.hasImage) {
                        handleImagePanelClick(event, panel);
                      } else if (!panel.hasImage) {
                        if (panelCount > 2) {
                          handleEmptyPanelClick(event, panel);
                        } else {
                          // If only 2 panels, directly upload to this panel
                          setSelectedPanelForAction(panel);
                          specificPanelFileInputRef.current?.click();
                        }
                      }
                    }}
                    sx={{
                      cursor: 'pointer'
                    }}
                  >
                    <Box sx={{ 
                      position: 'relative',
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      {/* Image preview or empty state */}
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
                            alt={`Panel ${panel.panelNumber} image`}
                            sx={{ objectFit: 'cover' }}
                          />
                        ) : (
                          <ImageIcon sx={{ color: 'text.disabled', fontSize: 20 }} />
                        )}
                      </Box>

                      {/* Panel number chip */}
                      <Chip
                        label={panel.panelNumber}
                        size="small"
                        variant="filled"
                        sx={{
                          position: 'absolute',
                          bottom: -8,
                          left: '50%',
                          transform: 'translateX(-50%)',
                          height: 18,
                          fontSize: '0.65rem',
                          fontWeight: 'bold',
                          px: 0.75,
                          backgroundColor: theme => panel.hasImage 
                            ? theme.palette.primary.main
                            : theme.palette.mode === 'dark' 
                              ? 'rgba(255, 255, 255, 0.15)' 
                              : 'rgba(0, 0, 0, 0.08)',
                          color: theme => panel.hasImage 
                            ? theme.palette.primary.contrastText
                            : theme.palette.text.primary,
                          '& .MuiChip-label': {
                            px: 0.75,
                            py: 0
                          }
                        }}
                      />

                      {/* Remove indicator for images */}
                      {panel.hasImage && removeImage && (
                        <Box 
                          sx={{ 
                            position: 'absolute', 
                            top: 4, 
                            right: 4, 
                            bgcolor: 'error.main',
                            borderRadius: '50%',
                            width: 16,
                            height: 16,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <Delete sx={{ fontSize: 10, color: 'white' }} />
                        </Box>
                      )}

                      {/* Remove frame indicator for empty panels */}
                      {!panel.hasImage && panelCount > 2 && (
                        <Box 
                          sx={{ 
                            position: 'absolute', 
                            top: 4, 
                            right: 4, 
                            bgcolor: 'warning.main',
                            borderRadius: '50%',
                            width: 16,
                            height: 16,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <RemoveCircle sx={{ fontSize: 10, color: 'white' }} />
                        </Box>
                      )}
                    </Box>
                  </PanelThumbnail>
                </Tooltip>
              ))}

              {/* Add more images card - only show if no empty frames */}
              {!hasEmptyFrames() && (
                <Tooltip title="Upload more images" arrow>
                  <AddMoreCard
                    onClick={() => bulkFileInputRef.current?.click()}
                  >
                    <Box sx={{ 
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '100%'
                    }}>
                      <Add sx={{ 
                        fontSize: 24, 
                        color: 'text.secondary',
                        mb: 0.5
                      }} />
                      <Typography variant="caption" sx={{ 
                        color: 'text.secondary',
                        fontSize: '0.6rem',
                        textAlign: 'center',
                        lineHeight: 1
                      }}>
                        Add More
                      </Typography>
                    </Box>
                  </AddMoreCard>
                </Tooltip>
              )}
              
              {/* Spacer to ensure last items can be centered when scrolled fully */}
              <Box sx={{ minWidth: 4, flexShrink: 0 }} />
            </HorizontalScroller>
            
            {/* Visual indicators for scrolling */}
            <ScrollIndicator 
              direction="left" 
              isVisible={panelLeftScroll}
            />
            
            <ScrollIndicator 
              direction="right" 
              isVisible={panelRightScroll}
            />
          </Box>

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
            multiple
            onChange={handleSpecificPanelFileChange}
          />

          {/* Context menu for panels */}
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
              // Options for panels with images
              <>
                <MenuItem onClick={handleReplaceImage}>
                  <Refresh sx={{ mr: 1, fontSize: 18 }} />
                  Replace image
                </MenuItem>
                <MenuItem onClick={handleClearImage}>
                  <Clear sx={{ mr: 1, fontSize: 18 }} />
                  Clear image
                </MenuItem>
                {panelCount > 2 && (
                  <MenuItem onClick={handleDeleteFrameWithImage}>
                    <Delete sx={{ mr: 1, fontSize: 18 }} />
                    Delete frame
                  </MenuItem>
                )}
              </>
            ) : (
              // Options for empty panels
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
        // Show initial upload interface
        <Box sx={{ 
          p: 3, 
          borderRadius: 3,
          border: `2px dashed ${theme.palette.divider}`,
          backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          '&:hover': {
            borderColor: theme.palette.primary.main,
            backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
          }
        }}>
          <Box 
            onClick={() => bulkFileInputRef.current?.click()}
            sx={{ py: 2 }}
          >
            <CloudUpload sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, color: '#fff' }}>
              Upload Your Images
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: '500px', mx: 'auto' }}>
              Drag and drop or click to select multiple images for your collage
            </Typography>
            <Button 
              variant="contained" 
              size="large"
              startIcon={<Add />}
              onClick={(e) => {
                e.stopPropagation();
                bulkFileInputRef.current?.click();
              }}
              sx={{
                py: 1.5,
                px: 4,
                fontSize: '1.1rem',
                fontWeight: 600,
                borderRadius: 2
              }}
            >
              Upload Images
            </Button>
          </Box>
          
          {/* Hidden bulk file input */}
          <input
            type="file"
            ref={bulkFileInputRef}
            style={{ display: 'none' }}
            accept="image/*"
            multiple
            onChange={handleBulkFileUpload}
          />
        </Box>
      )}
    </DisclosureCard>
  );
};

export default BulkUploadSection; 