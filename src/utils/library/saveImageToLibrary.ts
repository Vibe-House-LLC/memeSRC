import { put } from './storage';
import { putMetadataForKey } from './metadata';
import { resizeImage } from './resizeImage';

function inferExtensionFromType(type?: string | null): string {
  if (!type) return 'jpg';
  const slash = type.indexOf('/');
  if (slash === -1) return 'jpg';
  return type.slice(slash + 1);
}

function sanitizeFilename(name?: string | null): string {
  return (name || 'image').toString().replace(/[^a-zA-Z0-9-_]/g, '-');
}

function generateKey(filename: string | null, blob: Blob): string {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).slice(2);
  const cleanBase = sanitizeFilename(filename || 'collage-image');
  const ext = inferExtensionFromType((blob as any)?.type) || 'jpg';
  return `library/${timestamp}-${randomId}-${cleanBase}.${ext}`;
}

/**
 * Save an image to the library. Accepts a Blob/File or a dataURL string.
 * Returns the S3 key string.
 */
export async function saveImageToLibrary(
  input: Blob | string,
  filename: string | null = null,
  { level = 'protected', metadata }: { level?: string; metadata?: Record<string, any> } = {}
): Promise<string> {
  let blob: Blob;
  if (typeof input === 'string') {
    // dataURL
    const res = await fetch(input);
    blob = await res.blob();
  } else {
    blob = input;
  }

  // Resize client-side to max 1000px; fall back to original on failure
  let toUpload: Blob;
  try {
    toUpload = await resizeImage(blob, 1000);
  } catch {
    toUpload = blob;
  }

  const key = generateKey(filename, toUpload);
  await put(key, toUpload, { level });
  if (metadata && typeof metadata === 'object') {
    try {
      await putMetadataForKey(key, metadata as any, { level });
    } catch (_) {
      /* ignore metadata failures */
    }
  }
  return key;
}

