import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Box, IconButton, Typography, useMediaQuery } from "@mui/material";
import { useTheme, styled, alpha } from "@mui/material/styles";
import { Add, OpenWith, Check } from '@mui/icons-material';
import { layoutDefinitions } from '../config/layouts';
import CaptionEditor from './CaptionEditor';



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
        return foundLayout.getLayoutConfig();
      }
    }
    
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
 * Helper function to detect draggable border zones
 */
const detectBorderZones = (layoutConfig, containerWidth, containerHeight, borderPixels) => {
  if (!layoutConfig) return [];
  
  const zones = [];
  // Make threshold larger for mobile - minimum 16px hit area for better touch interaction
  const threshold = Math.max(16, borderPixels * 2);
  
  // Parse grid columns and rows to get track sizes
  let columnSizes = [1];
  let rowSizes = [1];
  
  if (layoutConfig.gridTemplateColumns) {
    if (layoutConfig.gridTemplateColumns.includes('repeat(')) {
      const repeatMatch = layoutConfig.gridTemplateColumns.match(/repeat\((\d+),/);
      if (repeatMatch) {
        const count = parseInt(repeatMatch[1], 10);
        columnSizes = Array(count).fill(1);
      }
    } else {
      const frMatches = layoutConfig.gridTemplateColumns.match(/(\d*\.?\d*)fr/g);
      if (frMatches) {
        columnSizes = frMatches.map(match => {
          const value = match.replace('fr', '');
          return value === '' ? 1 : parseFloat(value);
        });
      }
    }
  }
  
  if (layoutConfig.gridTemplateRows) {
    if (layoutConfig.gridTemplateRows.includes('repeat(')) {
      const repeatMatch = layoutConfig.gridTemplateRows.match(/repeat\((\d+),/);
      if (repeatMatch) {
        const count = parseInt(repeatMatch[1], 10);
        rowSizes = Array(count).fill(1);
      }
    } else {
      const frMatches = layoutConfig.gridTemplateRows.match(/(\d*\.?\d*)fr/g);
      if (frMatches) {
        rowSizes = frMatches.map(match => {
          const value = match.replace('fr', '');
          return value === '' ? 1 : parseFloat(value);
        });
      }
    }
  }
  
  // Only create zones if we have multiple columns or rows
  if (columnSizes.length <= 1 && rowSizes.length <= 1) {
    return [];
  }
  
  // Calculate positions of grid lines
  const totalColumnFr = columnSizes.reduce((sum, size) => sum + size, 0);
  const totalRowFr = rowSizes.reduce((sum, size) => sum + size, 0);
  
  const horizontalGaps = Math.max(0, columnSizes.length - 1) * borderPixels;
  const verticalGaps = Math.max(0, rowSizes.length - 1) * borderPixels;
  
  const availableWidth = containerWidth - (borderPixels * 2) - horizontalGaps;
  const availableHeight = containerHeight - (borderPixels * 2) - verticalGaps;
  
  const columnFrUnit = availableWidth / totalColumnFr;
  const rowFrUnit = availableHeight / totalRowFr;
  
  // Create vertical border zones (between columns) - only if we have multiple columns
  if (columnSizes.length > 1) {
    let currentX = borderPixels;
    for (let i = 0; i < columnSizes.length - 1; i += 1) {
      currentX += columnSizes[i] * columnFrUnit;
      
      zones.push({
        type: 'vertical',
        index: i,
        x: currentX - threshold / 2,
        y: 0,
        width: threshold,
        height: containerHeight,
        centerX: currentX,
        cursor: 'col-resize',
        id: `vertical-${i}` // Add ID for debugging
      });
      
      currentX += borderPixels;
    }
  }
  
  // Create horizontal border zones (between rows) - only if we have multiple rows
  if (rowSizes.length > 1) {
    let currentY = borderPixels;
    for (let i = 0; i < rowSizes.length - 1; i += 1) {
      currentY += rowSizes[i] * rowFrUnit;
      
      zones.push({
        type: 'horizontal',
        index: i,
        x: 0,
        y: currentY - threshold / 2,
        width: containerWidth,
        height: threshold,
        centerY: currentY,
        cursor: 'row-resize',
        id: `horizontal-${i}` // Add ID for debugging
      });
      
      currentY += borderPixels;
    }
  }
  
  return zones;
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
  isGeneratingCollage = false, // New prop to exclude placeholder text during export
}) => {
  const theme = useTheme();
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
  const [touchStartDistance, setTouchStartDistance] = useState(null);
  const [touchStartScale, setTouchStartScale] = useState(1);
  const lastInteractionTime = useRef(0);
  const hoverTimeoutRef = useRef(null);
  const touchStartInfo = useRef(null);

  // Border dragging state
  const [borderZones, setBorderZones] = useState([]);
  const [isDraggingBorder, setIsDraggingBorder] = useState(false);
  const [draggedBorder, setDraggedBorder] = useState(null);
  const [borderDragStart, setBorderDragStart] = useState({ x: 0, y: 0 });
  const [hoveredBorder, setHoveredBorder] = useState(null);
  const [customLayoutConfig, setCustomLayoutConfig] = useState(null);

  // Mobile detection for slider fix
  const isMobile = useMediaQuery((theme) => theme.breakpoints.down('md'));

  // Base canvas size for text scaling calculations
  const BASE_CANVAS_WIDTH = 400;
  
  // Calculate text scale factor based on current canvas size vs base size
  const textScaleFactor = useMemo(() => {
    return componentWidth / BASE_CANVAS_WIDTH;
  }, [componentWidth]);

  // Get layout configuration
  const layoutConfig = useMemo(() => {
    // Use custom layout if available, otherwise create from template
    if (customLayoutConfig) {
      return customLayoutConfig;
    }
    return selectedTemplate ? createLayoutConfig(selectedTemplate, panelCount) : null;
  }, [selectedTemplate, panelCount, customLayoutConfig]);

  // Calculate border pixels
  const borderPixels = getBorderPixelSize(borderThickness, componentWidth);



  // Border dragging helper functions
  const updateLayoutWithBorderDrag = useCallback((borderZone, deltaX, deltaY) => {
    if (!layoutConfig) {
      return;
    }
    
    // Parse current grid configuration
    let columnSizes = [1];
    let rowSizes = [1];
    
    if (layoutConfig.gridTemplateColumns) {
      if (layoutConfig.gridTemplateColumns.includes('repeat(')) {
        const repeatMatch = layoutConfig.gridTemplateColumns.match(/repeat\((\d+),/);
        if (repeatMatch) {
          const count = parseInt(repeatMatch[1], 10);
          columnSizes = Array(count).fill(1);
        }
      } else {
        const frMatches = layoutConfig.gridTemplateColumns.match(/(\d*\.?\d*)fr/g);
        if (frMatches) {
          columnSizes = frMatches.map(match => {
            const value = match.replace('fr', '');
            return value === '' ? 1 : parseFloat(value);
          });
        }
      }
    }
    
    if (layoutConfig.gridTemplateRows) {
      if (layoutConfig.gridTemplateRows.includes('repeat(')) {
        const repeatMatch = layoutConfig.gridTemplateRows.match(/repeat\((\d+),/);
        if (repeatMatch) {
          const count = parseInt(repeatMatch[1], 10);
          rowSizes = Array(count).fill(1);
        }
      } else {
        const frMatches = layoutConfig.gridTemplateRows.match(/(\d*\.?\d*)fr/g);
        if (frMatches) {
          rowSizes = frMatches.map(match => {
            const value = match.replace('fr', '');
            return value === '' ? 1 : parseFloat(value);
          });
        }
      }
    }
    
    // Calculate available space for adjustment
    const horizontalGaps = Math.max(0, columnSizes.length - 1) * borderPixels;
    const verticalGaps = Math.max(0, rowSizes.length - 1) * borderPixels;
    const availableWidth = componentWidth - (borderPixels * 2) - horizontalGaps;
    const availableHeight = componentHeight - (borderPixels * 2) - verticalGaps;
    
    const totalColumnFr = columnSizes.reduce((sum, size) => sum + size, 0);
    const totalRowFr = rowSizes.reduce((sum, size) => sum + size, 0);
    
    const columnFrUnit = availableWidth / totalColumnFr;
    const rowFrUnit = availableHeight / totalRowFr;
    
    const newColumnSizes = [...columnSizes];
    const newRowSizes = [...rowSizes];
    let changed = false;
    
    if (borderZone.type === 'vertical') {
      // Adjust column sizes
      const leftIndex = borderZone.index;
      const rightIndex = borderZone.index + 1;
      
      if (leftIndex < newColumnSizes.length && rightIndex < newColumnSizes.length) {
        // Convert pixel delta to fractional unit delta
        const frDelta = deltaX / columnFrUnit;
        
        // More generous minimum size constraint (5% of average size)
        const minSize = totalColumnFr / columnSizes.length * 0.05;
        
        // Calculate new sizes
        const newLeftSize = Math.max(minSize, newColumnSizes[leftIndex] + frDelta);
        const newRightSize = Math.max(minSize, newColumnSizes[rightIndex] - frDelta);
        
        // Only apply if both sizes are above minimum
        if (newLeftSize >= minSize && newRightSize >= minSize) {
          newColumnSizes[leftIndex] = newLeftSize;
          newColumnSizes[rightIndex] = newRightSize;
          changed = true;
        }
      }
    } else if (borderZone.type === 'horizontal') {
      // Adjust row sizes
      const topIndex = borderZone.index;
      const bottomIndex = borderZone.index + 1;
      
      if (topIndex < newRowSizes.length && bottomIndex < newRowSizes.length) {
        // Convert pixel delta to fractional unit delta
        const frDelta = deltaY / rowFrUnit;
        
        // More generous minimum size constraint (5% of average size)
        const minSize = totalRowFr / rowSizes.length * 0.05;
        
        // Calculate new sizes
        const newTopSize = Math.max(minSize, newRowSizes[topIndex] + frDelta);
        const newBottomSize = Math.max(minSize, newRowSizes[bottomIndex] - frDelta);
        
        // Only apply if both sizes are above minimum
        if (newTopSize >= minSize && newBottomSize >= minSize) {
          newRowSizes[topIndex] = newTopSize;
          newRowSizes[bottomIndex] = newBottomSize;
          changed = true;
        }
      }
    }
    
    // Only update if something actually changed
    if (changed) {
      // Create new layout config with updated sizes
      const newLayoutConfig = {
        ...layoutConfig,
        gridTemplateColumns: newColumnSizes.map(size => `${size}fr`).join(' '),
        gridTemplateRows: newRowSizes.map(size => `${size}fr`).join(' ')
      };
      
      setCustomLayoutConfig(newLayoutConfig);
    }
  }, [layoutConfig, borderPixels, componentWidth, componentHeight]);

  const findBorderZone = useCallback((x, y) => {
    const found = borderZones.find(zone => 
      x >= zone.x && x <= zone.x + zone.width &&
      y >= zone.y && y <= zone.y + zone.height
    );
    return found;
  }, [borderZones]);

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
          
          // Update border zones for dragging
          const zones = detectBorderZones(layoutConfig, width, height, borderPixels);
          setBorderZones(zones);
        }
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    
    return () => window.removeEventListener('resize', updateDimensions);
  }, [aspectRatioValue, layoutConfig, panelCount, borderPixels]);

  // Helper function to calculate optimal font size for text to fit in panel
  const calculateOptimalFontSize = useCallback((text, panelWidth, panelHeight) => {
    if (!text || !text.trim()) return 26; // Default size for empty text
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const textPadding = 10;
    const maxTextWidth = panelWidth - (textPadding * 2);
    const maxTextHeight = panelHeight * 0.4; // Use up to 40% of panel height for text
    
    // Calculate a reasonable maximum font size based on panel dimensions
    // Use 15% of panel height as a reasonable upper bound, but cap at 48px
    const reasonableMaxSize = Math.min(48, Math.max(16, panelHeight * 0.15));
    
    // Start with a reasonable size and work down
    for (let fontSize = reasonableMaxSize; fontSize >= 8; fontSize -= 2) {
      ctx.font = `700 ${fontSize}px Arial`; // Use bold Arial as baseline
      
      // Simple word wrapping to estimate lines
      const words = text.split(' ');
      const lines = [];
      let currentLine = '';
      
      words.forEach(word => {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        if (ctx.measureText(testLine).width <= maxTextWidth) {
          currentLine = testLine;
        } else {
          if (currentLine) {
            lines.push(currentLine);
          }
          currentLine = word;
        }
      });
      
      if (currentLine) {
        lines.push(currentLine);
      }
      
      // Check if text fits within height constraints
      const lineHeight = fontSize * 1.2;
      const totalTextHeight = lines.length * lineHeight;
      
      if (totalTextHeight <= maxTextHeight) {
        return Math.max(fontSize, 12); // Minimum font size of 12
      }
    }
    
    return 12; // Fallback minimum size
  }, []);

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
      
      // Draw text at the bottom of the panel (or placeholder if no text and has image)
      if (hasImage) {
        const hasActualText = panelText.content && panelText.content.trim();
        const shouldShowPlaceholder = !hasActualText && !isGeneratingCollage;
        
        if (hasActualText || shouldShowPlaceholder) {
          ctx.save();
          
          // Clip text to frame boundaries - text beyond frame is hidden (window effect)
          ctx.beginPath();
          ctx.rect(x, y, width, height);
          ctx.clip();
          
          // Set text properties (use last used settings as defaults)
          let baseFontSize = panelText.fontSize || lastUsedTextSettings.fontSize || 32;
          
          // Auto-calculate optimal font size if no explicit size is set and there's actual text
          if (hasActualText && !panelText.fontSize) {
            const optimalSize = calculateOptimalFontSize(panelText.content, width, height);
            baseFontSize = optimalSize;
          }
          
          // Scale font size based on canvas size
          const fontSize = baseFontSize * textScaleFactor;
          const fontWeight = panelText.fontWeight || lastUsedTextSettings.fontWeight || 400;
          const fontStyle = panelText.fontStyle || lastUsedTextSettings.fontStyle || 'normal';
          const fontFamily = panelText.fontFamily || lastUsedTextSettings.fontFamily || 'Arial';
          const baseTextColor = panelText.color || lastUsedTextSettings.color || '#ffffff';
          const strokeWidth = panelText.strokeWidth || lastUsedTextSettings.strokeWidth || 2;
          const textPositionX = panelText.textPositionX !== undefined ? panelText.textPositionX : (lastUsedTextSettings.textPositionX || 0);
          const textPositionY = panelText.textPositionY !== undefined ? panelText.textPositionY : (lastUsedTextSettings.textPositionY || 0); // Default to baseline bottom position
          const textRotation = panelText.textRotation !== undefined ? panelText.textRotation : (lastUsedTextSettings.textRotation || 0);
          
          // Apply different opacity for placeholder vs actual text
          let textColor;
          let strokeColor;
          let shadowColor;
          if (hasActualText) {
            textColor = baseTextColor;
            strokeColor = '#000000'; // Black stroke for contrast
            shadowColor = 'rgba(0, 0, 0, 0.8)';
          } else {
            // For placeholder, use the same default styling but with reduced opacity
            // Parse the base color to apply opacity
            if (baseTextColor.startsWith('#')) {
              // Convert hex to rgba with opacity
              const hex = baseTextColor.slice(1);
              const r = parseInt(hex.substr(0, 2), 16);
              const g = parseInt(hex.substr(2, 2), 16);
              const b = parseInt(hex.substr(4, 2), 16);
              textColor = `rgba(${r}, ${g}, ${b}, 0.4)`; // 40% opacity for placeholder
            } else if (baseTextColor.startsWith('rgb')) {
              // Handle rgba/rgb colors
              const rgbMatch = baseTextColor.match(/rgba?\(([^)]+)\)/);
              if (rgbMatch) {
                const values = rgbMatch[1].split(',').map(v => v.trim());
                textColor = `rgba(${values[0]}, ${values[1]}, ${values[2]}, 0.4)`;
              } else {
                textColor = 'rgba(255, 255, 255, 0.4)'; // Fallback
              }
            } else {
              textColor = 'rgba(255, 255, 255, 0.4)'; // Fallback
            }
            strokeColor = 'rgba(0, 0, 0, 0.4)'; // Same stroke color with reduced opacity
            shadowColor = 'rgba(0, 0, 0, 0.3)'; // Same shadow color with reduced opacity
          }
          
          ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
          ctx.fillStyle = textColor;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle'; // Change to middle for better positioning control
          
          // Set stroke properties for both actual text and placeholder
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = strokeWidth;
          ctx.lineJoin = 'round';
          ctx.lineCap = 'round';
          
          // Add text shadow for better readability
          ctx.shadowColor = shadowColor;
          ctx.shadowOffsetX = 1;
          ctx.shadowOffsetY = 1;
          ctx.shadowBlur = 3;
          
          // Calculate available text area (with padding on sides and bottom)
          const textPadding = 10;
          const maxTextWidth = width - (textPadding * 2);
          
          // Calculate text position based on position settings
          // textPositionX: -100 (left) to 100 (right), 0 = center
          // textPositionY: -100 (bottom anchored) to 100 (top anchored), 0 = default bottom position
          const textX = x + (width / 2) + (textPositionX / 100) * (width / 2 - textPadding);
          
          const lineHeight = fontSize * 1.2;
          
          // Use actual text or placeholder text
          const displayText = hasActualText ? panelText.content : 'Add Caption';
          
          // Helper function to wrap text with aggressive character-level fallback
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
                    
                    // Check if the single word is still too long
                    if (ctx.measureText(word).width > maxWidth) {
                      // Break the word character by character
                      let charLine = '';
                      for (let i = 0; i < word.length; i += 1) {
                        const testChar = charLine + word[i];
                        if (ctx.measureText(testChar).width <= maxWidth) {
                          charLine = testChar;
                        } else {
                          if (charLine) {
                            lines.push(charLine);
                          }
                          charLine = word[i];
                        }
                      }
                      if (charLine) {
                        lines.push(charLine);
                      }
                      currentLine = '';
                    }
                  } else {
                    // Single word is too long, break it character by character
                    let charLine = '';
                    for (let i = 0; i < word.length; i += 1) {
                      const testChar = charLine + word[i];
                      if (ctx.measureText(testChar).width <= maxWidth) {
                        charLine = testChar;
                      } else {
                        if (charLine) {
                          lines.push(charLine);
                        }
                        charLine = word[i];
                      }
                    }
                    if (charLine) {
                      lines.push(charLine);
                    }
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
          
          // Get wrapped lines
          const wrappedLines = wrapText(displayText, maxTextWidth);
          
          // Calculate text block positioning with proper anchoring
          const totalTextHeight = wrappedLines.length * lineHeight;
          
          // Improved vertical positioning logic:
          // textPositionY = -100: bottom edge of text at bottom of panel (y + height - textPadding)
          // textPositionY = 0: bottom edge of text at 95% of panel height (default position)
          // textPositionY = 100: top edge of text at top of panel (y + textPadding)
          
          let textAnchorY;
          if (textPositionY <= 0) {
            // Position between default bottom (95%) and beyond frame bottom edge
            const defaultBottomPosition = y + (height * 0.95);
            const extendedBottomPosition = y + height + (height * 0.1); // Allow text to extend 10% beyond frame bottom
            const t = Math.abs(textPositionY) / 100; // 0 to 1
            textAnchorY = defaultBottomPosition + t * (extendedBottomPosition - defaultBottomPosition);
            // Text is anchored by its bottom edge
          } else {
            // Position between default bottom (95%) and frame top edge (0%)
            const defaultBottomPosition = y + (height * 0.95);
            const frameTopPosition = y; // Allow text to extend to frame edge
            const t = textPositionY / 100; // 0 to 1
            textAnchorY = defaultBottomPosition + t * (frameTopPosition - defaultBottomPosition);
            // Text is anchored by its bottom edge
          }
          
          // Calculate where the first line should start (top of text block)
          const startY = textAnchorY - totalTextHeight + (lineHeight / 2);
          
          // Apply rotation transformation if needed
          if (textRotation !== 0) {
            ctx.save();
            // Translate to the center of the text block
            const textCenterX = textX;
            const textCenterY = textAnchorY - totalTextHeight / 2;
            ctx.translate(textCenterX, textCenterY);
            ctx.rotate((textRotation * Math.PI) / 180);
            ctx.translate(-textCenterX, -textCenterY);
          }
          
          wrappedLines.forEach((line, lineIndex) => {
            const lineY = startY + lineIndex * lineHeight;
            
            // Draw stroke first if stroke width > 0 (for both actual text and placeholder)
            if (strokeWidth > 0) {
              ctx.strokeText(line, textX, lineY);
            }
            
            // Then draw the fill text on top
            ctx.fillText(line, textX, lineY);
          });
          
          // Restore transformation if rotation was applied
          if (textRotation !== 0) {
            ctx.restore();
          }
          
          ctx.restore();
        }
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
    lastUsedTextSettings,
    theme.palette.mode,
    isGeneratingCollage,
    calculateOptimalFontSize,
    textScaleFactor
  ]);

  // Helper function to calculate text area dimensions for a panel
  const getTextAreaBounds = useCallback((panel, panelText) => {
    if (!panel) return null;
    
    // Get text properties (same as in drawCanvas)
    const baseFontSize = panelText?.fontSize || lastUsedTextSettings.fontSize || 26;
    const scaledFontSize = baseFontSize * textScaleFactor;
    const textPadding = 10; // Visual padding for text rendering
    const activationPadding = 1; // Extremely tight padding for activation area
    const lineHeight = scaledFontSize * 1.2;
    const textPositionX = panelText?.textPositionX !== undefined ? panelText.textPositionX : (lastUsedTextSettings.textPositionX || 0);
    const textPositionY = panelText?.textPositionY !== undefined ? panelText.textPositionY : (lastUsedTextSettings.textPositionY || 0);
    const textRotation = panelText?.textRotation !== undefined ? panelText.textRotation : (lastUsedTextSettings.textRotation || 0);
    
    // Determine display text (actual text or placeholder)
    const hasActualText = panelText?.content && panelText.content.trim();
    const displayText = hasActualText ? panelText.content : 'Add Caption';
    
    // Use the same accurate text measurement logic as drawCanvas
    const maxTextWidth = panel.width - (textPadding * 2);
    
    // Create temporary canvas for accurate text measurement
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    
    // Set font properties exactly like in drawCanvas
    const fontWeight = panelText?.fontWeight || lastUsedTextSettings.fontWeight || 400;
    const fontStyle = panelText?.fontStyle || lastUsedTextSettings.fontStyle || 'normal';
    const fontFamily = panelText?.fontFamily || lastUsedTextSettings.fontFamily || 'Arial';
    tempCtx.font = `${fontStyle} ${fontWeight} ${scaledFontSize}px ${fontFamily}`;
    
    // Helper function to wrap text with the same logic as drawCanvas
    const wrapText = (text, maxWidth) => {
      const lines = [];
      const manualLines = text.split('\n'); // Handle manual line breaks first
      
      manualLines.forEach(line => {
        if (tempCtx.measureText(line).width <= maxWidth) {
          // Line fits within width
          lines.push(line);
        } else {
          // Line needs to be wrapped
          const words = line.split(' ');
          let currentLine = '';
          
          words.forEach(word => {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            const testWidth = tempCtx.measureText(testLine).width;
            
            if (testWidth <= maxWidth) {
              currentLine = testLine;
            } else if (currentLine) {
              // Current line is full, start a new line
              lines.push(currentLine);
              currentLine = word;
              
              // Check if the single word is still too long
              if (tempCtx.measureText(word).width > maxWidth) {
                // Break the word character by character
                let charLine = '';
                for (let i = 0; i < word.length; i += 1) {
                  const testChar = charLine + word[i];
                  if (tempCtx.measureText(testChar).width <= maxWidth) {
                    charLine = testChar;
                  } else {
                    if (charLine) {
                      lines.push(charLine);
                    }
                    charLine = word[i];
                  }
                }
                if (charLine) {
                  lines.push(charLine);
                }
                currentLine = '';
              }
            } else {
              // Single word is too long, break it character by character
              let charLine = '';
              for (let i = 0; i < word.length; i += 1) {
                const testChar = charLine + word[i];
                if (tempCtx.measureText(testChar).width <= maxWidth) {
                  charLine = testChar;
                } else {
                  if (charLine) {
                    lines.push(charLine);
                  }
                  charLine = word[i];
                }
              }
              if (charLine) {
                lines.push(charLine);
              }
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
    
    // Get wrapped lines using accurate measurement
    const wrappedLines = wrapText(displayText, maxTextWidth);
    const actualLines = wrappedLines.length;
    
    // Calculate actual text width from the wrapped lines
    const actualTextWidth = Math.max(...wrappedLines.map(line => tempCtx.measureText(line).width));
    
    // Calculate actual text dimensions
    const actualTextHeight = actualLines * lineHeight;
    
    // Calculate text position based on position settings (same as drawCanvas)
    const textX = panel.x + (panel.width / 2) + (textPositionX / 100) * (panel.width / 2 - textPadding);
    
    // Use the same improved vertical positioning logic as in drawCanvas
    let textAnchorY;
    if (textPositionY <= 0) {
      // Position between default bottom (95%) and beyond frame bottom edge
      const defaultBottomPosition = panel.y + (panel.height * 0.95);
      const extendedBottomPosition = panel.y + panel.height + (panel.height * 0.1); // Allow text to extend 10% beyond frame bottom
      const t = Math.abs(textPositionY) / 100; // 0 to 1
      textAnchorY = defaultBottomPosition + t * (extendedBottomPosition - defaultBottomPosition);
      // Text is anchored by its bottom edge
    } else {
      // Position between default bottom (95%) and frame top edge (0%)
      const defaultBottomPosition = panel.y + (panel.height * 0.95);
      const frameTopPosition = panel.y; // Allow text to extend to frame edge
      const t = textPositionY / 100; // 0 to 1
      textAnchorY = defaultBottomPosition + t * (frameTopPosition - defaultBottomPosition);
      // Text is anchored by its bottom edge
    }
    
    // Calculate where the text block starts (top of text block)
    const textBlockY = textAnchorY - actualTextHeight;
    
    // Calculate activation area bounds around the actual text block position
    let activationAreaHeight = actualTextHeight + (activationPadding * 2);
    let activationAreaWidth = actualTextWidth + (activationPadding * 2);
    let activationAreaX = textX - (activationAreaWidth / 2);
    let activationAreaY = textBlockY - activationPadding;
    
    // If rotation is applied, calculate rotated bounds
    if (textRotation !== 0) {
      const textCenterX = textX;
      const textCenterY = textAnchorY - actualTextHeight / 2;
      const radians = (textRotation * Math.PI) / 180;
      const cos = Math.cos(radians);
      const sin = Math.sin(radians);
      
      // Calculate corners of unrotated text box
      const corners = [
        { x: activationAreaX, y: activationAreaY },
        { x: activationAreaX + activationAreaWidth, y: activationAreaY },
        { x: activationAreaX + activationAreaWidth, y: activationAreaY + activationAreaHeight },
        { x: activationAreaX, y: activationAreaY + activationAreaHeight }
      ];
      
      // Rotate corners around text center
      const rotatedCorners = corners.map(corner => {
        const dx = corner.x - textCenterX;
        const dy = corner.y - textCenterY;
        return {
          x: textCenterX + dx * cos - dy * sin,
          y: textCenterY + dx * sin + dy * cos
        };
      });
      
      // Calculate bounding box of rotated text
      const minX = Math.min(...rotatedCorners.map(c => c.x));
      const maxX = Math.max(...rotatedCorners.map(c => c.x));
      const minY = Math.min(...rotatedCorners.map(c => c.y));
      const maxY = Math.max(...rotatedCorners.map(c => c.y));
      
      activationAreaX = minX;
      activationAreaY = minY;
      activationAreaWidth = maxX - minX;
      activationAreaHeight = maxY - minY;
    }
    
    return {
      x: Math.max(panel.x, Math.min(panel.x + panel.width - activationAreaWidth, activationAreaX)), // Keep within panel bounds
      y: Math.max(panel.y, Math.min(panel.y + panel.height - activationAreaHeight, activationAreaY)), // Keep within panel bounds
      width: Math.min(activationAreaWidth, panel.width), // Don't exceed panel width
      height: Math.min(activationAreaHeight, panel.height), // Don't exceed panel height
      actualTextY: textAnchorY,
      actualTextHeight
    };
  }, [lastUsedTextSettings, textScaleFactor]);

  // Handle text editing
  const handleTextEdit = useCallback((panelId, event) => {
    const isOpening = textEditingPanel !== panelId;
    setTextEditingPanel(textEditingPanel === panelId ? null : panelId);
    
    // Auto-scroll to show the caption editor after it opens
    if (isOpening) {
      setTimeout(() => {
        const panel = panelRects.find(p => p.panelId === panelId);
        if (panel && containerRef.current) {
          const container = containerRef.current;
          const containerRect = container.getBoundingClientRect();
          
          // Calculate the expanded editor dimensions
          const editorHeight = 185; // Height estimate for expanded editor
          const editorTop = panel.y + panel.height; // Editor starts at bottom of panel
          const editorBottom = editorTop + editorHeight;
          
          // Get current viewport dimensions
          const viewportHeight = window.innerHeight;
          const currentScrollY = window.scrollY;
          
          // Account for mobile keyboard
          const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
          const keyboardHeight = isMobileDevice ? 300 : 0;
          
          // Account for fixed bottom "Generate Collage" button
          let bottomBarHeight = 0;
          
          // Look for fixed positioned elements at the bottom of the viewport
          const allElements = document.querySelectorAll('*');
          allElements.forEach(el => {
            const computedStyle = window.getComputedStyle(el);
            if (computedStyle.position === 'fixed') {
              const rect = el.getBoundingClientRect();
              // Check if element is positioned at or near the bottom of the viewport
              if (rect.bottom >= viewportHeight - 5 && rect.top > viewportHeight * 0.7) {
                // Element spans across most of the width (likely a bottom bar)
                if (rect.width > viewportHeight * 0.5) {
                  bottomBarHeight = Math.max(bottomBarHeight, rect.height);
                }
              }
            }
          });
          
          // If no bottom bar detected but we can find a "Generate Collage" button, assume standard height
          if (bottomBarHeight === 0) {
            // Look for buttons with "Generate" text
            const buttons = document.querySelectorAll('button');
            let generateButton = null;
            buttons.forEach(btn => {
              if (btn.textContent && btn.textContent.toLowerCase().includes('generate')) {
                generateButton = btn;
              }
            });
            
            if (generateButton) {
              // Check if the button or its container is fixed positioned
              let element = generateButton;
              while (element && element !== document.body) {
                const style = window.getComputedStyle(element);
                if (style.position === 'fixed') {
                  const rect = element.getBoundingClientRect();
                  if (rect.bottom >= viewportHeight - 20) {
                    bottomBarHeight = Math.max(bottomBarHeight, rect.height + 20); // Add some padding
                    break;
                  }
                }
                element = element.parentElement;
              }
            }
          }
          
          const extraPadding = isMobileDevice ? 60 : 50; // Padding for comfortable viewing
          const availableViewportHeight = viewportHeight - keyboardHeight - bottomBarHeight;
          
          // Calculate absolute positions relative to the page
          const containerOffsetTop = containerRect.top + currentScrollY;
          const absoluteEditorTop = containerOffsetTop + editorTop;
          const absoluteEditorBottom = containerOffsetTop + editorBottom;
          
          // Calculate visible viewport bounds
          const viewportTop = currentScrollY;
          const viewportBottom = currentScrollY + availableViewportHeight;
          
          // Check if the entire editor is visible in the viewport
          const editorTopVisible = absoluteEditorTop >= viewportTop;
          const editorBottomVisible = absoluteEditorBottom <= viewportBottom;
          const entireEditorVisible = editorTopVisible && editorBottomVisible;
          
          // Calculate how much of the editor is cut off
          const editorTopCutoff = Math.max(0, viewportTop - absoluteEditorTop);
          const editorBottomCutoff = Math.max(0, absoluteEditorBottom - viewportBottom);
          const totalCutoff = editorTopCutoff + editorBottomCutoff;
          
          // On mobile, be more conservative about scrolling to preserve collage visibility
          // But ensure we can always show the Done button above the Generate Collage button
          const maxScrollDistance = isMobileDevice ? viewportHeight * 0.3 : viewportHeight * 0.6;
          const minVisibleCutoff = isMobileDevice ? 40 : 20; // Minimum cutoff before we bother scrolling
          
          // If the entire editor is not visible and cutoff is significant, scroll to make it visible
          if (!entireEditorVisible && totalCutoff > minVisibleCutoff) {
            let targetScrollY = currentScrollY;
            
            // Prioritize showing the bottom (action buttons) since that's most important
            if (editorBottomCutoff > minVisibleCutoff) {
              // Calculate scroll needed to show bottom with padding
              const scrollToShowBottom = absoluteEditorBottom - availableViewportHeight + extraPadding;
              const scrollDistance = scrollToShowBottom - currentScrollY;
              
              // Limit scroll distance on mobile to preserve top content
              if (Math.abs(scrollDistance) <= maxScrollDistance) {
                targetScrollY = scrollToShowBottom;
              } else {
                // Compromise: scroll part way to show some of the editor
                targetScrollY = currentScrollY + (scrollDistance > 0 ? maxScrollDistance : -maxScrollDistance);
              }
            }
            // If only the top is cut off (and bottom is visible), scroll up slightly
            else if (editorTopCutoff > minVisibleCutoff) {
              const scrollToShowTop = absoluteEditorTop - extraPadding;
              const scrollDistance = scrollToShowTop - currentScrollY;
              
              if (Math.abs(scrollDistance) <= maxScrollDistance) {
                targetScrollY = scrollToShowTop;
              } else {
                // Compromise: scroll part way
                targetScrollY = currentScrollY + (scrollDistance > 0 ? maxScrollDistance : -maxScrollDistance);
              }
            }
            
            // Ensure we don't scroll to negative values
            targetScrollY = Math.max(0, targetScrollY);
            
            // Only scroll if there's a meaningful change
            if (Math.abs(targetScrollY - currentScrollY) > 10) {
              window.scrollTo({
                top: targetScrollY,
                behavior: 'smooth'
              });
            }
          }
        }
      }, 100); // Small delay to ensure editor is rendered
    }
  }, [textEditingPanel, panelRects]);

  const handleTextClose = useCallback(() => {
    setTextEditingPanel(null);
  }, []);





  // Redraw canvas when dependencies change
  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);



  // Reset custom layout when template changes
  useEffect(() => {
    setCustomLayoutConfig(null);
  }, [selectedTemplate]);

  // Global mouse/touch handlers for border dragging
  useEffect(() => {
    const handleGlobalMouseMove = (e) => {
      if (isDraggingBorder && draggedBorder && containerRef.current) {
        e.preventDefault();
        const rect = containerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const deltaX = x - borderDragStart.x;
        const deltaY = y - borderDragStart.y;
        
        updateLayoutWithBorderDrag(draggedBorder, deltaX, deltaY);
        setBorderDragStart({ x, y });
      }
    };

    const handleGlobalTouchMove = (e) => {
      if (isDraggingBorder && draggedBorder && containerRef.current && e.touches.length === 1) {
        e.preventDefault();
        const rect = containerRef.current.getBoundingClientRect();
        const touch = e.touches[0];
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        const deltaX = x - borderDragStart.x;
        const deltaY = y - borderDragStart.y;
        
        updateLayoutWithBorderDrag(draggedBorder, deltaX, deltaY);
        setBorderDragStart({ x, y });
      }
    };

    const handleGlobalMouseUp = () => {
      if (isDraggingBorder) {
        setIsDraggingBorder(false);
        setDraggedBorder(null);
      }
    };

    const handleGlobalTouchEnd = () => {
      if (isDraggingBorder) {
        setIsDraggingBorder(false);
        setDraggedBorder(null);
      }
    };

    if (isDraggingBorder) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
      document.addEventListener('touchmove', handleGlobalTouchMove, { passive: false });
      document.addEventListener('touchend', handleGlobalTouchEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      document.removeEventListener('touchmove', handleGlobalTouchMove);
      document.removeEventListener('touchend', handleGlobalTouchEnd);
    };
  }, [isDraggingBorder, draggedBorder, borderDragStart, updateLayoutWithBorderDrag]);

  // Cleanup hover timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }
    };
  }, []);



  // Handle mouse events
  const handleMouseMove = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Handle border dragging
    if (isDraggingBorder && draggedBorder) {
      const deltaX = x - borderDragStart.x;
      const deltaY = y - borderDragStart.y;
      
      updateLayoutWithBorderDrag(draggedBorder, deltaX, deltaY);
      setBorderDragStart({ x, y });
      return;
    }
    
    // Check for border zones first (they have priority)
    const borderZone = findBorderZone(x, y);
    const anyPanelInTransformMode = Object.values(isTransformMode).some(enabled => enabled);
    
    // Find which panel is under the mouse
    const hoveredPanelIndex = panelRects.findIndex(panel => 
      x >= panel.x && x <= panel.x + panel.width &&
      y >= panel.y && y <= panel.y + panel.height
    );
    
    // Check if mouse is over text area (actual text area bounds)
    let isOverTextArea = false;
    if (hoveredPanelIndex >= 0 && !borderZone) {
      const panel = panelRects[hoveredPanelIndex];
      const imageIndex = panelImageMapping[panel.panelId];
      const hasImage = imageIndex !== undefined && loadedImages[imageIndex];
      const panelText = panelTexts[panel.panelId] || {};
      const hasTextOrPlaceholder = hasImage;
      
      // Only check text area if no panel is in transform mode and not over a border
      if (hasTextOrPlaceholder && !anyPanelInTransformMode) {
        // Get precise text area bounds
        const textAreaBounds = getTextAreaBounds(panel, panelText);
        if (textAreaBounds) {
          isOverTextArea = x >= textAreaBounds.x && 
                          x <= textAreaBounds.x + textAreaBounds.width &&
                          y >= textAreaBounds.y && 
                          y <= textAreaBounds.y + textAreaBounds.height;
        }
      }
    }
    
    // Update border hover state
    if (borderZone !== hoveredBorder) {
      setHoveredBorder(borderZone);
    }

    if (hoveredPanelIndex !== hoveredPanel) {
      // Clear any existing hover timeout
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }
      
      // If we're leaving a panel (hovering over nothing), clear immediately
      if (hoveredPanelIndex < 0) {
        setHoveredPanel(null);
      } else {
        // If hovering over a panel, add a small delay to prevent hover during scroll
        hoverTimeoutRef.current = setTimeout(() => {
          setHoveredPanel(hoveredPanelIndex);
          hoverTimeoutRef.current = null;
        }, 50); // 50ms delay prevents hover during scroll but is fast enough for normal interaction
      }
    }
    
    // Determine cursor based on interaction state
    let cursor = 'default';
    
    // Border zones have highest priority for cursor
    if (borderZone && !anyPanelInTransformMode && textEditingPanel === null) {
      cursor = borderZone.cursor;
    } else if (hoveredPanelIndex >= 0 && !borderZone) {
      const panel = panelRects[hoveredPanelIndex];
      
      if (anyPanelInTransformMode) {
        // Only show interactive cursor for the panel that's actually in transform mode
        if (isTransformMode[panel.panelId]) {
          cursor = 'grab'; // Transform mode cursor
        } else {
          cursor = 'default'; // Non-interactive cursor for other panels
        }
      } else if (textEditingPanel !== null) {
        // When caption editor is open, only show interactive cursor for the panel being edited
        if (panel.panelId === textEditingPanel) {
          cursor = isOverTextArea ? 'text' : 'pointer';
        } else {
          cursor = 'default'; // Default cursor for inactive frames
        }
      } else {
        // Normal mode - show appropriate cursor for all panels
        cursor = isOverTextArea ? 'text' : 'pointer';
      }
    }
    
    canvas.style.cursor = cursor;
    
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
  }, [panelRects, hoveredPanel, isDragging, selectedPanel, dragStart, isTransformMode, panelTransforms, updatePanelTransform, panelImageMapping, loadedImages, panelTexts, getTextAreaBounds, findBorderZone, isDraggingBorder, draggedBorder, borderDragStart, updateLayoutWithBorderDrag, hoveredBorder, textEditingPanel]);

  // Function to dismiss transform mode for all panels
  const dismissTransformMode = useCallback(() => {
    setIsTransformMode({});
  }, []);

  const handleMouseDown = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Check for border zone clicks first
    const borderZone = findBorderZone(x, y);
    const anyPanelInTransformMode = Object.values(isTransformMode).some(enabled => enabled);
    
    if (borderZone && !anyPanelInTransformMode && textEditingPanel === null) {
      // Start border dragging
      setIsDraggingBorder(true);
      setDraggedBorder(borderZone);
      setBorderDragStart({ x, y });
      return;
    }
    
    const clickedPanelIndex = panelRects.findIndex(panel => 
      x >= panel.x && x <= panel.x + panel.width &&
      y >= panel.y && y <= panel.y + panel.height
    );
    
    if (clickedPanelIndex >= 0) {
      const clickedPanel = panelRects[clickedPanelIndex];
      const imageIndex = panelImageMapping[clickedPanel.panelId];
      const hasImage = imageIndex !== undefined && loadedImages[imageIndex];
      const anyPanelInTransformMode = Object.values(isTransformMode).some(enabled => enabled);
      
            // If a caption editor is open and this is not the panel being edited, ignore the click
      if (textEditingPanel !== null && textEditingPanel !== clickedPanel.panelId) {
        return;
      }
      
      // Check if click is in text area (actual text area bounds)
      let isTextAreaClick = false;
      if (hasImage && !anyPanelInTransformMode) {
        const panelText = panelTexts[clickedPanel.panelId] || {};
        const textAreaBounds = getTextAreaBounds(clickedPanel, panelText);
        if (textAreaBounds) {
          isTextAreaClick = x >= textAreaBounds.x && 
                           x <= textAreaBounds.x + textAreaBounds.width &&
                           y >= textAreaBounds.y && 
                           y <= textAreaBounds.y + textAreaBounds.height;
        }
      }
      
      // If clicking on text area, open caption editor
      if (isTextAreaClick) {
        handleTextEdit(clickedPanel.panelId, e);
        return;
      }
      
      // If any panel is in transform mode, only allow interaction with that specific panel
      if (anyPanelInTransformMode) {
        // Only allow transform interactions on the panel that's actually in transform mode
        if (isTransformMode[clickedPanel.panelId]) {
          setSelectedPanel(clickedPanelIndex);
          setIsDragging(true);
          setDragStart({ x, y });
        } else {
          // Clicked on a different panel while in transform mode - dismiss transform mode
          dismissTransformMode();
        }
        return;
      }
      
      setSelectedPanel(clickedPanelIndex);
      
      // Check if this panel is in transform mode
      if (isTransformMode[clickedPanel.panelId]) {
        setIsDragging(true);
        setDragStart({ x, y });
      } else if (onPanelClick && textEditingPanel === null) {
        // Regular panel click - only allow when no caption editor is open
        onPanelClick(clickedPanel.index, clickedPanel.panelId);
      }
    }
  }, [panelRects, isTransformMode, onPanelClick, textEditingPanel, panelImageMapping, loadedImages, handleTextEdit, panelTexts, getTextAreaBounds, findBorderZone]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsDraggingBorder(false);
    setDraggedBorder(null);
  }, []);

  const handleMouseLeave = useCallback(() => {
    // Clear any pending hover timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    // Clear hover state when mouse leaves canvas
    setHoveredPanel(null);
    setHoveredBorder(null);
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.style.cursor = 'default';
    }
  }, []);

  const handleWheel = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // If any panel is in transform mode, check if we're over it
    const anyPanelInTransformMode = Object.values(isTransformMode).some(enabled => enabled);
    if (!anyPanelInTransformMode) return; // Allow normal scrolling if no transform mode
    
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
        // Only prevent default if cursor is over the specific panel that's in transform mode
        e.preventDefault();
        e.stopPropagation();
        // Auto-select this panel for zoom operation
        if (selectedPanel !== hoveredPanelIndex) {
          setSelectedPanel(hoveredPanelIndex);
        }
        
        // Make zoom smoother by using actual delta values
        // Normalize deltaY across different browsers/devices
        let delta = e.deltaY;
        if (e.deltaMode === 1) { // Line mode
          delta *= 16; // Approximate pixels per line
        } else if (e.deltaMode === 2) { // Page mode
          delta *= 100; // Approximate pixels per page
        }
        
        // Calculate smooth scale change based on delta
        // Smaller values = smoother zoom
        const zoomSpeed = 0.005; // Adjust this to control zoom sensitivity - increased for faster zooming
        const scaleChange = Math.exp(-delta * zoomSpeed);
        
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

  // Add wheel event listener with passive: false to ensure preventDefault works
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      // Return a no-op cleanup function to maintain consistency
      return () => {};
    }

    const handleWheelWithOptions = (e) => {
      handleWheel(e);
    };

    // Add wheel listener with passive: false to allow preventDefault
    canvas.addEventListener('wheel', handleWheelWithOptions, { passive: false });

    return () => {
      canvas.removeEventListener('wheel', handleWheelWithOptions);
    };
  }, [handleWheel]);

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
  // eslint-disable-next-line consistent-return
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
      
      // Simple debounce: ignore rapid successive taps (likely from scroll momentum)
      const now = Date.now();
      if (now - lastInteractionTime.current < 100) {
        return;
      }
      lastInteractionTime.current = now;
      
      const clickedPanelIndex = panelRects.findIndex(panel => 
        x >= panel.x && x <= panel.x + panel.width &&
        y >= panel.y && y <= panel.y + panel.height
      );
      
      // Check for border zone touches first
      const borderZone = findBorderZone(x, y);
      const anyPanelInTransformMode = Object.values(isTransformMode).some(enabled => enabled);
      
      if (borderZone && !anyPanelInTransformMode && textEditingPanel === null) {
        // Start border dragging
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingBorder(true);
        setDraggedBorder(borderZone);
        setBorderDragStart({ x, y });
        return;
      }

      if (clickedPanelIndex >= 0) {
        const clickedPanel = panelRects[clickedPanelIndex];
        const imageIndex = panelImageMapping[clickedPanel.panelId];
        const hasImage = imageIndex !== undefined && loadedImages[imageIndex];
        
        // If a caption editor is open and this is not the panel being edited, allow normal scrolling
        if (textEditingPanel !== null && textEditingPanel !== clickedPanel.panelId) {
          // Don't preventDefault - allow normal page scrolling
          return;
        }
        
        // Check if touch is in text area (actual text area bounds)
        let isTextAreaTouch = false;
        if (hasImage && !anyPanelInTransformMode) {
          const panelText = panelTexts[clickedPanel.panelId] || {};
          const textAreaBounds = getTextAreaBounds(clickedPanel, panelText);
          if (textAreaBounds) {
            isTextAreaTouch = x >= textAreaBounds.x && 
                             x <= textAreaBounds.x + textAreaBounds.width &&
                             y >= textAreaBounds.y && 
                             y <= textAreaBounds.y + textAreaBounds.height;
          }
        }
        
        // If touching on text area, store info to check on touch end
        // This allows us to differentiate between tap and scroll
        if (isTextAreaTouch) {
          touchStartInfo.current = {
            panelId: clickedPanel.panelId,
            startX: touch.clientX,
            startY: touch.clientY,
            startTime: Date.now(),
            isTextArea: true
          };
          return;
        }
        
        // If any panel is in transform mode, prevent default to stop page scroll
        if (anyPanelInTransformMode) {
          e.preventDefault();
          e.stopPropagation();
          
          // Only allow transform interactions on the panel that's actually in transform mode
          if (hasImage && isTransformMode[clickedPanel.panelId]) {
            setSelectedPanel(clickedPanelIndex);
            setIsDragging(true);
            setDragStart({ x, y });
          } else {
            // Touched on a different panel while in transform mode - store info to dismiss on touch end
            touchStartInfo.current = {
              panelId: clickedPanel.panelId,
              startX: touch.clientX,
              startY: touch.clientY,
              startTime: Date.now(),
              dismissTransformMode: true
            };
          }
          return;
        }
        
        setSelectedPanel(clickedPanelIndex);
        
        // Check if this specific panel is in transform mode
        if (hasImage && isTransformMode[clickedPanel.panelId]) {
          // Prevent page scrolling only when touching an image in transform mode
          e.preventDefault();
          e.stopPropagation();
          setIsDragging(true);
          setDragStart({ x, y });
        } else if (onPanelClick && textEditingPanel === null) {
          // Allow normal touch behavior for panels not in transform mode
          // Regular panel click - only allow when no caption editor is open
          onPanelClick(clickedPanel.index, clickedPanel.panelId);
        }
      } else if (textEditingPanel !== null) {
        // When touched outside any panel and caption editor is open, explicitly allow normal scrolling
        // Don't preventDefault - allow normal page scrolling when caption editor is open
      } else if (anyPanelInTransformMode) {
        // If touched outside panels but transform mode is active, store info to dismiss on touch end
        e.preventDefault();
        e.stopPropagation();
        touchStartInfo.current = {
          panelId: null,
          startX: touch.clientX,
          startY: touch.clientY,
          startTime: Date.now(),
          dismissTransformMode: true
        };
      }
    } else if (touches.length === 2) {
      // Two touches - prepare for pinch zoom
      // If any panel is in transform mode, prevent default to stop page zoom
      if (anyPanelInTransformMode) {
        e.preventDefault();
        e.stopPropagation();
        
        if (selectedPanel !== null) {
          const panel = panelRects[selectedPanel];
          const imageIndex = panelImageMapping[panel.panelId];
          const hasImage = imageIndex !== undefined && loadedImages[imageIndex];
          
          if (panel && hasImage && isTransformMode[panel.panelId]) {
            const distance = getTouchDistance(touches);
            const currentTransform = panelTransforms[panel.panelId] || { scale: 1, positionX: 0, positionY: 0 };
            
            setTouchStartDistance(distance);
            setTouchStartScale(currentTransform.scale);
            setIsDragging(false); // Stop any ongoing drag
          }
        }
      }
    }
  }, [panelRects, isTransformMode, onPanelClick, selectedPanel, panelTransforms, panelImageMapping, loadedImages, getTouchDistance, textEditingPanel, handleTextEdit, panelTexts, getTextAreaBounds, findBorderZone]);

  const handleTouchMove = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // If any panel is in transform mode, we need to handle this specially
    const anyPanelInTransformMode = Object.values(isTransformMode).some(enabled => enabled);
    
    // If we're tracking a potential text area tap, check for movement
    if (touchStartInfo.current && touchStartInfo.current.isTextArea) {
      const touch = e.touches[0];
      const deltaX = Math.abs(touch.clientX - touchStartInfo.current.startX);
      const deltaY = Math.abs(touch.clientY - touchStartInfo.current.startY);
      
      // If the touch has moved significantly, it's a scroll, not a tap
      const scrollThreshold = 10; // pixels
      if (deltaX > scrollThreshold || deltaY > scrollThreshold) {
        touchStartInfo.current = null; // Cancel the potential tap
      }
    }
    
    const rect = canvas.getBoundingClientRect();
    const touches = Array.from(e.touches);
    
    // If any panel is in transform mode and we're interacting, prevent scrolling
    if (anyPanelInTransformMode && (isDragging || touchStartDistance !== null)) {
      e.preventDefault();
      e.stopPropagation();
    }

    // Handle border dragging
    if (isDraggingBorder && draggedBorder && touches.length === 1) {
      e.preventDefault();
      e.stopPropagation();
      
      const touch = touches[0];
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      
      const deltaX = x - borderDragStart.x;
      const deltaY = y - borderDragStart.y;
      
      updateLayoutWithBorderDrag(draggedBorder, deltaX, deltaY);
      setBorderDragStart({ x, y });
      return;
    }
    
    if (touches.length === 1 && isDragging && selectedPanel !== null) {
      // Single touch drag
      const panel = panelRects[selectedPanel];
      const imageIndex = panelImageMapping[panel.panelId];
      const hasImage = imageIndex !== undefined && loadedImages[imageIndex];
      
      if (panel && hasImage && isTransformMode[panel.panelId]) {
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
  }, [isDragging, selectedPanel, panelRects, isTransformMode, dragStart, panelTransforms, panelImageMapping, loadedImages, updatePanelTransform, touchStartDistance, touchStartScale, getTouchDistance, getTouchCenter, isDraggingBorder, draggedBorder, borderDragStart, updateLayoutWithBorderDrag]);

  const handleTouchEnd = useCallback((e) => {
    setIsDragging(false);
    setIsDraggingBorder(false);
    setDraggedBorder(null);
    setTouchStartDistance(null);
    setTouchStartScale(1);
    
    // Check if this was a tap on text area
    if (touchStartInfo.current && touchStartInfo.current.isTextArea && e.changedTouches && e.changedTouches[0]) {
      const touch = e.changedTouches[0];
      const deltaX = Math.abs(touch.clientX - touchStartInfo.current.startX);
      const deltaY = Math.abs(touch.clientY - touchStartInfo.current.startY);
      const deltaTime = Date.now() - touchStartInfo.current.startTime;
      
      // If the touch didn't move much and was quick, treat it as a tap
      const maxMovement = 10; // pixels
      const maxDuration = 500; // milliseconds
      
      if (deltaX < maxMovement && deltaY < maxMovement && deltaTime < maxDuration) {
        // This was a tap, open the caption editor
        handleTextEdit(touchStartInfo.current.panelId, e);
      }
    }
    
    // Check if this was a tap to dismiss transform mode
    if (touchStartInfo.current && touchStartInfo.current.dismissTransformMode && e.changedTouches && e.changedTouches[0]) {
      const touch = e.changedTouches[0];
      const deltaX = Math.abs(touch.clientX - touchStartInfo.current.startX);
      const deltaY = Math.abs(touch.clientY - touchStartInfo.current.startY);
      const deltaTime = Date.now() - touchStartInfo.current.startTime;
      
      // If the touch didn't move much and was quick, treat it as a tap
      const maxMovement = 10; // pixels
      const maxDuration = 500; // milliseconds
      
      if (deltaX < maxMovement && deltaY < maxMovement && deltaTime < maxDuration) {
        // This was a tap on a non-active frame, dismiss transform mode
        dismissTransformMode();
      }
    }
    
    // Always clear touchStartInfo
    touchStartInfo.current = null;
  }, [handleTextEdit, dismissTransformMode]);

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
        // Temporarily set the generating flag to exclude placeholder text
        const originalGenerating = isGeneratingCollage;
        
        // Create a temporary canvas for export without placeholder text
        const exportCanvas = document.createElement('canvas');
        const exportCtx = exportCanvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        
        exportCanvas.width = componentWidth * dpr;
        exportCanvas.height = componentHeight * dpr;
        exportCtx.scale(dpr, dpr);
        
        // Clear canvas
        exportCtx.clearRect(0, 0, componentWidth, componentHeight);
        
        // Draw background (border color if borders are enabled)
        if (borderPixels > 0) {
          exportCtx.fillStyle = borderColor;
          exportCtx.fillRect(0, 0, componentWidth, componentHeight);
        }
        
        // Draw panels without placeholder text
        panelRects.forEach((rect) => {
          const { x, y, width, height, panelId } = rect;
          const imageIndex = panelImageMapping[panelId];
          const hasImage = imageIndex !== undefined && loadedImages[imageIndex];
          const transform = panelTransforms[panelId] || { scale: 1, positionX: 0, positionY: 0 };
          const panelText = panelTexts[panelId] || {};
          
          // Draw panel background
          exportCtx.fillStyle = hasImage 
            ? (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)')
            : 'rgba(0,0,0,0.3)';
          exportCtx.fillRect(x, y, width, height);
          
          if (hasImage) {
            const img = loadedImages[imageIndex];
            if (img) {
              exportCtx.save();
              
              // Clip to panel bounds
              exportCtx.beginPath();
              exportCtx.rect(x, y, width, height);
              exportCtx.clip();
              
              // Calculate initial scale to cover the panel
              const imageAspectRatio = img.naturalWidth / img.naturalHeight;
              const panelAspectRatio = width / height;
              
              let initialScale;
              if (imageAspectRatio > panelAspectRatio) {
                initialScale = height / img.naturalHeight;
              } else {
                initialScale = width / img.naturalWidth;
              }
              
              const finalScale = initialScale * transform.scale;
              const scaledWidth = img.naturalWidth * finalScale;
              const scaledHeight = img.naturalHeight * finalScale;
              
              const centerOffsetX = (width - scaledWidth) / 2;
              const centerOffsetY = (height - scaledHeight) / 2;
              
              const finalOffsetX = centerOffsetX + transform.positionX;
              const finalOffsetY = centerOffsetY + transform.positionY;
              
              exportCtx.drawImage(
                img,
                x + finalOffsetX,
                y + finalOffsetY,
                scaledWidth,
                scaledHeight
              );
              
              exportCtx.restore();
            }
          } else {
            // Draw add icon for empty panels
            const iconSize = Math.min(width, height) * 0.3;
            const iconX = x + (width - iconSize) / 2;
            const iconY = y + (height - iconSize) / 2;
            
            exportCtx.fillStyle = '#2196F3';
            exportCtx.beginPath();
            exportCtx.arc(iconX + iconSize/2, iconY + iconSize/2, iconSize/2, 0, Math.PI * 2);
            exportCtx.fill();
            
            exportCtx.strokeStyle = '#ffffff';
            exportCtx.lineWidth = 3;
            exportCtx.beginPath();
            exportCtx.moveTo(iconX + iconSize * 0.25, iconY + iconSize/2);
            exportCtx.lineTo(iconX + iconSize * 0.75, iconY + iconSize/2);
            exportCtx.moveTo(iconX + iconSize/2, iconY + iconSize * 0.25);
            exportCtx.lineTo(iconX + iconSize/2, iconY + iconSize * 0.75);
            exportCtx.stroke();
          }
          
          // Draw only actual text (not placeholder) for export
          if (hasImage && panelText.content && panelText.content.trim()) {
            exportCtx.save();
            
            // Clip text to frame boundaries in export - text beyond frame is hidden (window effect)
            exportCtx.beginPath();
            exportCtx.rect(x, y, width, height);
            exportCtx.clip();
            
            let baseFontSize = panelText.fontSize || lastUsedTextSettings.fontSize || 26;
            
            // Auto-calculate optimal font size if no explicit size is set and there's actual text
            if (panelText.content && panelText.content.trim() && !panelText.fontSize) {
              const optimalSize = calculateOptimalFontSize(panelText.content, width, height);
              baseFontSize = optimalSize;
            }
            
            // Scale font size based on canvas size for export
            const fontSize = baseFontSize * textScaleFactor;
            const fontWeight = panelText.fontWeight || lastUsedTextSettings.fontWeight || 400;
            const fontStyle = panelText.fontStyle || lastUsedTextSettings.fontStyle || 'normal';
            const fontFamily = panelText.fontFamily || lastUsedTextSettings.fontFamily || 'Arial';
            const textColor = panelText.color || lastUsedTextSettings.color || '#ffffff';
            const strokeWidth = panelText.strokeWidth || lastUsedTextSettings.strokeWidth || 2;
            const textPositionX = panelText.textPositionX !== undefined ? panelText.textPositionX : (lastUsedTextSettings.textPositionX || 0);
            const textPositionY = panelText.textPositionY !== undefined ? panelText.textPositionY : (lastUsedTextSettings.textPositionY || 0);
            const textRotation = panelText.textRotation !== undefined ? panelText.textRotation : (lastUsedTextSettings.textRotation || 0);
            
            exportCtx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
            exportCtx.fillStyle = textColor;
            exportCtx.textAlign = 'center';
            exportCtx.textBaseline = 'middle';
            exportCtx.strokeStyle = '#000000';
            exportCtx.lineWidth = strokeWidth;
            exportCtx.lineJoin = 'round';
            exportCtx.lineCap = 'round';
            exportCtx.shadowColor = 'rgba(0, 0, 0, 0.8)';
            exportCtx.shadowOffsetX = 1;
            exportCtx.shadowOffsetY = 1;
            exportCtx.shadowBlur = 3;
            
            const textPadding = 10;
            const maxTextWidth = width - (textPadding * 2);
            const textX = x + (width / 2) + (textPositionX / 100) * (width / 2 - textPadding);
            
            const lineHeight = fontSize * 1.2;
            
            // Use the same text wrapping logic as the preview to ensure consistency
            const wrapText = (text, maxWidth) => {
              const lines = [];
              const manualLines = text.split('\n'); // Handle manual line breaks first
              
              manualLines.forEach(line => {
                if (exportCtx.measureText(line).width <= maxWidth) {
                  // Line fits within width
                  lines.push(line);
                } else {
                  // Line needs to be wrapped
                  const words = line.split(' ');
                  let currentLine = '';
                  
                  words.forEach(word => {
                    const testLine = currentLine ? `${currentLine} ${word}` : word;
                    const testWidth = exportCtx.measureText(testLine).width;
                    
                    if (testWidth <= maxWidth) {
                      currentLine = testLine;
                    } else if (currentLine) {
                      // Current line is full, start a new line
                      lines.push(currentLine);
                      currentLine = word;
                      
                      // Check if the single word is still too long
                      if (exportCtx.measureText(word).width > maxWidth) {
                        // Break the word character by character
                        let charLine = '';
                        for (let i = 0; i < word.length; i += 1) {
                          const testChar = charLine + word[i];
                          if (exportCtx.measureText(testChar).width <= maxWidth) {
                            charLine = testChar;
                          } else {
                            if (charLine) {
                              lines.push(charLine);
                            }
                            charLine = word[i];
                          }
                        }
                        if (charLine) {
                          lines.push(charLine);
                        }
                        currentLine = '';
                      }
                    } else {
                      // Single word is too long, break it character by character
                      let charLine = '';
                      for (let i = 0; i < word.length; i += 1) {
                        const testChar = charLine + word[i];
                        if (exportCtx.measureText(testChar).width <= maxWidth) {
                          charLine = testChar;
                        } else {
                          if (charLine) {
                            lines.push(charLine);
                          }
                          charLine = word[i];
                        }
                      }
                      if (charLine) {
                        lines.push(charLine);
                      }
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
            
            // Get wrapped lines using the same logic as preview
            const lines = wrapText(panelText.content, maxTextWidth);
            
            // Calculate text block positioning with proper anchoring (same as drawCanvas)
            const totalTextHeight = lines.length * lineHeight;
            
            let textAnchorY;
            if (textPositionY <= 0) {
              // Position between default bottom (95%) and beyond frame bottom edge
              const defaultBottomPosition = y + (height * 0.95);
              const extendedBottomPosition = y + height + (height * 0.1); // Allow text to extend 10% beyond frame bottom
              const t = Math.abs(textPositionY) / 100; // 0 to 1
              textAnchorY = defaultBottomPosition + t * (extendedBottomPosition - defaultBottomPosition);
            } else {
              // Position between default bottom (95%) and frame top edge (0%)
              const defaultBottomPosition = y + (height * 0.95);
              const frameTopPosition = y; // Allow text to extend to frame edge
              const t = textPositionY / 100; // 0 to 1
              textAnchorY = defaultBottomPosition + t * (frameTopPosition - defaultBottomPosition);
            }
            
            // Calculate where the first line should start (top of text block)
            const startY = textAnchorY - totalTextHeight + (lineHeight / 2);
            
            // Apply rotation transformation if needed
            if (textRotation !== 0) {
              exportCtx.save();
              // Translate to the center of the text block
              const textCenterX = textX;
              const textCenterY = textAnchorY - totalTextHeight / 2;
              exportCtx.translate(textCenterX, textCenterY);
              exportCtx.rotate((textRotation * Math.PI) / 180);
              exportCtx.translate(-textCenterX, -textCenterY);
            }
            
            lines.forEach((line, lineIndex) => {
              const lineY = startY + lineIndex * lineHeight;
              if (strokeWidth > 0) {
                exportCtx.strokeText(line, textX, lineY);
              }
              exportCtx.fillText(line, textX, lineY);
            });
            
            // Restore transformation if rotation was applied
            if (textRotation !== 0) {
              exportCtx.restore();
            }
            
            exportCtx.restore();
          }
        });
        
        exportCanvas.toBlob(resolve, 'image/png');
      } else {
        resolve(null);
      }
    });
  }, [componentWidth, componentHeight, panelRects, loadedImages, panelImageMapping, panelTransforms, borderPixels, borderColor, panelTexts, lastUsedTextSettings, theme.palette.mode, calculateOptimalFontSize, textScaleFactor]);

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

  // Check if any panel has transform mode enabled for dynamic touch behavior
  const anyPanelInTransformMode = Object.values(isTransformMode).some(enabled => enabled);

  return (
    <Box 
      ref={containerRef} 
      sx={{ 
        position: 'relative', 
        width: '100%', 
        overflow: 'visible',
        // Prevent text selection during drag operations
        userSelect: 'none',
        WebkitUserSelect: 'none',
        // Optimize touch interactions
        WebkitTapHighlightColor: 'transparent',
        // Visual feedback when in transform mode
        ...(anyPanelInTransformMode && {
          boxShadow: '0 0 0 2px #2196F3',
          borderRadius: '4px',
          transition: 'box-shadow 0.2s ease-in-out',
        }),
      }}
    >
              <canvas
          ref={canvasRef}
          data-testid="canvas-collage-preview"
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
                  style={{
            display: 'block',
            width: '100%',
            height: 'auto',
            border: `1px solid ${theme.palette.divider}`,
            position: 'relative',
            zIndex: 2, // Above backdrop to allow interactions
            // Dynamic touch action based on transform mode
            touchAction: anyPanelInTransformMode ? 'none' : 'pan-y pinch-zoom', // Disable all touch gestures when in transform mode
          }}
      />
      
      {/* Control panels positioned over canvas */}
      {panelRects.map((rect) => {
        const { panelId, index } = rect;
        const imageIndex = panelImageMapping[panelId];
        const hasImage = imageIndex !== undefined && loadedImages[imageIndex];
        const isInTransformMode = isTransformMode[panelId];
        
        // Calculate responsive dimensions based on panel size with mobile-friendly minimums
        const minPanelSize = Math.min(rect.width, rect.height);
        const isMobileSize = minPanelSize < 200; // Detect mobile-sized panels
        
        // Use larger minimums for mobile touch targets
        const collapsedHeight = Math.max(isMobileSize ? 28 : 24, Math.min(40, minPanelSize * 0.15));
        const sidePadding = Math.max(isMobileSize ? 6 : 4, Math.min(12, rect.width * 0.02));
        const tabSize = Math.max(isMobileSize ? 28 : 22, Math.min(32, minPanelSize * 0.12)); // Slightly smaller but still touch-friendly
        const fontSize = Math.max(isMobileSize ? 11 : 10, Math.min(14, minPanelSize * 0.08));
        const borderRadius = Math.max(3, Math.min(8, minPanelSize * 0.02));
        
        // Calculate dynamic expanded height based on content needs
        const tabRowHeight = tabSize + (isMobileSize ? 12 : 8); // Tab height + margin
        const contentAreaHeight = isMobileSize ? 80 : 65; // More space for content (text field, sliders, etc.)
        const containerPadding = (isMobileSize ? 12 : 8); // Top/bottom padding
        const expandedHeight = Math.max(
          tabRowHeight + contentAreaHeight + containerPadding,
          isMobileSize ? 120 : 100 // Ensure minimum usable height
        );
        
        return (
          <Box key={`controls-${panelId}`}>
            {/* Transform control button */}
            {hasImage && textEditingPanel === null && 
             (!anyPanelInTransformMode || isInTransformMode) && 
             !isDraggingBorder && (
                          <IconButton
              size="small"
              onClick={() => toggleTransformMode(panelId)}
              sx={{
                position: 'absolute',
                top: rect.y + 8,
                left: rect.x + rect.width - 48, // Simplified positioning
                width: 40,
                height: 40,
                backgroundColor: isInTransformMode ? '#4CAF50' : '#2196F3',
                color: '#ffffff',
                border: '2px solid #ffffff',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
                opacity: 1,
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  backgroundColor: isInTransformMode ? '#388E3C' : '#1976D2',
                  transform: 'scale(1.1)',
                },
                // Better touch handling
                touchAction: 'manipulation', // Prevents double-tap zoom but allows scrolling
                cursor: 'pointer',
                zIndex: 12, // Higher than caption overlay to ensure interactivity
              }}
            >
                {isInTransformMode ? <Check sx={{ fontSize: 20 }} /> : <OpenWith sx={{ fontSize: 16 }} />}
              </IconButton>
            )}
            
            {/* Caption editing area - show when not in transform mode and has image, and no other panel is being edited */}
            {!isTransformMode?.[panelId] && hasImage && textEditingPanel === panelId && (
              <CaptionEditor
                panelId={panelId}
                panelTexts={panelTexts}
                lastUsedTextSettings={lastUsedTextSettings}
                updatePanelText={updatePanelText}
                panelRects={panelRects}
                calculateOptimalFontSize={calculateOptimalFontSize}
                textScaleFactor={textScaleFactor}
                onClose={handleTextClose}
                rect={rect}
                componentWidth={componentWidth}
              />
            )}
            

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
        
        // Only show hover overlay when actually hovered and not in transform mode and not editing text
        if (!isHovered || isInTransformMode || textEditingPanel !== null) return null;
        
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

      {/* Focus overlays - darken and blur inactive panels during editing modes */}
      {(textEditingPanel !== null || Object.values(isTransformMode).some(enabled => enabled)) && 
       panelRects.map((rect, index) => {
        const { panelId } = rect;
        
        // Skip overlay for active panels (being edited or in transform mode)
        if (panelId === textEditingPanel || isTransformMode[panelId]) return null;
        
        return (
          <Box
            key={`focus-overlay-${panelId}`}
            sx={{
              position: 'absolute',
              top: rect.y,
              left: rect.x,
              width: rect.width,
              height: rect.height,
              backgroundColor: 'rgba(0, 0, 0, 0.50)', // Light darkening
              backdropFilter: 'blur(1px) grayscale(50%)', // Blur and grayscale effect
              pointerEvents: 'none', // Don't interfere with mouse events
              transition: 'all 0.35s ease-out', // Clearly noticeable fade
              zIndex: 15, // Above hover overlays, below caption editor controls
            }}
          />
        );
      })}

      {/* Invisible backdrop for transform mode - captures clicks outside the canvas */}
      {Object.values(isTransformMode).some(enabled => enabled) && (
        <Box
          onClick={dismissTransformMode}
          sx={{
            position: 'fixed', // Fixed to cover entire viewport
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'transparent', // Completely invisible
            zIndex: 1, // Behind canvas but above page content
            cursor: 'default',
          }}
        />
      )}

      {/* Invisible backdrop for text editor - captures clicks outside the editor */}
      {textEditingPanel !== null && (
        <Box
          onClick={handleTextClose}
          sx={{
            position: 'fixed', // Fixed to cover entire viewport
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'transparent', // Completely invisible
            zIndex: 15, // Below text editor (zIndex 20) but above everything else
            cursor: 'default',
          }}
        />
      )}

      {/* Border drag zones - only visible when not in transform mode or text editing */}
      {!Object.values(isTransformMode).some(enabled => enabled) && 
       textEditingPanel === null && 
       borderZones.map((zone, index) => (
        <Box
          key={`border-zone-${zone.id || `${zone.type}-${zone.index}`}`}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDraggingBorder(true);
            setDraggedBorder(zone);
            const rect = containerRef.current.getBoundingClientRect();
            setBorderDragStart({ 
              x: e.clientX - rect.left, 
              y: e.clientY - rect.top 
            });
          }}
          onTouchStart={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDraggingBorder(true);
            setDraggedBorder(zone);
            const rect = containerRef.current.getBoundingClientRect();
            const touch = e.touches[0];
            setBorderDragStart({ 
              x: touch.clientX - rect.left, 
              y: touch.clientY - rect.top 
            });
          }}
          sx={{
            position: 'absolute',
            top: zone.y,
            left: zone.x,
            width: zone.width,
            height: zone.height,
            cursor: zone.cursor,
            backgroundColor: isDraggingBorder && draggedBorder === zone 
              ? 'rgba(33, 150, 243, 0.4)' 
              : hoveredBorder === zone 
                ? 'rgba(33, 150, 243, 0.2)' 
                : 'transparent',
            transition: 'background-color 0.2s ease',
            zIndex: 10, // Above canvas and overlays, below text editor
            pointerEvents: 'auto',
            // Add a subtle visual indicator on hover
            '&:hover': {
              backgroundColor: 'rgba(33, 150, 243, 0.25)',
            },
            // Touch-friendly styling
            touchAction: 'none', // Prevent default touch behaviors
            userSelect: 'none', // Prevent text selection
          }}
        />
      ))}

    </Box>
  );
};

export default CanvasCollagePreview;
