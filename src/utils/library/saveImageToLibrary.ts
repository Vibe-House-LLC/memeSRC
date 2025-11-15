import { put } from './storage';
import { putMetadataForKey, type LibraryMetadata } from './metadata';
import { resizeImage } from './resizeImage';
import { UPLOAD_IMAGE_MAX_DIMENSION_PX } from '../../constants/imageProcessing';

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
  { level = 'private', metadata }: { level?: string; metadata?: Partial<LibraryMetadata> } = {}
): Promise<string> {
  let blob: Blob;
  if (typeof input === 'string') {
    // dataURL
    const res = await fetch(input);
    blob = await res.blob();
  } else {
    blob = input;
  }

  // Resize client-side using shared max; fall back to original on failure
  let toUpload: Blob;
  try {
    toUpload = await resizeImage(blob, UPLOAD_IMAGE_MAX_DIMENSION_PX);
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
