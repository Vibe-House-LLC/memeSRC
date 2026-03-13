import type { CollageImageRef, CollageSnapshot, CollageStickerRef } from '../../../types/collage';
import { parseFormattedText } from '../../../utils/inlineFormatting';
import { buildSingleImageSnapshot, normalizeSnapshot } from './snapshotEditing';
import { FLOATING_TEXT_LAYER_ID_PREFIX } from './overlayOrder';

const BASE_CANVAS_WIDTH = 400;
const TEXT_PADDING_PX = 10;
const TEXT_DEFAULT_BOTTOM_RATIO = 0.95;
const TEXT_EXTENDED_BOTTOM_RATIO = 1.1;

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

const normalizeTextAlign = (value: unknown): 'left' | 'center' | 'right' => {
  if (value === 'left' || value === 'center' || value === 'right') return value;
  if (typeof value === 'string' && value.startsWith('justify')) return 'left';
  return 'center';
};

const normalizeAngleDeg = (value: unknown): number => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return 0;
  let next = numericValue % 360;
  if (next > 180) next -= 360;
  if (next <= -180) next += 360;
  return next;
};

const toFiniteNumber = (value: unknown, fallback = 0): number => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
};

type FabricPointLike = {
  x?: number;
  y?: number;
};

type FabricImageElementLike = {
  currentSrc?: string;
  src?: string;
  naturalWidth?: number;
  naturalHeight?: number;
  width?: number;
  height?: number;
};

type FabricObjectLike = {
  type?: string;
  visible?: boolean;
  text?: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string | number;
  fontStyle?: string;
  textAlign?: string;
  angle?: number;
  width?: number;
  height?: number;
  scaleX?: number;
  scaleY?: number;
  left?: number;
  top?: number;
  originX?: string;
  originY?: string;
  src?: string;
  _element?: FabricImageElementLike;
  getScaledWidth?: () => number;
  getScaledHeight?: () => number;
  getCenterPoint?: () => FabricPointLike;
  getSrc?: () => string;
};

type BackgroundImageInput = {
  imageRef: CollageImageRef;
  naturalWidth: number;
  naturalHeight: number;
};

export type BuildV2EditorImportSnapshotInput = {
  baseImage: BackgroundImageInput;
  canvasObjects: FabricObjectLike[];
  layerRawText?: Record<string | number, string>;
  whiteSpaceHeight?: number;
  baseCanvasWidth: number;
  baseCanvasHeight: number;
};

const getScaleX = (object: FabricObjectLike): number => {
  const scaleValue = toFiniteNumber(object.scaleX, 1);
  return scaleValue === 0 ? 1 : Math.abs(scaleValue);
};

const getScaleY = (object: FabricObjectLike): number => {
  const scaleValue = toFiniteNumber(object.scaleY, 1);
  return scaleValue === 0 ? 1 : Math.abs(scaleValue);
};

const getScaledWidth = (object: FabricObjectLike): number => {
  const measured = object.getScaledWidth?.();
  if (Number.isFinite(measured) && measured! > 0) return Number(measured);
  return Math.max(0, toFiniteNumber(object.width, 0) * getScaleX(object));
};

const getScaledHeight = (object: FabricObjectLike): number => {
  const measured = object.getScaledHeight?.();
  if (Number.isFinite(measured) && measured! > 0) return Number(measured);
  return Math.max(0, toFiniteNumber(object.height, 0) * getScaleY(object));
};

const getCenterPoint = (object: FabricObjectLike): { x: number; y: number } => {
  const measured = object.getCenterPoint?.();
  if (measured && Number.isFinite(measured.x) && Number.isFinite(measured.y)) {
    return {
      x: Number(measured.x),
      y: Number(measured.y),
    };
  }

  const width = getScaledWidth(object);
  const height = getScaledHeight(object);
  const left = toFiniteNumber(object.left, 0);
  const top = toFiniteNumber(object.top, 0);
  const originX = object.originX || 'left';
  const originY = object.originY || 'top';

  const x = originX === 'center'
    ? left
    : originX === 'right'
      ? left - (width / 2)
      : left + (width / 2);

  const y = originY === 'center'
    ? top
    : originY === 'bottom'
      ? top - (height / 2)
      : top + (height / 2);

  return { x, y };
};

const getImageSource = (object: FabricObjectLike): string => {
  const candidates = [
    object.getSrc?.(),
    object.src,
    object._element?.currentSrc,
    object._element?.src,
  ];
  const match = candidates.find((candidate) => typeof candidate === 'string' && candidate.trim().length > 0);
  return typeof match === 'string' ? match : '';
};

const getImageAspectRatio = (object: FabricObjectLike, renderedWidth: number, renderedHeight: number): number => {
  const naturalWidth = Number(object._element?.naturalWidth || object._element?.width || object.width || 0);
  const naturalHeight = Number(object._element?.naturalHeight || object._element?.height || object.height || 0);
  if (naturalWidth > 0 && naturalHeight > 0) {
    return naturalWidth / naturalHeight;
  }
  if (renderedWidth > 0 && renderedHeight > 0) {
    return renderedWidth / renderedHeight;
  }
  return 1;
};

const getTextPositionXFromAnchor = (panelWidth: number, anchorX: number): number => {
  const safePanelWidth = Math.max(panelWidth, 1);
  const maxTextWidth = Math.max(1, safePanelWidth - (TEXT_PADDING_PX * 2));
  return (((anchorX - TEXT_PADDING_PX) / maxTextWidth) * 200) - 100;
};

const getTextPositionYFromAnchor = (panelHeight: number, anchorY: number): number => {
  const safePanelHeight = Math.max(panelHeight, 1);
  const defaultBottom = safePanelHeight * TEXT_DEFAULT_BOTTOM_RATIO;
  if (anchorY >= defaultBottom) {
    const downSpan = Math.max(1, safePanelHeight * (TEXT_EXTENDED_BOTTOM_RATIO - TEXT_DEFAULT_BOTTOM_RATIO));
    return -((anchorY - defaultBottom) / downSpan) * 100;
  }

  const upSpan = Math.max(1, safePanelHeight * TEXT_DEFAULT_BOTTOM_RATIO);
  return ((defaultBottom - anchorY) / upSpan) * 100;
};

const buildTextLayer = (
  object: FabricObjectLike,
  objectIndex: number,
  rawValue: string,
  baseCanvasWidth: number,
  baseCanvasHeight: number,
  whiteSpaceHeight: number
): [string, Record<string, unknown>] | null => {
  const renderedWidth = getScaledWidth(object);
  const renderedHeight = getScaledHeight(object);
  if (renderedWidth <= 0 || renderedHeight <= 0) return null;

  const center = getCenterPoint(object);
  const textAlign = normalizeTextAlign(object.textAlign);
  const anchorX = textAlign === 'left'
    ? center.x - (renderedWidth / 2)
    : textAlign === 'right'
      ? center.x + (renderedWidth / 2)
      : center.x;
  const anchorY = center.y + (renderedHeight / 2) - whiteSpaceHeight;

  const safeCanvasWidth = Math.max(baseCanvasWidth, 1);
  const safeCanvasHeight = Math.max(baseCanvasHeight, 1);
  const visibleFontSize = Math.max(1, toFiniteNumber(object.fontSize, 26) * getScaleY(object));
  const visibleStrokeWidth = Math.max(0, toFiniteNumber(object.strokeWidth, 0) * ((getScaleX(object) + getScaleY(object)) / 2));
  const availableTextWidth = Math.max(24, safeCanvasWidth - (TEXT_PADDING_PX * 2));
  const textBoxWidthPercent = clamp((renderedWidth / availableTextWidth) * 100, 20, 100);
  const normalizedRawValue = typeof rawValue === 'string' ? rawValue : String(rawValue || '');
  const parsed = parseFormattedText(normalizedRawValue);
  const cleanText = parsed.cleanText || object.text || normalizedRawValue;

  return [
    `${FLOATING_TEXT_LAYER_ID_PREFIX}v2-${objectIndex}`,
    {
      content: cleanText,
      rawContent: normalizedRawValue,
      fontFamily: object.fontFamily || 'Arial',
      fontWeight: object.fontWeight ?? 400,
      fontStyle: object.fontStyle || 'normal',
      fontSize: (visibleFontSize * BASE_CANVAS_WIDTH) / safeCanvasWidth,
      color: object.fill || '#ffffff',
      strokeColor: object.stroke || '#000000',
      strokeWidth: visibleStrokeWidth,
      textAlign,
      textRotation: normalizeAngleDeg(object.angle),
      textPositionX: getTextPositionXFromAnchor(safeCanvasWidth, anchorX),
      textPositionY: getTextPositionYFromAnchor(safeCanvasHeight, anchorY),
      textBoxWidthPercent,
      zIndex: objectIndex,
    },
  ];
};

const buildStickerLayer = (
  object: FabricObjectLike,
  objectIndex: number,
  baseCanvasWidth: number,
  baseCanvasHeight: number,
  whiteSpaceHeight: number
): CollageStickerRef | null => {
  const source = getImageSource(object);
  if (!source) return null;

  const renderedWidth = getScaledWidth(object);
  const renderedHeight = getScaledHeight(object);
  if (renderedWidth <= 0 || renderedHeight <= 0) return null;

  const center = getCenterPoint(object);
  const xPx = center.x - (renderedWidth / 2);
  const yPx = center.y - (renderedHeight / 2) - whiteSpaceHeight;
  const safeCanvasWidth = Math.max(baseCanvasWidth, 1);
  const safeCanvasHeight = Math.max(baseCanvasHeight, 1);

  return {
    id: `sticker-v2-${objectIndex}`,
    url: source,
    thumbnailUrl: source,
    aspectRatio: getImageAspectRatio(object, renderedWidth, renderedHeight),
    angleDeg: normalizeAngleDeg(object.angle),
    widthPercent: (renderedWidth / safeCanvasWidth) * 100,
    xPercent: (xPx / safeCanvasWidth) * 100,
    yPercent: (yPx / safeCanvasHeight) * 100,
    zIndex: objectIndex,
  };
};

export function buildV2EditorImportSnapshot({
  baseImage,
  canvasObjects,
  layerRawText = {},
  whiteSpaceHeight = 0,
  baseCanvasWidth,
  baseCanvasHeight,
}: BuildV2EditorImportSnapshotInput): CollageSnapshot {
  const customAspectRatio = baseImage.naturalWidth > 0 && baseImage.naturalHeight > 0
    ? baseImage.naturalWidth / baseImage.naturalHeight
    : Math.max(baseCanvasWidth, 1) / Math.max(baseCanvasHeight, 1);

  const snapshot = buildSingleImageSnapshot(baseImage.imageRef, {
    customAspectRatio,
    borderThickness: 'none',
    borderColor: '#FFFFFF',
    singleImageAutoRestoreAspectRatioId: 'portrait',
  });

  const panelTexts: Record<string, unknown> = {};
  const stickers: CollageStickerRef[] = [];
  const normalizedWhiteSpaceHeight = Math.max(0, toFiniteNumber(whiteSpaceHeight, 0));

  (Array.isArray(canvasObjects) ? canvasObjects : []).forEach((object, objectIndex) => {
    if (!object || object.visible === false) return;

    if (object.type === 'textbox' || object.type === 'text' || typeof object.text === 'string') {
      const rawValue = layerRawText[objectIndex] ?? object.text ?? '';
      const textEntry = buildTextLayer(
        object,
        objectIndex,
        String(rawValue || ''),
        baseCanvasWidth,
        baseCanvasHeight,
        normalizedWhiteSpaceHeight
      );
      if (textEntry) {
        const [layerId, layerConfig] = textEntry;
        panelTexts[layerId] = layerConfig;
      }
      return;
    }

    if (object.type === 'image') {
      const stickerLayer = buildStickerLayer(
        object,
        objectIndex,
        baseCanvasWidth,
        baseCanvasHeight,
        normalizedWhiteSpaceHeight
      );
      if (stickerLayer) {
        stickers.push(stickerLayer);
      }
    }
  });

  return normalizeSnapshot({
    ...snapshot,
    panelTexts,
    stickers,
    canvasWidth: Math.max(baseCanvasWidth, 1),
    canvasHeight: Math.max(baseCanvasHeight, 1),
    panelDimensions: {
      'panel-1': {
        width: Math.max(baseCanvasWidth, 1),
        height: Math.max(baseCanvasHeight, 1),
      },
    },
  }, 'custom');
}
