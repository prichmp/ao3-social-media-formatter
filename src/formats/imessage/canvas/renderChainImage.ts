// Orchestrates a full render of an IMessageChain onto a canvas. Mirrors the
// twitter pipeline -- fonts → preload → measure → size → paint -- so the
// CanvasPreview component can drive either format the same way.

import type { IMessageChain } from '../types';
import type { RenderResult } from '../../types';
import { preloadImages } from './images';
import { layoutChain, paintChain } from './drawChain';
import { theme } from './theme';

export type { RenderResult };

export async function renderChainImage(
  canvas: HTMLCanvasElement,
  chain: IMessageChain,
): Promise<RenderResult> {
  if (typeof document !== 'undefined' && document.fonts?.ready) {
    try {
      await document.fonts.ready;
    } catch {
      /* ignore -- fall through with whatever metrics we have */
    }
  }

  const { images, failed } = await preloadImages(chain);

  const measureCanvas = document.createElement('canvas');
  const measureCtx = measureCanvas.getContext('2d');
  if (!measureCtx) {
    return { ok: false, width: 0, height: 0, failed, error: 'no-2d-context' };
  }

  const layout = layoutChain(measureCtx, chain, images);

  const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
  const scale = Math.max(dpr, theme.exportScale);

  canvas.width = Math.ceil(layout.width * scale);
  canvas.height = Math.ceil(layout.height * scale);

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return { ok: false, width: layout.width, height: layout.height, failed, error: 'no-2d-context' };
  }
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  paintChain(ctx, layout);

  return { ok: true, width: layout.width, height: layout.height, failed };
}
