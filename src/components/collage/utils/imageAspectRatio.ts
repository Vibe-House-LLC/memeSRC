export const DEFAULT_CUSTOM_ASPECT_RATIO = 1;

export function normalizeAspectRatioValue(
  value: unknown,
  fallback = DEFAULT_CUSTOM_ASPECT_RATIO
): number {
  const parsedValue = Number(value);
  if (!Number.isFinite(parsedValue) || parsedValue <= 0) return fallback;
  return Math.max(0.1, Math.min(10, parsedValue));
}

export function getImageAspectRatio(
  sourceUrl: string,
  fallback = DEFAULT_CUSTOM_ASPECT_RATIO
): Promise<number> {
  return new Promise((resolve) => {
    if (typeof sourceUrl !== 'string' || !sourceUrl || typeof Image === 'undefined') {
      resolve(fallback);
      return;
    }

    const image = new Image();
    image.onload = () => {
      const width = Number(image.naturalWidth || 0);
      const height = Number(image.naturalHeight || 0);
      if (width > 0 && height > 0) {
        resolve(normalizeAspectRatioValue(width / height, fallback));
        return;
      }
      resolve(fallback);
    };
    image.onerror = () => resolve(fallback);
    image.src = sourceUrl;
  });
}
