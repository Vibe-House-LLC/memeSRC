import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Box, IconButton, Typography, TextField, Slider, FormControl, InputLabel, Select, MenuItem, Button, Tabs, Tab, Tooltip } from "@mui/material";
import { useTheme, styled, alpha } from "@mui/material/styles";
import { Add, OpenWith, Check, Edit, FormatColorText, Close, FormatSize, BorderOuter, FormatBold, FontDownload, ControlCamera, SwapHoriz, SwapVert, Colorize, ChevronLeft, ChevronRight } from '@mui/icons-material';
import { layoutDefinitions } from '../config/layouts';
import fonts from '../../../utils/fonts';

// Color presets for text colors
const TEXT_COLOR_PRESETS = [
  { color: '#ffffff', name: 'White' },
  { color: '#000000', name: 'Black' },
  { color: '#ff0000', name: 'Red' },
  { color: '#00ff00', name: 'Green' },
  { color: '#0000ff', name: 'Blue' },
  { color: '#ffff00', name: 'Yellow' },
  { color: '#ff00ff', name: 'Magenta' },
  { color: '#00ffff', name: 'Cyan' },
];

// Create a color swatch component for text color selection
const ColorSwatch = styled(Box)(({ theme, selected, size = 'medium' }) => {
  const sizeMap = {
    small: { width: 24, height: 24, borderWidth: selected ? 2 : 1 },
    medium: { width: 36, height: 36, borderWidth: selected ? 3 : 2 },
  };
  const dimensions = sizeMap[size] || sizeMap.medium;
  
  return {
    width: dimensions.width,
    height: dimensions.height,
    borderRadius: '50%',
    cursor: 'pointer',
    boxSizing: 'border-box',
    border: selected ? `${dimensions.borderWidth}px solid ${theme.palette.primary.main}` : `${dimensions.borderWidth}px solid #ffffff`,
    boxShadow: selected 
      ? `0 0 0 ${Math.max(1, dimensions.borderWidth - 1)}px ${theme.palette.primary.main}` 
      : '0 0 0 1px rgba(0,0,0,0.1)',
    transition: theme.transitions.create(
      ['transform', 'box-shadow'],
      { duration: theme.transitions.duration.shorter }
    ),
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    '&:hover': {
      transform: size === 'small' ? 'scale(1.2)' : 'scale(1.15)',
      boxShadow: '0 4px 10px rgba(0,0,0,0.15)'
    },
    '&:active': {
      transform: 'scale(0.95)',
    }
  };
});

// Horizontal scrollable container for text colors
const TextColorScroller = styled(Box)(({ theme }) => ({
  display: 'flex',
  overflowX: 'auto',
  overflowY: 'hidden',
  scrollbarWidth: 'none',
  '&::-webkit-scrollbar': {
    display: 'none',
  },
  msOverflowStyle: 'none',
  gap: theme.spacing(0.75),
  padding: theme.spacing(0.75, 0),
  position: 'relative',
  scrollBehavior: 'smooth',
  alignItems: 'center',
  justifyContent: 'flex-start',
  minHeight: 32,
  maxWidth: '100%',
  width: '100%',
  boxSizing: 'border-box',
  contain: 'layout style',
  WebkitOverflowScrolling: 'touch',
  overscrollBehavior: 'contain',
  touchAction: 'pan-x', // Allow horizontal panning only
  // Ensure proper mobile touch scrolling
  '@media (hover: none)': {
    // Mobile-specific styles
    overflowX: 'scroll', // Force scroll on mobile
    '-webkit-overflow-scrolling': 'touch',
    scrollSnapType: 'x mandatory',
    scrollSnapAlign: 'start',
  },
}));

// Scroll button for text color picker
const TextColorScrollButton = styled(IconButton)(({ theme, direction }) => ({
  position: 'absolute',
  top: '50%',
  transform: 'translateY(-50%)',
  zIndex: 10,
  backgroundColor: theme.palette.mode === 'dark' 
    ? alpha(theme.palette.background.paper, 0.9)
    : alpha(theme.palette.background.paper, 0.95),
  boxShadow: `0 2px 6px ${theme.palette.mode === 'dark' 
    ? 'rgba(0,0,0,0.3)' 
    : 'rgba(0,0,0,0.15)'}`,
  border: `1px solid ${theme.palette.mode === 'dark'
    ? alpha(theme.palette.divider, 0.5)
    : theme.palette.divider}`,
  color: theme.palette.primary.main,
  '&:hover': {
    backgroundColor: theme.palette.mode === 'dark' 
      ? alpha(theme.palette.background.paper, 0.95)
      : alpha(theme.palette.background.default, 0.98),
    color: theme.palette.primary.dark,
    transform: 'translateY(-50%) scale(1.05)',
    boxShadow: `0 3px 8px ${theme.palette.mode === 'dark' 
      ? 'rgba(0,0,0,0.4)' 
      : 'rgba(0,0,0,0.2)'}`,
  },
  ...(direction === 'left' ? { left: -4 } : { right: -4 }),
  width: 24,
  height: 24,
  minWidth: 'unset',
  padding: 0,
  borderRadius: '50%',
  transition: theme.transitions.create(
    ['background-color', 'color', 'box-shadow', 'transform', 'opacity'], 
    { duration: theme.transitions.duration.shorter }
  ),
}));

// Scroll indicator for text color picker
const TextColorScrollIndicator = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'isVisible'
})(({ theme, direction, isVisible }) => ({
  position: 'absolute',
  top: 0,
  bottom: 0,
  width: 30,
  pointerEvents: 'none',
  zIndex: 2,
  opacity: isVisible ? 1 : 0,
  transition: 'opacity 0.3s ease',
  background: direction === 'left'
    ? `linear-gradient(90deg, ${theme.palette.mode === 'dark' 
        ? 'rgba(0,0,0,0.9)' 
        : 'rgba(255,255,255,0.9)'} 0%, transparent 100%)`
    : `linear-gradient(270deg, ${theme.palette.mode === 'dark' 
        ? 'rgba(0,0,0,0.9)' 
        : 'rgba(255,255,255,0.9)'} 0%, transparent 100%)`,
  ...(direction === 'left' ? { left: 0 } : { right: 0 })
}));

// Helper function to determine if a color is dark (for contrast)
const isDarkColor = (hexColor) => {
  // Convert hex to RGB
  const r = parseInt(hexColor.substr(1, 2), 16);
  const g = parseInt(hexColor.substr(3, 2), 16);
  const b = parseInt(hexColor.substr(5, 2), 16);
  
  // Calculate brightness (YIQ formula)
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  
  // Return true if color is dark
  return brightness < 128;
};

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
  const [activeTextSetting, setActiveTextSetting] = useState(null);
  const [touchStartDistance, setTouchStartDistance] = useState(null);
  const [touchStartScale, setTouchStartScale] = useState(1);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef(null);
  const touchStartRef = useRef(null);
  const textFieldRefs = useRef({});

  // Base canvas size for text scaling calculations
  const BASE_CANVAS_WIDTH = 400;
  
  // Calculate text scale factor based on current canvas size vs base size
  const textScaleFactor = useMemo(() => {
    return componentWidth / BASE_CANVAS_WIDTH;
  }, [componentWidth]);

  // State for text color scroll indicators
  const [textColorLeftScroll, setTextColorLeftScroll] = useState(false);
  const [textColorRightScroll, setTextColorRightScroll] = useState(false);
  
  // Refs for text color picker
  const textColorScrollerRef = useRef(null);
  const textColorPickerRef = useRef(null);
  
  // Saved custom text color state
  const [savedCustomTextColor, setSavedCustomTextColor] = useState(() => {
    const storedColor = localStorage.getItem('memeTextCustomColor');
    return storedColor || '#ffffff';
  });

  // Get layout configuration
  const layoutConfig = useMemo(() => {
    return selectedTemplate ? createLayoutConfig(selectedTemplate, panelCount) : null;
  }, [selectedTemplate, panelCount]);

  // Calculate border pixels
  const borderPixels = getBorderPixelSize(borderThickness, componentWidth);

  // Text color scroll handling functions
  const scrollTextColorLeft = () => {
    if (textColorScrollerRef.current) {
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const scrollDistance = isMobileDevice 
        ? Math.min(textColorScrollerRef.current.clientWidth * 0.6, 150) // Smaller scroll distance for mobile
        : Math.min(textColorScrollerRef.current.clientWidth * 0.5, 200);
      textColorScrollerRef.current.scrollBy({ left: -scrollDistance, behavior: 'smooth' });
      setTimeout(() => {
        handleTextColorScroll();
      }, 300);
    }
  };

  const scrollTextColorRight = () => {
    if (textColorScrollerRef.current) {
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const scrollDistance = isMobileDevice 
        ? Math.min(textColorScrollerRef.current.clientWidth * 0.6, 150) // Smaller scroll distance for mobile
        : Math.min(textColorScrollerRef.current.clientWidth * 0.5, 200);
      textColorScrollerRef.current.scrollBy({ left: scrollDistance, behavior: 'smooth' });
      setTimeout(() => {
        handleTextColorScroll();
      }, 300);
    }
  };

  const checkTextColorScrollPosition = () => {
    if (!textColorScrollerRef.current) return;
    
    const { scrollLeft, scrollWidth, clientWidth } = textColorScrollerRef.current;
    const hasLeft = scrollLeft > 5;
    const hasRight = scrollLeft < scrollWidth - clientWidth - 5;
    
    setTextColorLeftScroll(hasLeft);
    setTextColorRightScroll(hasRight);
  };

  const handleTextColorScroll = () => {
    checkTextColorScrollPosition();
  };

  // Handle custom text color selection
  const handleCustomTextColorChange = (e) => {
    const newColor = e.target.value;
    setSavedCustomTextColor(newColor);
    localStorage.setItem('memeTextCustomColor', newColor);
    // Apply to current panel if editing
    if (textEditingPanel) {
      handleTextChange(textEditingPanel, 'color', newColor);
    }
  };

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

  // Helper function to calculate optimal font size for text to fit in panel
  const calculateOptimalFontSize = useCallback((text, panelWidth, panelHeight) => {
    if (!text || !text.trim()) return 26; // Default size for empty text
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const textPadding = 10;
    const maxTextWidth = panelWidth - (textPadding * 2);
    const maxTextHeight = panelHeight * 0.4; // Use up to 40% of panel height for text
    
    // Start with a reasonable size and work down
    for (let fontSize = 72; fontSize >= 8; fontSize -= 2) {
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
          const fontWeight = panelText.fontWeight || lastUsedTextSettings.fontWeight || '700';
          const fontFamily = panelText.fontFamily || lastUsedTextSettings.fontFamily || 'Arial';
          const textColor = hasActualText 
            ? (panelText.color || lastUsedTextSettings.color || '#ffffff')
            : 'rgba(255, 255, 255, 0.25)'; // 25% opacity for placeholder
          const strokeWidth = panelText.strokeWidth || lastUsedTextSettings.strokeWidth || 2;
          const textPositionX = panelText.textPositionX !== undefined ? panelText.textPositionX : (lastUsedTextSettings.textPositionX || 0);
          const textPositionY = panelText.textPositionY !== undefined ? panelText.textPositionY : (lastUsedTextSettings.textPositionY || 0); // Default to baseline bottom position
          
          ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
          ctx.fillStyle = textColor;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle'; // Change to middle for better positioning control
          
          // Set stroke properties (only for actual text, not placeholder)
          if (hasActualText) {
            ctx.strokeStyle = '#000000'; // Black stroke for contrast
            ctx.lineWidth = strokeWidth;
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';
            
            // Add text shadow for better readability
            ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
            ctx.shadowOffsetX = 1;
            ctx.shadowOffsetY = 1;
            ctx.shadowBlur = 3;
          }
          
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
          
          wrappedLines.forEach((line, lineIndex) => {
            const lineY = startY + lineIndex * lineHeight;
            
            // Draw stroke first if stroke width > 0 and it's actual text
            if (strokeWidth > 0 && hasActualText) {
              ctx.strokeText(line, textX, lineY);
            }
            
            // Then draw the fill text on top
            ctx.fillText(line, textX, lineY);
          });
          
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
    
    // Determine display text (actual text or placeholder)
    const hasActualText = panelText?.content && panelText.content.trim();
    const displayText = hasActualText ? panelText.content : 'Add Caption';
    
    // Use the same accurate text measurement logic as drawCanvas
    const maxTextWidth = panel.width - (textPadding * 2);
    
    // Create temporary canvas for accurate text measurement
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    
    // Set font properties exactly like in drawCanvas
    const fontWeight = panelText?.fontWeight || lastUsedTextSettings.fontWeight || '700';
    const fontFamily = panelText?.fontFamily || lastUsedTextSettings.fontFamily || 'Arial';
    tempCtx.font = `${fontWeight} ${scaledFontSize}px ${fontFamily}`;
    
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
    const activationAreaHeight = actualTextHeight + (activationPadding * 2);
    const activationAreaWidth = actualTextWidth + (activationPadding * 2);
    
    // Position activation area around the actual text block
    const activationAreaX = textX - (activationAreaWidth / 2);
    const activationAreaY = textBlockY - activationPadding;
    
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
    // Prevent opening caption editor while scrolling
    if (isScrolling) return;
    
    const isOpening = textEditingPanel !== panelId;
    setTextEditingPanel(textEditingPanel === panelId ? null : panelId);
    
    // Always set to content tab when opening
    if (isOpening) {
      setActiveTextSetting('content');
      
      // Auto-scroll to show the caption editor after it opens
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
  }, [textEditingPanel, panelRects, isScrolling]);

  const handleTextClose = useCallback(() => {
    setTextEditingPanel(null);
    setActiveTextSetting(null);
  }, []);



  const handleTextChange = useCallback((panelId, property, value) => {
    if (updatePanelText) {
      const currentText = panelTexts[panelId] || {};
      let updatedText = {
        ...currentText,
        [property]: value
      };
      
      // Auto-scale font size only when first adding content to an empty text field
      // This prevents font size from changing while the user is editing existing text
      if (property === 'content' && value && value.trim()) {
        const hadPreviousContent = currentText.content && currentText.content.trim();
        const hasExplicitFontSize = currentText.fontSize !== undefined;
        
        // Only auto-scale if there was no previous content AND no explicit font size set
        if (!hadPreviousContent && !hasExplicitFontSize) {
          const panel = panelRects.find(p => p.panelId === panelId);
          if (panel) {
            const optimalSize = calculateOptimalFontSize(value, panel.width, panel.height);
            updatedText = {
              ...updatedText,
              fontSize: optimalSize
            };
          }
        }
      }
      
      updatePanelText(panelId, updatedText);
    }
  }, [panelTexts, updatePanelText, panelRects, calculateOptimalFontSize]);

  // Redraw canvas when dependencies change
  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  // Text color scroll event handling
  useEffect(() => {
    const textColorElement = textColorScrollerRef.current;
    
    if (textColorElement) {
      textColorElement.addEventListener('scroll', handleTextColorScroll);
      // Check initial scroll position
      handleTextColorScroll();
    }
    
    const handleResize = () => {
      handleTextColorScroll();
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      if (textColorElement) {
        textColorElement.removeEventListener('scroll', handleTextColorScroll);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, [textEditingPanel, activeTextSetting]);

  // Enhanced scroll detection for mobile and desktop
  useEffect(() => {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const scrollTimeout = isMobile ? 300 : 150; // Longer timeout for mobile
    const touchThreshold = 10; // Pixels moved to consider it scrolling

    const handleScroll = () => {
      setIsScrolling(true);
      
      // Clear existing timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      
      // Set timeout to re-enable interactions after scrolling stops
      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrolling(false);
      }, scrollTimeout);
    };

    const handleTouchStart = (e) => {
      // Don't track touch starts on color picker elements
      if (e.target.closest('[data-color-picker]')) {
        return;
      }
      
      // Only track touches outside the canvas area to avoid interfering with canvas interactions
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const touch = e.touches[0];
        const isInsideCanvas = touch.clientX >= rect.left && 
                              touch.clientX <= rect.right && 
                              touch.clientY >= rect.top && 
                              touch.clientY <= rect.bottom;
        
        // Only track touch starts outside the canvas or when no canvas interaction is intended
        if (!isInsideCanvas || textEditingPanel !== null) {
          touchStartRef.current = {
            x: touch.clientX,
            y: touch.clientY,
            time: Date.now()
          };
        }
      } else {
        touchStartRef.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
          time: Date.now()
        };
      }
    };

    const handleTouchMove = (e) => {
      // Don't track touch moves on color picker elements
      if (e.target.closest('[data-color-picker]')) {
        return;
      }
      
      if (touchStartRef.current) {
        const touch = e.touches[0];
        const deltaX = Math.abs(touch.clientX - touchStartRef.current.x);
        const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);
        const deltaTime = Date.now() - touchStartRef.current.time;
        
        // If touch has moved significantly (especially vertically) or quickly, consider it scrolling
        const isScrollingGesture = deltaY > touchThreshold || 
                                 (deltaY > 5 && deltaTime < 100) || // Fast vertical movement
                                 (deltaX > touchThreshold * 2 && deltaY > 5); // Large diagonal movement
        
        if (isScrollingGesture) {
          setIsScrolling(true);
          
          // Clear existing timeout
          if (scrollTimeoutRef.current) {
            clearTimeout(scrollTimeoutRef.current);
          }
          
          // Set timeout to re-enable interactions
          scrollTimeoutRef.current = setTimeout(() => {
            setIsScrolling(false);
          }, scrollTimeout);
          
          // Clear touch start to avoid repeated triggers
          touchStartRef.current = null;
        }
      }
    };

    const handleTouchEnd = () => {
      // Clear touch tracking
      touchStartRef.current = null;
      
      // If we were in a scrolling state, add a short delay before re-enabling
      if (isScrolling) {
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }
        
        scrollTimeoutRef.current = setTimeout(() => {
          setIsScrolling(false);
        }, scrollTimeout);
      }
    };

    // Add scroll and touch listeners
    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('scroll', handleScroll, { passive: true });
    
    // Add touch listeners for mobile scroll detection
    if (isMobile) {
      document.addEventListener('touchstart', handleTouchStart, { passive: true });
      document.addEventListener('touchmove', handleTouchMove, { passive: true });
      document.addEventListener('touchend', handleTouchEnd, { passive: true });
      document.addEventListener('touchcancel', handleTouchEnd, { passive: true });
    }
    
    // Cleanup
    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('scroll', handleScroll);
      
      if (isMobile) {
        document.removeEventListener('touchstart', handleTouchStart);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
        document.removeEventListener('touchcancel', handleTouchEnd);
      }
      
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [isScrolling, textEditingPanel]);

  // Focus text field when caption editor opens
  useEffect(() => {
    if (textEditingPanel && activeTextSetting === 'content') {
      // Small delay to ensure the text field is rendered
      setTimeout(() => {
        // Get the input element directly from the inputRef
        const inputElement = textFieldRefs.current[textEditingPanel];
        if (inputElement) {
          // Focus the element
          inputElement.focus();
          
          // Position cursor at the end of existing text
          const textLength = inputElement.value.length;
          
          // Use setTimeout to ensure focus is complete before setting selection
          setTimeout(() => {
            inputElement.setSelectionRange(textLength, textLength);
            
            // For mobile: additional steps to ensure keyboard appears
            if ('ontouchstart' in window) {
              inputElement.click();
              // Double-check cursor position on mobile
              setTimeout(() => {
                inputElement.setSelectionRange(textLength, textLength);
              }, 100);
            }
          }, 50);
        }
      }, 300); // Even longer delay to ensure complete rendering
    }
  }, [textEditingPanel, activeTextSetting]);



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
    
    // Check if mouse is over text area (actual text area bounds)
    let isOverTextArea = false;
    if (hoveredPanelIndex >= 0) {
      const panel = panelRects[hoveredPanelIndex];
      const imageIndex = panelImageMapping[panel.panelId];
      const hasImage = imageIndex !== undefined && loadedImages[imageIndex];
      const panelText = panelTexts[panel.panelId] || {};
      const hasTextOrPlaceholder = hasImage;
      const anyPanelInTransformMode = Object.values(isTransformMode).some(enabled => enabled);
      
      // Only check text area if no panel is in transform mode
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
    
    if (hoveredPanelIndex !== hoveredPanel) {
      setHoveredPanel(hoveredPanelIndex >= 0 ? hoveredPanelIndex : null);
      
      // Determine cursor based on interaction state
      let cursor = 'default';
      
      if (hoveredPanelIndex >= 0) {
        const panel = panelRects[hoveredPanelIndex];
        const anyPanelInTransformMode = Object.values(isTransformMode).some(enabled => enabled);
        
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
    } else if (hoveredPanelIndex >= 0) {
      // Update cursor for text area even when staying on same panel
      const panel = panelRects[hoveredPanelIndex];
      const anyPanelInTransformModeLocal = Object.values(isTransformMode).some(enabled => enabled);
      
      let cursor = 'default';
      if (anyPanelInTransformModeLocal) {
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
      
      canvas.style.cursor = cursor;
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
  }, [panelRects, hoveredPanel, isDragging, selectedPanel, dragStart, isTransformMode, panelTransforms, updatePanelTransform, panelImageMapping, loadedImages, panelTexts, getTextAreaBounds]);

  const handleMouseDown = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Prevent interactions while scrolling
    if (isScrolling) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
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
        }
        // Ignore clicks on other panels when any panel is in transform mode
        return;
      }
      
      setSelectedPanel(clickedPanelIndex);
      
      // Check if this panel is in transform mode
      if (isTransformMode[clickedPanel.panelId]) {
        setIsDragging(true);
        setDragStart({ x, y });
      } else if (onPanelClick) {
        // Regular panel click
        onPanelClick(clickedPanel.index, clickedPanel.panelId);
      }
    }
  }, [panelRects, isTransformMode, onPanelClick, textEditingPanel, panelImageMapping, loadedImages, handleTextEdit, panelTexts, getTextAreaBounds, isScrolling]);

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
    
    // Prevent interactions while scrolling
    if (isScrolling) return;
    
    // Store touch start position for scroll detection within canvas
    const rect = canvas.getBoundingClientRect();
    const touches = Array.from(e.touches);
    
    // On mobile, be extra careful about touch interactions
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile && touches.length === 1) {
      touchStartRef.current = {
        x: touches[0].clientX,
        y: touches[0].clientY,
        time: Date.now(),
        withinCanvas: true
      };
    }
    
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
        const anyPanelInTransformMode = Object.values(isTransformMode).some(enabled => enabled);
        
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
        
        // If touching on text area, open caption editor
        if (isTextAreaTouch) {
          handleTextEdit(clickedPanel.panelId, e);
          return;
        }
        
        // If any panel is in transform mode, only allow interaction with that specific panel
        if (anyPanelInTransformMode) {
          // Only allow transform interactions on the panel that's actually in transform mode
          if (hasImage && isTransformMode[clickedPanel.panelId]) {
            // Prevent page scrolling only when touching an image in transform mode
            e.preventDefault();
            e.stopPropagation();
            setSelectedPanel(clickedPanelIndex);
            setIsDragging(true);
            setDragStart({ x, y });
          }
          // Ignore touches on other panels when any panel is in transform mode
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
        } else if (onPanelClick) {
          // Allow normal touch behavior for panels not in transform mode
          // Regular panel click
          onPanelClick(clickedPanel.index, clickedPanel.panelId);
        }
      } else if (textEditingPanel !== null) {
        // When touched outside any panel and caption editor is open, explicitly allow normal scrolling
        // Don't preventDefault - allow normal page scrolling when caption editor is open
      }
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
  }, [panelRects, isTransformMode, onPanelClick, selectedPanel, panelTransforms, panelImageMapping, loadedImages, getTouchDistance, textEditingPanel, handleTextEdit, panelTexts, getTextAreaBounds, isScrolling]);

  const handleTouchMove = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Check if this looks like a scrolling gesture on mobile
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile && touchStartRef.current && touchStartRef.current.withinCanvas) {
      const touch = e.touches[0];
      const deltaX = Math.abs(touch.clientX - touchStartRef.current.x);
      const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);
      const deltaTime = Date.now() - touchStartRef.current.time;
      
      // If this looks like a scroll gesture, disable interactions and return early
      const looksLikeScroll = deltaY > 15 || // Significant vertical movement
                             (deltaY > 8 && deltaTime < 150) || // Fast vertical movement  
                             (deltaY > 5 && deltaX < 10); // Mostly vertical movement
      
      if (looksLikeScroll) {
        setIsScrolling(true);
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }
        scrollTimeoutRef.current = setTimeout(() => {
          setIsScrolling(false);
        }, 300);
        touchStartRef.current = null;
        return; // Prevent any further canvas interactions
      }
    }
    
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
    
    // Clear canvas touch tracking
    if (touchStartRef.current && touchStartRef.current.withinCanvas) {
      touchStartRef.current = null;
    }
  }, []);

  // Toggle transform mode for a panel
  const toggleTransformMode = useCallback((panelId) => {
    // Prevent toggle while scrolling
    if (isScrolling) return;
    
    setIsTransformMode(prev => ({
      ...prev,
      [panelId]: !prev[panelId]
    }));
  }, [isScrolling]);

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
            const fontWeight = panelText.fontWeight || lastUsedTextSettings.fontWeight || '700';
            const fontFamily = panelText.fontFamily || lastUsedTextSettings.fontFamily || 'Arial';
            const textColor = panelText.color || lastUsedTextSettings.color || '#ffffff';
            const strokeWidth = panelText.strokeWidth || lastUsedTextSettings.strokeWidth || 2;
            const textPositionX = panelText.textPositionX !== undefined ? panelText.textPositionX : (lastUsedTextSettings.textPositionX || 0);
            const textPositionY = panelText.textPositionY !== undefined ? panelText.textPositionY : (lastUsedTextSettings.textPositionY || 0);
            
            exportCtx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
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
            
            // Simple text wrapping for export
            const words = panelText.content.split(' ');
            const lines = [];
            let currentLine = '';
            
            words.forEach(word => {
              const testLine = currentLine ? `${currentLine} ${word}` : word;
              if (exportCtx.measureText(testLine).width <= maxTextWidth) {
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
            
            lines.forEach((line, lineIndex) => {
              const lineY = startY + lineIndex * lineHeight;
              if (strokeWidth > 0) {
                exportCtx.strokeText(line, textX, lineY);
              }
              exportCtx.fillText(line, textX, lineY);
            });
            
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
  
  // Allow scrolling when caption editor is open or no panels are in transform mode
  const shouldAllowScrolling = textEditingPanel !== null || !anyPanelInTransformMode;

  return (
    <Box ref={containerRef} sx={{ position: 'relative', width: '100%', overflow: 'visible' }}>
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
          touchAction: shouldAllowScrolling ? 'auto' : 'none', // Allow scrolling when caption editor is open
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
            {hasImage && (textEditingPanel === null || textEditingPanel === panelId) && 
             (!anyPanelInTransformMode || isInTransformMode) && (
                          <IconButton
              size="small"
              disabled={isScrolling}
              onClick={() => toggleTransformMode(panelId)}
              sx={{
                position: 'absolute',
                top: rect.y + 8,
                left: rect.x + rect.width - 48, // Simplified positioning
                width: 40,
                height: 40,
                backgroundColor: isScrolling 
                  ? 'rgba(128, 128, 128, 0.6)' // Gray when disabled
                  : isInTransformMode ? '#4CAF50' : '#2196F3',
                color: isScrolling ? 'rgba(255, 255, 255, 0.5)' : '#ffffff',
                border: '2px solid #ffffff',
                boxShadow: isScrolling 
                  ? '0 2px 6px rgba(0, 0, 0, 0.2)' // Reduced shadow when disabled
                  : '0 4px 12px rgba(0, 0, 0, 0.4)',
                opacity: isScrolling ? 0.6 : 1,
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  backgroundColor: isScrolling 
                    ? 'rgba(128, 128, 128, 0.6)' // No hover effect when scrolling
                    : isInTransformMode ? '#388E3C' : '#1976D2',
                  transform: isScrolling ? 'none' : 'scale(1.1)',
                },
                '&.Mui-disabled': {
                  backgroundColor: 'rgba(128, 128, 128, 0.6)',
                  color: 'rgba(255, 255, 255, 0.5)',
                },
                zIndex: 12, // Higher than caption overlay to ensure interactivity
              }}
            >
                {isInTransformMode ? <Check sx={{ fontSize: 20 }} /> : <OpenWith sx={{ fontSize: 16 }} />}
              </IconButton>
            )}
            
            {/* Caption editing area - show when not in transform mode and has image, and no other panel is being edited */}
            {!isTransformMode?.[panelId] && hasImage && (textEditingPanel === null || textEditingPanel === panelId) && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: textEditingPanel === panelId ? rect.y + rect.height : rect.y + rect.height, // Always position at bottom
                    // When collapsed: hidden, when expanded: canvas-wide positioning
                    left: textEditingPanel === panelId ? sidePadding : rect.x + sidePadding,
                    // When collapsed: hidden, when expanded: canvas-wide width
                    width: textEditingPanel === panelId ? componentWidth - (sidePadding * 2) : 0,
                    height: textEditingPanel === panelId ? 'auto' : 0,
                    opacity: textEditingPanel === panelId ? 1 : 0,
                    visibility: textEditingPanel === panelId ? 'visible' : 'hidden',
                    zIndex: 20, // Above everything else including transform buttons
                    backgroundColor: 'rgba(0, 0, 0, 0.97)',
                    borderRadius: `${borderRadius}px`,
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    transition: 'all 0.3s ease-in-out', // Smooth expand/collapse
                    overflow: 'hidden',
                  }}
                >
                  {/* Expanded editing controls - only show when this panel is being edited */}
                  {textEditingPanel === panelId && (
                    <Box sx={{ p: Math.max(isMobileSize ? 0.5 : 0.375, Math.min(0.75, sidePadding)), pt: 0 }}>
                      {/* Setting tabs - always visible */}
                      <Tabs
                        value={activeTextSetting ? ['content', 'format', 'placement', 'fontStyle'].indexOf(activeTextSetting) : false}
                        onChange={(event, newValue) => {
                          const settings = ['content', 'format', 'placement', 'fontStyle'];
                          const newSetting = settings[newValue];
                          // Toggle behavior: if clicking the same tab, deselect it
                          setActiveTextSetting(activeTextSetting === newSetting ? null : newSetting);
                        }}
                        variant="scrollable"
                        scrollButtons
                        allowScrollButtonsMobile
                        centered={!isMobileSize} // Only center on desktop, allow scrolling on mobile
                        sx={{
                          mb: Math.max(isMobileSize ? 0.5 : 0.375, Math.min(0.75, sidePadding * 0.75)),
                          display: 'flex',
                          justifyContent: isMobileSize ? 'flex-start' : 'center',
                          '& .MuiTabs-flexContainer': {
                            justifyContent: isMobileSize ? 'flex-start' : 'center',
                          },
                          '& .MuiTab-root': {
                            minHeight: 36, // Make tabs shorter
                            minWidth: isMobileSize ? 80 : 'auto', // Ensure minimum width on mobile
                            fontSize: isMobileSize ? '0.75rem' : '0.875rem', // Smaller text on mobile
                          },
                          '& .MuiTabs-scrollButtons': {
                            color: '#ffffff',
                            '&.Mui-disabled': {
                              opacity: 0.3,
                            },
                          },
                          '& .MuiTabs-indicator': {
                            backgroundColor: '#ffffff',
                          },
                        }}
                      >
                        <Tab
                          icon={<Edit />}
                          iconPosition="start"
                          label="Text"
                          title="Edit Text"
                        />
                        <Tab
                          icon={<FormatSize />}
                          iconPosition="start"
                          label="Format"
                          title="Format Text"
                        />
                        <Tab
                          icon={<ControlCamera />}
                          iconPosition="start"
                          label="Placement"
                          title="Text Placement"
                        />
                        <Tab
                          icon={<FontDownload />}
                          iconPosition="start"
                          label="Font Style"
                          title="Font Style"
                        />
                      </Tabs>

                      {/* Active setting panel - appears below the tabs */}
                      {activeTextSetting === 'content' && (
                        <Box sx={{ mb: 0.5, px: 0.75, py: 0.25, bgcolor: 'rgba(255, 255, 255, 0.35)', borderRadius: 1 }}>
                          <TextField
                            fullWidth
                            multiline
                            rows={isMobileSize ? 2 : 3} // Fixed rows for consistent sizing
                            size="small"
                            placeholder="Add Caption"
                            value={panelTexts[panelId]?.content || ''}
                            onChange={(e) => handleTextChange(panelId, 'content', e.target.value)}
                            inputRef={(el) => {
                              if (el) {
                                textFieldRefs.current[panelId] = el;
                              }
                            }}
                            autoFocus={false}
                            sx={{
                              '& .MuiInputBase-root': {
                                backgroundColor: '#ffffff',
                                border: 'none',
                                color: '#000000',
                                fontSize: `${fontSize}px`,
                                borderRadius: 1,
                              },
                              '& .MuiInputBase-input': {
                                textAlign: 'center',
                                padding: `${Math.max(4, Math.min(8, sidePadding))}px`,
                                color: '#000000',
                                '&::placeholder': {
                                  color: 'rgba(0, 0, 0, 0.5)',
                                  opacity: 1,
                                },
                              },
                              '& .MuiOutlinedInput-notchedOutline': {
                                border: 'none',
                              },
                            }}
                          />
                        </Box>
                      )}
                    
                    {activeTextSetting === 'format' && (
                      <Box sx={{ mb: 0.5, px: 0.75, py: 0.25, bgcolor: 'rgba(255, 255, 255, 0.35)', borderRadius: 1 }}>
                        {/* Font Size */}
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                          <FormatSize sx={{ color: '#ffffff', mr: 1, fontSize: Math.max(isMobileSize ? 20 : 18, Math.min(24, fontSize * 1.2)) }} />
                          <Slider
                            value={(() => {
                              // Show actual font size being used (including auto-calculated)
                              const panelText = panelTexts[panelId] || {};
                              const hasActualText = panelText.content && panelText.content.trim();
                              
                              let baseFontSize;
                              if (hasActualText && !panelText.fontSize) {
                                // Auto-calculate optimal font size for display
                                const panel = panelRects.find(p => p.panelId === panelId);
                                if (panel) {
                                  baseFontSize = calculateOptimalFontSize(panelText.content, panel.width, panel.height);
                                } else {
                                  baseFontSize = lastUsedTextSettings.fontSize || 26;
                                }
                              } else {
                                baseFontSize = panelText.fontSize || lastUsedTextSettings.fontSize || 26;
                              }
                              
                              // Return the scaled font size for display
                              return Math.round(baseFontSize * textScaleFactor);
                            })()}
                            onChange={(e, value) => {
                              // Convert scaled value back to base value for storage
                              const baseFontSize = value / textScaleFactor;
                              handleTextChange(panelId, 'fontSize', baseFontSize);
                            }}
                            min={Math.round(8 * textScaleFactor)}
                            max={Math.round(72 * textScaleFactor)}
                            step={1}
                            size="small"
                            sx={{ 
                              height: Math.max(isMobileSize ? 8 : 6, Math.min(12, fontSize * 0.8)),
                              color: '#ffffff',
                              flex: 1,
                              '& .MuiSlider-track': {
                                height: Math.max(isMobileSize ? 4 : 3, Math.min(6, fontSize * 0.4)),
                              },
                              '& .MuiSlider-rail': {
                                height: Math.max(isMobileSize ? 4 : 3, Math.min(6, fontSize * 0.4)),
                                color: 'rgba(255, 255, 255, 0.3)',
                              },
                              '& .MuiSlider-thumb': {
                                height: Math.max(isMobileSize ? 16 : 12, Math.min(22, fontSize * 1.2)),
                                width: Math.max(isMobileSize ? 16 : 12, Math.min(22, fontSize * 1.2)),
                                color: '#ffffff',
                                '&:before': {
                                  boxShadow: '0 2px 4px 0 rgb(0 0 0 / 20%)'
                                },
                                '&:hover, &.Mui-focusVisible': {
                                  boxShadow: '0px 0px 0px 6px rgb(255 255 255 / 16%)'
                                }
                              }
                            }}
                          />
                          <Typography variant="caption" sx={{ color: '#ffffff', ml: 1, fontSize: `${fontSize * 0.8}px`, minWidth: 'fit-content' }}>
                            {(() => {
                              // Show actual font size being used (including auto-calculated)
                              const panelText = panelTexts[panelId] || {};
                              const hasActualText = panelText.content && panelText.content.trim();
                              
                              let baseFontSize;
                              if (hasActualText && !panelText.fontSize) {
                                // Auto-calculate optimal font size for display
                                const panel = panelRects.find(p => p.panelId === panelId);
                                if (panel) {
                                  baseFontSize = calculateOptimalFontSize(panelText.content, panel.width, panel.height);
                                } else {
                                  baseFontSize = lastUsedTextSettings.fontSize || 26;
                                }
                              } else {
                                baseFontSize = panelText.fontSize || lastUsedTextSettings.fontSize || 26;
                              }
                              
                              // Return the scaled font size for display
                              return Math.round(baseFontSize * textScaleFactor);
                            })()}
                          </Typography>
                        </Box>
                        
                        {/* Stroke Width */}
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                          <BorderOuter sx={{ color: '#ffffff', mr: 1, fontSize: Math.max(isMobileSize ? 20 : 18, Math.min(24, fontSize * 1.2)) }} />
                          <Slider
                            value={panelTexts[panelId]?.strokeWidth || lastUsedTextSettings.strokeWidth || 2}
                            onChange={(e, value) => handleTextChange(panelId, 'strokeWidth', value)}
                            min={0}
                            max={10}
                            step={0.5}
                            size="small"
                            sx={{ 
                              height: Math.max(isMobileSize ? 8 : 6, Math.min(12, fontSize * 0.8)),
                              color: '#ffffff',
                              flex: 1,
                              '& .MuiSlider-track': {
                                height: Math.max(isMobileSize ? 4 : 3, Math.min(6, fontSize * 0.4)),
                              },
                              '& .MuiSlider-rail': {
                                height: Math.max(isMobileSize ? 4 : 3, Math.min(6, fontSize * 0.4)),
                                color: 'rgba(255, 255, 255, 0.3)',
                              },
                              '& .MuiSlider-thumb': {
                                height: Math.max(isMobileSize ? 16 : 12, Math.min(22, fontSize * 1.2)),
                                width: Math.max(isMobileSize ? 16 : 12, Math.min(22, fontSize * 1.2)),
                                color: '#ffffff',
                                '&:before': {
                                  boxShadow: '0 2px 4px 0 rgb(0 0 0 / 20%)'
                                },
                                '&:hover, &.Mui-focusVisible': {
                                  boxShadow: '0px 0px 0px 6px rgb(255 255 255 / 16%)'
                                }
                              }
                            }}
                          />
                          <Typography variant="caption" sx={{ color: '#ffffff', ml: 1, fontSize: `${fontSize * 0.8}px`, minWidth: 'fit-content' }}>
                            {panelTexts[panelId]?.strokeWidth || lastUsedTextSettings.strokeWidth || 2}
                          </Typography>
                        </Box>
                        
                        {/* Font Weight */}
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <FormatBold sx={{ color: '#ffffff', mr: 1, fontSize: Math.max(isMobileSize ? 20 : 18, Math.min(24, fontSize * 1.2)) }} />
                          <FormControl fullWidth size="small">
                            <Select
                              value={panelTexts[panelId]?.fontWeight || lastUsedTextSettings.fontWeight || '700'}
                              onChange={(e) => handleTextChange(panelId, 'fontWeight', e.target.value)}
                              displayEmpty
                              sx={{ 
                                '& .MuiSelect-select': { 
                                  py: Math.max(0.25, Math.min(0.5, sidePadding * 0.5)), 
                                  color: '#ffffff',
                                  fontSize: `${fontSize}px`,
                                  '&:focus': {
                                    backgroundColor: 'transparent',
                                  }
                                },
                                '& .MuiOutlinedInput-notchedOutline': {
                                  border: 'none',
                                },
                                '& .MuiSvgIcon-root': {
                                  color: '#ffffff',
                                }
                              }}
                              MenuProps={{
                                PaperProps: {
                                  sx: { 
                                    bgcolor: 'rgba(0, 0, 0, 0.9)',
                                    '& .MuiMenuItem-root': {
                                      color: '#ffffff',
                                      fontSize: `${fontSize}px`,
                                    }
                                  }
                                }
                              }}
                            >
                              <MenuItem value="normal">Normal</MenuItem>
                              <MenuItem value="bold">Bold</MenuItem>
                              <MenuItem value="lighter">Light</MenuItem>
                              <MenuItem value="400">400</MenuItem>
                              <MenuItem value="500">500</MenuItem>
                              <MenuItem value="600">600</MenuItem>
                              <MenuItem value="700">700</MenuItem>
                              <MenuItem value="800">800</MenuItem>
                              <MenuItem value="900">900</MenuItem>
                            </Select>
                          </FormControl>
                        </Box>
                      </Box>
                    )}
                    
                    {activeTextSetting === 'fontStyle' && (
                      <Box sx={{ mb: 0.5, px: 0.75, py: 0.25, bgcolor: 'rgba(255, 255, 255, 0.35)', borderRadius: 1 }}>
                        {/* Font Family */}
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                          <FontDownload sx={{ color: '#ffffff', mr: 1, fontSize: Math.max(isMobileSize ? 20 : 18, Math.min(24, fontSize * 1.2)) }} />
                          <FormControl fullWidth size="small">
                            <Select
                              value={panelTexts[panelId]?.fontFamily || lastUsedTextSettings.fontFamily || 'Arial'}
                              onChange={(e) => handleTextChange(panelId, 'fontFamily', e.target.value)}
                              displayEmpty
                              sx={{ 
                                '& .MuiSelect-select': { 
                                  py: Math.max(0.25, Math.min(0.5, sidePadding * 0.5)), 
                                  color: '#ffffff',
                                  fontSize: `${fontSize}px`,
                                  '&:focus': {
                                    backgroundColor: 'transparent',
                                  }
                                },
                                '& .MuiOutlinedInput-notchedOutline': {
                                  border: 'none',
                                },
                                '& .MuiSvgIcon-root': {
                                  color: '#ffffff',
                                }
                              }}
                              MenuProps={{
                                PaperProps: {
                                  sx: { 
                                    maxHeight: Math.max(120, Math.min(200, expandedHeight * 0.8)),
                                    bgcolor: 'rgba(0, 0, 0, 0.9)',
                                    '& .MuiMenuItem-root': {
                                      color: '#ffffff',
                                      fontSize: `${fontSize}px`,
                                    }
                                  }
                                }
                              }}
                            >
                              {fonts.map((font) => (
                                <MenuItem key={font} value={font}>
                                  {font}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Box>
                        
                        {/* Text Color */}
                        <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                          <FormatColorText sx={{ color: '#ffffff', mr: 1, mt: 0.5, fontSize: Math.max(isMobileSize ? 20 : 18, Math.min(24, fontSize * 1.2)) }} />
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            {/* Collage-style scrollable color picker */}
                            <Box 
                              data-color-picker
                              sx={{ 
                                position: 'relative', 
                                mb: 0.375,
                                width: '100%',
                                maxWidth: '100%',
                                overflow: 'visible', // Changed from hidden to visible
                                boxSizing: 'border-box',
                              }}>
                              <TextColorScrollButton
                                direction="left"
                                onClick={scrollTextColorLeft}
                                size="small"
                                sx={{
                                  display: 'flex',
                                  visibility: textColorLeftScroll ? 'visible' : 'hidden',
                                  opacity: textColorLeftScroll ? 1 : 0,
                                }}
                              >
                                <ChevronLeft fontSize="small" />
                              </TextColorScrollButton>
                              
                              <TextColorScrollButton
                                direction="right"
                                onClick={scrollTextColorRight}
                                size="small"
                                sx={{
                                  display: 'flex',
                                  visibility: textColorRightScroll ? 'visible' : 'hidden',
                                  opacity: textColorRightScroll ? 1 : 0,
                                }}
                              >
                                <ChevronRight fontSize="small" />
                              </TextColorScrollButton>
                              
                              <TextColorScroller
                                ref={textColorScrollerRef}
                                data-color-picker
                                onScroll={handleTextColorScroll}
                                onTouchStart={(e) => {
                                  // Prevent scroll detection from interfering with color picker scrolling
                                  e.stopPropagation();
                                }}
                                onTouchMove={(e) => {
                                  // Prevent scroll detection from interfering with color picker scrolling
                                  e.stopPropagation();
                                }}
                                sx={{
                                  px: 0.5, // Increase padding to ensure content is not cut off
                                  py: 0.5,
                                  minHeight: isMobileSize ? 32 : 36,
                                  maxHeight: isMobileSize ? 36 : 40,
                                  width: '100%',
                                  maxWidth: '100%',
                                  boxSizing: 'border-box',
                                  position: 'relative',
                                  // Ensure smooth scrolling like the tabs
                                  scrollbarWidth: 'none',
                                  msOverflowStyle: 'none',
                                  '&::-webkit-scrollbar': {
                                    display: 'none',
                                  },
                                  // Enhanced mobile touch scrolling
                                  overflowX: 'auto',
                                  overflowY: 'hidden',
                                  WebkitOverflowScrolling: 'touch',
                                  overscrollBehavior: 'contain auto',
                                  touchAction: 'pan-x', // Allow horizontal panning only
                                  // Ensure proper containment within parent
                                  contain: 'layout style',
                                  // Force hardware acceleration for smooth scrolling
                                  willChange: 'scroll-position',
                                  transform: 'translateZ(0)', // Force hardware acceleration
                                }}
                              >
                                {/* Custom color picker - first option */}
                                <Tooltip title="Pick Custom Color" arrow>
                                  <Box sx={{ 
                                    position: 'relative', 
                                    display: 'flex', 
                                    alignItems: 'center'
                                  }}>
                                    <ColorSwatch
                                      size={isMobileSize ? 'small' : 'medium'}
                                      onClick={() => textColorPickerRef.current && textColorPickerRef.current.click()}
                                      selected={false}
                                      sx={{ 
                                        position: 'relative',
                                        backgroundColor: savedCustomTextColor,
                                        backgroundImage: 'linear-gradient(45deg, rgba(200,200,200,0.2) 25%, transparent 25%), linear-gradient(-45deg, rgba(200,200,200,0.2) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(200,200,200,0.2) 75%), linear-gradient(-45deg, transparent 75%, rgba(200,200,200,0.2) 75%)',
                                        backgroundSize: isMobileSize ? '6px 6px' : '8px 8px',
                                        backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px',
                                      }}
                                    >
                                      <Colorize fontSize={isMobileSize ? 'small' : 'medium'} sx={{ color: isDarkColor(savedCustomTextColor) ? '#fff' : '#000' }} />
                                    </ColorSwatch>
                                    <input
                                      type="color"
                                      value={savedCustomTextColor}
                                      onChange={handleCustomTextColorChange}
                                      ref={textColorPickerRef}
                                      style={{ 
                                        position: 'absolute',
                                        opacity: 0,
                                        width: '100%',
                                        height: '100%',
                                        cursor: 'pointer'
                                      }}
                                    />
                                  </Box>
                                </Tooltip>
                                
                                {/* Show saved custom color if different from presets */}
                                {savedCustomTextColor && !TEXT_COLOR_PRESETS.some(c => c.color === savedCustomTextColor) && (
                                  <Tooltip title="Custom Color" arrow>
                                    <ColorSwatch
                                      size={isMobileSize ? 'small' : 'medium'}
                                      onClick={() => handleTextChange(panelId, 'color', savedCustomTextColor)}
                                      selected={(panelTexts[panelId]?.color || lastUsedTextSettings.color || '#ffffff') === savedCustomTextColor}
                                      sx={{ backgroundColor: savedCustomTextColor }}
                                    />
                                  </Tooltip>
                                )}
                                
                                {/* Preset colors */}
                                {TEXT_COLOR_PRESETS.map((colorOption) => (
                                  <Tooltip key={colorOption.color} title={colorOption.name} arrow>
                                    <ColorSwatch
                                      size={isMobileSize ? 'small' : 'medium'}
                                      onClick={() => handleTextChange(panelId, 'color', colorOption.color)}
                                      selected={(panelTexts[panelId]?.color || lastUsedTextSettings.color || '#ffffff') === colorOption.color}
                                      sx={{ backgroundColor: colorOption.color }}
                                    />
                                  </Tooltip>
                                ))}
                                
                                {/* Spacer for proper scrolling */}
                                <Box sx={{ minWidth: 4, flexShrink: 0 }} />
                              </TextColorScroller>
                              
                              <TextColorScrollIndicator 
                                direction="left" 
                                isVisible={textColorLeftScroll}
                              />
                              
                              <TextColorScrollIndicator 
                                direction="right" 
                                isVisible={textColorRightScroll}
                              />
                            </Box>
                            
                            {/* Text input for manual color entry */}
                            <TextField
                              fullWidth
                              size="small"
                              placeholder="#ffffff"
                              value={panelTexts[panelId]?.color || lastUsedTextSettings.color || '#ffffff'}
                              onChange={(e) => handleTextChange(panelId, 'color', e.target.value)}
                              sx={{ 
                                '& .MuiInputBase-input': { 
                                  py: Math.max(0.25, Math.min(0.5, sidePadding * 0.5)), 
                                  fontSize: `${fontSize * 0.8}px`,
                                  color: '#ffffff',
                                },
                                '& .MuiInputBase-root': {
                                  backgroundColor: 'rgba(255, 255, 255, 0.35)',
                                },
                                '& .MuiOutlinedInput-notchedOutline': {
                                  border: 'none',
                                },
                              }}
                            />
                          </Box>
                        </Box>
                      </Box>
                    )}
                    
                    {activeTextSetting === 'placement' && (
                      <Box sx={{ mb: 0.5, px: 0.75, py: 0.25, bgcolor: 'rgba(255, 255, 255, 0.35)', borderRadius: 1 }}>
                        {/* Horizontal Position */}
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                          <SwapHoriz sx={{ color: '#ffffff', mr: 1, fontSize: Math.max(isMobileSize ? 20 : 18, Math.min(24, fontSize * 1.2)) }} />
                          <Slider
                            value={panelTexts[panelId]?.textPositionX !== undefined ? panelTexts[panelId].textPositionX : (lastUsedTextSettings.textPositionX || 0)}
                            onChange={(e, value) => handleTextChange(panelId, 'textPositionX', value)}
                            min={-100}
                            max={100}
                            step={5}
                            marks={[{ value: 0, label: '' }]}
                            size="small"
                            sx={{ 
                              height: Math.max(isMobileSize ? 8 : 6, Math.min(12, fontSize * 0.8)),
                              color: '#ffffff',
                              flex: 1,
                              '& .MuiSlider-track': {
                                height: Math.max(isMobileSize ? 4 : 3, Math.min(6, fontSize * 0.4)),
                              },
                              '& .MuiSlider-rail': {
                                height: Math.max(isMobileSize ? 4 : 3, Math.min(6, fontSize * 0.4)),
                                color: 'rgba(255, 255, 255, 0.3)',
                              },
                              '& .MuiSlider-mark': {
                                backgroundColor: '#ffffff',
                                height: Math.max(isMobileSize ? 12 : 10, Math.min(16, fontSize)),
                                width: 2,
                                borderRadius: 1,
                                opacity: 0.8,
                              },
                              '& .MuiSlider-thumb': {
                                height: Math.max(isMobileSize ? 16 : 12, Math.min(22, fontSize * 1.2)),
                                width: Math.max(isMobileSize ? 16 : 12, Math.min(22, fontSize * 1.2)),
                                color: '#ffffff',
                                '&:before': {
                                  boxShadow: '0 2px 4px 0 rgb(0 0 0 / 20%)'
                                },
                                '&:hover, &.Mui-focusVisible': {
                                  boxShadow: '0px 0px 0px 6px rgb(255 255 255 / 16%)'
                                }
                              }
                            }}
                          />
                          <Typography variant="caption" sx={{ color: '#ffffff', ml: 1, fontSize: `${fontSize * 0.8}px`, minWidth: 'fit-content' }}>
                            {panelTexts[panelId]?.textPositionX !== undefined ? panelTexts[panelId].textPositionX : (lastUsedTextSettings.textPositionX || 0)}%
                          </Typography>
                        </Box>
                        
                        {/* Vertical Position */}
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <SwapVert sx={{ color: '#ffffff', mr: 1, fontSize: Math.max(isMobileSize ? 20 : 18, Math.min(24, fontSize * 1.2)) }} />
                          <Slider
                            value={(() => {
                              // Convert textPositionY to percentage from bottom for display
                              const textPositionY = panelTexts[panelId]?.textPositionY !== undefined ? panelTexts[panelId].textPositionY : (lastUsedTextSettings.textPositionY || 0);
                              if (textPositionY <= 0) {
                                // For negative values: 0% extends beyond frame bottom (-100) to 5% at default (0)
                                return 5 + (textPositionY / 100) * 5;
                              }
                              // For positive values: 5% at default (0) to 100% at frame top edge (100)
                              return 5 + (textPositionY / 100) * 95;
                            })()}
                                                         onChange={(e, value) => {
                               // Convert slider value (percentage from bottom) back to textPositionY
                               let textPositionY;
                               if (value <= 5) {
                                 // For values 0-5%: convert to -100 to 0 (extends beyond frame bottom to default)
                                 textPositionY = ((value - 5) / 5) * 100;
                               } else {
                                 // For values 5-100%: convert to 0 to 100 (default to frame top edge)
                                 textPositionY = ((value - 5) / 95) * 100;
                               }
                               handleTextChange(panelId, 'textPositionY', textPositionY);
                             }}
                            min={0}
                            max={100}
                            step={1}
                            marks={[{ value: 5, label: '' }]}
                            size="small"
                            sx={{ 
                              height: Math.max(isMobileSize ? 8 : 6, Math.min(12, fontSize * 0.8)),
                              color: '#ffffff',
                              flex: 1,
                              '& .MuiSlider-track': {
                                height: Math.max(isMobileSize ? 4 : 3, Math.min(6, fontSize * 0.4)),
                              },
                              '& .MuiSlider-rail': {
                                height: Math.max(isMobileSize ? 4 : 3, Math.min(6, fontSize * 0.4)),
                                color: 'rgba(255, 255, 255, 0.3)',
                              },
                              '& .MuiSlider-mark': {
                                backgroundColor: '#ffffff',
                                height: Math.max(isMobileSize ? 12 : 10, Math.min(16, fontSize)),
                                width: 2,
                                borderRadius: 1,
                                opacity: 0.8,
                              },
                              '& .MuiSlider-thumb': {
                                height: Math.max(isMobileSize ? 16 : 12, Math.min(22, fontSize * 1.2)),
                                width: Math.max(isMobileSize ? 16 : 12, Math.min(22, fontSize * 1.2)),
                                color: '#ffffff',
                                '&:before': {
                                  boxShadow: '0 2px 4px 0 rgb(0 0 0 / 20%)'
                                },
                                '&:hover, &.Mui-focusVisible': {
                                  boxShadow: '0px 0px 0px 6px rgb(255 255 255 / 16%)'
                                }
                              }
                            }}
                          />
                          <Typography variant="caption" sx={{ color: '#ffffff', ml: 1, fontSize: `${fontSize * 0.8}px`, minWidth: 'fit-content' }}>
                            {(() => {
                              // Show percentage from bottom for display
                              const textPositionY = panelTexts[panelId]?.textPositionY !== undefined ? panelTexts[panelId].textPositionY : (lastUsedTextSettings.textPositionY || 0);
                              if (textPositionY <= 0) {
                                return Math.round(5 + (textPositionY / 100) * 5);
                              }
                              return Math.round(5 + (textPositionY / 100) * 95);
                            })()}%
                          </Typography>
                        </Box>
                      </Box>
                    )}
                    
                    {/* Done button at the bottom */}
                    <Box sx={{ mt: Math.max(isMobileSize ? 0.75 : 0.5, Math.min(1, sidePadding)), px: 0.5 }}>
                      <Button
                        fullWidth
                        variant="contained"
                        onClick={handleTextClose}
                        sx={{
                          height: Math.max(isMobileSize ? 36 : 32, Math.min(44, fontSize * 2.2)),
                          backgroundColor: '#4CAF50', // Green color
                          color: '#ffffff',
                          fontSize: `${fontSize}px`,
                          fontWeight: '600',
                          textTransform: 'none',
                          borderRadius: `${borderRadius}px`,
                          border: 'none',
                          boxShadow: '0 2px 8px rgba(76, 175, 80, 0.3)',
                          '&:hover': {
                            backgroundColor: '#45a049',
                            boxShadow: '0 4px 12px rgba(76, 175, 80, 0.4)',
                            transform: 'translateY(-1px)',
                          },
                          '&:active': {
                            transform: 'translateY(0)',
                            boxShadow: '0 2px 6px rgba(76, 175, 80, 0.3)',
                          },
                          transition: 'all 0.2s ease-in-out',
                        }}
                      >
                        Done
                      </Button>
                    </Box>
                  </Box>
                )}
              </Box>
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

      {/* Caption editing focus overlays - darken and blur non-editing panels */}
      {textEditingPanel !== null && panelRects.map((rect, index) => {
        const { panelId } = rect;
        
        // Only show overlay on panels that are NOT being edited
        if (panelId === textEditingPanel) return null;
        
        return (
          <Box
            key={`focus-overlay-${panelId}`}
            sx={{
              position: 'absolute',
              top: rect.y,
              left: rect.x,
              width: rect.width,
              height: rect.height,
              backgroundColor: 'rgba(0, 0, 0, 0.85)', // Heavy darkening
              backdropFilter: 'blur(3px)', // Blur effect
              pointerEvents: 'none', // Don't interfere with mouse events
              transition: 'all 0.35s ease-out', // Clearly noticeable fade
              zIndex: 15, // Above hover overlays, below caption editor controls
            }}
          />
        );
      })}

      {/* Transform mode focus overlays - darken and blur non-transform panels */}
      {Object.values(isTransformMode).some(enabled => enabled) && textEditingPanel === null && panelRects.map((rect, index) => {
        const { panelId } = rect;
        
        // Only show overlay on panels that are NOT in transform mode
        if (isTransformMode[panelId]) return null;
        
        return (
          <Box
            key={`transform-overlay-${panelId}`}
            sx={{
              position: 'absolute',
              top: rect.y,
              left: rect.x,
              width: rect.width,
              height: rect.height,
              backgroundColor: 'rgba(0, 0, 0, 0.85)', // Heavy darkening
              backdropFilter: 'blur(3px)', // Blur effect
              pointerEvents: 'none', // Don't interfere with mouse events
              transition: 'all 0.35s ease-out', // Clearly noticeable fade
              zIndex: 15, // Above hover overlays, below caption editor controls
            }}
          />
        );
      })}

      {/* Scrolling overlay - indicates when interactions are disabled */}
      {isScrolling && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            zIndex: 25, // Above everything else
            transition: 'opacity 0.2s ease-in-out',
            borderRadius: 1,
          }}
        />
      )}

    </Box>
  );
};

export default CanvasCollagePreview; 