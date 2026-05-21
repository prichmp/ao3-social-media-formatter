// Orchestrates a full render of a TwitterPost onto a canvas:
//   fonts ready → preload images → measure → size canvas → paint.
//
// The canvas is given a high-resolution backing store (≥2× and ≥ the device
// pixel ratio) so the same element is crisp on screen and good enough to
// download. Display size is left to CSS (the canvas has an intrinsic aspect
// ratio from its width/height attributes).

import type { TwitterPost } from '../types';
import type { RenderResult } from '../../types';
import { preloadImages } from './images';
import { layoutTweet, paintTweet } from './drawTweet';
import { theme } from './theme';

export type { RenderResult };

export async function renderTweetImage(
  canvas: HTMLCanvasElement,
  post: TwitterPost,
): Promise<RenderResult> {
  // Wait for web fonts so text metrics are correct on a cold load. The font
  // stack starts with system-ui so this is normally instant.
  if (typeof document !== 'undefined' && document.fonts?.ready) {
    try {
      await document.fonts.ready;
    } catch {
      /* ignore — fall through with whatever metrics we have */
    }
  }

  const { images, failed } = await preloadImages(post);

  // Measure pass on a throwaway context: sizing the real canvas clears it, so
  // layout must happen against a separate context first.
  const measureCanvas = document.createElement('canvas');
  const measureCtx = measureCanvas.getContext('2d');
  if (!measureCtx) {
    return { ok: false, width: 0, height: 0, failed, error: 'no-2d-context' };
  }

  const layout = layoutTweet(measureCtx, post, images);

  const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
  const scale = Math.max(dpr, theme.exportScale);

  canvas.width = Math.ceil(layout.width * scale);
  canvas.height = Math.ceil(layout.height * scale);

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return { ok: false, width: layout.width, height: layout.height, failed, error: 'no-2d-context' };
  }
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  paintTweet(ctx, layout);

  return { ok: true, width: layout.width, height: layout.height, failed };
}
