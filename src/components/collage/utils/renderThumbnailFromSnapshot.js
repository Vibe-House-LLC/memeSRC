/* eslint no-empty: ["error", { "allowEmptyCatch": true }] */
/*
  Lightweight renderer to create a thumbnail dataURL from a saved collage snapshot.
  Avoids coupling to the live editor canvas and ensures thumbnails match persisted state.
*/

import { layoutDefinitions } from '../config/layouts';
import { get as getFromLibrary } from '../../../utils/library/storage';

// Create layout config by id, optionally using a persisted custom layout
function createLayoutConfigById(templateId, panelCount, customLayout) {
  if (customLayout && (customLayout.gridTemplateColumns || customLayout.gridTemplateRows)) {
    try {
      return customLayout;
    } catch (_) {}
  }
  try {
    const pc = Math.max(2, Math.min(panelCount || 2, 5));
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
  const cols = Math.ceil(Math.sqrt(panelCount || 2));
  const rows = Math.ceil((panelCount || 2) / cols);
  return {
    gridTemplateColumns: `repeat(${cols}, 1fr)`,
    gridTemplateRows: `repeat(${rows}, 1fr)`,
    gridTemplateAreas: null,
    items: Array(panelCount || 2).fill({ gridArea: null }),
  };
}

// Parse CSS grid templates to numeric fractions
function parseFrs(templateStr = '') {
  if (!templateStr) return [1];
  if (templateStr.includes('repeat(')) {
    const m = templateStr.match(/repeat\((\d+),/);
    if (m) return Array(parseInt(m[1], 10)).fill(1);
  }
  const frs = templateStr.match(/(\d*\.?\d*)fr/g);
  if (frs) return frs.map((s) => { const v = s.replace('fr',''); return v === '' ? 1 : parseFloat(v); });
  return [1];
}

function parseGridToRects(layoutConfig, width, height, panelCount, borderPixels) {
  const colFrs = parseFrs(layoutConfig.gridTemplateColumns);
  const rowFrs = parseFrs(layoutConfig.gridTemplateRows);
  const totalCol = colFrs.reduce((a,b)=>a+b,0);
  const totalRow = rowFrs.reduce((a,b)=>a+b,0);
  const hGaps = Math.max(0, colFrs.length - 1) * borderPixels;
  const vGaps = Math.max(0, rowFrs.length - 1) * borderPixels;
  const availW = width - (borderPixels * 2) - hGaps;
  const availH = height - (borderPixels * 2) - vGaps;
  const colUnit = availW / totalCol;
  const rowUnit = availH / totalRow;

  const rects = [];
  if (layoutConfig.areas && Array.isArray(layoutConfig.areas)) {
    // Not used by our current dynamic layouts; fallback to sequential mapping
  }

  // Build a grid map of positions
  let y = borderPixels;
  for (let r = 0; r < rowFrs.length; r += 1) {
    const rowH = rowFrs[r] * rowUnit;
    let x = borderPixels;
    for (let c = 0; c < colFrs.length; c += 1) {
      const colW = colFrs[c] * colUnit;
      const index = r * colFrs.length + c;
      if (index < panelCount) {
        rects.push({ x, y, width: colW, height: rowH, panelId: `panel-${index+1}`, index });
      }
      x += colW + borderPixels;
    }
    y += rowH + borderPixels;
  }
  return rects;
}

function normalizeBorderThickness(value) {
  if (typeof value === 'number') return value;
  const map = {
    none: 0,
    thin: 0.5,
    medium: 1.5,
    thicc: 4,
    thiccer: 7,
    'xtra thicc': 12,
    "ungodly chonk'd": 20,
  };
  const key = String(value || 'medium').toLowerCase();
  return map[key] ?? 1.5;
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
      throw _;
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
  const aspectRatio = snap.selectedAspectRatio || 'square';
  const arMap = { square: 1, portrait: 0.8, 'ratio-2-3': 2/3, story: 0.5625, classic: 1.33, 'ratio-3-2': 1.5, landscape: 1.78 };
  const ar = arMap[aspectRatio] || 1;
  const panelCount = Math.max(2, Math.min(snap.panelCount || 2, 5));
  const borderPct = normalizeBorderThickness(snap.borderThickness);
  const borderColor = snap.borderColor || '#000000';

  const width = maxDim;
  const height = Math.max(1, Math.round(width / ar));
  const dpr = 1;
  const borderPixels = Math.round((borderPct / 100) * width);

  const canvas = document.createElement('canvas');
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, width, height);
  if (borderPixels > 0) {
    ctx.fillStyle = borderColor;
    ctx.fillRect(0, 0, width, height);
  }

  const layoutConfig = createLayoutConfigById(snap.selectedTemplateId, panelCount, snap.customLayout);
  const rects = parseGridToRects(layoutConfig, width, height, panelCount, borderPixels);

  // Load images referenced in snapshot
  const images = Array.isArray(snap.images) ? snap.images : [];
  const loaded = await Promise.all(images.map(loadImageFromRef));

  // Draw panels (images only; captions omitted for thumbnail compactness)
  rects.forEach(({ x, y, width: w, height: h, panelId }) => {
    const imageIndex = snap.panelImageMapping?.[panelId];
    const hasImage = typeof imageIndex === 'number' && loaded[imageIndex];
    ctx.fillStyle = hasImage ? 'rgba(0,0,0,0.03)' : 'rgba(0,0,0,0.3)';
    ctx.fillRect(x, y, w, h);
    if (!hasImage) return;
    const img = loaded[imageIndex];
    const transform = snap.panelTransforms?.[panelId] || { scale: 1, positionX: 0, positionY: 0 };

    // cover fit + user transform
    const imageAspect = img.naturalWidth / img.naturalHeight;
    const panelAspect = w / h;
    const initialScale = imageAspect > panelAspect ? (h / img.naturalHeight) : (w / img.naturalWidth);
    const finalScale = initialScale * (transform.scale || 1);
    const scaledW = img.naturalWidth * finalScale;
    const scaledH = img.naturalHeight * finalScale;
    const centerOffsetX = (w - scaledW) / 2;
    const centerOffsetY = (h - scaledH) / 2;
    const finalOffsetX = centerOffsetX + (transform.positionX || 0);
    const finalOffsetY = centerOffsetY + (transform.positionY || 0);

    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.drawImage(img, x + finalOffsetX, y + finalOffsetY, scaledW, scaledH);
    ctx.restore();
  });

  return canvas.toDataURL('image/jpeg', 0.8);
}
