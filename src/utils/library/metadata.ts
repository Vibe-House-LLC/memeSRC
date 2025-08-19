import { get, put } from './storage';

const METADATA_PREFIX = 'library-meta/';

function encodeKeyForPath(key: string): string {
  try {
    const base64 = typeof btoa === 'function'
      ? btoa(unescape(encodeURIComponent(key)))
      : Buffer.from(key, 'utf8').toString('base64');
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  } catch (_) {
    // Fallback: make it path-safe without encoding
    return key.replace(/\//g, '_');
  }
}

function getMetadataObjectKeyForImageKey(imageKey: string): string {
  const encoded = encodeKeyForPath(imageKey);
  return `${METADATA_PREFIX}${encoded}.json`;
}

export type LibraryMetadata = {
  tags: string[];
  description: string;
  defaultCaption: string;
};

export const DEFAULT_LIBRARY_METADATA: LibraryMetadata = {
  tags: [],
  description: '',
  defaultCaption: '',
};

export async function getMetadataForKey(
  imageKey: string,
  { level = 'protected' }: { level?: string } = {}
): Promise<LibraryMetadata> {
  if (!imageKey) return { ...DEFAULT_LIBRARY_METADATA };
  try {
    const metaKey = getMetadataObjectKeyForImageKey(imageKey);
    const blob = await get(metaKey, { level });
    const text = await blob.text();
    const json = JSON.parse(text);
    return { ...DEFAULT_LIBRARY_METADATA, ...json } as LibraryMetadata;
  } catch (_) {
    return { ...DEFAULT_LIBRARY_METADATA };
  }
}

export async function putMetadataForKey(
  imageKey: string,
  metadata: Partial<LibraryMetadata>,
  { level = 'protected' }: { level?: string } = {}
): Promise<LibraryMetadata> {
  if (!imageKey) return { ...DEFAULT_LIBRARY_METADATA };
  const metaKey = getMetadataObjectKeyForImageKey(imageKey);
  const merged = { ...DEFAULT_LIBRARY_METADATA, ...(metadata || {}) } as LibraryMetadata;
  const body = new Blob([JSON.stringify(merged)], { type: 'application/json' });
  await put(metaKey, body as Blob, { level, contentType: 'application/json' });
  return merged;
}

