// Preload the streamer avatar and stream thumbnail. Same CORS-safe pattern
// as the other formats; nothing in chat carries images.

import type { LivestreamSegment } from '../types';

export type ImageMap = Map<string, HTMLImageElement | null>;

export interface PreloadResult {
  images: ImageMap;
  failed: string[];
}

export function collectSrcs(segment: LivestreamSegment): string[] {
  const srcs: string[] = [];
  if (segment.streamer.avatar.src) srcs.push(segment.streamer.avatar.src);
  if (segment.thumbnail.src)       srcs.push(segment.thumbnail.src);
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

export async function preloadImages(segment: LivestreamSegment): Promise<PreloadResult> {
  const srcs = collectSrcs(segment);
  const entries = await Promise.all(
    srcs.map(async (src) => [src, await loadImage(src)] as const),
  );
  const images: ImageMap = new Map(entries);
  const failed = entries.filter(([, img]) => img === null).map(([src]) => src);
  return { images, failed };
}
