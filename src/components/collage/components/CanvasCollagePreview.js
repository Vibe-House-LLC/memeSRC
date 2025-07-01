import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Box, IconButton, Typography, TextField, Popover, Slider, FormControl, InputLabel, Select, MenuItem, Button, ToggleButton, ToggleButtonGroup, useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { Add, OpenWith, Check, TextFields, FormatColorText, Close, FormatBold, FormatItalic, FormatColorFill, Edit } from '@mui/icons-material';
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
 * Canvas-based Collage Preview Component
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
  const containerRef = useRef(null);
  const [componentWidth, setComponentWidth] = useState(400);
  const [componentHeight, setComponentHeight] = useState(400);
  const [loadedImages, setLoadedImages] = useState({});
  const [panelRects, setPanelRects] = useState([]);
  const [hoveredPanel, setHoveredPanel] = useState(null);
  const [selectedPanel, setSelectedPanel] = useState(null);
  const [isTransformMode, setIsTransformMode] = useState({});
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [textEditingPanel, setTextEditingPanel] = useState(null);
  const [textEditAnchor, setTextEditAnchor] = useState(null);
  const [directEditingPanel, setDirectEditingPanel] = useState(null);
  const [directEditText, setDirectEditText] = useState('');
  const [touchStartDistance, setTouchStartDistance] = useState(null);
  const [touchStartScale, setTouchStartScale] = useState(1);

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
  }, [images, panelRects, updatePanelText, panelTexts, lastUsedTextSettings]);

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

  // Draw the canvas
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    
    // Set canvas size with device pixel ratio for crisp rendering
    canvas.width = componentWidth * dpr;
    canvas.height = componentHeight * dpr;
    canvas.style.width = `${componentWidth}px`;
    canvas.style.height = `${componentHeight}px`;
    
    // Scale context to match device pixel ratio
    ctx.scale(dpr, dpr);
    
    // Clear canvas
    ctx.clearRect(0, 0, componentWidth, componentHeight);
    
    // Draw background (border color if borders are enabled)
    if (borderPixels > 0) {
      ctx.fillStyle = borderColor;
      ctx.fillRect(0, 0, componentWidth, componentHeight);
    }
    
    // Draw panels
    panelRects.forEach((rect) => {
      const { x, y, width, height, panelId, index } = rect;
      const imageIndex = panelImageMapping[panelId];
      const hasImage = imageIndex !== undefined && loadedImages[imageIndex];
      const transform = panelTransforms[panelId] || { scale: 1, positionX: 0, positionY: 0 };
      const isHovered = hoveredPanel === index;
      const isSelected = selectedPanel === index;
      const isInTransformMode = isTransformMode[panelId];
      const panelText = panelTexts[panelId] || {};
      
      // Draw panel background
      ctx.fillStyle = hasImage 
        ? (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)')
        : 'rgba(0,0,0,0.3)';
      ctx.fillRect(x, y, width, height);
      
      // Note: Hover effects are now handled by CSS overlays, not canvas drawing
      // This ensures they don't interfere with collage generation
      
      if (hasImage) {
        const img = loadedImages[imageIndex];
        if (img) {
          ctx.save();
          
          // Clip to panel bounds
          ctx.beginPath();
          ctx.rect(x, y, width, height);
          ctx.clip();
          
          // Calculate initial scale to cover the panel (like object-fit: cover)
          const imageAspectRatio = img.naturalWidth / img.naturalHeight;
          const panelAspectRatio = width / height;
          
          let initialScale;
          if (imageAspectRatio > panelAspectRatio) {
            // Image is wider than panel, scale to fit height
            initialScale = height / img.naturalHeight;
          } else {
            // Image is taller than panel, scale to fit width  
            initialScale = width / img.naturalWidth;
          }
          
          // Apply user transform on top of initial scale
          const finalScale = initialScale * transform.scale;
          const scaledWidth = img.naturalWidth * finalScale;
          const scaledHeight = img.naturalHeight * finalScale;
          
          // Calculate centering offset (for initial positioning)
          const centerOffsetX = (width - scaledWidth) / 2;
          const centerOffsetY = (height - scaledHeight) / 2;
          
          // Apply user position offset on top of centering
          const finalOffsetX = centerOffsetX + transform.positionX;
          const finalOffsetY = centerOffsetY + transform.positionY;
          
          // Draw image with transforms
          ctx.drawImage(
            img,
            x + finalOffsetX,
            y + finalOffsetY,
            scaledWidth,
            scaledHeight
          );
          
          ctx.restore();
        }
      } else {
        // Draw add icon for empty panels
        const iconSize = Math.min(width, height) * 0.3;
        const iconX = x + (width - iconSize) / 2;
        const iconY = y + (height - iconSize) / 2;
        
        // Draw add icon background circle
        ctx.fillStyle = '#2196F3';
        ctx.beginPath();
        ctx.arc(iconX + iconSize/2, iconY + iconSize/2, iconSize/2, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw plus sign
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        // Horizontal line
        ctx.moveTo(iconX + iconSize * 0.25, iconY + iconSize/2);
        ctx.lineTo(iconX + iconSize * 0.75, iconY + iconSize/2);
        // Vertical line
        ctx.moveTo(iconX + iconSize/2, iconY + iconSize * 0.25);
        ctx.lineTo(iconX + iconSize/2, iconY + iconSize * 0.75);
        ctx.stroke();
      }
      
      // Draw text at the bottom of the panel or show placeholder
      const hasTextContent = panelText.content && panelText.content.trim();
      const showPlaceholder = !hasTextContent;
      
      if (hasTextContent || showPlaceholder) {
        ctx.save();
        
        // Set text properties (use last used settings as defaults)
        const fontSize = panelText.fontSize || lastUsedTextSettings.fontSize || 26;
        const fontWeight = panelText.fontWeight || lastUsedTextSettings.fontWeight || '700';
        const fontStyle = panelText.fontStyle || lastUsedTextSettings.fontStyle || 'normal';
        const fontFamily = panelText.fontFamily || lastUsedTextSettings.fontFamily || 'Arial';
        const textColor = showPlaceholder ? 'rgba(255, 255, 255, 0.4)' : (panelText.color || lastUsedTextSettings.color || '#ffffff');
        const strokeWidth = showPlaceholder ? 0 : (panelText.strokeWidth || lastUsedTextSettings.strokeWidth || 2);
        
        ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
        ctx.fillStyle = textColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        
        // Set stroke properties
        ctx.strokeStyle = '#000000'; // Black stroke for contrast
        ctx.lineWidth = strokeWidth;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        
        // Add text shadow for better readability
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;
        ctx.shadowBlur = 3;
        
        // Calculate available text area (with padding on sides and bottom)
        const textPadding = 10;
        const maxTextWidth = width - (textPadding * 2);
        const textX = x + width / 2;
        const textY = y + height - textPadding;
        const lineHeight = fontSize * 1.2;
        
        // Helper function to wrap text
        const wrapText = (text, maxWidth) => {
          const lines = [];
          const manualLines = text.split('\n'); // Handle manual line breaks first
          
          manualLines.forEach(line => {
            if (ctx.measureText(line).width <= maxWidth) {
              // Line fits within width
              lines.push(line);
            } else {
              // Line needs to be wrapped
              const words = line.split(' ');
              let currentLine = '';
              
              words.forEach(word => {
                const testLine = currentLine ? `${currentLine} ${word}` : word;
                const testWidth = ctx.measureText(testLine).width;
                
                                 if (testWidth <= maxWidth) {
                   currentLine = testLine;
                 } else if (currentLine) {
                   // Current line is full, start a new line
                   lines.push(currentLine);
                   currentLine = word;
                 } else {
                   // Single word is too long, force it on its own line
                   lines.push(word);
                 }
              });
              
              // Add the last line if it has content
              if (currentLine) {
                lines.push(currentLine);
              }
            }
          });
          
          return lines;
        };
        
        // Get wrapped lines - use placeholder text if no content
        const displayText = showPlaceholder ? 'Tap to add text' : panelText.content;
        const wrappedLines = wrapText(displayText, maxTextWidth);
        
        // Draw each line
        wrappedLines.forEach((line, lineIndex) => {
          const lineY = textY - (wrappedLines.length - 1 - lineIndex) * lineHeight;
          
          // Draw stroke first if stroke width > 0
          if (strokeWidth > 0) {
            ctx.strokeText(line, textX, lineY);
          }
          
          // Then draw the fill text on top
          ctx.fillText(line, textX, lineY);
        });
        
        ctx.restore();
      }
    });
  }, [
    componentWidth, 
    componentHeight, 
    panelRects, 
    loadedImages, 
    panelImageMapping, 
    panelTransforms, 
    borderPixels, 
    borderColor, 
    selectedPanel, 
    isTransformMode,
    panelTexts,
    theme.palette.mode
  ]);

  // Redraw canvas when dependencies change
  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  // Handle mouse events
  const handleMouseMove = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Find which panel is under the mouse
    const hoveredPanelIndex = panelRects.findIndex(panel => 
      x >= panel.x && x <= panel.x + panel.width &&
      y >= panel.y && y <= panel.y + panel.height
    );
    
    if (hoveredPanelIndex !== hoveredPanel) {
      setHoveredPanel(hoveredPanelIndex >= 0 ? hoveredPanelIndex : null);
      canvas.style.cursor = hoveredPanelIndex >= 0 ? 'pointer' : 'default';
    }
    
    // Handle dragging for transform mode
    if (isDragging && selectedPanel !== null) {
      const panel = panelRects[selectedPanel];
      if (panel && isTransformMode[panel.panelId]) {
        const deltaX = x - dragStart.x;
        const deltaY = y - dragStart.y;
        
        const currentTransform = panelTransforms[panel.panelId] || { scale: 1, positionX: 0, positionY: 0 };
        const imageIndex = panelImageMapping[panel.panelId];
        const img = loadedImages[imageIndex];
        
        if (img && updatePanelTransform) {
          // Calculate the same scaling and positioning logic as in drawCanvas
          const imageAspectRatio = img.naturalWidth / img.naturalHeight;
          const panelAspectRatio = panel.width / panel.height;
          
          let initialScale;
          if (imageAspectRatio > panelAspectRatio) {
            // Image is wider than panel, scale to fit height
            initialScale = panel.height / img.naturalHeight;
          } else {
            // Image is taller than panel, scale to fit width  
            initialScale = panel.width / img.naturalWidth;
          }
          
          // Apply user transform on top of initial scale
          const finalScale = initialScale * currentTransform.scale;
          const scaledWidth = img.naturalWidth * finalScale;
          const scaledHeight = img.naturalHeight * finalScale;
          
          // Calculate centering offset (for initial positioning)
          const centerOffsetX = (panel.width - scaledWidth) / 2;
          const centerOffsetY = (panel.height - scaledHeight) / 2;
          
          // Calculate proposed new positions
          const newPositionX = currentTransform.positionX + deltaX;
          const newPositionY = currentTransform.positionY + deltaY;
          
          // Calculate the final image bounds with new position
          const finalOffsetX = centerOffsetX + newPositionX;
          const finalOffsetY = centerOffsetY + newPositionY;
          
          // Calculate bounds to prevent white space (image must always cover the panel)
          let minPositionX;
          let maxPositionX;
          let minPositionY;
          let maxPositionY;
          
          if (scaledWidth > panel.width) {
            // Image is wider than panel - can move horizontally but not show white space
            // When image is wider, centerOffsetX is negative
            maxPositionX = -centerOffsetX; // Left edge of image at left edge of panel
            minPositionX = panel.width - scaledWidth - centerOffsetX; // Right edge of image at right edge of panel
          } else {
            // Image is narrower than or equal to panel - center it and don't allow horizontal movement
            minPositionX = 0;
            maxPositionX = 0;
          }
          
          if (scaledHeight > panel.height) {
            // Image is taller than panel - can move vertically but not show white space
            // When image is taller, centerOffsetY is negative
            maxPositionY = -centerOffsetY; // Top edge of image at top edge of panel
            minPositionY = panel.height - scaledHeight - centerOffsetY; // Bottom edge of image at bottom edge of panel
          } else {
            // Image is shorter than or equal to panel - center it and don't allow vertical movement
            minPositionY = 0;
            maxPositionY = 0;
          }
          
          // Clamp the positions to prevent white space
          const clampedPositionX = Math.max(minPositionX, Math.min(maxPositionX, newPositionX));
          const clampedPositionY = Math.max(minPositionY, Math.min(maxPositionY, newPositionY));
          
          updatePanelTransform(panel.panelId, {
            ...currentTransform,
            positionX: clampedPositionX,
            positionY: clampedPositionY
          });
        }
        
        setDragStart({ x, y });
      }
    }
  }, [panelRects, hoveredPanel, isDragging, selectedPanel, dragStart, isTransformMode, panelTransforms, updatePanelTransform]);

  const handleMouseDown = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const clickedPanelIndex = panelRects.findIndex(panel => 
      x >= panel.x && x <= panel.x + panel.width &&
      y >= panel.y && y <= panel.y + panel.height
    );
    
    if (clickedPanelIndex >= 0) {
      const clickedPanel = panelRects[clickedPanelIndex];
      setSelectedPanel(clickedPanelIndex);
      
      // Check if this panel is in transform mode
      if (isTransformMode[clickedPanel.panelId]) {
        setIsDragging(true);
        setDragStart({ x, y });
      } else {
        // Check if user clicked on text area (bottom third of panel)
        const textAreaY = clickedPanel.y + (clickedPanel.height * 0.67);
        if (y >= textAreaY && isMobile) {
          // On mobile, clicking in text area opens text editor
          const currentText = panelTexts[clickedPanel.panelId]?.content || '';
          setDirectEditText(currentText);
          setDirectEditingPanel(clickedPanel.panelId);
        } else if (onPanelClick) {
          // Regular panel click
          onPanelClick(clickedPanel.index, clickedPanel.panelId);
        }
      }
    }
  }, [panelRects, isTransformMode, onPanelClick, isMobile, panelTexts]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    // Clear hover state when mouse leaves canvas
    setHoveredPanel(null);
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.style.cursor = 'default';
    }
  }, []);

  const handleWheel = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const cursorX = e.clientX - rect.left;
    const cursorY = e.clientY - rect.top;
    
    // Find which panel is under the cursor
    const hoveredPanelIndex = panelRects.findIndex(panel => 
      cursorX >= panel.x && cursorX <= panel.x + panel.width &&
      cursorY >= panel.y && cursorY <= panel.y + panel.height
    );
    
    // Only proceed with zoom if cursor is over a panel with an image AND this specific panel has transform mode enabled
    if (hoveredPanelIndex >= 0) {
      const panel = panelRects[hoveredPanelIndex];
      const imageIndex = panelImageMapping[panel.panelId];
      const hasImage = imageIndex !== undefined && loadedImages[imageIndex];
      
      if (hasImage && isTransformMode[panel.panelId]) {
        // Prevent page scrolling only when actually zooming an image in transform mode
        e.preventDefault();
        e.stopPropagation();
        // Auto-select this panel for zoom operation
        if (selectedPanel !== hoveredPanelIndex) {
          setSelectedPanel(hoveredPanelIndex);
        }
        
        const scaleChange = e.deltaY > 0 ? 0.9 : 1.1;
        const currentTransform = panelTransforms[panel.panelId] || { scale: 1, positionX: 0, positionY: 0 };
        const img = loadedImages[imageIndex];
        
        if (img && updatePanelTransform) {
          // Calculate cursor position relative to the panel
          const panelCursorX = cursorX - panel.x;
          const panelCursorY = cursorY - panel.y;
          
          // Calculate the minimum scale needed to cover the panel (same as initial scale logic)
          const imageAspectRatio = img.naturalWidth / img.naturalHeight;
          const panelAspectRatio = panel.width / panel.height;
          
          let minScale;
          if (imageAspectRatio > panelAspectRatio) {
            // Image is wider than panel, scale to fit height
            minScale = 1; // The initial scale already fits height, so 1x user scale is minimum
          } else {
            // Image is taller than panel, scale to fit width  
            minScale = 1; // The initial scale already fits width, so 1x user scale is minimum
          }
          
          const proposedScale = currentTransform.scale * scaleChange;
          const newScale = Math.max(minScale, Math.min(5, proposedScale));
          
          // Calculate initial scale and current image dimensions
          const initialScale = imageAspectRatio > panelAspectRatio 
            ? panel.height / img.naturalHeight 
            : panel.width / img.naturalWidth;
          const currentFinalScale = initialScale * currentTransform.scale;
          const newFinalScale = initialScale * newScale;
          const currentScaledWidth = img.naturalWidth * currentFinalScale;
          const currentScaledHeight = img.naturalHeight * currentFinalScale;
          const newScaledWidth = img.naturalWidth * newFinalScale;
          const newScaledHeight = img.naturalHeight * newFinalScale;
          
          // Calculate current center offsets
          const currentCenterOffsetX = (panel.width - currentScaledWidth) / 2;
          const currentCenterOffsetY = (panel.height - currentScaledHeight) / 2;
          const newCenterOffsetX = (panel.width - newScaledWidth) / 2;
          const newCenterOffsetY = (panel.height - newScaledHeight) / 2;
          
          // Calculate the point on the image that corresponds to the cursor position (before scaling)
          const currentImageX = currentCenterOffsetX + currentTransform.positionX;
          const currentImageY = currentCenterOffsetY + currentTransform.positionY;
          const pointOnImageX = (panelCursorX - currentImageX) / currentFinalScale;
          const pointOnImageY = (panelCursorY - currentImageY) / currentFinalScale;
          
          // Calculate new position so the same point on the image stays under the cursor
          const newImageX = panelCursorX - (pointOnImageX * newFinalScale);
          const newImageY = panelCursorY - (pointOnImageY * newFinalScale);
          const newPositionX = newImageX - newCenterOffsetX;
          const newPositionY = newImageY - newCenterOffsetY;
          
          // Calculate bounds to prevent white space and clamp the new position
          let minPositionX;
          let maxPositionX;
          let minPositionY;
          let maxPositionY;
          
          if (newScaledWidth > panel.width) {
            maxPositionX = -newCenterOffsetX;
            minPositionX = panel.width - newScaledWidth - newCenterOffsetX;
          } else {
            minPositionX = 0;
            maxPositionX = 0;
          }
          
          if (newScaledHeight > panel.height) {
            maxPositionY = -newCenterOffsetY;
            minPositionY = panel.height - newScaledHeight - newCenterOffsetY;
          } else {
            minPositionY = 0;
            maxPositionY = 0;
          }
          
          const clampedPositionX = Math.max(minPositionX, Math.min(maxPositionX, newPositionX));
          const clampedPositionY = Math.max(minPositionY, Math.min(maxPositionY, newPositionY));
          
          updatePanelTransform(panel.panelId, {
            ...currentTransform,
            scale: newScale,
            positionX: clampedPositionX,
            positionY: clampedPositionY
          });
        }
      }
    }
  }, [panelRects, panelImageMapping, loadedImages, selectedPanel, panelTransforms, updatePanelTransform, setSelectedPanel, isTransformMode]);

  // Helper function to get distance between two touch points
  const getTouchDistance = useCallback((touches) => {
    if (touches.length < 2) return 0;
    
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  // Helper function to get center point between two touches
  const getTouchCenter = useCallback((touches) => {
    if (touches.length < 2) return { x: touches[0].clientX, y: touches[0].clientY };
    
    return {
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2
    };
  }, []);

  // Touch event handlers
  const handleTouchStart = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const touches = Array.from(e.touches);
    
    if (touches.length === 1) {
      // Single touch - handle like mouse down
      const touch = touches[0];
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      
      const clickedPanelIndex = panelRects.findIndex(panel => 
        x >= panel.x && x <= panel.x + panel.width &&
        y >= panel.y && y <= panel.y + panel.height
      );
      
      if (clickedPanelIndex >= 0) {
        const clickedPanel = panelRects[clickedPanelIndex];
        const imageIndex = panelImageMapping[clickedPanel.panelId];
        const hasImage = imageIndex !== undefined && loadedImages[imageIndex];
        
        setSelectedPanel(clickedPanelIndex);
        
        // Check if this specific panel is in transform mode
        if (hasImage && isTransformMode[clickedPanel.panelId]) {
          // Prevent page scrolling only when touching an image in transform mode
          e.preventDefault();
          e.stopPropagation();
          setIsDragging(true);
          setDragStart({ x, y });
        } else {
          // Check if user tapped on text area (bottom third of panel)
          const textAreaY = clickedPanel.y + (clickedPanel.height * 0.67);
          if (y >= textAreaY) {
            // Tapping in text area opens text editor
            const currentText = panelTexts[clickedPanel.panelId]?.content || '';
            setDirectEditText(currentText);
            setDirectEditingPanel(clickedPanel.panelId);
          } else if (onPanelClick) {
            // Regular panel click
            onPanelClick(clickedPanel.index, clickedPanel.panelId);
          }
        }
      }
      // Note: When touched outside any panel, we allow normal scrolling by not calling preventDefault
    } else if (touches.length === 2 && selectedPanel !== null) {
      // Two touches - prepare for pinch zoom
      const panel = panelRects[selectedPanel];
      const imageIndex = panelImageMapping[panel.panelId];
      const hasImage = imageIndex !== undefined && loadedImages[imageIndex];
      
      if (panel && hasImage && isTransformMode[panel.panelId]) {
        // Only prevent page scrolling when performing pinch zoom on a panel in transform mode
        e.preventDefault();
        e.stopPropagation();
        const distance = getTouchDistance(touches);
        const currentTransform = panelTransforms[panel.panelId] || { scale: 1, positionX: 0, positionY: 0 };
        
        setTouchStartDistance(distance);
        setTouchStartScale(currentTransform.scale);
        setIsDragging(false); // Stop any ongoing drag
      }
    }
  }, [panelRects, isTransformMode, onPanelClick, selectedPanel, panelTransforms, panelImageMapping, loadedImages, getTouchDistance, panelTexts]);

  const handleTouchMove = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const touches = Array.from(e.touches);
    
    if (touches.length === 1 && isDragging && selectedPanel !== null) {
      // Single touch drag
      const panel = panelRects[selectedPanel];
      const imageIndex = panelImageMapping[panel.panelId];
      const hasImage = imageIndex !== undefined && loadedImages[imageIndex];
      
      if (panel && hasImage && isTransformMode[panel.panelId]) {
        // Prevent page scrolling only when dragging an image in transform mode
        e.preventDefault();
        e.stopPropagation();
        const touch = touches[0];
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        
        const deltaX = x - dragStart.x;
        const deltaY = y - dragStart.y;
        
        const currentTransform = panelTransforms[panel.panelId] || { scale: 1, positionX: 0, positionY: 0 };
        const img = loadedImages[imageIndex];
        
        if (img && updatePanelTransform) {
          // Same positioning logic as mouse drag
          const imageAspectRatio = img.naturalWidth / img.naturalHeight;
          const panelAspectRatio = panel.width / panel.height;
          
          let initialScale;
          if (imageAspectRatio > panelAspectRatio) {
            initialScale = panel.height / img.naturalHeight;
          } else {
            initialScale = panel.width / img.naturalWidth;
          }
          
          const finalScale = initialScale * currentTransform.scale;
          const scaledWidth = img.naturalWidth * finalScale;
          const scaledHeight = img.naturalHeight * finalScale;
          
          const centerOffsetX = (panel.width - scaledWidth) / 2;
          const centerOffsetY = (panel.height - scaledHeight) / 2;
          
          const newPositionX = currentTransform.positionX + deltaX;
          const newPositionY = currentTransform.positionY + deltaY;
          
          // Calculate bounds to prevent white space
          let minPositionX;
          let maxPositionX;
          let minPositionY;
          let maxPositionY;
          
          if (scaledWidth > panel.width) {
            maxPositionX = -centerOffsetX;
            minPositionX = panel.width - scaledWidth - centerOffsetX;
          } else {
            minPositionX = 0;
            maxPositionX = 0;
          }
          
          if (scaledHeight > panel.height) {
            maxPositionY = -centerOffsetY;
            minPositionY = panel.height - scaledHeight - centerOffsetY;
          } else {
            minPositionY = 0;
            maxPositionY = 0;
          }
          
          const clampedPositionX = Math.max(minPositionX, Math.min(maxPositionX, newPositionX));
          const clampedPositionY = Math.max(minPositionY, Math.min(maxPositionY, newPositionY));
          
          updatePanelTransform(panel.panelId, {
            ...currentTransform,
            positionX: clampedPositionX,
            positionY: clampedPositionY
          });
        }
        
        setDragStart({ x, y });
      }
    } else if (touches.length === 2 && selectedPanel !== null && touchStartDistance !== null) {
      // Two-finger pinch zoom
      const panel = panelRects[selectedPanel];
      const imageIndex = panelImageMapping[panel.panelId];
      const hasImage = imageIndex !== undefined && loadedImages[imageIndex];
      
      if (panel && hasImage && isTransformMode[panel.panelId]) {
        // Only prevent page scrolling when performing pinch zoom on a panel in transform mode
        e.preventDefault();
        e.stopPropagation();
        const currentDistance = getTouchDistance(touches);
        const scaleRatio = currentDistance / touchStartDistance;
        const newScale = touchStartScale * scaleRatio;
        
        // Get the center point of the pinch gesture
        const pinchCenter = getTouchCenter(touches);
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const pinchCenterX = pinchCenter.x - rect.left;
        const pinchCenterY = pinchCenter.y - rect.top;
        
        // Calculate pinch center position relative to the panel
        const panelPinchX = pinchCenterX - panel.x;
        const panelPinchY = pinchCenterY - panel.y;
        
        const currentTransform = panelTransforms[panel.panelId] || { scale: 1, positionX: 0, positionY: 0 };
        const img = loadedImages[imageIndex];
        
        if (img && updatePanelTransform) {
          // Calculate minimum scale (same logic as wheel handler)
          const imageAspectRatio = img.naturalWidth / img.naturalHeight;
          const panelAspectRatio = panel.width / panel.height;
          
          const minScale = 1;
          const clampedScale = Math.max(minScale, Math.min(5, newScale));
          
          // Calculate initial scale and current image dimensions
          const initialScale = imageAspectRatio > panelAspectRatio 
            ? panel.height / img.naturalHeight 
            : panel.width / img.naturalWidth;
          const currentFinalScale = initialScale * currentTransform.scale;
          const newFinalScale = initialScale * clampedScale;
          const currentScaledWidth = img.naturalWidth * currentFinalScale;
          const currentScaledHeight = img.naturalHeight * currentFinalScale;
          const newScaledWidth = img.naturalWidth * newFinalScale;
          const newScaledHeight = img.naturalHeight * newFinalScale;
          
          // Calculate current center offsets
          const currentCenterOffsetX = (panel.width - currentScaledWidth) / 2;
          const currentCenterOffsetY = (panel.height - currentScaledHeight) / 2;
          const newCenterOffsetX = (panel.width - newScaledWidth) / 2;
          const newCenterOffsetY = (panel.height - newScaledHeight) / 2;
          
          // Calculate the point on the image that corresponds to the pinch center (before scaling)
          const currentImageX = currentCenterOffsetX + currentTransform.positionX;
          const currentImageY = currentCenterOffsetY + currentTransform.positionY;
          const pointOnImageX = (panelPinchX - currentImageX) / currentFinalScale;
          const pointOnImageY = (panelPinchY - currentImageY) / currentFinalScale;
          
          // Calculate new position so the same point on the image stays under the pinch center
          const newImageX = panelPinchX - (pointOnImageX * newFinalScale);
          const newImageY = panelPinchY - (pointOnImageY * newFinalScale);
          const newPositionX = newImageX - newCenterOffsetX;
          const newPositionY = newImageY - newCenterOffsetY;
          
          // Calculate bounds to prevent white space and clamp the new position
          let minPositionX;
          let maxPositionX;
          let minPositionY;
          let maxPositionY;
          
          if (newScaledWidth > panel.width) {
            maxPositionX = -newCenterOffsetX;
            minPositionX = panel.width - newScaledWidth - newCenterOffsetX;
          } else {
            minPositionX = 0;
            maxPositionX = 0;
          }
          
          if (newScaledHeight > panel.height) {
            maxPositionY = -newCenterOffsetY;
            minPositionY = panel.height - newScaledHeight - newCenterOffsetY;
          } else {
            minPositionY = 0;
            maxPositionY = 0;
          }
          
          const clampedPositionX = Math.max(minPositionX, Math.min(maxPositionX, newPositionX));
          const clampedPositionY = Math.max(minPositionY, Math.min(maxPositionY, newPositionY));
          
          updatePanelTransform(panel.panelId, {
            ...currentTransform,
            scale: clampedScale,
            positionX: clampedPositionX,
            positionY: clampedPositionY
          });
        }
      }
    }
  }, [isDragging, selectedPanel, panelRects, isTransformMode, dragStart, panelTransforms, panelImageMapping, loadedImages, updatePanelTransform, touchStartDistance, touchStartScale, getTouchDistance, getTouchCenter]);

  const handleTouchEnd = useCallback((e) => {
    setIsDragging(false);
    setTouchStartDistance(null);
    setTouchStartScale(1);
  }, []);

  // Toggle transform mode for a panel
  const toggleTransformMode = useCallback((panelId) => {
    setIsTransformMode(prev => ({
      ...prev,
      [panelId]: !prev[panelId]
    }));
  }, []);

  // Get final canvas for export
  const getCanvasBlob = useCallback(() => {
    return new Promise((resolve) => {
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.toBlob(resolve, 'image/png');
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

  // Handle text editing
  const handleTextEdit = useCallback((panelId, event) => {
    if (isMobile) {
      // Mobile: Direct editing mode
      const currentText = panelTexts[panelId]?.content || '';
      setDirectEditText(currentText);
      setDirectEditingPanel(panelId);
    } else {
      // Desktop: Popover mode
      setTextEditingPanel(panelId);
      setTextEditAnchor(event.currentTarget);
    }
  }, [isMobile, panelTexts]);

  const handleTextClose = useCallback(() => {
    setTextEditingPanel(null);
    setTextEditAnchor(null);
  }, []);

  const handleDirectEditClose = useCallback(() => {
    if (directEditingPanel && updatePanelText) {
      const currentText = panelTexts[directEditingPanel] || {};
      updatePanelText(directEditingPanel, {
        ...currentText,
        content: directEditText
      });
    }
    setDirectEditingPanel(null);
    setDirectEditText('');
  }, [directEditingPanel, directEditText, panelTexts, updatePanelText]);

  const handleTextChange = useCallback((panelId, property, value) => {
    if (updatePanelText) {
      const currentText = panelTexts[panelId] || {};
      updatePanelText(panelId, {
        ...currentText,
        [property]: value
      });
    }
  }, [panelTexts, updatePanelText]);

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

  // Check if any panel has transform mode enabled for dynamic touch behavior
  const anyPanelInTransformMode = Object.values(isTransformMode).some(enabled => enabled);

  return (
    <Box ref={containerRef} sx={{ position: 'relative', width: '100%' }}>
      <canvas
        ref={canvasRef}
        data-testid="canvas-collage-preview"
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          display: 'block',
          width: '100%',
          height: 'auto',
          border: `1px solid ${theme.palette.divider}`,
          touchAction: anyPanelInTransformMode ? 'none' : 'auto', // Dynamic touch behavior
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
            
            {/* Text edit button */}
            <IconButton
              size="small"
              onClick={(e) => handleTextEdit(panelId, e)}
              sx={{
                position: 'absolute',
                top: rect.y + 8,
                left: rect.x + rect.width - (hasImage ? 104 : 56),
                width: 40,
                height: 40,
                backgroundColor: (panelTexts[panelId]?.content && panelTexts[panelId].content.trim()) ? '#4CAF50' : '#FF9800',
                color: '#ffffff',
                border: '2px solid #ffffff',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
                '&:hover': {
                  backgroundColor: (panelTexts[panelId]?.content && panelTexts[panelId].content.trim()) ? '#388E3C' : '#F57C00',
                  transform: 'scale(1.1)',
                },
                zIndex: 10,
              }}
            >
              {(panelTexts[panelId]?.content && panelTexts[panelId].content.trim()) ? 
                <Edit sx={{ fontSize: 16 }} /> : 
                <TextFields sx={{ fontSize: 16 }} />
              }
            </IconButton>
          </Box>
        );
      })}

      {/* Hover overlays - positioned over canvas panels */}
      {panelRects.map((rect, index) => {
        const { panelId } = rect;
        const imageIndex = panelImageMapping[panelId];
        const hasImage = imageIndex !== undefined && loadedImages[imageIndex];
        const isHovered = hoveredPanel === index;
        const isInTransformMode = isTransformMode[panelId];
        
        // Only show hover overlay when actually hovered and not in transform mode
        if (!isHovered || isInTransformMode) return null;
        
        return (
          <Box
            key={`hover-overlay-${panelId}`}
            sx={{
              position: 'absolute',
              top: rect.y,
              left: rect.x,
              width: rect.width,
              height: rect.height,
              backgroundColor: hasImage 
                ? 'rgba(0, 0, 0, 0.1)' // Light overlay for images
                : 'rgba(0, 0, 0, 0.4)', // Darker overlay for empty panels
              pointerEvents: 'none', // Don't interfere with mouse events
              transition: 'backgroundColor 0.2s ease-in-out',
              zIndex: 5, // Above canvas, below control buttons
            }}
          />
        );
      })}

      {/* Mobile direct text editing overlay */}
      {directEditingPanel && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              p: 2,
              backgroundColor: theme.palette.background.paper,
              borderBottom: `1px solid ${theme.palette.divider}`,
            }}
          >
            <Typography variant="h6">Edit Text</Typography>
            <IconButton onClick={handleDirectEditClose}>
              <Close />
            </IconButton>
          </Box>

          {/* Text input area */}
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 2 }}>
            <TextField
              fullWidth
              multiline
              rows={4}
              placeholder="Enter your text here..."
              value={directEditText}
              onChange={(e) => setDirectEditText(e.target.value)}
              autoFocus
              sx={{
                mb: 3,
                '& .MuiOutlinedInput-root': {
                  backgroundColor: theme.palette.background.paper,
                  fontSize: '18px',
                },
              }}
            />

            {/* Simple formatting controls */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, color: 'white' }}>
                Formatting
              </Typography>
              
              {/* Bold/Italic toggles */}
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <ToggleButtonGroup
                  value={[
                    (panelTexts[directEditingPanel]?.fontWeight === 'bold' || panelTexts[directEditingPanel]?.fontWeight === '700') && 'bold',
                    (panelTexts[directEditingPanel]?.fontStyle === 'italic') && 'italic'
                  ].filter(Boolean)}
                  onChange={(e, newFormats) => {
                    const isBold = newFormats.includes('bold');
                    const isItalic = newFormats.includes('italic');
                    handleTextChange(directEditingPanel, 'fontWeight', isBold ? 'bold' : 'normal');
                    handleTextChange(directEditingPanel, 'fontStyle', isItalic ? 'italic' : 'normal');
                  }}
                  size="small"
                >
                  <ToggleButton value="bold" sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}>
                    <FormatBold />
                  </ToggleButton>
                  <ToggleButton value="italic" sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}>
                    <FormatItalic />
                  </ToggleButton>
                </ToggleButtonGroup>
              </Box>

              {/* Font size slider */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ color: 'white', mb: 1 }}>
                  Size: {panelTexts[directEditingPanel]?.fontSize || lastUsedTextSettings.fontSize || 26}px
                </Typography>
                <Slider
                  value={panelTexts[directEditingPanel]?.fontSize || lastUsedTextSettings.fontSize || 26}
                  onChange={(e, value) => handleTextChange(directEditingPanel, 'fontSize', value)}
                  min={12}
                  max={48}
                  step={2}
                  sx={{
                    color: 'white',
                    '& .MuiSlider-thumb': {
                      backgroundColor: 'white',
                    },
                    '& .MuiSlider-track': {
                      backgroundColor: 'white',
                    },
                    '& .MuiSlider-rail': {
                      backgroundColor: 'rgba(255,255,255,0.3)',
                    },
                  }}
                />
              </Box>

              {/* Color picker */}
              <Box>
                <Typography variant="body2" sx={{ color: 'white', mb: 1 }}>
                  Color
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {['#ffffff', '#000000', '#ff4444', '#44ff44', '#4444ff', '#ffff44', '#ff44ff', '#44ffff'].map((color) => (
                    <Button
                      key={color}
                      onClick={() => handleTextChange(directEditingPanel, 'color', color)}
                      sx={{
                        width: 40,
                        height: 40,
                        minWidth: 40,
                        backgroundColor: color,
                        border: (panelTexts[directEditingPanel]?.color || lastUsedTextSettings.color || '#ffffff') === color 
                          ? '3px solid #2196F3' 
                          : '2px solid rgba(255,255,255,0.3)',
                        '&:hover': {
                          backgroundColor: color,
                          opacity: 0.8,
                        }
                      }}
                    />
                  ))}
                </Box>
              </Box>
            </Box>
          </Box>

          {/* Action buttons */}
          <Box
            sx={{
              p: 2,
              backgroundColor: theme.palette.background.paper,
              borderTop: `1px solid ${theme.palette.divider}`,
              display: 'flex',
              gap: 1,
            }}
          >
            <Button
              variant="outlined"
              onClick={() => {
                setDirectEditText('');
                if (directEditingPanel && updatePanelText) {
                  const currentText = panelTexts[directEditingPanel] || {};
                  updatePanelText(directEditingPanel, {
                    ...currentText,
                    content: ''
                  });
                }
                setDirectEditingPanel(null);
              }}
              sx={{ flex: 1 }}
            >
              Clear
            </Button>
            <Button
              variant="contained"
              onClick={handleDirectEditClose}
              sx={{ flex: 2 }}
            >
              Done
            </Button>
          </Box>
        </Box>
      )}

      {/* Desktop text editing popover (simplified) */}
      <Popover
        open={Boolean(textEditingPanel)}
        anchorEl={textEditAnchor}
        onClose={handleTextClose}
        anchorOrigin={{
          vertical: 'bottom', 
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
      >
        {textEditingPanel && (
          <Box sx={{ p: 2, minWidth: 280 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Edit Text</Typography>
              <IconButton size="small" onClick={handleTextClose}>
                <Close />
              </IconButton>
            </Box>
            
            {/* Text content */}
            <TextField
              fullWidth
              multiline
              rows={2}
              placeholder="Enter text..."
              value={panelTexts[textEditingPanel]?.content || ''}
              onChange={(e) => handleTextChange(textEditingPanel, 'content', e.target.value)}
              sx={{ mb: 2 }}
            />
            
            {/* Simple formatting */}
            <Box sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'center' }}>
              <ToggleButtonGroup
                value={[
                  (panelTexts[textEditingPanel]?.fontWeight === 'bold' || panelTexts[textEditingPanel]?.fontWeight === '700') && 'bold',
                  (panelTexts[textEditingPanel]?.fontStyle === 'italic') && 'italic'
                ].filter(Boolean)}
                onChange={(e, newFormats) => {
                  const isBold = newFormats.includes('bold');
                  const isItalic = newFormats.includes('italic');
                  handleTextChange(textEditingPanel, 'fontWeight', isBold ? 'bold' : 'normal');
                  handleTextChange(textEditingPanel, 'fontStyle', isItalic ? 'italic' : 'normal');
                }}
                size="small"
              >
                <ToggleButton value="bold">
                  <FormatBold />
                </ToggleButton>
                <ToggleButton value="italic">
                  <FormatItalic />
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>

            {/* Font size */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" gutterBottom>
                Size: {panelTexts[textEditingPanel]?.fontSize || lastUsedTextSettings.fontSize || 26}px
              </Typography>
              <Slider
                value={panelTexts[textEditingPanel]?.fontSize || lastUsedTextSettings.fontSize || 26}
                onChange={(e, value) => handleTextChange(textEditingPanel, 'fontSize', value)}
                min={12}
                max={48}
                step={2}
                size="small"
              />
            </Box>
            
            {/* Color picker */}
            <Box>
              <Typography variant="body2" gutterBottom>Color</Typography>
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                {['#ffffff', '#000000', '#ff4444', '#44ff44', '#4444ff', '#ffff44'].map((color) => (
                  <Button
                    key={color}
                    onClick={() => handleTextChange(textEditingPanel, 'color', color)}
                    sx={{
                      width: 32,
                      height: 32,
                      minWidth: 32,
                      backgroundColor: color,
                      border: (panelTexts[textEditingPanel]?.color || lastUsedTextSettings.color || '#ffffff') === color 
                        ? '2px solid #2196F3' 
                        : '1px solid #ccc',
                      '&:hover': {
                        backgroundColor: color,
                        opacity: 0.8,
                      }
                    }}
                  />
                ))}
              </Box>
            </Box>
          </Box>
        )}
      </Popover>
    </Box>
  );
};

export default CanvasCollagePreview; 