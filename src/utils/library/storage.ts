import { Storage } from 'aws-amplify';

// Default storage level for library
const DEFAULT_LEVEL = 'private';

type ListItem = { key: string; lastModified: string; size: number };

/**
 * List objects under a prefix
 */
export async function list(
  prefix = 'library/',
  { level = DEFAULT_LEVEL, pageSize = 1000 }: { level?: string; pageSize?: number } = {}
): Promise<ListItem[]> {
  // Clamp pageSize to Amplify's supported range 0-1000
  const safePageSize = Math.max(0, Math.min(1000, Number(pageSize) || 0));
  const result: any = await Storage.list(prefix, { level, pageSize: safePageSize } as any);
  const raw = (result?.results || result || []) as any[];
  const items = raw
    .map((entry: any) => ({
      key: entry.key || entry?.Key || entry?.key, // support various shapes
      lastModified: entry.lastModified || entry?.LastModified || entry?.lastModified || new Date().toISOString(),
      size: entry.size || entry?.Size || entry?.size || 0,
    }))
    .filter((x: any) => x.key) as ListItem[];
  items.sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());
  return items;
}

/**
 * Get a signed URL for an object
 */
export function getUrl(
  key: string,
  { level = DEFAULT_LEVEL, expires = 3600 }: { level?: string; expires?: number } = {}
): Promise<any> {
  return Storage.get(key, { level, expires } as any) as unknown as Promise<any>;
}

/**
 * Download the object bytes as a Blob
 */
export async function get(key: string, { level = DEFAULT_LEVEL }: { level?: string } = {}): Promise<Blob> {
  const downloadResult: any = await (Storage.get(key, { level, download: true } as any) as any);
  // Amplify returns different shapes depending on version
  if (downloadResult instanceof Blob) return downloadResult;
  if (downloadResult?.Body instanceof Blob) return downloadResult.Body as Blob;
  if (downloadResult instanceof ArrayBuffer) return new Blob([downloadResult]);
  if (downloadResult?.body instanceof ArrayBuffer) return new Blob([downloadResult.body]);
  if (downloadResult?.Body?.arrayBuffer) {
    const buf = await downloadResult.Body.arrayBuffer();
    return new Blob([buf]);
  }
  throw new Error(`Unexpected download result for ${key}`);
}

/**
 * Upload a Blob/File
 */
export async function put(
  key: string,
  blob: Blob,
  {
    level = DEFAULT_LEVEL,
    contentType,
    onProgress,
  }: { level?: string; contentType?: string; onProgress?: (pct: number) => void } = {}
): Promise<{ key: string; url: any }> {
  await Storage.put(key, blob, {
    level,
    contentType: contentType || (blob as any)?.type || 'application/octet-stream',
    cacheControl: 'max-age=31536000',
    progressCallback: (progress: any) => {
      if (onProgress && progress?.loaded && progress?.total) {
        const pct = (progress.loaded / progress.total) * 100;
        onProgress(pct);
      }
    },
  } as any);
  const url = await getUrl(key, { level });
  return { key, url };
}

/**
 * Remove an object
 */
export function remove(key: string, { level = DEFAULT_LEVEL }: { level?: string } = {}): Promise<any> {
  return Storage.remove(key, { level } as any) as unknown as Promise<any>;
}
