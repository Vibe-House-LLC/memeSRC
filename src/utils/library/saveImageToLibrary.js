import { put } from './storage';
import { resizeImage } from './resizeImage';

function inferExtensionFromType(type) {
  if (!type) return 'jpg';
  const slash = type.indexOf('/');
  if (slash === -1) return 'jpg';
  return type.slice(slash + 1);
}

function sanitizeFilename(name) {
  return (name || 'image').toString().replace(/[^a-zA-Z0-9-_]/g, '-');
}

function generateKey(filename, blob) {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).slice(2);
  const cleanBase = sanitizeFilename(filename || 'collage-image');
  const ext = inferExtensionFromType(blob?.type) || 'jpg';
  return `library/${timestamp}-${randomId}-${cleanBase}.${ext}`;
}

/**
 * Save an image to the library. Accepts a Blob/File or a dataURL string.
 * Returns the S3 key string.
 */
export async function saveImageToLibrary(input, filename = null, { level = 'protected' } = {}) {
  let blob;
  if (typeof input === 'string') {
    // dataURL
    const res = await fetch(input);
    blob = await res.blob();
  } else {
    blob = input;
  }

  // Resize client-side; fall back to original on failure
  let toUpload;
  try {
    toUpload = await resizeImage(blob);
  } catch {
    toUpload = blob;
  }

  const key = generateKey(filename, toUpload);
  await put(key, toUpload, { level });
  return key;
}