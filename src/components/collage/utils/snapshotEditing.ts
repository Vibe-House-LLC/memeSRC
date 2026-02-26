import { getLayoutsForPanelCount } from '../config/CollageConfig';
import type {
  AspectRatio,
  CollageImageMetadata,
  CollageImageRef,
  CollageSnapshot,
} from '../../../types/collage';

export const MAX_COLLAGE_IMAGES = 5;

const createPanelIds = (panelCount: number): string[] =>
  Array.from({ length: Math.max(1, panelCount) }, (_, idx) => `panel-${idx + 1}`);

const normalizeCustomAspectRatio = (value: unknown): number | undefined => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue <= 0) return undefined;
  return Math.max(0.1, Math.min(10, numericValue));
};

const chooseTemplateId = (
  panelCount: number,
  aspectRatio: AspectRatio = 'portrait',
  customAspectRatio?: number
): string | null => {
  try {
    const templates = getLayoutsForPanelCount(
      Math.max(1, panelCount || 1),
      aspectRatio as string,
      aspectRatio === 'custom' ? customAspectRatio : undefined
    );
    return templates?.[0]?.id || null;
  } catch (_) {
    return null;
  }
};

const isTemplateIdCompatible = (
  templateId: string | null | undefined,
  panelCount: number,
  aspectRatio: AspectRatio = 'portrait',
  customAspectRatio?: number
): boolean => {
  if (!templateId) return false;
  try {
    const templates = getLayoutsForPanelCount(
      Math.max(1, panelCount || 1),
      aspectRatio as string,
      aspectRatio === 'custom' ? customAspectRatio : undefined
    );
    return templates?.some((template) => template.id === templateId) || false;
  } catch (_) {
    return false;
  }
};

const cleanPanelImageMapping = (
  mapping: CollageSnapshot['panelImageMapping'],
  imageCount: number,
  panelIds: string[]
): Record<string, number> => {
  const validIds = new Set(panelIds);
  const cleaned: Record<string, number> = {};
  if (mapping && typeof mapping === 'object') {
    Object.entries(mapping).forEach(([panelId, value]) => {
      if (!validIds.has(panelId)) return;
      const idx = typeof value === 'number' ? value : Number(value);
      if (Number.isFinite(idx) && idx >= 0 && idx < imageCount) {
        cleaned[panelId] = idx;
      }
    });
  }
  return cleaned;
};

const cleanStickerLayers = (stickers: CollageSnapshot['stickers']): NonNullable<CollageSnapshot['stickers']> => {
  if (!Array.isArray(stickers)) return [];

  return stickers
    .map((sticker, index) => {
      if (!sticker || typeof sticker !== 'object') return null;
      const ratioRaw = Number(sticker.aspectRatio);
      const angleRaw = Number((sticker as { angleDeg?: number }).angleDeg);
      const widthRaw = Number(sticker.widthPercent);
      const xRaw = Number(sticker.xPercent);
      const yRaw = Number(sticker.yPercent);
      const opacityRaw = Number(sticker.opacity);
      const brightnessRaw = Number(sticker.brightness);
      const contrastRaw = Number(sticker.contrast);
      const saturationRaw = Number(sticker.saturation);
      const editedUrl = typeof sticker.editedUrl === 'string' ? sticker.editedUrl : '';
      const next = {
        ...sticker,
        id: (typeof sticker.id === 'string' && sticker.id.trim()) ? sticker.id : `sticker-${index + 1}`,
        aspectRatio: Number.isFinite(ratioRaw) && ratioRaw > 0 ? ratioRaw : 1,
        angleDeg: Number.isFinite(angleRaw) ? angleRaw : 0,
        widthPercent: Number.isFinite(widthRaw) ? widthRaw : 28,
        xPercent: Number.isFinite(xRaw) ? xRaw : 36,
        yPercent: Number.isFinite(yRaw) ? yRaw : 12,
        opacity: Number.isFinite(opacityRaw) ? Math.max(0, Math.min(1, opacityRaw)) : 1,
        brightness: Number.isFinite(brightnessRaw) ? Math.max(0, Math.min(200, brightnessRaw)) : 100,
        contrast: Number.isFinite(contrastRaw) ? Math.max(0, Math.min(200, contrastRaw)) : 100,
        saturation: Number.isFinite(saturationRaw) ? Math.max(0, Math.min(200, saturationRaw)) : 100,
        editedUrl,
      };
      if (!next.libraryKey && !next.url && !next.editedUrl) return null;
      return next;
    })
    .filter(Boolean) as NonNullable<CollageSnapshot['stickers']>;
};

export function normalizeSnapshot(
  snapshot: CollageSnapshot | null | undefined,
  aspectRatio: AspectRatio = 'portrait'
): CollageSnapshot {
  const images = Array.isArray(snapshot?.images) ? [...snapshot!.images] : [];
  const desiredPanelCount = Math.min(
    MAX_COLLAGE_IMAGES,
    Math.max(snapshot?.panelCount || images.length || 0, 1)
  );
  const panelIds = createPanelIds(desiredPanelCount);

  const selectedAspectRatio = (snapshot?.selectedAspectRatio || aspectRatio || 'portrait') as AspectRatio;
  const customAspectRatio = normalizeCustomAspectRatio(snapshot?.customAspectRatio);
  const selectedTemplateId = isTemplateIdCompatible(
    snapshot?.selectedTemplateId,
    desiredPanelCount,
    selectedAspectRatio,
    customAspectRatio
  )
    ? snapshot?.selectedTemplateId || null
    : chooseTemplateId(desiredPanelCount, selectedAspectRatio, customAspectRatio);

  return {
    version: snapshot?.version || 1,
    images,
    panelImageMapping: cleanPanelImageMapping(snapshot?.panelImageMapping, images.length, panelIds),
    panelTransforms: snapshot?.panelTransforms || {},
    panelTexts: snapshot?.panelTexts || {},
    stickers: cleanStickerLayers(snapshot?.stickers),
    selectedTemplateId: selectedTemplateId || null,
    selectedAspectRatio,
    customAspectRatio,
    panelCount: desiredPanelCount,
    borderThickness: snapshot?.borderThickness ?? 'medium',
    borderColor: snapshot?.borderColor ?? '#FFFFFF',
    customLayout: snapshot?.customLayout ?? null,
    canvasWidth: snapshot?.canvasWidth,
    canvasHeight: snapshot?.canvasHeight,
    panelDimensions: snapshot?.panelDimensions,
  };
}

const buildAutoText = (subtitle: string, fontFamily?: string) => ({
  content: subtitle,
  rawContent: subtitle,
  fontSize: 20,
  fontWeight: 400,
  fontFamily: fontFamily || 'Arial',
  color: '#ffffff',
  strokeWidth: 2,
  autoAssigned: true,
  subtitleShowing: true,
});

export function appendImageToSnapshot(
  snapshot: CollageSnapshot | null | undefined,
  image: CollageImageRef,
  aspectRatio: AspectRatio = 'portrait'
): { snapshot: CollageSnapshot; addedIndex: number } {
  const base = normalizeSnapshot(snapshot, aspectRatio);
  const baseCount = base.images.length;
  if (baseCount >= MAX_COLLAGE_IMAGES) {
    throw new Error('collage-full');
  }

  const nextImages = [...base.images, image];
  const desiredPanelCount = Math.min(MAX_COLLAGE_IMAGES, Math.max(nextImages.length, 1));
  const panelIds = createPanelIds(desiredPanelCount);
  const panelImageMapping = cleanPanelImageMapping(base.panelImageMapping, nextImages.length, panelIds);

  let nextImageIndex = baseCount;
  panelIds.forEach((panelId) => {
    if (nextImageIndex >= nextImages.length) return;
    if (typeof panelImageMapping[panelId] === 'number') return;
    panelImageMapping[panelId] = nextImageIndex;
    nextImageIndex += 1;
  });

  const selectedTemplateId = isTemplateIdCompatible(
    base.selectedTemplateId,
    desiredPanelCount,
    base.selectedAspectRatio,
    base.customAspectRatio
  )
    ? base.selectedTemplateId || null
    : chooseTemplateId(desiredPanelCount, base.selectedAspectRatio, base.customAspectRatio);

  const panelTexts: Record<string, any> = { ...(base.panelTexts || {}) };
  if (image.subtitle && image.subtitleShowing) {
    const targetPanel = panelIds.find((id) => panelImageMapping[id] === baseCount);
    if (targetPanel) {
      const fontFamily = (image as any)?.metadata?.fontFamily || (image as any)?.fontFamily;
      panelTexts[targetPanel] = buildAutoText(String(image.subtitle), fontFamily);
    }
  }

  return {
    snapshot: {
      ...base,
      images: nextImages,
      panelImageMapping,
      panelCount: desiredPanelCount,
      selectedTemplateId: selectedTemplateId || null,
      panelTexts,
    },
    addedIndex: baseCount,
  };
}

export function replaceImageInSnapshot(
  snapshot: CollageSnapshot | null | undefined,
  targetIndex: number,
  image: CollageImageRef,
  aspectRatio: AspectRatio = 'portrait'
): CollageSnapshot {
  const base = normalizeSnapshot(snapshot, aspectRatio);
  if (targetIndex < 0 || targetIndex >= base.images.length) {
    throw new Error('invalid-index');
  }

  const nextImages = [...base.images];
  nextImages[targetIndex] = image;

  const panelIds = createPanelIds(base.panelCount || nextImages.length || 1);
  const panelImageMapping = cleanPanelImageMapping(base.panelImageMapping, nextImages.length, panelIds);

  const selectedTemplateId =
    base.selectedTemplateId || chooseTemplateId(base.panelCount, base.selectedAspectRatio, base.customAspectRatio);

  const panelTexts: Record<string, any> = { ...(base.panelTexts || {}) };
  const newSubtitle = image.subtitle && image.subtitleShowing ? String(image.subtitle) : null;
  const fontFamily = (image as any)?.metadata?.fontFamily;
  panelIds.forEach((panelId) => {
    if (panelImageMapping[panelId] !== targetIndex) return;
    if (newSubtitle) {
      panelTexts[panelId] = buildAutoText(newSubtitle, fontFamily);
    } else if ((panelTexts[panelId] as any)?.autoAssigned) {
      delete panelTexts[panelId];
    }
  });

  return {
    ...base,
    images: nextImages,
    panelImageMapping,
    selectedTemplateId: selectedTemplateId || null,
    panelTexts,
  };
}

export function snapshotImageFromPayload(payload: {
  metadata?: CollageImageMetadata;
  originalUrl?: string;
  displayUrl?: string;
  subtitle?: string;
  subtitleShowing?: boolean;
}): CollageImageRef {
  const imageRef: CollageImageRef = {};
  const metadata = payload?.metadata;
  const libraryKey = metadata?.libraryKey;
  const url = payload?.originalUrl || payload?.displayUrl;

  if (metadata && Object.keys(metadata).length > 0) {
    imageRef.metadata = { ...metadata };
  }

  if (libraryKey) {
    imageRef.libraryKey = libraryKey;
  } else if (url) {
    imageRef.url = url;
  }

  if (typeof payload?.subtitle === 'string' && payload.subtitle.trim().length > 0) {
    imageRef.subtitle = payload.subtitle;
  }
  if (typeof payload?.subtitleShowing === 'boolean') {
    imageRef.subtitleShowing = payload.subtitleShowing;
  }

  return imageRef;
}

export function buildSnapshotSignature(snap: CollageSnapshot): string {
  try {
    const json = JSON.stringify(snap);
    let hash = 5381;
    for (let i = 0; i < json.length; i += 1) {
      hash = (hash * 33 + json.charCodeAt(i)) % 4294967296;
    }
    return `v2:${Math.floor(hash)}`;
  } catch (_) {
    return `v2:${Date.now()}`;
  }
}
