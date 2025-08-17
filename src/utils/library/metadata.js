import { get, put } from './storage';

const METADATA_PREFIX = 'library-meta/';

function encodeKeyForPath(key) {
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

function getMetadataObjectKeyForImageKey(imageKey) {
  const encoded = encodeKeyForPath(imageKey);
  return `${METADATA_PREFIX}${encoded}.json`;
}

export const DEFAULT_LIBRARY_METADATA = {
  tags: [],
  description: '',
  defaultCaption: '',
};

export async function getMetadataForKey(imageKey, { level = 'protected' } = {}) {
  if (!imageKey) return { ...DEFAULT_LIBRARY_METADATA };
  try {
    const metaKey = getMetadataObjectKeyForImageKey(imageKey);
    const blob = await get(metaKey, { level });
    const text = await blob.text();
    const json = JSON.parse(text);
    return { ...DEFAULT_LIBRARY_METADATA, ...json };
  } catch (_) {
    return { ...DEFAULT_LIBRARY_METADATA };
  }
}

export async function putMetadataForKey(imageKey, metadata, { level = 'protected' } = {}) {
  if (!imageKey) return { ...DEFAULT_LIBRARY_METADATA };
  const metaKey = getMetadataObjectKeyForImageKey(imageKey);
  const merged = { ...DEFAULT_LIBRARY_METADATA, ...(metadata || {}) };
  const body = new Blob([JSON.stringify(merged)], { type: 'application/json' });
  await put(metaKey, body, { level, contentType: 'application/json' });
  return merged;
}


