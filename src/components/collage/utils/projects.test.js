import { loadProjects, createProject, upsertProject, buildSnapshotFromState } from './projects';

const STORAGE_KEY = 'memeSRC_collageProjects_v1';

describe('collage projects util', () => {
  beforeEach(() => {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
  });

  it('loads empty array when no projects stored', () => {
    expect(loadProjects()).toEqual([]);
  });

  it('creates and persists a new project with defaults', () => {
    const p = createProject();
    expect(p.id).toBeTruthy();
    expect(p.name).toBe('Untitled Collage');
    const arr = loadProjects();
    expect(arr.length).toBe(1);
    expect(arr[0].id).toBe(p.id);
  });

  it('upserts name and state, and persists changes', () => {
    const p = createProject({ name: 'Start' });
    const snap = buildSnapshotFromState({
      selectedImages: [{ originalUrl: 'data:,x', subtitle: 'hi', subtitleShowing: true }],
      panelImageMapping: { 'panel-1': 0 },
      panelTransforms: {},
      panelTexts: {},
      selectedTemplate: { id: 't-1' },
      selectedAspectRatio: 'square',
      panelCount: 2,
      borderThickness: 1.5,
      borderColor: '#fff',
      customLayout: null,
      canvasWidth: 1000,
      canvasHeight: 1000,
    });

    upsertProject(p.id, { name: 'Updated', state: snap });
    const arr = loadProjects();
    const found = arr.find((x) => x.id === p.id);
    expect(found.name).toBe('Updated');
    expect(found.state.version).toBe(1);
    expect(found.state.images.length).toBe(1);
    expect(found.state.selectedTemplateId).toBe('t-1');
    expect(found.state.panelCount).toBe(2);
  });

  it('prefers metadata sourceUrl over blob URLs when building snapshot refs', () => {
    const snap = buildSnapshotFromState({
      selectedImages: [
        {
          originalUrl: 'blob:https://example.com/abc-123',
          displayUrl: 'blob:https://example.com/def-456',
          metadata: { sourceUrl: 'https://v2-dev.memesrc.com/frame/show/1/1/100' },
        },
      ],
      panelImageMapping: { 'panel-1': 0 },
      panelTransforms: {},
      panelTexts: {},
      selectedTemplate: { id: 't-1' },
      selectedAspectRatio: 'square',
      panelCount: 2,
      borderThickness: 1.5,
      borderColor: '#fff',
      customLayout: null,
      canvasWidth: 1000,
      canvasHeight: 1000,
    });

    expect(snap.images).toEqual([
      {
        url: 'https://v2-dev.memesrc.com/frame/show/1/1/100',
      },
    ]);
  });

  it('omits data-url sticker fallbacks when libraryKey exists', () => {
    const snap = buildSnapshotFromState({
      selectedImages: [],
      selectedStickers: [
        {
          id: 'sticker-1',
          originalUrl: 'data:image/png;base64,AAA',
          thumbnailUrl: 'data:image/png;base64,BBB',
          metadata: { libraryKey: 'private/library/sticker-1.png', isFromLibrary: true },
          aspectRatio: 1.4,
          widthPercent: 31,
          xPercent: 18,
          yPercent: 22,
        },
      ],
      panelImageMapping: {},
      panelTransforms: {},
      panelTexts: {},
      selectedTemplate: { id: 't-1' },
      selectedAspectRatio: 'square',
      panelCount: 2,
      borderThickness: 1.5,
      borderColor: '#fff',
      customLayout: null,
      canvasWidth: 1000,
      canvasHeight: 1000,
    });

    expect(snap.stickers).toHaveLength(1);
    const savedSticker = snap.stickers[0];
    expect(savedSticker.id).toBe('sticker-1');
    expect(savedSticker.libraryKey).toBe('private/library/sticker-1.png');
    expect(savedSticker.url).toBeUndefined();
    expect(savedSticker.thumbnailUrl).toBeUndefined();
  });

  it('keeps non-data sticker fallback URLs when libraryKey exists', () => {
    const snap = buildSnapshotFromState({
      selectedImages: [],
      selectedStickers: [
        {
          id: 'sticker-2',
          originalUrl: 'https://cdn.example.com/sticker.png',
          thumbnailUrl: 'https://cdn.example.com/sticker-thumb.png',
          metadata: { libraryKey: 'private/library/sticker-2.png' },
        },
      ],
      panelImageMapping: {},
      panelTransforms: {},
      panelTexts: {},
      selectedTemplate: { id: 't-1' },
      selectedAspectRatio: 'square',
      panelCount: 2,
      borderThickness: 1.5,
      borderColor: '#fff',
      customLayout: null,
      canvasWidth: 1000,
      canvasHeight: 1000,
    });

    expect(snap.stickers).toHaveLength(1);
    const savedSticker = snap.stickers[0];
    expect(savedSticker.libraryKey).toBe('private/library/sticker-2.png');
    expect(savedSticker.url).toBe('https://cdn.example.com/sticker.png');
    expect(savedSticker.thumbnailUrl).toBe('https://cdn.example.com/sticker-thumb.png');
  });

  it('persists edited sticker data URLs even when libraryKey exists', () => {
    const snap = buildSnapshotFromState({
      selectedImages: [],
      selectedStickers: [
        {
          id: 'sticker-3',
          originalUrl: 'https://cdn.example.com/sticker.png',
          editedUrl: 'data:image/png;base64,EDITED',
          metadata: { libraryKey: 'private/library/sticker-3.png' },
        },
      ],
      panelImageMapping: {},
      panelTransforms: {},
      panelTexts: {},
      selectedTemplate: { id: 't-1' },
      selectedAspectRatio: 'square',
      panelCount: 2,
      borderThickness: 1.5,
      borderColor: '#fff',
      customLayout: null,
      canvasWidth: 1000,
      canvasHeight: 1000,
    });

    expect(snap.stickers).toHaveLength(1);
    const savedSticker = snap.stickers[0];
    expect(savedSticker.libraryKey).toBe('private/library/sticker-3.png');
    expect(savedSticker.editedUrl).toBe('data:image/png;base64,EDITED');
  });
});
