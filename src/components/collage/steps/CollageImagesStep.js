import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Box, Button, Menu, MenuItem, ListItemIcon, ListItemText, useMediaQuery } from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import AddCircleOutlineRoundedIcon from '@mui/icons-material/AddCircleOutlineRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import TextFieldsRoundedIcon from '@mui/icons-material/TextFieldsRounded';
import StyleRoundedIcon from '@mui/icons-material/StyleRounded';
import ViewModuleRoundedIcon from '@mui/icons-material/ViewModuleRounded';

// Import our new dynamic CollagePreview component
import CollagePreview from '../components/CollagePreview';
import { LibraryPickerDialog } from '../../library';
import { resizeImage } from '../../../utils/library/resizeImage';
import { UPLOAD_IMAGE_MAX_DIMENSION_PX, EDITOR_IMAGE_MAX_DIMENSION_PX } from '../../../constants/imageProcessing';

// Debugging utils
const DEBUG_MODE = process.env.NODE_ENV === 'development' && typeof window !== 'undefined' && (() => {
  try { return localStorage.getItem('meme-src-collage-debug') === '1'; } catch { return false; }
})();
const debugLog = (...args) => { if (DEBUG_MODE) console.log(...args); };

const CollageImagesStep = ({
  selectedImages = [],
  addImage = () => { console.warn("addImage default prop called"); },
  addMultipleImages = () => { console.warn("addMultipleImages default prop called"); },
  removeImage = () => { console.warn("removeImage default prop called"); },
  updateImage = () => { console.warn("updateImage default prop called"); },
  replaceImage = () => { console.warn("replaceImage default prop called"); },
  clearImages = () => { console.warn("clearImages default prop called"); },
  panelCount = 2,
  selectedTemplate,
  selectedAspectRatio = 'portrait',
  customAspectRatio = 1,
  isSingleImageAutoCustomAspect = false,
  borderThickness = 'medium',
  borderColor,
  borderThicknessOptions = [
    { label: "None", value: 0 },
    { label: "Thin", value: 0.5 },
    { label: "Medium", value: 1.5 },
    { label: "Thicc", value: 4 },
    { label: "Thiccer", value: 7 },
    { label: "XTRA THICC", value: 12 },
    { label: "UNGODLY CHONK'D", value: 20 }
  ],
  panelImageMapping = {},
  updatePanelImageMapping = () => { console.warn("updatePanelImageMapping default prop called"); },
  panelTransforms,
  updatePanelTransform,
  panelTexts,
  stickers = [],
  lastUsedTextSettings,
  updatePanelText,
  updateSticker,
  moveSticker,
  removeSticker,
  setFinalImage = () => { console.warn("setFinalImage default prop called"); },
  handleOpenExportDialog = () => { console.warn("handleOpenExportDialog default prop called"); },
  onCollageGenerated = null,
  isCreatingCollage,
  onPanelSourceDialogOpenChange,
  onCaptionEditorVisibleChange,
  onGenerateNudgeRequested,
  isFrameActionSuppressed,
  isHydratingProject = false,
  onAddPanelRequest,
  canAddPanel = false,
  panelAutoOpenRequest,
  onPanelAutoOpenHandled,
  panelTextAutoOpenRequest,
  onPanelTextAutoOpenHandled,
  panelTransformAutoOpenRequest,
  onPanelTransformAutoOpenHandled,
  panelReorderAutoOpenRequest,
  onPanelReorderAutoOpenHandled,
  onRemovePanelRequest,
  onAddTextRequest,
  onAddStickerFromLibrary,
  canManageStickers = false,
  // Render tracking passthrough for autosave thumbnails
  renderSig,
  onPreviewRendered,
  onPreviewMetaChange,
  // Editing session tracking
  onEditingSessionChange,
  // Optional persisted custom layout to initialize preview grid
  customLayout,
  customLayoutKey,
  allowHydrationTransformCarry = false,
  canvasResetKey = 0,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const fileInputRef = useRef(null);
  const [addMenuAnchorEl, setAddMenuAnchorEl] = useState(null);
  const [addMenuPosition, setAddMenuPosition] = useState('end');
  const [stickerPickerOpen, setStickerPickerOpen] = useState(false);
  const [stickerPickerBusy, setStickerPickerBusy] = useState(false);
  const [stickerPickerError, setStickerPickerError] = useState('');
  
  // Debug the props we're receiving
  debugLog("CollageImagesStep props:", {
    selectedImages: selectedImages?.length,
    panelCount,
    selectedTemplate: selectedTemplate?.name,
    selectedAspectRatio,
    borderThickness,
    borderColor,
    panelImageMapping,
    panelTransforms,
    panelTexts,
    stickersCount: stickers.length,
  });

  // Handler for file selection from Add Image button - use same logic as BulkUploadSection
  const handleFileChange = async (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    // Normalize like library: resize to cap and convert to data URL (JPEG)
    const toDataUrl = (blob) => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    // Track any blob: URLs created during processing so we can clean them up if needed
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
        // Fallback to original file as blob URL or data URL if resize fails
        const dataUrl = (typeof URL !== 'undefined' && URL.createObjectURL && file instanceof Blob) ? trackBlobUrl(URL.createObjectURL(file)) : await toDataUrl(file);
        return { originalUrl: dataUrl, displayUrl: dataUrl };
      }
    };

    debugLog(`Add Image button: uploading ${files.length} files...`);

    let committed = false;
    try {
      // Process all files with client-side resizing and data URL conversion
      const imageObjs = await Promise.all(files.map(getImageObject));
      debugLog(`Loaded ${imageObjs.length} files from Add Image button`);

      // Add all images at once - this will trigger the same auto-assignment logic
      await addMultipleImages(imageObjs);
      committed = true;

      debugLog(`Added ${imageObjs.length} new images via Add Image button`);
    } catch (error) {
      console.error("Error loading files from Add Image button:", error);
    } finally {
      // If we failed to commit to state, revoke any temporary blob URLs
      if (!committed) {
        try { tempBlobUrls.forEach(u => URL.revokeObjectURL(u)); } catch {}
      }
    }
    
    // Reset file input
    if (event.target) {
      event.target.value = null;
    }
  };

  // Effect to debug props
  useEffect(() => {
    debugLog("Images updated:", selectedImages);
  }, [selectedImages]);

  // Bulk upload handler and related functions removed since moved to BulkUploadSection
  const canTriggerAddPanel = canAddPanel && !isCreatingCollage && !isHydratingProject;
  const triggerAddPanelRequest = (position = 'end') => {
    if (typeof onAddPanelRequest === 'function') {
      onAddPanelRequest(position);
    }
  };
  const isAddMenuOpen = Boolean(addMenuAnchorEl);
  const canAddText = typeof onAddTextRequest === 'function';
  const canAddSticker = canManageStickers && typeof onAddStickerFromLibrary === 'function';
  const openAddMenu = (event, position = 'end') => {
    setAddMenuPosition(position);
    setAddMenuAnchorEl(event.currentTarget);
  };
  const closeAddMenu = () => {
    setAddMenuAnchorEl(null);
  };
  const handleAddTopCaption = () => {
    closeAddMenu();
    if (canAddText) {
      onAddTextRequest('top-caption');
    }
  };
  const handleAddSubtitleText = () => {
    closeAddMenu();
    if (canAddText) {
      onAddTextRequest('subtitle');
    }
  };
  const handleAddSticker = () => {
    closeAddMenu();
    if (!canAddSticker) return;
    setStickerPickerError('');
    setStickerPickerOpen(true);
  };
  const handleAddPanel = () => {
    closeAddMenu();
    triggerAddPanelRequest(addMenuPosition);
  };
  const closeStickerPicker = () => {
    if (stickerPickerBusy) return;
    setStickerPickerOpen(false);
    setStickerPickerError('');
  };
  const handleStickerSelect = async (items) => {
    if (!canAddSticker) return;
    if (!Array.isArray(items) || items.length === 0) return;
    setStickerPickerBusy(true);
    setStickerPickerError('');
    try {
      await onAddStickerFromLibrary(items[0]);
      setStickerPickerOpen(false);
    } catch (error) {
      console.error('Failed to add sticker from unified add menu', error);
      setStickerPickerError('Unable to add that sticker right now.');
    } finally {
      setStickerPickerBusy(false);
    }
  };
  const addPanelButtonSx = {
    textTransform: 'none',
    fontWeight: 700,
    borderRadius: 999,
    px: isMobile ? 1.75 : 2.25,
    borderColor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.55 : 0.42),
    bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.14 : 0.08),
    color: 'text.primary',
    '&:hover': {
      borderColor: theme.palette.primary.main,
      bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.24 : 0.16),
    },
    '&.Mui-disabled': {
      borderColor: alpha(theme.palette.action.disabled, 0.35),
      color: 'text.disabled',
      bgcolor: alpha(theme.palette.action.disabledBackground, theme.palette.mode === 'dark' ? 0.25 : 0.5),
    },
  };

  return (
    <Box sx={{ my: isMobile ? 0 : 0.25 }}>
      {/* Layout Preview */}
      <Box sx={{
        p: isMobile ? 1 : 1.5,
        mb: isMobile ? 1 : 1.5,
        borderRadius: 2,
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        position: 'relative',
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%', mb: isMobile ? 0.75 : 1 }}>
          <Button
            variant="outlined"
            color="primary"
            size={isMobile ? 'small' : 'medium'}
            startIcon={<AddCircleOutlineRoundedIcon fontSize="small" />}
            endIcon={<ExpandMoreRoundedIcon fontSize="small" />}
            onClick={(event) => openAddMenu(event, 'start')}
            sx={addPanelButtonSx}
          >
            Add
          </Button>
        </Box>

        {/* Always render the preview, let it handle null templates */}
        <Box sx={{ 
          width: '100%', 
          mb: 1,
          position: 'relative'
        }} id="collage-preview-container">
          <CollagePreview 
            canvasResetKey={canvasResetKey}
            selectedTemplate={selectedTemplate}
            selectedAspectRatio={selectedAspectRatio}
            customAspectRatio={customAspectRatio}
            isSingleImageAutoCustomAspect={isSingleImageAutoCustomAspect}
            panelCount={panelCount || 1} /* Ensure we always have a fallback */
            selectedImages={selectedImages || []}
            addImage={addImage}
            addMultipleImages={addMultipleImages}
            removeImage={removeImage}
            updateImage={updateImage}
            replaceImage={replaceImage}
            clearImages={clearImages}
            borderThickness={borderThickness}
            borderColor={borderColor}
            borderThicknessOptions={borderThicknessOptions}
            panelImageMapping={panelImageMapping || {}}
            updatePanelImageMapping={updatePanelImageMapping}
            panelTransforms={panelTransforms || {}}
            updatePanelTransform={updatePanelTransform}
            panelTexts={panelTexts}
            stickers={stickers}
            updatePanelText={updatePanelText}
            updateSticker={updateSticker}
            moveSticker={moveSticker}
            removeSticker={removeSticker}
            lastUsedTextSettings={lastUsedTextSettings}
            setFinalImage={setFinalImage}
            handleOpenExportDialog={handleOpenExportDialog}
            onCollageGenerated={onCollageGenerated}
            isCreatingCollage={isCreatingCollage}
            onPanelSourceDialogOpenChange={onPanelSourceDialogOpenChange}
            onCaptionEditorVisibleChange={onCaptionEditorVisibleChange}
            onGenerateNudgeRequested={onGenerateNudgeRequested}
            isFrameActionSuppressed={isFrameActionSuppressed}
            // Render tracking
            renderSig={renderSig}
            onPreviewRendered={onPreviewRendered}
            onPreviewMetaChange={onPreviewMetaChange}
            // Editing session tracking
            onEditingSessionChange={onEditingSessionChange}
            // Initialize with custom layout if provided
            customLayout={customLayout}
            customLayoutKey={customLayoutKey}
            isHydratingProject={isHydratingProject}
            allowHydrationTransformCarry={allowHydrationTransformCarry}
            panelAutoOpenRequest={panelAutoOpenRequest}
            onPanelAutoOpenHandled={onPanelAutoOpenHandled}
            panelTextAutoOpenRequest={panelTextAutoOpenRequest}
            onPanelTextAutoOpenHandled={onPanelTextAutoOpenHandled}
            panelTransformAutoOpenRequest={panelTransformAutoOpenRequest}
            onPanelTransformAutoOpenHandled={onPanelTransformAutoOpenHandled}
            panelReorderAutoOpenRequest={panelReorderAutoOpenRequest}
            onPanelReorderAutoOpenHandled={onPanelReorderAutoOpenHandled}
            onRemovePanelRequest={onRemovePanelRequest}
          />
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%', mt: 0.5 }}>
          <Button
            variant="outlined"
            color="primary"
            size={isMobile ? 'small' : 'medium'}
            startIcon={<AddCircleOutlineRoundedIcon fontSize="small" />}
            endIcon={<ExpandMoreRoundedIcon fontSize="small" />}
            onClick={(event) => openAddMenu(event, 'end')}
            sx={addPanelButtonSx}
          >
            Add
          </Button>
        </Box>
        <Menu
          anchorEl={addMenuAnchorEl}
          open={isAddMenuOpen}
          onClose={closeAddMenu}
          PaperProps={{
            sx: {
              minWidth: 220,
              borderRadius: 2,
              border: `1px solid ${alpha(theme.palette.divider, 0.9)}`,
            },
          }}
        >
          <MenuItem onClick={handleAddTopCaption} disabled={!canAddText}>
            <ListItemIcon><TextFieldsRoundedIcon fontSize="small" /></ListItemIcon>
            <ListItemText primary="Add Top Caption" />
          </MenuItem>
          <MenuItem onClick={handleAddSubtitleText} disabled={!canAddText}>
            <ListItemIcon><TextFieldsRoundedIcon fontSize="small" /></ListItemIcon>
            <ListItemText primary="Add Subtitle Text" />
          </MenuItem>
          <MenuItem onClick={handleAddSticker} disabled={!canAddSticker}>
            <ListItemIcon><StyleRoundedIcon fontSize="small" /></ListItemIcon>
            <ListItemText primary="Add Sticker" />
          </MenuItem>
          <MenuItem onClick={handleAddPanel} disabled={!canTriggerAddPanel}>
            <ListItemIcon><ViewModuleRoundedIcon fontSize="small" /></ListItemIcon>
            <ListItemText primary="Add Panel" />
          </MenuItem>
        </Menu>
        <LibraryPickerDialog
          open={stickerPickerOpen}
          onClose={closeStickerPicker}
          title="Choose a sticker from your library"
          onSelect={(items) => { void handleStickerSelect(items); }}
          busy={stickerPickerBusy}
          errorText={stickerPickerError}
          browserProps={{
            multiple: false,
            uploadEnabled: true,
            deleteEnabled: false,
            showActionBar: false,
            selectionEnabled: true,
            previewOnClick: true,
            showSelectToggle: true,
            initialSelectMode: true,
          }}
        />
        {/* Hidden file input for Add Image button */}
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          accept="image/*"
          multiple
          onChange={handleFileChange}
        />
      </Box>
    </Box>
  );
};

CollageImagesStep.propTypes = {
  selectedImages: PropTypes.arrayOf(
    PropTypes.shape({
      originalUrl: PropTypes.string,
      displayUrl: PropTypes.string,
      subtitle: PropTypes.string,
      subtitleShowing: PropTypes.bool,
      metadata: PropTypes.object,
    })
  ),
  addImage: PropTypes.func,
  addMultipleImages: PropTypes.func,
  removeImage: PropTypes.func,
  updateImage: PropTypes.func,
  replaceImage: PropTypes.func,
  clearImages: PropTypes.func,
  panelCount: PropTypes.number,
  selectedTemplate: PropTypes.object,
  selectedAspectRatio: PropTypes.string,
  customAspectRatio: PropTypes.number,
  isSingleImageAutoCustomAspect: PropTypes.bool,
  borderThickness: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  borderColor: PropTypes.string,
  borderThicknessOptions: PropTypes.array,
  panelImageMapping: PropTypes.object,
  updatePanelImageMapping: PropTypes.func,
  panelTransforms: PropTypes.object,
  updatePanelTransform: PropTypes.func,
  panelTexts: PropTypes.object,
  stickers: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string,
      originalUrl: PropTypes.string,
      thumbnailUrl: PropTypes.string,
      metadata: PropTypes.object,
      aspectRatio: PropTypes.number,
      angleDeg: PropTypes.number,
      widthPercent: PropTypes.number,
      xPercent: PropTypes.number,
      yPercent: PropTypes.number,
    })
  ),
  lastUsedTextSettings: PropTypes.object,
  updatePanelText: PropTypes.func,
  updateSticker: PropTypes.func,
  moveSticker: PropTypes.func,
  removeSticker: PropTypes.func,
  setFinalImage: PropTypes.func,
  handleOpenExportDialog: PropTypes.func,
  onCollageGenerated: PropTypes.func,
  // Render tracking for autosave thumbnails
  renderSig: PropTypes.string,
  onPreviewRendered: PropTypes.func,
  onPreviewMetaChange: PropTypes.func,
  // Editing session tracking
  onEditingSessionChange: PropTypes.func,
  isCreatingCollage: PropTypes.bool,
  onPanelSourceDialogOpenChange: PropTypes.func,
  onAddPanelRequest: PropTypes.func,
  canAddPanel: PropTypes.bool,
  onCaptionEditorVisibleChange: PropTypes.func,
  onGenerateNudgeRequested: PropTypes.func,
  isFrameActionSuppressed: PropTypes.func,
  isHydratingProject: PropTypes.bool,
  allowHydrationTransformCarry: PropTypes.bool,
  panelAutoOpenRequest: PropTypes.shape({
    requestId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    panelId: PropTypes.string,
    panelIndex: PropTypes.number,
  }),
  onPanelAutoOpenHandled: PropTypes.func,
  panelTextAutoOpenRequest: PropTypes.shape({
    requestId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    panelId: PropTypes.string,
    panelIndex: PropTypes.number,
  }),
  onPanelTextAutoOpenHandled: PropTypes.func,
  panelTransformAutoOpenRequest: PropTypes.shape({
    requestId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    panelId: PropTypes.string,
    panelIndex: PropTypes.number,
  }),
  onPanelTransformAutoOpenHandled: PropTypes.func,
  panelReorderAutoOpenRequest: PropTypes.shape({
    requestId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    panelId: PropTypes.string,
    panelIndex: PropTypes.number,
  }),
  onPanelReorderAutoOpenHandled: PropTypes.func,
  onRemovePanelRequest: PropTypes.func,
  onAddTextRequest: PropTypes.func,
  onAddStickerFromLibrary: PropTypes.func,
  canManageStickers: PropTypes.bool,
  canvasResetKey: PropTypes.number,
};

export default CollageImagesStep;
