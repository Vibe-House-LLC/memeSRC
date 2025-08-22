// Lightweight localStorage-backed persistence for collage projects
// Stores only what’s needed to perfectly reproduce a collage across screen sizes.

import type { CollageProject, CollageSnapshot, AspectRatio } from '../../../types/collage';

const STORAGE_KEY = 'memeSRC_collageProjects_v1';

// Read all projects
export function loadProjects(): CollageProject[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr as CollageProject[];
  } catch (_) {
    return [];
  }
}

// Write all projects
function saveProjectsArray(projects: CollageProject[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  } catch (_) {
    // ignore
  }
}

// Create a new project shell
export function createProject({ name }: { name?: string } = {}): CollageProject {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const ts = new Date().toISOString();
  const project: CollageProject = {
    id,
    name: name || 'Untitled Collage',
    createdAt: ts,
    updatedAt: ts,
    // optional small preview dataURL (not required to function)
    thumbnail: null, // legacy inline thumbnail (data URL)
    // Amplify Storage key for thumbnail (preferred)
    thumbnailKey: null,
    // Optional dedupe metadata to avoid frequent re-uploads
    thumbnailSignature: null,
    thumbnailUpdatedAt: null,
    // The snapshot/state; see shape below in upsertProject
    state: null,
  };
  const projects = loadProjects();
  projects.unshift(project);
  saveProjectsArray(projects);
  return project;
}

export function getProject(id: string): CollageProject | null {
  return loadProjects().find((p) => p.id === id) || null;
}

export function deleteProject(id: string): void {
  const projects = loadProjects().filter((p) => p.id !== id);
  saveProjectsArray(projects);
}

// Insert or update a project record by id. Accepts partial fields.
export function upsertProject(
  id: string,
  {
    name,
    thumbnail,
    thumbnailKey,
    thumbnailSignature,
    thumbnailUpdatedAt,
    state,
  }: Partial<Pick<CollageProject, 'name' | 'thumbnail' | 'thumbnailKey' | 'thumbnailSignature' | 'thumbnailUpdatedAt' | 'state'>>
): void {
  const projects = loadProjects();
  const ts = new Date().toISOString();
  const idx = projects.findIndex((p) => p.id === id);
  if (idx === -1) {
    // create new if missing
    const project: CollageProject = {
      id,
      name: name || 'Untitled Collage',
      createdAt: ts,
      updatedAt: ts,
      thumbnail: thumbnail ?? null,
      thumbnailKey: thumbnailKey ?? null,
      thumbnailSignature: thumbnailSignature ?? null,
      thumbnailUpdatedAt: thumbnailUpdatedAt ?? ts,
      state: (state as CollageSnapshot | null) ?? null,
    };
    projects.unshift(project);
  } else {
    const prev = projects[idx];
    projects[idx] = {
      ...prev,
      name: name ?? prev.name,
      updatedAt: ts,
      thumbnail: thumbnail === undefined ? prev.thumbnail : thumbnail,
      thumbnailKey: thumbnailKey === undefined ? prev.thumbnailKey : thumbnailKey,
      thumbnailSignature: thumbnailSignature === undefined ? prev.thumbnailSignature : thumbnailSignature,
      thumbnailUpdatedAt: thumbnailUpdatedAt === undefined ? prev.thumbnailUpdatedAt : thumbnailUpdatedAt,
      state: (state === undefined ? prev.state : (state as CollageSnapshot | null)),
    };
  }
  saveProjectsArray(projects);
}

// Transform a live collage editing state into a persisted snapshot that is
// compact but sufficient to restore perfectly regardless of screen size.
// images: store libraryKey when present, else store the exact URL (data: OK for <=5 images)
export function buildSnapshotFromState({
  selectedImages,
  panelImageMapping,
  panelTransforms,
  panelTexts,
  selectedTemplate,
  selectedAspectRatio,
  panelCount,
  borderThickness,
  borderColor,
  customLayout,
  // Optional: capture the live preview canvas size to scale transforms correctly when rendering thumbnails
  canvasWidth,
  canvasHeight,
}: {
  selectedImages: Array<
    | string
    | {
        originalUrl?: string;
        displayUrl?: string;
        metadata?: { libraryKey?: string };
        subtitle?: string;
        subtitleShowing?: boolean;
      }
  >;
  panelImageMapping: Record<string, number> | undefined;
  panelTransforms: Record<string, unknown> | undefined;
  panelTexts: Record<string, unknown> | undefined;
  selectedTemplate: { id?: string } | null | undefined;
  selectedAspectRatio: string | undefined;
  panelCount: number | undefined;
  borderThickness?: number | string;
  borderColor?: string;
  customLayout?: unknown;
  canvasWidth?: number;
  canvasHeight?: number;
}): CollageSnapshot {
  const images = (selectedImages || []).map((img) => {
    const ref: { libraryKey?: string; url?: string; subtitle?: string; subtitleShowing?: boolean } = {};
    if (typeof img === 'string') {
      ref.url = img;
      return ref;
    }
    const maybeMeta = img?.metadata;
    if (maybeMeta && typeof maybeMeta.libraryKey === 'string') {
      ref.libraryKey = maybeMeta.libraryKey;
    }
    // Store one URL fallback for non-library images (data: or http(s): both supported)
    // Prefer originalUrl if present.
    const originalUrl = img?.originalUrl;
    const displayUrl = img?.displayUrl;
    if (!ref.libraryKey) {
      ref.url = originalUrl || displayUrl || '';
    }
    const subtitle = img?.subtitle;
    if (typeof subtitle === 'string' && subtitle.length > 0) ref.subtitle = subtitle;
    const subtitleShowing = img?.subtitleShowing;
    if (typeof subtitleShowing === 'boolean') ref.subtitleShowing = !!subtitleShowing;
    return ref;
  });

  return {
    version: 1,
    images,
    panelImageMapping: panelImageMapping || {},
    panelTransforms: panelTransforms || {},
    panelTexts: panelTexts || {},
    selectedTemplateId: selectedTemplate?.id || null,
    selectedAspectRatio: (selectedAspectRatio ?? 'square') as AspectRatio,
    panelCount: panelCount || 2,
    borderThickness,
    borderColor,
    // Persist custom layout grid when user drags inner borders
    customLayout: customLayout || null,
    // Persist the preview canvas size used when saving so thumbnails can scale pixel-based transforms
    canvasWidth: typeof canvasWidth === 'number' ? canvasWidth : undefined,
    canvasHeight: typeof canvasHeight === 'number' ? canvasHeight : undefined,
  };
}

export function getProjectRecord(id: string): CollageProject | null {
  // Back-compat alias used by existing JS imports
  return getProject(id);
}
