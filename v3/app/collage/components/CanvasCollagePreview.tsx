import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Box, IconButton, Typography, TextField, Slider, FormControl, InputLabel, Select, MenuItem, Button, Tabs, Tab, Tooltip, useMediaQuery, ToggleButtonGroup, ToggleButton, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions } from "@mui/material";
import { useTheme, styled, alpha } from "@mui/material/styles";
import type { Theme, SxProps } from "@mui/material/styles";
import { Add, OpenWith, Check, Edit, FormatColorText, Close, FormatSize, BorderOuter, FormatBold, FormatItalic, FontDownload, ControlCamera, SwapHoriz, SwapVert, Colorize, ChevronLeft, ChevronRight, Palette, Brush, RotateLeft, Restore } from '@mui/icons-material';
import { layoutDefinitions } from '../config/layouts';
import fonts from '../../../fonts';


// Define TypeScript interfaces
interface TextColorPreset {
  color: string;
  name: string;
}

interface PanelTransform {
  scale: number;
  positionX: number;
  positionY: number;
}

interface PanelText {
  content?: string;
  color?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: number | string;
  fontStyle?: string;
  strokeWidth?: number;
  textPositionX?: number;
  textPositionY?: number;
  textRotation?: number;
}

interface TextSettings {
  color?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: number | string;
  fontStyle?: string;
  strokeWidth?: number;
  textPositionX?: number;
  textPositionY?: number;
  textRotation?: number;
}

interface PanelRect {
  x: number;
  y: number;
  width: number;
  height: number;
  panelId: string;
  index: number;
}

interface LayoutConfig {
  gridTemplateColumns: string;
  gridTemplateRows: string;
  gridTemplateAreas?: string;
  areas?: string[];
  items: { gridArea: string | null }[];
}

interface CanvasCollagePreviewProps {
  selectedTemplate: any;
  selectedAspectRatio: string;
  panelCount: number;
  images?: any[];
  onPanelClick?: (index: number, panelId: string) => void;
  onMenuOpen?: () => void;
  aspectRatioValue?: number;
  panelImageMapping?: Record<string, number>;
  borderThickness?: number;
  borderColor?: string;
  panelTransforms?: Record<string, PanelTransform>;
  updatePanelTransform?: (panelId: string, transform: PanelTransform) => void;
  panelTexts?: Record<string, PanelText>;
  updatePanelText?: (panelId: string, text: PanelText) => void;
  lastUsedTextSettings?: TextSettings;
  isGeneratingCollage?: boolean;
}

interface ResetDialogData {
  type: string | null;
  panelId: string | null;
  propertyName: string | null;
}

interface TouchStartInfo {
  panelId: string;
  startX: number;
  startY: number;
  startTime: number;
  isTextArea?: boolean;
  dismissTransformMode?: boolean;
}

interface TemplateType {
  id: string; // Changed from Layout to string
  getLayoutConfig: () => LayoutConfig;
}

interface TextAreaBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  actualTextY: number;
  actualTextHeight: number;
}

interface TouchInfo {
  panelId: string;
  startX: number;
  startY: number;
  startTime: number;
  isTextArea?: boolean;
  dismissTransformMode?: boolean;
}

interface CanvasState {
  componentWidth: number;
  componentHeight: number;
  hoveredPanel: number | null;
  selectedPanel: number | null;
  isDragging: boolean;
  dragStart: { x: number; y: number };
  textEditingPanel: string | null;
  activeTextSetting: string | null;
  touchStartDistance: number | null;
  touchStartScale: number;
  resetDialogOpen: boolean;
  resetDialogData: ResetDialogData;
  activeSlider: string | null;
  textColorLeftScroll: boolean;
  textColorRightScroll: boolean;
  savedCustomTextColor: string;
}

// Color presets for text colors
const TEXT_COLOR_PRESETS: TextColorPreset[] = [
  { color: '#ffffff', name: 'White' },
  { color: '#000000', name: 'Black' },
  { color: '#ff0000', name: 'Red' },
  { color: '#00ff00', name: 'Green' },
  { color: '#0000ff', name: 'Blue' },
  { color: '#ffff00', name: 'Yellow' },
  { color: '#ff00ff', name: 'Magenta' },
  { color: '#00ffff', name: 'Cyan' },
];

// Horizontal scrollable container for horizontal scrolling sections
const HorizontalScroller = styled(Box)<{ theme?: Theme }>(({ theme }) => ({
  display: 'flex',
  overflowX: 'auto',
  overflowY: 'hidden',
  scrollbarWidth: 'none',
  '&::-webkit-scrollbar': {
    display: 'none',
  },
  msOverflowStyle: 'none',
  gap: theme.spacing(1),
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
  touchAction: 'pan-x',
  '@media (hover: none)': {
    overflowX: 'scroll',
    '-webkit-overflow-scrolling': 'touch',
    scrollSnapType: 'x mandatory',
    scrollSnapAlign: 'start',
  },
}));

// Improved ScrollButton for consistent appearance
const ScrollButton = styled(IconButton, {
  shouldForwardProp: (prop) => prop !== 'direction'
})<{ direction: 'left' | 'right'; theme?: Theme }>(({ theme, direction }) => ({
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

// Improved ScrollIndicator with subtle gradient
const ScrollIndicator = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'isVisible' && prop !== 'direction'
})<{ direction: 'left' | 'right'; isVisible: boolean; theme?: Theme }>(({ theme, direction, isVisible }) => ({
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

// Create a color swatch component for text color selection
interface ColorSwatchProps {
  selected?: boolean;
  size?: 'small' | 'medium';
  theme?: Theme;
  onClick?: () => void;
  children?: React.ReactNode;
  sx?: SxProps<Theme>;
}

const ColorSwatch = styled(Box, {
  shouldForwardProp: (prop) => !['selected', 'size'].includes(prop as string)
})<ColorSwatchProps>(({ theme, selected = false, size = 'medium' }) => {
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
}) as React.ComponentType<ColorSwatchProps>;

// Helper function to determine if a color is dark (for contrast)
const isDarkColor = (hexColor: string): boolean => {
  if (!hexColor || typeof hexColor !== 'string') return false;
  
  // Convert hex to RGB
  const r = parseInt(hexColor.substr(1, 2), 16);
  const g = parseInt(hexColor.substr(3, 2), 16);
  const b = parseInt(hexColor.substr(5, 2), 16);
  
  // Check for invalid values
  if (isNaN(r) || isNaN(g) || isNaN(b)) return false;
  
  // Calculate brightness (YIQ formula)
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  
  // Return true if color is dark
  return brightness < 128;
};

/**
 * Helper function to get border pixel size based on percentage and component width
 */
const getBorderPixelSize = (borderThickness: number, componentWidth: number = 400): number => {
  if (typeof borderThickness === 'number') {
    return Math.round((borderThickness / 100) * componentWidth);
  }
  return 0;
};

/**
 * Helper function to create layout config from template
 */
const createLayoutConfig = (template: TemplateType | null, panelCount: number): LayoutConfig | null => {
  if (!template) return null;
  
  try {
    // Get the layout definition directly
    const layoutDef = layoutDefinitions[template.id];
    
    if (layoutDef) {
      return {
        gridTemplateColumns: layoutDef.gridTemplateColumns,
        gridTemplateRows: layoutDef.gridTemplateRows,
        gridTemplateAreas: layoutDef.gridTemplateAreas || undefined,
        areas: layoutDef.areas,
        items: layoutDef.areas ? layoutDef.areas.map(area => ({ gridArea: area })) : Array(panelCount).fill({ gridArea: null })
      };
    }
    
    // Fallback to a basic grid layout
    return {
      gridTemplateColumns: `repeat(${Math.ceil(Math.sqrt(panelCount))}, 1fr)`,
      gridTemplateRows: `repeat(${Math.ceil(panelCount / Math.ceil(Math.sqrt(panelCount)))}, 1fr)`,
      gridTemplateAreas: undefined,
      items: Array(panelCount).fill({ gridArea: null })
    };
  } catch (error) {
    // Fallback to a basic grid layout in case of error
    return {
      gridTemplateColumns: `repeat(${Math.ceil(Math.sqrt(panelCount))}, 1fr)`,
      gridTemplateRows: `repeat(${Math.ceil(panelCount / Math.ceil(Math.sqrt(panelCount)))}, 1fr)`,
      gridTemplateAreas: undefined,
      items: Array(panelCount).fill({ gridArea: null })
    };
  }
};

/**
 * Helper function to parse CSS grid template areas string
 */
const parseGridTemplateAreas = (gridTemplateAreas: string | undefined): Record<string, any> => {
  if (!gridTemplateAreas) return {};
  
  const areas: Record<string, any> = {};
  
  // Split by quotes to get individual rows
  const cleanString = gridTemplateAreas.trim();
  let rows: string[][];
  
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
const parseGridToRects = (
  layoutConfig: LayoutConfig,
  containerWidth: number,
  containerHeight: number,
  panelCount: number,
  borderPixels: number
): PanelRect[] => {
  const rects: PanelRect[] = [];
  
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
  const getCellDimensions = (col: number, row: number) => {
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
    // Use grid template areas
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

const CanvasCollagePreview: React.FC<CanvasCollagePreviewProps> = ({
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
  isGeneratingCollage = false,
}) => {
  const theme = useTheme();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const textFieldRefs = useRef<Record<string, HTMLInputElement>>({});
  const lastInteractionTime = useRef<number>(0);
  const hoverTimeoutRef = useRef<number | null>(null);
  const touchStartInfo = useRef<TouchInfo | null>(null);
  const textColorScrollerRef = useRef<HTMLDivElement | null>(null);
  const textColorPickerRef = useRef<HTMLInputElement | null>(null);

  const [loadedImages, setLoadedImages] = useState<Record<string, HTMLImageElement>>({});
  const [componentWidth, setComponentWidth] = useState<number>(400);
  const [componentHeight, setComponentHeight] = useState<number>(400);
  const [panelRects, setPanelRects] = useState<PanelRect[]>([]);
  const [hoveredPanel, setHoveredPanel] = useState<number | null>(null);
  const [selectedPanel, setSelectedPanel] = useState<number | null>(null);
  const [isTransformMode, setIsTransformMode] = useState<Record<string, boolean>>({});
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [textEditingPanel, setTextEditingPanel] = useState<string | null>(null);
  const [activeTextSetting, setActiveTextSetting] = useState<string | null>(null);
  const [touchStartDistance, setTouchStartDistance] = useState<number | null>(null);
  const [touchStartScale, setTouchStartScale] = useState<number>(1);
  const [resetDialogOpen, setResetDialogOpen] = useState<boolean>(false);
  const [resetDialogData, setResetDialogData] = useState<ResetDialogData>({ type: null, panelId: null, propertyName: null });
  const [activeSlider, setActiveSlider] = useState<string | null>(null);
  const [textColorLeftScroll, setTextColorLeftScroll] = useState<boolean>(false);
  const [textColorRightScroll, setTextColorRightScroll] = useState<boolean>(false);
  const [savedCustomTextColor, setSavedCustomTextColor] = useState<string>(() => {
    const storedColor = localStorage.getItem('memeTextCustomColor');
    return storedColor || '#ffffff';
  });

  // Get layout configuration
  const layoutConfig = useMemo(() => {
    return selectedTemplate ? createLayoutConfig(selectedTemplate, panelCount) : null;
  }, [selectedTemplate, panelCount]);

  // Mobile detection for slider fix
  const isMobile = useMediaQuery((theme: Theme) => theme.breakpoints.down('md'));

  // Base canvas size for text scaling calculations
  const BASE_CANVAS_WIDTH = 400;
  
  // Calculate text scale factor based on current canvas size vs base size
  const textScaleFactor = useMemo(() => {
    return componentWidth / BASE_CANVAS_WIDTH;
  }, [componentWidth]);

  // Event Handlers
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Handle panel hover
    const newHoveredPanel = panelRects.findIndex(panel => 
      x >= panel.x && x <= panel.x + panel.width &&
      y >= panel.y && y <= panel.y + panel.height
    );

    setHoveredPanel(newHoveredPanel >= 0 ? newHoveredPanel : null);

    // Handle transform mode dragging
    if (isDragging && selectedPanel !== null) {
      const dx = x - dragStart.x;
      const dy = y - dragStart.y;
      const panelId = `panel-${selectedPanel + 1}`;

      const currentTransform = panelTransforms[panelId] || { scale: 1, positionX: 0, positionY: 0 };
      
      if (updatePanelTransform) {
        updatePanelTransform(panelId, {
          ...currentTransform,
          positionX: currentTransform.positionX + dx,
          positionY: currentTransform.positionY + dy
        });
      }

      setDragStart({ x, y });
    }
  }, [isDragging, selectedPanel, dragStart, panelRects, panelTransforms, updatePanelTransform]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const clickedPanelIndex = panelRects.findIndex(panel => 
      x >= panel.x && x <= panel.x + panel.width &&
      y >= panel.y && y <= panel.y + panel.height
    );

    if (clickedPanelIndex >= 0) {
      setSelectedPanel(clickedPanelIndex);
      setDragStart({ x, y });
      setIsDragging(true);

      if (onPanelClick) {
        onPanelClick(clickedPanelIndex, `panel-${clickedPanelIndex + 1}`);
      }
    } else {
      setSelectedPanel(null);
    }
  }, [panelRects, onPanelClick]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || e.touches.length === 0) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    const touchedPanelIndex = panelRects.findIndex(panel => 
      x >= panel.x && x <= panel.x + panel.width &&
      y >= panel.y && y <= panel.y + panel.height
    );

    if (touchedPanelIndex >= 0) {
      const panelId = `panel-${touchedPanelIndex + 1}`;
      touchStartInfo.current = {
        panelId,
        startX: x,
        startY: y,
        startTime: Date.now()
      };

      if (e.touches.length === 2) {
        const touch2 = e.touches[1];
        const x2 = touch2.clientX - rect.left;
        const y2 = touch2.clientY - rect.top;
        
        // Calculate initial pinch distance
        const distance = Math.sqrt(Math.pow(x2 - x, 2) + Math.pow(y2 - y, 2));
        setTouchStartDistance(distance);
        
        const currentTransform = panelTransforms[panelId] || { scale: 1, positionX: 0, positionY: 0 };
        setTouchStartScale(currentTransform.scale);
      }
    }
  }, [panelRects, panelTransforms]);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !touchStartInfo.current || e.touches.length === 0) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    if (e.touches.length === 2 && touchStartDistance !== null && updatePanelTransform) {
      // Handle pinch zoom
      const touch2 = e.touches[1];
      const x2 = touch2.clientX - rect.left;
      const y2 = touch2.clientY - rect.top;
      
      const currentDistance = Math.sqrt(Math.pow(x2 - x, 2) + Math.pow(y2 - y, 2));
      const scaleFactor = currentDistance / touchStartDistance;
      
      const currentTransform = panelTransforms[touchStartInfo.current.panelId] || { scale: 1, positionX: 0, positionY: 0 };
      
      updatePanelTransform(touchStartInfo.current.panelId, {
        ...currentTransform,
        scale: Math.max(0.1, Math.min(5, touchStartScale * scaleFactor))
      });
    } else {
      // Handle single touch drag
      const dx = x - touchStartInfo.current.startX;
      const dy = y - touchStartInfo.current.startY;
      
      const currentTransform = panelTransforms[touchStartInfo.current.panelId] || { scale: 1, positionX: 0, positionY: 0 };
      
      if (updatePanelTransform) {
        updatePanelTransform(touchStartInfo.current.panelId, {
          ...currentTransform,
          positionX: currentTransform.positionX + dx,
          positionY: currentTransform.positionY + dy
        });
      }

      touchStartInfo.current.startX = x;
      touchStartInfo.current.startY = y;
    }
  }, [touchStartDistance, touchStartScale, panelTransforms, updatePanelTransform]);

  const handleTouchEnd = useCallback(() => {
    touchStartInfo.current = null;
    setTouchStartDistance(null);
    setTouchStartScale(1);
  }, []);

  // Canvas Drawing Functions
  const drawPanel = useCallback((
    ctx: CanvasRenderingContext2D,
    rect: PanelRect,
    image: HTMLImageElement | null,
    transform: PanelTransform = { scale: 1, positionX: 0, positionY: 0 }
  ) => {
    // Draw panel background
    ctx.fillStyle = theme.palette.background.paper;
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height);

    if (image) {
      // Save context state
      ctx.save();
      
      // Create clipping path for the panel
      ctx.beginPath();
      ctx.rect(rect.x, rect.y, rect.width, rect.height);
      ctx.clip();

      // Calculate image dimensions to maintain aspect ratio
      const imageAspect = image.width / image.height;
      const rectAspect = rect.width / rect.height;
      
      let drawWidth = rect.width;
      let drawHeight = rect.height;
      
      if (imageAspect > rectAspect) {
        drawWidth = rect.height * imageAspect;
        drawHeight = rect.height;
      } else {
        drawWidth = rect.width;
        drawHeight = rect.width / imageAspect;
      }

      // Calculate center position
      const centerX = rect.x + rect.width / 2;
      const centerY = rect.y + rect.height / 2;

      // Apply transformations
      ctx.translate(centerX + transform.positionX, centerY + transform.positionY);
      ctx.scale(transform.scale, transform.scale);
      ctx.translate(-drawWidth / 2, -drawHeight / 2);

      // Draw the image
      ctx.drawImage(image, 0, 0, drawWidth, drawHeight);

      // Restore context state
      ctx.restore();
    }

    // Draw border if needed
    if (borderThickness > 0) {
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = borderThickness;
      ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
    }
  }, [theme.palette.background.paper, borderThickness, borderColor]);

  // Text Rendering Functions
  const calculateOptimalFontSize = useCallback((
    text: string,
    maxWidth: number,
    maxHeight: number,
    ctx: CanvasRenderingContext2D
  ): number => {
    if (!text || !text.trim()) return 26; // Default size for empty text
    
    const textPadding = 10;
    const availableWidth = maxWidth - (textPadding * 2);
    const availableHeight = maxHeight * 0.4; // Use up to 40% of panel height for text
    
    // Calculate a reasonable maximum font size based on panel dimensions
    const reasonableMaxSize = Math.min(48, Math.max(16, maxHeight * 0.15));
    
    // Start with a reasonable size and work down
    for (let fontSize = reasonableMaxSize; fontSize >= 8; fontSize -= 2) {
      ctx.font = `700 ${fontSize}px Arial`; // Use bold Arial as baseline
      
      // Simple word wrapping to estimate lines
      const words = text.split(' ');
      const lines: string[] = [];
      let currentLine = '';
      
      words.forEach(word => {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        if (ctx.measureText(testLine).width <= availableWidth) {
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
      
      if (totalTextHeight <= availableHeight) {
        return Math.max(fontSize, 12); // Minimum font size of 12
      }
    }
    
    return 12; // Fallback minimum size
  }, []);

  const drawPanelText = useCallback((
    ctx: CanvasRenderingContext2D,
    rect: PanelRect,
    text: PanelText,
    defaultSettings: TextSettings = {}
  ) => {
    const hasActualText = text.content && text.content.trim();
    if (!hasActualText && isGeneratingCollage) return;

    ctx.save();
    
    // Clip text to panel bounds
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.width, rect.height);
    ctx.clip();
    
    // Set text properties
    let baseFontSize = text.fontSize || defaultSettings.fontSize || 26;
    
    // Auto-calculate optimal font size if no explicit size is set and there's actual text
    if (hasActualText && !text.fontSize && text.content) {
      baseFontSize = calculateOptimalFontSize(text.content, rect.width, rect.height, ctx);
    }
    
    // Scale font size based on canvas size
    const fontSize = baseFontSize * textScaleFactor;
    const fontWeight = text.fontWeight || defaultSettings.fontWeight || 400;
    const fontStyle = text.fontStyle || defaultSettings.fontStyle || 'normal';
    const fontFamily = text.fontFamily || defaultSettings.fontFamily || 'Arial';
    const textColor = text.color || defaultSettings.color || '#ffffff';
    const strokeWidth = text.strokeWidth || defaultSettings.strokeWidth || 2;
    
    ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Set stroke properties
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = strokeWidth;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    
    // Add text shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;
    ctx.shadowBlur = 3;
    
    // Calculate text position
    const textPadding = 10;
    const maxTextWidth = rect.width - (textPadding * 2);
    const textPositionX = text.textPositionX !== undefined ? text.textPositionX : (defaultSettings.textPositionX || 0);
    const textPositionY = text.textPositionY !== undefined ? text.textPositionY : (defaultSettings.textPositionY || 0);
    const textRotation = text.textRotation !== undefined ? text.textRotation : (defaultSettings.textRotation || 0);
    
    const textX = rect.x + (rect.width / 2) + (textPositionX / 100) * (rect.width / 2 - textPadding);
    
    // Helper function to wrap text
    const wrapText = (text: string, maxWidth: number): string[] => {
      const lines: string[] = [];
      const manualLines = text.split('\n');
      
      manualLines.forEach(line => {
        if (ctx.measureText(line).width <= maxWidth) {
          lines.push(line);
        } else {
          const words = line.split(' ');
          let currentLine = '';
          
          words.forEach(word => {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            if (ctx.measureText(testLine).width <= maxWidth) {
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
        }
      });
      
      return lines;
    };
    
    // Get wrapped lines
    const content = hasActualText && text.content ? text.content : 'Add Caption';
    const lines = wrapText(content, maxTextWidth);
    const lineHeight = fontSize * 1.2;
    const totalTextHeight = lines.length * lineHeight;
    
    // Calculate vertical position
    let textAnchorY;
    if (textPositionY <= 0) {
      const defaultBottomPosition = rect.y + (rect.height * 0.95);
      const extendedBottomPosition = rect.y + rect.height + (rect.height * 0.1);
      const t = Math.abs(textPositionY) / 100;
      textAnchorY = defaultBottomPosition + t * (extendedBottomPosition - defaultBottomPosition);
    } else {
      const defaultBottomPosition = rect.y + (rect.height * 0.95);
      const frameTopPosition = rect.y;
      const t = textPositionY / 100;
      textAnchorY = defaultBottomPosition + t * (frameTopPosition - defaultBottomPosition);
    }
    
    // Calculate where the first line should start
    const startY = textAnchorY - totalTextHeight + (lineHeight / 2);
    
    // Apply rotation if needed
    if (textRotation !== 0) {
      ctx.save();
      const textCenterX = textX;
      const textCenterY = textAnchorY - totalTextHeight / 2;
      ctx.translate(textCenterX, textCenterY);
      ctx.rotate((textRotation * Math.PI) / 180);
      ctx.translate(-textCenterX, -textCenterY);
    }
    
    // Draw each line
    lines.forEach((line, lineIndex) => {
      const lineY = startY + lineIndex * lineHeight;
      
      if (strokeWidth > 0) {
        ctx.strokeText(line, textX, lineY);
      }
      ctx.fillText(line, textX, lineY);
    });
    
    // Restore rotation if applied
    if (textRotation !== 0) {
      ctx.restore();
    }
    
    ctx.restore();
  }, [calculateOptimalFontSize, textScaleFactor, isGeneratingCollage]);

  // Text Editing Handlers
  const handleTextEdit = useCallback((panelId: string) => {
    setTextEditingPanel(textEditingPanel === panelId ? null : panelId);
    setActiveTextSetting('content');
  }, [textEditingPanel]);

  const handleTextChange = useCallback((
    panelId: string,
    property: keyof PanelText,
    value: string | number | undefined
  ) => {
    if (!updatePanelText) return;

    const currentText = panelTexts[panelId] || {};
    
    // Handle undefined (reset) case
    if (value === undefined) {
      // Create object without the property to use default
      const updatedText = { ...currentText };
      delete (updatedText as any)[property];
      updatePanelText(panelId, updatedText);
      return;
    }

    let updatedText = { ...currentText, [property]: value };

    // Handle special cases
    if (property === 'fontWeight') {
      // Normalize font weight
      if (value === 'normal' || value === '400') {
        updatedText.fontWeight = 400;
      } else if (value === 'bold' || value === '700') {
        updatedText.fontWeight = 700;
      } else if (typeof value === 'string') {
        const numValue = parseInt(value, 10);
        updatedText.fontWeight = Number.isNaN(numValue) ? 400 : numValue;
      }
    }

    // Set default font size for new text
    if (property === 'content' && value && typeof value === 'string' && value.trim()) {
      const hadPreviousContent = currentText.content && currentText.content.trim();
      const hasExplicitFontSize = currentText.fontSize !== undefined;

      if (!hadPreviousContent && !hasExplicitFontSize) {
        updatedText.fontSize = lastUsedTextSettings.fontSize || 26;
      }
    }

    updatePanelText(panelId, updatedText);
  }, [panelTexts, updatePanelText, lastUsedTextSettings]);

  // Main drawing function
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

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
    if (borderThickness > 0) {
      ctx.fillStyle = borderColor;
      ctx.fillRect(0, 0, componentWidth, componentHeight);
    }
    
    // Draw panels
    panelRects.forEach((rect) => {
      const { panelId, index } = rect;
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
      ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
      
      if (hasImage) {
        const img = loadedImages[imageIndex];
        if (img) {
          drawPanel(ctx, rect, img, transform);
        }
      } else {
        // Draw add icon for empty panels
        const iconSize = Math.min(rect.width, rect.height) * 0.3;
        const iconX = rect.x + (rect.width - iconSize) / 2;
        const iconY = rect.y + (rect.height - iconSize) / 2;
        
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
      
      // Draw text if panel has an image
      if (hasImage) {
        drawPanelText(ctx, rect, panelText, lastUsedTextSettings);
      }
      
      // Draw hover/selection effects
      if (isHovered || isSelected || isInTransformMode) {
        ctx.save();
        ctx.strokeStyle = isInTransformMode ? '#4CAF50' : '#2196F3';
        ctx.lineWidth = 2;
        ctx.setLineDash(isInTransformMode ? [5, 5] : []);
        ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
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
    borderThickness,
    borderColor,
    hoveredPanel,
    selectedPanel,
    isTransformMode,
    panelTexts,
    lastUsedTextSettings,
    theme.palette.mode,
    drawPanel,
    drawPanelText
  ]);

  // Effect to redraw canvas when dependencies change
  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  // Effect to update dimensions and redraw when container size changes
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const width = rect.width || 400;
        const height = width / aspectRatioValue;
        
        setComponentWidth(width);
        setComponentHeight(height);
        
        if (layoutConfig) {
          const rects = parseGridToRects(layoutConfig, width, height, panelCount, borderThickness);
          setPanelRects(rects);
        }
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    
    return () => window.removeEventListener('resize', updateDimensions);
  }, [aspectRatioValue, layoutConfig, panelCount, borderThickness]);

  // Effect to load images when they change
  useEffect(() => {
    const loadImage = async (src: string | { displayUrl?: string; originalUrl?: string }, key: number) => {
      return new Promise<{ key: number; img: HTMLImageElement | null }>((resolve) => {
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
      const newLoadedImages: Record<string, HTMLImageElement> = {};
      
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

  // Render text editing controls
  const renderTextControls = (panelId: string) => {
    const text = panelTexts[panelId] || {};
    
    return (
      <Box
        sx={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.95)',
          borderRadius: 1,
          p: 2,
          mt: 1,
          zIndex: 20,
        }}
      >
        <Tabs
          value={activeTextSetting ? ['content', 'format', 'placement', 'style'].indexOf(activeTextSetting) : 0}
          onChange={(_, newValue) => {
            const settings = ['content', 'format', 'placement', 'style'];
            setActiveTextSetting(settings[newValue]);
          }}
          sx={{ mb: 2 }}
        >
          <Tab icon={<Edit />} />
          <Tab icon={<FormatSize />} />
          <Tab icon={<ControlCamera />} />
          <Tab icon={<Palette />} />
        </Tabs>

        {activeTextSetting === 'content' && (
          <TextField
            fullWidth
            multiline
            rows={3}
            placeholder="Add Caption"
            value={text.content || ''}
            onChange={(e) => handleTextChange(panelId, 'content', e.target.value)}
            inputRef={(el) => {
              if (el) {
                textFieldRefs.current[panelId] = el;
              }
            }}
            sx={{
              '& .MuiInputBase-root': {
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                color: '#000000',
              },
              '& .MuiInputBase-input': {
                textAlign: 'center',
              },
            }}
          />
        )}

        {activeTextSetting === 'format' && (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Typography sx={{ minWidth: 100 }}>Font Size</Typography>
              <Slider
                value={text.fontSize || lastUsedTextSettings.fontSize || 26}
                onChange={(_, value) => handleTextChange(panelId, 'fontSize', value as number)}
                min={8}
                max={72}
                sx={{ ml: 2 }}
              />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography sx={{ minWidth: 100 }}>Stroke Width</Typography>
              <Slider
                value={text.strokeWidth || lastUsedTextSettings.strokeWidth || 2}
                onChange={(_, value) => handleTextChange(panelId, 'strokeWidth', value as number)}
                min={0}
                max={10}
                step={0.5}
                sx={{ ml: 2 }}
              />
            </Box>
          </>
        )}

        {activeTextSetting === 'placement' && (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Typography sx={{ minWidth: 100 }}>Position X</Typography>
              <Slider
                value={text.textPositionX !== undefined ? text.textPositionX : (lastUsedTextSettings.textPositionX || 0)}
                onChange={(_, value) => handleTextChange(panelId, 'textPositionX', value as number)}
                min={-100}
                max={100}
                sx={{ ml: 2 }}
              />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Typography sx={{ minWidth: 100 }}>Position Y</Typography>
              <Slider
                value={text.textPositionY !== undefined ? text.textPositionY : (lastUsedTextSettings.textPositionY || 0)}
                onChange={(_, value) => handleTextChange(panelId, 'textPositionY', value as number)}
                min={-100}
                max={100}
                sx={{ ml: 2 }}
              />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography sx={{ minWidth: 100 }}>Rotation</Typography>
              <Slider
                value={text.textRotation !== undefined ? text.textRotation : (lastUsedTextSettings.textRotation || 0)}
                onChange={(_, value) => handleTextChange(panelId, 'textRotation', value as number)}
                min={-180}
                max={180}
                sx={{ ml: 2 }}
              />
            </Box>
          </>
        )}

        {activeTextSetting === 'style' && (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <ToggleButtonGroup
                value={[
                  text.fontWeight === 700 || text.fontWeight === 'bold' ? 'bold' : '',
                  text.fontStyle === 'italic' ? 'italic' : '',
                ].filter(Boolean)}
                onChange={(_, newFormats) => {
                  handleTextChange(panelId, 'fontWeight', newFormats.includes('bold') ? 700 : 400);
                  handleTextChange(panelId, 'fontStyle', newFormats.includes('italic') ? 'italic' : 'normal');
                }}
              >
                <ToggleButton value="bold">
                  <FormatBold />
                </ToggleButton>
                <ToggleButton value="italic">
                  <FormatItalic />
                </ToggleButton>
              </ToggleButtonGroup>
              <FormControl sx={{ ml: 2, flex: 1 }}>
                <Select
                  value={text.fontFamily || lastUsedTextSettings.fontFamily || 'Arial'}
                  onChange={(e) => handleTextChange(panelId, 'fontFamily', e.target.value)}
                  sx={{ height: 40 }}
                >
                  {fonts.map((font: string) => (
                    <MenuItem 
                      key={font} 
                      value={font}
                      sx={{ fontFamily: font }} // Display each font name in its own font
                    >
                      {font}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {TEXT_COLOR_PRESETS.map((preset) => (
                <ColorSwatch
                  key={preset.color}
                  onClick={() => handleTextChange(panelId, 'color', preset.color)}
                  selected={text.color === preset.color}
                  sx={{ backgroundColor: preset.color }}
                />
              ))}
              <Box sx={{ position: 'relative' }}>
                <ColorSwatch
                  onClick={() => textColorPickerRef.current?.click()}
                  selected={false}
                  sx={{ backgroundColor: savedCustomTextColor }}
                >
                  <Colorize fontSize="small" />
                </ColorSwatch>
                <input
                  type="color"
                  ref={textColorPickerRef}
                  value={savedCustomTextColor}
                  onChange={(e) => {
                    setSavedCustomTextColor(e.target.value);
                    handleTextChange(panelId, 'color', e.target.value);
                  }}
                  style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
                />
              </Box>
            </Box>
          </>
        )}

        <Button
          fullWidth
          variant="contained"
          onClick={() => setTextEditingPanel(null)}
          sx={{ mt: 2 }}
        >
          Done
        </Button>
      </Box>
    );
  };

  return (
    <Box ref={containerRef} className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        width={componentWidth}
        height={componentHeight}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          width: '100%',
          height: '100%',
          touchAction: 'none'
        }}
      />

      {/* Panel Controls */}
      {panelRects.map((rect, index) => {
        const panelId = `panel-${index + 1}`;
        const hasImage = panelImageMapping[panelId] !== undefined;
        const isInTransformMode = isTransformMode[panelId];

        return (
          <React.Fragment key={panelId}>
            {hasImage && !textEditingPanel && (
              <IconButton
                size="small"
                onClick={() => setIsTransformMode({ ...isTransformMode, [panelId]: !isInTransformMode })}
                sx={{
                  position: 'absolute',
                  top: rect.y + 8,
                  right: rect.x + rect.width - 40,
                  backgroundColor: isInTransformMode ? '#4CAF50' : '#2196F3',
                  color: '#ffffff',
                  '&:hover': {
                    backgroundColor: isInTransformMode ? '#45a049' : '#1976D2',
                  },
                }}
              >
                {isInTransformMode ? <Check /> : <OpenWith />}
              </IconButton>
            )}

            {textEditingPanel === panelId && renderTextControls(panelId)}
          </React.Fragment>
        );
      })}

      {/* Reset Dialog */}
      <Dialog
        open={resetDialogOpen}
        onClose={() => setResetDialogOpen(false)}
      >
        <DialogTitle>Reset to Default</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to reset this setting to its default value?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={() => {
              if (resetDialogData.panelId && resetDialogData.propertyName) {
                handleTextChange(resetDialogData.panelId, resetDialogData.propertyName as keyof PanelText, undefined);
              }
              setResetDialogOpen(false);
            }}
            autoFocus
          >
            Reset
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CanvasCollagePreview; 