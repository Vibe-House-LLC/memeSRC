/**
 * Resize an image Blob/File using an offscreen canvas.
 * SSR-safe: if window/document not available, returns the original blob.
 * TODO: Handle EXIF orientation
 */
function maybeSupportsAlpha(mimeType: string): boolean {
  const safeType = (mimeType || '').toLowerCase();
  return (
    safeType === 'image/png' ||
    safeType === 'image/webp' ||
    safeType === 'image/gif' ||
    safeType === 'image/avif' ||
    safeType === 'image/svg+xml'
  );
}

function hasTransparentPixels(ctx: CanvasRenderingContext2D, width: number, height: number): boolean {
  try {
    const { data } = ctx.getImageData(0, 0, width, height);
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < 255) return true;
    }
  } catch (_) {
    // If pixels are unreadable for any reason, keep legacy behavior.
  }
  return false;
}

export function resizeImage(file: Blob, maxSize = 1500, quality = 0.85): Promise<Blob> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.resolve(file);
  }
  return new Promise((resolve) => {
    try {
      const img = new Image();
      const url = URL.createObjectURL(file);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      img.onload = () => {
        try {
          const width = (img as any).naturalWidth || img.width;
          const height = (img as any).naturalHeight || img.height;
          let newWidth = width;
          let newHeight = height;
          if (width >= height) {
            if (width > maxSize) {
              newWidth = maxSize;
              newHeight = Math.round((height * maxSize) / width);
            }
          } else if (height > maxSize) {
            newHeight = maxSize;
            newWidth = Math.round((width * maxSize) / height);
          }
          canvas.width = newWidth;
          canvas.height = newHeight;
          // ctx can be null; fallback to original file if so
          if (!ctx) {
            try { URL.revokeObjectURL(url); } catch (_) { /* ignore revoke errors */ }
            resolve(file);
            return;
          }

          ctx.drawImage(img, 0, 0, newWidth, newHeight);
          const sourceMimeType = (file as any)?.type || '';
          const shouldPreserveTransparency = maybeSupportsAlpha(sourceMimeType)
            && hasTransparentPixels(ctx, newWidth, newHeight);

          // JPEG does not support alpha, so flatten to white for non-transparent outputs.
          if (!shouldPreserveTransparency) {
            try {
              ctx.globalCompositeOperation = 'destination-over';
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(0, 0, newWidth, newHeight);
              ctx.globalCompositeOperation = 'source-over';
            } catch (_) {
              // Ignore flattening errors; toBlob fallback below will handle failures.
            }
          }

          const outputType = shouldPreserveTransparency ? 'image/png' : 'image/jpeg';
          const outputQuality = shouldPreserveTransparency ? undefined : quality;
          canvas.toBlob(
            (blob) => {
              try {
                URL.revokeObjectURL(url);
              } catch (_) {
                // ignore revoke errors
              }
              if (blob) resolve(blob);
              else resolve(file);
            },
            outputType,
            outputQuality
          );
        } catch (e) {
          try {
            URL.revokeObjectURL(url);
          } catch (_) {
            // ignore revoke errors
          }
          resolve(file);
        }
      };
      img.onerror = () => {
        try {
          URL.revokeObjectURL(url);
        } catch (_) {
          // ignore revoke errors
        }
        resolve(file);
      };
      img.src = url;
    } catch (e) {
      resolve(file);
    }
  });
}
