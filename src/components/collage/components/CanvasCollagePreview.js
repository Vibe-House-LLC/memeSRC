import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Box, IconButton, Typography, Menu, MenuItem, ListItemIcon, Snackbar, Alert } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { Check, Place, Crop, DragIndicator, Image as ImageIcon, Subtitles, SaveAlt, AutoFixHighRounded, DeleteOutline, OpenInFull, RotateRight } from '@mui/icons-material';
import { layoutDefinitions } from '../config/layouts';
import CaptionEditor from './CaptionEditor';
import { getMetadataForKey } from '../../../utils/library/metadata';
import { parseFormattedText } from '../../../utils/inlineFormatting';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const normalizeAngleDeg = (value) => {
  if (!Number.isFinite(value)) return 0;
  let next = value % 360;
  if (next > 180) next -= 360;
  if (next <= -180) next += 360;
  return next;
};
const angleFromPointDeg = (centerX, centerY, pointX, pointY) => (
  Math.atan2(pointY - centerY, pointX - centerX) * (180 / Math.PI)
);



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
 * Parse a CSS color string (hex/rgb/rgba) to { r, g, b, a }
 */
const parseColorToRGBA = (color) => {
  if (!color || typeof color !== 'string') return null;
  const c = color.trim();
  try {
    // Hex formats: #RGB, #RRGGBB, #RRGGBBAA
    if (c[0] === '#') {
      const hex = c.slice(1);
      if (hex.length === 3) {
        const r = parseInt(hex[0] + hex[0], 16);
        const g = parseInt(hex[1] + hex[1], 16);
        const b = parseInt(hex[2] + hex[2], 16);
        return { r, g, b, a: 1 };
      }
      if (hex.length === 6 || hex.length === 8) {
        const r = parseInt(hex.slice(0, 2), 16);
        const g = parseInt(hex.slice(2, 4), 16);
        const b = parseInt(hex.slice(4, 6), 16);
        const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
        return { r, g, b, a };
      }
      return null;
    }

    // rgb()/rgba()
    const rgbMatch = c.match(/rgba?\(([^)]+)\)/i);
    if (rgbMatch) {
      const parts = rgbMatch[1].split(',').map((v) => v.trim());
      const r = Math.max(0, Math.min(255, parseFloat(parts[0])));
      const g = Math.max(0, Math.min(255, parseFloat(parts[1])));
      const b = Math.max(0, Math.min(255, parseFloat(parts[2])));
      const a = parts[3] !== undefined ? Math.max(0, Math.min(1, parseFloat(parts[3]))) : 1;
      return { r, g, b, a };
    }
  } catch (_) {
    // ignore parse errors
  }
  return null;
};

/**
 * Compute relative luminance for RGB in sRGB space
 */
const relativeLuminance = ({ r, g, b }) => {
  const srgb = [r, g, b].map((v) => v / 255);
  const lin = srgb.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
};

/**
 * Return '#000000' or '#FFFFFF' depending on which contrasts better with the text color
 */
const getContrastingMonoStroke = (textColor) => {
  const rgba = parseColorToRGBA(textColor);
  if (!rgba) return '#000000';
  const L = relativeLuminance(rgba);
  const contrastWithBlack = (L + 0.05) / 0.05; // black luminance ~ 0
  const contrastWithWhite = 1.05 / (L + 0.05); // white luminance ~ 1
  return contrastWithBlack >= contrastWithWhite ? '#000000' : '#FFFFFF';
};

const rgbaString = (r, g, b, a = 1) => `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${a})`;

const normalizeFontWeightValue = (fontWeight) => {
  if (fontWeight === undefined || fontWeight === null) return '400';
  if (typeof fontWeight === 'number') return String(fontWeight);
  if (fontWeight === 'normal') return '400';
  if (fontWeight === 'bold') return '700';
  return String(fontWeight);
};

const resolveInlineSegmentStyle = (baseStyle, inlineStyle = {}) => ({
  // Inline formatting is absolute, not relative to base style
  // bold: true -> 700, bold: false -> 400 (ignore baseStyle.fontWeight)
  fontWeight: inlineStyle.bold ? '700' : '400',
  fontStyle: inlineStyle.italic ? 'italic' : 'normal',
  underline: Boolean(inlineStyle.underline),
});

const measureStyledWidth = (ctx, text, ranges, start, end, baseStyle, fontSize, fontFamily) => {
  if (!ctx || start >= end) return 0;
  const effectiveRanges = ranges && ranges.length ? ranges : [{ start: 0, end: text.length, style: {} }];
  let width = 0;

  effectiveRanges.forEach((range) => {
    const overlapStart = Math.max(start, range.start);
    const overlapEnd = Math.min(end, range.end);
    if (overlapEnd > overlapStart) {
      const style = resolveInlineSegmentStyle(baseStyle, range.style);
      ctx.font = `${style.fontStyle || 'normal'} ${style.fontWeight} ${fontSize}px ${fontFamily}`;
      width += ctx.measureText(text.slice(overlapStart, overlapEnd)).width;
    }
  });

  return width;
};

const getSegmentsForLine = (ranges, lineStart, lineEnd, baseStyle) => {
  const effectiveRanges = ranges && ranges.length ? ranges : [{ start: lineStart, end: lineEnd, style: {} }];
  const segments = effectiveRanges
    .map((range) => {
      const start = Math.max(lineStart, range.start);
      const end = Math.min(lineEnd, range.end);
      if (end <= start) return null;
      return { start, end, style: resolveInlineSegmentStyle(baseStyle, range.style) };
    })
    .filter(Boolean);

  if (!segments.length) {
    return [{ start: lineStart, end: lineEnd, style: resolveInlineSegmentStyle(baseStyle, {}) }];
  }

  return segments;
};

const buildWrappedLines = (ctx, text, ranges, maxWidth, baseStyle, fontSize, fontFamily) => {
  if (!text) {
    return [{ text: '', start: 0, end: 0, width: 0 }];
  }

  const lines = [];
  let cursor = 0;

  while (cursor < text.length) {
    if (text[cursor] === '\n') {
      lines.push({ text: '', start: cursor, end: cursor, width: 0 });
      cursor += 1;
      continue;
    }

    const lineStart = cursor;
    let lineEnd = cursor;
    let lastSpace = -1;
    let currentWidth = 0;

    while (lineEnd < text.length && text[lineEnd] !== '\n') {
      const nextEnd = lineEnd + 1;
      const nextWidth = measureStyledWidth(ctx, text, ranges, lineStart, nextEnd, baseStyle, fontSize, fontFamily);

      if (text[lineEnd] === ' ') {
        lastSpace = lineEnd;
      }

      if (nextWidth > maxWidth) {
        if (lastSpace >= lineStart) {
          const breakEnd = lastSpace;
          const breakWidth = measureStyledWidth(
            ctx,
            text,
            ranges,
            lineStart,
            breakEnd,
            baseStyle,
            fontSize,
            fontFamily,
          );
          lines.push({
            text: text.slice(lineStart, breakEnd),
            start: lineStart,
            end: breakEnd,
            width: breakWidth,
          });
          cursor = breakEnd + 1;
        } else {
          const forcedEnd = Math.max(lineStart + 1, lineEnd);
          const forcedWidth = measureStyledWidth(
            ctx,
            text,
            ranges,
            lineStart,
            forcedEnd,
            baseStyle,
            fontSize,
            fontFamily,
          );
          lines.push({
            text: text.slice(lineStart, forcedEnd),
            start: lineStart,
            end: forcedEnd,
            width: forcedWidth,
          });
          cursor = forcedEnd;
        }
        break;
      }

      currentWidth = nextWidth;
      lineEnd = nextEnd;
    }

    if (lineEnd >= text.length || text[lineEnd] === '\n') {
      const end = lineEnd;
      const width = measureStyledWidth(
        ctx,
        text,
        ranges,
        lineStart,
        end,
        baseStyle,
        fontSize,
        fontFamily,
      );
      lines.push({
        text: text.slice(lineStart, end),
        start: lineStart,
        end,
        width,
      });
      cursor = end + 1;
    }
  }

  if (!lines.length) {
    lines.push({ text: '', start: 0, end: 0, width: 0 });
  }

  return lines;
};

/**
 * Helper function to create layout config from template
 */
const createLayoutConfig = (template, panelCount) => {
  if (!template) return null;
  
  try {
    // Look up the original layout in the layout definitions
    const panelCountKey = Math.max(1, Math.min(panelCount, 5));
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
  panelCount,
  images = [],
  onPanelClick,
  onRemovePanel,
  onEditImage, // new: request magic edit for a panel
  canEditImage = false, // new: control visibility of magic edit option
  onSaveGestureDetected, // new: notify parent when long-press/right-click implies save intent
  isFrameActionSuppressed, // optional: function to indicate suppression window
  isHydratingProject = false,
  aspectRatioValue = 1,
  panelImageMapping = {},
  updatePanelImageMapping,
  borderThickness = 0,
  borderColor = '#000000',
  panelTransforms = {},
  updatePanelTransform,
  panelTexts = {},
  stickers = [],
  updateSticker,
  moveSticker,
  removeSticker,
  updatePanelText,
  lastUsedTextSettings = {},
  onCaptionEditorVisibleChange,
  isGeneratingCollage = false, // New prop to exclude placeholder text during export
  // Render tracking for upstream autosave/thumbnail logic
  renderSig,
  onRendered,
  // Editing session tracking (crop & zoom / reorder)
  onEditingSessionChange,
  // When provided, use as initial custom grid config (restored from snapshot)
  initialCustomLayout,
  customLayoutKey,
  // New: report preview metrics and layout without DOM queries
  onPreviewMetaChange,
  allowHydrationTransformCarry = false,
}) => {
  const theme = useTheme();
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [componentWidth, setComponentWidth] = useState(400);
  const [componentHeight, setComponentHeight] = useState(400);
  const [loadedImages, setLoadedImages] = useState({});
  const [loadedStickers, setLoadedStickers] = useState({});
  const [activeStickerId, setActiveStickerId] = useState(null);
  const [stickerInteraction, setStickerInteraction] = useState(null);
  const [stickerDrafts, setStickerDrafts] = useState({});
  const stickerDraftsRef = useRef({});
  const pendingStickerPointerRef = useRef(null);
  const stickerRafRef = useRef(null);
  // Trigger redraws once custom fonts are ready (especially after loading a saved project)
  const [fontsReadyVersion, setFontsReadyVersion] = useState(0);

  // Build a stable key of all font families currently in use
  const fontsKey = useMemo(() => {
    try {
      const families = new Set();
      if (panelTexts && typeof panelTexts === 'object') {
        Object.values(panelTexts).forEach((pt) => {
          if (pt && pt.fontFamily) families.add(String(pt.fontFamily));
        });
      }
      if (lastUsedTextSettings?.fontFamily) families.add(String(lastUsedTextSettings.fontFamily));
      return Array.from(families).sort().join('|');
    } catch (_) {
      return '';
    }
  }, [panelTexts, lastUsedTextSettings?.fontFamily]);

  // Best-effort font preloading: request families, await readiness, then bump version to trigger redraw
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        if (typeof document === 'undefined' || !document.fonts) return;
        const list = fontsKey ? fontsKey.split('|').filter(Boolean) : [];
        if (list.length === 0) return;
        const loaders = list.map((fam) => {
          const family = fam.includes(' ') ? JSON.stringify(fam) : fam;
          const css = `700 24px ${family}`;
          try { return document.fonts.load(css); } catch (_) { return Promise.resolve(); }
        });
        if (loaders.length) {
          try { await Promise.all(loaders); } catch (_) { /* ignore */ }
        }
        if (document.fonts.ready) {
          try { await document.fonts.ready; } catch (_) { /* ignore */ }
        }
      } finally {
        if (!cancelled) setFontsReadyVersion((v) => v + 1);
      }
    };
    run();
    // Fallback bump shortly after in case fonts API isn't present or misses
    const t = setTimeout(() => { if (!cancelled) setFontsReadyVersion((v) => v + 1); }, 800);
    return () => { cancelled = true; clearTimeout(t); };
  }, [fontsKey]);
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
  const defaultCaptionCacheRef = useRef({});
  const panelTextsRef = useRef(panelTexts);

  // Keep panelTextsRef in sync with panelTexts state
  useEffect(() => {
    panelTextsRef.current = panelTexts;
  }, [panelTexts]);

  // Notify parent when caption editor visibility changes
  useEffect(() => {
    if (typeof onCaptionEditorVisibleChange === 'function') {
      onCaptionEditorVisibleChange(textEditingPanel !== null);
    }
    return () => {
      if (typeof onCaptionEditorVisibleChange === 'function') {
        onCaptionEditorVisibleChange(false);
      }
    };
  }, [textEditingPanel, onCaptionEditorVisibleChange]);

  // Reorder state
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [reorderSourcePanel, setReorderSourcePanel] = useState(null);

  // Action menu state for per-panel controls
  const [actionMenuAnchorEl, setActionMenuAnchorEl] = useState(null);
  const [actionMenuPanelId, setActionMenuPanelId] = useState(null);
  const [actionMenuPosition, setActionMenuPosition] = useState(null);

  // Border dragging state
  const [borderZones, setBorderZones] = useState([]);
  const [isDraggingBorder, setIsDraggingBorder] = useState(false);
  const [draggedBorder, setDraggedBorder] = useState(null);
  const [borderDragStart, setBorderDragStart] = useState({ x: 0, y: 0 });
  const [hoveredBorder, setHoveredBorder] = useState(null);
  const [customLayoutConfig, setCustomLayoutConfig] = useState(initialCustomLayout || null);

  // If the layout key changes (template/panelCount/aspect), drop any prior custom grid.
  // When a persisted custom layout exists, only adopt it if it supports the current panel count.
  const prevLayoutKeyRef = useRef(customLayoutKey);
  const injectedLayoutSignature = useMemo(
    () => (initialCustomLayout ? JSON.stringify(initialCustomLayout) : null),
    [initialCustomLayout]
  );
  const prevInjectedLayoutSignatureRef = useRef(injectedLayoutSignature);
  const countGridTracks = useCallback((template) => {
    if (typeof template !== 'string' || template.trim().length === 0) return 0;
    const expanded = template.replace(/repeat\((\d+)\s*,\s*([^)]+)\)/gi, (_, count, body) => {
      const n = Math.max(0, parseInt(count, 10) || 0);
      if (n === 0) return '';
      const token = body.trim();
      return Array.from({ length: n }).map(() => token).join(' ');
    });
    return expanded
      .split(/\s+/)
      .filter((token) => token.length > 0)
      .length;
  }, []);
  const isCustomLayoutCompatible = useCallback((layout, count) => {
    try {
      if (!layout || typeof layout !== 'object') return false;
      const needed = Math.max(1, count || 1);
      if (Array.isArray(layout.areas)) return layout.areas.length >= needed;
      if (Array.isArray(layout.items)) return layout.items.length >= needed;
      const cols = countGridTracks(layout.gridTemplateColumns);
      const rows = countGridTracks(layout.gridTemplateRows);
      if (cols > 0 && rows > 0) {
        return cols * rows >= needed;
      }
      return false;
    } catch (_) { return false; }
  }, [countGridTracks]);
  useEffect(() => {
    if (prevLayoutKeyRef.current !== customLayoutKey) {
      // Apply provided layout only if it's compatible; otherwise reset to base
      const next = isCustomLayoutCompatible(initialCustomLayout, panelCount) ? (initialCustomLayout || null) : null;
      setCustomLayoutConfig(next);
      prevLayoutKeyRef.current = customLayoutKey;
    }
  }, [customLayoutKey, initialCustomLayout, panelCount, isCustomLayoutCompatible]);

  // If a custom layout is provided after mount (e.g., load sequence), adopt it once
  useEffect(() => {
    if (prevInjectedLayoutSignatureRef.current === injectedLayoutSignature) return;
    prevInjectedLayoutSignatureRef.current = injectedLayoutSignature;
    if (!initialCustomLayout) {
      setCustomLayoutConfig(null);
      return;
    }
    if (isCustomLayoutCompatible(initialCustomLayout, panelCount)) {
      setCustomLayoutConfig(initialCustomLayout);
    }
  }, [injectedLayoutSignature, initialCustomLayout, panelCount, isCustomLayoutCompatible]);

  // Long-press (press-and-hold) hint state
  const [saveHintOpen, setSaveHintOpen] = useState(false);
  const longPressTimerRef = useRef(null);
  const longPressActiveRef = useRef(false);
  const longPressStartRef = useRef({ x: 0, y: 0, scrollY: 0 });

  // Base canvas size for text scaling calculations
  const BASE_CANVAS_WIDTH = 400;
  
  // Calculate text scale factor based on current canvas size vs base size
  const textScaleFactor = useMemo(() => componentWidth / BASE_CANVAS_WIDTH, [componentWidth]);

  // Track previous panel rect sizes to adjust transforms when frames resize (border drag)
  const prevPanelRectsRef = useRef({});
  const skipPanelRectDiffRef = useRef(false);
  const wasHydratingRef = useRef(false);
  useEffect(() => {
    if (isHydratingProject) {
      wasHydratingRef.current = true;
      if (!allowHydrationTransformCarry) {
        prevPanelRectsRef.current = {};
      }
      return;
    }
    if (wasHydratingRef.current) {
      skipPanelRectDiffRef.current = !allowHydrationTransformCarry;
      wasHydratingRef.current = false;
    }
  }, [isHydratingProject, allowHydrationTransformCarry]);

  // Shared helper: carry transform between frames while preserving focal point.
  // By default we preserve the user's scale parameter (relative zoom) to avoid
  // compounding zoom across repeated layout changes.
  const computeCarriedTransformFromImage = useCallback((img, fromRect, toRect, fromTransform, options = {}) => {
    try {
      if (!img || !fromRect || !toRect) return null;
      const imgW = img.naturalWidth || img.width;
      const imgH = img.naturalHeight || img.height;
      const imgAspect = imgW / imgH;
      const fromAspect = fromRect.width / fromRect.height;
      const toAspect = toRect.width / toRect.height;
      const preserveAbsoluteZoom = options?.preserveAbsoluteZoom === true;

      const fromInit = (imgAspect > fromAspect) ? (fromRect.height / imgH) : (fromRect.width / imgW);
      const toInit = (imgAspect > toAspect) ? (toRect.height / imgH) : (toRect.width / imgW);
      const sourceScale = Math.max(1, Math.min(5, fromTransform?.scale || 1));
      const fromFinal = fromInit * sourceScale;
      const toFinal = preserveAbsoluteZoom
        ? Math.max(fromFinal, toInit)
        : (toInit * sourceScale);
      const newScaleParam = Math.max(1, Math.min(5, toFinal / toInit));

      // Normalize offsets in source frame using clamped in-bounds source offsets.
      const fromScaledW = imgW * fromFinal;
      const fromScaledH = imgH * fromFinal;
      const fromDx = Math.max(0, (fromScaledW - fromRect.width) / 2);
      const fromDy = Math.max(0, (fromScaledH - fromRect.height) / 2);
      const sourcePosX = Math.max(-fromDx, Math.min(fromDx, fromTransform?.positionX || 0));
      const sourcePosY = Math.max(-fromDy, Math.min(fromDy, fromTransform?.positionY || 0));
      const normX = fromDx > 0 ? Math.max(-1, Math.min(1, sourcePosX / fromDx)) : 0;
      const normY = fromDy > 0 ? Math.max(-1, Math.min(1, sourcePosY / fromDy)) : 0;

      // Map to destination and clamp
      const toScaledW = imgW * toFinal;
      const toScaledH = imgH * toFinal;
      const toDx = Math.max(0, (toScaledW - toRect.width) / 2);
      const toDy = Math.max(0, (toScaledH - toRect.height) / 2);
      const newPosX = Math.max(-toDx, Math.min(toDx, normX * toDx));
      const newPosY = Math.max(-toDy, Math.min(toDy, normY * toDy));

      return { scale: newScaleParam, positionX: newPosX, positionY: newPosY };
    } catch (_) { return null; }
  }, []);

  const isTransformNearlyEqual = (a, b, eps = 0.01) => {
    if (!a || !b) return false;
    return (
      Math.abs((a.scale || 1) - (b.scale || 1)) < eps &&
      Math.abs((a.positionX || 0) - (b.positionX || 0)) < (eps * 10) &&
      Math.abs((a.positionY || 0) - (b.positionY || 0)) < (eps * 10)
    );
  };

  // Get layout configuration
  const layoutConfig = useMemo(() => {
    // Base layout from selected template first
    const base = selectedTemplate ? createLayoutConfig(selectedTemplate, panelCount) : null;
    // If a custom grid exists, overlay its grid settings on top of the base layout
    if (base && customLayoutConfig) {
      return {
        ...base,
        gridTemplateColumns: customLayoutConfig.gridTemplateColumns ?? base.gridTemplateColumns,
        gridTemplateRows: customLayoutConfig.gridTemplateRows ?? base.gridTemplateRows,
        gridTemplateAreas: customLayoutConfig.gridTemplateAreas ?? base.gridTemplateAreas,
        areas: customLayoutConfig.areas ?? base.areas,
        items: customLayoutConfig.items ?? base.items,
      };
    }
    return base;
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

  // Load only images currently mapped to panels (avoid decoding/holding unused images)
  useEffect(() => {
    const loadImage = (src, key) => new Promise((resolve) => {
      const img = new Image();
      try { img.decoding = 'async'; } catch (_) { /* ignore */ }
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve({ key, img });
      img.onerror = () => resolve({ key, img: null });

      if (typeof src === 'string') {
        img.src = src;
      } else if (src && typeof src === 'object') {
        img.src = src.displayUrl || src.originalUrl || '';
      } else {
        img.src = '';
      }
    });

    const loadMappedImages = async () => {
      const indices = Array.from(
        new Set(
          Object.values(panelImageMapping)
            .filter((v) => typeof v === 'number' && v >= 0 && v < images.length)
        )
      );
      const promises = indices.map((idx) => loadImage(images[idx], idx));
      const results = await Promise.all(promises);
      const newLoadedImages = {};
      results.forEach(({ key, img }) => {
        if (img) newLoadedImages[key] = img;
      });
      setLoadedImages(newLoadedImages);
    };

    if (images.length > 0) {
      loadMappedImages();
    } else {
      setLoadedImages({});
    }
  }, [images, panelImageMapping]);

  // Load sticker assets (global overlay layers)
  useEffect(() => {
    let cancelled = false;
    const loadSticker = (sticker) => new Promise((resolve) => {
      const src = sticker?.originalUrl || sticker?.thumbnailUrl || '';
      if (!src) {
        resolve({ id: sticker?.id, img: null });
        return;
      }
      const img = new Image();
      try { img.decoding = 'async'; } catch (_) { /* ignore */ }
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve({ id: sticker?.id, img });
      img.onerror = () => resolve({ id: sticker?.id, img: null });
      img.src = src;
    });

    const run = async () => {
      if (!Array.isArray(stickers) || stickers.length === 0) {
        if (!cancelled) setLoadedStickers({});
        return;
      }
      const results = await Promise.all(stickers.map(loadSticker));
      if (cancelled) return;
      const next = {};
      results.forEach(({ id, img }) => {
        if (!id || !img) return;
        next[id] = img;
      });
      setLoadedStickers(next);
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [stickers]);

  useEffect(() => {
    stickerDraftsRef.current = stickerDrafts;
  }, [stickerDrafts]);

  useEffect(() => {
    if (!Array.isArray(stickers) || stickers.length === 0) {
      if (Object.keys(stickerDraftsRef.current).length > 0) {
        setStickerDrafts({});
      }
      return;
    }

    const validIds = new Set(stickers.map((sticker) => sticker?.id).filter(Boolean));
    setStickerDrafts((prev) => {
      const entries = Object.entries(prev || {});
      if (entries.length === 0) return prev;
      let changed = false;
      const next = {};
      entries.forEach(([stickerId, draft]) => {
        if (validIds.has(stickerId)) {
          next[stickerId] = draft;
        } else {
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [stickers]);

  useEffect(() => {
    if (!activeStickerId) return;
    const stillExists = Array.isArray(stickers) && stickers.some((sticker) => sticker?.id === activeStickerId);
    if (!stillExists) {
      setActiveStickerId(null);
      setStickerInteraction(null);
      setStickerDrafts((prev) => {
        if (!prev || !prev[activeStickerId]) return prev;
        const next = { ...prev };
        delete next[activeStickerId];
        return next;
      });
    }
  }, [activeStickerId, stickers]);

  const clampStickerWidthPx = useCallback((widthPx, aspectRatio) => {
    const safeAspectRatio = Number.isFinite(aspectRatio) && aspectRatio > 0 ? aspectRatio : 1;
    const maxWidthByCanvas = componentWidth * 0.95;
    const maxWidthByHeight = componentHeight * 0.95 * safeAspectRatio;
    const maxWidth = Math.max(12, Math.min(maxWidthByCanvas, maxWidthByHeight));
    return clamp(widthPx, 12, maxWidth);
  }, [componentHeight, componentWidth]);

  const clampStickerPositionPx = useCallback((xPx, yPx, widthPx, heightPx) => {
    const minVisibleX = Math.min(32, widthPx);
    const minVisibleY = Math.min(32, heightPx);
    const minX = -widthPx + minVisibleX;
    const maxX = componentWidth - minVisibleX;
    const minY = -heightPx + minVisibleY;
    const maxY = componentHeight - minVisibleY;
    const safeWidth = Math.max(componentWidth, 1);
    const safeHeight = Math.max(componentHeight, 1);
    const clampedX = clamp(xPx, minX, maxX);
    const clampedY = clamp(yPx, minY, maxY);
    return {
      xPx: clampedX,
      yPx: clampedY,
      xPercent: (clampedX / safeWidth) * 100,
      yPercent: (clampedY / safeHeight) * 100,
    };
  }, [componentHeight, componentWidth]);

  const getStickerRectPx = useCallback((sticker, ratioFallbackImage = null) => {
    if (!sticker) return null;
    const stickerId = sticker.id;
    const draft = stickerId ? stickerDrafts[stickerId] : null;
    const loaded = ratioFallbackImage || (stickerId ? loadedStickers[stickerId] : null);
    const ratioFromImage = loaded && loaded.naturalWidth && loaded.naturalHeight
      ? (loaded.naturalWidth / loaded.naturalHeight)
      : 1;
    const ratioRaw = Number(draft?.aspectRatio ?? sticker.aspectRatio);
    const aspectRatio = Number.isFinite(ratioRaw) && ratioRaw > 0 ? ratioRaw : (ratioFromImage || 1);
    const widthRaw = Number(draft?.widthPercent ?? sticker.widthPercent);
    const widthPercent = Number.isFinite(widthRaw) ? widthRaw : 28;
    const widthPxUnbounded = (widthPercent / 100) * componentWidth;
    const widthPx = clampStickerWidthPx(widthPxUnbounded, aspectRatio);
    const heightPx = Math.max(12, widthPx / aspectRatio);
    const angleRaw = Number(draft?.angleDeg ?? sticker.angleDeg);
    const angleDeg = normalizeAngleDeg(Number.isFinite(angleRaw) ? angleRaw : 0);

    const xRaw = Number(draft?.xPercent ?? sticker.xPercent);
    const yRaw = Number(draft?.yPercent ?? sticker.yPercent);
    const safeWidth = Math.max(componentWidth, 1);
    const xPxRaw = (Number.isFinite(xRaw) ? xRaw : 36) / 100 * componentWidth;
    const yPxRaw = (Number.isFinite(yRaw) ? yRaw : 12) / 100 * componentHeight;
    const clampedPosition = clampStickerPositionPx(xPxRaw, yPxRaw, widthPx, heightPx);

    return {
      x: clampedPosition.xPx,
      y: clampedPosition.yPx,
      width: widthPx,
      height: heightPx,
      aspectRatio,
      angleDeg,
      xPercent: clampedPosition.xPercent,
      yPercent: clampedPosition.yPercent,
      widthPercent: (widthPx / safeWidth) * 100,
    };
  }, [clampStickerPositionPx, clampStickerWidthPx, componentHeight, componentWidth, loadedStickers, stickerDrafts]);

  const getStickerDraftFromPointer = useCallback((interaction, clientX, clientY) => {
    if (!interaction) return null;

    if (interaction.mode === 'rotate') {
      // Fabric-like behavior: keep the top rotate handle on the center->pointer ray.
      // Top handle sits at -90deg relative to +X axis, so angle is ray + 90deg.
      const pointerAngle = angleFromPointDeg(interaction.centerClientX, interaction.centerClientY, clientX, clientY);
      return {
        angleDeg: normalizeAngleDeg(pointerAngle + 90),
      };
    }

    const dx = clientX - interaction.startClientX;
    const dy = clientY - interaction.startClientY;

    if (interaction.mode === 'resize') {
      const widthDeltaPercent = (dx / Math.max(componentWidth, 1)) * 100;
      const unboundedWidthPercent = clamp(interaction.startWidthPercent + widthDeltaPercent, 6, 95);
      const unboundedWidthPx = (unboundedWidthPercent / 100) * componentWidth;
      const widthPx = clampStickerWidthPx(unboundedWidthPx, interaction.aspectRatio);
      const heightPx = Math.max(12, widthPx / (interaction.aspectRatio || 1));
      const baseX = (interaction.startXPercent / 100) * componentWidth;
      const baseY = (interaction.startYPercent / 100) * componentHeight;
      const position = clampStickerPositionPx(baseX, baseY, widthPx, heightPx);
      const safeWidth = Math.max(componentWidth, 1);
      return {
        widthPercent: (widthPx / safeWidth) * 100,
        xPercent: position.xPercent,
        yPercent: position.yPercent,
      };
    }

    const nextXPx = (interaction.startXPercent / 100) * componentWidth + dx;
    const nextYPx = (interaction.startYPercent / 100) * componentHeight + dy;
    const baseWidthPx = clampStickerWidthPx((interaction.startWidthPercent / 100) * componentWidth, interaction.aspectRatio);
    const baseHeightPx = Math.max(12, baseWidthPx / (interaction.aspectRatio || 1));
    return clampStickerPositionPx(nextXPx, nextYPx, baseWidthPx, baseHeightPx);
  }, [clampStickerPositionPx, clampStickerWidthPx, componentHeight, componentWidth]);

  const handleStickerPointerDown = useCallback((event, sticker, mode = 'move') => {
    if (!sticker?.id || typeof updateSticker !== 'function') return;
    if (event?.button !== undefined && event.button !== 0) return;
    if (event && typeof event.preventDefault === 'function') event.preventDefault();
    if (event && typeof event.stopPropagation === 'function') event.stopPropagation();
    try {
      if (event?.currentTarget && typeof event.currentTarget.setPointerCapture === 'function' && event.pointerId !== undefined) {
        event.currentTarget.setPointerCapture(event.pointerId);
      }
    } catch (_) {
      // ignore pointer capture failures
    }

    const rect = getStickerRectPx(sticker);
    if (!rect) return;

    if (mode === 'move' && typeof moveSticker === 'function' && Array.isArray(stickers)) {
      const currentIndex = stickers.findIndex((layer) => layer?.id === sticker.id);
      if (currentIndex >= 0 && currentIndex < stickers.length - 1) {
        moveSticker(sticker.id, 1);
      }
    }

    setActiveStickerId(sticker.id);
    pendingStickerPointerRef.current = null;
    if (stickerRafRef.current !== null) {
      window.cancelAnimationFrame(stickerRafRef.current);
      stickerRafRef.current = null;
    }
    const containerRect = containerRef.current?.getBoundingClientRect?.();
    const centerLocalX = rect.x + (rect.width / 2);
    const centerLocalY = rect.y + (rect.height / 2);
    const centerClientX = (containerRect?.left || 0) + centerLocalX;
    const centerClientY = (containerRect?.top || 0) + centerLocalY;

    setStickerInteraction({
      stickerId: sticker.id,
      mode,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startXPercent: rect.xPercent,
      startYPercent: rect.yPercent,
      startWidthPercent: rect.widthPercent,
      aspectRatio: rect.aspectRatio,
      centerClientX,
      centerClientY,
    });
  }, [getStickerRectPx, moveSticker, stickers, updateSticker]);

  const handleStickerDelete = useCallback((event, stickerId) => {
    if (!stickerId || typeof removeSticker !== 'function') return;
    if (event && typeof event.preventDefault === 'function') event.preventDefault();
    if (event && typeof event.stopPropagation === 'function') event.stopPropagation();

    setStickerInteraction((prev) => (prev?.stickerId === stickerId ? null : prev));
    setActiveStickerId((prev) => (prev === stickerId ? null : prev));
    setStickerDrafts((prev) => {
      if (!prev || !prev[stickerId]) return prev;
      const next = { ...prev };
      delete next[stickerId];
      return next;
    });
    pendingStickerPointerRef.current = null;
    if (stickerRafRef.current !== null) {
      window.cancelAnimationFrame(stickerRafRef.current);
      stickerRafRef.current = null;
    }
    removeSticker(stickerId);
  }, [removeSticker]);

  const clearActiveStickerSelection = useCallback((event) => {
    if (event && typeof event.preventDefault === 'function') event.preventDefault();
    if (event && typeof event.stopPropagation === 'function') event.stopPropagation();
    setActiveStickerId(null);
    setStickerInteraction(null);
    pendingStickerPointerRef.current = null;
    if (stickerRafRef.current !== null) {
      window.cancelAnimationFrame(stickerRafRef.current);
      stickerRafRef.current = null;
    }
  }, []);

  const handleStickerDone = useCallback((event) => {
    clearActiveStickerSelection(event);
  }, [clearActiveStickerSelection]);

  useEffect(() => {
    if (!stickerInteraction || typeof updateSticker !== 'function') return;

    const applyPointerSample = () => {
      const pending = pendingStickerPointerRef.current;
      if (!pending) return;
      pendingStickerPointerRef.current = null;
      const nextDraft = getStickerDraftFromPointer(stickerInteraction, pending.clientX, pending.clientY);
      if (!nextDraft) return;
      setStickerDrafts((prev) => {
        const current = prev?.[stickerInteraction.stickerId];
        const sameX = (nextDraft.xPercent === undefined && current?.xPercent === undefined)
          || Math.abs((current?.xPercent ?? Number.NaN) - (nextDraft.xPercent ?? Number.NaN)) < 0.001;
        const sameY = (nextDraft.yPercent === undefined && current?.yPercent === undefined)
          || Math.abs((current?.yPercent ?? Number.NaN) - (nextDraft.yPercent ?? Number.NaN)) < 0.001;
        const sameW = (nextDraft.widthPercent === undefined && current?.widthPercent === undefined)
          || Math.abs((current?.widthPercent ?? Number.NaN) - (nextDraft.widthPercent ?? Number.NaN)) < 0.001;
        const sameA = (nextDraft.angleDeg === undefined && current?.angleDeg === undefined)
          || Math.abs((current?.angleDeg ?? Number.NaN) - (nextDraft.angleDeg ?? Number.NaN)) < 0.001;
        if (sameX && sameY && sameW && sameA) return prev;
        return {
          ...(prev || {}),
          [stickerInteraction.stickerId]: {
            ...(current || {}),
            ...nextDraft,
          },
        };
      });
    };

    const requestPointerApply = () => {
      if (stickerRafRef.current !== null) return;
      stickerRafRef.current = window.requestAnimationFrame(() => {
        stickerRafRef.current = null;
        applyPointerSample();
      });
    };

    const commitDraft = () => {
      const draft = stickerDraftsRef.current?.[stickerInteraction.stickerId];
      if (draft) {
        const updates = {};
        if (Number.isFinite(draft.xPercent)) updates.xPercent = draft.xPercent;
        if (Number.isFinite(draft.yPercent)) updates.yPercent = draft.yPercent;
        if (Number.isFinite(draft.widthPercent)) updates.widthPercent = draft.widthPercent;
        if (Number.isFinite(draft.angleDeg)) updates.angleDeg = draft.angleDeg;
        if (Object.keys(updates).length > 0) {
          updateSticker(stickerInteraction.stickerId, updates);
        }
      }
      setStickerDrafts((prev) => {
        if (!prev || !prev[stickerInteraction.stickerId]) return prev;
        const next = { ...prev };
        delete next[stickerInteraction.stickerId];
        return next;
      });
    };

    const handlePointerMove = (event) => {
      pendingStickerPointerRef.current = {
        clientX: event.clientX,
        clientY: event.clientY,
      };
      requestPointerApply();
    };

    const handlePointerEnd = () => {
      if (stickerRafRef.current !== null) {
        window.cancelAnimationFrame(stickerRafRef.current);
        stickerRafRef.current = null;
      }
      applyPointerSample();
      commitDraft();
      setStickerInteraction(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerEnd);
    window.addEventListener('pointercancel', handlePointerEnd);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerEnd);
      window.removeEventListener('pointercancel', handlePointerEnd);
      if (stickerRafRef.current !== null) {
        window.cancelAnimationFrame(stickerRafRef.current);
        stickerRafRef.current = null;
      }
      pendingStickerPointerRef.current = null;
    };
  }, [getStickerDraftFromPointer, stickerInteraction, updateSticker]);

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

  // When panel sizes change (e.g., inner border dragged), carry focal point and clamp to avoid gaps
  useEffect(() => {
    if (!panelRects || panelRects.length === 0) return;
    const nextMap = {};
    panelRects.forEach(r => { nextMap[r.panelId] = { width: r.width, height: r.height }; });

    if (skipPanelRectDiffRef.current) {
      prevPanelRectsRef.current = nextMap;
      skipPanelRectDiffRef.current = false;
      return;
    }

    const prevRects = prevPanelRectsRef.current || {};

    // Build quick lookups for current rects by panelId
    const currentById = {};
    panelRects.forEach(r => { currentById[r.panelId] = r; });


    const epsilon = 0.5; // ignore subpixel changes

    Object.keys(currentById).forEach(panelId => {
      const prev = prevRects[panelId];
      const curr = currentById[panelId];
      if (!prev) return; // first run; record and skip
      const wChanged = Math.abs((prev.width || 0) - curr.width) > epsilon;
      const hChanged = Math.abs((prev.height || 0) - curr.height) > epsilon;
      if (!wChanged && !hChanged) return;

      // Only adjust if there is an image mapped
      const imageIndex = panelImageMapping[panelId];
      if (imageIndex === undefined) return;
      const fromTransform = panelTransforms[panelId] || { scale: 1, positionX: 0, positionY: 0 };

      const img = loadedImages[imageIndex];
      const adjusted = computeCarriedTransformFromImage(img, prev, curr, fromTransform, {
        preserveAbsoluteZoom: false,
      });
      if (adjusted && typeof updatePanelTransform === 'function' && !isTransformNearlyEqual(adjusted, fromTransform)) {
        updatePanelTransform(panelId, adjusted);
      }
    });

    // Update the ref after processing to be the source-of-truth for next diff
    prevPanelRectsRef.current = nextMap;

    // no-op return
  }, [panelRects, loadedImages, panelImageMapping, panelTransforms, updatePanelTransform, computeCarriedTransformFromImage]);

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
    
    // Check if any panel is in transform mode or reorder mode to hide all captions
    const anyPanelInTransformMode = Object.values(isTransformMode).some(enabled => enabled);
    const shouldHideCaptions = anyPanelInTransformMode || isReorderMode;
    
    // Draw panels
    panelRects.forEach((rect) => {
      const { x, y, width, height, panelId } = rect;
      const imageIndex = panelImageMapping[panelId];
      const hasImage = imageIndex !== undefined && loadedImages[imageIndex];
      const transform = panelTransforms[panelId] || { scale: 1, positionX: 0, positionY: 0 };
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
        const rawCaption = panelText.rawContent ?? panelText.content ?? '';
        const { cleanText, ranges } = parseFormattedText(rawCaption);
        const hasActualText = cleanText && cleanText.trim();
        const shouldShowPlaceholder = !hasActualText && !isGeneratingCollage;
        const displayText = hasActualText ? cleanText : 'Add Caption';
        const activeRanges = hasActualText ? ranges : [];

        // Hide all captions when any panel is in transform mode or reorder mode
        if ((hasActualText || shouldShowPlaceholder) && !shouldHideCaptions) {
          ctx.save();
          
          // Clip text to frame boundaries - text beyond frame is hidden (window effect)
          ctx.beginPath();
          ctx.rect(x, y, width, height);
          ctx.clip();
          
          // Set text properties (use last used settings as defaults)
          let baseFontSize = panelText.fontSize || lastUsedTextSettings.fontSize || 32;
          
          // Auto-calculate optimal font size if no explicit size is set and there's actual text
          if (hasActualText && !panelText.fontSize) {
            const optimalSize = calculateOptimalFontSize(cleanText, width, height);
            baseFontSize = optimalSize;
          }
          
          // Scale font size based on canvas size
          const fontSize = baseFontSize * textScaleFactor;
          const fontWeight = panelText.fontWeight || lastUsedTextSettings.fontWeight || 400;
          const fontStyle = panelText.fontStyle || lastUsedTextSettings.fontStyle || 'normal';
          const fontFamily = panelText.fontFamily || lastUsedTextSettings.fontFamily || 'Arial';
          const baseTextColor = panelText.color || lastUsedTextSettings.color || '#ffffff';
          const baseInlineStyle = {
            fontWeight,
            fontStyle,
            underline: false,
          };
          // Respect explicit 0 to disable stroke; fall back only when undefined
          const requestedStrokeWidth =
            (panelText.strokeWidth ?? lastUsedTextSettings.strokeWidth ?? 0);
          const textPositionX = panelText.textPositionX !== undefined ? panelText.textPositionX : (lastUsedTextSettings.textPositionX || 0);
          const textPositionY = panelText.textPositionY !== undefined ? panelText.textPositionY : (lastUsedTextSettings.textPositionY || 0); // Default to baseline bottom position
          const textRotation = panelText.textRotation !== undefined ? panelText.textRotation : (lastUsedTextSettings.textRotation || 0);
          
          // Apply different opacity for placeholder vs actual text
          let textColor;
          let strokeColor;
          let shadowColor;
          if (hasActualText) {
            textColor = baseTextColor;
            // Choose black or white stroke based on contrast with the text color
            strokeColor = getContrastingMonoStroke(baseTextColor);
            // Subtle feathered shadow
            shadowColor = 'rgba(0, 0, 0, 0.25)';
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
            // Stroke uses contrasting mono with reduced opacity
            const mono = getContrastingMonoStroke(baseTextColor);
            const monoRGBA = parseColorToRGBA(mono) || { r: 0, g: 0, b: 0, a: 1 };
            strokeColor = rgbaString(monoRGBA.r, monoRGBA.g, monoRGBA.b, 0.4);
            // Very subtle feathered shadow for placeholder
            shadowColor = 'rgba(0, 0, 0, 0.2)';
          }
          
          ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
          ctx.fillStyle = textColor;
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle'; // Change to middle for better positioning control
          
          // Set stroke properties for both actual text and placeholder
          ctx.strokeStyle = strokeColor;
          // Use a thicker, font-relative stroke by default for readability,
          // but allow explicit 0 to disable strokes entirely.
          const computedStrokeWidth = Math.min(16, Math.max(3, Math.round(fontSize * 0.18)));
          if (requestedStrokeWidth === 0) {
            ctx.lineWidth = 0;
          } else if (requestedStrokeWidth > 0) {
            ctx.lineWidth = requestedStrokeWidth;
          } else {
            ctx.lineWidth = computedStrokeWidth;
          }
          ctx.lineJoin = 'round';
          ctx.lineCap = 'round';

          // Add text shadow for better readability
          ctx.shadowColor = shadowColor;
          // Feathered drop shadow: low alpha, heavy blur, no offset
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;
          ctx.shadowBlur = 14;
          
          // Calculate available text area (with padding on sides and bottom)
          const textPadding = 10;
          const maxTextWidth = width - (textPadding * 2);
          
          // Calculate text position based on position settings
          // textPositionX: -100 (left) to 100 (right), 0 = center
          // textPositionY: -100 (bottom anchored) to 100 (top anchored), 0 = default bottom position
          const textX = x + (width / 2) + (textPositionX / 100) * (width / 2 - textPadding);
          
          const lineHeight = fontSize * 1.2;
          const wrappedLines = buildWrappedLines(
            ctx,
            displayText,
            activeRanges,
            maxTextWidth,
            baseInlineStyle,
            fontSize,
            fontFamily,
          );
          
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
            const lineX = textX - (line.width / 2);
            const segments = getSegmentsForLine(activeRanges, line.start, line.end, baseInlineStyle);
            let cursorX = lineX;

            segments.forEach((segment) => {
              const segmentText = displayText.slice(segment.start, segment.end);
              const resolvedStyle = segment.style;
              ctx.font = `${resolvedStyle.fontStyle || 'normal'} ${resolvedStyle.fontWeight} ${fontSize}px ${fontFamily}`;
              const segmentWidth = ctx.measureText(segmentText).width;

              if (ctx.lineWidth > 0) {
                ctx.strokeText(segmentText, cursorX, lineY);
              }

              ctx.fillText(segmentText, cursorX, lineY);

              if (resolvedStyle.underline) {
                ctx.save();
                ctx.shadowColor = 'transparent';
                ctx.strokeStyle = textColor;
                ctx.lineWidth = Math.max(1, fontSize * 0.08);
                const underlineY = lineY + fontSize * 0.35;
                ctx.beginPath();
                ctx.moveTo(cursorX, underlineY);
                ctx.lineTo(cursorX + segmentWidth, underlineY);
                ctx.stroke();
                ctx.restore();
                ctx.shadowColor = shadowColor;
              }

              cursorX += segmentWidth;
            });
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
    isReorderMode,
    panelTexts,
    lastUsedTextSettings,
    theme.palette.mode,
    isGeneratingCollage,
    calculateOptimalFontSize,
    textScaleFactor,
    fontsReadyVersion
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
    
    const rawCaption = panelText?.rawContent ?? panelText?.content ?? '';
    const { cleanText, ranges } = parseFormattedText(rawCaption);
    const hasActualText = cleanText && cleanText.trim();
    const displayText = hasActualText ? cleanText : 'Add Caption';
    const activeRanges = hasActualText ? ranges : [];
    
    // Use the same accurate text measurement logic as drawCanvas
    const maxTextWidth = panel.width - (textPadding * 2);
    
    // Create temporary canvas for accurate text measurement
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    
    // Set font properties exactly like in drawCanvas
    const fontWeight = panelText?.fontWeight || lastUsedTextSettings.fontWeight || 400;
    const fontStyle = panelText?.fontStyle || lastUsedTextSettings.fontStyle || 'normal';
    const fontFamily = panelText?.fontFamily || lastUsedTextSettings.fontFamily || 'Arial';
    const baseInlineStyle = {
      fontWeight,
      fontStyle,
      underline: false,
    };
    
    const wrappedLines = buildWrappedLines(
      tempCtx,
      displayText,
      activeRanges,
      maxTextWidth,
      baseInlineStyle,
      scaledFontSize,
      fontFamily,
    );
    const actualLines = wrappedLines.length;
    
    // Calculate actual text width from the wrapped lines
    const actualTextWidth = Math.max(...wrappedLines.map(line => line.width), 0);
    
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
  const handleTextEdit = useCallback((panelId) => {
    // Cancel reorder mode when opening text editor
    if (isReorderMode) {
      setIsReorderMode(false);
      setReorderSourcePanel(null);
    }
    
    const isOpening = textEditingPanel !== panelId;
    setTextEditingPanel(textEditingPanel === panelId ? null : panelId);
    
    // If opening the editor on a panel without existing text, try to prefill from Library metadata
    if (isOpening) {
      try {
        const existing = parseFormattedText(
          panelTextsRef.current[panelId]?.rawContent ?? panelTextsRef.current[panelId]?.content ?? '',
        ).cleanText.trim();
        if (!existing) {
          const imageIndex = panelImageMapping?.[panelId];
          if (typeof imageIndex === 'number') {
            const imgObj = images?.[imageIndex];
            const libraryKey = imgObj?.metadata?.libraryKey;
            if (libraryKey) {
              const cached = defaultCaptionCacheRef.current[libraryKey];
              const applyCaption = (caption) => {
                const currentRaw = panelTextsRef.current[panelId]?.rawContent ?? panelTextsRef.current[panelId]?.content ?? '';
                const hasExistingText = parseFormattedText(currentRaw).cleanText.trim();
                if (caption && !hasExistingText) {
                  if (typeof updatePanelText === 'function') {
                    const previous = panelTextsRef.current[panelId] || {};
                    const hadPrevContent = Boolean(previous.content && previous.content.trim());
                    const hasExplicitFontSize = previous.fontSize !== undefined;
                    const next = {
                      ...previous,
                      content: caption,
                      rawContent: caption,
                      ...(hadPrevContent || hasExplicitFontSize ? {} : { fontSize: lastUsedTextSettings.fontSize || 26 })
                    };
                    updatePanelText(panelId, next);
                  }
                }
              };
              if (cached !== undefined) {
                applyCaption(cached);
              } else {
                getMetadataForKey(libraryKey)
                  .then((meta) => {
                    const caption = meta?.defaultCaption;
                    defaultCaptionCacheRef.current[libraryKey] = caption || null;
                    applyCaption(caption);
                  })
                  .catch(() => {
                    defaultCaptionCacheRef.current[libraryKey] = null;
                  });
              }
            }
          }
        }
      } catch (_) { /* ignore prefill errors */ }
    }
    
    // Auto-scroll to show the caption editor after it opens
    if (isOpening) {
      // Keep this effect scoped to layout/open-state changes only; running it on each
      // keystroke creates focus/scroll thrash in the caption text field.
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
  }, [textEditingPanel, panelRects, isReorderMode, panelImageMapping, images, updatePanelText, lastUsedTextSettings]);

  const handleTextClose = useCallback(() => {
    setTextEditingPanel(null);
  }, []);





  // Redraw canvas when dependencies change
  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  // Notify parent about render state separately to avoid loops from unstable callback references
  useEffect(() => {
    try {
      const canvas = canvasRef.current;
      if (canvas) {
        if (renderSig !== undefined) {
          canvas.dataset.renderSig = renderSig;
        }
        // Tag current preview canvas size for snapshot consumers (e.g., thumbnail rendering)
        canvas.dataset.previewWidth = String(componentWidth || 0);
        canvas.dataset.previewHeight = String(componentHeight || 0);
        // Expose custom layout to parent for snapshot persistence
        if (customLayoutConfig) {
          canvas.dataset.customLayout = JSON.stringify(customLayoutConfig);
        } else if (canvas.dataset.customLayout) {
          delete canvas.dataset.customLayout;
        }
        if (panelRects.length > 0) {
          try {
            const serializedPanelDims = panelRects.reduce((acc, rect) => {
              acc[rect.panelId] = { width: rect.width, height: rect.height };
              return acc;
            }, {});
            canvas.dataset.panelDimensions = JSON.stringify(serializedPanelDims);
          } catch (_) {
            // Ignore serialization issues
          }
        } else if (canvas.dataset.panelDimensions) {
          delete canvas.dataset.panelDimensions;
        }
        // Also emit a callback with the same info to avoid DOM races
        if (typeof onPreviewMetaChange === 'function') {
          const panelDimensions = {};
          panelRects.forEach((rect) => {
            panelDimensions[rect.panelId] = { width: rect.width, height: rect.height };
          });
          onPreviewMetaChange({
            canvasWidth: componentWidth || 0,
            canvasHeight: componentHeight || 0,
            customLayout: customLayoutConfig || null,
            renderSig,
            panelDimensions,
          });
        }
        if (typeof onRendered === 'function') {
          onRendered(renderSig);
        }
      }
    } catch (_) {
      // ignore
    }
  }, [renderSig, componentWidth, componentHeight, customLayoutConfig, panelRects]);

  // Notify parent when any editing mode is active/inactive (transform, reorder, captions, border-drag)
  useEffect(() => {
    const anyPanelInTransformMode = Object.values(isTransformMode).some(Boolean);
    const active = anyPanelInTransformMode || isReorderMode || (textEditingPanel !== null) || isDraggingBorder || Boolean(stickerInteraction);
    try {
      const canvas = canvasRef.current;
      if (canvas) canvas.dataset.editing = active ? '1' : '0';
    } catch (_) { /* ignore */ }
    if (typeof onEditingSessionChange === 'function') {
      onEditingSessionChange(active);
    }
  }, [isTransformMode, isReorderMode, textEditingPanel, isDraggingBorder, stickerInteraction, onEditingSessionChange]);



  // Reset custom layout when user explicitly changes layout controls in-session
  // This is separate from the initial restore keyed by customLayoutKey above.
  useEffect(() => {
    if (!initialCustomLayout) {
      setCustomLayoutConfig(null);
    }
  }, [selectedTemplate, panelCount, aspectRatioValue, initialCustomLayout]);

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
  useEffect(() => () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }
    }, []);



  // Handle mouse events
  const handleMouseMove = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Cancel pending long-press if the pointer moved notably
    if (longPressTimerRef.current) {
      const dx = Math.abs(e.movementX || 0);
      const dy = Math.abs(e.movementY || 0);
      if (dx + dy > 4) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
        longPressActiveRef.current = false;
      }
    }
    
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
    if (borderZone && !anyPanelInTransformMode && textEditingPanel === null && !isReorderMode) {
      const { cursor: borderCursor } = borderZone;
      cursor = borderCursor;
    } else if (hoveredPanelIndex >= 0 && !borderZone) {
      const panel = panelRects[hoveredPanelIndex];
      
      if (isReorderMode) {
        // In reorder mode, show pointer cursor for all panels
        cursor = 'pointer';
      } else if (anyPanelInTransformMode) {
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

  // Handle destination selection during reorder
  const handleReorderDestination = useCallback((destinationPanelId) => {
    if (!reorderSourcePanel || !panelImageMapping || !updatePanelImageMapping || !destinationPanelId) {
      console.warn('Invalid reorder destination selection:', { reorderSourcePanel, panelImageMapping: !!panelImageMapping, updatePanelImageMapping: !!updatePanelImageMapping, destinationPanelId });
      return;
    }

    const sourceImageIndex = panelImageMapping[reorderSourcePanel];
    const destinationImageIndex = panelImageMapping[destinationPanelId];

    const sourceText = panelTexts[reorderSourcePanel];
    const destinationText = panelTexts[destinationPanelId];

    // Delegate to shared carry helper
    const computeCarriedTransform = (imageIndex, fromPanelId, toPanelId) => {
      const img = loadedImages[imageIndex];
      const fromRect = panelRects.find(r => r.panelId === fromPanelId);
      const toRect = panelRects.find(r => r.panelId === toPanelId);
      const fromTransform = panelTransforms[fromPanelId] || { scale: 1, positionX: 0, positionY: 0 };
      return computeCarriedTransformFromImage(img, fromRect, toRect, fromTransform, {
        preserveAbsoluteZoom: true,
      }) || { scale: 1, positionX: 0, positionY: 0 };
    };

    // Create new mapping with swapped images
    const newMapping = { ...panelImageMapping };

    if (destinationImageIndex !== undefined) {
      // Swap images between source and destination
      newMapping[reorderSourcePanel] = destinationImageIndex;
      newMapping[destinationPanelId] = sourceImageIndex;

      if (updatePanelText) {
        if (sourceText) {
          // Replace entire text config to avoid lingering style props
          updatePanelText(destinationPanelId, { ...sourceText }, { replace: true });
        } else {
          // Remove text entry completely
          updatePanelText(destinationPanelId, {}, { replace: true });
        }

        if (destinationText) {
          updatePanelText(reorderSourcePanel, { ...destinationText }, { replace: true });
        } else {
          updatePanelText(reorderSourcePanel, {}, { replace: true });
        }
      }

      // Carry over transforms proportionally for both swapped images
      if (typeof updatePanelTransform === 'function') {
        if (sourceImageIndex !== undefined) {
          const destTransformForSource = computeCarriedTransform(sourceImageIndex, reorderSourcePanel, destinationPanelId);
          updatePanelTransform(destinationPanelId, destTransformForSource);
        }
        if (destinationImageIndex !== undefined) {
          const sourceTransformForDest = computeCarriedTransform(destinationImageIndex, destinationPanelId, reorderSourcePanel);
          updatePanelTransform(reorderSourcePanel, sourceTransformForDest);
        }
      }
    } else if (sourceImageIndex !== undefined) {
      // Move image from source to destination (destination was empty)
      newMapping[destinationPanelId] = sourceImageIndex;
      delete newMapping[reorderSourcePanel];

      if (updatePanelText) {
        if (sourceText) {
          updatePanelText(destinationPanelId, { ...sourceText }, { replace: true });
        } else {
          updatePanelText(destinationPanelId, {}, { replace: true });
        }

        updatePanelText(reorderSourcePanel, {}, { replace: true });
      }

      // Carry over transform for moved image and reset source panel transform
      if (typeof updatePanelTransform === 'function') {
        const destTransformForSource = computeCarriedTransform(sourceImageIndex, reorderSourcePanel, destinationPanelId);
        updatePanelTransform(destinationPanelId, destTransformForSource);
        // Reset source panel to default transform since it's now empty
        updatePanelTransform(reorderSourcePanel, { scale: 1, positionX: 0, positionY: 0 });
      }
    }

    updatePanelImageMapping(newMapping);
    setIsReorderMode(false);
    setReorderSourcePanel(null);
  }, [reorderSourcePanel, panelImageMapping, updatePanelImageMapping, updatePanelText, panelTexts, panelRects, panelTransforms, loadedImages, updatePanelTransform, computeCarriedTransformFromImage]);

  // Open/close the action menu (placed before handlers that depend on it)
  const handleActionMenuOpen = useCallback((event, panelId) => {
    // Respect optional suppression window; guard against unexpected errors
    const suppressed = (() => {
      try {
        return typeof isFrameActionSuppressed === 'function' && isFrameActionSuppressed();
      } catch (e) {
        return false;
      }
    })();
    if (suppressed) return;
    if (event && typeof event.stopPropagation === 'function') {
      event.stopPropagation();
    }
    setActionMenuPanelId(panelId || null);
    if (event && event.currentTarget) {
      setActionMenuAnchorEl(event.currentTarget);
      setActionMenuPosition(null);
    } else if (event && event.clientX != null && event.clientY != null) {
      setActionMenuPosition({ left: event.clientX, top: event.clientY });
      setActionMenuAnchorEl(null);
    } else {
      setActionMenuAnchorEl(null);
      setActionMenuPosition(null);
    }
  }, [isFrameActionSuppressed]);

  const handleActionMenuClose = useCallback(() => {
    setActionMenuAnchorEl(null);
    setActionMenuPosition(null);
    setActionMenuPanelId(null);
  }, []);

  const handleMouseDown = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (activeStickerId) {
      clearActiveStickerSelection();
      return;
    }
    
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
      // Start a long-press timer for desktop only when not editing/transforming/reordering
      if (!Object.values(isTransformMode).some(Boolean) && textEditingPanel === null && !isReorderMode) {
        if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
        longPressActiveRef.current = false;
        longPressStartRef.current = { x: e.clientX, y: e.clientY, scrollY: window.scrollY || window.pageYOffset || 0 };
        longPressTimerRef.current = setTimeout(() => {
          longPressActiveRef.current = true;
          if (typeof onSaveGestureDetected === 'function') {
            onSaveGestureDetected();
          } else {
            setSaveHintOpen(true);
          }
        }, 650);
      }
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
      
      // Check if we're in reorder mode
      if (isReorderMode) {
        handleReorderDestination(clickedPanel.panelId);
        return;
      }
      
      // Check if this panel is in transform mode
      if (isTransformMode[clickedPanel.panelId]) {
        setIsDragging(true);
        setDragStart({ x, y });
      } else if (textEditingPanel === null) {
        // Open actions menu at click position
        handleActionMenuOpen({ clientX: e.clientX, clientY: e.clientY }, clickedPanel.panelId);
      }
    }
  }, [panelRects, isTransformMode, textEditingPanel, panelImageMapping, loadedImages, handleTextEdit, panelTexts, getTextAreaBounds, findBorderZone, isReorderMode, handleReorderDestination, dismissTransformMode, setSelectedPanel, setIsDragging, setDragStart, setIsDraggingBorder, setDraggedBorder, setBorderDragStart, handleActionMenuOpen, activeStickerId, clearActiveStickerSelection]);

  const handleMouseUp = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    longPressActiveRef.current = false;
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
    // Cancel any pending long-press if cursor leaves canvas
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
      longPressActiveRef.current = false;
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

  // (removed duplicate handleMouseMove; integrated cancellation into main handler below)

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
      if (activeStickerId) {
        touchStartInfo.current = null;
        clearActiveStickerSelection(e);
        return;
      }
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
            startScrollY: window.scrollY || window.pageYOffset || 0,
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
            startScrollY: window.scrollY || window.pageYOffset || 0,
              dismissTransformMode: true
            };
          }
          return;
        }
        
        setSelectedPanel(clickedPanelIndex);

        // Begin long-press detection for mobile when not editing/transforming/reordering
        if (!anyPanelInTransformMode && textEditingPanel === null && !isReorderMode) {
          if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
          longPressActiveRef.current = false;
          longPressStartRef.current = { x: touch.clientX, y: touch.clientY, scrollY: window.scrollY || window.pageYOffset || 0 };
          longPressTimerRef.current = setTimeout(() => {
            longPressActiveRef.current = true;
            // Cancel any pending tap recognition
            if (touchStartInfo.current) touchStartInfo.current = null;
            if (typeof onSaveGestureDetected === 'function') {
              onSaveGestureDetected();
            } else {
              setSaveHintOpen(true);
            }
          }, 650);
        }
        
        // Check if we're in reorder mode
        if (isReorderMode) {
          e.preventDefault();
          e.stopPropagation();
          handleReorderDestination(clickedPanel.panelId);
          return;
        }
        
        // Check if this specific panel is in transform mode
        if (hasImage && isTransformMode[clickedPanel.panelId]) {
          // Prevent page scrolling only when touching an image in transform mode
          e.preventDefault();
          e.stopPropagation();
          setIsDragging(true);
          setDragStart({ x, y });
        } else if (onPanelClick && textEditingPanel === null) {
          // Defer opening until touchend confirmation to avoid triggering during scroll
          touchStartInfo.current = {
            panelId: clickedPanel.panelId,
            panelIndex: clickedPanel.index,
            startX: touch.clientX,
            startY: touch.clientY,
            startTime: Date.now(),
            startScrollY: window.scrollY || window.pageYOffset || 0,
            isPanelTap: true,
          };
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
  }, [panelRects, isTransformMode, onPanelClick, selectedPanel, panelTransforms, panelImageMapping, loadedImages, getTouchDistance, textEditingPanel, handleTextEdit, panelTexts, getTextAreaBounds, findBorderZone, isReorderMode, handleReorderDestination, dismissTransformMode, setSelectedPanel, setIsDragging, setDragStart, setIsDraggingBorder, setDraggedBorder, setBorderDragStart, touchStartInfo, lastInteractionTime, setTouchStartDistance, setTouchStartScale, activeStickerId, clearActiveStickerSelection]);

  const handleTouchMove = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // If any panel is in transform mode, we need to handle this specially
    const anyPanelInTransformMode = Object.values(isTransformMode).some(enabled => enabled);
    
    // If we're tracking a potential tap, check for movement or scroll (covers text area and panel taps)
    if (touchStartInfo.current && (touchStartInfo.current.isTextArea || touchStartInfo.current.isPanelTap)) {
      const touch = e.touches[0];
      const deltaX = Math.abs(touch.clientX - touchStartInfo.current.startX);
      const deltaY = Math.abs(touch.clientY - touchStartInfo.current.startY);
      const deltaScrollY = Math.abs((window.scrollY || window.pageYOffset || 0) - (touchStartInfo.current.startScrollY || 0));
      
      // If the touch has moved significantly, it's a scroll, not a tap
      const scrollThreshold = 10; // pixels
      if (deltaX > scrollThreshold || deltaY > scrollThreshold || deltaScrollY > scrollThreshold) {
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

    // Cancel long-press when movement/scroll exceeds threshold
    if (longPressTimerRef.current) {
      const touch = e.touches[0];
      const deltaX = Math.abs(touch.clientX - longPressStartRef.current.x);
      const deltaY = Math.abs(touch.clientY - longPressStartRef.current.y);
      const deltaScrollY = Math.abs((window.scrollY || window.pageYOffset || 0) - (longPressStartRef.current.scrollY || 0));
      const scrollThreshold = 10;
      if (deltaX > scrollThreshold || deltaY > scrollThreshold || deltaScrollY > scrollThreshold) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
        longPressActiveRef.current = false;
      }
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
    // Clear any pending long-press timer
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    setIsDragging(false);
    setIsDraggingBorder(false);
    setDraggedBorder(null);
    setTouchStartDistance(null);
    setTouchStartScale(1);

    // If a long-press fired, suppress tap actions
    if (longPressActiveRef.current) {
      longPressActiveRef.current = false;
      touchStartInfo.current = null;
      return;
    }
    
    // Check if this was a tap on text area
    if (touchStartInfo.current && touchStartInfo.current.isTextArea && e.changedTouches && e.changedTouches[0]) {
      const touch = e.changedTouches[0];
      const deltaX = Math.abs(touch.clientX - touchStartInfo.current.startX);
      const deltaY = Math.abs(touch.clientY - touchStartInfo.current.startY);
      const deltaTime = Date.now() - touchStartInfo.current.startTime;
      const deltaScrollY = Math.abs((window.scrollY || window.pageYOffset || 0) - (touchStartInfo.current.startScrollY || 0));
      
      // If the touch didn't move much and was quick, treat it as a tap
      const maxMovement = 10; // pixels
      const maxDuration = 500; // milliseconds
      
      if (deltaX < maxMovement && deltaY < maxMovement && deltaScrollY < maxMovement && deltaTime < maxDuration) {
        // This was a tap, open the caption editor
        handleTextEdit(touchStartInfo.current.panelId, e);
      }
    }
    // Check if this was a tap on a panel (to open the library)
    if (
      touchStartInfo.current &&
      touchStartInfo.current.isPanelTap &&
      e.changedTouches &&
      e.changedTouches[0]
    ) {
      const touch = e.changedTouches[0];
      const deltaX = Math.abs(touch.clientX - touchStartInfo.current.startX);
      const deltaY = Math.abs(touch.clientY - touchStartInfo.current.startY);
      const deltaTime = Date.now() - touchStartInfo.current.startTime;
      const deltaScrollY = Math.abs((window.scrollY || window.pageYOffset || 0) - (touchStartInfo.current.startScrollY || 0));
      
      const maxMovement = 10; // pixels
      const maxDuration = 500; // milliseconds
      
      if (deltaX < maxMovement && deltaY < maxMovement && deltaScrollY < maxMovement && deltaTime < maxDuration) {
        // Confirmed tap on a frame: open actions menu (unless suppressed)
        if (textEditingPanel === null) {
          const touch = e.changedTouches[0];
          if (!(typeof isFrameActionSuppressed === 'function' && isFrameActionSuppressed())) {
            handleActionMenuOpen({ clientX: touch.clientX, clientY: touch.clientY }, touchStartInfo.current.panelId);
          }
        }
      }
    }
    
    // Check if this was a tap to dismiss transform mode
    if (touchStartInfo.current && touchStartInfo.current.dismissTransformMode && e.changedTouches && e.changedTouches[0]) {
      const touch = e.changedTouches[0];
      const deltaX = Math.abs(touch.clientX - touchStartInfo.current.startX);
      const deltaY = Math.abs(touch.clientY - touchStartInfo.current.startY);
      const deltaTime = Date.now() - touchStartInfo.current.startTime;
      const deltaScrollY = Math.abs((window.scrollY || window.pageYOffset || 0) - (touchStartInfo.current.startScrollY || 0));
      
      // If the touch didn't move much and was quick, treat it as a tap
      const maxMovement = 10; // pixels
      const maxDuration = 500; // milliseconds
      
      if (deltaX < maxMovement && deltaY < maxMovement && deltaScrollY < maxMovement && deltaTime < maxDuration) {
        // This was a tap on a non-active frame, dismiss transform mode
        dismissTransformMode();
      }
    }
    
    // Always clear touchStartInfo
    touchStartInfo.current = null;
  }, [handleTextEdit, dismissTransformMode, handleActionMenuOpen]);

  // Cancel reorder mode
  const cancelReorderMode = useCallback(() => {
    setIsReorderMode(false);
    setReorderSourcePanel(null);
  }, []);

  // Start reorder mode for a panel
  const startReorderMode = useCallback((panelId) => {
    if (!panelId) {
      console.warn('Invalid panel ID for reorder mode:', panelId);
      return;
    }
    setIsReorderMode(true);
    setReorderSourcePanel(panelId);
  }, []);

  // Toggle transform mode for a panel
  const toggleTransformMode = useCallback((panelId) => {
    // Cancel reorder mode when entering transform mode
    if (isReorderMode) {
      setIsReorderMode(false);
      setReorderSourcePanel(null);
    }

    setIsTransformMode(prev => ({
      ...prev,
      [panelId]: !prev[panelId]
    }));
  }, [isReorderMode]);

  const handleMenuTransform = useCallback(() => {
    if (actionMenuPanelId) {
      toggleTransformMode(actionMenuPanelId);
    }
    handleActionMenuClose();
  }, [actionMenuPanelId, toggleTransformMode, handleActionMenuClose]);

  const handleMenuReorder = useCallback(() => {
    if (actionMenuPanelId) {
      startReorderMode(actionMenuPanelId);
    }
    handleActionMenuClose();
  }, [actionMenuPanelId, startReorderMode, handleActionMenuClose]);

  // Trigger replace image through parent handler
  const handleMenuReplace = useCallback(() => {
    if (actionMenuPanelId && typeof onPanelClick === 'function') {
      const rect = panelRects.find(r => r.panelId === actionMenuPanelId);
      if (rect) {
        onPanelClick(rect.index, actionMenuPanelId);
      }
    }
    handleActionMenuClose();
  }, [actionMenuPanelId, onPanelClick, panelRects, handleActionMenuClose]);

  // Trigger magic edit via parent
  const handleMenuMagicEdit = useCallback(() => {
    if (actionMenuPanelId && typeof onEditImage === 'function') {
      const rect = panelRects.find(r => r.panelId === actionMenuPanelId);
      if (rect) {
        try {
          // Provide panel rect and current canvas/meta to parent to support frame-view cropping
          const imageIndex = panelImageMapping[actionMenuPanelId];
          const hasImage = typeof imageIndex === 'number' && loadedImages[imageIndex];
          const meta = {
            panelRect: rect,
            canvasWidth: componentWidth,
            canvasHeight: componentHeight,
            hasImage,
          };
          onEditImage(rect.index, actionMenuPanelId, meta);
        } catch (_) {
          onEditImage(rect.index, actionMenuPanelId);
        }
      }
    }
    handleActionMenuClose();
  }, [actionMenuPanelId, onEditImage, panelRects, handleActionMenuClose, panelImageMapping, loadedImages, componentWidth, componentHeight]);

  // Open caption editor for the panel
  const handleMenuEditCaption = useCallback(() => {
    if (actionMenuPanelId) {
      handleTextEdit(actionMenuPanelId);
    }
    handleActionMenuClose();
  }, [actionMenuPanelId, handleTextEdit, handleActionMenuClose]);

  const handleMenuRemovePanel = useCallback(() => {
    if (actionMenuPanelId && typeof onRemovePanel === 'function') {
      onRemovePanel(actionMenuPanelId);
    }
    handleActionMenuClose();
  }, [actionMenuPanelId, onRemovePanel, handleActionMenuClose]);

  // Get final canvas for export
  const getCanvasBlob = useCallback(() => new Promise((resolve) => {
      const canvas = canvasRef.current;
      if (canvas) {
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
          
          const rawCaption = panelText.rawContent ?? panelText.content ?? '';
          const { cleanText, ranges } = parseFormattedText(rawCaption);
          const hasActualText = cleanText && cleanText.trim();

          // Draw only actual text (not placeholder) for export
          if (hasImage && hasActualText) {
            exportCtx.save();
            
            // Clip text to frame boundaries in export - text beyond frame is hidden (window effect)
            exportCtx.beginPath();
            exportCtx.rect(x, y, width, height);
            exportCtx.clip();
            
            let baseFontSize = panelText.fontSize || lastUsedTextSettings.fontSize || 26;
            
            // Auto-calculate optimal font size if no explicit size is set and there's actual text
            if (hasActualText && !panelText.fontSize) {
              const optimalSize = calculateOptimalFontSize(cleanText, width, height);
              baseFontSize = optimalSize;
            }
            
            // Scale font size based on canvas size for export
            const fontSize = baseFontSize * textScaleFactor;
            const fontWeight = panelText.fontWeight || lastUsedTextSettings.fontWeight || 400;
            const fontStyle = panelText.fontStyle || lastUsedTextSettings.fontStyle || 'normal';
            const fontFamily = panelText.fontFamily || lastUsedTextSettings.fontFamily || 'Arial';
            const baseTextColor = panelText.color || lastUsedTextSettings.color || '#ffffff';
            const baseInlineStyle = {
              fontWeight,
              fontStyle,
              underline: false,
            };
            // Respect explicit 0 to disable stroke; fall back only when undefined
            const requestedStrokeWidth =
              (panelText.strokeWidth ?? lastUsedTextSettings.strokeWidth ?? 0);
            const textPositionX = panelText.textPositionX !== undefined ? panelText.textPositionX : (lastUsedTextSettings.textPositionX || 0);
            const textPositionY = panelText.textPositionY !== undefined ? panelText.textPositionY : (lastUsedTextSettings.textPositionY || 0);
            const textRotation = panelText.textRotation !== undefined ? panelText.textRotation : (lastUsedTextSettings.textRotation || 0);
            
            exportCtx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
            exportCtx.fillStyle = baseTextColor;
            exportCtx.textAlign = 'left';
            exportCtx.textBaseline = 'middle';
            exportCtx.strokeStyle = getContrastingMonoStroke(baseTextColor);
            // Use a font-relative stroke by default for readability in exports,
            // but allow explicit 0 to disable strokes entirely.
            const exportComputedStrokeWidth = Math.min(16, Math.max(3, Math.round(fontSize * 0.18)));
            if (requestedStrokeWidth === 0) {
              exportCtx.lineWidth = 0;
            } else if (requestedStrokeWidth > 0) {
              exportCtx.lineWidth = requestedStrokeWidth;
            } else {
              exportCtx.lineWidth = exportComputedStrokeWidth;
            }
            exportCtx.lineJoin = 'round';
            exportCtx.lineCap = 'round';
            // Subtle feathered shadow for exported image as well
            exportCtx.shadowColor = 'rgba(0, 0, 0, 0.25)';
            exportCtx.shadowOffsetX = 0;
            exportCtx.shadowOffsetY = 0;
            exportCtx.shadowBlur = 14;
            
            const textPadding = 10;
            const maxTextWidth = width - (textPadding * 2);
            const textX = x + (width / 2) + (textPositionX / 100) * (width / 2 - textPadding);
            
            const lineHeight = fontSize * 1.2;
            
            const lines = buildWrappedLines(
              exportCtx,
              cleanText,
              ranges,
              maxTextWidth,
              baseInlineStyle,
              fontSize,
              fontFamily,
            );
            
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
              const lineX = textX - (line.width / 2);
              const segments = getSegmentsForLine(ranges, line.start, line.end, baseInlineStyle);
              let cursorX = lineX;

              segments.forEach((segment) => {
                const segmentText = cleanText.slice(segment.start, segment.end);
                const resolvedStyle = segment.style;
                exportCtx.font = `${resolvedStyle.fontStyle || 'normal'} ${resolvedStyle.fontWeight} ${fontSize}px ${fontFamily}`;
                const segmentWidth = exportCtx.measureText(segmentText).width;

                if (exportCtx.lineWidth > 0) {
                  exportCtx.strokeText(segmentText, cursorX, lineY);
                }
                exportCtx.fillText(segmentText, cursorX, lineY);

                if (resolvedStyle.underline) {
                  exportCtx.save();
                  exportCtx.shadowColor = 'transparent';
                  exportCtx.strokeStyle = baseTextColor;
                  exportCtx.lineWidth = Math.max(1, fontSize * 0.08);
                  const underlineY = lineY + fontSize * 0.35;
                  exportCtx.beginPath();
                  exportCtx.moveTo(cursorX, underlineY);
                  exportCtx.lineTo(cursorX + segmentWidth, underlineY);
                  exportCtx.stroke();
                  exportCtx.restore();
                  exportCtx.shadowColor = 'rgba(0, 0, 0, 0.25)';
                }

                cursorX += segmentWidth;
              });
            });
            
            // Restore transformation if rotation was applied
            if (textRotation !== 0) {
              exportCtx.restore();
            }
            
            exportCtx.restore();
          }
        });

        const drawStickerLayers = async () => {
          if (!Array.isArray(stickers) || stickers.length === 0) return;

          const loadStickerImage = (src) => new Promise((done) => {
            if (!src) {
              done(null);
              return;
            }
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => done(img);
            img.onerror = () => done(null);
            img.src = src;
          });

          const assets = await Promise.all(stickers.map(async (sticker) => {
            if (!sticker?.id) return null;
            const fromCache = loadedStickers[sticker.id];
            if (fromCache) return fromCache;
            const src = sticker.originalUrl || sticker.thumbnailUrl || '';
            return loadStickerImage(src);
          }));

          stickers.forEach((sticker, index) => {
            if (!sticker) return;
            const img = assets[index];
            if (!img) return;
            const rect = getStickerRectPx(sticker, img);
            if (!rect) return;
            try {
              if (Math.abs(rect.angleDeg || 0) > 0.01) {
                const centerX = rect.x + (rect.width / 2);
                const centerY = rect.y + (rect.height / 2);
                exportCtx.save();
                exportCtx.translate(centerX, centerY);
                exportCtx.rotate((rect.angleDeg * Math.PI) / 180);
                exportCtx.drawImage(img, -(rect.width / 2), -(rect.height / 2), rect.width, rect.height);
                exportCtx.restore();
                return;
              }
              exportCtx.drawImage(img, rect.x, rect.y, rect.width, rect.height);
            } catch (_) {
              // Ignore sticker draw failures so export still succeeds.
            }
          });
        };

        Promise.resolve()
          .then(drawStickerLayers)
          .catch(() => undefined)
          .finally(() => {
            exportCanvas.toBlob(resolve, 'image/png');
          });
      } else {
        resolve(null);
      }
    }), [componentWidth, componentHeight, panelRects, loadedImages, loadedStickers, stickers, panelImageMapping, panelTransforms, borderPixels, borderColor, panelTexts, lastUsedTextSettings, theme.palette.mode, calculateOptimalFontSize, textScaleFactor, getStickerRectPx]);

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
  const stickerLayers = Array.isArray(stickers)
    ? stickers
        .map((sticker, index) => {
          if (!sticker?.id) return null;
          const src = sticker.originalUrl || sticker.thumbnailUrl;
          if (!src) return null;
          const rect = getStickerRectPx(sticker);
          if (!rect) return null;
          return {
            sticker,
            index,
            src,
            rect,
            isActive: activeStickerId === sticker.id,
          };
        })
        .filter(Boolean)
    : [];

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
        WebkitTouchCallout: 'none',
        // Visual feedback when in transform mode
        ...(anyPanelInTransformMode && {
          boxShadow: '0 0 0 2px #2196F3',
          borderRadius: '4px',
          transition: 'box-shadow 0.2s ease-in-out',
        }),
        // Visual feedback when in reorder mode
        ...(isReorderMode && {
          boxShadow: '0 0 0 2px #FF9800',
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
          onContextMenu={(e) => { 
            e.preventDefault(); 
            if (typeof onSaveGestureDetected === 'function') {
              onSaveGestureDetected();
            } else {
              setSaveHintOpen(true);
            }
          }}
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

      {/* Sticker visuals stay clipped; control handles can render outside the preview bounds. */}
      {stickerLayers.length > 0 && (
        <>
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              overflow: 'hidden',
              zIndex: 30,
              pointerEvents: 'none',
            }}
          >
            {stickerLayers.map(({ sticker, index, src, rect, isActive }) => (
              <Box
                key={`sticker-layer-${sticker.id}`}
                onPointerDown={(event) => handleStickerPointerDown(event, sticker, 'move')}
                sx={{
                  position: 'absolute',
                  left: rect.x,
                  top: rect.y,
                  width: rect.width,
                  height: rect.height,
                  zIndex: 1 + index,
                  pointerEvents: 'auto',
                  cursor: stickerInteraction?.stickerId === sticker.id
                    ? ((stickerInteraction?.mode === 'move' || stickerInteraction?.mode === 'rotate') ? 'grabbing' : 'grab')
                    : 'grab',
                  touchAction: 'none',
                  transformOrigin: 'center center',
                  transform: `rotate(${rect.angleDeg || 0}deg)`,
                }}
              >
                <Box
                  component="img"
                  src={src}
                  alt=""
                  draggable={false}
                  sx={{
                    width: '100%',
                    height: '100%',
                    display: 'block',
                    objectFit: 'contain',
                    userSelect: 'none',
                    pointerEvents: 'none',
                  }}
                />
              </Box>
            ))}
          </Box>

          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              overflow: 'visible',
              zIndex: 32,
              pointerEvents: 'none',
            }}
          >
            {stickerLayers.map(({ sticker, index, rect, isActive }) => {
              if (!isActive) return null;
              const handleSize = componentWidth < 560 ? 30 : 22;
              const rotateHandleSize = componentWidth < 560 ? 26 : 20;
              const deleteHandleSize = componentWidth < 560 ? 28 : 22;
              const doneHandleSize = componentWidth < 560 ? 28 : 22;

              return (
                <Box
                  key={`sticker-controls-${sticker.id}`}
                  sx={{
                    position: 'absolute',
                    left: rect.x,
                    top: rect.y,
                    width: rect.width,
                    height: rect.height,
                    zIndex: 1 + index,
                    pointerEvents: 'none',
                    transformOrigin: 'center center',
                    transform: `rotate(${rect.angleDeg || 0}deg)`,
                  }}
                >
                  <Box
                    sx={{
                      position: 'absolute',
                      inset: 0,
                      border: '2px solid rgba(33, 150, 243, 0.95)',
                      borderRadius: 1,
                      boxShadow: '0 0 0 1px rgba(255,255,255,0.9), 0 6px 20px rgba(0,0,0,0.28)',
                      pointerEvents: 'none',
                    }}
                  />
                  <Box
                    sx={{
                      position: 'absolute',
                      left: '50%',
                      top: -18,
                      width: 2,
                      height: 14,
                      transform: 'translateX(-50%)',
                      backgroundColor: 'rgba(255,255,255,0.9)',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.35)',
                      pointerEvents: 'none',
                    }}
                  />
                  <Box
                    onPointerDown={(event) => handleStickerPointerDown(event, sticker, 'rotate')}
                    sx={{
                      position: 'absolute',
                      left: '50%',
                      top: -(rotateHandleSize + 14),
                      width: rotateHandleSize,
                      height: rotateHandleSize,
                      transform: 'translateX(-50%)',
                      borderRadius: '50%',
                      border: '2px solid rgba(255,255,255,0.95)',
                      backgroundColor: 'rgba(244, 67, 54, 0.95)',
                      boxShadow: '0 3px 10px rgba(0,0,0,0.32)',
                      cursor: stickerInteraction?.stickerId === sticker.id && stickerInteraction?.mode === 'rotate'
                        ? 'grabbing'
                        : 'grab',
                      pointerEvents: 'auto',
                      touchAction: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <RotateRight sx={{ fontSize: rotateHandleSize * 0.66, color: '#ffffff' }} />
                  </Box>
                  <Box
                    onPointerDown={handleStickerDone}
                    sx={{
                      position: 'absolute',
                      left: -(doneHandleSize * 0.35),
                      top: -(doneHandleSize * 0.35),
                      width: doneHandleSize,
                      height: doneHandleSize,
                      borderRadius: '50%',
                      border: '2px solid rgba(255,255,255,0.95)',
                      backgroundColor: 'rgba(67, 160, 71, 0.96)',
                      boxShadow: '0 3px 10px rgba(0,0,0,0.32)',
                      color: '#ffffff',
                      cursor: 'pointer',
                      pointerEvents: 'auto',
                      touchAction: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Check sx={{ fontSize: doneHandleSize * 0.62 }} />
                  </Box>
                  <Box
                    onPointerDown={(event) => handleStickerDelete(event, sticker.id)}
                    sx={{
                      position: 'absolute',
                      right: -(deleteHandleSize * 0.35),
                      top: -(deleteHandleSize * 0.35),
                      width: deleteHandleSize,
                      height: deleteHandleSize,
                      borderRadius: '50%',
                      border: '2px solid rgba(255,255,255,0.95)',
                      backgroundColor: 'rgba(229, 57, 53, 0.96)',
                      boxShadow: '0 3px 10px rgba(0,0,0,0.32)',
                      color: '#ffffff',
                      cursor: 'pointer',
                      pointerEvents: 'auto',
                      touchAction: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <DeleteOutline sx={{ fontSize: deleteHandleSize * 0.62 }} />
                  </Box>
                  <Box
                    onPointerDown={(event) => handleStickerPointerDown(event, sticker, 'resize')}
                    sx={{
                      position: 'absolute',
                      right: -(handleSize * 0.35),
                      bottom: -(handleSize * 0.35),
                      width: handleSize,
                      height: handleSize,
                      borderRadius: '50%',
                      border: '2px solid rgba(255,255,255,0.95)',
                      backgroundColor: 'rgba(33, 150, 243, 0.95)',
                      boxShadow: '0 3px 10px rgba(0,0,0,0.32)',
                      cursor: 'nwse-resize',
                      pointerEvents: 'auto',
                      touchAction: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <OpenInFull sx={{ fontSize: handleSize * 0.56, color: '#ffffff' }} />
                  </Box>
                  <Box
                    sx={{
                      position: 'absolute',
                      left: '50%',
                      top: '50%',
                      width: componentWidth < 560 ? 26 : 22,
                      height: componentWidth < 560 ? 26 : 22,
                      transform: 'translate(-50%, -50%)',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(15, 23, 42, 0.68)',
                      border: '1px solid rgba(255,255,255,0.72)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      pointerEvents: 'none',
                    }}
                  >
                    <DragIndicator sx={{ fontSize: componentWidth < 560 ? 15 : 13 }} />
                  </Box>
                </Box>
              );
            })}
          </Box>
        </>
      )}
      
      {/* Control panels positioned over canvas */}
      {panelRects.map((rect) => {
        const { panelId } = rect;
        const imageIndex = panelImageMapping[panelId];
        const hasImage = imageIndex !== undefined && loadedImages[imageIndex];
        return (
          <Box key={`controls-${panelId}`}>
            {/* Check icon for the frame being moved in reorder mode */}
            {isReorderMode && reorderSourcePanel === panelId && (
              <IconButton
                size="small"
                onClick={cancelReorderMode}
                sx={{
                  position: 'absolute',
                  top: rect.y + 8,
                  left: rect.x + rect.width - 48, // Same position as transform button
                  width: 40,
                  height: 40,
                  backgroundColor: '#4CAF50',
                  color: '#ffffff',
                  border: '2px solid #ffffff',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
                  opacity: 1,
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    backgroundColor: '#388E3C',
                    transform: 'scale(1.1)',
                  },
                  touchAction: 'manipulation',
                  cursor: 'pointer',
                  zIndex: 12,
                }}
              >
                <Check sx={{ fontSize: 20 }} />
              </IconButton>
            )}

            {/* Check icon for the frame in transform (Crop & Zoom) mode */}
            {isTransformMode?.[panelId] && (
              <IconButton
                size="small"
                onClick={dismissTransformMode}
                sx={{
                  position: 'absolute',
                  top: rect.y + 8,
                  left: rect.x + rect.width - 48,
                  width: 40,
                  height: 40,
                  backgroundColor: '#4CAF50',
                  color: '#ffffff',
                  border: '2px solid #ffffff',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
                  opacity: 1,
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    backgroundColor: '#388E3C',
                    transform: 'scale(1.1)',
                  },
                  touchAction: 'manipulation',
                  cursor: 'pointer',
                  zIndex: 12,
                }}
              >
                <Check sx={{ fontSize: 20 }} />
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
      {(textEditingPanel !== null || Object.values(isTransformMode).some(enabled => enabled) || isReorderMode) &&
       panelRects.map((rect) => {
        const { panelId } = rect;
        
        // Skip overlay for active panels (being edited, in transform mode, or source panel during reorder)
        if (panelId === textEditingPanel || isTransformMode[panelId] || (isReorderMode && panelId === reorderSourcePanel)) return null;
        
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
              pointerEvents: isReorderMode ? 'auto' : 'none', // Allow clicks during reorder mode
              transition: 'all 0.35s ease-out', // Clearly noticeable fade
              zIndex: 15, // Above hover overlays, below caption editor controls
              cursor: isReorderMode ? 'pointer' : 'default',
            }}
          />
        );
      })}

      {/* "Move Here" overlays for destination panels in reorder mode */}
      {isReorderMode && panelRects.map((rect) => {
        const { panelId } = rect;
        
        // Only show on destination panels (not the source panel)
        if (panelId === reorderSourcePanel) return null;
        
        return (
          <Box
            key={`move-here-overlay-${panelId}`}
            onClick={() => handleReorderDestination(panelId)}
            sx={{
              position: 'absolute',
              top: rect.y,
              left: rect.x,
              width: rect.width,
              height: rect.height,
              backgroundColor: 'rgba(33, 150, 243, 0.3)', // Blue with transparency
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 16, // Above focus overlays
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              '&:hover': {
                backgroundColor: 'rgba(33, 150, 243, 0.4)',
              }
            }}
          >
                         {/* Destination place icon */}
             <Place
               sx={{
                 fontSize: `clamp(30px, ${Math.min(rect.width, rect.height) * 0.25}px, 60px)`,
                 color: 'white',
                 marginBottom: 1,
                 filter: 'drop-shadow(1px 1px 2px rgba(0,0,0,0.8))',
               }}
             />
            
            {/* "Move Here" text */}
            <Box
              component="span"
              sx={{
                color: 'white',
                fontWeight: 'bold',
                fontSize: Math.min(rect.width, rect.height) * 0.08,
                textShadow: '1px 1px 3px rgba(0,0,0,0.8)',
                userSelect: 'none',
              }}
            >
              Move Here
            </Box>
          </Box>
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

      {/* Invisible backdrop for text editor - container-bound to avoid covering bottom bars */}
      {textEditingPanel !== null && (
        <Box
          onClick={handleTextClose}
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'transparent',
            zIndex: 15,
            cursor: 'default',
          }}
        />
      )}

      {/* Long-press save hint */}
      <Snackbar
        open={saveHintOpen}
        onClose={() => setSaveHintOpen(false)}
        autoHideDuration={2400}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSaveHintOpen(false)}
          severity="info"
          variant="filled"
          icon={<SaveAlt fontSize="inherit" />}
          sx={{
            bgcolor: 'rgba(33, 150, 243, 0.95)',
            color: '#fff',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            borderRadius: 2,
          }}
        >
          Press "Generate Collage" to save your image
        </Alert>
      </Snackbar>

      {/* Invisible backdrop for reorder mode - captures clicks outside panels to cancel */}
      {isReorderMode && (
        <Box
          onClick={cancelReorderMode}
          sx={{
            position: 'fixed', // Fixed to cover entire viewport
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'transparent', // Completely invisible
            zIndex: 10, // Below reorder buttons but above everything else
            cursor: 'default',
          }}
        />
      )}

      {/* Border drag zones - only visible when not in transform mode, text editing, or reorder mode */}
      {!Object.values(isTransformMode).some(enabled => enabled) &&
       textEditingPanel === null &&
       !isReorderMode &&
       borderZones.map((zone) => (
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

      {/* Action menu for panel controls (Crop & Zoom, Rearrange, Replace Image) */}
      <Menu
        anchorEl={actionMenuAnchorEl}
        anchorReference={actionMenuPosition ? 'anchorPosition' : 'anchorEl'}
        anchorPosition={actionMenuPosition || undefined}
        open={Boolean(actionMenuAnchorEl) || Boolean(actionMenuPosition)}
        onClose={handleActionMenuClose}
      >
        {(() => {
          const imageIndex = actionMenuPanelId ? panelImageMapping[actionMenuPanelId] : undefined;
          const hasImageForPanel = imageIndex !== undefined && loadedImages[imageIndex];
          const hasCaption = !!(actionMenuPanelId && panelTexts[actionMenuPanelId] && (panelTexts[actionMenuPanelId].content || '').trim());
          if (!hasImageForPanel) {
            return (
              <>
                <MenuItem onClick={handleMenuReplace}>
                  <ListItemIcon>
                    <ImageIcon fontSize="small" />
                  </ListItemIcon>
                  Add image
                </MenuItem>
                <MenuItem onClick={handleMenuRemovePanel} disabled={panelCount <= 1} sx={{ color: 'error.main' }}>
                  <ListItemIcon sx={{ color: 'inherit' }}>
                    <DeleteOutline fontSize="small" />
                  </ListItemIcon>
                  Remove Panel
                </MenuItem>
              </>
            );
          }
          return (
            <>
              <MenuItem onClick={handleMenuTransform} disabled={!hasImageForPanel}>
                <ListItemIcon>
                  <Crop fontSize="small" />
                </ListItemIcon>
                Crop & Zoom
              </MenuItem>
              <MenuItem onClick={handleMenuReorder} disabled={!hasImageForPanel}>
                <ListItemIcon>
                  <DragIndicator fontSize="small" />
                </ListItemIcon>
                Rearrange
              </MenuItem>
              {canEditImage && (
                <MenuItem onClick={handleMenuMagicEdit} disabled={!hasImageForPanel}>
                  <ListItemIcon>
                    <AutoFixHighRounded fontSize="small" />
                  </ListItemIcon>
                  Edit Image
                </MenuItem>
              )}
              <MenuItem onClick={handleMenuReplace}>
                <ListItemIcon>
                  <ImageIcon fontSize="small" />
                </ListItemIcon>
                Replace Image
              </MenuItem>
              <MenuItem onClick={handleMenuRemovePanel} disabled={panelCount <= 1} sx={{ color: 'error.main' }}>
                <ListItemIcon sx={{ color: 'inherit' }}>
                  <DeleteOutline fontSize="small" />
                </ListItemIcon>
                Remove Panel
              </MenuItem>
              <MenuItem onClick={handleMenuEditCaption} disabled={!hasImageForPanel}>
                <ListItemIcon>
                  <Subtitles fontSize="small" />
                </ListItemIcon>
                {hasCaption ? 'Edit caption' : 'Add caption'}
              </MenuItem>
            </>
          );
        })()}
      </Menu>

    </Box>
  );
};

CanvasCollagePreview.propTypes = {
  selectedTemplate: PropTypes.object,
  panelCount: PropTypes.number,
  images: PropTypes.arrayOf(PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.shape({
      originalUrl: PropTypes.string,
      displayUrl: PropTypes.string,
      metadata: PropTypes.object,
    }),
  ])),
  onPanelClick: PropTypes.func,
  onRemovePanel: PropTypes.func,
  onEditImage: PropTypes.func,
  canEditImage: PropTypes.bool,
  onSaveGestureDetected: PropTypes.func,
  isFrameActionSuppressed: PropTypes.func,
  isHydratingProject: PropTypes.bool,
  aspectRatioValue: PropTypes.number,
  panelImageMapping: PropTypes.object,
  updatePanelImageMapping: PropTypes.func,
  borderThickness: PropTypes.number,
  borderColor: PropTypes.string,
  panelTransforms: PropTypes.object,
  updatePanelTransform: PropTypes.func,
  panelTexts: PropTypes.object,
  stickers: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string,
      originalUrl: PropTypes.string,
      thumbnailUrl: PropTypes.string,
      metadata: PropTypes.object,
      aspectRatio: PropTypes.number,
      angleDeg: PropTypes.number,
      widthPercent: PropTypes.number,
      xPercent: PropTypes.number,
      yPercent: PropTypes.number,
    })
  ),
  updateSticker: PropTypes.func,
  moveSticker: PropTypes.func,
  removeSticker: PropTypes.func,
  updatePanelText: PropTypes.func,
  lastUsedTextSettings: PropTypes.object,
  onCaptionEditorVisibleChange: PropTypes.func,
  isGeneratingCollage: PropTypes.bool,
  renderSig: PropTypes.string,
  onRendered: PropTypes.func,
  onEditingSessionChange: PropTypes.func,
  onPreviewMetaChange: PropTypes.func,
  allowHydrationTransformCarry: PropTypes.bool,
};

export default CanvasCollagePreview;
