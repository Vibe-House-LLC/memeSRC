// Lightweight localStorage-backed persistence for collage projects
// Stores only what’s needed to perfectly reproduce a collage across screen sizes.

const STORAGE_KEY = 'memeSRC_collageProjects_v1';

// Read all projects
export function loadProjects() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr;
  } catch (_) {
    return [];
  }
}

// Write all projects
function saveProjectsArray(projects) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  } catch (_) {
    // ignore
  }
}

// Create a new project shell
export function createProject({ name } = {}) {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const ts = new Date().toISOString();
  const project = {
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

export function getProject(id) {
  return loadProjects().find(p => p.id === id) || null;
}

export function deleteProject(id) {
  const projects = loadProjects().filter(p => p.id !== id);
  saveProjectsArray(projects);
}

// Insert or update a project record by id. Accepts partial fields.
export function upsertProject(id, { name, thumbnail, thumbnailKey, thumbnailSignature, thumbnailUpdatedAt, state }) {
  const projects = loadProjects();
  const ts = new Date().toISOString();
  const idx = projects.findIndex(p => p.id === id);
  if (idx === -1) {
    // create new if missing
    const project = {
      id,
      name: name || 'Untitled Collage',
      createdAt: ts,
      updatedAt: ts,
      thumbnail: thumbnail || null,
      thumbnailKey: thumbnailKey || null,
      thumbnailSignature: thumbnailSignature || null,
      thumbnailUpdatedAt: thumbnailUpdatedAt || ts,
      state: state || null,
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
      state: state === undefined ? prev.state : state,
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
}) {
  const images = (selectedImages || []).map(img => {
    const ref = {};
    if (img?.metadata?.libraryKey) ref.libraryKey = img.metadata.libraryKey;
    // Store one URL fallback for non-library images (data: or http(s): both supported)
    // Prefer originalUrl if present.
    if (!ref.libraryKey) {
      ref.url = img?.originalUrl || img?.displayUrl || '';
    }
    if (img?.subtitle) ref.subtitle = img.subtitle;
    if (typeof img?.subtitleShowing === 'boolean') ref.subtitleShowing = img.subtitleShowing;
    return ref;
  });

  return {
    version: 1,
    images,
    panelImageMapping: panelImageMapping || {},
    panelTransforms: panelTransforms || {},
    panelTexts: panelTexts || {},
    selectedTemplateId: selectedTemplate?.id || null,
    selectedAspectRatio: selectedAspectRatio || 'square',
    panelCount: panelCount || 2,
    borderThickness,
    borderColor,
    // Persist custom layout grid when user drags inner borders
    customLayout: customLayout || null,
  };
}
