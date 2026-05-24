// Preload per-message sender avatars. Same CORS-safe pattern as the other
// formats; messages with no avatar src skip preload and fall back to a
// colored initial-letter placeholder at paint time.

import type { EmailThread } from '../types';

export type ImageMap = Map<string, HTMLImageElement | null>;

export interface PreloadResult {
  images: ImageMap;
  failed: string[];
}

export function collectSrcs(thread: EmailThread): string[] {
  const srcs: string[] = [];
  for (const msg of thread.messages) {
    if (msg.senderAvatar.src) srcs.push(msg.senderAvatar.src);
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

export async function preloadImages(thread: EmailThread): Promise<PreloadResult> {
  const srcs = collectSrcs(thread);
  const entries = await Promise.all(
    srcs.map(async (src) => [src, await loadImage(src)] as const),
  );
  const images: ImageMap = new Map(entries);
  const failed = entries.filter(([, img]) => img === null).map(([src]) => src);
  return { images, failed };
}
