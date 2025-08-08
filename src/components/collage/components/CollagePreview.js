import React, { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import {
  Menu,
  MenuItem,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  AppBar,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import CloseIcon from '@mui/icons-material/Close';
import { aspectRatioPresets } from '../config/CollageConfig';
import CanvasCollagePreview from './CanvasCollagePreview';
import { LibraryBrowser } from '../../library';
import { get as getFromLibrary } from '../../../utils/library/storage';

const DEBUG_MODE = process.env.NODE_ENV === 'development' && typeof window !== 'undefined' && (() => {
  try { return localStorage.getItem('meme-src-collage-debug') === '1'; } catch { return false; }
})();
const debugLog = (...args) => { if (DEBUG_MODE) console.log(...args); };

/**
 * Get the aspect ratio value from the presets
 * @param {string} selectedAspectRatio - The ID of the selected aspect ratio
 * @returns {number} The aspect ratio value
 */
const getAspectRatioValue = (selectedAspectRatio) => {
  const aspectRatioPreset = aspectRatioPresets.find(preset => preset.id === selectedAspectRatio);
  return aspectRatioPreset ? aspectRatioPreset.value : 1; // Default to 1 (square) if not found
};

/**
 * CollagePreview - A component for previewing and interacting with a collage
 * Wraps DynamicCollagePreview and adds panel interaction functionality
 */
const CollagePreview = ({
  selectedTemplate,
  selectedAspectRatio,
  panelCount,
  selectedImages,
  addMultipleImages,
  replaceImage,
  updatePanelImageMapping,
  panelImageMapping,
  borderThickness = 0,
  borderColor = '#000000',
  panelTransforms,
  updatePanelTransform,
  panelTexts,
  updatePanelText,
  lastUsedTextSettings,
  isCreatingCollage = false,
}) => {
  const fileInputRef = useRef(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // State for menu
  const [menuPosition, setMenuPosition] = useState(null);
  const [activePanelIndex, setActivePanelIndex] = useState(null);
  const [activePanelId, setActivePanelId] = useState(null);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isReplaceMode, setIsReplaceMode] = useState(false);
  const [activeExistingImageIndex, setActiveExistingImageIndex] = useState(null);

  // Get the aspect ratio value
  const aspectRatioValue = getAspectRatioValue(selectedAspectRatio);

  // Handle panel click - open Library for both empty frames and replacements
  const handlePanelClick = (index, panelId) => {
    debugLog(`Panel clicked: index=${index}, panelId=${panelId}`);
    setActivePanelIndex(index);
    setActivePanelId(panelId);

    // Determine if the clicked panel currently has an assigned image
    const imageIndex = panelImageMapping?.[panelId];
    const hasValidImage =
      imageIndex !== undefined &&
      imageIndex !== null &&
      imageIndex >= 0 &&
      imageIndex < (selectedImages?.length || 0) &&
      selectedImages?.[imageIndex];

    if (!hasValidImage) {
      // Empty frame: add from Library
      setIsReplaceMode(false);
      setActiveExistingImageIndex(null);
      setIsLibraryOpen(true);
    } else {
      // Frame has image: replace from Library
      setIsReplaceMode(true);
      setActiveExistingImageIndex(imageIndex);
      setIsLibraryOpen(true);
    }
  };

  // Open menu for a panel
  const handleMenuOpen = (event, index) => {
    event.stopPropagation(); // Prevent panel click
    
    // Store the mouse position instead of the element reference
    setMenuPosition({
      left: event.clientX - 2,
      top: event.clientY - 4,
    });
    
    setActivePanelIndex(index);
  };

  // Close menu
  const handleMenuClose = () => {
    setMenuPosition(null);
  };

  // Handle replace image from menu
  const handleReplaceImage = () => {
    if (activePanelIndex !== null) {
      // Determine panel ID and existing image index
      let panelId;
      try {
        const layoutPanel = selectedTemplate?.layout?.panels?.[activePanelIndex];
        const templatePanel = selectedTemplate?.panels?.[activePanelIndex];
        panelId = layoutPanel?.id || templatePanel?.id || `panel-${activePanelIndex + 1}`;
      } catch (error) {
        panelId = `panel-${activePanelIndex + 1}`;
      }

      setActivePanelId(panelId);
      const existingIdx = panelImageMapping?.[panelId];
      setActiveExistingImageIndex(typeof existingIdx === 'number' ? existingIdx : null);
      setIsReplaceMode(true);
      setIsLibraryOpen(true);
    }

    // Close the menu
    handleMenuClose();
  };

  // Handle file selection for a panel
  const handleFileChange = async (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0 || activePanelIndex === null) return;

    // Helper function to load a single file and return a Promise with the data URL
    const loadFile = (file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(e);
        reader.readAsDataURL(file);
      });

    // Debug selected template and active panel
    debugLog("File upload for panel:", {
      activePanelIndex,
      fileCount: files.length,
      template: selectedTemplate,
      hasLayout: selectedTemplate && !!selectedTemplate.layout,
      hasPanels: selectedTemplate && selectedTemplate.layout && !!selectedTemplate.layout.panels,
      currentMapping: panelImageMapping
    });

    // Determine panel ID from template structure (same for both menu and direct clicks)
    let clickedPanelId;
    
    // Use the stored activePanelId if available
    if (activePanelId) {
      clickedPanelId = activePanelId;
      debugLog(`Using stored activePanelId: ${clickedPanelId}`);
    } else {
      // Fallback: Try to get panel ID from template structure using activePanelIndex
      console.warn("activePanelId not set, falling back to index-based lookup");
      try {
        const layoutPanel = selectedTemplate?.layout?.panels?.[activePanelIndex];
        const templatePanel = selectedTemplate?.panels?.[activePanelIndex];
        clickedPanelId = layoutPanel?.id || templatePanel?.id || `panel-${activePanelIndex + 1}`;
        debugLog(`Using fallback panel ID: ${clickedPanelId} for activePanelIndex: ${activePanelIndex}`);
      } catch (error) {
        console.error("Error getting fallback panel ID:", error);
        clickedPanelId = `panel-${activePanelIndex + 1}`;
      }
    }

    try {
      // Process all files
      const imageUrls = await Promise.all(files.map(loadFile));
      debugLog(`Loaded ${imageUrls.length} files for panel ${clickedPanelId}`);

      // Check if this is a replacement operation for the first file
      const existingImageIndex = panelImageMapping[clickedPanelId];
      debugLog(`Panel ${clickedPanelId}: existingImageIndex=${existingImageIndex}`);

      if (existingImageIndex !== undefined && imageUrls.length === 1) {
        // If this panel already has an image and we're only uploading one file, replace it
        debugLog(`Replacing image at index ${existingImageIndex} for panel ${clickedPanelId}`);
        await replaceImage(existingImageIndex, imageUrls[0]);
      } else {
        // Otherwise, add all images sequentially
        const currentLength = selectedImages.length;
        debugLog(`Adding ${imageUrls.length} new images starting at index ${currentLength}`);

        // Add all images at once
        await addMultipleImages(imageUrls);

        // If this is a single file replacement, update the specific panel mapping
        if (imageUrls.length === 1) {
          const newMapping = {
            ...panelImageMapping,
            [clickedPanelId]: currentLength
          };
          debugLog("Updated mapping for single image:", newMapping);
          updatePanelImageMapping(newMapping);
        } else {
          // For multiple files, don't auto-assign them to panels
          // Let the user manually assign them by clicking on panels
          debugLog(`Added ${imageUrls.length} images. Users can now assign them to panels manually.`);
        }
      }
    } catch (error) {
      console.error("Error loading files:", error);
    }
    
    // Reset file input and active panel state
    setActivePanelIndex(null);
    setActivePanelId(null);
    if (event.target) {
      event.target.value = null;
    }
  };

  // Handle selecting an image from the Library for the active (empty) panel
  const handleLibrarySelect = async (items) => {
    if (!items || items.length === 0 || activePanelIndex === null) {
      setIsLibraryOpen(false);
      return;
    }

    // Optimistically close dialog for snappier UX
    setIsLibraryOpen(false);

    // Determine panel ID
    let clickedPanelId = activePanelId;
    if (!clickedPanelId) {
      try {
        const layoutPanel = selectedTemplate?.layout?.panels?.[activePanelIndex];
        const templatePanel = selectedTemplate?.panels?.[activePanelIndex];
        clickedPanelId = layoutPanel?.id || templatePanel?.id || `panel-${activePanelIndex + 1}`;
      } catch (e) {
        clickedPanelId = `panel-${activePanelIndex + 1}`;
      }
    }

    const selected = items[0];

    // Helper to ensure we use a data URL for canvas safety
    const ensureDataUrl = async (item) => {
      const srcUrl = item?.originalUrl || item?.displayUrl || item?.url || item;
      const isData = typeof srcUrl === 'string' && srcUrl.startsWith('data:');
      const libraryKey = item?.metadata?.libraryKey;
      if (isData) {
        return srcUrl;
      }
      if (libraryKey) {
        try {
          const blob = await getFromLibrary(libraryKey);
          const dataUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
          return dataUrl;
        } catch (e) {
          // Fallback to provided URL if conversion fails
          return srcUrl;
        }
      }
      return srcUrl;
    };

    try {
      if (isReplaceMode && activeExistingImageIndex !== null && typeof activeExistingImageIndex === 'number') {
        // Replace existing image in place with data URL
        const newUrl = await ensureDataUrl(selected);
        await replaceImage(activeExistingImageIndex, newUrl);
      } else {
        // Assign to empty panel: add to images and map using data URL
        const currentLength = selectedImages.length;
        const newUrl = await ensureDataUrl(selected);
        const imageObj = {
          originalUrl: newUrl,
          displayUrl: newUrl,
          metadata: selected?.metadata || {},
        };
        await addMultipleImages([imageObj]);
        const newMapping = {
          ...panelImageMapping,
          [clickedPanelId]: currentLength,
        };
        updatePanelImageMapping(newMapping);
      }
    } finally {
      // Reset active state
      setIsReplaceMode(false);
      setActiveExistingImageIndex(null);
      setActivePanelIndex(null);
      setActivePanelId(null);
    }
  };

  // Close the library dialog and reset active state
  const handleLibraryClose = () => {
    setIsLibraryOpen(false);
    setIsReplaceMode(false);
    setActiveExistingImageIndex(null);
    setActivePanelIndex(null);
    setActivePanelId(null);
  };


  return (
    <Box sx={{ position: 'relative' }}>
      <CanvasCollagePreview
        selectedTemplate={selectedTemplate}
        selectedAspectRatio={selectedAspectRatio}
        panelCount={panelCount}
        images={selectedImages}
        onPanelClick={handlePanelClick}
        onMenuOpen={handleMenuOpen}
        aspectRatioValue={aspectRatioValue}
        panelImageMapping={panelImageMapping}
        updatePanelImageMapping={updatePanelImageMapping}
        borderThickness={borderThickness}
        borderColor={borderColor}
        panelTransforms={panelTransforms}
        updatePanelTransform={updatePanelTransform}
        panelTexts={panelTexts}
        updatePanelText={updatePanelText}
        lastUsedTextSettings={lastUsedTextSettings}
        isGeneratingCollage={isCreatingCollage}
      />
      
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept="image/*"
        onChange={handleFileChange}
      />

      {/* Library selection dialog for empty frame taps */}
      <Dialog
        open={isLibraryOpen}
        onClose={handleLibraryClose}
        fullWidth
        maxWidth="md"
        fullScreen={isMobile}
        PaperProps={{
          sx: {
            borderRadius: isMobile ? 0 : 2,
            bgcolor: '#121212',
            color: '#eaeaea',
          },
        }}
      >
        {isMobile ? (
          <AppBar
            position="sticky"
            color="default"
            elevation={0}
            sx={{ borderBottom: '1px solid #2a2a2a', bgcolor: '#121212', color: '#eaeaea' }}
          >
            <Toolbar>
              <Typography variant="h6" sx={{ flexGrow: 1, color: '#eaeaea' }}>
                Select a photo
              </Typography>
              <IconButton edge="end" aria-label="close" onClick={handleLibraryClose} sx={{ color: '#eaeaea' }}>
                <CloseIcon />
              </IconButton>
            </Toolbar>
          </AppBar>
        ) : (
          <DialogTitle sx={{ pr: 6, color: '#eaeaea' }}>
            Select a photo
            <IconButton
              aria-label="close"
              onClick={handleLibraryClose}
              sx={{ position: 'absolute', right: 8, top: 8, color: '#eaeaea' }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
        )}
        <DialogContent dividers sx={{ padding: isMobile ? '12px' : '16px', bgcolor: '#0f0f0f' }}>
          <LibraryBrowser
            multiple={false}
            uploadEnabled
            deleteEnabled={false}
            instantSelectOnClick
            onSelect={(arr) => handleLibrarySelect(arr)}
          />
        </DialogContent>
        <DialogActions sx={{ padding: isMobile ? '12px' : '16px', bgcolor: '#121212' }}>
          <Button
            onClick={handleLibraryClose}
            variant="contained"
            disableElevation
            fullWidth={isMobile}
            sx={{
              bgcolor: '#252525',
              color: '#f0f0f0',
              border: '1px solid #3a3a3a',
              borderRadius: '8px',
              px: isMobile ? 2 : 2.5,
              py: isMobile ? 1.25 : 0.75,
              textTransform: 'none',
              fontWeight: 600,
              '&:hover': { bgcolor: '#2d2d2d', borderColor: '#4a4a4a' }
            }}
          >
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Panel options menu */}
      <Menu
        open={Boolean(menuPosition)}
        onClose={handleMenuClose}
        anchorReference="anchorPosition"
        anchorPosition={menuPosition || undefined}
      >
        <MenuItem onClick={handleReplaceImage}>Replace image</MenuItem>
      </Menu>
    </Box>
  );
};

CollagePreview.propTypes = {
  selectedTemplate: PropTypes.object,
  selectedAspectRatio: PropTypes.string,
  panelCount: PropTypes.number,
  selectedImages: PropTypes.array,
  addMultipleImages: PropTypes.func.isRequired,
  replaceImage: PropTypes.func.isRequired,
  updatePanelImageMapping: PropTypes.func.isRequired,
  panelImageMapping: PropTypes.object.isRequired,
  borderThickness: PropTypes.number,
  borderColor: PropTypes.string,
  panelTransforms: PropTypes.object,
  updatePanelTransform: PropTypes.func,
  panelTexts: PropTypes.object,
  updatePanelText: PropTypes.func,
  lastUsedTextSettings: PropTypes.object,
  isCreatingCollage: PropTypes.bool,
};

export default CollagePreview; 