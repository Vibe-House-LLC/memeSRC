export type BrushMode = 'erase' | 'restore';

export type BrushStroke = {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  radius: number;
  opacity: number;
  mode: BrushMode;
};

export type ViewTransform = {
  scale: number;
  offsetX: number;
  offsetY: number;
  rotation: number;
};

export type LoadedStickerSource = {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  aspectRatio: number;
  originalWidth: number;
  originalHeight: number;
};

export type ExportedStickerEdit = {
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
  changed: boolean;
};

export type PixelBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type CheckerboardMode = 'light' | 'dark';

export const STICKER_EDITOR_MAX_DIMENSION_PX = 1500;
const CROPPED_STICKER_PADDING_PX = 2;

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

const createCanvas = (width: number, height: number): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  return canvas;
};

const getCanvasContext = (canvas: HTMLCanvasElement): CanvasRenderingContext2D => {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas context unavailable');
  return ctx;
};

const canvasToBlob = async (canvas: HTMLCanvasElement, type = 'image/png'): Promise<Blob> => {
  const blob = await new Promise<Blob | null>((resolve) => {
    if (typeof canvas.toBlob === 'function') {
      canvas.toBlob((nextBlob) => resolve(nextBlob), type);
      return;
    }
    resolve(null);
  });
  if (blob) return blob;
  const response = await fetch(canvas.toDataURL(type));
  return await response.blob();
};

const loadImageElement = async (src: string): Promise<HTMLImageElement> => (
  await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Unable to load sticker image'));
    try {
      image.crossOrigin = 'anonymous';
    } catch (_) {
      // Ignore cross-origin assignment failures for data URLs.
    }
    image.src = src;
  })
);

export const createOpaqueMaskData = (width: number, height: number): Uint8ClampedArray => {
  const data = new Uint8ClampedArray(Math.max(1, width * height * 4));
  for (let index = 0; index < data.length; index += 4) {
    data[index] = 255;
    data[index + 1] = 255;
    data[index + 2] = 255;
    data[index + 3] = 255;
  }
  return data;
};

export const createOpaqueMaskCanvas = (width: number, height: number): HTMLCanvasElement => {
  const canvas = createCanvas(width, height);
  const ctx = getCanvasContext(canvas);
  const imageData = ctx.createImageData(canvas.width, canvas.height);
  imageData.data.set(createOpaqueMaskData(canvas.width, canvas.height));
  ctx.putImageData(imageData, 0, 0);
  return canvas;
};

export const createTransparentCanvas = (width: number, height: number): HTMLCanvasElement => createCanvas(width, height);

export const cloneCanvas = (sourceCanvas: HTMLCanvasElement): HTMLCanvasElement => {
  const canvas = createCanvas(sourceCanvas.width, sourceCanvas.height);
  const ctx = getCanvasContext(canvas);
  ctx.drawImage(sourceCanvas, 0, 0);
  return canvas;
};

export const clearCanvas = (canvas: HTMLCanvasElement): void => {
  const ctx = getCanvasContext(canvas);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
};

export const resetMaskCanvas = (maskCanvas: HTMLCanvasElement): void => {
  const ctx = getCanvasContext(maskCanvas);
  const imageData = ctx.createImageData(maskCanvas.width, maskCanvas.height);
  imageData.data.set(createOpaqueMaskData(maskCanvas.width, maskCanvas.height));
  ctx.putImageData(imageData, 0, 0);
};

const distanceToSegment = (
  pointX: number,
  pointY: number,
  startX: number,
  startY: number,
  endX: number,
  endY: number
): number => {
  const dx = endX - startX;
  const dy = endY - startY;
  if (dx === 0 && dy === 0) {
    const singleDx = pointX - startX;
    const singleDy = pointY - startY;
    return Math.sqrt((singleDx * singleDx) + (singleDy * singleDy));
  }

  const lengthSq = (dx * dx) + (dy * dy);
  const t = clamp((((pointX - startX) * dx) + ((pointY - startY) * dy)) / lengthSq, 0, 1);
  const projX = startX + (t * dx);
  const projY = startY + (t * dy);
  const distX = pointX - projX;
  const distY = pointY - projY;
  return Math.sqrt((distX * distX) + (distY * distY));
};

export const applyBrushStrokeToMaskData = (
  data: Uint8ClampedArray,
  width: number,
  height: number,
  stroke: BrushStroke
): number => {
  const radius = Math.max(0.5, Number(stroke.radius || 0));
  const opacity = clamp(Number(stroke.opacity || 0), 0, 1);
  const amount = Math.max(1, Math.round(255 * opacity));
  const minX = Math.max(0, Math.floor(Math.min(stroke.fromX, stroke.toX) - radius));
  const maxX = Math.min(width - 1, Math.ceil(Math.max(stroke.fromX, stroke.toX) + radius));
  const minY = Math.max(0, Math.floor(Math.min(stroke.fromY, stroke.toY) - radius));
  const maxY = Math.min(height - 1, Math.ceil(Math.max(stroke.fromY, stroke.toY) + radius));

  if (minX > maxX || minY > maxY) return 0;

  let changedPixels = 0;
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const distance = distanceToSegment(x + 0.5, y + 0.5, stroke.fromX, stroke.fromY, stroke.toX, stroke.toY);
      if (distance > radius) continue;

      const alphaIndex = ((y * width) + x) * 4 + 3;
      const previous = data[alphaIndex];
      const next = stroke.mode === 'erase'
        ? Math.max(0, previous - amount)
        : Math.min(255, previous + amount);
      if (next === previous) continue;

      data[alphaIndex - 3] = 255;
      data[alphaIndex - 2] = 255;
      data[alphaIndex - 1] = 255;
      data[alphaIndex] = next;
      changedPixels += 1;
    }
  }

  return changedPixels;
};

const getStrokeBounds = (
  stroke: BrushStroke,
  width: number,
  height: number
): { x: number; y: number; width: number; height: number } | null => {
  const radius = Math.max(0.5, Number(stroke.radius || 0));
  const minX = clamp(Math.floor(Math.min(stroke.fromX, stroke.toX) - radius), 0, width);
  const maxX = clamp(Math.ceil(Math.max(stroke.fromX, stroke.toX) + radius), 0, width);
  const minY = clamp(Math.floor(Math.min(stroke.fromY, stroke.toY) - radius), 0, height);
  const maxY = clamp(Math.ceil(Math.max(stroke.fromY, stroke.toY) + radius), 0, height);
  const nextWidth = maxX - minX;
  const nextHeight = maxY - minY;
  if (nextWidth <= 0 || nextHeight <= 0) return null;
  return { x: minX, y: minY, width: nextWidth, height: nextHeight };
};

export const applyBrushStrokeToMaskCanvas = (
  maskCanvas: HTMLCanvasElement,
  stroke: BrushStroke
): number => {
  const bounds = getStrokeBounds(stroke, maskCanvas.width, maskCanvas.height);
  if (!bounds) return 0;

  const ctx = getCanvasContext(maskCanvas);
  const imageData = ctx.getImageData(bounds.x, bounds.y, bounds.width, bounds.height);
  const changedPixels = applyBrushStrokeToMaskData(imageData.data, bounds.width, bounds.height, {
    ...stroke,
    fromX: stroke.fromX - bounds.x,
    toX: stroke.toX - bounds.x,
    fromY: stroke.fromY - bounds.y,
    toY: stroke.toY - bounds.y,
  });

  if (changedPixels > 0) {
    ctx.putImageData(imageData, bounds.x, bounds.y);
  }

  return changedPixels;
};

export const stampBrushStrokeOnCanvas = (
  overlayCanvas: HTMLCanvasElement,
  stroke: BrushStroke
): void => {
  const ctx = getCanvasContext(overlayCanvas);
  const radius = Math.max(0.5, Number(stroke.radius || 0));
  const startX = Number(stroke.fromX);
  const startY = Number(stroke.fromY);
  const endX = Number(stroke.toX);
  const endY = Number(stroke.toY);

  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.strokeStyle = 'rgba(255,255,255,1)';
  ctx.fillStyle = 'rgba(255,255,255,1)';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = radius * 2;

  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(endX, endY);
  ctx.stroke();

  // Ensure taps produce a circular stamp even without movement.
  ctx.beginPath();
  ctx.arc(endX, endY, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
};

export const applyOverlayToMaskCanvas = ({
  targetMaskCanvas,
  baseMaskCanvas,
  overlayCanvas,
  mode,
  opacity,
}: {
  targetMaskCanvas: HTMLCanvasElement;
  baseMaskCanvas: HTMLCanvasElement;
  overlayCanvas: HTMLCanvasElement;
  mode: BrushMode;
  opacity: number;
}): void => {
  if (
    targetMaskCanvas.width !== baseMaskCanvas.width
    || targetMaskCanvas.height !== baseMaskCanvas.height
  ) {
    targetMaskCanvas.width = baseMaskCanvas.width;
    targetMaskCanvas.height = baseMaskCanvas.height;
  }

  const ctx = getCanvasContext(targetMaskCanvas);
  ctx.clearRect(0, 0, targetMaskCanvas.width, targetMaskCanvas.height);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.drawImage(baseMaskCanvas, 0, 0);
  ctx.globalAlpha = clamp(Number(opacity || 0), 0, 1);
  ctx.globalCompositeOperation = mode === 'erase' ? 'destination-out' : 'source-over';
  ctx.drawImage(overlayCanvas, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
};

export const isMaskDataPristine = (data: Uint8ClampedArray): boolean => {
  for (let index = 3; index < data.length; index += 4) {
    if (data[index] !== 255) return false;
  }
  return true;
};

export const isMaskCanvasPristine = (maskCanvas: HTMLCanvasElement): boolean => {
  const ctx = getCanvasContext(maskCanvas);
  const imageData = ctx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
  return isMaskDataPristine(imageData.data);
};

export const getNonTransparentPixelBounds = (
  data: Uint8ClampedArray,
  width: number,
  height: number
): PixelBounds | null => {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = data[((y * width) + x) * 4 + 3];
      if (alpha <= 0) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }

  if (maxX < minX || maxY < minY) return null;
  return {
    x: minX,
    y: minY,
    width: (maxX - minX) + 1,
    height: (maxY - minY) + 1,
  };
};

export const cropCanvasToNonTransparentBounds = (canvas: HTMLCanvasElement): HTMLCanvasElement => {
  const ctx = getCanvasContext(canvas);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const bounds = getNonTransparentPixelBounds(imageData.data, canvas.width, canvas.height);

  if (!bounds) {
    return createCanvas(1, 1);
  }

  const paddedBounds = {
    x: Math.max(0, bounds.x - CROPPED_STICKER_PADDING_PX),
    y: Math.max(0, bounds.y - CROPPED_STICKER_PADDING_PX),
    width: 0,
    height: 0,
  };
  const right = Math.min(canvas.width, bounds.x + bounds.width + CROPPED_STICKER_PADDING_PX);
  const bottom = Math.min(canvas.height, bounds.y + bounds.height + CROPPED_STICKER_PADDING_PX);
  paddedBounds.width = right - paddedBounds.x;
  paddedBounds.height = bottom - paddedBounds.y;

  if (
    paddedBounds.x === 0
    && paddedBounds.y === 0
    && paddedBounds.width === canvas.width
    && paddedBounds.height === canvas.height
  ) {
    return canvas;
  }

  const cropped = createCanvas(paddedBounds.width, paddedBounds.height);
  const croppedCtx = getCanvasContext(cropped);
  croppedCtx.drawImage(
    canvas,
    paddedBounds.x,
    paddedBounds.y,
    paddedBounds.width,
    paddedBounds.height,
    0,
    0,
    paddedBounds.width,
    paddedBounds.height
  );
  return cropped;
};

export const getCanvasNonTransparentBounds = (canvas: HTMLCanvasElement): PixelBounds | null => {
  const ctx = getCanvasContext(canvas);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return getNonTransparentPixelBounds(imageData.data, canvas.width, canvas.height);
};

export const loadStickerSource = async (
  src: string,
  maxDimension = STICKER_EDITOR_MAX_DIMENSION_PX
): Promise<LoadedStickerSource> => {
  const image = await loadImageElement(src);
  const originalWidth = Math.max(1, image.naturalWidth || image.width || 1);
  const originalHeight = Math.max(1, image.naturalHeight || image.height || 1);
  const scale = Math.min(1, maxDimension / Math.max(originalWidth, originalHeight));
  const width = Math.max(1, Math.round(originalWidth * scale));
  const height = Math.max(1, Math.round(originalHeight * scale));
  const canvas = createCanvas(width, height);
  const ctx = getCanvasContext(canvas);
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(image, 0, 0, width, height);

  return {
    canvas,
    width,
    height,
    aspectRatio: width / height,
    originalWidth,
    originalHeight,
  };
};

export const updateCompositeCanvas = (
  compositeCanvas: HTMLCanvasElement,
  sourceCanvas: HTMLCanvasElement,
  maskCanvas: HTMLCanvasElement
): void => {
  if (compositeCanvas.width !== sourceCanvas.width || compositeCanvas.height !== sourceCanvas.height) {
    compositeCanvas.width = sourceCanvas.width;
    compositeCanvas.height = sourceCanvas.height;
  }
  const ctx = getCanvasContext(compositeCanvas);
  ctx.clearRect(0, 0, compositeCanvas.width, compositeCanvas.height);
  ctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(sourceCanvas, 0, 0);
  ctx.globalCompositeOperation = 'destination-in';
  ctx.drawImage(maskCanvas, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
};

const renderCheckerboard = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  mode: CheckerboardMode
): void => {
  const size = 18;
  const baseColor = mode === 'dark' ? '#2b2f36' : '#f4f5f7';
  const accentColor = mode === 'dark' ? '#1a1d22' : '#dde1e6';
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = accentColor;
  for (let y = 0; y < height; y += size) {
    for (let x = 0; x < width; x += size) {
      if (((x / size) + (y / size)) % 2 === 0) {
        ctx.fillRect(x, y, size, size);
      }
    }
  }
};

export const renderStickerViewport = ({
  targetCanvas,
  compositeCanvas,
  transform,
  checkerboardMode = 'light',
}: {
  targetCanvas: HTMLCanvasElement;
  compositeCanvas: HTMLCanvasElement;
  transform: ViewTransform;
  checkerboardMode?: CheckerboardMode;
}): void => {
  const ctx = getCanvasContext(targetCanvas);
  ctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
  renderCheckerboard(ctx, targetCanvas.width, targetCanvas.height, checkerboardMode);
  ctx.save();
  ctx.translate(transform.offsetX, transform.offsetY);
  ctx.rotate(transform.rotation || 0);
  ctx.scale(transform.scale, transform.scale);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(compositeCanvas, 0, 0);
  ctx.restore();
};

export const createFitTransform = (
  imageWidth: number,
  imageHeight: number,
  viewportWidth: number,
  viewportHeight: number,
  padding = 20
): ViewTransform => {
  const safeViewportWidth = Math.max(1, viewportWidth);
  const safeViewportHeight = Math.max(1, viewportHeight);
  const safeImageWidth = Math.max(1, imageWidth);
  const safeImageHeight = Math.max(1, imageHeight);
  const scale = Math.min(
    (safeViewportWidth - (padding * 2)) / safeImageWidth,
    (safeViewportHeight - (padding * 2)) / safeImageHeight
  );
  const nextScale = Math.max(scale, 0.01);
  return {
    scale: nextScale,
    offsetX: (safeViewportWidth - (safeImageWidth * nextScale)) / 2,
    offsetY: (safeViewportHeight - (safeImageHeight * nextScale)) / 2,
    rotation: 0,
  };
};

export const clampTransformToViewport = (
  transform: ViewTransform,
  imageWidth: number,
  imageHeight: number,
  viewportWidth: number,
  viewportHeight: number,
  minScale: number
): ViewTransform => {
  const scale = Math.max(minScale, Number.isFinite(transform.scale) ? transform.scale : minScale);
  return {
    scale,
    offsetX: Number.isFinite(transform.offsetX) ? transform.offsetX : 0,
    offsetY: Number.isFinite(transform.offsetY) ? transform.offsetY : 0,
    rotation: Number.isFinite(transform.rotation) ? transform.rotation : 0,
  };
};

export const createCenteredTransformForBounds = ({
  bounds,
  viewportWidth,
  viewportHeight,
  scale,
  rotation = 0,
}: {
  bounds: PixelBounds;
  viewportWidth: number;
  viewportHeight: number;
  scale: number;
  rotation?: number;
}): ViewTransform => {
  const safeScale = Math.max(0.01, scale);
  const contentCenterX = bounds.x + (bounds.width / 2);
  const contentCenterY = bounds.y + (bounds.height / 2);
  const cosine = Math.cos(rotation);
  const sine = Math.sin(rotation);
  const rotatedCenterX = ((contentCenterX * cosine) - (contentCenterY * sine)) * safeScale;
  const rotatedCenterY = ((contentCenterX * sine) + (contentCenterY * cosine)) * safeScale;

  return {
    scale: safeScale,
    offsetX: (viewportWidth / 2) - rotatedCenterX,
    offsetY: (viewportHeight / 2) - rotatedCenterY,
    rotation,
  };
};

export const screenToImagePoint = (
  x: number,
  y: number,
  transform: ViewTransform
): { x: number; y: number } => {
  const scale = Math.max(0.0001, transform.scale);
  const translatedX = x - transform.offsetX;
  const translatedY = y - transform.offsetY;
  const rotation = transform.rotation || 0;
  const cosine = Math.cos(-rotation);
  const sine = Math.sin(-rotation);

  return {
    x: ((translatedX * cosine) - (translatedY * sine)) / scale,
    y: ((translatedX * sine) + (translatedY * cosine)) / scale,
  };
};

export const imageToScreenPoint = (
  x: number,
  y: number,
  transform: ViewTransform
): { x: number; y: number } => {
  const rotation = transform.rotation || 0;
  const cosine = Math.cos(rotation);
  const sine = Math.sin(rotation);
  const rotatedX = ((x * cosine) - (y * sine)) * transform.scale;
  const rotatedY = ((x * sine) + (y * cosine)) * transform.scale;

  return {
    x: rotatedX + transform.offsetX,
    y: rotatedY + transform.offsetY,
  };
};

export const exportMaskedSticker = async ({
  sourceCanvas,
  maskCanvas,
}: {
  sourceCanvas: HTMLCanvasElement;
  maskCanvas: HTMLCanvasElement;
}): Promise<ExportedStickerEdit> => {
  const changed = !isMaskCanvasPristine(maskCanvas);
  const composited = createCanvas(sourceCanvas.width, sourceCanvas.height);
  updateCompositeCanvas(composited, sourceCanvas, maskCanvas);
  const output = changed ? cropCanvasToNonTransparentBounds(composited) : composited;
  const blob = await canvasToBlob(output, 'image/png');
  return {
    blob,
    dataUrl: output.toDataURL('image/png'),
    width: output.width,
    height: output.height,
    changed,
  };
};
