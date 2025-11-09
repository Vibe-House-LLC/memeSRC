// Layout calculation utilities for computing panel dimensions from templates

interface LayoutTemplate {
  id?: string;
  layout?: {
    panels?: Array<{ id?: string }>;
  };
  getLayoutConfig?: () => LayoutConfig;
}

interface LayoutConfig {
  gridTemplateColumns?: string;
  gridTemplateRows?: string;
  gridTemplateAreas?: string | null;
  areas?: string[];
  items?: any[];
}

/**
 * Parse CSS grid template string (e.g., "1fr 2fr" or "repeat(3, 1fr)") to get track sizes.
 */
function parseGridTemplate(template: string): number[] {
  if (!template || typeof template !== 'string') {
    return [1];
  }

  // Handle repeat() syntax
  if (template.includes('repeat(')) {
    const repeatMatch = template.match(/repeat\((\d+)\s*,\s*([^)]+)\)/i);
    if (repeatMatch) {
      const count = parseInt(repeatMatch[1], 10);
      const value = repeatMatch[2].trim();
      
      // Parse the value inside repeat
      if (value.includes('fr')) {
        const frValue = parseFloat(value.replace('fr', '').trim()) || 1;
        return Array(count).fill(frValue);
      }
      return Array(count).fill(1);
    }
  }

  // Parse individual fr units like "2fr 1fr" or "1fr 1fr 1fr"
  const frMatches = template.match(/(\d*\.?\d*)fr/g);
  if (frMatches) {
    return frMatches.map(match => {
      const value = match.replace('fr', '').trim();
      return value === '' ? 1 : parseFloat(value);
    });
  }

  return [1];
}

/**
 * Parse CSS grid template areas string to find bounds of each named area.
 */
function parseGridTemplateAreas(gridTemplateAreas: string): Record<string, {
  rowStart: number;
  rowEnd: number;
  colStart: number;
  colEnd: number;
}> {
  if (!gridTemplateAreas) return {};
  
  const areas: Record<string, any> = {};
  
  // Split by quotes to get individual rows
  const cleanString = gridTemplateAreas.trim();
  let rows: string[][];
  
  if (cleanString.includes('" "')) {
    rows = cleanString.split('" "').map(row => 
      row.replace(/"/g, '').trim().split(/\s+/)
    );
  } else if (cleanString.includes("' '")) {
    rows = cleanString.split("' '").map(row => 
      row.replace(/'/g, '').trim().split(/\s+/)
    );
  } else {
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
}

/**
 * Compute panel dimensions from a template layout configuration.
 * This provides the exact dimensions each panel will have when rendered.
 * 
 * @param template - The layout template (must have getLayoutConfig method)
 * @param canvasWidth - Total canvas width in pixels
 * @param canvasHeight - Total canvas height in pixels
 * @param borderThickness - Border thickness as percentage (0-100)
 * @param panelCount - Number of panels
 * @returns Record mapping panelId to {width, height} in pixels
 */
export function computePanelDimensionsFromTemplate(
  template: LayoutTemplate | null | undefined,
  canvasWidth: number,
  canvasHeight: number,
  borderThickness: number,
  panelCount: number
): Record<string, { width: number; height: number }> {
  if (!template || typeof canvasWidth !== 'number' || typeof canvasHeight !== 'number') {
    return {};
  }

  let layoutConfig: LayoutConfig | null = null;
  
  try {
    if (typeof template.getLayoutConfig === 'function') {
      layoutConfig = template.getLayoutConfig();
    }
  } catch (err) {
    return {};
  }

  if (!layoutConfig) {
    return {};
  }

  // Calculate border pixel size
  const borderPixels = Math.round((borderThickness / 100) * canvasWidth);
  
  // Calculate the available space (subtract outer borders)
  const totalPadding = borderPixels * 2;
  const availableWidth = canvasWidth - totalPadding;
  const availableHeight = canvasHeight - totalPadding;

  // Parse grid columns and rows
  const columnSizes = parseGridTemplate(layoutConfig.gridTemplateColumns || '1fr');
  const rowSizes = parseGridTemplate(layoutConfig.gridTemplateRows || '1fr');
  
  const columns = columnSizes.length;
  const rows = rowSizes.length;
  
  // Calculate total fractional units
  const totalColumnFr = columnSizes.reduce((sum, size) => sum + size, 0);
  const totalRowFr = rowSizes.reduce((sum, size) => sum + size, 0);
  
  // Calculate gaps - only between panels, not at edges
  const horizontalGaps = Math.max(0, columns - 1) * borderPixels;
  const verticalGaps = Math.max(0, rows - 1) * borderPixels;
  
  // Calculate base unit sizes
  const columnFrUnit = (availableWidth - horizontalGaps) / totalColumnFr;
  const rowFrUnit = (availableHeight - verticalGaps) / totalRowFr;

  const panelDimensions: Record<string, { width: number; height: number }> = {};

  // Helper to calculate cell dimensions
  const getCellDimensions = (col: number, row: number) => {
    const width = columnSizes[col] * columnFrUnit;
    const height = rowSizes[row] * rowFrUnit;
    return { width, height };
  };

  // If using grid template areas
  if (layoutConfig.areas && layoutConfig.areas.length > 0 && layoutConfig.gridTemplateAreas) {
    const gridAreas = parseGridTemplateAreas(layoutConfig.gridTemplateAreas);
    
    layoutConfig.areas.slice(0, panelCount).forEach((areaName, index) => {
      const areaInfo = gridAreas[areaName];
      if (areaInfo) {
        let width = 0;
        let height = 0;
        
        // Calculate width spanning columns
        for (let c = areaInfo.colStart; c <= areaInfo.colEnd; c += 1) {
          width += columnSizes[c] * columnFrUnit;
        }
        // Add gaps between columns within the area
        if (areaInfo.colEnd > areaInfo.colStart) {
          width += (areaInfo.colEnd - areaInfo.colStart) * borderPixels;
        }
        
        // Calculate height spanning rows
        for (let r = areaInfo.rowStart; r <= areaInfo.rowEnd; r += 1) {
          height += rowSizes[r] * rowFrUnit;
        }
        // Add gaps between rows within the area
        if (areaInfo.rowEnd > areaInfo.rowStart) {
          height += (areaInfo.rowEnd - areaInfo.rowStart) * borderPixels;
        }
        
        panelDimensions[`panel-${index + 1}`] = { width, height };
      }
    });
  } else {
    // Simple grid layout (no template areas)
    for (let i = 0; i < panelCount; i += 1) {
      const col = i % columns;
      const row = Math.floor(i / columns);
      const { width, height } = getCellDimensions(col, row);
      
      panelDimensions[`panel-${i + 1}`] = { width, height };
    }
  }

  return panelDimensions;
}

/**
 * Estimate canvas dimensions for a given aspect ratio and approximate viewport.
 * This is useful when we need to compute panel dimensions before the canvas is rendered.
 * 
 * @param aspectRatioValue - Numeric aspect ratio (width/height)
 * @param maxWidth - Maximum canvas width (typically container width)
 * @returns Estimated {width, height} for the canvas
 */
export function estimateCanvasDimensions(
  aspectRatioValue: number,
  maxWidth: number = 1200
): { width: number; height: number } {
  // Use a reasonable default width
  const width = Math.min(maxWidth, 1200);
  const height = width / aspectRatioValue;
  
  return { width, height };
}

