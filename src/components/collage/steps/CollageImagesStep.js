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
  selectedAspectRatio
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [renderedImage, setRenderedImage] = useState(null);
  // Fallback canvas reference for browsers that don't support OffscreenCanvas
  const canvasRef = useRef(null);
  
  // Get the aspect ratio value from the presets
  const getAspectRatioValue = () => {
    const aspectRatioPreset = aspectRatioPresets.find(preset => preset.id === selectedAspectRatio);
    return aspectRatioPreset ? aspectRatioPreset.value : 1; // Default to 1 (square) if not found
  };

  // Calculate canvas dimensions based on the selected aspect ratio
  const calculateCanvasDimensions = () => {
    const aspectRatio = getAspectRatioValue();
    const maxSize = 1500; // Max size for longest dimension
    
    let width, height;
    
    if (aspectRatio >= 1) {
      // Landscape or square
      width = maxSize;
      height = maxSize / aspectRatio;
    } else {
      // Portrait
      height = maxSize;
      width = maxSize * aspectRatio;
    }
    
    return { width: Math.round(width), height: Math.round(height) };
  };

  // Render the template to a canvas (either offscreen or regular)
  const renderTemplateToCanvas = () => {
    if (!selectedTemplate) return;
    
    const { width, height } = calculateCanvasDimensions();
    
    let canvas, ctx;
    
    // Try to use OffscreenCanvas if supported
    try {
      canvas = new OffscreenCanvas(width, height);
      ctx = canvas.getContext('2d');
    } catch (error) {
      console.warn("OffscreenCanvas not supported, falling back to regular canvas", error);
      // Fall back to a regular canvas if OffscreenCanvas is not supported
      if (canvasRef.current) {
        canvas = canvasRef.current;
        canvas.width = width;
        canvas.height = height;
        ctx = canvas.getContext('2d');
      } else {
        console.error("No canvas available for rendering");
        return;
      }
    }
    
    // Clear the canvas with a dark or light background based on theme
    ctx.fillStyle = theme.palette.mode === 'dark' ? '#121212' : '#f5f5f5';
    ctx.fillRect(0, 0, width, height);
    
    // Get layout configuration based on the template
    let layoutConfig;
    
    // For debugging
    console.log("Selected template:", selectedTemplate);
    console.log("Template ID:", selectedTemplate.id);
    console.log("Template name:", selectedTemplate.name);
    console.log("Template arrangement:", selectedTemplate.arrangement);
    console.log("Has getLayoutConfig:", typeof selectedTemplate.getLayoutConfig === 'function');
    
    // First try to use the selected template's built-in getLayoutConfig
    if (selectedTemplate.getLayoutConfig) {
      // Use the selected template's layout config directly
      console.log("Using template's built-in layout config");
      layoutConfig = selectedTemplate.getLayoutConfig();
    } else {
      // Get all compatible layouts
      const aspectRatioId = selectedAspectRatio || 'square';
      const layouts = getLayoutsForPanelCount(panelCount, aspectRatioId);
      console.log("Compatible layouts:", layouts);
      console.log("Layout IDs:", layouts.map(l => l.id));
      console.log("Looking for layout with ID:", selectedTemplate.id);
      
      // Try to find the exact selected template in the layouts by ID
      let matchingLayout = layouts.find(layout => layout.id === selectedTemplate.id);
      
      // Always use our template ID to create layout first if we have a specific one
      if (selectedTemplate.id && selectedTemplate.id !== 'autoLayout' && 
          selectedTemplate.id !== 'dynamic-2-panel' && 
          selectedTemplate.id !== 'dynamic-3-panel' &&
          selectedTemplate.id !== 'dynamic-4-panel' &&
          selectedTemplate.id !== 'dynamic-5-panel') {
        console.log("Creating layout directly from template ID:", selectedTemplate.id);
        layoutConfig = createLayoutConfigFromId(selectedTemplate.id, panelCount);
      }
      // If still no layout config but we have a matching layout with getLayoutConfig, use it
      else if (matchingLayout && matchingLayout.getLayoutConfig) {
        console.log("Found exact matching layout by ID with getLayoutConfig:", matchingLayout.id);
        layoutConfig = matchingLayout.getLayoutConfig();
      }
      // Special case for auto/dynamic layouts - need to use an appropriate layout for this panel count
      else if (selectedTemplate.arrangement === 'auto' || selectedTemplate.arrangement === 'dynamic') {
        // For auto layouts, try to find a recommended layout for this panel count
        const recommendedLayouts = layouts.filter(layout => layout.recommended);
        
        if (recommendedLayouts.length > 0) {
          console.log("Using recommended layout:", recommendedLayouts[0].id);
          if (recommendedLayouts[0].getLayoutConfig) {
            layoutConfig = recommendedLayouts[0].getLayoutConfig();
          } else {
            layoutConfig = createLayoutConfigFromId(recommendedLayouts[0].id, panelCount);
          }
        } else if (layouts.length > 0) {
          console.log("Using first compatible layout:", layouts[0].id);
          if (layouts[0].getLayoutConfig) {
            layoutConfig = layouts[0].getLayoutConfig();
          } else {
            layoutConfig = createLayoutConfigFromId(layouts[0].id, panelCount);
          }
        } else {
          console.log("Creating default grid layout (no compatible layouts found)");
          layoutConfig = createDefaultGridLayout(panelCount);
        }
      } else {
        console.log("Creating default grid layout (no layout found)");
        layoutConfig = createDefaultGridLayout(panelCount);
      }
    }
    
    if (!layoutConfig) {
      console.error('No layout configuration found for the selected template');
      return;
    }
    
    // Draw the layout panels
    drawLayoutPanels(ctx, layoutConfig, width, height);
    
    // Convert the canvas to an image
    if (canvas instanceof OffscreenCanvas) {
      // If using OffscreenCanvas, convert to ImageBitmap first
      canvas.convertToBlob({ type: 'image/png' })
        .then(blob => {
          const url = URL.createObjectURL(blob);
          setRenderedImage(url);
        })
        .catch(err => {
          console.error('Error converting canvas to blob:', err);
        });
    } else {
      // If using regular canvas, get data URL directly
      setRenderedImage(canvas.toDataURL('image/png'));
    }
  };
  
  // Draw the layout panels on the canvas
  const drawLayoutPanels = (ctx, layoutConfig, canvasWidth, canvasHeight) => {
    console.log("Drawing layout with config:", layoutConfig);
    const { gridTemplateColumns, gridTemplateRows, areas } = layoutConfig;
    
    // Parse grid template columns and rows
    const columns = parseGridTemplate(gridTemplateColumns);
    const rows = parseGridTemplate(gridTemplateRows);
    console.log("Parsed grid columns:", columns);
    console.log("Parsed grid rows:", rows);
    
    // Calculate the actual width/height of each grid cell
    const totalColumnFr = columns.reduce((sum, val) => sum + val, 0);
    const totalRowFr = rows.reduce((sum, val) => sum + val, 0);
    
    const cellWidths = columns.map(fr => (fr / totalColumnFr) * canvasWidth);
    const cellHeights = rows.map(fr => (fr / totalRowFr) * canvasHeight);
    
    // Set styles as specified
    const borderWidth = 2;
    ctx.strokeStyle = 'white'; // 2px white border
    ctx.lineWidth = borderWidth;
    ctx.fillStyle = '#808080'; // Grey placeholder for panels
    
    // Calculate grid positions
    const rowPositions = [];
    let currentY = 0;
    rows.forEach((_, index) => {
      rowPositions[index] = currentY;
      currentY += cellHeights[index];
    });
    
    const colPositions = [];
    let currentX = 0;
    columns.forEach((_, index) => {
      colPositions[index] = currentX;
      currentX += cellWidths[index];
    });
    
    // If the layout uses areas, use those
    // Otherwise draw a simple grid
    if (areas && areas.length > 0) {
      // Draw each area in the grid
      areas.forEach((area, index) => {
        const areaRow = Math.floor(index / columns.length);
        const areaCol = index % columns.length;
        
        if (areaRow < rows.length && areaCol < columns.length) {
          const x = colPositions[areaCol];
          const y = rowPositions[areaRow];
          const width = cellWidths[areaCol];
          const height = cellHeights[areaRow];
          
          // Draw the panel with border
          ctx.fillRect(x + borderWidth/2, y + borderWidth/2, 
                       width - borderWidth, height - borderWidth);
          ctx.strokeRect(x + borderWidth/2, y + borderWidth/2, 
                         width - borderWidth, height - borderWidth);
        }
      });
    } else {
      // Draw a simple grid layout
      for (let row = 0; row < rows.length; row++) {
        for (let col = 0; col < columns.length; col++) {
          const x = colPositions[col];
          const y = rowPositions[row];
          const width = cellWidths[col];
          const height = cellHeights[row];
          
          // Draw the panel with border
          ctx.fillRect(x + borderWidth/2, y + borderWidth/2, 
                       width - borderWidth, height - borderWidth);
          ctx.strokeRect(x + borderWidth/2, y + borderWidth/2, 
                         width - borderWidth, height - borderWidth);
        }
      }
    }
  };
  
  // Helper function to parse grid template strings like "1fr 2fr" into [1, 2]
  const parseGridTemplate = (template) => {
    if (!template) return [1];
    
    // Handle "repeat(N, 1fr)" format
    const repeatMatch = template.match(/repeat\((\d+),\s*([^)]+)\)/);
    if (repeatMatch) {
      const count = parseInt(repeatMatch[1], 10);
      const value = parseValue(repeatMatch[2].trim());
      return Array(count).fill(value);
    }
    
    // Handle "1fr 2fr" format
    return template.split(' ').map(parseValue);
  };
  
  // Helper to parse values like "1fr" into 1
  const parseValue = (value) => {
    const frMatch = value.match(/(\d+)fr/);
    if (frMatch) {
      return parseInt(frMatch[1], 10);
    }
    return 1; // Default to 1 for unsupported formats
  };

  // Helper function to create a default grid layout when getLayoutConfig is missing
  const createDefaultGridLayout = (count) => {
    // Determine grid dimensions based on panel count
    let columns, rows;
    
    switch(count) {
      case 1:
        columns = 1; rows = 1;
        break;
      case 2:
        columns = 2; rows = 1;
        break;
      case 3:
        columns = 3; rows = 1;
        break;
      case 4:
        columns = 2; rows = 2;
        break;
      case 5:
        if (getAspectRatioValue() >= 1) { // Landscape or square
          columns = Math.ceil(count/2); rows = 2;
        } else { // Portrait
          columns = 2; rows = Math.ceil(count/2);
        }
        break;
      default:
        // Generic grid for any other counts
        columns = Math.ceil(Math.sqrt(count));
        rows = Math.ceil(count / columns);
    }
    
    return {
      gridTemplateColumns: `repeat(${columns}, 1fr)`,
      gridTemplateRows: `repeat(${rows}, 1fr)`,
      gridTemplateAreas: null,
      items: Array(count).fill({ gridArea: null })
    };
  };

  // Add a new function to create layout config based on template ID
  // Create layout configuration based on template ID
  const createLayoutConfigFromId = (templateId, count) => {
    // Two panel layouts
    if (count === 2) {
      switch(templateId) {
        case 'split-horizontal':
          return {
            gridTemplateColumns: '1fr 1fr',
            gridTemplateRows: '1fr',
            gridTemplateAreas: null,
            items: Array(2).fill({ gridArea: null })
          };
        case 'split-vertical':
          return {
            gridTemplateColumns: '1fr',
            gridTemplateRows: '1fr 1fr',
            gridTemplateAreas: null,
            items: Array(2).fill({ gridArea: null })
          };
        case 'two-thirds-one-third-h':
        case 'wide-left-narrow-right':
          return {
            gridTemplateColumns: '2fr 1fr',
            gridTemplateRows: '1fr',
            gridTemplateAreas: null,
            items: Array(2).fill({ gridArea: null })
          };
        case 'one-third-two-thirds-h':
        case 'narrow-left-wide-right':
          return {
            gridTemplateColumns: '1fr 2fr',
            gridTemplateRows: '1fr',
            gridTemplateAreas: null,
            items: Array(2).fill({ gridArea: null })
          };
        case 'two-thirds-one-third-v':
        case 'wide-top-narrow-bottom':
          return {
            gridTemplateColumns: '1fr',
            gridTemplateRows: '2fr 1fr',
            gridTemplateAreas: null,
            items: Array(2).fill({ gridArea: null })
          };
        case 'one-third-two-thirds-v':
        case 'wide-bottom-narrow-top':
          return {
            gridTemplateColumns: '1fr',
            gridTemplateRows: '1fr 2fr',
            gridTemplateAreas: null,
            items: Array(2).fill({ gridArea: null })
          };
        case 'wide-75-25-split':
          return {
            gridTemplateColumns: '3fr 1fr',
            gridTemplateRows: '1fr',
            gridTemplateAreas: null,
            items: Array(2).fill({ gridArea: null })
          };
        case 'tall-75-25-split':
          return {
            gridTemplateColumns: '1fr',
            gridTemplateRows: '3fr 1fr',
            gridTemplateAreas: null,
            items: Array(2).fill({ gridArea: null })
          };
        case 'top-tall-bottom-short':
          return {
            gridTemplateColumns: '1fr',
            gridTemplateRows: '2fr 1fr',
            gridTemplateAreas: null,
            items: Array(2).fill({ gridArea: null })
          };
        case 'top-short-bottom-tall':
          return {
            gridTemplateColumns: '1fr',
            gridTemplateRows: '1fr 2fr',
            gridTemplateAreas: null,
            items: Array(2).fill({ gridArea: null })
          };
        case 'left-wide-right-narrow':
          return {
            gridTemplateColumns: '2fr 1fr',
            gridTemplateRows: '1fr',
            gridTemplateAreas: null,
            items: Array(2).fill({ gridArea: null })
          };
        case 'left-narrow-right-wide':
          return {
            gridTemplateColumns: '1fr 2fr',
            gridTemplateRows: '1fr',
            gridTemplateAreas: null,
            items: Array(2).fill({ gridArea: null })
          };
      }
    }
    
    // Three panel layouts
    if (count === 3) {
      switch(templateId) {
        case 'main-with-two-bottom':
          return {
            gridTemplateColumns: '1fr 1fr',
            gridTemplateRows: '2fr 1fr',
            gridTemplateAreas: '"main main" "left right"',
            areas: ['main', 'left', 'right']
          };
        case '3-columns':
          return {
            gridTemplateColumns: 'repeat(3, 1fr)',
            gridTemplateRows: '1fr',
            gridTemplateAreas: null,
            items: Array(3).fill({ gridArea: null })
          };
        case '3-rows':
          return {
            gridTemplateColumns: '1fr',
            gridTemplateRows: 'repeat(3, 1fr)',
            gridTemplateAreas: null,
            items: Array(3).fill({ gridArea: null })
          };
        case 'center-feature-wide':
          return {
            gridTemplateColumns: '1fr 2fr 1fr',
            gridTemplateRows: '1fr',
            gridTemplateAreas: '"left main right"',
            areas: ['left', 'main', 'right']
          };
        case 'side-stack-wide':
        case 'main-with-two-right':
          return {
            gridTemplateColumns: '2fr 1fr',
            gridTemplateRows: '1fr 1fr',
            gridTemplateAreas: '"main top" "main bottom"',
            areas: ['main', 'top', 'bottom']
          };
        case 'center-feature-tall':
          return {
            gridTemplateColumns: '1fr',
            gridTemplateRows: '1fr 2fr 1fr',
            gridTemplateAreas: '"top" "main" "bottom"',
            areas: ['top', 'main', 'bottom']
          };
        case 'two-and-one-tall':
          return {
            gridTemplateColumns: '1fr 1fr',
            gridTemplateRows: '1fr 1fr',
            gridTemplateAreas: '"left right" "bottom bottom"',
            areas: ['left', 'right', 'bottom']
          };
      }
    }
    
    // Four panel layouts
    if (count === 4) {
      switch(templateId) {
        case 'grid-2x2':
          return {
            gridTemplateColumns: 'repeat(2, 1fr)',
            gridTemplateRows: 'repeat(2, 1fr)',
            gridTemplateAreas: null,
            items: Array(4).fill({ gridArea: null })
          };
        case 'big-and-3-bottom':
          return {
            gridTemplateColumns: '1fr 1fr 1fr',
            gridTemplateRows: '2fr 1fr',
            gridTemplateAreas: '"main main main" "left middle right"',
            areas: ['main', 'left', 'middle', 'right']
          };
        case '4-columns':
          return {
            gridTemplateColumns: 'repeat(4, 1fr)',
            gridTemplateRows: '1fr',
            gridTemplateAreas: null,
            items: Array(4).fill({ gridArea: null })
          };
        case '4-rows':
          return {
            gridTemplateColumns: '1fr',
            gridTemplateRows: 'repeat(4, 1fr)',
            gridTemplateAreas: null,
            items: Array(4).fill({ gridArea: null })
          };
        case 'left-feature-with-3-right':
          return {
            gridTemplateColumns: '2fr 1fr',
            gridTemplateRows: 'repeat(3, 1fr)',
            gridTemplateAreas: '"main top" "main middle" "main bottom"',
            areas: ['main', 'top', 'middle', 'bottom']
          };
        case 'panoramic-strips':
          return {
            gridTemplateColumns: '1fr',
            gridTemplateRows: 'repeat(4, 1fr)',
            gridTemplateAreas: null,
            items: Array(4).fill({ gridArea: null })
          };
      }
    }
    
    // Five panel layouts
    if (count === 5) {
      switch(templateId) {
        case 'featured-top-with-4-below':
          return {
            gridTemplateColumns: 'repeat(4, 1fr)',
            gridTemplateRows: '2fr 1fr',
            gridTemplateAreas: '"main main main main" "one two three four"',
            areas: ['main', 'one', 'two', 'three', 'four']
          };
        case '5-columns':
          return {
            gridTemplateColumns: 'repeat(5, 1fr)',
            gridTemplateRows: '1fr',
            gridTemplateAreas: null,
            items: Array(5).fill({ gridArea: null })
          };
        case '5-rows':
          return {
            gridTemplateColumns: '1fr',
            gridTemplateRows: 'repeat(5, 1fr)',
            gridTemplateAreas: null,
            items: Array(5).fill({ gridArea: null })
          };
        case 'asymmetric-5':
          return {
            gridTemplateColumns: 'repeat(3, 1fr)',
            gridTemplateRows: 'repeat(2, 1fr)',
            gridTemplateAreas: '"top-left top-middle top-right" "bottom-left bottom-left bottom-right"',
            areas: ['top-left', 'top-middle', 'top-right', 'bottom-left', 'bottom-right']
          };
        case 'featured-left-with-grid':
        case 'featured-left-with-4-right':
          return {
            gridTemplateColumns: '2fr 1fr 1fr',
            gridTemplateRows: 'repeat(2, 1fr)',
            gridTemplateAreas: '"main top-left top-right" "main bottom-left bottom-right"',
            areas: ['main', 'top-left', 'top-right', 'bottom-left', 'bottom-right']
          };
      }
    }
    
    // Fall back to default grid layout if no specific layout found
    console.warn(`Template ID '${templateId}' not found in direct mapping, using default grid layout. This ID should be added to createLayoutConfigFromId function.`);
    return createDefaultGridLayout(count);
  };

  // Render the template when template or aspect ratio changes
  useEffect(() => {
    if (selectedTemplate) {
      renderTemplateToCanvas();
    }
  }, [selectedTemplate, selectedAspectRatio, panelCount, theme.palette.mode]);
  
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
    <Box sx={{ my: 2 }}>
      <Typography variant="h6" gutterBottom>
        Select Images for Your Collage
      </Typography>
      
      <Typography variant="body2" color="text.secondary" paragraph>
        The layout below shows how your images will be arranged. Select up to {panelCount} images.
      </Typography>
      
      {/* Layout Preview */}
      <Paper
        elevation={1}
        sx={{
          p: 2,
          mb: 3,
          backgroundColor: theme.palette.background.paper,
          borderRadius: 2,
          textAlign: 'center'
        }}
      >
        <Typography variant="subtitle1" gutterBottom>
          Layout Preview
        </Typography>
        
        {renderedImage ? (
          <Box
            component="img"
            src={renderedImage}
            alt="Collage Layout Preview"
            sx={{
              maxWidth: '100%',
              maxHeight: 400,
              objectFit: 'contain',
              borderRadius: 1,
            }}
          />
        ) : (
          <Box
            sx={{
              height: 200,
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
      
      {/* Navigation Buttons */}
      <Box sx={{ display: 'flex', flexDirection: 'row', pt: 2 }}>
        <Button
          color="inherit"
          onClick={handleBack}
          sx={{ mr: 1 }}
          startIcon={<KeyboardArrowLeft />}
        >
          Back to Settings
        </Button>
        <Box sx={{ flex: '1 1 auto' }} />
        <Button
          variant="contained"
          onClick={handleNext}
          endIcon={<KeyboardArrowRight />}
          disabled={selectedImages.length === 0}
        >
          Continue to Arrange
        </Button>
      </Box>
    </Box>
  );
};

export default CollageImagesStep;
