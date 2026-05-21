// Turns an uploaded image File into a resized, WebP-encoded data URL suitable
// for storing in app state (and therefore localStorage). Keeping images as
// same-origin data URLs also means they never taint the export canvas.

export interface ProcessedImage {
  /** data:image/webp;base64,… (or PNG if the browser can't encode WebP). */
  src: string;
  width: number;
  height: number;
}

/** Scale (w, h) down so neither side exceeds `max`, preserving aspect. Never upscales. */
export function fitWithin(w: number, h: number, max: number): { width: number; height: number } {
  if (w <= 0 || h <= 0) return { width: 0, height: 0 };
  if (w <= max && h <= max) return { width: w, height: h };
  const scale = max / Math.max(w, h);
  return { width: Math.round(w * scale), height: Math.round(h * scale) };
}

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('Could not read file'));
    reader.readAsDataURL(file);
  });
}

function decodeImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not decode image'));
    img.src = src;
  });
}

/**
 * Read an image file, resize it to fit within `maxSize` px on its longest edge,
 * and re-encode it as WebP. Resolves a data URL plus its final dimensions.
 */
export async function fileToWebp(
  file: File,
  maxSize: number,
  quality = 0.85,
): Promise<ProcessedImage> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Not an image file');
  }

  const original = await readAsDataURL(file);
  const img = await decodeImage(original);
  const { width, height } = fitWithin(
    img.naturalWidth || img.width,
    img.naturalHeight || img.height,
    maxSize,
  );

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, width);
  canvas.height = Math.max(1, height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No 2D context available');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  // toDataURL falls back to PNG on browsers that can't encode WebP.
  const src = canvas.toDataURL('image/webp', quality);
  return { src, width: canvas.width, height: canvas.height };
}
