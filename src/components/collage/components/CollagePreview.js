import React, { useState, useRef, useContext } from 'react';
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
import { UserContext } from '../../../UserContext';
import { resizeImage } from '../../../utils/library/resizeImage';
import { UPLOAD_IMAGE_MAX_DIMENSION_PX, EDITOR_IMAGE_MAX_DIMENSION_PX } from '../../../constants/imageProcessing';

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
  onCaptionEditorVisibleChange,
  onGenerateNudgeRequested,
  isFrameActionSuppressed,
  // New: notify when the canvas has rendered a given signature
  renderSig,
  onPreviewRendered,
  onPreviewMetaChange,
  // Editing session tracking
  onEditingSessionChange,
  // Optional persisted custom layout to initialize preview grid
  customLayout,
  customLayoutKey,
}) => {
  const fileInputRef = useRef(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user } = useContext(UserContext);
  const isAdmin = user?.['cognito:groups']?.includes('admins');
  
  // State for menu
  const [menuPosition, setMenuPosition] = useState(null);
  const [activePanelIndex, setActivePanelIndex] = useState(null);
  const [activePanelId, setActivePanelId] = useState(null);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isReplaceMode, setIsReplaceMode] = useState(false);
  const [activeExistingImageIndex, setActiveExistingImageIndex] = useState(null);
  
  // Helper: revoke blob: URLs to avoid memory leaks
  const revokeIfBlobUrl = (url) => {
    try {
      if (typeof url === 'string' && url.startsWith('blob:') && typeof URL !== 'undefined' && URL.revokeObjectURL) {
        URL.revokeObjectURL(url);
      }
    } catch (_) {
      // no-op
    }
  };
  const revokeImageObjectUrls = (imageObj) => {
    if (!imageObj) return;
    revokeIfBlobUrl(imageObj.originalUrl);
    revokeIfBlobUrl(imageObj.displayUrl);
  };


  // Get the aspect ratio value
  const aspectRatioValue = getAspectRatioValue(selectedAspectRatio);

  // Handle panel click - admins use Library, non-admins use system file picker
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
      // Empty frame
      setIsReplaceMode(false);
      setActiveExistingImageIndex(null);
      if (isAdmin) {
        setIsLibraryOpen(true);
      } else {
        // Non-admins: open system file picker (legacy behavior)
        fileInputRef.current?.click();
      }
    } else {
      // Frame has image
      setIsReplaceMode(true);
      setActiveExistingImageIndex(imageIndex);
      if (isAdmin) {
        setIsLibraryOpen(true);
      } else {
        // Non-admins: open system file picker to replace image
        fileInputRef.current?.click();
      }
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
      if (isAdmin) {
        setIsLibraryOpen(true);
      } else {
        // Non-admins: open system file picker
        fileInputRef.current?.click();
      }
    }

    // Close the menu
    handleMenuClose();
  };

  // Handle file selection for a panel
  const handleFileChange = async (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0 || activePanelIndex === null) return;

    // Helper: resize then produce a data URL
    const toDataUrl = (blob) => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    // Track blob: URLs created during this handler so we can revoke on failure
    const tempBlobUrls = [];
    const trackBlobUrl = (u) => {
      if (typeof u === 'string' && u.startsWith('blob:')) tempBlobUrls.push(u);
      return u;
    };

    const getImageObject = async (file) => {
      try {
        const uploadBlob = await resizeImage(file, UPLOAD_IMAGE_MAX_DIMENSION_PX);
        const originalUrl = (typeof URL !== 'undefined' && URL.createObjectURL) ? trackBlobUrl(URL.createObjectURL(uploadBlob)) : await toDataUrl(uploadBlob);
        const editorBlob = await resizeImage(uploadBlob, EDITOR_IMAGE_MAX_DIMENSION_PX);
        const displayUrl = (typeof URL !== 'undefined' && URL.createObjectURL) ? trackBlobUrl(URL.createObjectURL(editorBlob)) : await toDataUrl(editorBlob);
        return { originalUrl, displayUrl };
      } catch (_) {
        const dataUrl = (typeof URL !== 'undefined' && URL.createObjectURL && file instanceof Blob) ? trackBlobUrl(URL.createObjectURL(file)) : await toDataUrl(file);
        return { originalUrl: dataUrl, displayUrl: dataUrl };
      }
    };
    const nextFrame = () => new Promise((resolve) => (typeof requestAnimationFrame === 'function' ? requestAnimationFrame(() => resolve()) : setTimeout(resolve, 0)));

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

    let committed = false;
    try {
      // Process files sequentially with small yields to keep UI responsive
      const imageObjs = [];
      for (let i = 0; i < files.length; i += 1) {
        await nextFrame();
        await nextFrame();
        // eslint-disable-next-line no-await-in-loop
        const obj = await getImageObject(files[i]);
        imageObjs.push(obj);
      }
      debugLog(`Loaded ${imageObjs.length} files for panel ${clickedPanelId}`);

      // Check if this is a replacement operation for the first file
      const existingImageIndex = panelImageMapping[clickedPanelId];
      debugLog(`Panel ${clickedPanelId}: existingImageIndex=${existingImageIndex}`);

      if (existingImageIndex !== undefined && imageObjs.length === 1) {
        // If this panel already has an image and we're only uploading one file, replace it
        debugLog(`Replacing image at index ${existingImageIndex} for panel ${clickedPanelId}`);
        const previousImage = selectedImages?.[existingImageIndex];
        await replaceImage(existingImageIndex, imageObjs[0]);
        // Defer revocation to next tick so UI can re-render to new source first
        setTimeout(() => revokeImageObjectUrls(previousImage), 0);
      } else {
        // Otherwise, add all images sequentially
        const currentLength = selectedImages.length;
        debugLog(`Adding ${imageObjs.length} new images starting at index ${currentLength}`);

        // Add all images at once
        await addMultipleImages(imageObjs);

        // If this is a single file replacement, update the specific panel mapping
        if (imageObjs.length === 1) {
          const newMapping = {
            ...panelImageMapping,
            [clickedPanelId]: currentLength
          };
          debugLog("Updated mapping for single image:", newMapping);
          updatePanelImageMapping(newMapping);
        } else {
          // For multiple files, don't auto-assign them to panels
          // Let the user manually assign them by clicking on panels
          debugLog(`Added ${imageObjs.length} images. Users can now assign them to panels manually.`);
        }
      }
      committed = true;
    } catch (error) {
      console.error("Error loading files:", error);
    } finally {
      if (!committed) {
        try { tempBlobUrls.forEach(u => URL.revokeObjectURL(u)); } catch {}
      }
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
    // Build a normalized image object (originalUrl at upload size, displayUrl at editor size)
    const toDataUrl = (blob) => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    // Track blob: URLs created while normalizing; revoke them if we fail to commit
    const tempBlobUrls = [];
    const trackBlobUrl = (u) => {
      if (typeof u === 'string' && u.startsWith('blob:')) tempBlobUrls.push(u);
      return u;
    };

    const buildNormalizedFromBlob = async (blob) => {
      // Create upload-sized and editor-sized JPEGs from the source blob
      const uploadBlob = await resizeImage(blob, UPLOAD_IMAGE_MAX_DIMENSION_PX);
      const originalUrl = (typeof URL !== 'undefined' && URL.createObjectURL) ? trackBlobUrl(URL.createObjectURL(uploadBlob)) : await toDataUrl(uploadBlob);
      const editorBlob = await resizeImage(uploadBlob, EDITOR_IMAGE_MAX_DIMENSION_PX);
      const displayUrl = (typeof URL !== 'undefined' && URL.createObjectURL) ? trackBlobUrl(URL.createObjectURL(editorBlob)) : await toDataUrl(editorBlob);
      return { originalUrl, displayUrl };
    };
    const ensureNormalized = async (item) => {
      const srcUrl = item?.originalUrl || item?.displayUrl || item?.url || item;
      const libraryKey = item?.metadata?.libraryKey;
      // Prefer fetching by library key to get a Blob we can normalize
      if (libraryKey) {
        try {
          const blob = await getFromLibrary(libraryKey);
          return await buildNormalizedFromBlob(blob);
        } catch (e) {
          // Fall back to treating the URL directly below
        }
      }
      // If we already have a data URL or http url, fetch and normalize
      try {
        const res = await fetch(srcUrl);
        const blob = await res.blob();
        return await buildNormalizedFromBlob(blob);
      } catch (_) {
        // As a last resort, pass through
        return { originalUrl: srcUrl, displayUrl: srcUrl, metadata: item?.metadata || {} };
      }
    };

    let committed = false;
    try {
      if (isReplaceMode && activeExistingImageIndex !== null && typeof activeExistingImageIndex === 'number') {
        // Replace existing image in place with data URL for display, but preserve library metadata for persistence
        const normalized = await ensureNormalized(selected);
        const previousImage = selectedImages?.[activeExistingImageIndex];
        await replaceImage(activeExistingImageIndex, { ...normalized, metadata: selected?.metadata || {} });
        setTimeout(() => revokeImageObjectUrls(previousImage), 0);
      } else {
        // Assign to empty panel: add to images and map using data URL
        const currentLength = selectedImages.length;
        const normalized = await ensureNormalized(selected);
        const imageObj = { ...normalized, metadata: selected?.metadata || {} };
        await addMultipleImages([imageObj]);
        const newMapping = {
          ...panelImageMapping,
          [clickedPanelId]: currentLength,
        };
        updatePanelImageMapping(newMapping);
      }
      committed = true;
    } finally {
      // Cleanup any temporary blob URLs if we failed to commit
      if (!committed) {
        try { tempBlobUrls.forEach(u => URL.revokeObjectURL(u)); } catch {}
      }
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
        onSaveGestureDetected={onGenerateNudgeRequested}
        isFrameActionSuppressed={isFrameActionSuppressed}
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
        onCaptionEditorVisibleChange={onCaptionEditorVisibleChange}
        isGeneratingCollage={isCreatingCollage}
        // Render tracking for autosave thumbnails
        renderSig={renderSig}
        onRendered={onPreviewRendered}
        onPreviewMetaChange={onPreviewMetaChange}
        // Editing session tracking
        onEditingSessionChange={onEditingSessionChange}
        // Initialize with a custom grid when reloading a project
        initialCustomLayout={customLayout}
        customLayoutKey={customLayoutKey}
      />
      
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept="image/*"
        onChange={handleFileChange}
      />

      {/* Library selection dialog - admins only */}
      {isAdmin && (
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
              onSelect={(arr) => handleLibrarySelect(arr)}
              showActionBar={false}
              selectionEnabled
              previewOnClick
              showSelectToggle
              initialSelectMode
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
      )}
      
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
  onCaptionEditorVisibleChange: PropTypes.func,
  onGenerateNudgeRequested: PropTypes.func,
  isFrameActionSuppressed: PropTypes.func,
  renderSig: PropTypes.string,
  onPreviewRendered: PropTypes.func,
  onPreviewMetaChange: PropTypes.func,
  onEditingSessionChange: PropTypes.func,
};

export default CollagePreview; 
