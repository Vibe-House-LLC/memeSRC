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

export type LibraryFrameRef = {
  cid: string;
  season?: string | number;
  episode?: string | number;
  frame?: string | number;
  fineTuningIndex?: string | number | null;
};

export type LibraryMetadata = {
  tags: string[];
  description: string;
  defaultCaption: string;
  frameRef: LibraryFrameRef | null;
  [key: string]: unknown;
};

export const DEFAULT_LIBRARY_METADATA: LibraryMetadata = {
  tags: [],
  description: '',
  defaultCaption: '',
  frameRef: null,
};

function normalizeFrameRef(raw: unknown): LibraryFrameRef | null {
  if (!raw || typeof raw !== 'object') return null;
  const value = raw as Record<string, unknown>;
  if (!value.cid) return null;

  const normalized: LibraryFrameRef = {
    cid: String(value.cid),
  };

  if (value.season !== undefined && value.season !== null) {
    normalized.season = typeof value.season === 'number' ? value.season : String(value.season);
  }
  if (value.episode !== undefined && value.episode !== null) {
    normalized.episode = typeof value.episode === 'number' ? value.episode : String(value.episode);
  }
  if (value.frame !== undefined && value.frame !== null) {
    normalized.frame = typeof value.frame === 'number' ? value.frame : String(value.frame);
  }
  if (value.fineTuningIndex !== undefined && value.fineTuningIndex !== null) {
    normalized.fineTuningIndex = typeof value.fineTuningIndex === 'number'
      ? value.fineTuningIndex
      : String(value.fineTuningIndex);
  }

  return normalized;
}

export async function getMetadataForKey(
  imageKey: string,
  { level = 'private' }: { level?: string } = {}
): Promise<LibraryMetadata> {
  if (!imageKey) return { ...DEFAULT_LIBRARY_METADATA };
  try {
    const metaKey = getMetadataObjectKeyForImageKey(imageKey);
    const blob = await get(metaKey, { level });
    const text = await blob.text();
    const json = JSON.parse(text) as Record<string, unknown>;
    const frameRef = normalizeFrameRef(json.frameRef);
    return {
      ...DEFAULT_LIBRARY_METADATA,
      ...json,
      frameRef,
    } as LibraryMetadata;
  } catch (_) {
    return { ...DEFAULT_LIBRARY_METADATA };
  }
}

export async function putMetadataForKey(
  imageKey: string,
  metadata: Partial<LibraryMetadata>,
  { level = 'private' }: { level?: string } = {}
): Promise<LibraryMetadata> {
  if (!imageKey) return { ...DEFAULT_LIBRARY_METADATA };
  const metaKey = getMetadataObjectKeyForImageKey(imageKey);
  const merged = {
    ...DEFAULT_LIBRARY_METADATA,
    ...(metadata || {}),
  } as LibraryMetadata;
  merged.frameRef = normalizeFrameRef((metadata || {}).frameRef) ?? null;
  const body = new Blob([JSON.stringify(merged)], { type: 'application/json' });
  await put(metaKey, body as Blob, { level, contentType: 'application/json' });
  return merged;
}
