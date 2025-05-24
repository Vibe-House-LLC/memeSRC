import React, { useMemo, useRef, useEffect, useState } from 'react';
import { useTheme } from "@mui/material/styles";
import { Box, IconButton, Typography, useMediaQuery } from "@mui/material";
import { OpenWith, Check, Add } from "@mui/icons-material";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

import { layoutDefinitions } from "../config/layouts";

/**
 * SNAP-TO-FILL & SNAP-TO-CENTER SYSTEM
 * 
 * This system provides intelligent image positioning with two main behaviors:
 * 
 * 1. SNAP TO CENTER: When repositioning, if the image gets close to being centered
 *    horizontally or vertically (within 20px), it snaps to perfect center.
 *    This works like magnetic guides in professional design tools.
 * 
 * 2. SNAP TO FILL: Automatically eliminates blank spaces by:
 *    - Scaling up images that are too small to cover the panel
 *    - Repositioning images to remove gaps at edges
 *    - Maintaining proper coverage (like object-fit: cover)
 * 
 * Priority: Center snapping is attempted first (when safe), then falls back to fill logic.
 * Both work together to create a smooth, professional repositioning experience.
 */

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
 * Calculate snap-to-center positions if the current position is close enough
 * Returns center positions if within threshold, otherwise returns current positions
 */
const calculateSnapToCenterPosition = (imageNaturalSize, panelSize, scale, currentPositionX, currentPositionY, threshold = 2) => {
  if (!imageNaturalSize || !panelSize || !scale) {
    return { positionX: currentPositionX, positionY: currentPositionY, snappedToCenter: false };
  }

  // Calculate the scaled image dimensions
  const scaledImageWidth = imageNaturalSize.width * scale;
  const scaledImageHeight = imageNaturalSize.height * scale;

  // Calculate what the centered positions would be
  const centeredX = (panelSize.width - scaledImageWidth) / 2;
  const centeredY = (panelSize.height - scaledImageHeight) / 2;

  // Check if current position is close enough to center to snap
  const closeToHorizontalCenter = Math.abs(currentPositionX - centeredX) <= threshold;
  const closeToVerticalCenter = Math.abs(currentPositionY - centeredY) <= threshold;

  // Determine final positions
  const finalX = closeToHorizontalCenter ? centeredX : currentPositionX;
  const finalY = closeToVerticalCenter ? centeredY : currentPositionY;
  
  const snappedToCenter = closeToHorizontalCenter || closeToVerticalCenter;

  // Debug logging for development
  if (process.env.NODE_ENV === 'development' && snappedToCenter) {
    console.log('[Snap to Center]', {
      currentPos: { x: currentPositionX, y: currentPositionY },
      centerPos: { x: centeredX, y: centeredY },
      finalPos: { x: finalX, y: finalY },
      snapped: { horizontal: closeToHorizontalCenter, vertical: closeToVerticalCenter },
      threshold
    });
  }

  return { 
    positionX: finalX, 
    positionY: finalY, 
    snappedToCenter,
    snappedHorizontally: closeToHorizontalCenter,
    snappedVertically: closeToVerticalCenter
  };
};

/**
 * Calculate the optimal transform (scale and position) to minimize blank space in the panel
 * This function ensures the scaled image covers as much of the panel as possible,
 * adjusting both scale and position as needed, with preference for center snapping when possible.
 */
const calculateSnapToFillTransform = (imageNaturalSize, panelSize, currentScale, currentPositionX, currentPositionY) => {
  if (!imageNaturalSize || !panelSize || !currentScale) {
    return { scale: currentScale, positionX: currentPositionX, positionY: currentPositionY };
  }

  // Calculate minimum scale needed to cover the panel (like object-fit: cover)
  const imageAspectRatio = imageNaturalSize.width / imageNaturalSize.height;
  const panelAspectRatio = panelSize.width / panelSize.height;
  
  let minScale;
  if (imageAspectRatio > panelAspectRatio) {
    // Image is wider than panel, scale to fit height
    minScale = panelSize.height / imageNaturalSize.height;
  } else {
    // Image is taller than panel, scale to fit width
    minScale = panelSize.width / imageNaturalSize.width;
  }

  // Determine optimal scale - use current scale if it's sufficient, otherwise use minimum
  const optimalScale = Math.max(currentScale, minScale);
  
  // Calculate the scaled image dimensions with optimal scale
  const scaledImageWidth = imageNaturalSize.width * optimalScale;
  const scaledImageHeight = imageNaturalSize.height * optimalScale;

  // If scale changed, we need to adjust position proportionally to maintain roughly the same view
  let adjustedX = currentPositionX;
  let adjustedY = currentPositionY;
  if (optimalScale !== currentScale) {
    const scaleRatio = optimalScale / currentScale;
    adjustedX = currentPositionX * scaleRatio;
    adjustedY = currentPositionY * scaleRatio;
  }

  // Try center snapping first (only if image is larger than panel)
  if (scaledImageWidth >= panelSize.width && scaledImageHeight >= panelSize.height) {
    const centerSnap = calculateSnapToCenterPosition(
      imageNaturalSize, 
      panelSize, 
      optimalScale, 
      adjustedX, 
      adjustedY
    );
    
    if (centerSnap.snappedToCenter) {
      // Check if center snapping would create gaps
      const wouldCreateGaps = 
        (scaledImageWidth < panelSize.width) || 
        (scaledImageHeight < panelSize.height) ||
        (centerSnap.positionX > 0) || 
        (centerSnap.positionY > 0) ||
        (centerSnap.positionX + scaledImageWidth < panelSize.width) ||
        (centerSnap.positionY + scaledImageHeight < panelSize.height);
      
      if (!wouldCreateGaps) {
        // Center snapping is safe, use it
        if (process.env.NODE_ENV === 'development') {
          console.log('[Snap to Fill Transform] Using center snap');
        }
        return { 
          scale: optimalScale, 
          positionX: centerSnap.positionX, 
          positionY: centerSnap.positionY 
        };
      }
    }
  }

  // Fall back to fill logic (existing logic)
  const maxOffsetX = scaledImageWidth - panelSize.width;
  const maxOffsetY = scaledImageHeight - panelSize.height;

  // Calculate the optimal position to fill the panel
  let optimalX = adjustedX;
  let optimalY = adjustedY;

  // For X axis
  if (maxOffsetX <= 0) {
    // Image is smaller than or equal to panel width - center it
    optimalX = (panelSize.width - scaledImageWidth) / 2;
  } else {
    // Image is larger than panel - clamp position to avoid blank space
    const minX = -maxOffsetX; // Most negative position (image right edge at panel right)
    const maxX = 0;           // Most positive position (image left edge at panel left)
    optimalX = Math.max(minX, Math.min(maxX, optimalX));
  }

  // For Y axis
  if (maxOffsetY <= 0) {
    // Image is smaller than or equal to panel height - center it
    optimalY = (panelSize.height - scaledImageHeight) / 2;
  } else {
    // Image is larger than panel - clamp position to avoid blank space
    const minY = -maxOffsetY; // Most negative position (image bottom edge at panel bottom)
    const maxY = 0;           // Most positive position (image top edge at panel top)
    optimalY = Math.max(minY, Math.min(maxY, optimalY));
  }

  // Debug logging for development
  if (process.env.NODE_ENV === 'development') {
    const scaleChanged = Math.abs(optimalScale - currentScale) > 0.01;
    const deltaX = Math.abs(optimalX - currentPositionX);
    const deltaY = Math.abs(optimalY - currentPositionY);
    if (scaleChanged || deltaX > 0.1 || deltaY > 0.1) {
      console.log('[Snap to Fill Transform] Using fill logic', {
        imageSize: { width: scaledImageWidth, height: scaledImageHeight },
        panelSize,
        currentTransform: { scale: currentScale, x: currentPositionX, y: currentPositionY },
        optimalTransform: { scale: optimalScale, x: optimalX, y: optimalY },
        changes: { 
          scaleChanged, 
          positionDelta: { x: deltaX, y: deltaY },
          minScaleNeeded: minScale
        }
      });
    }
  }

  return { scale: optimalScale, positionX: optimalX, positionY: optimalY };
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
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
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
    
    // Add ref to access TransformWrapper's imperative API
    const transformRef = React.useRef(null);
    
    // State for real-time snap guides
    const [snapGuides, setSnapGuides] = React.useState({
      showHorizontalCenter: false,
      showVerticalCenter: false,
      showFillGuides: false
    });
    
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
    
    // Function to handle real-time snap feedback during panning
    const handleRealTimeSnap = React.useCallback((ref) => {
      if (!imageNaturalSize || !panelSize || !isTransformEnabled) return;
      
      const currentScale = ref.state.scale;
      const currentX = ref.state.positionX;
      const currentY = ref.state.positionY;
      
      // Calculate the scaled image dimensions
      const scaledImageWidth = imageNaturalSize.width * currentScale;
      const scaledImageHeight = imageNaturalSize.height * currentScale;
      
      // Calculate snap positions for center guides
      const centerSnap = calculateSnapToCenterPosition(
        imageNaturalSize, 
        panelSize, 
        currentScale, 
        currentX, 
        currentY,
        3 // Extremely small threshold - need to be almost perfect
      );
      
      // Enforce fill boundaries - prevent gaps from forming
      let constrainedX = currentX;
      let constrainedY = currentY;
      let boundaryEnforced = false;
      
      // Calculate maximum allowed offsets
      const maxOffsetX = scaledImageWidth - panelSize.width;
      const maxOffsetY = scaledImageHeight - panelSize.height;
      
      // Constrain X position to prevent gaps
      if (maxOffsetX <= 0) {
        // Image is smaller than panel width - center it
        const centeredX = (panelSize.width - scaledImageWidth) / 2;
        if (Math.abs(constrainedX - centeredX) > 1) {
          constrainedX = centeredX;
          boundaryEnforced = true;
        }
      } else {
        // Image is larger than panel - clamp position to avoid blank space
        const minX = -maxOffsetX; // Most negative position (image right edge at panel right)
        const maxX = 0;           // Most positive position (image left edge at panel left)
        const clampedX = Math.max(minX, Math.min(maxX, currentX));
        if (Math.abs(constrainedX - clampedX) > 1) {
          constrainedX = clampedX;
          boundaryEnforced = true;
        }
      }
      
      // Constrain Y position to prevent gaps
      if (maxOffsetY <= 0) {
        // Image is smaller than panel height - center it
        const centeredY = (panelSize.height - scaledImageHeight) / 2;
        if (Math.abs(constrainedY - centeredY) > 1) {
          constrainedY = centeredY;
          boundaryEnforced = true;
        }
      } else {
        // Image is larger than panel - clamp position to avoid blank space
        const minY = -maxOffsetY; // Most negative position (image bottom edge at panel bottom)
        const maxY = 0;           // Most positive position (image top edge at panel top)
        const clampedY = Math.max(minY, Math.min(maxY, currentY));
        if (Math.abs(constrainedY - clampedY) > 1) {
          constrainedY = clampedY;
          boundaryEnforced = true;
        }
      }
      
      // Calculate fill snap for guides (using constrained positions)
      const fillSnap = calculateSnapToFillTransform(
        imageNaturalSize,
        panelSize, 
        currentScale,
        constrainedX,
        constrainedY
      );
      
      // Update snap guides visibility
      setSnapGuides({
        showHorizontalCenter: centerSnap.snappedHorizontally,
        showVerticalCenter: centerSnap.snappedVertically,
        showFillGuides: Math.abs(fillSnap.positionX - constrainedX) > 15 || Math.abs(fillSnap.positionY - constrainedY) > 15
      });
      
      // Priority 1: Apply center snap if close enough and it doesn't create gaps
      if (centerSnap.snappedToCenter && transformRef.current) {
        // Check if center snapping would create gaps
        const wouldCreateGaps = 
          (scaledImageWidth < panelSize.width) || 
          (scaledImageHeight < panelSize.height) ||
          (centerSnap.positionX > 0) || 
          (centerSnap.positionY > 0) ||
          (centerSnap.positionX + scaledImageWidth < panelSize.width) ||
          (centerSnap.positionY + scaledImageHeight < panelSize.height);
        
        if (!wouldCreateGaps) {
          // Center snapping is safe, use it
          transformRef.current.setTransform(
            centerSnap.positionX,
            centerSnap.positionY,
            currentScale,
            0 // No animation during dragging for immediate feedback
          );
          resetTimeoutForPanel(panelId);
          return;
        }
      }
      
      // Priority 2: Enforce fill boundaries (prevent gaps)
      if (boundaryEnforced && transformRef.current) {
        transformRef.current.setTransform(
          constrainedX,
          constrainedY,
          currentScale,
          0 // No animation during dragging for immediate feedback
        );
      }
      
      resetTimeoutForPanel(panelId);
    }, [imageNaturalSize, panelSize, isTransformEnabled, panelId]);
    
    // Effect to use imperative API to restore transforms when enabling edit mode
    React.useEffect(() => {
      if (isTransformEnabled && transformRef.current && savedTransform) {
        // Use the imperative API to restore the exact transform state
        const { scale, positionX, positionY } = savedTransform;
        transformRef.current.setTransform(positionX, positionY, scale, 0);
      }
    }, [isTransformEnabled, savedTransform]);
    
    // Function to clear snap guides
    const clearSnapGuides = React.useCallback(() => {
      setSnapGuides({
        showHorizontalCenter: false,
        showVerticalCenter: false,
        showFillGuides: false
      });
    }, []);
    
    // Handle click on reposition button to toggle edit mode
    const handleRepositionClick = (e) => {
      e.stopPropagation();
      if (isTransformEnabled) {
        clearSnapGuides(); // Clear guides when exiting edit mode
        disableTransformForPanel(panelId);
      } else {
        enableTransformForPanel(panelId);
      }
    };

    // Handle click on overlay - replace when not in edit mode
    const handleOverlayClick = (e) => {
      e.stopPropagation();
      if (onPanelClick) {
        onPanelClick(index, panelId);
      }
    };

    // Handle case where no valid image URL is found
    if (!imageUrl) {
      console.error(`No valid image URL found for index ${imageIndex}`, imageData);
      return <RenderAddButton index={index} panelId={panelId} />;
    }
    
    return (
      <Box 
        ref={panelRef} 
        className={!isTransformEnabled ? 'hover-parent' : ''}
        data-panel-id={panelId}
        sx={{ width: '100%', height: '100%', position: 'relative' }}
      >
        <TransformWrapper
          ref={transformRef}
          initialScale={initialTransform.scale}
          initialPositionX={initialTransform.positionX}
          initialPositionY={initialTransform.positionY}
          centerZoomedOut={false}
          onZoomStop={(ref) => {
            clearSnapGuides(); // Clear guides when zoom stops
            if (updatePanelTransform) {
              // Calculate optimal position to fill gaps after zooming
              const snapPosition = calculateSnapToFillTransform(
                imageNaturalSize,
                panelSize,
                ref.state.scale,
                ref.state.positionX,
                ref.state.positionY
              );
              
              const newTransform = {
                scale: snapPosition.scale,
                positionX: snapPosition.positionX,
                positionY: snapPosition.positionY,
              };
              
              // Only apply snap if position or scale actually changed (avoid unnecessary updates)
              const scaleChanged = Math.abs(snapPosition.scale - ref.state.scale) > 0.01;
              const positionChanged = 
                Math.abs(snapPosition.positionX - ref.state.positionX) > 2 ||
                Math.abs(snapPosition.positionY - ref.state.positionY) > 2;
              
              if ((scaleChanged || positionChanged) && transformRef.current) {
                // Smoothly animate to the snap position
                transformRef.current.setTransform(
                  snapPosition.positionX,
                  snapPosition.positionY,
                  snapPosition.scale,
                  400 // Longer animation duration for smoother feel
                );
              }
              
              updatePanelTransform(panelId, newTransform);
            }
            resetTimeoutForPanel(panelId);
          }}
          onPanningStop={(ref) => {
            clearSnapGuides(); // Clear guides when panning stops
            if (updatePanelTransform) {
              // Calculate optimal position to fill gaps
              const snapPosition = calculateSnapToFillTransform(
                imageNaturalSize,
                panelSize,
                ref.state.scale,
                ref.state.positionX,
                ref.state.positionY
              );
              
              const newTransform = {
                scale: snapPosition.scale,
                positionX: snapPosition.positionX,
                positionY: snapPosition.positionY,
              };
              
              // Only apply snap if position or scale actually changed (avoid unnecessary updates)
              const scaleChanged = Math.abs(snapPosition.scale - ref.state.scale) > 0.01;
              const positionChanged = 
                Math.abs(snapPosition.positionX - ref.state.positionX) > 2 ||
                Math.abs(snapPosition.positionY - ref.state.positionY) > 2;
              
              if ((scaleChanged || positionChanged) && transformRef.current) {
                // Smoothly animate to the snap position
                transformRef.current.setTransform(
                  snapPosition.positionX,
                  snapPosition.positionY,
                  snapPosition.scale,
                  400 // Longer animation duration for smoother feel
                );
              }
              
              updatePanelTransform(panelId, newTransform);
            }
            resetTimeoutForPanel(panelId);
          }}
          onPanning={handleRealTimeSnap}
          onZoom={() => {
            resetTimeoutForPanel(panelId);
          }}
          minScale={0.1}
          maxScale={5}
          limitToBounds={false}
          doubleClick={{ disabled: true }}
          // Always enable interactions - we'll use overlay to block when needed
          wheel={{ 
            disabled: false,
            step: 0.2 
          }}
          pinch={{ 
            disabled: false,
            step: 5 
          }}
          panning={{ 
            disabled: false
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
                setImageNaturalSize({
                  width: e.target.naturalWidth,
                  height: e.target.naturalHeight
                });
              }}
              sx={{
                display: 'block',
                width: imageNaturalSize ? `${imageNaturalSize.width}px` : 'auto',
                height: imageNaturalSize ? `${imageNaturalSize.height}px` : 'auto',
                maxWidth: 'none',
                maxHeight: 'none',
                objectFit: 'none',
                cursor: isTransformEnabled ? 'grab' : 'pointer',
                transformOrigin: 'center center',
                transition: 'opacity 0.2s ease',
              }}
            />
          </TransformComponent>
        </TransformWrapper>
        
        {/* Transparent overlay to capture replacement clicks when not in edit mode */}
        {!isTransformEnabled && (
          <Box
            onClick={handleOverlayClick}
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 5,
              cursor: 'pointer',
              backgroundColor: 'transparent',
              // Add subtle hover effect
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.1)',
              },
            }}
          />
        )}
        
        {/* Snap Guides - only show when in edit mode and guides are active */}
        {isTransformEnabled && (
          <>
            {/* Horizontal center guide */}
            {snapGuides.showHorizontalCenter && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: '50%',
                  width: '2px',
                  height: '100%',
                  backgroundColor: '#FF6B35',
                  opacity: 0.7, // More subtle opacity
                  transform: 'translateX(-50%)',
                  zIndex: 8,
                  boxShadow: '0 0 2px rgba(255, 107, 53, 0.4)', // Reduced shadow
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    width: '6px', // Smaller center dot
                    height: '6px',
                    backgroundColor: '#FF6B35',
                    borderRadius: '50%',
                    transform: 'translate(-50%, -50%)',
                    boxShadow: '0 0 4px rgba(255, 107, 53, 0.6)', // Reduced shadow
                  }
                }}
              />
            )}
            
            {/* Vertical center guide */}
            {snapGuides.showVerticalCenter && (
              <Box
                sx={{
                  position: 'absolute',
                  top: '50%',
                  left: 0,
                  width: '100%',
                  height: '2px',
                  backgroundColor: '#FF6B35',
                  opacity: 0.7, // More subtle opacity
                  transform: 'translateY(-50%)',
                  zIndex: 8,
                  boxShadow: '0 0 2px rgba(255, 107, 53, 0.4)', // Reduced shadow
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    width: '6px', // Smaller center dot
                    height: '6px',
                    backgroundColor: '#FF6B35',
                    borderRadius: '50%',
                    transform: 'translate(-50%, -50%)',
                    boxShadow: '0 0 4px rgba(255, 107, 53, 0.6)', // Reduced shadow
                  }
                }}
              />
            )}
            
            {/* Fill guides indicator */}
            {snapGuides.showFillGuides && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 8,
                  left: 8,
                  padding: '3px 6px', // Smaller padding
                  backgroundColor: 'rgba(33, 150, 243, 0.7)', // More subtle background
                  color: 'white',
                  fontSize: '11px', // Smaller font
                  fontWeight: 500, // Less bold
                  borderRadius: '3px', // Smaller border radius
                  zIndex: 9,
                  boxShadow: '0 1px 4px rgba(0, 0, 0, 0.2)', // Reduced shadow
                  opacity: 0.9, // Slightly transparent
                  // Remove the pulse animation for a more subtle effect
                }}
              >
                Snap to edges
              </Box>
            )}
          </>
        )}
        
        {/* Reposition/Check Button - always visible in top right */}
        <IconButton 
          size="small" 
          onClick={handleRepositionClick}
          onTouchEnd={handleRepositionClick}
          sx={{ 
            position: 'absolute', 
            top: 8, 
            right: 8,
            width: 48,
            height: 48,
            backgroundColor: isTransformEnabled 
              ? '#4CAF50' // Solid green when in edit mode
              : '#2196F3', // Solid blue when not in edit mode
            color: '#ffffff',
            border: '2px solid #ffffff',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4), 0 2px 4px rgba(0, 0, 0, 0.2)',
            '&:hover': {
              backgroundColor: isTransformEnabled
                ? '#388E3C' // Darker green on hover
                : '#1976D2', // Darker blue on hover
              transform: 'scale(1.1)',
              boxShadow: '0 6px 16px rgba(0, 0, 0, 0.5), 0 3px 6px rgba(0, 0, 0, 0.3)',
            },
            '&:active': {
              transform: 'scale(1.05)',
            },
            zIndex: 10, // Higher than overlay
            transition: 'all 0.2s ease-in-out',
          }}
        >
          {isTransformEnabled ? <Check sx={{ fontSize: 24 }} /> : <OpenWith sx={{ fontSize: 20 }} />}
        </IconButton>
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
        width: 64,
        height: 64,
        backgroundColor: '#2196F3', // Solid blue background
        color: '#ffffff',
        border: '3px solid #ffffff',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4), 0 2px 4px rgba(0, 0, 0, 0.2)',
        '&:hover': {
          backgroundColor: '#1976D2',
          transform: 'scale(1.1)',
          boxShadow: '0 6px 16px rgba(0, 0, 0, 0.5), 0 3px 6px rgba(0, 0, 0, 0.3)',
        },
        '&:active': {
          transform: 'scale(1.05)',
        },
        transition: 'all 0.2s ease-in-out',
      }}
    >
      <Add sx={{ fontSize: 32 }} />
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
            // Check if this panel is in edit mode
            const isInEditMode = enabledTransforms.has(panelId);
            
            return (
              <Box
                key={`panel-area-${index}`}
                sx={{
                  gridArea: area,
                  backgroundColor: hasImage ? (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)') : 'rgba(0,0,0,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: (!hasImage || (hasImage && !isInEditMode)) && onPanelClick ? 'pointer' : 'default',
                  overflow: 'hidden',
                  position: 'relative',
                  '&:hover': {
                    backgroundColor: hasImage ? theme.palette.action.hover : 'rgba(0,0,0,0.4)',
                  },
                }}
                onClick={() => (!hasImage || (hasImage && !isInEditMode)) && onPanelClick && onPanelClick(index, panelId)}
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
              // Check if this panel is in edit mode
              const isInEditMode = enabledTransforms.has(panelId);
              
              return (
                <Box
                  key={`panel-item-${index}`}
                  sx={{
                    ...(item.gridArea ? { gridArea: item.gridArea } : {}),
                    backgroundColor: hasImage ? (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)') : 'rgba(0,0,0,0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: (!hasImage || (hasImage && !isInEditMode)) && onPanelClick ? 'pointer' : 'default',
                    overflow: 'hidden',
                    position: 'relative',
                    '&:hover': {
                      backgroundColor: hasImage ? theme.palette.action.hover : 'rgba(0,0,0,0.4)',
                    },
                  }}
                  onClick={() => (!hasImage || (hasImage && !isInEditMode)) && onPanelClick && onPanelClick(index, panelId)}
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
              // Check if this panel is in edit mode
              const isInEditMode = enabledTransforms.has(panelId);
              
              return (
                <Box
                  key={`panel-${index}`}
                  sx={{
                    backgroundColor: hasImage ? (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)') : 'rgba(0,0,0,0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: (!hasImage || (hasImage && !isInEditMode)) && onPanelClick ? 'pointer' : 'default',
                    overflow: 'hidden',
                    position: 'relative',
                    '&:hover': {
                      backgroundColor: hasImage ? theme.palette.action.hover : 'rgba(0,0,0,0.4)',
                    },
                  }}
                  onClick={() => (!hasImage || (hasImage && !isInEditMode)) && onPanelClick && onPanelClick(index, panelId)}
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