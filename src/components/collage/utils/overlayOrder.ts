import type { CollageStickerRef } from '../../../types/collage';

export const TOP_CAPTION_PANEL_ID = '__top-caption__';
export const FLOATING_TEXT_LAYER_ID_PREFIX = '__text-layer__-';

export const isFloatingTextLayerId = (panelId: unknown): panelId is string => (
  typeof panelId === 'string' && panelId.startsWith(FLOATING_TEXT_LAYER_ID_PREFIX)
);

export const getExplicitZIndex = (candidate: unknown): number | null => {
  if (!candidate || typeof candidate !== 'object') return null;
  const raw = Number((candidate as { zIndex?: unknown }).zIndex);
  return Number.isFinite(raw) ? raw : null;
};

export const getOverlayTextEntries = (
  panelTexts: Record<string, unknown> | null | undefined,
  {
    includeTopCaption = false,
  }: {
    includeTopCaption?: boolean;
  } = {}
): Array<{ panelId: string; panelText: Record<string, unknown>; fallbackOrder: number }> => {
  if (!panelTexts || typeof panelTexts !== 'object') return [];

  return Object.entries(panelTexts)
    .filter(([panelId, panelText]) => {
      if (!panelText || typeof panelText !== 'object') return false;
      if (!includeTopCaption && panelId === TOP_CAPTION_PANEL_ID) return false;
      return true;
    })
    .map(([panelId, panelText], index) => ({
      panelId,
      panelText: panelText as Record<string, unknown>,
      fallbackOrder: 1000 + index,
    }));
};

export const getOverlayStickerEntries = (
  stickers: Array<CollageStickerRef | Record<string, unknown> | null | undefined> | null | undefined
): Array<{ sticker: CollageStickerRef | Record<string, unknown>; fallbackOrder: number }> => (
  Array.isArray(stickers)
    ? stickers
        .filter(Boolean)
        .map((sticker, index) => ({
          sticker: sticker as CollageStickerRef | Record<string, unknown>,
          fallbackOrder: index,
        }))
    : []
);

export const sortOverlayEntries = <T extends { candidate: unknown; fallbackOrder: number }>(
  entries: T[]
): T[] => [...entries].sort((left, right) => {
  const leftExplicit = getExplicitZIndex(left.candidate);
  const rightExplicit = getExplicitZIndex(right.candidate);

  if (leftExplicit !== null || rightExplicit !== null) {
    const leftValue = leftExplicit ?? left.fallbackOrder;
    const rightValue = rightExplicit ?? right.fallbackOrder;
    if (leftValue !== rightValue) {
      return leftValue - rightValue;
    }
  } else if (left.fallbackOrder !== right.fallbackOrder) {
    return left.fallbackOrder - right.fallbackOrder;
  }

  return left.fallbackOrder - right.fallbackOrder;
});

export const getNextOverlayZIndex = (
  panelTexts: Record<string, unknown> | null | undefined,
  stickers: Array<CollageStickerRef | Record<string, unknown> | null | undefined> | null | undefined
): number => {
  let maxValue = -1;

  getOverlayStickerEntries(stickers).forEach(({ sticker, fallbackOrder }) => {
    const value = getExplicitZIndex(sticker) ?? fallbackOrder;
    if (value > maxValue) maxValue = value;
  });

  getOverlayTextEntries(panelTexts).forEach(({ panelText, fallbackOrder }) => {
    const value = getExplicitZIndex(panelText) ?? fallbackOrder;
    if (value > maxValue) maxValue = value;
  });

  return maxValue + 1;
};
