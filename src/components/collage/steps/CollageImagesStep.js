import { useState, useEffect, useRef } from "react";
import { useTheme } from "@mui/material/styles";
import {
  Box,
  Button,
  Typography,
  Paper,
  useMediaQuery
} from "@mui/material";
import { KeyboardArrowLeft, KeyboardArrowRight } from "@mui/icons-material";

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

/**
 * CollageImagesStep - The second step of the collage creation process
 * Renders a preview of the final collage layout using OffscreenCanvas
 */
const CollageImagesStep = ({ 
  selectedImages, 
  setSelectedImages,
  panelCount,
  handleBack, 
  handleNext,
  selectedTemplate,
  selectedAspectRatio,
  borderThickness,
  borderThicknessOptions
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
  // Track panel-to-image mapping
  const [panelImageMap, setPanelImageMap] = useState({});
  // Store selected images per panel
  const [panelToImageMap, setPanelToImageMap] = useState({});
  
  // Function to handle click events on the preview image
  const handlePreviewClick = (event) => {
    // Use the utility function from PanelManager
    handlePreviewClickUtil(event, {
      panelRegions,
      setSelectedPanel,
      handlePanelImageSelection,
      calculateCanvasDimensions,
      selectedAspectRatio
    });
  };
  
  // Function to handle image selection for a specific panel
  const handlePanelImageSelection = (panel) => {
    // Use the utility function from PanelManager
    handlePanelImageSelectionUtil(panel, {
      panelToImageMap,
      setPanelToImageMap,
      selectedImages,
      panelCount
    });
  };
  
  // Function to clear image assignment for a panel
  const clearPanelImage = (panelId) => {
    // Use the utility function from PanelManager
    clearPanelImageUtil(panelId, setPanelToImageMap);
  };
  
  // Keep selectedImages state in sync with parent component
  useEffect(() => {
    // Update the effective selected images based on panel mapping
    const effectiveSelectedImages = Object.entries(panelToImageMap).map(
      ([panelId, imageIndex]) => ({
        panel: parseInt(panelId, 10),
        image: selectedImages[imageIndex],
        imageIndex
      })
    );
    
    console.log("Effective selected images:", effectiveSelectedImages);
    
    // If you need to update the parent component's selectedImages state,
    // you would do so here
  }, [panelToImageMap, selectedImages]);

  // Render the template when template or aspect ratio changes
  useEffect(() => {
    if (selectedTemplate) {
      // Get the numeric border thickness value if provided
      let borderThicknessValue = 4; // Default to medium (4px)
      
      if (borderThickness && borderThicknessOptions) {
        const option = borderThicknessOptions.find(
          opt => opt.label.toLowerCase() === borderThickness.toLowerCase()
        );
        if (option) {
          borderThicknessValue = option.value;
        }
      }
      
      console.log("Preview rendering with border thickness:", borderThicknessValue);
      
      // Call the imported renderTemplateToCanvas function
      renderTemplateToCanvas({
        selectedTemplate,
        selectedAspectRatio,
        panelCount,
        theme,
        canvasRef,
        setPanelRegions,
        setRenderedImage,
        borderThickness: borderThicknessValue
      });
    }
  }, [selectedTemplate, selectedAspectRatio, panelCount, theme.palette.mode, borderThickness, borderThicknessOptions]);
  
  // Add a dedicated effect just for border thickness changes to ensure it triggers a redraw
  useEffect(() => {
    if (selectedTemplate && borderThickness) {
      console.log("Border thickness changed to:", borderThickness);
      
      // Get the numeric value for the border thickness
      let borderThicknessValue = 4; // Default to medium (4px)
      if (borderThicknessOptions) {
        const option = borderThicknessOptions.find(
          opt => opt.label.toLowerCase() === borderThickness.toLowerCase()
        );
        if (option) {
          borderThicknessValue = option.value;
          console.log("Found numeric border thickness value:", borderThicknessValue);
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
        borderThickness: borderThicknessValue
      });
    }
  }, [borderThickness]); // Only run when border thickness changes
  
  // Add additional useEffect for debugging:
  // Log relevant information about the selected template
  useEffect(() => {
    if (selectedTemplate) {
      console.log("Selected Template Details:");
      console.log("- ID:", selectedTemplate.id);
      console.log("- Name:", selectedTemplate.name);
      console.log("- Arrangement:", selectedTemplate.arrangement);
      console.log("- Panel Count:", selectedTemplate.panels);
      console.log("- Min/Max Images:", selectedTemplate.minImages, "/", selectedTemplate.maxImages);
      console.log("- Style:", selectedTemplate.style);
      console.log("- Has getLayoutConfig:", typeof selectedTemplate.getLayoutConfig === 'function');
      
      // Get layouts that should be compatible with this template
      const layouts = getLayoutsForPanelCount(panelCount, selectedAspectRatio);
      const matchingLayout = layouts.find(layout => layout.id === selectedTemplate.id);
      console.log("Direct match in layouts array:", matchingLayout ? "Yes" : "No");
      
      if (matchingLayout) {
        console.log("Matching layout has getLayoutConfig:", typeof matchingLayout.getLayoutConfig === 'function');
      }
    }
  }, [selectedTemplate, selectedAspectRatio, panelCount]);
  
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
          alignItems: 'center'
        }}
      >
        {!isMobile && (
          <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ mb: 1 }}>
            Preview
          </Typography>
        )}
        
        {renderedImage ? (
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
        
        {/* Display information about clicked panel if any */}
        {selectedPanel && (
          <Box sx={{ mt: 1.5, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Typography variant="body2" color="primary">
              Panel #{selectedPanel.id + 1}
              {panelToImageMap[selectedPanel.id] !== undefined && 
                ` - Image ${panelToImageMap[selectedPanel.id] + 1} assigned`}
            </Typography>
            
            {panelToImageMap[selectedPanel.id] !== undefined && (
              <Button 
                variant="text" 
                color="error" 
                size="small"
                onClick={() => clearPanelImage(selectedPanel.id)}
                sx={{ mt: 0.5 }}
              >
                Remove Image
              </Button>
            )}
          </Box>
        )}
      </Paper>
      
      {/* Panel-to-Image Mapping Summary */}
      {Object.keys(panelToImageMap).length > 0 && (
        <Paper
          elevation={1}
          sx={{
            p: isMobile ? 1.5 : 2,
            mb: isMobile ? 1 : 2,
            backgroundColor: theme.palette.background.paper,
            borderRadius: 2
          }}
        >
          {!isMobile && (
            <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ mb: 1 }}>
              Image Assignments
            </Typography>
          )}
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
            {Object.entries(panelToImageMap).map(([panelId, imageIndex]) => (
              <Box 
                key={panelId}
                sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  p: isMobile ? 0.75 : 1,
                  borderRadius: 1,
                  bgcolor: theme.palette.action.hover
                }}
              >
                <Typography variant="body2">
                  Panel {parseInt(panelId, 10) + 1} ➔ Image {imageIndex + 1}
                </Typography>
                <Button 
                  variant="text" 
                  color="error" 
                  size="small"
                  onClick={() => clearPanelImage(parseInt(panelId, 10))}
                >
                  {isMobile ? "✕" : "Remove"}
                </Button>
              </Box>
            ))}
          </Box>
        </Paper>
      )}
      
      {/* Hidden canvas fallback for browsers without OffscreenCanvas support */}
      <canvas ref={canvasRef} style={{ display: "none" }} />
    </Box>
  );
};

export default CollageImagesStep;
