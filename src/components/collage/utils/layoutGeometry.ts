export type GridAreaBounds = {
  rowStart: number;
  rowEnd: number;
  colStart: number;
  colEnd: number;
};

export type PanelRect = {
  x: number;
  y: number;
  width: number;
  height: number;
  panelId: string;
  index: number;
};

export type LayoutConfig = {
  gridTemplateColumns?: string | null;
  gridTemplateRows?: string | null;
  gridTemplateAreas?: string | null;
  areas?: string[] | null;
  items?: Array<{ gridArea?: string | null }> | null;
  panelRects?: Array<{
    panelId?: string;
    index?: number;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
  }> | null;
};

export type ParseGridToRectsOptions = {
  minRectSizePx?: number;
  limitSequentialToGridCells?: boolean;
};

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

export const clampRectRatio = (value: unknown): number => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return clamp(numeric, 0, 1);
};

export const getPanelOrderIndex = (
  panel: { index?: number; panelId?: string } | null | undefined,
  fallbackIndex = 0
): number => {
  const explicitIndex = Number(panel?.index);
  if (Number.isFinite(explicitIndex)) return explicitIndex;
  const panelId = String(panel?.panelId || '');
  const idMatch = panelId.match(/^panel-(\d+)$/);
  if (idMatch) {
    return Math.max(0, parseInt(idMatch[1], 10) - 1);
  }
  return fallbackIndex;
};

export const parseGridTemplateAreas = (gridTemplateAreas: unknown): Record<string, GridAreaBounds> => {
  if (typeof gridTemplateAreas !== 'string' || gridTemplateAreas.trim().length === 0) return {};

  const raw = gridTemplateAreas.trim();
  const quotedRows = raw.match(/"[^"]+"|'[^']+'/g);
  const rows = (quotedRows && quotedRows.length > 0
    ? quotedRows.map((row) => row.slice(1, -1))
    : [raw.replace(/['"]/g, '')]
  )
    .map((row) => row.trim())
    .filter((row) => row.length > 0)
    .map((row) => row.split(/\s+/));

  const areas: Record<string, GridAreaBounds> = {};
  rows.forEach((row, rowIndex) => {
    row.forEach((areaName, colIndex) => {
      if (!areaName || areaName === '.') return;

      if (!areas[areaName]) {
        areas[areaName] = {
          rowStart: rowIndex,
          rowEnd: rowIndex,
          colStart: colIndex,
          colEnd: colIndex,
        };
        return;
      }

      const area = areas[areaName];
      area.rowStart = Math.min(area.rowStart, rowIndex);
      area.rowEnd = Math.max(area.rowEnd, rowIndex);
      area.colStart = Math.min(area.colStart, colIndex);
      area.colEnd = Math.max(area.colEnd, colIndex);
    });
  });

  return areas;
};

const parseTrackSizes = (template: string | null | undefined, fallbackCount = 1): number[] => {
  if (!template) return Array(Math.max(1, fallbackCount)).fill(1);

  const normalized = template.trim();
  const repeatMatch = normalized.match(/repeat\((\d+)\s*,/i);
  if (repeatMatch) {
    const count = parseInt(repeatMatch[1], 10);
    return Array(Math.max(1, count)).fill(1);
  }

  const frMatches = normalized.match(/(\d*\.?\d*)fr/gi);
  if (!frMatches || frMatches.length === 0) {
    return Array(Math.max(1, fallbackCount)).fill(1);
  }

  return frMatches.map((part) => {
    const numeric = Number(part.replace(/fr/i, ''));
    return Number.isFinite(numeric) && numeric > 0 ? numeric : 1;
  });
};

export const isCustomLayoutCompatible = (customLayout: unknown, panelCount: number): boolean => {
  try {
    if (!customLayout || typeof customLayout !== 'object') return false;
    const minimumPanels = Math.max(1, panelCount || 1);

    if (Array.isArray((customLayout as { panelRects?: unknown[] }).panelRects)) {
      return (customLayout as { panelRects: unknown[] }).panelRects.length >= minimumPanels;
    }
    if (Array.isArray((customLayout as { areas?: unknown[] }).areas)) {
      return (customLayout as { areas: unknown[] }).areas.length >= minimumPanels;
    }
    if (Array.isArray((customLayout as { items?: unknown[] }).items)) {
      return (customLayout as { items: unknown[] }).items.length >= minimumPanels;
    }
    const gridTemplateColumns = (customLayout as { gridTemplateColumns?: unknown }).gridTemplateColumns;
    const gridTemplateRows = (customLayout as { gridTemplateRows?: unknown }).gridTemplateRows;
    if (typeof gridTemplateColumns === 'string' && typeof gridTemplateRows === 'string') {
      const columnTrackCount = parseTrackSizes(gridTemplateColumns, 0).length;
      const rowTrackCount = parseTrackSizes(gridTemplateRows, 0).length;
      if (columnTrackCount > 0 && rowTrackCount > 0) {
        return (columnTrackCount * rowTrackCount) >= minimumPanels;
      }
    }
    return false;
  } catch (_) {
    return false;
  }
};

export const parseGridToRects = (
  layoutConfig: LayoutConfig | null | undefined,
  containerWidth: number,
  containerHeight: number,
  panelCount: number,
  borderPixels: number,
  options: ParseGridToRectsOptions = {}
): PanelRect[] => {
  const desiredPanelCount = Math.max(1, Number(panelCount) || 1);
  const minRectSizePx = Number.isFinite(Number(options.minRectSizePx))
    ? Math.max(0, Number(options.minRectSizePx))
    : 0.25;
  const limitSequentialToGridCells = Boolean(options.limitSequentialToGridCells);

  if (Array.isArray(layoutConfig?.panelRects) && layoutConfig.panelRects.length > 0) {
    const inset = Math.max(0, Number(borderPixels) || 0);
    const interiorLeft = inset;
    const interiorTop = inset;
    const interiorRight = Math.max(interiorLeft + 1, containerWidth - inset);
    const interiorBottom = Math.max(interiorTop + 1, containerHeight - inset);
    const interiorWidth = Math.max(1, interiorRight - interiorLeft);
    const interiorHeight = Math.max(1, interiorBottom - interiorTop);

    const explicitRects = layoutConfig.panelRects
      .slice(0, desiredPanelCount)
      .map((panelRect, fallbackIndex): PanelRect | null => {
        const panelId = panelRect?.panelId || `panel-${fallbackIndex + 1}`;
        const index = getPanelOrderIndex(panelRect, fallbackIndex);
        const xRatio = clampRectRatio(panelRect?.x);
        const yRatio = clampRectRatio(panelRect?.y);
        const widthRatio = clampRectRatio(panelRect?.width);
        const heightRatio = clampRectRatio(panelRect?.height);

        const left = interiorLeft + (xRatio * interiorWidth);
        const top = interiorTop + (yRatio * interiorHeight);
        const right = clamp(interiorLeft + ((xRatio + widthRatio) * interiorWidth), interiorLeft, interiorRight);
        const bottom = clamp(interiorTop + ((yRatio + heightRatio) * interiorHeight), interiorTop, interiorBottom);
        const width = right - left;
        const height = bottom - top;

        if (width <= minRectSizePx || height <= minRectSizePx) return null;
        return {
          x: left,
          y: top,
          width,
          height,
          panelId,
          index,
        };
      })
      .filter((rect): rect is PanelRect => Boolean(rect))
      .sort((a, b) => a.index - b.index);

    if (explicitRects.length > 0) return explicitRects;
  }

  const columnSizes = parseTrackSizes(layoutConfig?.gridTemplateColumns, 1);
  const rowSizes = parseTrackSizes(layoutConfig?.gridTemplateRows, 1);
  const columns = Math.max(1, columnSizes.length);
  const rows = Math.max(1, rowSizes.length);

  const horizontalGaps = Math.max(0, columns - 1) * borderPixels;
  const verticalGaps = Math.max(0, rows - 1) * borderPixels;
  const totalPadding = borderPixels * 2;
  const availableWidth = containerWidth - totalPadding;
  const availableHeight = containerHeight - totalPadding;

  const totalColumnFr = columnSizes.reduce((sum, size) => sum + size, 0);
  const totalRowFr = rowSizes.reduce((sum, size) => sum + size, 0);
  const columnFrUnit = (availableWidth - horizontalGaps) / totalColumnFr;
  const rowFrUnit = (availableHeight - verticalGaps) / totalRowFr;

  const getRectForCell = (colStart: number, colEnd: number, rowStart: number, rowEnd: number): PanelRect => {
    let x = borderPixels;
    for (let c = 0; c < colStart; c += 1) {
      x += columnSizes[c] * columnFrUnit + borderPixels;
    }

    let y = borderPixels;
    for (let r = 0; r < rowStart; r += 1) {
      y += rowSizes[r] * rowFrUnit + borderPixels;
    }

    let width = 0;
    for (let c = colStart; c < colEnd; c += 1) {
      width += columnSizes[c] * columnFrUnit;
      if (c < colEnd - 1) width += borderPixels;
    }

    let height = 0;
    for (let r = rowStart; r < rowEnd; r += 1) {
      height += rowSizes[r] * rowFrUnit;
      if (r < rowEnd - 1) height += borderPixels;
    }

    return {
      x,
      y,
      width,
      height,
      panelId: 'panel-1',
      index: 0,
    };
  };

  const rects: PanelRect[] = [];

  if (Array.isArray(layoutConfig?.areas) && layoutConfig.areas.length > 0 && layoutConfig.gridTemplateAreas) {
    const gridAreas = parseGridTemplateAreas(layoutConfig.gridTemplateAreas);
    layoutConfig.areas.slice(0, desiredPanelCount).forEach((areaName, index) => {
      const areaInfo = gridAreas[areaName];
      if (!areaInfo) return;
      const rect = getRectForCell(
        areaInfo.colStart,
        areaInfo.colEnd + 1,
        areaInfo.rowStart,
        areaInfo.rowEnd + 1
      );
      rects.push({
        ...rect,
        panelId: `panel-${index + 1}`,
        index,
      });
    });
    return rects;
  }

  const sequentialCount = limitSequentialToGridCells
    ? Math.min(desiredPanelCount, columns * rows)
    : desiredPanelCount;

  for (let i = 0; i < sequentialCount; i += 1) {
    const col = i % columns;
    const row = Math.floor(i / columns);
    const rect = getRectForCell(col, col + 1, row, row + 1);
    rects.push({
      ...rect,
      panelId: `panel-${i + 1}`,
      index: i,
    });
  }

  return rects;
};
