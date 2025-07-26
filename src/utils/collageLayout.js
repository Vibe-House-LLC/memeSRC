import { layoutDefinitions } from "../components/collage/config/layouts";

export const getBorderPixelSize = (borderThickness, componentWidth = 400) => {
  if (typeof borderThickness === 'number') {
    return Math.round((borderThickness / 100) * componentWidth);
  }
  return 0;
};

export const createLayoutConfig = (template, panelCount) => {
  if (!template) return null;

  try {
    const panelCountKey = Math.max(2, Math.min(panelCount, 5));
    const categories = layoutDefinitions[panelCountKey];

    if (categories) {
      const foundLayout = Object.keys(categories).reduce((result, category) => {
        if (result) return result;
        const layouts = categories[category];
        const originalLayout = layouts.find((l) => l.id === template.id);
        if (originalLayout && typeof originalLayout.getLayoutConfig === 'function') {
          return originalLayout;
        }
        return null;
      }, null);

      if (foundLayout) {
        return foundLayout.getLayoutConfig();
      }
    }

    return {
      gridTemplateColumns: `repeat(${Math.ceil(Math.sqrt(panelCount))}, 1fr)`,
      gridTemplateRows: `repeat(${Math.ceil(panelCount / Math.ceil(Math.sqrt(panelCount)))}, 1fr)`,
      gridTemplateAreas: null,
      items: Array(panelCount).fill({ gridArea: null }),
    };
  } catch (error) {
    console.error('Error creating layout config:', error, template);
    return {
      gridTemplateColumns: `repeat(${Math.ceil(Math.sqrt(panelCount))}, 1fr)`,
      gridTemplateRows: `repeat(${Math.ceil(panelCount / Math.ceil(Math.sqrt(panelCount)))}, 1fr)`,
      gridTemplateAreas: null,
      items: Array(panelCount).fill({ gridArea: null }),
    };
  }
};

export const parseGridTemplateAreas = (gridTemplateAreas) => {
  if (!gridTemplateAreas) return {};
  const areas = {};
  const cleanString = gridTemplateAreas.trim();
  let rows;
  if (cleanString.includes('" "')) {
    rows = cleanString.split('" "').map((row) => row.replace(/"/g, '').trim().split(/\s+/));
  } else if (cleanString.includes("' '")) {
    rows = cleanString.split("' '").map((row) => row.replace(/'/g, '').trim().split(/\s+/));
  } else {
    rows = [cleanString.replace(/['"]/g, '').trim().split(/\s+/)];
  }
  rows.forEach((row, rowIndex) => {
    row.forEach((areaName, colIndex) => {
      if (areaName !== '.' && areaName !== '') {
        if (!areas[areaName]) {
          areas[areaName] = {
            rowStart: rowIndex,
            rowEnd: rowIndex,
            colStart: colIndex,
            colEnd: colIndex,
          };
        } else {
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

export const detectBorderZones = (layoutConfig, containerWidth, containerHeight, borderPixels) => {
  if (!layoutConfig) return [];
  const zones = [];
  const threshold = Math.max(16, borderPixels * 2);
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
        columnSizes = frMatches.map((match) => {
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
        rowSizes = frMatches.map((match) => {
          const value = match.replace('fr', '');
          return value === '' ? 1 : parseFloat(value);
        });
      }
    }
  }
  if (columnSizes.length <= 1 && rowSizes.length <= 1) {
    return [];
  }
  const totalColumnFr = columnSizes.reduce((sum, size) => sum + size, 0);
  const totalRowFr = rowSizes.reduce((sum, size) => sum + size, 0);
  const horizontalGaps = Math.max(0, columnSizes.length - 1) * borderPixels;
  const verticalGaps = Math.max(0, rowSizes.length - 1) * borderPixels;
  const availableWidth = containerWidth - borderPixels * 2 - horizontalGaps;
  const availableHeight = containerHeight - borderPixels * 2 - verticalGaps;
  const columnFrUnit = availableWidth / totalColumnFr;
  const rowFrUnit = availableHeight / totalRowFr;
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
        id: `vertical-${i}`,
      });
      currentX += borderPixels;
    }
  }
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
        id: `horizontal-${i}`,
      });
      currentY += borderPixels;
    }
  }
  return zones;
};

export const parseGridToRects = (layoutConfig, containerWidth, containerHeight, panelCount, borderPixels) => {
  const rects = [];
  const totalPadding = borderPixels * 2;
  const availableWidth = containerWidth - totalPadding;
  const availableHeight = containerHeight - totalPadding;
  let columns = 1;
  let rows = 1;
  let columnSizes = [1];
  let rowSizes = [1];
  if (layoutConfig.gridTemplateColumns) {
    if (layoutConfig.gridTemplateColumns.includes('repeat(')) {
      const repeatMatch = layoutConfig.gridTemplateColumns.match(/repeat\((\d+),/);
      if (repeatMatch) {
        columns = parseInt(repeatMatch[1], 10);
        columnSizes = Array(columns).fill(1);
      }
    } else {
      const frMatches = layoutConfig.gridTemplateColumns.match(/(\d*\.?\d*)fr/g);
      if (frMatches) {
        columns = frMatches.length;
        columnSizes = frMatches.map((match) => {
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
        rows = parseInt(repeatMatch[1], 10);
        rowSizes = Array(rows).fill(1);
      }
    } else {
      const frMatches = layoutConfig.gridTemplateRows.match(/(\d*\.?\d*)fr/g);
      if (frMatches) {
        rows = frMatches.length;
        rowSizes = frMatches.map((match) => {
          const value = match.replace('fr', '');
          return value === '' ? 1 : parseFloat(value);
        });
      }
    }
  }
  const totalColumnFr = columnSizes.reduce((sum, size) => sum + size, 0);
  const totalRowFr = rowSizes.reduce((sum, size) => sum + size, 0);
  const horizontalGaps = Math.max(0, columns - 1) * borderPixels;
  const verticalGaps = Math.max(0, rows - 1) * borderPixels;
  const columnFrUnit = (availableWidth - horizontalGaps) / totalColumnFr;
  const rowFrUnit = (availableHeight - verticalGaps) / totalRowFr;
  const getCellDimensions = (col, row) => {
    let x = borderPixels;
    for (let c = 0; c < col; c += 1) {
      x += columnSizes[c] * columnFrUnit + borderPixels;
    }
    let y = borderPixels;
    for (let r = 0; r < row; r += 1) {
      y += rowSizes[r] * rowFrUnit + borderPixels;
    }
    const width = columnSizes[col] * columnFrUnit;
    const height = rowSizes[row] * rowFrUnit;
    return { x, y, width, height };
  };
  if (layoutConfig.areas && layoutConfig.areas.length > 0 && layoutConfig.gridTemplateAreas) {
    const gridAreas = parseGridTemplateAreas(layoutConfig.gridTemplateAreas);
    layoutConfig.areas.slice(0, panelCount).forEach((areaName, index) => {
      const areaInfo = gridAreas[areaName];
      if (areaInfo) {
        let x = borderPixels;
        let y = borderPixels;
        let width = 0;
        let height = 0;
        for (let c = 0; c < areaInfo.colStart; c += 1) {
          x += columnSizes[c] * columnFrUnit + borderPixels;
        }
        for (let c = areaInfo.colStart; c <= areaInfo.colEnd; c += 1) {
          width += columnSizes[c] * columnFrUnit;
        }
        if (areaInfo.colEnd > areaInfo.colStart) {
          width += (areaInfo.colEnd - areaInfo.colStart) * borderPixels;
        }
        for (let r = 0; r < areaInfo.rowStart; r += 1) {
          y += rowSizes[r] * rowFrUnit + borderPixels;
        }
        for (let r = areaInfo.rowStart; r <= areaInfo.rowEnd; r += 1) {
          height += rowSizes[r] * rowFrUnit;
        }
        if (areaInfo.rowEnd > areaInfo.rowStart) {
          height += (areaInfo.rowEnd - areaInfo.rowStart) * borderPixels;
        }
        rects.push({
          x,
          y,
          width,
          height,
          panelId: `panel-${index + 1}`,
          index,
        });
      }
    });
  } else {
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
        index: i,
      });
    }
  }
  return rects;
};

export const getFriendlyAspectRatio = (value) => {
  if (value === 1) return '1:1';
  if (Math.abs(value - 0.8) < 0.01) return '4:5';
  if (Math.abs(value - 2 / 3) < 0.01) return '2:3';
  if (Math.abs(value - 0.5625) < 0.01) return '9:16';
  if (Math.abs(value - 1.33) < 0.01) return '4:3';
  if (Math.abs(value - 1.5) < 0.01) return '3:2';
  if (Math.abs(value - 1.78) < 0.01) return '16:9';
  if (value > 1) {
    return `${Math.round(value)}:1`;
  }
  return `1:${Math.round(1 / value)}`;
};
