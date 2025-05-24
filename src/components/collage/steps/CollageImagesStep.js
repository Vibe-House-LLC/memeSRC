import React, { useState, useCallback, useEffect } from 'react';
import { Box, Typography, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';

// Import our new dynamic CollagePreview component
import CollagePreview from '../components/CollagePreview';

// Debugging utils
const DEBUG_MODE = process.env.NODE_ENV === 'development';
const debugLog = (...args) => { if (DEBUG_MODE) console.log(...args); };
const debugWarn = (...args) => { if (DEBUG_MODE) console.warn(...args); };
const logError = (...args) => { console.error(...args); };

const CollageImagesStep = ({
  selectedImages, // Now [{ originalUrl, displayUrl }, ...]
  addImage, // Adds new object { original, display }
  addMultipleImages, // Adds multiple objects { original, display }
  removeImage, // Removes object, updates mapping
  updateImage, // Updates ONLY displayUrl (for crop result)
  replaceImage, // <-- NEW: Updates BOTH urls (for replacing upload)
  clearImages, // Clears objects, mapping
  panelCount,
  handleNext, // For 'Create Collage'
  selectedTemplate,
  selectedAspectRatio,
  borderThickness,
  borderColor,
  borderThicknessOptions,
  panelImageMapping, // Still { panelId: imageIndex }
  updatePanelImageMapping, // Updates mapping directly
  panelTransforms, // Receive new state
  updatePanelTransform, // Receive new function
  setFinalImage, // <<< Keep this
  handleOpenExportDialog, // <<< Add handleOpenExportDialog prop
  onCollageGenerated // <<< NEW: Handler for inline result display
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // Debug the props we're receiving
  console.log("CollageImagesStep props:", {
    selectedImages: selectedImages?.length,
    panelCount,
    selectedTemplate: selectedTemplate?.name,
    selectedAspectRatio,
    borderThickness,
    borderColor,
    panelImageMapping,
    panelTransforms
  });

  // Track which panel the user is currently trying to edit
  const [currentPanelToEdit, setCurrentPanelToEdit] = useState(null);

  // Effect to debug props
  useEffect(() => {
    console.log("Images updated:", selectedImages);
  }, [selectedImages]);

  // Handler for when crop modal is closed
  const handleCropClose = useCallback(() => {
    setCurrentPanelToEdit(null);
  }, []);

  // Handler for when crop is completed
  const handleCropComplete = useCallback((croppedImageUrl) => {
    if (!currentPanelToEdit) return;

    const { imageIndex } = currentPanelToEdit;
    
    // Update only the displayUrl (for showing in preview)
    updateImage(imageIndex, croppedImageUrl);
    setCurrentPanelToEdit(null);
  }, [currentPanelToEdit, updateImage]);

  // Handler for when the user wants to crop an image
  const handleEditRequest = useCallback((imageIndex, panelId) => {
    if (imageIndex === undefined || imageIndex < 0 || imageIndex >= selectedImages.length) {
      debugWarn("Invalid image index for edit request:", imageIndex);
      return;
    }

    debugLog(`Setting up crop for image ${imageIndex} from panel ${panelId}`);
    setCurrentPanelToEdit({
      imageIndex,
      panelId,
      originalUrl: selectedImages[imageIndex]?.originalUrl,
      currentDisplayUrl: selectedImages[imageIndex]?.displayUrl
    });
  }, [selectedImages]);

  // --- Bulk upload handler and related functions removed since moved to BulkUploadSection ---

  // --- Handler for Remove Image request ---
  const handleRemoveRequest = useCallback(() => {
    if (!currentPanelToEdit) {
      debugWarn("No panel to remove image from");
      return;
    }

    const { imageIndex, panelId } = currentPanelToEdit;
    
    // Remove the image from our images array
    removeImage(imageIndex);
    
    // Also remove it from the panel mapping
    const newMapping = { ...panelImageMapping };
    delete newMapping[panelId];
    updatePanelImageMapping(newMapping);

    // Close the crop modal
    setCurrentPanelToEdit(null);
    
    debugLog(`Removed image at index ${imageIndex} from panel ${panelId}`);
  }, [currentPanelToEdit, panelImageMapping, removeImage, updatePanelImageMapping]);

  return (
    <Box sx={{ my: isMobile ? 0 : 0.5 }}>
      {/* Layout Preview */}
      <Box sx={{ 
        p: isMobile ? 2 : 2, 
        mb: isMobile ? 2 : 2, 
        borderRadius: 2, 
        textAlign: 'center', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        position: 'relative',
      }}>        
        {/* Always render the preview, let it handle null templates */}
        <Box sx={{ 
          width: isMobile ? 'calc(100vw - 16px)' : '100%', 
          maxWidth: isMobile ? 'none' : '600px', 
          margin: isMobile ? '0 calc(-50vw + 50% - 8px)' : '0 auto',
          mb: 2,
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
            onEditRequest={handleEditRequest}
            setFinalImage={setFinalImage}
            handleOpenExportDialog={handleOpenExportDialog}
            onCollageGenerated={onCollageGenerated}
          />
        </Box>
        
        <Typography variant="body2" sx={{ 
            color: 'text.secondary', 
            fontSize: '0.9rem', 
            textAlign: 'center'
          }}
        >
          Upload images above, then assign to panels by clicking. 
          <br />
          Fill all frames to generate your collage.
        </Typography>
      </Box>
    </Box>
  );
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
  handleNext: () => {},
  setFinalImage: () => { console.warn("setFinalImage default prop called"); }, // Add default
  handleOpenExportDialog: () => { console.warn("handleOpenExportDialog default prop called"); }, // Add default
  onCollageGenerated: null, // Add default for new handler
};

export default CollageImagesStep;