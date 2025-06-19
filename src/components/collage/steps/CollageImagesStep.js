import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Box, Typography, useMediaQuery, Button } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Add } from '@mui/icons-material';

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
  const fileInputRef = useRef(null);
  
  // Panel text state management
  const [panelTexts, setPanelTexts] = useState({});
  
  // Last used text settings to remember across panels
  const [lastUsedTextSettings, setLastUsedTextSettings] = useState({
    fontSize: 26,
    fontWeight: '700',
    fontFamily: 'Arial',
    color: '#ffffff',
    strokeWidth: 2
  });
  
  // Function to update panel text
  const updatePanelText = useCallback((panelId, textConfig) => {
    setPanelTexts(prev => ({
      ...prev,
      [panelId]: textConfig
    }));
    
    // Update last used settings (excluding content which is panel-specific)
    const { content, ...settingsOnly } = textConfig;
    setLastUsedTextSettings(prev => ({
      ...prev,
      ...settingsOnly
    }));
  }, []);
  
  // Debug the props we're receiving
  console.log("CollageImagesStep props:", {
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

  // Track which panel the user is currently trying to edit
  const [currentPanelToEdit, setCurrentPanelToEdit] = useState(null);

  // Check if all frames are filled
  const areAllFramesFilled = () => {
    if (!panelCount || !panelImageMapping) return false;
    
    // Get the number of panels that have images assigned
    const filledPanelsCount = Object.keys(panelImageMapping).length;
    
    // Check if all panels have valid images
    const allPanelsHaveValidImages = Object.values(panelImageMapping).every(imageIndex => 
      imageIndex !== undefined && 
      imageIndex >= 0 && 
      imageIndex < selectedImages.length &&
      selectedImages[imageIndex]
    );
    
    return filledPanelsCount === panelCount && allPanelsHaveValidImages;
  };

  // Handler for Add Image button click
  const handleAddImageClick = () => {
    fileInputRef.current?.click();
  };

  // Handler for file selection from Add Image button - use same logic as BulkUploadSection
  const handleFileChange = (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    // Helper function to load a single file and return a Promise with the data URL
    const loadFile = (file) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    };

    debugLog(`Add Image button: uploading ${files.length} files...`);

    // Process all files using the same logic as BulkUploadSection
    Promise.all(files.map(loadFile))
      .then((imageUrls) => {
        debugLog(`Loaded ${imageUrls.length} files from Add Image button`);
        
        // Add all images at once - this will trigger the same auto-assignment logic
        addMultipleImages(imageUrls);
        
        debugLog(`Added ${imageUrls.length} new images via Add Image button`);
      })
      .catch((error) => {
        console.error("Error loading files from Add Image button:", error);
      });
    
    // Reset file input
    if (event.target) {
      event.target.value = null;
    }
  };

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
            onEditRequest={handleEditRequest}
            setFinalImage={setFinalImage}
            handleOpenExportDialog={handleOpenExportDialog}
            onCollageGenerated={onCollageGenerated}
          />
        </Box>
        
        <Typography variant="body2" sx={{ 
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