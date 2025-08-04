import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { Box, Typography, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';

// Import our new dynamic CollagePreview component
import CollagePreview from '../components/CollagePreview';

// Debugging utils
const DEBUG_MODE = process.env.NODE_ENV === 'development';
const debugLog = (...args) => { if (DEBUG_MODE) console.log(...args); };

const CollageImagesStep = ({
  selectedImages, // Now [{ originalUrl, displayUrl, subtitle?, subtitleShowing?, metadata? }, ...]
  addImage, // Adds new object { original, display, subtitle?, subtitleShowing?, metadata? }
  addMultipleImages, // Adds multiple objects { original, display, subtitle?, subtitleShowing?, metadata? }
  removeImage, // Removes object, updates mapping
  updateImage, // Updates ONLY displayUrl (for crop result)
  replaceImage, // <-- NEW: Updates BOTH urls (for replacing upload)
  clearImages, // Clears objects, mapping
  panelCount,
  selectedTemplate,
  selectedAspectRatio,
  borderThickness,
  borderColor,
  borderThicknessOptions,
  panelImageMapping, // Still { panelId: imageIndex }
  updatePanelImageMapping, // Updates mapping directly
  panelTransforms, // Receive new state
  updatePanelTransform, // Receive new function
  panelTexts, // NEW: Receive text state from centralized management
  lastUsedTextSettings, // NEW: Receive text settings from centralized management
  updatePanelText, // NEW: Receive text update function from centralized management
  setFinalImage, // <<< Keep this
  handleOpenExportDialog, // <<< Add handleOpenExportDialog prop
  onCollageGenerated, // <<< NEW: Handler for inline result display
  isCreatingCollage // <<< NEW: Pass collage generation state to prevent placeholder text during export
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

    // Helper function to load a single file and return a Promise with the data URL
    const loadFile = (file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

    debugLog(`Add Image button: uploading ${files.length} files...`);

    try {
      // Process all files using the same logic as BulkUploadSection
      const imageUrls = await Promise.all(files.map(loadFile));
      debugLog(`Loaded ${imageUrls.length} files from Add Image button`);

      // Add all images at once - this will trigger the same auto-assignment logic
      await addMultipleImages(imageUrls);

      debugLog(`Added ${imageUrls.length} new images via Add Image button`);
    } catch (error) {
      console.error("Error loading files from Add Image button:", error);
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
          />
        </Box>
        
        <Typography
          variant="body2"
          sx={{
            color: 'text.secondary',
            fontSize: '0.85rem',
            textAlign: 'center'
          }}
        >
          Fill all frames to generate your collage.
        </Typography>
        
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
  isCreatingCollage: PropTypes.bool,
};

// Add defaultProps (ensure new replaceImage prop has default)
CollageImagesStep.defaultProps = {
  selectedImages: [],
  panelCount: 2,
  selectedAspectRatio: 'portrait',
  borderThickness: 'medium',
  borderThicknessOptions: [ 
    { label: "None", value: 0 },        // 0%
    { label: "Thin", value: 0.5 },      // 0.5%
    { label: "Medium", value: 1.5 },    // 1.5%
    { label: "Thicc", value: 4 },       // 4%
    { label: "Thiccer", value: 7 },     // 7%
    { label: "XTRA THICC", value: 12 }, // 12%
    { label: "UNGODLY CHONK'D", value: 20 } // 20%
  ],
  panelImageMapping: {},
  addImage: () => { console.warn("addImage default prop called"); },
  addMultipleImages: () => { console.warn("addMultipleImages default prop called"); },
  removeImage: () => { console.warn("removeImage default prop called"); },
  updateImage: () => { console.warn("updateImage default prop called"); },
  replaceImage: () => { console.warn("replaceImage default prop called"); }, // Add default
  clearImages: () => { console.warn("clearImages default prop called"); },
  updatePanelImageMapping: () => { console.warn("updatePanelImageMapping default prop called"); },
  setFinalImage: () => { console.warn("setFinalImage default prop called"); }, // Add default
  handleOpenExportDialog: () => { console.warn("handleOpenExportDialog default prop called"); }, // Add default
  onCollageGenerated: null, // Add default for new handler
};

export default CollageImagesStep;