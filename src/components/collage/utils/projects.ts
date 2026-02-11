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
  selectedStickers,
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
  panelDimensions,
}: {
  selectedImages: Array<
    | string
    | {
        originalUrl?: string;
        displayUrl?: string;
        metadata?: { libraryKey?: string; sourceUrl?: string };
        subtitle?: string;
        subtitleShowing?: boolean;
      }
  >;
  selectedStickers?: Array<
    | string
    | {
        id?: string;
        originalUrl?: string;
        thumbnailUrl?: string;
        aspectRatio?: number;
        widthPercent?: number;
        xPercent?: number;
        yPercent?: number;
        metadata?: { libraryKey?: string; sourceUrl?: string };
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
  panelDimensions?: Record<string, { width: number; height: number } | null> | null;
}): CollageSnapshot {
  const images = (selectedImages || []).map((img) => {
    const ref: { libraryKey?: string; url?: string; subtitle?: string; subtitleShowing?: boolean } = {};
    const isBlobUrl = (value: unknown): value is string => typeof value === 'string' && value.startsWith('blob:');
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
    const sourceUrlFromMetadata =
      maybeMeta && typeof maybeMeta.sourceUrl === 'string' && maybeMeta.sourceUrl.trim()
        ? maybeMeta.sourceUrl
        : '';
    if (!ref.libraryKey) {
      const persistableOriginal = !isBlobUrl(originalUrl) ? originalUrl : '';
      const persistableDisplay = !isBlobUrl(displayUrl) ? displayUrl : '';
      ref.url = persistableOriginal || persistableDisplay || sourceUrlFromMetadata || originalUrl || displayUrl || '';
    }
    const subtitle = img?.subtitle;
    if (typeof subtitle === 'string' && subtitle.length > 0) ref.subtitle = subtitle;
    const subtitleShowing = img?.subtitleShowing;
    if (typeof subtitleShowing === 'boolean') ref.subtitleShowing = !!subtitleShowing;
    return ref;
  });

  const stickers = (selectedStickers || []).map((sticker, index) => {
    const ref: {
      id?: string;
      libraryKey?: string;
      url?: string;
      thumbnailUrl?: string;
      aspectRatio?: number;
      angleDeg?: number;
      widthPercent?: number;
      xPercent?: number;
      yPercent?: number;
      metadata?: { [key: string]: unknown };
    } = {};
    const isBlobUrl = (value: unknown): value is string => typeof value === 'string' && value.startsWith('blob:');

    if (typeof sticker === 'string') {
      ref.id = `sticker-${index + 1}`;
      ref.url = sticker;
      return ref;
    }

    const maybeMeta = sticker?.metadata;
    if (typeof sticker?.id === 'string' && sticker.id.trim()) {
      ref.id = sticker.id.trim();
    } else {
      ref.id = `sticker-${index + 1}`;
    }

    if (maybeMeta && typeof maybeMeta === 'object' && Object.keys(maybeMeta).length > 0) {
      ref.metadata = { ...maybeMeta };
    }

    if (maybeMeta && typeof maybeMeta.libraryKey === 'string') {
      ref.libraryKey = maybeMeta.libraryKey;
    }

    const originalUrl = sticker?.originalUrl;
    const thumbnailUrl = sticker?.thumbnailUrl;
    const sourceUrlFromMetadata =
      maybeMeta && typeof maybeMeta.sourceUrl === 'string' && maybeMeta.sourceUrl.trim()
        ? maybeMeta.sourceUrl
        : '';
    const persistableOriginal = !isBlobUrl(originalUrl) ? originalUrl : '';
    const persistableThumb = !isBlobUrl(thumbnailUrl) ? thumbnailUrl : '';

    if (!ref.libraryKey) {
      ref.url = persistableOriginal || persistableThumb || sourceUrlFromMetadata || originalUrl || thumbnailUrl || '';
    } else if (persistableOriginal) {
      // Keep a fallback even when libraryKey exists for resilience.
      ref.url = persistableOriginal;
    }

    if (persistableThumb) {
      ref.thumbnailUrl = persistableThumb;
    }

    const aspectRatio = Number(sticker?.aspectRatio);
    if (Number.isFinite(aspectRatio) && aspectRatio > 0) ref.aspectRatio = aspectRatio;
    const angleDeg = Number((sticker as { angleDeg?: number } | undefined)?.angleDeg);
    if (Number.isFinite(angleDeg)) ref.angleDeg = angleDeg;
    const widthPercent = Number(sticker?.widthPercent);
    if (Number.isFinite(widthPercent)) ref.widthPercent = widthPercent;
    const xPercent = Number(sticker?.xPercent);
    if (Number.isFinite(xPercent)) ref.xPercent = xPercent;
    const yPercent = Number(sticker?.yPercent);
    if (Number.isFinite(yPercent)) ref.yPercent = yPercent;

    return ref;
  });

  return {
    version: 1,
    images,
    stickers,
    panelImageMapping: panelImageMapping || {},
    panelTransforms: panelTransforms || {},
    panelTexts: panelTexts || {},
    selectedTemplateId: selectedTemplate?.id || null,
    selectedAspectRatio: (selectedAspectRatio ?? 'square') as AspectRatio,
    panelCount: panelCount || 1,
    borderThickness,
    borderColor,
    // Persist custom layout grid when user drags inner borders
    customLayout: customLayout || null,
    // Persist the preview canvas size used when saving so thumbnails can scale pixel-based transforms
    canvasWidth: typeof canvasWidth === 'number' ? canvasWidth : undefined,
    canvasHeight: typeof canvasHeight === 'number' ? canvasHeight : undefined,
    panelDimensions: (() => {
      if (!panelDimensions || typeof panelDimensions !== 'object') return undefined;
      const entries = Object.entries(panelDimensions).filter(([, value]) => value && typeof value.width === 'number' && typeof value.height === 'number');
      if (entries.length === 0) return undefined;
      return entries.reduce((acc, [panelId, value]) => {
        acc[panelId] = { width: value.width, height: value.height };
        return acc;
      }, {} as Record<string, { width: number; height: number }>);
    })(),
  };
}

export function getProjectRecord(id: string): CollageProject | null {
  // Back-compat alias used by existing JS imports
  return getProject(id);
}
