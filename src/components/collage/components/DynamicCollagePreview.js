import React, { useMemo, useRef, useEffect, useState } from 'react';
import { useTheme } from "@mui/material/styles";
import { Box, IconButton, Typography } from "@mui/material";
import { MoreVert, Add } from "@mui/icons-material";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

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
 * Convert border thickness from string or named value to percentage of component width
 * This ensures consistent relative border thickness regardless of final image size
 */
const getBorderPixelSize = (borderThickness, componentWidth = 400) => {
  // If it's already a number, treat it as a percentage
  if (typeof borderThickness === 'number') {
    return (borderThickness / 100) * componentWidth;
  }
  
  // Border thickness as percentage of component width
  // These percentages are calibrated for good visual appearance
  const thicknessPercentageMap = {
    'none': 0,           // 0%
    'thin': 0.5,         // 0.5% of width
    'medium': 1.5,       // 1.5% of width  
    'thicc': 4,          // 4% of width
    'thiccer': 7,        // 7% of width
    'xtra thicc': 12,    // 12% of width
    'XTRA THICC': 12,    // 12% of width
    'ungodly chonkd': 20,    // 20% of width
    'ungodly chonk\'d': 20,  // 20% of width (handle apostrophe)
    'UNGODLY CHONKD': 20,    // 20% of width
    'UNGODLY CHONK\'D': 20   // 20% of width (handle apostrophe)
  };
  
  // Normalize and look up in map
  const normalizedKey = String(borderThickness).toLowerCase();
  const percentage = thicknessPercentageMap[normalizedKey] || 2; // Default to medium if not found
  
  // Return the pixel value as percentage of component width
  return Math.round((percentage / 100) * componentWidth);
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
  panelTransforms = {}, // Receive transform state { panelId: { scale, positionX, positionY } }
  updatePanelTransform, // Function to update transform state
}) => {
  const theme = useTheme();
  
  // Ref to measure the actual component width
  const containerRef = useRef(null);
  const [componentWidth, setComponentWidth] = useState(400); // Default fallback width
  
  // State to track which panels have transform interactions enabled
  const [enabledTransforms, setEnabledTransforms] = useState(new Set());
  
  // Refs to track timeout for auto-disable
  const timeoutRefs = useRef(new Map());
  
  // Function to enable transforms for a specific panel
  const enableTransformForPanel = (panelId) => {
    setEnabledTransforms(prev => new Set(prev).add(panelId));
    
    // Clear any existing timeout for this panel
    if (timeoutRefs.current.has(panelId)) {
      clearTimeout(timeoutRefs.current.get(panelId));
    }
    
    // Set a new timeout to auto-disable after 30 seconds of inactivity
    const timeoutId = setTimeout(() => {
      disableTransformForPanel(panelId);
    }, 30000); // 30 seconds
    
    timeoutRefs.current.set(panelId, timeoutId);
  };

  // Function to disable transforms for a specific panel
  const disableTransformForPanel = (panelId) => {
    setEnabledTransforms(prev => {
      const newSet = new Set(prev);
      newSet.delete(panelId);
      return newSet;
    });
    
    // Clear the timeout for this panel
    if (timeoutRefs.current.has(panelId)) {
      clearTimeout(timeoutRefs.current.get(panelId));
      timeoutRefs.current.delete(panelId);
    }
  };

  // Function to disable all transforms (useful for cleanup)
  const disableAllTransforms = () => {
    setEnabledTransforms(new Set());
    
    // Clear all timeouts
    timeoutRefs.current.forEach(timeoutId => clearTimeout(timeoutId));
    timeoutRefs.current.clear();
  };
  
  // Function to reset timeout for a panel (called during user interaction)
  const resetTimeoutForPanel = (panelId) => {
    if (enabledTransforms.has(panelId)) {
      // Clear existing timeout
      if (timeoutRefs.current.has(panelId)) {
        clearTimeout(timeoutRefs.current.get(panelId));
      }
      
      // Set new timeout
      const timeoutId = setTimeout(() => {
        disableTransformForPanel(panelId);
      }, 30000); // 30 seconds
      
      timeoutRefs.current.set(panelId, timeoutId);
    }
  };

  // Reset enabled transforms when template or panel count changes
  useEffect(() => {
    setEnabledTransforms(new Set());
  }, [selectedTemplate?.id, panelCount]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach(timeoutId => clearTimeout(timeoutId));
      timeoutRefs.current.clear();
    };
  }, []);
  
  // Effect to measure component width for responsive border thickness
  useEffect(() => {
    const measureWidth = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setComponentWidth(rect.width || 400);
      }
    };
    
    // Initial measurement
    measureWidth();
    
    // Listen for resize events
    window.addEventListener('resize', measureWidth);
    
    // Use ResizeObserver if available for more accurate tracking
    let resizeObserver;
    if (window.ResizeObserver && containerRef.current) {
      resizeObserver = new ResizeObserver(measureWidth);
      resizeObserver.observe(containerRef.current);
    }
    
    return () => {
      window.removeEventListener('resize', measureWidth);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, []);
  
  // Effect to handle clicking outside to disable transforms
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Only handle if we have enabled transforms
      if (enabledTransforms.size === 0) return;

      // Check if the click was inside any transform-enabled panel
      const clickedInsideEditingPanel = Array.from(enabledTransforms).some(panelId => {
        const panelElement = document.querySelector(`[data-panel-id="${panelId}"]`);
        return panelElement && panelElement.contains(event.target);
      });

      // If clicked outside all editing panels, disable all transforms
      if (!clickedInsideEditingPanel) {
        disableAllTransforms();
      }
    };

    // Add event listener to document
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [enabledTransforms]);
  
  // Convert borderThickness to numeric pixel value based on actual component width
  const borderPixels = getBorderPixelSize(borderThickness, componentWidth);
  
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
    const [imageNaturalSize, setImageNaturalSize] = React.useState(null);
    const [panelSize, setPanelSize] = React.useState(null);
    const panelRef = React.useRef(null);
    
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

    // Calculate optimal initial scale to fit image in panel (like object-fit: cover)
    const calculateInitialScale = () => {
      if (!imageNaturalSize || !panelSize) return 1;
      
      const imageAspectRatio = imageNaturalSize.width / imageNaturalSize.height;
      const panelAspectRatio = panelSize.width / panelSize.height;
      
      // Calculate scale to cover the panel (like object-fit: cover)
      if (imageAspectRatio > panelAspectRatio) {
        // Image is wider than panel, scale to fit height
        return panelSize.height / imageNaturalSize.height;
      }
      // Image is taller than panel, scale to fit width  
      return panelSize.width / imageNaturalSize.width;
    };

    // Calculate the perfect center position for the scaled image
    const calculateCenterPosition = (scale) => {
      if (!imageNaturalSize || !panelSize || !scale) return { x: 0, y: 0 };

      // Calculate the scaled image dimensions
      const scaledImageWidth = imageNaturalSize.width * scale;
      const scaledImageHeight = imageNaturalSize.height * scale;

      // Calculate the offset needed to center the scaled image in the panel
      const offsetX = (panelSize.width - scaledImageWidth) / 2;
      const offsetY = (panelSize.height - scaledImageHeight) / 2;

      return { x: offsetX, y: offsetY };
    };

    // Get initial transform state for this panel, with calculated scale fallback
    const savedTransform = panelTransforms[panelId];
    const hasCustomTransform = savedTransform && (savedTransform.scale !== 1 || savedTransform.positionX !== 0 || savedTransform.positionY !== 0);
    const calculatedScale = calculateInitialScale();
    const centerPosition = calculateCenterPosition(calculatedScale);
    
    // Only use calculated scale if we have both image and panel dimensions
    const shouldUseCalculatedScale = imageNaturalSize && panelSize && !hasCustomTransform;
    
    const initialTransform = hasCustomTransform 
      ? savedTransform 
      : { 
          scale: shouldUseCalculatedScale ? calculatedScale : 1, 
          positionX: shouldUseCalculatedScale ? centerPosition.x : 0, 
          positionY: shouldUseCalculatedScale ? centerPosition.y : 0 
        };

    // Effect to get panel dimensions
    React.useEffect(() => {
      if (panelRef.current) {
        const updatePanelSize = () => {
          const rect = panelRef.current.getBoundingClientRect();
          setPanelSize({ width: rect.width, height: rect.height });
        };
        
        updatePanelSize();
        window.addEventListener('resize', updatePanelSize);
        return () => window.removeEventListener('resize', updatePanelSize);
      }
      return undefined;
    }, []);

    // Effect to apply calculated scale when sizing data becomes available
    React.useEffect(() => {
      if (shouldUseCalculatedScale && calculatedScale && calculatedScale !== 1 && updatePanelTransform) {
        // Only update if we don't already have a custom transform saved
        const currentTransform = panelTransforms[panelId];
        if (!currentTransform || (currentTransform.scale === 1 && currentTransform.positionX === 0 && currentTransform.positionY === 0)) {
          updatePanelTransform(panelId, {
            scale: calculatedScale,
            positionX: centerPosition.x,
            positionY: centerPosition.y,
          });
        }
      }
    }, [shouldUseCalculatedScale, calculatedScale, centerPosition.x, centerPosition.y, panelId, updatePanelTransform, panelTransforms]);

    // Check if transforms are enabled for this panel
    const isTransformEnabled = enabledTransforms.has(panelId);
    
    // Handle click/tap to enable transforms
    const handlePanelTap = (e) => {
      if (!isTransformEnabled) {
        // Don't prevent default or stop propagation as it might interfere
        console.log(`Enabling transforms for panel: ${panelId}`);
        enableTransformForPanel(panelId);
      }
    };

    // Handle case where no valid image URL is found
    if (!imageUrl) {
      console.error(`No valid image URL found for index ${imageIndex}`, imageData);
      return <RenderAddButton index={index} panelId={panelId} />;
    }
    
    // Force re-render when transform state changes by including it in the key
    const transformKey = `${panelId}-${imageUrl}-${imageNaturalSize?.width || 0}-${imageNaturalSize?.height || 0}-${panelSize?.width || 0}-${panelSize?.height || 0}-${isTransformEnabled}`;
    
    return (
      <Box 
        ref={panelRef} 
        className={!isTransformEnabled ? 'hover-parent' : ''}
        data-panel-id={panelId}
        sx={{ width: '100%', height: '100%', position: 'relative' }}
      >
        <TransformWrapper
          key={transformKey} // Reset when sizing data OR transform state changes
          initialScale={initialTransform.scale}
          initialPositionX={initialTransform.positionX}
          initialPositionY={initialTransform.positionY}
          centerZoomedOut={false} // Don't auto-center when zooming out
          onZoomStop={(ref) => {
            if (updatePanelTransform) {
              updatePanelTransform(panelId, { 
                scale: ref.state.scale,
                positionX: ref.state.positionX,
                positionY: ref.state.positionY,
              });
            }
            // Reset timeout on interaction
            resetTimeoutForPanel(panelId);
          }}
          onPanningStop={(ref) => {
            if (updatePanelTransform) {
              updatePanelTransform(panelId, { 
                scale: ref.state.scale,
                positionX: ref.state.positionX,
                positionY: ref.state.positionY,
              });
            }
            // Reset timeout on interaction
            resetTimeoutForPanel(panelId);
          }}
          onPanning={() => {
            // Reset timeout during panning
            resetTimeoutForPanel(panelId);
          }}
          onZoom={() => {
            // Reset timeout during zooming
            resetTimeoutForPanel(panelId);
          }}
          minScale={0.1} // Allow zooming out much more to see the full image
          maxScale={5}  // Allow zooming in quite a bit
          limitToBounds={false} // Don't limit to bounds so users can see the full image
          doubleClick={{ disabled: true }} // Disable double-click zoom
          wheel={{ 
            disabled: !isTransformEnabled, // Only enable wheel zoom after tap
            step: 0.2 
          }}
          pinch={{ 
            disabled: !isTransformEnabled, // Only enable pinch zoom after tap
            step: 5 
          }}
          panning={{ 
            disabled: !isTransformEnabled // Only enable panning after tap
          }}
          wrapperStyle={{ width: '100%', height: '100%' }}
          contentStyle={{ width: '100%', height: '100%' }}
        >
          <TransformComponent
             wrapperStyle={{ width: '100%', height: '100%' }}
             contentStyle={{ width: '100%', height: '100%' }}
          >
            <Box
              component="img"
              src={imageUrl}
              alt={`Collage panel ${index + 1}`}
              onLoad={(e) => {
                // Get natural dimensions when image loads
                setImageNaturalSize({
                  width: e.target.naturalWidth,
                  height: e.target.naturalHeight
                });
              }}
              onClick={handlePanelTap}
              onTouchEnd={handlePanelTap} // Use touchEnd instead of touchStart for better reliability
              sx={{
                display: 'block',
                width: imageNaturalSize ? `${imageNaturalSize.width}px` : 'auto',
                height: imageNaturalSize ? `${imageNaturalSize.height}px` : 'auto',
                maxWidth: 'none',
                maxHeight: 'none',
                objectFit: 'none', // Show full image without cropping
                cursor: isTransformEnabled ? 'grab' : 'pointer',
                transformOrigin: 'center center',
                // Add visual indication when transform is not enabled
                opacity: isTransformEnabled ? 1 : 0.9,
                transition: 'opacity 0.2s ease',
              }}
            />
          </TransformComponent>
        </TransformWrapper>
        
        {/* Overlay hint when transforms are not enabled */}
        {!isTransformEnabled && (
          <Box
            onClick={handlePanelTap}
            onTouchEnd={handlePanelTap}
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              bgcolor: 'rgba(0, 0, 0, 0.7)',
              color: 'white',
              px: 2,
              py: 1,
              borderRadius: 1,
              fontSize: '0.8rem',
              fontWeight: 500,
              textAlign: 'center',
              pointerEvents: 'auto', // Enable pointer events so it can be clicked
              opacity: 0.8, // Make it always visible when not enabled
              transition: 'opacity 0.3s ease',
              zIndex: 5,
              cursor: 'pointer',
              '&:hover': {
                opacity: 1,
                bgcolor: 'rgba(0, 0, 0, 0.8)',
              },
            }}
          >
            Tap to edit
          </Box>
        )}

        {/* Done button when transforms are enabled */}
        {isTransformEnabled && (
          <Box
            onClick={() => disableTransformForPanel(panelId)}
            onTouchEnd={() => disableTransformForPanel(panelId)}
            sx={{
              position: 'absolute',
              top: 5,
              left: 5,
              bgcolor: 'rgba(76, 175, 80, 0.9)', // Green color
              color: 'white',
              px: 1.5,
              py: 0.5,
              borderRadius: 1,
              fontSize: '0.75rem',
              fontWeight: 600,
              textAlign: 'center',
              pointerEvents: 'auto',
              zIndex: 10,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              transition: 'all 0.2s ease',
              '&:hover': {
                bgcolor: 'rgba(76, 175, 80, 1)',
                transform: 'scale(1.05)',
              },
            }}
          >
            ✓ Done
          </Box>
        )}

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
              zIndex: 10,
            }}
            onClick={(e) => onMenuOpen(e, imageIndex)}
          >
            <MoreVert fontSize="small" />
          </IconButton>
        )}
      </Box>
    );
  };

  const RenderAddButton = ({ index, panelId }) => (
    <IconButton
      onClick={(e) => {
        e.stopPropagation(); // Prevent event bubbling to parent Box
        if (onPanelClick) {
          onPanelClick(index, panelId);
        }
      }}
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
  );

  // Don't render anything if we don't have a template or layout config
  if (!selectedTemplate || !layoutConfig) return null;

  // Use the actual pixel values directly instead of scaling them
  const gapSize = borderPixels; // Use borderPixels directly (0, 1, 3, 6, 12, 24)

  return (
    <Box
      ref={containerRef}
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
        // Hide controls when in export mode
        '&.export-mode': {
          '& .MuiIconButton-root': {
            display: 'none !important',
          },
        },
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
          gap: `${gapSize}px`, // Apply border thickness as gap with explicit px unit
          padding: borderPixels > 0 ? `${gapSize}px` : 0, // Use px unit for padding too
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
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: !hasImage && onPanelClick ? 'pointer' : 'default', // Keep cursor logic based on !hasImage
                  overflow: 'hidden',
                  position: 'relative',
                  '&:hover': {
                    backgroundColor: hasImage ? theme.palette.action.hover : 'rgba(0,0,0,0.4)',
                  },
                }}
                onClick={() => !hasImage && onPanelClick && onPanelClick(index, panelId)} // Pass BOTH index and panelId
              >
                {hasImage ? <RenderImage index={index} panelId={panelId} /> : <RenderAddButton index={index} panelId={panelId} />}
              </Box>
            );
          })
        ) : (
          layoutConfig.items ? (
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
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: !hasImage && onPanelClick ? 'pointer' : 'default',
                    overflow: 'hidden',
                    position: 'relative',
                    '&:hover': {
                      backgroundColor: hasImage ? theme.palette.action.hover : 'rgba(0,0,0,0.4)',
                    },
                  }}
                  onClick={() => !hasImage && onPanelClick && onPanelClick(index, panelId)} // Pass BOTH index and panelId
                >
                  {hasImage ? <RenderImage index={index} panelId={panelId} /> : <RenderAddButton index={index} panelId={panelId} />}
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
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: !hasImage && onPanelClick ? 'pointer' : 'default',
                    overflow: 'hidden',
                    position: 'relative',
                    '&:hover': {
                      backgroundColor: hasImage ? theme.palette.action.hover : 'rgba(0,0,0,0.4)',
                    },
                  }}
                  onClick={() => !hasImage && onPanelClick && onPanelClick(index, panelId)} // Pass BOTH index and panelId
                >
                  {hasImage ? <RenderImage index={index} panelId={panelId} /> : <RenderAddButton index={index} panelId={panelId} />}
                </Box>
              );
            })
          )
        )}
      </Box>
    </Box>
  );
};

export default DynamicCollagePreview; 