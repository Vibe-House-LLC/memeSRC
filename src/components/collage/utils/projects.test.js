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
});
