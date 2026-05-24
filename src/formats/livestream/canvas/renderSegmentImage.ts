// Orchestrator: fonts → preload → measure → size canvas → paint. Same shape
// as the other formats' render entry points so CanvasPreview can drive any
// of them uniformly.

import type { LivestreamSegment } from '../types';
import type { RenderResult } from '../../types';
import { preloadImages } from './images';
import { layoutSegment, paintSegment } from './drawSegment';
import { theme } from './theme';

export type { RenderResult };

export async function renderSegmentImage(
  canvas: HTMLCanvasElement,
  segment: LivestreamSegment,
): Promise<RenderResult> {
  if (typeof document !== 'undefined' && document.fonts?.ready) {
    try {
      await document.fonts.ready;
    } catch {
      /* ignore */
    }
  }

  const { images, failed } = await preloadImages(segment);

  const measureCanvas = document.createElement('canvas');
  const measureCtx = measureCanvas.getContext('2d');
  if (!measureCtx) {
    return { ok: false, width: 0, height: 0, failed, error: 'no-2d-context' };
  }

  const layout = layoutSegment(measureCtx, segment, images);

  const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
  const scale = Math.max(dpr, theme.exportScale);

  canvas.width = Math.ceil(layout.width * scale);
  canvas.height = Math.ceil(layout.height * scale);

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return { ok: false, width: layout.width, height: layout.height, failed, error: 'no-2d-context' };
  }
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  paintSegment(ctx, layout);

  return { ok: true, width: layout.width, height: layout.height, failed };
}
