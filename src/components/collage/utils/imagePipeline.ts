import { resizeImage } from '../../../utils/library/resizeImage';
import { EDITOR_IMAGE_MAX_DIMENSION_PX, UPLOAD_IMAGE_MAX_DIMENSION_PX } from '../../../constants/imageProcessing';

export type TrackedImageObject = {
  originalUrl?: string;
  displayUrl?: string;
};

export type NormalizeImageOptions = {
  uploadMaxDimensionPx?: number;
  editorMaxDimensionPx?: number;
  trackBlobUrl?: (url: string) => string;
};

export type NormalizedImageResult = {
  originalUrl: string;
  displayUrl: string;
  sourceBlob?: Blob;
  uploadBlob?: Blob;
  editorBlob?: Blob;
};

export const isBlobUrl = (value: unknown): value is string => (
  typeof value === 'string' && value.startsWith('blob:')
);

export const toDataUrl = (blob: Blob): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result || ''));
  reader.onerror = () => reject(reader.error || new Error('Failed to convert blob to data URL'));
  reader.readAsDataURL(blob);
});

export const revokeIfBlobUrl = (url: unknown): void => {
  if (!isBlobUrl(url)) return;
  if (typeof URL === 'undefined' || typeof URL.revokeObjectURL !== 'function') return;

  try {
    URL.revokeObjectURL(url);
  } catch (_) {
    // no-op
  }
};

export const revokeImageObjectUrls = (imageObj: TrackedImageObject | null | undefined): void => {
  if (!imageObj) return;
  revokeIfBlobUrl(imageObj.originalUrl);
  revokeIfBlobUrl(imageObj.displayUrl);
};

export type BlobUrlTracker = {
  track: <T extends string | null | undefined>(url: T) => T;
  revokeAll: () => void;
  clear: () => void;
  values: () => string[];
};

export const createBlobUrlTracker = (): BlobUrlTracker => {
  const tracked = new Set<string>();

  return {
    track: (url) => {
      if (isBlobUrl(url)) {
        tracked.add(url);
      }
      return url;
    },
    revokeAll: () => {
      tracked.forEach((url) => revokeIfBlobUrl(url));
      tracked.clear();
    },
    clear: () => {
      tracked.clear();
    },
    values: () => Array.from(tracked),
  };
};

export const createObjectOrDataUrl = async (
  blob: Blob,
  trackBlobUrl?: (url: string) => string
): Promise<string> => {
  if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
    const nextUrl = URL.createObjectURL(blob);
    return trackBlobUrl ? trackBlobUrl(nextUrl) : nextUrl;
  }

  return toDataUrl(blob);
};

export const normalizeImageFromBlob = async (
  blob: Blob,
  options: NormalizeImageOptions = {}
): Promise<NormalizedImageResult> => {
  const uploadMaxDimensionPx = options.uploadMaxDimensionPx ?? UPLOAD_IMAGE_MAX_DIMENSION_PX;
  const editorMaxDimensionPx = options.editorMaxDimensionPx ?? EDITOR_IMAGE_MAX_DIMENSION_PX;

  const uploadBlob = await resizeImage(blob, uploadMaxDimensionPx);
  const originalUrl = await createObjectOrDataUrl(uploadBlob, options.trackBlobUrl);

  const editorBlob = await resizeImage(uploadBlob, editorMaxDimensionPx);
  const displayUrl = await createObjectOrDataUrl(editorBlob, options.trackBlobUrl);

  return {
    originalUrl,
    displayUrl,
    sourceBlob: blob,
    uploadBlob,
    editorBlob,
  };
};

export const buildImageObjectFromFile = async (
  file: Blob,
  options: NormalizeImageOptions = {}
): Promise<NormalizedImageResult> => {
  try {
    return await normalizeImageFromBlob(file, options);
  } catch (_) {
    const fallbackUrl = await createObjectOrDataUrl(file, options.trackBlobUrl);
    return {
      originalUrl: fallbackUrl,
      displayUrl: fallbackUrl,
      sourceBlob: file,
    };
  }
};

export const nextFrame = (): Promise<void> => new Promise((resolve) => {
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(() => resolve());
    return;
  }
  setTimeout(resolve, 0);
});

export const yieldFrames = async (count = 1): Promise<void> => {
  const total = Number.isFinite(count) ? Math.max(1, Math.floor(count)) : 1;
  for (let i = 0; i < total; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await nextFrame();
  }
};
