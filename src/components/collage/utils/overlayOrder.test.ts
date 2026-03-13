import {
  getNextOverlayZIndex,
  sortOverlayEntries,
} from './overlayOrder';

describe('overlayOrder helpers', () => {
  it('keeps legacy fallback behavior when explicit z-index is absent', () => {
    const ordered = sortOverlayEntries([
      { candidate: { id: 'sticker-1' }, fallbackOrder: 0, kind: 'sticker' },
      { candidate: { id: 'sticker-2' }, fallbackOrder: 1, kind: 'sticker' },
      { candidate: { id: 'text-1' }, fallbackOrder: 1000, kind: 'text' },
    ]);

    expect(ordered.map((entry) => entry.kind)).toEqual(['sticker', 'sticker', 'text']);
  });

  it('sorts stickers and text together by explicit z-index', () => {
    const ordered = sortOverlayEntries([
      { candidate: { id: 'sticker-bottom', zIndex: 1 }, fallbackOrder: 0, kind: 'sticker' },
      { candidate: { id: 'text-middle', zIndex: 2 }, fallbackOrder: 1000, kind: 'text' },
      { candidate: { id: 'sticker-top', zIndex: 3 }, fallbackOrder: 1, kind: 'sticker' },
    ]);

    expect(ordered.map((entry) => entry.candidate.id)).toEqual([
      'sticker-bottom',
      'text-middle',
      'sticker-top',
    ]);
  });

  it('assigns new overlays above the highest existing z-index', () => {
    expect(
      getNextOverlayZIndex(
        {
          '__text-layer__-1': { zIndex: 4 },
        },
        [
          { id: 'sticker-1', zIndex: 7 },
          { id: 'sticker-2' },
        ]
      )
    ).toBe(8);
  });
});
