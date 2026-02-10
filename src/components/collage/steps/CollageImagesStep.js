import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { Box, Button, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import AddCircleOutlineRoundedIcon from '@mui/icons-material/AddCircleOutlineRounded';

// Import our new dynamic CollagePreview component
import CollagePreview from '../components/CollagePreview';
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
  lastUsedTextSettings,
  updatePanelText,
  setFinalImage = () => { console.warn("setFinalImage default prop called"); },
  handleOpenExportDialog = () => { console.warn("handleOpenExportDialog default prop called"); },
  onCollageGenerated = null,
  isCreatingCollage,
  onCaptionEditorVisibleChange,
  onGenerateNudgeRequested,
  isFrameActionSuppressed,
  isHydratingProject = false,
  onAddPanelRequest,
  canAddPanel = false,
  panelAutoOpenRequest,
  onPanelAutoOpenHandled,
  onRemovePanelRequest,
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
    panelTexts
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

  return (
    <Box sx={{ my: isMobile ? 0 : 0.25 }}>
      {/* Layout Preview */}
      <Box sx={{
        p: isMobile ? 1.5 : 1.5,
        mb: isMobile ? 1.5 : 1.5,
        borderRadius: 2,
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        position: 'relative',
      }}>
        {/* Always render the preview, let it handle null templates */}
        <Box sx={{ 
          width: '100%', 
          mb: 1.5,
          position: 'relative'
        }} id="collage-preview-container">
          <CollagePreview 
            canvasResetKey={canvasResetKey}
            selectedTemplate={selectedTemplate}
            selectedAspectRatio={selectedAspectRatio}
            panelCount={panelCount || 2} /* Ensure we always have a fallback */
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
            updatePanelText={updatePanelText}
            lastUsedTextSettings={lastUsedTextSettings}
            setFinalImage={setFinalImage}
            handleOpenExportDialog={handleOpenExportDialog}
            onCollageGenerated={onCollageGenerated}
            isCreatingCollage={isCreatingCollage}
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
          onRemovePanelRequest={onRemovePanelRequest}
        />
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%', mt: 0.5 }}>
          <Button
            variant="outlined"
            color="inherit"
            size={isMobile ? 'small' : 'medium'}
            startIcon={<AddCircleOutlineRoundedIcon fontSize="small" />}
            onClick={() => {
              if (typeof onAddPanelRequest === 'function') {
                onAddPanelRequest();
              }
            }}
            disabled={!canAddPanel || isCreatingCollage || isHydratingProject}
            sx={{
              textTransform: 'none',
              fontWeight: 700,
              borderColor: 'rgba(255,255,255,0.35)',
              color: '#fff',
              '&:hover': {
                borderColor: 'rgba(255,255,255,0.65)',
                backgroundColor: 'rgba(255,255,255,0.06)',
              },
            }}
          >
            Add panel
          </Button>
        </Box>
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
  borderThickness: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  borderColor: PropTypes.string,
  borderThicknessOptions: PropTypes.array,
  panelImageMapping: PropTypes.object,
  updatePanelImageMapping: PropTypes.func,
  panelTransforms: PropTypes.object,
  updatePanelTransform: PropTypes.func,
  panelTexts: PropTypes.object,
  lastUsedTextSettings: PropTypes.object,
  updatePanelText: PropTypes.func,
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
  onRemovePanelRequest: PropTypes.func,
  canvasResetKey: PropTypes.number,
};

export default CollageImagesStep;
