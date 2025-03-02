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
// Import panel management utilities
import {
  handlePreviewClick as handlePreviewClickUtil,
  handlePanelImageSelection as handlePanelImageSelectionUtil,
  clearPanelImage as clearPanelImageUtil
} from "../utils/PanelManager";

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
  handleBack, 
  handleNext,
  selectedTemplate,
  selectedAspectRatio,
  borderThickness,
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
  // Track which panel was last clicked
  const [selectedPanel, setSelectedPanel] = useState(null);
  // Track initial load state
  const [hasInitialRender, setHasInitialRender] = useState(false);
  // Store selected images per panel - synced with parent component's panelImageMapping
  const [panelToImageMap, setPanelToImageMap] = useState({});
  
  // Enhance the handlePreviewClick function
  const handlePreviewClick = (event) => {
    debugLog("Preview image clicked");
    
    // Get the click coordinates relative to the image
    const image = event.currentTarget;
    const rect = image.getBoundingClientRect();
    
    // Calculate click position as percentage of image dimensions
    const clickX = (event.clientX - rect.left) / rect.width;
    const clickY = (event.clientY - rect.top) / rect.height;
    
    debugLog("Click coordinates as percentage:", { clickX, clickY });
    
    // Convert to canvas coordinates
    const { width, height } = calculateCanvasDimensions(selectedAspectRatio);
    const canvasX = clickX * width;
    const canvasY = clickY * height;
    
    debugLog("Canvas coordinates:", { canvasX, canvasY });
    debugLog("Available panel regions:", panelRegions);
    
    // Find which panel was clicked
    const clickedPanel = panelRegions.find(panel => 
      canvasX >= panel.x && 
      canvasX <= panel.x + panel.width && 
      canvasY >= panel.y && 
      canvasY <= panel.y + panel.height
    );
    
    if (clickedPanel) {
      debugLog(`Clicked on panel ${clickedPanel.id}`);
      setSelectedPanel(clickedPanel);
      
      // Handle the panel selection directly
      handlePanelImageSelection(clickedPanel);
    } else {
      debugLog("No panel was clicked");
    }
  };
  
  // Function to handle image selection for a specific panel
  const handlePanelImageSelection = (panel) => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.onchange = (e) => {
      if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        
        // Convert to base64
        const reader = new FileReader();
        reader.onload = (event) => {
          const base64Image = event.target.result;
          
          // Get border thickness value
          let borderThicknessValue = 4;
          if (borderThicknessOptions && borderThickness) {
            const option = borderThicknessOptions.find(opt => opt.label.toLowerCase() === borderThickness.toLowerCase());
            if (option) {
              borderThicknessValue = option.value;
            }
          }
          
          // Check if this is updating an existing image or adding a new one
          const existingMappingIndex = panelImageMapping[panel.id];
          const isReuploadToSamePanel = existingMappingIndex !== undefined;
          
          // Create direct copies of the data for immediate rendering
          const updatedImages = [...selectedImages];
          const updatedMapping = {...panelImageMapping};
          
          if (isReuploadToSamePanel) {
            // Update existing image
            updatedImages[existingMappingIndex] = base64Image;
            // Update the state
            updateImage(existingMappingIndex, base64Image);
          } else {
            // Add new image
            const newIndex = selectedImages.length;
            updatedImages.push(base64Image);
            updatedMapping[panel.id] = newIndex;
            
            // Update the state
            updatePanelImageMapping(updatedMapping);
            addImage(base64Image);
          }
          
          // DIRECTLY render with the complete data - don't wait for React state updates
          renderTemplateToCanvas({
            selectedTemplate,
            selectedAspectRatio,
            panelCount,
            theme,
            canvasRef,
            setPanelRegions,
            setRenderedImage,
            borderThickness: borderThicknessValue,
            selectedImages: updatedImages,
            panelImageMapping: updatedMapping
          });
          
          // Update the selected panel state
          setSelectedPanel(panel);
        };
        reader.readAsDataURL(file);
      }
    };
    fileInput.click();
  };
  
  // Function to clear image assignment for a panel
  const clearPanelImage = (panelId) => {
    const imageIndex = panelImageMapping[panelId];
    
    if (imageIndex !== undefined) {
      if (DEBUG_MODE) {
        console.log(`Clearing image for panel ${panelId} (image index: ${imageIndex})`);
      }
      
      // Create a new mapping without this panel
      const newMapping = { ...panelImageMapping };
      delete newMapping[panelId];
      
      // Update the mapping
      updatePanelImageMapping(newMapping);
      
      // If this image is not used in any other panel, remove it
      const isImageUsedElsewhere = Object.values(newMapping).includes(imageIndex);
      
      if (!isImageUsedElsewhere) {
        if (DEBUG_MODE) {
          console.log(`Removing image at index ${imageIndex} as it's not used elsewhere`);
        }
        // Remove the image if it's not used elsewhere
        removeImage(imageIndex);
      }
    }
  };
  
  // Keep local panel mapping in sync with parent component
  useEffect(() => {
    // Update our local panel mapping from the parent component
    if (DEBUG_MODE) {
      console.log("Syncing panel image mapping:", panelImageMapping);
    }
    setPanelToImageMap(panelImageMapping);
  }, [panelImageMapping]);

  // Initial setup
  useEffect(() => {
    // Initialize the panel-to-image map from props
    if (Object.keys(panelToImageMap).length === 0 && Object.keys(panelImageMapping).length > 0) {
      if (DEBUG_MODE) {
        console.log("Initializing panel-to-image map from props");
      }
      setPanelToImageMap(panelImageMapping);
    }
  }, []);

  // Single useEffect to handle all rendering scenarios
  /* eslint-disable consistent-return */
  useEffect(() => {
    // Early return if missing required props
    if (!selectedTemplate || !selectedAspectRatio) {
      return;
    }

    // Get border thickness value
    let borderThicknessValue = 4; // Default
    if (borderThicknessOptions && borderThickness) {
      const option = borderThicknessOptions.find(opt => opt.label.toLowerCase() === borderThickness.toLowerCase());
      if (option) {
        borderThicknessValue = option.value;
      }
    }

    // Add short delay for the initial render only
    const initialDelay = hasInitialRender ? 0 : 50;
    
    const timer = setTimeout(() => {
      try {
        renderTemplateToCanvas({
          selectedTemplate,
          selectedAspectRatio,
          panelCount,
          theme,
          canvasRef,
          setPanelRegions,
          setRenderedImage,
          borderThickness: borderThicknessValue,
          selectedImages,
          panelImageMapping
        });
        
        if (!hasInitialRender) {
          setHasInitialRender(true);
        }
      } catch (error) {
        console.error("Error rendering template:", error);
      }
    }, initialDelay);
    
    return () => clearTimeout(timer);
  }, [
    selectedTemplate, 
    selectedAspectRatio, 
    panelCount, 
    theme.palette.mode, 
    borderThickness, 
    selectedImages, 
    panelImageMapping,
    hasInitialRender
  ]);
  /* eslint-enable consistent-return */

  // Clean up resources when component unmounts
  useEffect(() => {
    // Cleanup function
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
            Preview
          </Typography>
        )}
        
        {renderedImage ? (
          <>
            <Box
              component="img"
              src={renderedImage}
              alt="Collage Layout Preview"
              onClick={handlePreviewClick}
              sx={{
                maxWidth: '100%',
                maxHeight: isMobile ? 300 : 350, // Slightly smaller on mobile
                objectFit: 'contain',
                borderRadius: 1,
                cursor: 'pointer',
                margin: '0 auto',
                display: 'block'
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
      
      {/* Hidden canvas fallback for browsers without OffscreenCanvas support */}
      <canvas ref={canvasRef} style={{ display: "none" }} />
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
    { label: "Thin", value: 2 },
    { label: "Medium", value: 4 },
    { label: "Thick", value: 8 }
  ],
  panelImageMapping: {},
};
