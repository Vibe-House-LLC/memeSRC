import React, { useMemo } from 'react';
import { useTheme } from "@mui/material/styles";
import { Box, IconButton, Typography } from "@mui/material";
import { MoreVert, Add } from "@mui/icons-material";

import { layoutDefinitions } from "../config/layouts";

/**
 * Helper function to create a layout config based on the template type
 */
const createLayoutConfig = (template, panelCount) => {
  if (!template) return null;
  
  console.log("Creating layout config for template:", template);
  
  try {
    // Look up the original layout in the layout definitions
    const panelCountKey = Math.max(2, Math.min(panelCount, 5));
    const categories = layoutDefinitions[panelCountKey];
    
    // Search for the layout in all categories (wide, tall, square)
    if (categories) {
      const foundLayout = Object.keys(categories).reduce((result, category) => {
        if (result) return result; // Already found a layout
        
        const layouts = categories[category];
        const originalLayout = layouts.find(l => l.id === template.id);
        
        if (originalLayout && typeof originalLayout.getLayoutConfig === 'function') {
          return originalLayout;
        }
        
        return null;
      }, null);
      
      if (foundLayout) {
        console.log("Found layout, getting config:", foundLayout);
        return foundLayout.getLayoutConfig();
      }
    }
    
    console.log("No layout found, using default grid");
    // Fallback to a basic grid layout in case of error
    return {
      gridTemplateColumns: `repeat(${Math.ceil(Math.sqrt(panelCount))}, 1fr)`,
      gridTemplateRows: `repeat(${Math.ceil(panelCount / Math.ceil(Math.sqrt(panelCount)))}, 1fr)`,
      gridTemplateAreas: null,
      items: Array(panelCount).fill({ gridArea: null })
    };
  } catch (error) {
    console.error("Error creating layout config:", error, template);
    // Fallback to a basic grid layout in case of error
    return {
      gridTemplateColumns: `repeat(${Math.ceil(Math.sqrt(panelCount))}, 1fr)`,
      gridTemplateRows: `repeat(${Math.ceil(panelCount / Math.ceil(Math.sqrt(panelCount)))}, 1fr)`,
      gridTemplateAreas: null,
      items: Array(panelCount).fill({ gridArea: null })
    };
  }
};

/**
 * Convert border thickness from string or named value to pixels
 */
const getBorderPixelSize = (borderThickness) => {
  // If it's already a number, return it
  if (typeof borderThickness === 'number') {
    return borderThickness;
  }
  
  // Default thickness map
  const thicknessMap = {
    'none': 0,
    'thin': 6,
    'medium': 16,
    'thicc': 40,
    'thiccer': 80,
    'xtra thicc': 120,
    'XTRA THICC': 120
  };
  
  // Normalize and look up in map
  const normalizedKey = String(borderThickness).toLowerCase();
  return thicknessMap[normalizedKey] || 16; // Default to medium if not found
};

/**
 * DynamicCollagePreview - A component for rendering a dynamic preview of the collage layout
 * This is extracted from the PlaygroundCollagePage and optimized for reuse
 */
const DynamicCollagePreview = ({
  selectedTemplate,
  selectedAspectRatio,
  panelCount,
  images = [], // Accepts array of image objects or urls
  onPanelClick,
  onMenuOpen,
  aspectRatioValue = 1,
  panelImageMapping = {}, // Added parameter to access the mapping
  borderThickness = 0, // Added parameter for border thickness
  borderColor = '#000000', // Added parameter for border color
}) => {
  const theme = useTheme();
  
  // Convert borderThickness to numeric pixel value
  const borderPixels = getBorderPixelSize(borderThickness);
  
  console.log("DynamicCollagePreview props:", {
    hasTemplate: !!selectedTemplate,
    templateType: typeof selectedTemplate,
    templateId: selectedTemplate?.id,
    selectedAspectRatio,
    panelCount, 
    imagesLength: images.length,
    hasOnPanelClick: !!onPanelClick,
    hasOnMenuOpen: !!onMenuOpen,
    aspectRatioValue,
    mappingKeys: Object.keys(panelImageMapping || {}),
    borderThickness,
    borderPixels,
    borderColor
  });
  
  // Get grid configuration from the selected template
  const layoutConfig = useMemo(() => {
    console.log("Generating layout config for template:", selectedTemplate);
    return selectedTemplate ? createLayoutConfig(selectedTemplate, panelCount) : null;
  }, [selectedTemplate, panelCount]);

  // If we don't have a template yet, show a placeholder
  if (!selectedTemplate) {
    return (
      <Box 
        sx={{
          width: '100%', 
          paddingBottom: `${(1 / aspectRatioValue) * 100}%`, 
          backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          borderRadius: 1,
          border: `1px dashed ${theme.palette.divider}`
        }}
      >
        <Box 
          sx={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Select a template to preview collage
          </Typography>
        </Box>
      </Box>
    );
  }
  
  // Get grid styles based on layout config
  const getGridConfig = () => {
    // Default fallback grid configuration
    const defaultConfig = {
      gridTemplateColumns: `repeat(${Math.ceil(Math.sqrt(panelCount))}, 1fr)`,
      gridTemplateRows: `repeat(${Math.ceil(panelCount / Math.ceil(Math.sqrt(panelCount)))}, 1fr)`,
      gridTemplateAreas: null
    };

    // If no layout config exists, return the default
    if (!layoutConfig) {
      return defaultConfig;
    }
    
    // Extract the relevant grid properties
    const gridConfig = {
      gridTemplateColumns: layoutConfig.gridTemplateColumns || defaultConfig.gridTemplateColumns,
      gridTemplateRows: layoutConfig.gridTemplateRows || defaultConfig.gridTemplateRows
    };
    
    // Only add gridTemplateAreas if it exists in the layout config
    if (layoutConfig.gridTemplateAreas) {
      gridConfig.gridTemplateAreas = layoutConfig.gridTemplateAreas;
    }
    
    return gridConfig;
  };

  // Helper components for rendering images/add buttons
  const RenderImage = ({ index, panelId }) => {
    // Determine the image index using the mapping if available
    const imageIndex = panelId && panelImageMapping[panelId] !== undefined 
      ? panelImageMapping[panelId] 
      : index;
    
    // Determine the image URL (handle both string URLs and objects with displayUrl)
    const imageData = images[imageIndex];
    let imageUrl = null;
    
    if (typeof imageData === 'string') {
      imageUrl = imageData;
    } else if (imageData && typeof imageData === 'object') {
      // Handle both nested and flat object structures for backward compatibility
      if (imageData.displayUrl) {
        if (typeof imageData.displayUrl === 'string') {
          imageUrl = imageData.displayUrl;
        } else if (imageData.displayUrl && typeof imageData.displayUrl === 'object' && imageData.displayUrl.displayUrl) {
          imageUrl = imageData.displayUrl.displayUrl;
        }
      }
    }
    
    if (!imageUrl) {
      console.error(`No valid image URL found for index ${imageIndex}`, imageData);
      return <RenderAddButton />;
    }
      
    return (
      <>
        <Box
          sx={{
            width: '100%',
            height: '100%',
            backgroundImage: `url(${JSON.stringify(imageUrl)})`, // Ensure URL is correctly formatted
            backgroundSize: 'cover',         // Equivalent to object-fit: cover
            backgroundPosition: 'center center', // Center the image within the box
            backgroundRepeat: 'no-repeat',   // Prevent tiling
          }}
        />
              
        {/* Menu Button (only shown when image exists) */}
        {onMenuOpen && (
          <IconButton 
            size="small" 
            sx={{ 
              position: 'absolute', 
              top: 5, 
              right: 5,
              backgroundColor: theme.palette.mode === 'dark' ? 'rgba(25, 118, 210, 0.7)' : 'rgba(33, 150, 243, 0.7)',
              color: '#ffffff',
              '&:hover': {
                backgroundColor: theme.palette.mode === 'dark' ? 'rgba(25, 118, 210, 0.9)' : 'rgba(33, 150, 243, 0.9)',
              },
            }}
            onClick={(e) => onMenuOpen(e, imageIndex)}
          >
            <MoreVert fontSize="small" />
          </IconButton>
        )}
      </>
    );
  };

  const RenderAddButton = () => (
    <>
      <IconButton
        sx={{
          backgroundColor: theme.palette.mode === 'dark' ? 'rgba(25, 118, 210, 0.7)' : 'rgba(33, 150, 243, 0.7)',
          color: '#ffffff',
          '&:hover': {
            backgroundColor: theme.palette.mode === 'dark' ? 'rgba(25, 118, 210, 0.9)' : 'rgba(33, 150, 243, 0.9)',
          },
        }}
      >
        <Add />
      </IconButton>
    </>
  );

  // Don't render anything if we don't have a template or layout config
  if (!selectedTemplate || !layoutConfig) return null;

  // Calculate the gap size with a custom formula that better differentiates thickness levels
  const getScaledGapSize = (pixels) => {
    if (pixels === 0) return 1; // Default gap when no border
    
    // Custom scale that differentiates between thickness levels
    if (pixels <= 6) return 1; // Thin
    if (pixels <= 16) return 2; // Medium
    if (pixels <= 40) return 4; // Thicc
    if (pixels <= 80) return 6; // Thiccer
    return 8; // XTRA THICC
  };
  
  const gapSize = getScaledGapSize(borderPixels);

  return (
    <Box
      data-testid="dynamic-collage-preview-root"
      sx={{
        position: 'relative',
        width: '100%',
        paddingBottom: `${(1 / aspectRatioValue) * 100}%`, // Set aspect ratio based on selection
        maxWidth: 800,
        margin: '0 auto',
        overflow: 'hidden',
        backgroundColor: borderPixels > 0 ? borderColor : theme.palette.background.default,
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 1,
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'grid',
          gap: gapSize, // Apply border thickness as gap
          padding: borderPixels > 0 ? gapSize : 1, // Adjust padding based on border thickness
          backgroundColor: borderPixels > 0 ? borderColor : 'transparent', // Apply border color as background
          ...getGridConfig()
        }}
      >
        {/* Check if areas-based layout */}
        {layoutConfig.areas && layoutConfig.areas.length > 0 ? (
          // Render using grid areas
          layoutConfig.areas.slice(0, panelCount).map((area, index) => {
            // Get panel ID from template or fallback to a default one
            const panelId = selectedTemplate?.layout?.panels?.[index]?.id || `panel-${index + 1}`;
            // Check if this panel has an associated image
            const hasImage = panelImageMapping[panelId] !== undefined && images[panelImageMapping[panelId]];
            
            return (
              <Box
                key={`panel-area-${index}`}
                sx={{
                  gridArea: area,
                  backgroundColor: hasImage ? (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)') : 'rgba(0,0,0,0.3)',
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: onPanelClick ? 'pointer' : 'default',
                  overflow: 'hidden',
                  position: 'relative',
                  '&:hover': {
                    backgroundColor: hasImage ? theme.palette.action.hover : 'rgba(0,0,0,0.4)',
                  },
                }}
                onClick={() => onPanelClick && onPanelClick(index)}
              >
                {hasImage ? <RenderImage index={index} panelId={panelId} /> : <RenderAddButton />}
              </Box>
            );
          })
        ) : layoutConfig.items && layoutConfig.items.length > 0 ? (
          // Render using items with potential gridArea properties
          layoutConfig.items.slice(0, panelCount).map((item, index) => {
            // Get panel ID from template or fallback to a default one
            const panelId = selectedTemplate?.layout?.panels?.[index]?.id || `panel-${index + 1}`;
            // Check if this panel has an associated image
            const hasImage = panelImageMapping[panelId] !== undefined && images[panelImageMapping[panelId]];
            
            return (
              <Box
                key={`panel-item-${index}`}
                sx={{
                  ...(item.gridArea ? { gridArea: item.gridArea } : {}),
                  backgroundColor: hasImage ? (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)') : 'rgba(0,0,0,0.3)',
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: onPanelClick ? 'pointer' : 'default',
                  overflow: 'hidden',
                  position: 'relative',
                  '&:hover': {
                    backgroundColor: hasImage ? theme.palette.action.hover : 'rgba(0,0,0,0.4)',
                  },
                }}
                onClick={() => onPanelClick && onPanelClick(index)}
              >
                {hasImage ? <RenderImage index={index} panelId={panelId} /> : <RenderAddButton />}
              </Box>
            );
          })
        ) : (
          // Fallback to simple grid
          Array.from({ length: panelCount }).map((_, index) => {
            // Create a panel ID for fallback mode
            const panelId = `panel-${index + 1}`;
            // Check if this panel has an associated image
            const hasImage = panelImageMapping[panelId] !== undefined && images[panelImageMapping[panelId]];
            
            return (
              <Box
                key={`panel-${index}`}
                sx={{
                  backgroundColor: hasImage ? (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)') : 'rgba(0,0,0,0.3)',
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: onPanelClick ? 'pointer' : 'default',
                  overflow: 'hidden',
                  position: 'relative',
                  '&:hover': {
                    backgroundColor: hasImage ? theme.palette.action.hover : 'rgba(0,0,0,0.4)',
                  },
                }}
                onClick={() => onPanelClick && onPanelClick(index)}
              >
                {hasImage ? <RenderImage index={index} panelId={panelId} /> : <RenderAddButton />}
              </Box>
            );
          })
        )}
      </Box>
    </Box>
  );
};

export default DynamicCollagePreview; 