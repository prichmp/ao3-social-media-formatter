// Image preloading for the canvas renderer.
//
// Every image is loaded with `crossOrigin = 'anonymous'` so that drawing it
// onto the canvas does not taint it (which would make toBlob/toDataURL throw).
// Hosts that don't send CORS headers cause `onerror` to fire instead of
// loading a tainted image, so a failed load is a clean, recoverable signal.

import type { TweetAttachment, TwitterPost } from '../types';

export type ImageMap = Map<string, HTMLImageElement | null>;

export interface PreloadResult {
  images: ImageMap;
  /** URLs that failed to load (broken link or host without CORS support). */
  failed: string[];
}

/** Every distinct image URL referenced by a post, in no particular order. */
export function collectSrcs(post: TwitterPost): string[] {
  const srcs: string[] = [];
  const add = (src?: string) => {
    if (src) srcs.push(src);
  };

  const addAttachment = (att: TweetAttachment) => {
    switch (att.type) {
      case 'image': add(att.image.src); break;
      case 'quote': add(att.avatar.src); break;
      case 'video': add(att.thumbnail.src); break;
      case 'music': add(att.albumArt.src); break;
      case 'text': break;
    }
  };

  add(post.author.avatar.src);
  addAttachment(post.attachment);
  add(post.statIcons.reply.src);
  add(post.statIcons.retweet.src);
  add(post.statIcons.like.src);
  for (const reply of post.replies) {
    add(reply.avatar.src);
    addAttachment(reply.attachment);
  }

  return [...new Set(srcs)];
}

/** Load a single image; resolves `null` instead of rejecting on failure. */
export function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** Load every image a post references, in parallel. Never rejects. */
export async function preloadImages(post: TwitterPost): Promise<PreloadResult> {
  const srcs = collectSrcs(post);
  const entries = await Promise.all(
    srcs.map(async (src) => [src, await loadImage(src)] as const),
  );
  const images: ImageMap = new Map(entries);
  const failed = entries.filter(([, img]) => img === null).map(([src]) => src);
  return { images, failed };
}
