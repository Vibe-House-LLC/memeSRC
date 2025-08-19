/**
 * Resize an image Blob/File using an offscreen canvas.
 * SSR-safe: if window/document not available, returns the original blob.
 * TODO: Handle EXIF orientation
 */
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
            (file as any).type || 'image/jpeg',
            quality
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
