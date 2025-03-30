import { useState, useEffect, useRef } from "react";
import { useTheme } from "@mui/material/styles";
import {
  Box,
  Button,
  Typography,
  Paper,
  useMediaQuery
} from "@mui/material";
import { KeyboardArrowLeft, KeyboardArrowRight, Edit } from "@mui/icons-material";

// Import from the collage configuration
import { aspectRatioPresets, getLayoutsForPanelCount } from "../config/CollageConfig";
// Import new layout rendering utilities
import {
  renderTemplateToCanvas,
  getAspectRatioValue,
  calculateCanvasDimensions
} from "../utils/CanvasLayoutRenderer";

// Import the components directly
import UploadOrCropDialog from "../components/UploadOrCropDialog";
import ImageCropModal from "../components/ImageCropModal";

// --- ADD CONSOLE LOGS ---
// Log right after imports to see what was actually imported
console.log("Imported UploadOrCropDialogModule:", UploadOrCropDialog);
console.log("Imported ImageCropModalModule:", ImageCropModal);

// --- END OF MODIFICATIONS ---

/**
 * Adjust border thickness based on panel count
 * Scales down thickness significantly as panel count increases
 * @param {number} thickness - Original thickness value
 * @param {number} panelCount - Number of panels in the collage
 * @returns {number} - Adjusted thickness value
 */
const adjustForPanelCount = (thickness, panelCount) => {
  if (panelCount <= 2) {
    return thickness; // No adjustment for 1-2 panels
  }

  // Apply a more aggressive scaling for more panels
  let scaleFactor;

  switch (panelCount) {
    case 3:
      scaleFactor = 0.7; // 70% of original thickness for 3 panels
      break;
    case 4:
      scaleFactor = 0.6; // 60% of original thickness for 4 panels
      break;
    case 5:
      scaleFactor = 0.5; // 50% of original thickness for 5 panels
      break;
    default:
      scaleFactor = 0.4; // 40% of original thickness for 6+ panels (very aggressive reduction)
      break;
  }

  // Ensure minimum thickness of 1 pixel
  return Math.max(1, Math.round(thickness * scaleFactor));
};

// Debug flag - only enable in development mode
const DEBUG_MODE = process.env.NODE_ENV === 'development';

// Helper debug logger function that only logs when DEBUG_MODE is true
const debugLog = (...args) => {
  if (DEBUG_MODE) {
    console.log(...args);
  }
};

// Helper for warnings that should still show in production
const debugWarn = (...args) => {
  if (DEBUG_MODE) {
    console.warn(...args);
  } else if (args[0] && args[0].includes('critical')) {
    // Allow critical warnings to show even in production
    console.warn(...args);
  }
};

// Helper for errors that should always show
const logError = (...args) => {
  console.error(...args);
};

/**
 * CollageImagesStep - The second step of the collage creation process
 * Renders a preview of the final collage layout using OffscreenCanvas
 */
const CollageImagesStep = ({
  selectedImages,
  addImage,
  removeImage,
  updateImage,
  clearImages,
  panelCount,
  handleBack, // Currently unused, but keep for potential future use
  handleNext, // Used for the main 'Create Collage' action
  selectedTemplate,
  selectedAspectRatio,
  borderThickness,
  borderColor,
  borderThicknessOptions,
  panelImageMapping,
  updatePanelImageMapping
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [renderedImage, setRenderedImage] = useState(null);
  // Fallback canvas reference for browsers that don't support OffscreenCanvas
  const canvasRef = useRef(null);
  // Store panel regions for click detection
  const [panelRegions, setPanelRegions] = useState([]);
  // Track initial load state
  const [hasInitialRender, setHasInitialRender] = useState(false);

  // --- State for Modals ---
  const [uploadOrCropDialogOpen, setUploadOrCropDialogOpen] = useState(false);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [currentPanelToEdit, setCurrentPanelToEdit] = useState(null); // Stores the { id, x, y, width, height } of the panel being edited
  const [imageToCrop, setImageToCrop] = useState(null); // Stores the base64 source for the cropper
  const [panelAspectRatio, setPanelAspectRatio] = useState(1); // Aspect ratio for the cropping tool


  // --- Modified Click Handler ---
  const handlePreviewClick = (event) => {
    debugLog("Preview image clicked");

    const image = event.currentTarget;
    const rect = image.getBoundingClientRect();
    const clickX = (event.clientX - rect.left) / rect.width;
    const clickY = (event.clientY - rect.top) / rect.height;

    debugLog("Click coordinates as percentage:", { clickX, clickY });

    const { width, height } = calculateCanvasDimensions(selectedAspectRatio);
    const canvasX = clickX * width;
    const canvasY = clickY * height;

    debugLog("Canvas coordinates:", { canvasX, canvasY });
    debugLog("Available panel regions:", panelRegions);

    const clickedPanel = panelRegions.find(panel =>
      canvasX >= panel.x &&
      canvasX <= panel.x + panel.width &&
      canvasY >= panel.y &&
      canvasY <= panel.y + panel.height
    );

    if (clickedPanel) {
      debugLog(`Clicked on panel ${clickedPanel.id}`);
      setCurrentPanelToEdit(clickedPanel); // Store the clicked panel info

      // Calculate the aspect ratio of the clicked panel
      // Add a check for zero height to prevent division by zero -> default to aspect 1
      const calculatedAspectRatio = (clickedPanel.height > 0) ? (clickedPanel.width / clickedPanel.height) : 1;
      setPanelAspectRatio(calculatedAspectRatio);
      debugLog(`Panel aspect ratio: ${calculatedAspectRatio}`);


      // Check if the panel already has an image
      const imageIndex = panelImageMapping[clickedPanel.id];
      // Ensure selectedImages exists and is an array before accessing index
      const hasExistingImage = imageIndex !== undefined && Array.isArray(selectedImages) && selectedImages[imageIndex];

      if (hasExistingImage) {
        // Panel has image -> Open Upload or Crop dialog
        debugLog(`Panel ${clickedPanel.id} has image at index ${imageIndex}. Opening dialog.`);
        const imageItem = selectedImages[imageIndex];
        // Ensure we get the actual image data (could be string or object)
        const imageUrl = typeof imageItem === 'object' && imageItem !== null
          ? (imageItem.url || imageItem.imageUrl || imageItem)
          : imageItem;

        if (imageUrl && typeof imageUrl === 'string') { // Check if imageUrl is a non-empty string
            setImageToCrop(imageUrl); // Set the image source for the cropper
            setUploadOrCropDialogOpen(true);
        } else {
            debugWarn(`Could not get valid image URL for index ${imageIndex}. Triggering upload. ImageItem:`, imageItem);
            triggerImageUpload(clickedPanel); // Fallback to upload if URL is bad
        }
      } else {
        // Panel is empty -> Trigger upload directly
        debugLog(`Panel ${clickedPanel.id} is empty. Triggering upload.`);
        triggerImageUpload(clickedPanel);
      }
    } else {
      debugLog("No panel was clicked");
    }
  };

  // --- Function to trigger the actual file input ---
  const triggerImageUpload = (panel) => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.onchange = (e) => {
      if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (event) => {
          const base64Image = event.target.result;

          // Check if updating existing or adding new
          const existingMappingIndex = panelImageMapping[panel.id];
          const isReplacingImage = existingMappingIndex !== undefined;

          const updatedMapping = {...panelImageMapping};

          if (isReplacingImage) {
            // Update existing image using the updateImage prop function
            updateImage(existingMappingIndex, base64Image);
          } else {
            // Add new image using addImage prop function
            const newIndex = Array.isArray(selectedImages) ? selectedImages.length : 0; // Safely get length
            addImage(base64Image); // Add to parent state
            // Ensure panel.id is valid before updating mapping
            if (panel.id !== undefined && panel.id !== null) {
                updatePanelImageMapping({ ...updatedMapping, [panel.id]: newIndex }); // Update mapping in parent state
            } else {
                logError("Panel ID is undefined, cannot update mapping for new image.");
            }
          }
        };
        reader.readAsDataURL(file);
      }
    };
    fileInput.click();
  };

  // --- Handlers for UploadOrCropDialog ---
  const handleUploadNewRequest = () => {
    if (currentPanelToEdit) {
      triggerImageUpload(currentPanelToEdit);
    }
  };

  const handleCropExistingRequest = () => {
    if (currentPanelToEdit && imageToCrop) {
      setCropModalOpen(true);
    } else {
        debugWarn("Cannot crop: Panel or image source missing.");
    }
  };

  // --- Handler for Crop Completion ---
  const handleCropComplete = (croppedDataUrl) => {
    if (!currentPanelToEdit) {
      logError("Cannot complete crop: No panel selected.");
      return;
    }

    const imageIndex = panelImageMapping[currentPanelToEdit.id];
    if (imageIndex === undefined) {
      logError("Cannot complete crop: Panel has no associated image index.");
      return;
    }

    debugLog(`Cropping complete for panel ${currentPanelToEdit.id}. Updating image index ${imageIndex}.`);
    updateImage(imageIndex, croppedDataUrl); // Update the image in the main state

    // Close the modal
    setCropModalOpen(false);
    setCurrentPanelToEdit(null);
    setImageToCrop(null);
  };

  // Function to clear image assignment for a panel (Keep this logic)
  const clearPanelImage = (panelId) => {
      const imageIndex = panelImageMapping[panelId];
      if (imageIndex !== undefined) {
          if (DEBUG_MODE) console.log(`Clearing image for panel ${panelId} (image index: ${imageIndex})`);
          const newMapping = { ...panelImageMapping };
          delete newMapping[panelId];
          updatePanelImageMapping(newMapping);

          const isImageUsedElsewhere = Object.values(newMapping).includes(imageIndex);
          if (!isImageUsedElsewhere) {
              if (DEBUG_MODE) console.log(`Removing image at index ${imageIndex} as it's not used elsewhere`);
              removeImage(imageIndex);
          }
      }
  };


  // --- Updated useEffect for Rendering ---
  /* eslint-disable consistent-return */
  useEffect(() => {
    // Add checks for required props
    if (!selectedTemplate || !selectedAspectRatio || !borderThicknessOptions) {
      debugWarn("Skipping render: Missing required props (template, aspect ratio, or border options)");
      return;
    }

    console.log(`[STEP DEBUG] CollageImagesStep rendering triggered. Deps:`, {
        templateId: selectedTemplate?.id, aspect: selectedAspectRatio, count: panelCount,
        themeMode: theme.palette.mode, borderThickness, borderColor,
        imageCount: Array.isArray(selectedImages) ? selectedImages.length : 0, // Safe length check
        mappingKeys: Object.keys(panelImageMapping || {}), // Safe key check
        hasInitialRender
    });

    let borderThicknessValue = 4; // Default
    if (borderThicknessOptions && borderThickness) {
        const option = borderThicknessOptions.find(opt => typeof opt.label === 'string' && opt.label.toLowerCase() === borderThickness.toLowerCase());
        if (option) borderThicknessValue = option.value;
        else console.log(`[STEP DEBUG] No matching option found for borderThickness: ${borderThickness}`);
    } else {
      console.log(`[STEP DEBUG] Using default borderThicknessValue: ${borderThicknessValue}`);
    }

    const adjustedBorderThickness = adjustForPanelCount(borderThicknessValue, panelCount);
    console.log(`[STEP DEBUG] Adjusted border thickness for panelCount ${panelCount}: ${adjustedBorderThickness} (original: ${borderThicknessValue})`);

    const initialDelay = hasInitialRender ? 0 : 50;

    const timer = setTimeout(() => {
      try {
        console.log(`[STEP DEBUG] Calling renderTemplateToCanvas with borderThickness: ${adjustedBorderThickness}, panelCount: ${panelCount}, borderColor: ${borderColor}`);
        renderTemplateToCanvas({
          selectedTemplate,
          selectedAspectRatio,
          panelCount,
          theme,
          canvasRef,
          setPanelRegions, // This function receives the calculated regions
          setRenderedImage,
          borderThickness: adjustedBorderThickness,
          borderColor,
          selectedImages, // Pass the latest images from props
          panelImageMapping // Pass the latest mapping from props
        });

        if (!hasInitialRender) {
          setHasInitialRender(true);
        }
      } catch (error) {
        console.error("Error rendering template:", error);
        // Optionally set an error state or display a message
      }
    }, initialDelay);

    return () => clearTimeout(timer);
  }, [
    selectedTemplate,
    selectedAspectRatio,
    panelCount,
    theme.palette.mode,
    borderThickness,
    borderColor,
    selectedImages,
    panelImageMapping,
    hasInitialRender,
    borderThicknessOptions,
    // Added missing dependencies based on usage inside the effect
    theme, setRenderedImage
  ]);
  /* eslint-enable consistent-return */

  // Clean up resources when component unmounts
  useEffect(() => {
    return () => {
      if (renderedImage && renderedImage.startsWith('blob:')) {
        URL.revokeObjectURL(renderedImage);
      }
    };
  }, [renderedImage]);

  return (
    <Box sx={{ my: isMobile ? 0 : 0.5 }}>
      {/* Layout Preview */}
      <Paper
        elevation={1}
        sx={{
          p: isMobile ? 1 : 2,
          mb: isMobile ? 1 : 2,
          backgroundColor: theme.palette.background.paper,
          borderRadius: 2,
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          position: 'relative'
        }}
      >
        {!isMobile && (
          <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ mb: 1 }}>
            Click a panel to upload or crop image
          </Typography>
        )}

        {renderedImage ? (
          <>
            <Box
              component="img"
              src={renderedImage}
              alt="Collage Layout Preview"
              onClick={handlePreviewClick} // Use the modified handler
              sx={{
                maxWidth: '100%',
                maxHeight: isMobile ? 300 : 350,
                objectFit: 'contain',
                borderRadius: 1,
                cursor: 'pointer',
                margin: '0 auto',
                display: 'block',
                border: `1px solid ${theme.palette.divider}` // Add subtle border
              }}
            />
          </>
        ) : (
          <Box
            sx={{
              height: 180,
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.palette.action.hover,
              borderRadius: 1,
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Generating layout preview...
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Hidden canvas fallback */}
      <canvas ref={canvasRef} style={{ display: "none" }} />

      {/* --- Modals --- */}
      {typeof UploadOrCropDialog === 'function' ? (
        <UploadOrCropDialog
          open={uploadOrCropDialogOpen}
          onClose={() => setUploadOrCropDialogOpen(false)}
          onUploadNew={handleUploadNewRequest}
          onCropExisting={handleCropExistingRequest}
        />
      ) : (
         DEBUG_MODE && console.error("UploadOrCropDialog is not a function, import failed?")
      )}

      {typeof ImageCropModal === 'function' ? (
        <ImageCropModal
          open={cropModalOpen}
          onClose={() => setCropModalOpen(false)}
          imageSrc={imageToCrop}
          aspectRatio={panelAspectRatio} // Use the calculated panel aspect ratio
          onCropComplete={handleCropComplete}
        />
       ) : (
         DEBUG_MODE && console.error("ImageCropModal is not a function, import failed?")
       )}
    </Box>
  );
};

export default CollageImagesStep;


// Add defaultProps to ensure the component has fallback values
CollageImagesStep.defaultProps = {
  selectedImages: [],
  panelCount: 2,
  selectedAspectRatio: 'portrait',
  borderThickness: 'medium',
  borderThicknessOptions: [
    { label: "None", value: 0 },
    { label: "Thin", value: 6 },
    { label: "Medium", value: 16 },
    { label: "Thicc", value: 40 },
    { label: "Thiccer", value: 80 },
    { label: "XTRA THICC", value: 120 }
  ],
  panelImageMapping: {},
  addImage: () => {},
  removeImage: () => {},
  updateImage: () => {},
  updatePanelImageMapping: () => {},
};