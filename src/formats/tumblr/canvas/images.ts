// Preload per-entry avatars + inline images. Same CORS-safe pattern as the
// other formats.

import type { TumblrPost } from '../types';

export type ImageMap = Map<string, HTMLImageElement | null>;

export interface PreloadResult {
  images: ImageMap;
  failed: string[];
}

export function collectSrcs(post: TumblrPost): string[] {
  const srcs: string[] = [];
  for (const entry of post.entries) {
    if (entry.avatar.src) srcs.push(entry.avatar.src);
    if (entry.image.src)  srcs.push(entry.image.src);
  }
  return [...new Set(srcs)];
}

export function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export async function preloadImages(post: TumblrPost): Promise<PreloadResult> {
  const srcs = collectSrcs(post);
  const entries = await Promise.all(
    srcs.map(async (src) => [src, await loadImage(src)] as const),
  );
  const images: ImageMap = new Map(entries);
  const failed = entries.filter(([, img]) => img === null).map(([src]) => src);
  return { images, failed };
}
