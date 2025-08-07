import { Storage } from 'aws-amplify';

// Default storage level for library
const DEFAULT_LEVEL = 'protected';

/**
 * List objects under a prefix
 */
export async function list(prefix = 'library/', { level = DEFAULT_LEVEL } = {}) {
  const result = await Storage.list(prefix, { level });
  const items = (result?.results || result || [])
    .map((entry) => ({
      key: entry.key || entry?.Key || entry?.key, // support various shapes
      lastModified: entry.lastModified || entry?.LastModified || entry?.lastModified || new Date().toISOString(),
      size: entry.size || entry?.Size || entry?.size || 0,
    }))
    .filter((x) => x.key);
  items.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
  return items;
}

/**
 * Get a signed URL for an object
 */
export function getUrl(key, { level = DEFAULT_LEVEL, expires = 3600 } = {}) {
  return Storage.get(key, { level, expires });
}

/**
 * Download the object bytes as a Blob
 */
export async function get(key, { level = DEFAULT_LEVEL } = {}) {
  const downloadResult = await Storage.get(key, { level, download: true });
  // Amplify returns different shapes depending on version
  if (downloadResult instanceof Blob) return downloadResult;
  if (downloadResult?.Body instanceof Blob) return downloadResult.Body;
  if (downloadResult instanceof ArrayBuffer) return new Blob([downloadResult]);
  if (downloadResult?.body instanceof ArrayBuffer) return new Blob([downloadResult.body]);
  throw new Error(`Unexpected download result for ${key}`);
}

/**
 * Upload a Blob/File
 */
export async function put(key, blob, { level = DEFAULT_LEVEL, contentType, onProgress } = {}) {
  await Storage.put(key, blob, {
    level,
    contentType: contentType || blob?.type || 'application/octet-stream',
    cacheControl: 'max-age=31536000',
    progressCallback: (progress) => {
      if (onProgress && progress?.loaded && progress?.total) {
        const pct = (progress.loaded / progress.total) * 100;
        onProgress(pct);
      }
    },
  });
  const url = await getUrl(key, { level });
  return { key, url };
}

/**
 * Remove an object
 */
export function remove(key, { level = DEFAULT_LEVEL } = {}) {
  return Storage.remove(key, { level });
}