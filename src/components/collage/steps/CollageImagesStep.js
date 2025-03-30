import { useState, useEffect, useRef, useCallback } from "react"; // Add useCallback
import { useTheme } from "@mui/material/styles";
import { Box, Button, Typography, Paper, useMediaQuery } from "@mui/material";
// Removed unused icons

// Import config and utils
import { aspectRatioPresets, getLayoutsForPanelCount } from "../config/CollageConfig";
import { renderTemplateToCanvas, calculateCanvasDimensions } from "../utils/CanvasLayoutRenderer";

// Import the dialogs/modals
import UploadOrCropDialog from "../components/UploadOrCropDialog";
import ImageCropModal from "../components/ImageCropModal";

// Remove old console logs
// console.log("Imported UploadOrCropDialogModule:", UploadOrCropDialog);
// console.log("Imported ImageCropModalModule:", ImageCropModal);


const adjustForPanelCount = (thickness, panelCount) => {
  // (Keep this function as is)
  if (panelCount <= 2) return thickness;
  let scaleFactor;
  switch (panelCount) { case 3: scaleFactor = 0.7; break; case 4: scaleFactor = 0.6; break; case 5: scaleFactor = 0.5; break; default: scaleFactor = 0.4; break; }
  return Math.max(1, Math.round(thickness * scaleFactor));
};

const DEBUG_MODE = process.env.NODE_ENV === 'development';
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
  updatePanelImageMapping // Updates mapping directly
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [renderedImage, setRenderedImage] = useState(null); // Preview blob URL
  const canvasRef = useRef(null); // Hidden canvas for rendering preview
  const [panelRegions, setPanelRegions] = useState([]);
  const [hasInitialRender, setHasInitialRender] = useState(false);

  // --- State for Modals ---
  const [uploadOrCropDialogOpen, setUploadOrCropDialogOpen] = useState(false);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [currentPanelToEdit, setCurrentPanelToEdit] = useState(null); // { id, x, y, width, height }
  const [imageToCrop, setImageToCrop] = useState(null); // Stores ORIGINAL URL for the cropper
  const [panelAspectRatio, setPanelAspectRatio] = useState(1); // Aspect ratio for cropping tool


  // --- Click Handler for Preview ---
  const handlePreviewClick = useCallback((event) => {
    debugLog("Preview image clicked");
    const imageElement = event.currentTarget;
    const rect = imageElement.getBoundingClientRect();
    const clickX = (event.clientX - rect.left) / rect.width;
    const clickY = (event.clientY - rect.top) / rect.height;

    const { width: previewCanvasWidth, height: previewCanvasHeight } = calculateCanvasDimensions(selectedAspectRatio);
    const canvasX = clickX * previewCanvasWidth;
    const canvasY = clickY * previewCanvasHeight;

    debugLog("Canvas coords:", { canvasX, canvasY });
    debugLog("Available panel regions:", panelRegions);

    const clickedPanel = panelRegions.find(panel =>
      canvasX >= panel.x && canvasX <= panel.x + panel.width &&
      canvasY >= panel.y && canvasY <= panel.y + panel.height
    );

    if (clickedPanel) {
      debugLog(`Clicked on panel ${clickedPanel.id}`);
      setCurrentPanelToEdit(clickedPanel); // Store panel info

      const calculatedAspectRatio = (clickedPanel.height > 0) ? (clickedPanel.width / clickedPanel.height) : 1;
      setPanelAspectRatio(calculatedAspectRatio); // Set aspect for cropper
      debugLog(`Panel aspect ratio: ${calculatedAspectRatio}`);

      // Check if the panel has an assigned image index
      const imageIndex = panelImageMapping[clickedPanel.id];
      const hasExistingImage = imageIndex !== undefined && imageIndex !== null && selectedImages[imageIndex];

      if (hasExistingImage) {
        // Panel has image -> Open Upload or Crop dialog
        const imageItemObject = selectedImages[imageIndex];
        debugLog(`Panel ${clickedPanel.id} has image at index ${imageIndex}. Opening dialog.`);

        // Use the ORIGINAL URL for the cropper source
        if (imageItemObject && imageItemObject.originalUrl) {
            setImageToCrop(imageItemObject.originalUrl);
            setUploadOrCropDialogOpen(true);
        } else {
            debugWarn(`Could not get valid ORIGINAL image URL for index ${imageIndex}. Triggering upload. ImageItem:`, imageItemObject);
            triggerImageUpload(clickedPanel); // Fallback to upload
        }
      } else {
        // Panel is empty -> Trigger upload directly
        debugLog(`Panel ${clickedPanel.id} is empty. Triggering upload.`);
        triggerImageUpload(clickedPanel);
      }
    } else {
      debugLog("No panel was clicked");
    }
  }, [panelRegions, selectedImages, panelImageMapping, selectedAspectRatio, /* triggerImageUpload */]); // Removed triggerImageUpload to avoid loop if defined inline

  // --- Function to trigger the actual file input ---
  const triggerImageUpload = useCallback((panel) => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.onchange = (e) => {
      if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (event) => {
          const base64Image = event.target.result;
          const panelId = panel.id; // Get panel ID

          // Check if updating existing or adding new
          const existingMappingIndex = panelImageMapping[panelId];
          const isReplacingMappedImage = existingMappingIndex !== undefined && existingMappingIndex !== null;

          if (isReplacingMappedImage) {
            // Use the new 'replaceImage' function to update both original and display URLs
            debugLog(`Uploading new file to replace image at index ${existingMappingIndex} for panel ${panelId}`);
            replaceImage(existingMappingIndex, base64Image);
            // Mapping doesn't need to change here, just the image content at the index
          } else {
            // Add new image object using addImage
            const newIndex = selectedImages.length; // Index will be the current length
            debugLog(`Uploading new file for empty panel ${panelId}, new index ${newIndex}`);
            addImage(base64Image); // Adds { originalUrl: base64, displayUrl: base64 }

            // Update mapping to point the panel to the new index
            if (panelId !== undefined && panelId !== null) {
                const updatedMapping = { ...panelImageMapping, [panelId]: newIndex };
                updatePanelImageMapping(updatedMapping);
            } else {
                logError("Panel ID is undefined, cannot update mapping for new image.");
            }
          }
        };
        reader.onerror = (error) => logError("Error reading file:", error);
        reader.readAsDataURL(file);
      }
    };
    fileInput.click();
  }, [panelImageMapping, addImage, replaceImage, updatePanelImageMapping, selectedImages.length]); // Dependencies

  // --- Handlers for UploadOrCropDialog ---
  const handleUploadNewRequest = useCallback(() => {
    if (currentPanelToEdit) {
      triggerImageUpload(currentPanelToEdit);
    }
    setUploadOrCropDialogOpen(false); // Close dialog
  }, [currentPanelToEdit, triggerImageUpload]);

  const handleCropExistingRequest = useCallback(() => {
    if (currentPanelToEdit && imageToCrop) {
      setCropModalOpen(true); // Open the crop modal
    } else {
      debugWarn("Cannot crop: Panel or image source missing.");
    }
    setUploadOrCropDialogOpen(false); // Close dialog
  }, [currentPanelToEdit, imageToCrop]);


  // --- Handler for Crop Completion ---
  const handleCropComplete = useCallback((croppedDataUrl) => {
    if (!currentPanelToEdit) {
      logError("Cannot complete crop: No panel selected.");
      return;
    }
    const panelId = currentPanelToEdit.id;
    const imageIndex = panelImageMapping[panelId];

    if (imageIndex === undefined || imageIndex === null) {
      logError("Cannot complete crop: Panel has no associated image index.");
      return;
    }

    debugLog(`Cropping complete for panel ${panelId}. Updating DISPLAY image index ${imageIndex}.`);
    // Use 'updateImage' which now only updates the displayUrl
    updateImage(imageIndex, croppedDataUrl);

    // Close the modal and reset state
    setCropModalOpen(false);
    setCurrentPanelToEdit(null);
    setImageToCrop(null);
  }, [currentPanelToEdit, panelImageMapping, updateImage]);


  // --- useEffect for Rendering Preview ---
  /* eslint-disable consistent-return */
  useEffect(() => {
    if (!selectedTemplate || !selectedAspectRatio || !borderThicknessOptions) {
      debugWarn("Skipping preview render: Missing required props");
      return;
    }
    debugLog(`[STEP DEBUG] Preview rendering triggered.`);

    let borderThicknessValue = 4;
    if (borderThicknessOptions && borderThickness) {
      const option = borderThicknessOptions.find(opt => typeof opt.label === 'string' && opt.label.toLowerCase() === borderThickness.toLowerCase());
      if (option) borderThicknessValue = option.value;
    }
    const adjustedBorderThickness = adjustForPanelCount(borderThicknessValue, panelCount);

    const initialDelay = hasInitialRender ? 0 : 50;

    // Extract just the display URLs for the renderer
    const displayImageUrls = selectedImages.map(imgObj => imgObj.displayUrl);

    const timer = setTimeout(() => {
      try {
        debugLog(`[STEP DEBUG] Calling renderTemplateToCanvas`);
        renderTemplateToCanvas({
          selectedTemplate,
          selectedAspectRatio,
          panelCount,
          theme,
          canvasRef,
          setPanelRegions,
          setRenderedImage,
          borderThickness: adjustedBorderThickness,
          borderColor,
          // Pass only the display URLs to the renderer
          displayImageUrls, // <-- CHANGED
          panelImageMapping // Pass the mapping { panelId: imageIndex }
        });
        if (!hasInitialRender) setHasInitialRender(true);
      } catch (error) {
        logError("Error rendering template preview:", error);
      }
    }, initialDelay);

    return () => clearTimeout(timer);
  }, [
    selectedTemplate, selectedAspectRatio, panelCount, theme.palette.mode,
    borderThickness, borderColor, selectedImages, panelImageMapping, // Keep selectedImages as dep
    hasInitialRender, borderThicknessOptions, theme, setRenderedImage
    // Removed displayImageUrls as it's derived inside effect
  ]);
  /* eslint-enable consistent-return */

  // Clean up preview blob URL
  useEffect(() => {
    return () => {
      if (renderedImage && renderedImage.startsWith('blob:')) {
        URL.revokeObjectURL(renderedImage);
        debugLog("Revoked preview blob URL:", renderedImage);
      }
    };
  }, [renderedImage]);

  return (
    <Box sx={{ my: isMobile ? 0 : 0.5 }}>
      {/* Layout Preview */}
      <Paper elevation={1} sx={{ p: isMobile ? 1 : 2, mb: isMobile ? 1 : 2, borderRadius: 2, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', backgroundColor: theme.palette.background.paper }}>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ mb: 1 }}>
          Click a panel to add or edit its image
        </Typography>
        {renderedImage ? (
          <Box component="img" src={renderedImage} alt="Collage Layout Preview" onClick={handlePreviewClick} sx={{ maxWidth: '100%', maxHeight: isMobile ? 350 : 450, objectFit: 'contain', borderRadius: 1, cursor: 'pointer', display: 'block', margin: '0 auto', border: `1px solid ${theme.palette.divider}`, backgroundColor: theme.palette.action.hover }} />
        ) : (
          <Box sx={{ height: isMobile ? 200 : 250, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.palette.action.hover, borderRadius: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {selectedTemplate ? 'Generating layout preview...' : 'Select template settings...'}
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Hidden canvas used by renderTemplateToCanvas */}
      <canvas ref={canvasRef} style={{ display: "none" }} />

      {/* --- Modals --- */}
      {/* Upload or Crop Dialog (for existing images) */}
      <UploadOrCropDialog
          open={uploadOrCropDialogOpen}
          onClose={() => setUploadOrCropDialogOpen(false)}
          onUploadNew={handleUploadNewRequest}
          onCropExisting={handleCropExistingRequest}
      />

      {/* Image Crop Modal */}
      <ImageCropModal
          open={cropModalOpen}
          onClose={() => {
              setCropModalOpen(false);
              setCurrentPanelToEdit(null); // Reset panel on close
              setImageToCrop(null);
          }}
          imageSrc={imageToCrop} // Will be the originalUrl
          aspectRatio={panelAspectRatio}
          onCropComplete={handleCropComplete} // Calls updateImage to set displayUrl
      />
    </Box>
  );
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