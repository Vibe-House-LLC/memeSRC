import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Box, Typography, Paper, useMediaQuery, Button } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { PhotoCamera } from '@mui/icons-material';

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
  updatePanelTransform, // Receive new function
  setFinalImage, // <<< Keep this
  handleOpenExportDialog, // <<< Add handleOpenExportDialog prop
  onCollageGenerated // <<< NEW: Handler for inline result display
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
          width: '100%', 
          maxWidth: isMobile ? '350px' : '600px', 
          margin: '0 auto',
          mb: 2
        }} id="collage-preview-container">
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
        <Typography 
          variant={isMobile ? "body2" : "subtitle2"} 
          color="text.secondary" 
          gutterBottom 
          sx={{ 
            mb: 2, 
            fontWeight: 500,
            textAlign: 'center'
          }}
        >
          Tap to add or replace photos.
          <br />
          Fill all frames to generate.
        </Typography>
      </Box>
    </Box>
  );

  // Function to save the collage as an image AND open dialog
  async function saveCollageAsImage() {
    debugLog('Generating collage and opening preview...');
    const collagePreviewElement = document.querySelector('[data-testid="dynamic-collage-preview-root"]');

    if (!collagePreviewElement) {
      logError('Collage preview element not found.');
      return;
    }

    // Temporarily hide control icons by adding a CSS class
    collagePreviewElement.classList.add('export-mode');

    try {
      const html2canvasModule = await import('html2canvas');
      const html2canvas = html2canvasModule.default;
      
      // --- NEW: Prepare data for canvas rendering ---
      const canvasData = {
        selectedTemplate,
        selectedAspectRatio,
        panelCount,
        theme, // Pass theme for consistency
        borderThickness, // Pass numeric value
        borderColor,
        displayImageUrls: selectedImages.map(img => img.displayUrl).filter(url => typeof url === 'string'),
        panelImageMapping,
        panelTransforms // Pass the transform state
      };
      
      debugLog("Data being used by html2canvas (for debug):", canvasData);
      
      // NOTE: html2canvas currently does not fully respect the CSS
      // `object-fit` property that we are using on the <img> tags inside
      // each panel. This ends up stretching the captured images even though
      // they look correct in the live preview. As a workaround we convert
      // each <img> that relies on `object-fit: cover` into a DIV with a
      // `background-image` set to the same source in the *cloned* document
      // that html2canvas uses for rendering.  Using a background-image with
      // `background-size: cover` is properly supported by html2canvas and
      // produces a faithful render while leaving the on‑screen preview and
      // all zoom / pan interactions untouched.

      const canvas = await html2canvas(collagePreviewElement, {
        useCORS: true,
        allowTaint: true,
        logging: DEBUG_MODE,
        scale: window.devicePixelRatio * 2,
        onclone: (clonedDoc) => {
          try {
            // Limit the query to the collage root to avoid touching other
            // images which might exist elsewhere in the DOM.
            const root = clonedDoc.querySelector('[data-testid="dynamic-collage-preview-root"]');
            if (!root) return;

            root.querySelectorAll('img').forEach((img) => {
              const computed = clonedDoc.defaultView.getComputedStyle(img);

              // Only patch images that were using object-fit: cover (the ones
              // inside the panels).  Other images (e.g. icons) should be left
              // alone.
              if (computed.getPropertyValue('object-fit') !== 'cover') return;

              const src = img.getAttribute('src');
              if (!src) return;

              const replacement = clonedDoc.createElement('div');

              // Preserve size – the parent element already defines the box so
              // we can simply make the DIV take 100% of the available space.
              replacement.style.width = '100%';
              replacement.style.height = '100%';

              replacement.style.backgroundImage = `url('${src}')`;
              replacement.style.backgroundSize = 'cover';
              replacement.style.backgroundPosition = 'center center';
              replacement.style.backgroundRepeat = 'no-repeat';

              // Copy over any transforms that were applied by react‑zoom‑pan‑pinch
              // so that cropping/zooming is captured correctly in the render.
              const transform = computed.getPropertyValue('transform');
              if (transform && transform !== 'none') {
                replacement.style.transform = transform;
              }

              // html2canvas reads the *computed* style, so inline styles on the
              // replacement div are sufficient.

              img.parentNode.replaceChild(replacement, img);
            });
          } catch (cloneErr) {
            console.error('onclone processing failed', cloneErr);
          }
        },
      });
      
      const dataUrl = canvas.toDataURL('image/png');
      
      if (setFinalImage) {
        setFinalImage(dataUrl);
        debugLog("Final image state updated.");
        
        // Prioritize inline result over dialog
        if (onCollageGenerated) {
          onCollageGenerated();
          debugLog("Inline result triggered.");
        } else if (handleOpenExportDialog) {
          handleOpenExportDialog(); 
          debugLog("Export dialog triggered.");
        } else {
          debugWarn("No result handler provided to CollageImagesStep.");
        }

      } else {
        debugWarn("setFinalImage function not provided to CollageImagesStep.");
      }

    } catch (err) {
      logError('Error generating collage image:', err);
    } finally {
      // Remove the export mode class to restore controls
      collagePreviewElement.classList.remove('export-mode');
    }
  }
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