export type MockMagicEditOptions = {
  durationMs?: number;
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

/**
 * Mock an image edit by waiting for `durationMs` and overlaying the word
 * 'edited' at a random position on the image using a canvas.
 */
export async function mockMagicEdit(
  src: string,
  _prompt: string,
  onProgress?: (progress: number) => void,
  options?: MockMagicEditOptions
): Promise<string> {
  const durationMs = options?.durationMs ?? 3000; // default 3s
  const start = Date.now();

  // Simulate progress during the wait
  await new Promise<void>((resolve) => {
    const tickMs = 100;
    const timer = setInterval(() => {
      const elapsed = Date.now() - start;
      const p = Math.min(1, elapsed / durationMs);
      if (typeof onProgress === 'function') onProgress(Math.round(p * 100));
      if (elapsed >= durationMs) {
        clearInterval(timer);
        resolve();
      }
    }, tickMs);
  });

  const img = await loadImage(src);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');

  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  // Choose a font size relative to the image width
  const baseSize = Math.max(18, Math.min(64, Math.floor(canvas.width * 0.06)));
  ctx.font = `${baseSize}px sans-serif`;
  ctx.textBaseline = 'top';
  const text = 'edited';
  const metrics = ctx.measureText(text);
  const textW = metrics.width;
  const textH = baseSize; // approximate line-height

  // Choose a random position that stays within the image with padding
  const pad = Math.max(8, Math.floor(baseSize * 0.3));
  const maxX = Math.max(pad, canvas.width - textW - pad);
  const maxY = Math.max(pad, canvas.height - textH - pad);
  const rand = (min: number, max: number) => Math.floor(min + Math.random() * (max - min));
  const x = rand(pad, maxX);
  const y = rand(pad, maxY);

  // Draw a readable overlay (shadow + stroke)
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = Math.ceil(baseSize * 0.2);
  ctx.lineWidth = Math.max(2, Math.floor(baseSize * 0.08));
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.fillStyle = '#ffffff';
  ctx.strokeText(text, x, y);
  ctx.fillText(text, x, y);
  ctx.restore();

  try {
    return canvas.toDataURL('image/png');
  } catch (err) {
    // Most likely a CORS/tainted canvas issue when source image lacks CORS headers.
    const msg = err instanceof Error ? err.message : 'Canvas export failed (likely CORS)';
    throw new Error(`Magic edit failed to export image: ${msg}`);
  }
}
