import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Box, IconButton, Typography, TextField, Popover, Slider, FormControl, InputLabel, Select, MenuItem, Button, ToggleButton, ToggleButtonGroup, useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { Add, OpenWith, Check, TextFields, FormatColorText, Close, FormatBold, FormatItalic, FormatColorFill, Edit } from '@mui/icons-material';
import { fabric } from 'fabric';
import { layoutDefinitions } from '../config/layouts';
import fonts from '../../../utils/fonts';

/**
 * Helper function to get border pixel size based on percentage and component width
 */
const getBorderPixelSize = (borderThickness, componentWidth = 400) => {
  if (typeof borderThickness === 'number') {
    return Math.round((borderThickness / 100) * componentWidth);
  }
  return 0;
};

/**
 * Helper function to create layout config from template
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
 * Helper function to parse CSS grid template areas string
 */
const parseGridTemplateAreas = (gridTemplateAreas) => {
  if (!gridTemplateAreas) return {};
  
  const areas = {};
  
  // Split by quotes to get individual rows
  // Handle both 'row1' 'row2' and "row1" "row2" formats
  const cleanString = gridTemplateAreas.trim();
  let rows;
  
  if (cleanString.includes('" "')) {
    // Format: "main main" "left right"
    rows = cleanString.split('" "').map(row => 
      row.replace(/"/g, '').trim().split(/\s+/)
    );
  } else if (cleanString.includes("' '")) {
    // Format: 'main main' 'left right'
    rows = cleanString.split("' '").map(row => 
      row.replace(/'/g, '').trim().split(/\s+/)
    );
  } else {
    // Single row or space-separated format
    rows = [cleanString.replace(/['"]/g, '').trim().split(/\s+/)];
  }
  
  // Find the bounds of each named area
  rows.forEach((row, rowIndex) => {
    row.forEach((areaName, colIndex) => {
      if (areaName !== '.' && areaName !== '') {
        if (!areas[areaName]) {
          areas[areaName] = {
            rowStart: rowIndex,
            rowEnd: rowIndex,
            colStart: colIndex,
            colEnd: colIndex
          };
        } else {
          // Extend the area bounds
          areas[areaName].rowStart = Math.min(areas[areaName].rowStart, rowIndex);
          areas[areaName].rowEnd = Math.max(areas[areaName].rowEnd, rowIndex);
          areas[areaName].colStart = Math.min(areas[areaName].colStart, colIndex);
          areas[areaName].colEnd = Math.max(areas[areaName].colEnd, colIndex);
        }
      }
    });
  });
  
  return areas;
};

/**
 * Helper function to parse CSS grid template and convert to panel rectangles
 */
const parseGridToRects = (layoutConfig, containerWidth, containerHeight, panelCount, borderPixels) => {
  const rects = [];
  
  // Calculate the available space (subtract borders)
  const totalPadding = borderPixels * 2;
  const availableWidth = containerWidth - totalPadding;
  const availableHeight = containerHeight - totalPadding;
  
  // Parse grid template columns/rows to get exact dimensions and track sizes
  let columns = 1;
  let rows = 1;
  let columnSizes = [1]; // Default: single column taking full width
  let rowSizes = [1];    // Default: single row taking full height
  
  // Parse columns
  if (layoutConfig.gridTemplateColumns) {
    if (layoutConfig.gridTemplateColumns.includes('repeat(')) {
      const repeatMatch = layoutConfig.gridTemplateColumns.match(/repeat\((\d+),/);
      if (repeatMatch) {
        columns = parseInt(repeatMatch[1], 10);
        columnSizes = Array(columns).fill(1); // All equal size
      }
    } else {
      // Parse individual fr units like "2fr 1fr" or "1fr 1fr 1fr"
      const frMatches = layoutConfig.gridTemplateColumns.match(/(\d*\.?\d*)fr/g);
      if (frMatches) {
        columns = frMatches.length;
        columnSizes = frMatches.map(match => {
          const value = match.replace('fr', '');
          return value === '' ? 1 : parseFloat(value);
        });
      }
    }
  }
  
  // Parse rows
  if (layoutConfig.gridTemplateRows) {
    if (layoutConfig.gridTemplateRows.includes('repeat(')) {
      const repeatMatch = layoutConfig.gridTemplateRows.match(/repeat\((\d+),/);
      if (repeatMatch) {
        rows = parseInt(repeatMatch[1], 10);
        rowSizes = Array(rows).fill(1); // All equal size
      }
    } else {
      // Parse individual fr units like "2fr 1fr" or "1fr 1fr 1fr"
      const frMatches = layoutConfig.gridTemplateRows.match(/(\d*\.?\d*)fr/g);
      if (frMatches) {
        rows = frMatches.length;
        rowSizes = frMatches.map(match => {
          const value = match.replace('fr', '');
          return value === '' ? 1 : parseFloat(value);
        });
      }
    }
  }
  
  // Calculate total fractional units
  const totalColumnFr = columnSizes.reduce((sum, size) => sum + size, 0);
  const totalRowFr = rowSizes.reduce((sum, size) => sum + size, 0);
  
  // Calculate gaps - only between panels, not at edges
  const horizontalGaps = Math.max(0, columns - 1) * borderPixels;
  const verticalGaps = Math.max(0, rows - 1) * borderPixels;
  
  // Calculate base unit sizes
  const columnFrUnit = (availableWidth - horizontalGaps) / totalColumnFr;
  const rowFrUnit = (availableHeight - verticalGaps) / totalRowFr;
  
  // Helper function to calculate cumulative position and size for a cell
  const getCellDimensions = (col, row) => {
    // Calculate X position: sum of all previous column widths + gaps
    let x = borderPixels;
    for (let c = 0; c < col; c += 1) {
      x += columnSizes[c] * columnFrUnit + borderPixels;
    }
    
    // Calculate Y position: sum of all previous row heights + gaps  
    let y = borderPixels;
    for (let r = 0; r < row; r += 1) {
      y += rowSizes[r] * rowFrUnit + borderPixels;
    }
    
    // Calculate current cell dimensions
    const width = columnSizes[col] * columnFrUnit;
    const height = rowSizes[row] * rowFrUnit;
    
    return { x, y, width, height };
  };

  if (layoutConfig.areas && layoutConfig.areas.length > 0 && layoutConfig.gridTemplateAreas) {
    // Use grid template areas - need to parse the actual grid areas
    const gridAreas = parseGridTemplateAreas(layoutConfig.gridTemplateAreas);
    
    layoutConfig.areas.slice(0, panelCount).forEach((areaName, index) => {
      const areaInfo = gridAreas[areaName];
      if (areaInfo) {
        // Calculate position and size based on grid area bounds
        let x = borderPixels;
        let y = borderPixels;
        let width = 0;
        let height = 0;
        
                 // Calculate X position and width
         for (let c = 0; c < areaInfo.colStart; c += 1) {
           x += columnSizes[c] * columnFrUnit + borderPixels;
         }
         for (let c = areaInfo.colStart; c <= areaInfo.colEnd; c += 1) {
           width += columnSizes[c] * columnFrUnit;
         }
         // Add gaps between columns within the area
         if (areaInfo.colEnd > areaInfo.colStart) {
           width += (areaInfo.colEnd - areaInfo.colStart) * borderPixels;
         }
         
         // Calculate Y position and height
         for (let r = 0; r < areaInfo.rowStart; r += 1) {
           y += rowSizes[r] * rowFrUnit + borderPixels;
         }
         for (let r = areaInfo.rowStart; r <= areaInfo.rowEnd; r += 1) {
           height += rowSizes[r] * rowFrUnit;
         }
         // Add gaps between rows within the area
         if (areaInfo.rowEnd > areaInfo.rowStart) {
           height += (areaInfo.rowEnd - areaInfo.rowStart) * borderPixels;
         }
        
        rects.push({
          x,
          y,
          width,
          height,
          panelId: `panel-${index + 1}`,
          index
        });
      }
    });
  } else {
    // Use items array or simple grid
    for (let i = 0; i < panelCount; i += 1) {
      const col = i % columns;
      const row = Math.floor(i / columns);
      const { x, y, width, height } = getCellDimensions(col, row);
      
      rects.push({
        x,
        y,
        width,
        height,
        panelId: `panel-${i + 1}`,
        index: i
      });
    }
  }
  
  return rects;
};

/**
 * Fabric.js-based Collage Preview Component with In-Place Text Editing
 */
const CanvasCollagePreview = ({
  selectedTemplate,
  selectedAspectRatio,
  panelCount,
  images = [],
  onPanelClick,
  onMenuOpen,
  aspectRatioValue = 1,
  panelImageMapping = {},
  borderThickness = 0,
  borderColor = '#000000',
  panelTransforms = {},
  updatePanelTransform,
  panelTexts = {},
  updatePanelText,
  lastUsedTextSettings = {},
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const canvasRef = useRef(null);
  const fabricCanvasRef = useRef(null);
  const containerRef = useRef(null);
  const [componentWidth, setComponentWidth] = useState(400);
  const [componentHeight, setComponentHeight] = useState(400);
  const [loadedImages, setLoadedImages] = useState({});
  const [panelRects, setPanelRects] = useState([]);
  const [isTransformMode, setIsTransformMode] = useState({});

  // Get layout configuration
  const layoutConfig = useMemo(() => {
    return selectedTemplate ? createLayoutConfig(selectedTemplate, panelCount) : null;
  }, [selectedTemplate, panelCount]);

  // Calculate border pixels
  const borderPixels = getBorderPixelSize(borderThickness, componentWidth);

  // Load images when they change
  useEffect(() => {
    const loadImage = (src, key) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve({ key, img });
        img.onerror = () => resolve({ key, img: null });
        
        if (typeof src === 'string') {
          img.src = src;
        } else if (src && typeof src === 'object') {
          img.src = src.displayUrl || src.originalUrl || '';
        }
      });
    };

    const loadAllImages = async () => {
      const imagePromises = images.map((imageData, index) => 
        loadImage(imageData, index)
      );
      
      const results = await Promise.all(imagePromises);
      const newLoadedImages = {};
      
      results.forEach(({ key, img }) => {
        if (img) {
          newLoadedImages[key] = img;
        }
      });
      
      setLoadedImages(newLoadedImages);
    };

    if (images.length > 0) {
      loadAllImages();
    }
  }, [images]);

  // Update component dimensions and panel rectangles
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const width = rect.width || 400;
        const height = width / aspectRatioValue;
        
        setComponentWidth(width);
        setComponentHeight(height);
        
        if (layoutConfig) {
          const rects = parseGridToRects(layoutConfig, width, height, panelCount, borderPixels);
          setPanelRects(rects);
        }
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    
    return () => window.removeEventListener('resize', updateDimensions);
  }, [aspectRatioValue, layoutConfig, panelCount, borderPixels]);

  // Initialize fabric canvas
  useEffect(() => {
    if (canvasRef.current && componentWidth && componentHeight) {
      // Clean up existing canvas
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose();
      }

      // Create new fabric canvas
      const fabricCanvas = new fabric.Canvas(canvasRef.current, {
        width: componentWidth,
        height: componentHeight,
        backgroundColor: borderPixels > 0 ? borderColor : 'transparent',
        selection: false, // Disable group selection
        preserveObjectStacking: true,
      });

      fabricCanvasRef.current = fabricCanvas;

      // Configure fabric for better mobile experience
      if (isMobile) {
        fabricCanvas.touchCornerSize = 30;
        fabricCanvas.cornerSize = 20;
      }

      return () => {
        if (fabricCanvas) {
          fabricCanvas.dispose();
        }
      };
    }
  }, [componentWidth, componentHeight, borderPixels, borderColor, isMobile]);

  // Draw panels and setup text objects
  useEffect(() => {
    const fabricCanvas = fabricCanvasRef.current;
    if (!fabricCanvas || panelRects.length === 0) return;

    // Clear canvas
    fabricCanvas.clear();
    if (borderPixels > 0) {
      fabricCanvas.backgroundColor = borderColor;
    }

    panelRects.forEach((rect) => {
      const { x, y, width, height, panelId, index } = rect;
      const imageIndex = panelImageMapping[panelId];
      const hasImage = imageIndex !== undefined && loadedImages[imageIndex];
      const transform = panelTransforms[panelId] || { scale: 1, positionX: 0, positionY: 0 };
      const panelText = panelTexts[panelId] || {};

      // Create panel background
      const panelBg = new fabric.Rect({
        left: x,
        top: y,
        width: width,
        height: height,
        fill: hasImage 
          ? (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)')
          : 'rgba(0,0,0,0.3)',
        selectable: false,
        evented: false,
        data: { panelId, type: 'background' }
      });

      fabricCanvas.add(panelBg);

      // Add image if available
      if (hasImage) {
        const img = loadedImages[imageIndex];
        if (img) {
          const fabricImg = new fabric.Image(img, {
            left: x,
            top: y,
            selectable: isTransformMode[panelId] || false,
            evented: isTransformMode[panelId] || false,
            data: { panelId, type: 'image' }
          });

          // Calculate initial scale to cover the panel (like object-fit: cover)
          const imageAspectRatio = img.naturalWidth / img.naturalHeight;
          const panelAspectRatio = width / height;
          
          let initialScale;
          if (imageAspectRatio > panelAspectRatio) {
            initialScale = height / img.naturalHeight;
          } else {
            initialScale = width / img.naturalWidth;
          }

          // Apply transforms
          const finalScale = initialScale * transform.scale;
          fabricImg.scale(finalScale);

          // Position image
          const scaledWidth = img.naturalWidth * finalScale;
          const scaledHeight = img.naturalHeight * finalScale;
          const centerOffsetX = (width - scaledWidth) / 2;
          const centerOffsetY = (height - scaledHeight) / 2;
          
          fabricImg.set({
            left: x + centerOffsetX + transform.positionX,
            top: y + centerOffsetY + transform.positionY
          });

          // Create clipping path for the panel
          const clipPath = new fabric.Rect({
            left: x,
            top: y,
            width: width,
            height: height,
            absolutePositioned: true
          });
          fabricImg.clipPath = clipPath;

          fabricCanvas.add(fabricImg);
        }
      } else {
        // Add "+" icon for empty panels
        const iconSize = Math.min(width, height) * 0.3;
        const iconX = x + (width - iconSize) / 2;
        const iconY = y + (height - iconSize) / 2;

        const circle = new fabric.Circle({
          left: iconX,
          top: iconY,
          radius: iconSize / 2,
          fill: '#2196F3',
          selectable: false,
          evented: false,
          data: { panelId, type: 'add-icon' }
        });

        const plusH = new fabric.Rect({
          left: iconX + iconSize * 0.25,
          top: iconY + iconSize * 0.45,
          width: iconSize * 0.5,
          height: iconSize * 0.1,
          fill: '#ffffff',
          selectable: false,
          evented: false,
          data: { panelId, type: 'add-icon' }
        });

        const plusV = new fabric.Rect({
          left: iconX + iconSize * 0.45,
          top: iconY + iconSize * 0.25,
          width: iconSize * 0.1,
          height: iconSize * 0.5,
          fill: '#ffffff',
          selectable: false,
          evented: false,
          data: { panelId, type: 'add-icon' }
        });

        fabricCanvas.add(circle, plusH, plusV);
      }

      // Add text object for subtitle
      const textContent = panelText.content || '';
      const showPlaceholder = !textContent.trim();
      const displayText = showPlaceholder ? 'Tap to add text' : textContent;

      const textObject = new fabric.IText(displayText, {
        left: x + width / 2,
        top: y + height - 60, // Position near bottom of panel
        width: width - 20, // Leave some padding
        fontSize: panelText.fontSize || lastUsedTextSettings.fontSize || 24,
        fontFamily: panelText.fontFamily || lastUsedTextSettings.fontFamily || 'Arial',
        fontWeight: panelText.fontWeight || lastUsedTextSettings.fontWeight || 'bold',
        fontStyle: panelText.fontStyle || lastUsedTextSettings.fontStyle || 'normal',
        fill: showPlaceholder ? 'rgba(255, 255, 255, 0.6)' : (panelText.color || lastUsedTextSettings.color || '#ffffff'),
        stroke: showPlaceholder ? '' : '#000000',
        strokeWidth: showPlaceholder ? 0 : (panelText.strokeWidth || lastUsedTextSettings.strokeWidth || 2),
        textAlign: 'center',
        originX: 'center',
        originY: 'bottom',
        selectable: true,
        editable: true,
        lockMovementX: true,
        lockMovementY: true,
        lockScalingX: true,
        lockScalingY: true,
        lockRotation: true,
        hasControls: false,
        hasBorders: false,
        cornerSize: 0,
        data: { panelId, type: 'text', isPlaceholder: showPlaceholder }
      });

      // Handle text editing events
      textObject.on('editing:entered', () => {
        if (showPlaceholder) {
          textObject.text = '';
          textObject.set({
            fill: panelText.color || lastUsedTextSettings.color || '#ffffff',
            stroke: '#000000',
            strokeWidth: panelText.strokeWidth || lastUsedTextSettings.strokeWidth || 2
          });
          fabricCanvas.renderAll();
        }
      });

      textObject.on('editing:exited', () => {
        const newText = textObject.text.trim();
        if (newText === '') {
          // Revert to placeholder
          textObject.text = 'Tap to add text';
          textObject.set({
            fill: 'rgba(255, 255, 255, 0.6)',
            stroke: '',
            strokeWidth: 0
          });
        }
        
        // Update panel text
        if (updatePanelText) {
          updatePanelText(panelId, {
            ...panelText,
            content: newText
          });
        }
        
        fabricCanvas.renderAll();
      });

      fabricCanvas.add(textObject);
    });

    // Handle canvas clicks for panel selection
    fabricCanvas.on('mouse:down', (e) => {
      if (e.target && e.target.data) {
        const { panelId, type } = e.target.data;
        
        if (type === 'background' || type === 'add-icon') {
          if (onPanelClick) {
            const panelIndex = panelRects.findIndex(r => r.panelId === panelId);
            onPanelClick(panelIndex, panelId);
          }
        }
      }
    });

    fabricCanvas.renderAll();

  }, [panelRects, loadedImages, panelImageMapping, panelTransforms, panelTexts, lastUsedTextSettings, isTransformMode, theme.palette.mode, borderColor, onPanelClick, updatePanelText]);

  // Toggle transform mode for images
  const toggleTransformMode = useCallback((panelId) => {
    setIsTransformMode(prev => ({
      ...prev,
      [panelId]: !prev[panelId]
    }));
  }, []);

  // Get final canvas for export
  const getCanvasBlob = useCallback(() => {
    return new Promise((resolve) => {
      const fabricCanvas = fabricCanvasRef.current;
      if (fabricCanvas) {
        // Hide placeholder texts before export
        const objects = fabricCanvas.getObjects();
        objects.forEach(obj => {
          if (obj.data && obj.data.type === 'text' && obj.data.isPlaceholder) {
            obj.visible = false;
          }
        });
        
        fabricCanvas.renderAll();
        
        fabricCanvas.toBlob((blob) => {
          // Restore placeholder visibility
          objects.forEach(obj => {
            if (obj.data && obj.data.type === 'text') {
              obj.visible = true;
            }
          });
          fabricCanvas.renderAll();
          
          resolve(blob);
        }, 'image/png');
      } else {
        resolve(null);
      }
    });
  }, []);

  // Expose the getCanvasBlob function to parent components
  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.getCanvasBlob = getCanvasBlob;
    }
  }, [getCanvasBlob]);

  if (!selectedTemplate || !layoutConfig) {
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
          border: `1px solid ${theme.palette.divider}`
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

  return (
    <Box ref={containerRef} sx={{ position: 'relative', width: '100%' }}>
      <canvas
        ref={canvasRef}
        data-testid="fabric-collage-preview"
        style={{
          display: 'block',
          width: '100%',
          height: 'auto',
          border: `1px solid ${theme.palette.divider}`,
        }}
      />
      
      {/* Control panels positioned over canvas */}
      {panelRects.map((rect) => {
        const { panelId, index } = rect;
        const imageIndex = panelImageMapping[panelId];
        const hasImage = imageIndex !== undefined && loadedImages[imageIndex];
        const isInTransformMode = isTransformMode[panelId];
        
        return (
          <Box key={`controls-${panelId}`}>
            {/* Transform control button */}
            {hasImage && (
              <IconButton
                size="small"
                onClick={() => toggleTransformMode(panelId)}
                sx={{
                  position: 'absolute',
                  top: rect.y + 8,
                  left: rect.x + rect.width - 56,
                  width: 40,
                  height: 40,
                  backgroundColor: isInTransformMode ? '#4CAF50' : '#2196F3',
                  color: '#ffffff',
                  border: '2px solid #ffffff',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
                  '&:hover': {
                    backgroundColor: isInTransformMode ? '#388E3C' : '#1976D2',
                    transform: 'scale(1.1)',
                  },
                  zIndex: 10,
                }}
              >
                {isInTransformMode ? <Check sx={{ fontSize: 20 }} /> : <OpenWith sx={{ fontSize: 16 }} />}
              </IconButton>
            )}
          </Box>
        );
      })}
    </Box>
  );
};

export default CanvasCollagePreview; 