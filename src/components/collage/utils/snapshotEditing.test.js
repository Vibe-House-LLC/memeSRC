jest.mock('../config/CollageConfig', () => ({
  getLayoutsForPanelCount: jest.fn(() => [
    { id: 'tmpl-1' },
    { id: 'tmpl-2' },
  ]),
}));

const {
  appendImageToSnapshot,
  buildSnapshotSignature,
  normalizeSnapshot,
  replaceImageInSnapshot,
  snapshotImageFromPayload,
} = require('./snapshotEditing');

describe('snapshotEditing utils', () => {
  it('normalizes invalid panel mapping and template IDs', () => {
    const normalized = normalizeSnapshot({
      version: 1,
      images: [{ url: 'https://example.com/1.jpg' }],
      panelImageMapping: {
        'panel-1': 0,
        'panel-2': 4,
        'panel-x': 0,
      },
      panelTransforms: {},
      panelTexts: {},
      selectedTemplateId: 'missing-template',
      selectedAspectRatio: 'portrait',
      panelCount: 2,
      borderThickness: 'medium',
      borderColor: '#fff',
    });

    expect(normalized.panelCount).toBe(2);
    expect(normalized.panelImageMapping).toEqual({ 'panel-1': 0 });
    expect(normalized.selectedTemplateId).not.toBe('missing-template');
  });

  it('appends an image and auto-assigns subtitle text to first empty panel', () => {
    const { snapshot, addedIndex } = appendImageToSnapshot(
      {
        version: 1,
        images: [{ url: 'https://example.com/1.jpg' }],
        panelImageMapping: { 'panel-1': 0 },
        panelTransforms: {},
        panelTexts: {},
        selectedTemplateId: 'tmpl-1',
        selectedAspectRatio: 'portrait',
        panelCount: 2,
        borderThickness: 'medium',
        borderColor: '#fff',
      },
      {
        url: 'https://example.com/2.jpg',
        subtitle: 'Hello there',
        subtitleShowing: true,
      }
    );

    expect(addedIndex).toBe(1);
    expect(snapshot.images).toHaveLength(2);
    expect(snapshot.panelImageMapping['panel-2']).toBe(1);
    expect(snapshot.panelTexts['panel-2']).toMatchObject({
      content: 'Hello there',
      autoAssigned: true,
      subtitleShowing: true,
    });
  });

  it('replaces an image and removes prior auto-assigned text when new image has no subtitle', () => {
    const next = replaceImageInSnapshot(
      {
        version: 1,
        images: [{ url: 'https://example.com/1.jpg' }],
        panelImageMapping: { 'panel-1': 0 },
        panelTransforms: {},
        panelTexts: {
          'panel-1': {
            content: 'Old subtitle',
            autoAssigned: true,
            subtitleShowing: true,
          },
        },
        selectedTemplateId: 'tmpl-1',
        selectedAspectRatio: 'portrait',
        panelCount: 1,
        borderThickness: 'medium',
        borderColor: '#fff',
      },
      0,
      {
        url: 'https://example.com/replaced.jpg',
        subtitleShowing: false,
      }
    );

    expect(next.images[0].url).toBe('https://example.com/replaced.jpg');
    expect(next.panelTexts['panel-1']).toBeUndefined();
  });

  it('builds snapshot image refs from payload metadata', () => {
    expect(
      snapshotImageFromPayload({
        metadata: { libraryKey: 'library/item.jpg' },
        originalUrl: 'https://fallback.com/image.jpg',
        subtitle: 'Caption',
        subtitleShowing: true,
      })
    ).toEqual({
      metadata: { libraryKey: 'library/item.jpg' },
      libraryKey: 'library/item.jpg',
      subtitle: 'Caption',
      subtitleShowing: true,
    });

    expect(
      snapshotImageFromPayload({
        originalUrl: 'https://fallback.com/image.jpg',
      })
    ).toEqual({
      url: 'https://fallback.com/image.jpg',
    });
  });

  it('builds deterministic signatures for equivalent snapshots', () => {
    const snap = normalizeSnapshot({
      version: 1,
      images: [{ url: 'https://example.com/1.jpg' }],
      panelImageMapping: { 'panel-1': 0 },
      panelTransforms: {},
      panelTexts: {},
      selectedTemplateId: 'tmpl-1',
      selectedAspectRatio: 'portrait',
      panelCount: 1,
      borderThickness: 'medium',
      borderColor: '#fff',
    });

    const sigA = buildSnapshotSignature(snap);
    const sigB = buildSnapshotSignature({ ...snap, images: [...snap.images] });

    expect(sigA).toBe(sigB);
  });
});
