/* eslint no-empty: ["error", { "allowEmptyCatch": true }] */
/*
  Lightweight renderer to create a thumbnail dataURL from a saved collage snapshot.
  Avoids coupling to the live editor canvas and ensures thumbnails match persisted state.
*/

import { layoutDefinitions } from '../config/layouts';
import { get as getFromLibrary } from '../../../utils/library/storage';
import { parseFormattedText } from '../../../utils/inlineFormatting';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const TOP_CAPTION_PANEL_ID = '__top-caption__';
const TOP_CAPTION_DEFAULTS = {
  fontSize: 42,
  fontWeight: 700,
  fontStyle: 'normal',
  fontFamily: 'Impact',
  color: '#111111',
  strokeWidth: 0,
  backgroundColor: '#ffffff',
};

// Determine if a persisted custom layout is compatible with the requested panel count
function isCustomLayoutCompatible(customLayout, panelCount) {
  try {
    if (!customLayout || typeof customLayout !== 'object') return false;
    // Prefer explicit areas length when present
    if (Array.isArray(customLayout.areas)) {
      return customLayout.areas.length >= Math.max(1, panelCount || 1);
    }
    // Fallback to items array length if provided
    if (Array.isArray(customLayout.items)) {
      return customLayout.items.length >= Math.max(1, panelCount || 1);
    }
    // If neither is present, be conservative and treat as incompatible
    return false;
  } catch (_) {
    return false;
  }
}

// Create layout config by id, optionally using a persisted custom layout
function createLayoutConfigById(templateId, panelCount, customLayout) {
  // Only apply a persisted custom layout if it can support the requested panel count
  if (customLayout && (customLayout.gridTemplateColumns || customLayout.gridTemplateRows)) {
    try {
      if (isCustomLayoutCompatible(customLayout, panelCount)) {
        return customLayout;
      }
    } catch (_) {}
  }
  try {
    const pc = Math.max(1, Math.min(panelCount || 1, 5));
    const categories = layoutDefinitions[pc];
    if (!categories) return null;
    let layout = null;
    Object.keys(categories).some((cat) => {
      const found = categories[cat].find((l) => l.id === templateId);
      if (found) { layout = found; return true; }
      return false;
    });
    if (layout && typeof layout.getLayoutConfig === 'function') {
      return layout.getLayoutConfig();
    }
  } catch (_) {}
  // Fallback simple grid
  // For 5 images, prefer a top-down stack to avoid leaving an empty cell in a wider grid
  if ((panelCount || 0) === 5) {
    return {
      gridTemplateColumns: '1fr',
      gridTemplateRows: 'repeat(5, 1fr)',
      gridTemplateAreas: null,
      items: Array(5).fill({ gridArea: null }),
    };
  }

  const cols = Math.ceil(Math.sqrt(panelCount || 1));
  const rows = Math.ceil((panelCount || 1) / cols);
  return {
    gridTemplateColumns: `repeat(${cols}, 1fr)`,
    gridTemplateRows: `repeat(${rows}, 1fr)`,
    gridTemplateAreas: null,
    items: Array(panelCount || 1).fill({ gridArea: null }),
  };
}

// Parse grid-template-areas string into named area bounds (mirrors preview logic)
function parseGridTemplateAreas(gridTemplateAreas) {
  if (!gridTemplateAreas) return {};
  const areas = {};
  const rows = gridTemplateAreas
    .replace(/"/g, '\'')
    .split("'")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((row) => row.split(/\s+/));
  rows.forEach((row, rowIndex) => {
    row.forEach((areaName, colIndex) => {
      if (areaName !== '.' && areaName !== '') {
        if (!areas[areaName]) {
          areas[areaName] = { rowStart: rowIndex, rowEnd: rowIndex, colStart: colIndex, colEnd: colIndex };
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
}

// Convert layoutConfig to panel rectangles, honoring borders and template areas (mirrors preview logic)
function parseGridToRects(layoutConfig, componentWidth, componentHeight, panelCount, borderPixels) {
  // Determine columns/rows and their fractional sizes
  let columns = 1;
  let rows = 1;
  let columnSizes = [1];
  let rowSizes = [1];

  if (layoutConfig.gridTemplateColumns) {
    if (layoutConfig.gridTemplateColumns.includes('repeat(')) {
      const m = layoutConfig.gridTemplateColumns.match(/repeat\((\d+),/);
      if (m) {
        columns = parseInt(m[1], 10);
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
      const m = layoutConfig.gridTemplateRows.match(/repeat\((\d+),/);
      if (m) {
        rows = parseInt(m[1], 10);
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

  // Account for borders as gaps between cells and outer padding
  const horizontalGaps = Math.max(0, columnSizes.length - 1) * borderPixels;
  const verticalGaps = Math.max(0, rowSizes.length - 1) * borderPixels;
  const availableWidth = componentWidth - borderPixels * 2 - horizontalGaps;
  const availableHeight = componentHeight - borderPixels * 2 - verticalGaps;
  const totalColumnFr = columnSizes.reduce((sum, size) => sum + size, 0);
  const totalRowFr = rowSizes.reduce((sum, size) => sum + size, 0);
  const columnFrUnit = availableWidth / totalColumnFr;
  const rowFrUnit = availableHeight / totalRowFr;

  const rects = [];

  // Helper to compute rect at grid cell
  const getRectForCell = (colStart, colEnd, rowStart, rowEnd) => {
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
    return { x, y, width, height };
  };

  // Prefer named grid areas if provided
  if (layoutConfig.areas && layoutConfig.areas.length > 0 && layoutConfig.gridTemplateAreas) {
    const gridAreas = parseGridTemplateAreas(layoutConfig.gridTemplateAreas);
    layoutConfig.areas.slice(0, panelCount).forEach((areaName, index) => {
      const areaInfo = gridAreas[areaName];
      if (areaInfo) {
        const { x, y, width, height } = getRectForCell(
          areaInfo.colStart,
          areaInfo.colEnd + 1,
          areaInfo.rowStart,
          areaInfo.rowEnd + 1
        );
        rects.push({ x, y, width, height, panelId: `panel-${index + 1}`, index });
      }
    });
  } else {
    // Fallback: sequential mapping across rows/cols
    for (let i = 0; i < Math.min(panelCount, columns * rows); i += 1) {
      const col = i % columns;
      const row = Math.floor(i / columns);
      const { x, y, width, height } = getRectForCell(col, col + 1, row, row + 1);
      rects.push({ x, y, width, height, panelId: `panel-${i + 1}`, index: i });
    }
  }

  return rects;
}

function normalizeBorderThickness(value) {
  // Accept numeric percent values directly
  if (typeof value === 'number' && Number.isFinite(value)) return value;

  // Accept numeric-like strings such as '0.5' or '12'
  if (typeof value === 'string') {
    const key = value.trim().toLowerCase();
    const numeric = Number(key);
    if (!Number.isNaN(numeric) && Number.isFinite(numeric)) {
      return numeric;
    }
    const map = {
      none: 0,
      thin: 0.5,
      medium: 1.5,
      thicc: 4,
      thiccer: 7,
      'xtra thicc': 12,
      "ungodly chonk'd": 20,
    };
    return map[key] ?? 1.5;
  }

  // Fallback default
  return 1.5;
}

async function loadImageFromRef(ref) {
  // ref may be { libraryKey } or { url }
  const srcUrl = ref?.url || null;
  if (ref?.libraryKey) {
    try {
      const blob = await getFromLibrary(ref.libraryKey);
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      return await loadImage(dataUrl);
    } catch (_) {
      // fallback to url if available
      if (srcUrl) return loadImage(srcUrl);
      // Do not rethrow, return null so Promise.all doesn't reject
      return null;
    }
  }
  if (srcUrl) return loadImage(srcUrl);
  return null;
}

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export async function renderThumbnailFromSnapshot(snap, { maxDim = 256 } = {}) {
  if (!snap) return null;
  const selectedAspectRatio = snap.selectedAspectRatio || 'square';
  const arMap = { square: 1, portrait: 0.8, 'ratio-2-3': 2/3, story: 0.5625, classic: 1.33, 'ratio-3-2': 1.5, landscape: 1.78 };
  const customAspectRatio = Number(snap.customAspectRatio);
  const ar = selectedAspectRatio === 'custom' && Number.isFinite(customAspectRatio) && customAspectRatio > 0
    ? Math.max(0.1, Math.min(10, customAspectRatio))
    : (arMap[selectedAspectRatio] || 1);
  const panelCount = Math.max(1, Math.min(snap.panelCount || 1, 5));
  const borderPct = normalizeBorderThickness(snap.borderThickness);
  const borderColor = snap.borderColor || '#000000';
  const images = Array.isArray(snap.images) ? snap.images : [];

  const width = maxDim;
  const baseImageHeight = Math.max(1, Math.round(width / ar));
  const dpr = 1;
  const BASE_CANVAS_WIDTH = 400; // Keep text scale in sync with preview
  const textScaleFactor = width / BASE_CANVAS_WIDTH;
  const borderPixels = Math.round((borderPct / 100) * width);
  const wrapSimpleText = (drawCtx, text, maxWidth) => {
    const lines = [];
    const manual = String(text || '').split('\n');
    manual.forEach((line) => {
      if (drawCtx.measureText(line).width <= maxWidth) {
        lines.push(line);
      } else {
        const words = line.split(' ');
        let currentLine = '';
        words.forEach((word) => {
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          const testWidth = drawCtx.measureText(testLine).width;
          if (testWidth <= maxWidth) {
            currentLine = testLine;
          } else if (currentLine) {
            lines.push(currentLine);
            currentLine = word;
          } else {
            let charLine = '';
            for (let i = 0; i < word.length; i += 1) {
              const testChar = charLine + word[i];
              if (drawCtx.measureText(testChar).width <= maxWidth) {
                charLine = testChar;
              } else {
                if (charLine) lines.push(charLine);
                charLine = word[i];
              }
            }
            if (charLine) lines.push(charLine);
          }
        });
        if (currentLine) lines.push(currentLine);
      }
    });
    return lines;
  };
  const topCaptionConfig = snap?.panelTexts?.[TOP_CAPTION_PANEL_ID];
  const topCaptionRaw = topCaptionConfig?.rawContent ?? topCaptionConfig?.content ?? '';
  const { cleanText: topCaptionText } = parseFormattedText(String(topCaptionRaw));
  const hasTopCaptionText = Boolean(topCaptionText && topCaptionText.trim());
  const shouldExpandForSingleCustom = (
    selectedAspectRatio === 'custom' &&
    panelCount === 1 &&
    images.length === 1
  );
  let topCaptionHeight = 0;
  if (hasTopCaptionText) {
    const measureCanvas = document.createElement('canvas');
    const measureCtx = measureCanvas.getContext('2d');
    const baseFontSize = Number(topCaptionConfig?.fontSize) > 0
      ? Number(topCaptionConfig.fontSize)
      : TOP_CAPTION_DEFAULTS.fontSize;
    const fontSize = baseFontSize * textScaleFactor;
    const fontWeight = topCaptionConfig?.fontWeight || TOP_CAPTION_DEFAULTS.fontWeight;
    const fontStyle = topCaptionConfig?.fontStyle || TOP_CAPTION_DEFAULTS.fontStyle;
    const fontFamily = topCaptionConfig?.fontFamily || TOP_CAPTION_DEFAULTS.fontFamily;
    measureCtx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
    const horizontalPadding = Math.max(18, Math.round(width * 0.045));
    const verticalPadding = Math.max(12, Math.round(fontSize * 0.42));
    const maxTextWidth = Math.max(48, width - (horizontalPadding * 2) - (borderPixels * 2));
    const wrappedLines = wrapSimpleText(measureCtx, topCaptionText, maxTextWidth);
    const lineHeight = fontSize * 1.2;
    const textHeight = Math.max(lineHeight, wrappedLines.length * lineHeight);
    const requestedCaptionHeight = textHeight + (verticalPadding * 2) + Math.max(borderPixels, 0);
    const minImageAreaHeight = Math.max(120, baseImageHeight * 0.35);
    const maxCaptionHeightForFixedCanvas = Math.max(56, baseImageHeight - minImageAreaHeight);
    topCaptionHeight = shouldExpandForSingleCustom
      ? Math.max(56, requestedCaptionHeight)
      : Math.max(56, Math.min(requestedCaptionHeight, maxCaptionHeightForFixedCanvas));
  }
  const imageAreaHeight = hasTopCaptionText
    ? (shouldExpandForSingleCustom ? baseImageHeight : Math.max(1, baseImageHeight - topCaptionHeight))
    : baseImageHeight;
  const totalHeight = hasTopCaptionText
    ? (shouldExpandForSingleCustom ? baseImageHeight + topCaptionHeight : baseImageHeight)
    : baseImageHeight;
  
  // If the snapshot includes the source preview canvas size, compute scale factors
  // so pixel-based transforms (positionX/positionY) scale proportionally
  const sourceCanvasWidth = typeof snap.canvasWidth === 'number' ? snap.canvasWidth : null;
  const sourceCanvasHeight = typeof snap.canvasHeight === 'number' ? snap.canvasHeight : null;
  const scaleX = sourceCanvasWidth && sourceCanvasWidth > 0 ? (width / sourceCanvasWidth) : 1;
  const scaleY = sourceCanvasHeight && sourceCanvasHeight > 0 ? (totalHeight / sourceCanvasHeight) : 1;

  const canvas = document.createElement('canvas');
  canvas.width = width * dpr;
  canvas.height = totalHeight * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, width, totalHeight);
  if (borderPixels > 0) {
    ctx.fillStyle = borderColor;
    ctx.fillRect(0, 0, width, totalHeight);
  }

  const layoutConfig = createLayoutConfigById(snap.selectedTemplateId, panelCount, snap.customLayout);
  const rects = parseGridToRects(layoutConfig, width, imageAreaHeight, panelCount, borderPixels).map((rect) => ({
    ...rect,
    y: rect.y + topCaptionHeight,
  }));

  // Load images referenced in snapshot
  const loaded = await Promise.all(images.map(loadImageFromRef));

  // Ensure custom fonts are loaded before rendering text so canvas uses intended fonts
  try {
    if (typeof document !== 'undefined' && document.fonts) {
      const families = new Set();
      if (snap.panelTexts && typeof snap.panelTexts === 'object') {
        Object.values(snap.panelTexts).forEach((pt) => {
          if (pt && pt.fontFamily) families.add(pt.fontFamily);
        });
      }
      // Proactively request loads for each family (common weight/size)
      const loaders = Array.from(families).map((family) => {
        const fam = String(family);
        const css = `700 24px ${fam.includes(' ') ? JSON.stringify(fam) : fam}`;
        try { return document.fonts.load(css); } catch (_) { return Promise.resolve(); }
      });
      if (loaders.length) {
        try { await Promise.all(loaders); } catch (_) {}
      }
      // Await overall readiness as a fallback
      if (document.fonts.ready) {
        try { await document.fonts.ready; } catch (_) {}
      }
    }
  } catch (_) { /* best-effort only */ }

  // Helper: text wrapping similar to preview/export
  const wrapText = (drawCtx, text, maxWidth) => {
    const lines = [];
    const manual = String(text || '').split('\n');
    manual.forEach((line) => {
      if (drawCtx.measureText(line).width <= maxWidth) {
        lines.push(line);
      } else {
        const words = line.split(' ');
        let currentLine = '';
        words.forEach((word) => {
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          const testWidth = drawCtx.measureText(testLine).width;
          if (testWidth <= maxWidth) {
            currentLine = testLine;
          } else if (currentLine) {
            lines.push(currentLine);
            currentLine = word;
            if (drawCtx.measureText(word).width > maxWidth) {
              // Break long word by chars
              let charLine = '';
              for (let i = 0; i < word.length; i += 1) {
                const testChar = charLine + word[i];
                if (drawCtx.measureText(testChar).width <= maxWidth) {
                  charLine = testChar;
                } else {
                  if (charLine) lines.push(charLine);
                  charLine = word[i];
                }
              }
              if (charLine) lines.push(charLine);
              currentLine = '';
            }
          } else {
            // Single long word
            let charLine = '';
            for (let i = 0; i < word.length; i += 1) {
              const testChar = charLine + word[i];
              if (drawCtx.measureText(testChar).width <= maxWidth) {
                charLine = testChar;
              } else {
                if (charLine) lines.push(charLine);
                charLine = word[i];
              }
            }
            if (charLine) lines.push(charLine);
          }
        });
        if (currentLine) lines.push(currentLine);
      }
    });
    return lines;
  };

  if (hasTopCaptionText && topCaptionHeight > 0) {
    const captionRect = {
      x: borderPixels,
      y: Math.max(0, borderPixels),
      width: Math.max(1, width - (borderPixels * 2)),
      height: Math.max(1, topCaptionHeight - borderPixels),
    };
    const baseFontSize = Number(topCaptionConfig?.fontSize) > 0
      ? Number(topCaptionConfig.fontSize)
      : TOP_CAPTION_DEFAULTS.fontSize;
    const fontSize = baseFontSize * textScaleFactor;
    const fontWeight = topCaptionConfig?.fontWeight || TOP_CAPTION_DEFAULTS.fontWeight;
    const fontStyle = topCaptionConfig?.fontStyle || TOP_CAPTION_DEFAULTS.fontStyle;
    const fontFamily = topCaptionConfig?.fontFamily || TOP_CAPTION_DEFAULTS.fontFamily;
    const textColor = topCaptionConfig?.color || TOP_CAPTION_DEFAULTS.color;
    const strokeWidth = topCaptionConfig?.strokeWidth ?? TOP_CAPTION_DEFAULTS.strokeWidth;
    const backgroundColor = topCaptionConfig?.backgroundColor || TOP_CAPTION_DEFAULTS.backgroundColor;

    ctx.save();
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(captionRect.x, captionRect.y, captionRect.width, captionRect.height);
    ctx.beginPath();
    ctx.rect(captionRect.x, captionRect.y, captionRect.width, captionRect.height);
    ctx.clip();

    const textPadding = Math.max(16, captionRect.width * 0.04);
    const maxTextWidth = Math.max(24, captionRect.width - textPadding * 2);
    ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
    const lines = wrapSimpleText(ctx, topCaptionText, maxTextWidth);
    const lineHeight = fontSize * 1.2;
    const totalTextHeight = lines.length * lineHeight;
    const startY = captionRect.y + ((captionRect.height - totalTextHeight) / 2) + (lineHeight / 2);

    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (strokeWidth > 0) {
      ctx.strokeStyle = 'rgba(0,0,0,0.72)';
      ctx.lineWidth = strokeWidth;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
    }
    lines.forEach((line, idx) => {
      const y = startY + idx * lineHeight;
      if (strokeWidth > 0) ctx.strokeText(line, captionRect.x + captionRect.width / 2, y);
      ctx.fillText(line, captionRect.x + captionRect.width / 2, y);
    });
    ctx.restore();
  }

  // Draw panels: images and captions (to mirror final export)
  rects.forEach(({ x, y, width: w, height: h, panelId }) => {
    const imageIndex = snap.panelImageMapping?.[panelId];
    const hasImage = typeof imageIndex === 'number' && loaded[imageIndex];
    const panelText = (snap.panelTexts && snap.panelTexts[panelId]) || {};
    ctx.fillStyle = hasImage ? 'rgba(0,0,0,0.03)' : 'rgba(0,0,0,0.3)';
    ctx.fillRect(x, y, w, h);

    if (hasImage) {
      const img = loaded[imageIndex];
      if (img) {
        const transform = snap.panelTransforms?.[panelId] || { scale: 1, positionX: 0, positionY: 0 };
        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, w, h);
        ctx.clip();
        const imageAspect = img.naturalWidth / img.naturalHeight;
        const panelAspect = w / h;
        const initialScale = imageAspect > panelAspect ? (h / img.naturalHeight) : (w / img.naturalWidth);
        const finalScale = initialScale * (transform.scale || 1);
        const scaledW = img.naturalWidth * finalScale;
        const scaledH = img.naturalHeight * finalScale;
        const centerOffsetX = (w - scaledW) / 2;
        const centerOffsetY = (h - scaledH) / 2;
        // Scale pixel offsets by the ratio between target canvas size and source preview size (if known)
        const finalOffsetX = centerOffsetX + ((transform.positionX || 0) * scaleX);
        const finalOffsetY = centerOffsetY + ((transform.positionY || 0) * scaleY);
        ctx.drawImage(img, x + finalOffsetX, y + finalOffsetY, scaledW, scaledH);
        ctx.restore();
      }
    }

    const rawCaption = panelText.rawContent ?? panelText.content ?? '';
    const { cleanText } = parseFormattedText(String(rawCaption));

    // Draw actual text (if present), matching export logic
    if (hasImage && cleanText && cleanText.trim()) {
      ctx.save();
      // Clip to frame bounds
      ctx.beginPath();
      ctx.rect(x, y, w, h);
      ctx.clip();

      // Determine base font size: explicit or auto-fit similar to preview
      let baseFontSize = panelText.fontSize || 26;
      if (!panelText.fontSize) {
        // Auto-calc: try decreasing sizes until it fits 40% of panel height
        const textPadding = 10;
        const maxTextWidth = w - textPadding * 2;
        const maxTextHeight = h * 0.4;
        const reasonableMax = Math.min(48, Math.max(16, h * 0.15));
        const probe = document.createElement('canvas').getContext('2d');
        for (let size = reasonableMax; size >= 8; size -= 2) {
          probe.font = `700 ${size}px Arial`;
          const words = String(cleanText).split(' ');
          const lines = [];
          let currentLine = '';
          words.forEach((word) => {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            if (probe.measureText(testLine).width <= maxTextWidth) {
              currentLine = testLine;
            } else {
              if (currentLine) lines.push(currentLine);
              currentLine = word;
            }
          });
          if (currentLine) lines.push(currentLine);
          const lineHeight = size * 1.2;
          const total = lines.length * lineHeight;
          if (total <= maxTextHeight) { baseFontSize = Math.max(size, 12); break; }
        }
      }

      const fontSize = baseFontSize * textScaleFactor;
      const fontWeight = panelText.fontWeight || 400;
      const fontStyle = panelText.fontStyle || 'normal';
      const fontFamily = panelText.fontFamily || 'Arial';
      const textColor = panelText.color || '#ffffff';
      const strokeWidth = panelText.strokeWidth || 2;
      const textPositionX = panelText.textPositionX !== undefined ? panelText.textPositionX : 0;
      const textPositionY = panelText.textPositionY !== undefined ? panelText.textPositionY : 0;
      const textRotation = panelText.textRotation !== undefined ? panelText.textRotation : 0;

      ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
      ctx.fillStyle = textColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = strokeWidth;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;
      ctx.shadowBlur = 3;

      const textPadding = 10;
      const maxTextWidth = w - textPadding * 2;
      const textX = x + (w / 2) + (textPositionX / 100) * (w / 2 - textPadding);
      const lineHeight = fontSize * 1.2;
      const lines = wrapText(ctx, String(cleanText), maxTextWidth);
      const totalTextHeight = lines.length * lineHeight;

      let textAnchorY;
      if (textPositionY <= 0) {
        const defaultBottom = y + (h * 0.95);
        const extendedBottom = y + h + (h * 0.1);
        const t = Math.abs(textPositionY) / 100;
        textAnchorY = defaultBottom + t * (extendedBottom - defaultBottom);
      } else {
        const defaultBottom = y + (h * 0.95);
        const frameTop = y;
        const t = textPositionY / 100;
        textAnchorY = defaultBottom + t * (frameTop - defaultBottom);
      }

      const startY = textAnchorY - totalTextHeight + (lineHeight / 2);

      if (textRotation !== 0) {
        ctx.save();
        const textCenterX = textX;
        const textCenterY = textAnchorY - totalTextHeight / 2;
        ctx.translate(textCenterX, textCenterY);
        ctx.rotate((textRotation * Math.PI) / 180);
        ctx.translate(-textCenterX, -textCenterY);
      }

      lines.forEach((line, idx) => {
        const lineY = startY + idx * lineHeight;
        if (strokeWidth > 0) ctx.strokeText(line, textX, lineY);
        ctx.fillText(line, textX, lineY);
      });

      if (textRotation !== 0) {
        ctx.restore();
      }

      ctx.restore();
    }
  });

  // Draw global sticker overlays (top-most, across the full collage canvas)
  const stickerRefs = Array.isArray(snap.stickers) ? snap.stickers : [];
  if (stickerRefs.length > 0) {
    const loadedStickers = await Promise.all(stickerRefs.map(loadImageFromRef));
    stickerRefs.forEach((stickerRef, index) => {
      const img = loadedStickers[index];
      if (!img) return;

      const ratioRaw = Number(stickerRef?.aspectRatio);
      const angleRaw = Number(stickerRef?.angleDeg);
      const imageRatio = img.naturalWidth && img.naturalHeight
        ? (img.naturalWidth / img.naturalHeight)
        : 1;
      const aspectRatio = Number.isFinite(ratioRaw) && ratioRaw > 0 ? ratioRaw : imageRatio || 1;
      const angleDeg = Number.isFinite(angleRaw) ? angleRaw : 0;
      const widthRaw = Number(stickerRef?.widthPercent);
      const xRaw = Number(stickerRef?.xPercent);
      const yRaw = Number(stickerRef?.yPercent);
      const widthPercent = Number.isFinite(widthRaw) ? widthRaw : 28;
      const widthPx = clamp((widthPercent / 100) * width, 12, width * 0.98);
      const heightPx = clamp(widthPx / aspectRatio, 12, totalHeight * 0.98);
      const minVisibleX = Math.min(32, widthPx);
      const minVisibleY = Math.min(32, heightPx);
      const minX = -widthPx + minVisibleX;
      const maxX = width - minVisibleX;
      const minY = -heightPx + minVisibleY;
      const maxY = totalHeight - minVisibleY;
      const xPx = clamp((Number.isFinite(xRaw) ? xRaw : 36) / 100 * width, minX, maxX);
      const yPx = clamp((Number.isFinite(yRaw) ? yRaw : 12) / 100 * totalHeight, minY, maxY);

      try {
        if (Math.abs(angleDeg) > 0.01) {
          const centerX = xPx + (widthPx / 2);
          const centerY = yPx + (heightPx / 2);
          ctx.save();
          ctx.translate(centerX, centerY);
          ctx.rotate((angleDeg * Math.PI) / 180);
          ctx.drawImage(img, -(widthPx / 2), -(heightPx / 2), widthPx, heightPx);
          ctx.restore();
        } else {
          ctx.drawImage(img, xPx, yPx, widthPx, heightPx);
        }
      } catch (_) {
        // Ignore sticker draw failures so thumbnail generation still succeeds.
      }
    });
  }

  return canvas.toDataURL('image/jpeg', 0.92);
}
