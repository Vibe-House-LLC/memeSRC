import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Box, Typography, Paper, useMediaQuery, Button } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { PhotoCamera, Save } from '@mui/icons-material';

// Import our new dynamic CollagePreview component
import CollagePreview from '../components/CollagePreview';


// Debugging utils
const DEBUG_MODE = true; // Set to true to enable console logs
const debugLog = (...args) => { if (DEBUG_MODE) console.log(...args); };
const debugWarn = (...args) => { if (DEBUG_MODE) console.warn(...args); };
const logError = (...args) => { console.error(...args); };

const CollageImagesStep = ({
  selectedImages, // Now [{ originalUrl, displayUrl }, ...]
  addImage, // Adds new object { original, display }
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
  updatePanelTransform // Receive new function
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Debug the props we're receiving
  console.log("CollageImagesStep props:", {
    hasTemplate: !!selectedTemplate,
    templateId: selectedTemplate?.id,
    hasImages: selectedImages.length > 0,
    aspectRatio: selectedAspectRatio,
    panelCount,
    borderThickness
  });

  // --- State for Modals ---
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [currentPanelToEdit, setCurrentPanelToEdit] = useState(null); // { id, x, y, width, height }
  const [imageToCrop, setImageToCrop] = useState(null); // Stores ORIGINAL URL for the cropper
  const [panelAspectRatio, setPanelAspectRatio] = useState(1); // Aspect ratio for cropping tool

  // --- Handler for Crop Completion ---
  const handleCropComplete = useCallback((croppedDataUrl) => {
    if (!currentPanelToEdit) {
      logError("Cannot complete crop: No panel selected.");
      return;
    }
    
    const panelId = currentPanelToEdit.id;
    
    // Normal crop of existing image
    const imageIndex = panelImageMapping[panelId];
    
    if (imageIndex === undefined || imageIndex === null) {
      logError("Cannot complete crop: Panel has no associated image index.");
      return;
    }
    
    debugLog(`Cropping complete for panel ${panelId}. Updating DISPLAY image index ${imageIndex}.`);
    // Use 'updateImage' which only updates the displayUrl
    updateImage(imageIndex, croppedDataUrl);

    // Close the modal and reset state
    setCropModalOpen(false);
    setCurrentPanelToEdit(null);
    setImageToCrop(null);
  }, [currentPanelToEdit, panelImageMapping, updateImage]);

  // --- Handler for opening crop modal for a specific image ---
  const handleOpenCropModal = useCallback((panelId, imageIndex) => {
    // Set the panel and image information
    if (selectedImages[imageIndex]?.originalUrl) {
      // Calculate aspect ratio if we have the template
      let calculatedAspectRatio = 1; // Default to square
      
      if (selectedTemplate && selectedTemplate.layout && selectedTemplate.layout.panels) {
        // Find the panel in the template
        const panel = selectedTemplate.layout.panels.find(p => p.id === panelId);
        if (panel) {
          calculatedAspectRatio = panel.width / panel.height;
        }
      }
      
      // Update state for the crop modal
      setCurrentPanelToEdit({ id: panelId });
      setPanelAspectRatio(calculatedAspectRatio);
      setImageToCrop(selectedImages[imageIndex].originalUrl);
      setCropModalOpen(true);
    }
  }, [selectedImages, selectedTemplate]);

  // --- Handler for Replace Image request ---
  const handleReplaceRequest = useCallback(() => {
    // Just close the modal, the panel click handler in CollagePreview will handle the upload
    setCropModalOpen(false);
    setImageToCrop(null);
    setCurrentPanelToEdit(null);
  }, []);

  // --- Handler for Remove Image request ---
  const handleRemoveRequest = useCallback(() => {
    if (!currentPanelToEdit) {
      logError("Cannot remove: No panel selected.");
      return;
    }
    
    const panelId = currentPanelToEdit.id;
    const imageIndex = panelImageMapping[panelId];
    
    if (imageIndex === undefined || imageIndex === null) {
      logError("Cannot remove: Panel has no associated image index.");
      return;
    }
    
    // Remove the image
    removeImage(imageIndex);
    
    // Update the mapping to remove this panel's association
    const updatedMapping = { ...panelImageMapping };
    delete updatedMapping[panelId];
    updatePanelImageMapping(updatedMapping);
    
    // Close the modal and reset state
    setCropModalOpen(false);
    setCurrentPanelToEdit(null);
    setImageToCrop(null);
    
    debugLog(`Removed image at index ${imageIndex} from panel ${panelId}`);
  }, [currentPanelToEdit, panelImageMapping, removeImage, updatePanelImageMapping]);

  return (
    <Box sx={{ my: isMobile ? 0 : 0.5 }}>
      {/* Layout Preview */}
      <Paper elevation={1} sx={{ p: isMobile ? 1 : 2, mb: isMobile ? 1 : 2, borderRadius: 2, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', backgroundColor: theme.palette.background.paper }}>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ mb: 1 }}>
          Click a panel to add an image or edit existing image
        </Typography>
        
        {/* Always render the preview, let it handle null templates */}
        <Box sx={{ width: '100%', maxWidth: '600px', margin: '0 auto' }} id="collage-preview-container">
          <CollagePreview 
            selectedTemplate={selectedTemplate}
            selectedAspectRatio={selectedAspectRatio}
            panelCount={panelCount || 2} /* Ensure we always have a fallback */
            selectedImages={selectedImages || []}
            addImage={addImage}
            removeImage={removeImage}
            updateImage={updateImage}
            replaceImage={replaceImage}
            updatePanelImageMapping={updatePanelImageMapping}
            panelImageMapping={panelImageMapping || {}}
            panelTransforms={panelTransforms || {}}
            updatePanelTransform={updatePanelTransform}
            onCropRequest={handleOpenCropModal}
            borderThickness={borderThickness}
            borderColor={borderColor}
          />
        </Box>
        
        {/* Save Button - only show if we have images */}
        {selectedImages.length > 0 && (
          <Button 
            variant="contained" 
            color="primary" 
            startIcon={<Save />}
            onClick={saveCollageAsImage}
            sx={{ mt: 2 }}
          >
            Save as Image
          </Button>
        )}
      </Paper>
    </Box>
  );

  // Function to save the collage as an image
  async function saveCollageAsImage() {
    debugLog('Saving collage as image (exact preview)...');
    const collagePreviewElement = document.querySelector('[data-testid="dynamic-collage-preview-root"]');

    if (!collagePreviewElement) {
      logError('Collage preview element not found. Ensure DynamicCollagePreview has data-testid="dynamic-collage-preview-root".');
      return;
    }

    try {
      // Dynamically import html2canvas using await
      const html2canvasModule = await import('html2canvas');
      const html2canvas = html2canvasModule.default;

      // Generate the canvas using await
      const canvas = await html2canvas(collagePreviewElement, {
        backgroundColor: null, // Preserve transparency
        useCORS: true,       // For external images
        scale: 2,            // Better quality
        logging: false       // Keep console clean
      });

      // Convert canvas directly to data URL
      const dataUrl = canvas.toDataURL('image/png');

      // Create download link
      const link = document.createElement('a');
      link.download = `memeSRC-collage-${new Date().toISOString().split('T')[0]}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      debugLog('Collage saved successfully as image (exact preview).');

    } catch (err) {
      // Consolidated error handling
      logError('Error saving collage image:', err);
      // Potentially show a user-facing error message here
    }
  }
};

// Add defaultProps (ensure new replaceImage prop has default)
CollageImagesStep.defaultProps = {
  selectedImages: [],
  panelCount: 2,
  selectedAspectRatio: 'portrait',
  borderThickness: 'medium',
  borderThicknessOptions: [ { label: "None", value: 0 }, { label: "Thin", value: 6 }, { label: "Medium", value: 16 }, { label: "Thicc", value: 40 }, { label: "Thiccer", value: 80 }, { label: "XTRA THICC", value: 120 } ],
  panelImageMapping: {},
  addImage: () => { console.warn("addImage default prop called"); },
  removeImage: () => { console.warn("removeImage default prop called"); },
  updateImage: () => { console.warn("updateImage default prop called"); },
  replaceImage: () => { console.warn("replaceImage default prop called"); }, // Add default
  clearImages: () => { console.warn("clearImages default prop called"); },
  updatePanelImageMapping: () => { console.warn("updatePanelImageMapping default prop called"); },
  handleNext: () => {},
};

export default CollageImagesStep;