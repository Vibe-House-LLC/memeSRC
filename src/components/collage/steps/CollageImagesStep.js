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
        
        // Convert to base64 instead of using Blob URLs which can become invalid
        const reader = new FileReader();
        reader.onload = (event) => {
          // This base64 string won't expire like Blob URLs
          const base64Image = event.target.result;
          
          if (DEBUG_MODE) {
            console.log(`Converted image for panel ${panel.id} to base64 (first 30 chars): ${base64Image.substring(0, 30)}...`);
          }
          
          // Find if there's already an image for this panel
          const existingMappingIndex = panelImageMapping[panel.id];
          
          if (DEBUG_MODE) {
            console.log(`Processing image for panel ${panel.id}`, {
              existingIndex: existingMappingIndex,
              currentMappings: JSON.parse(JSON.stringify(panelImageMapping)),
              selectedImageCount: selectedImages.length
            });
          }
          
          // Handle updating the image and mapping
          if (existingMappingIndex !== undefined && selectedImages[existingMappingIndex]) {
            if (DEBUG_MODE) {
              console.log(`Updating existing image at index ${existingMappingIndex}`);
            }
            // Update the existing image immediately
            updateImage(existingMappingIndex, base64Image);
            // No need to update mapping as we're replacing an existing image
          } else {
            if (DEBUG_MODE) {
              console.log(`Adding new image at index ${selectedImages.length}`);
            }
            
            // First add the new image - store the current length which will be the new image's index
            const newIndex = selectedImages.length;
            addImage(base64Image);
            
            // Create a new mapping entry for this panel
            const newMapping = { ...panelImageMapping };
            newMapping[panel.id] = newIndex;
            
            if (DEBUG_MODE) {
              console.log(`New mapping: panel ${panel.id} -> image ${newIndex}`);
            }
            
            // Update the mapping
            updatePanelImageMapping(newMapping);
          }
          
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

  // Render the template when template or aspect ratio changes
  useEffect(() => {
    if (DEBUG_MODE) {
      console.log("Template render effect triggered:", { 
        selectedTemplate, 
        selectedAspectRatio,
        panelCount,
        borderThickness,
        hasImages: selectedImages.length > 0,
        mappingKeys: Object.keys(panelImageMapping).length
      });
    }
    
    if (selectedTemplate && selectedAspectRatio) {
      // Get the numeric border thickness value if provided
      let borderThicknessValue = 4; // Default to medium (4px)
      
      if (borderThicknessOptions && borderThickness) {
        const option = borderThicknessOptions.find(opt => opt.label.toLowerCase() === borderThickness.toLowerCase());
        if (option) {
          borderThicknessValue = option.value;
          debugLog("Found numeric border thickness value:", borderThicknessValue);
        }
      }
      
      if (DEBUG_MODE) {
        console.log("Attempting to render preview with:", {
          templateId: selectedTemplate.id,
          aspectRatio: selectedAspectRatio,
          panels: panelCount,
          thickness: borderThicknessValue,
          theme: theme.palette.mode,
          imageCount: selectedImages.length,
          mappings: JSON.stringify(panelImageMapping)
        });
      }
      
      // Add a small delay to ensure blob URLs are ready
      const renderTimer = setTimeout(() => {
        try {
          // Call the imported renderTemplateToCanvas function
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
        } catch (error) {
          console.error("Error rendering template:", error);
        }
      }, 50);
      
      return () => clearTimeout(renderTimer);
    }
    
    debugWarn("Missing required props for template rendering:", {
      hasTemplate: !!selectedTemplate,
      hasAspectRatio: !!selectedAspectRatio
    });
    
    // Add an empty return for the case when the condition is false
    return undefined;
  }, [selectedTemplate, selectedAspectRatio, panelCount, theme.palette.mode, borderThickness, borderThicknessOptions, selectedImages, panelImageMapping]);
  
  // Add a dedicated effect just for border thickness changes to ensure it triggers a redraw
  useEffect(() => {
    if (selectedTemplate && borderThickness) {
      debugLog("Border thickness changed to:", borderThickness);
      
      // Get the numeric value for the border thickness
      let borderThicknessValue = 4; // Default to medium (4px)
      if (borderThicknessOptions) {
        const option = borderThicknessOptions.find(opt => opt.label.toLowerCase() === borderThickness.toLowerCase());
        if (option) {
          borderThicknessValue = option.value;
          debugLog("Found numeric border thickness value:", borderThicknessValue);
        }
      }
      
      // Force a redraw with the new border thickness
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
    }
  }, [borderThickness, selectedTemplate, selectedAspectRatio, panelCount, theme.palette.mode, borderThicknessOptions, selectedImages, panelImageMapping]);
  
  // Add additional useEffect for debugging:
  // Log relevant information about the selected template
  useEffect(() => {
    if (DEBUG_MODE && selectedTemplate) {
      debugLog("Selected Template Details:");
      debugLog("- ID:", selectedTemplate.id);
      debugLog("- Name:", selectedTemplate.name);
      debugLog("- Arrangement:", selectedTemplate.arrangement);
      debugLog("- Panel Count:", selectedTemplate.panels);
      debugLog("- Min/Max Images:", selectedTemplate.minImages, "/", selectedTemplate.maxImages);
      debugLog("- Style:", selectedTemplate.style);
      debugLog("- Has getLayoutConfig:", typeof selectedTemplate.getLayoutConfig === 'function');
      
      // Get layouts that should be compatible with this template
      const layouts = getLayoutsForPanelCount(panelCount, selectedAspectRatio);
      const matchingLayout = layouts.find(layout => layout.id === selectedTemplate.id);
      debugLog("Direct match in layouts array:", matchingLayout ? "Yes" : "No");
      
      if (matchingLayout) {
        debugLog("Matching layout has getLayoutConfig:", typeof matchingLayout.getLayoutConfig === 'function');
      }
    }
  }, [selectedTemplate, selectedAspectRatio, panelCount]);
  
  // Add an initial rendering effect to ensure preview is generated immediately
  useEffect(() => {
    if (DEBUG_MODE) {
      console.log("Initial render check:", {
        hasTemplate: !!selectedTemplate,
        hasAspectRatio: !!selectedAspectRatio,
        hasRenderedImage: !!renderedImage
      });
    }
    
    // Force initial render if selectedTemplate exists
    if (selectedTemplate && selectedAspectRatio && !renderedImage) {
      if (DEBUG_MODE) {
        console.log("Forcing initial preview render");
      }
      
      // Get the numeric border thickness value
      let borderThicknessValue = 4; // Default
      if (borderThicknessOptions && borderThickness) {
        const option = borderThicknessOptions.find(opt => opt.label.toLowerCase() === borderThickness.toLowerCase());
        if (option) {
          borderThicknessValue = option.value;
        }
      }
      
      if (DEBUG_MODE) {
        console.log("Initial render with:", {
          templateId: selectedTemplate.id,
          aspectRatio: selectedAspectRatio,
          panels: panelCount,
          thickness: borderThicknessValue
        });
      }
      
      // Render the template
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
    }
  }, [selectedTemplate, selectedAspectRatio, panelCount, theme, borderThickness, borderThicknessOptions, selectedImages, panelImageMapping, renderedImage]);

  // Clean up resources when component unmounts
  useEffect(() => {
    return () => {
      if (renderedImage) {
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
