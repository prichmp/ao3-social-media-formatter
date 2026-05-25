// Avatar preload for the iMessage canvas renderer. Same CORS-safe pattern
// as the twitter equivalent: load with `crossOrigin = 'anonymous'`, resolve
// null on failure so a single broken avatar doesn't take the whole render
// down with it.

import type { IMessageChain } from '../types';

export type ImageMap = Map<string, HTMLImageElement | null>;

export interface PreloadResult {
  images: ImageMap;
  failed: string[];
}

export function collectSrcs(chain: IMessageChain): string[] {
  const srcs: string[] = [];
  if (chain.contactAvatar.src) srcs.push(chain.contactAvatar.src);
  for (const msg of chain.messages) {
    if (msg.senderAvatar.src) srcs.push(msg.senderAvatar.src);
    switch (msg.content.type) {
      case 'image': if (msg.content.image.src)     srcs.push(msg.content.image.src);     break;
      case 'video': if (msg.content.thumbnail.src) srcs.push(msg.content.thumbnail.src); break;
      case 'text':  break;
    }
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

export async function preloadImages(chain: IMessageChain): Promise<PreloadResult> {
  const srcs = collectSrcs(chain);
  const entries = await Promise.all(
    srcs.map(async (src) => [src, await loadImage(src)] as const),
  );
  const images: ImageMap = new Map(entries);
  const failed = entries.filter(([, img]) => img === null).map(([src]) => src);
  return { images, failed };
}
