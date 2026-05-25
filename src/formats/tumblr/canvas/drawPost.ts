// Layout + paint for the tumblr canvas renderer.
//
// `layoutPost` does a measure pass over the reblog tower and produces a
// flat list of drawing primitives. `paintPost` executes them. Same two-pass
// shape as the other formats.

import type { TumblrEntry, TumblrPost } from '../types';
import type { ImageMap } from './images';
import { wrapText } from '../../../lib/canvasText';
import { font, lineHeight, theme, type Theme } from './theme';

type Prim =
  | { t: 'rect'; x: number; y: number; w: number; h: number; fill?: string; stroke?: string; radius: number }
  | { t: 'text'; x: number; y: number; text: string; font: string; color: string; align?: 'left' | 'center' | 'right' }
  | { t: 'image'; x: number; y: number; w: number; h: number; img: HTMLImageElement | null; circle: boolean; radius: number; placeholder: string };

export interface PostLayout {
  width: number;
  height: number;
  prims: Prim[];
}

export type MeasureContext = Pick<CanvasRenderingContext2D, 'measureText' | 'font'>;

export function layoutPost(
  ctx: MeasureContext,
  post: TumblrPost,
  images: ImageMap,
  t: Theme = theme,
): PostLayout {
  const prims: Prim[] = [];

  const measurer = (size: number, weight: 'normal' | 'bold' = 'normal') => {
    ctx.font = font(size, weight);
    return (text: string) => ctx.measureText(text).width;
  };
  const widthOf = (text: string, size: number, weight: 'normal' | 'bold' = 'normal') =>
    measurer(size, weight)(text);

  const innerLeft = t.paddingX;
  const innerWidth = t.cardWidth - t.paddingX * 2;
  let y = 0;

  post.entries.forEach((entry, i) => {
    if (i > 0) {
      // Hairline divider between entries.
      prims.push({ t: 'rect', x: 0, y, w: t.cardWidth, h: 1, fill: t.border, radius: 0 });
    }
    y = layoutEntry(prims, entry, innerLeft, innerWidth, y, i === 0, measurer, widthOf, images, t);
  });

  // ── Footer (notes + timestamp) ────────────────────────────────────────────
  const notes = post.notes.trim();
  const timestamp = post.timestamp.trim();
  if (notes || timestamp) {
    prims.push({ t: 'rect', x: 0, y, w: t.cardWidth, h: 1, fill: t.border, radius: 0 });
    const footerH = lineHeight(t.footerSize) + t.footerPadY * 2;
    prims.push({ t: 'rect', x: 0, y, w: t.cardWidth, h: footerH, fill: t.footerBg, radius: 0 });
    const fy = y + t.footerPadY;
    if (notes) {
      prims.push({
        t: 'text',
        x: innerLeft,
        y: fy,
        text: notes,
        font: font(t.footerSize, 'bold'),
        color: t.text,
      });
    }
    if (timestamp) {
      prims.push({
        t: 'text',
        x: innerLeft + innerWidth,
        y: fy,
        text: timestamp,
        font: font(t.footerSize),
        color: t.muted,
        align: 'right',
      });
    }
    y += footerH;
  }

  const height = y;

  // Card background drawn behind everything, with rounded corners + border.
  prims.unshift({
    t: 'rect',
    x: 0.5,
    y: 0.5,
    w: t.cardWidth - 1,
    h: height - 1,
    fill: t.bg,
    stroke: t.border,
    radius: t.outerRadius,
  });

  return { width: t.cardWidth, height, prims };
}

/**
 * Lay out a single entry (rung in the reblog tower). Returns the y position
 * after the entry. A "silent" reblog (no content, no image, no tags) is
 * collapsed to a compact "username reblogged this" line.
 */
function layoutEntry(
  prims: Prim[],
  entry: TumblrEntry,
  x: number,
  width: number,
  startY: number,
  isOriginal: boolean,
  measurer: (size: number, weight?: 'normal' | 'bold') => (s: string) => number,
  widthOf: (s: string, size: number, weight?: 'normal' | 'bold') => number,
  images: ImageMap,
  t: Theme,
): number {
  const username = entry.username.trim();
  const content = entry.content.trim();
  const hasImage = !!entry.image.src;
  const tags = entry.tags.filter(s => s.trim() !== '');
  const isSilent = !isOriginal && content === '' && !hasImage && tags.length === 0;

  let y = startY + t.entryPadY;

  // Avatar + username header.
  const headerTextX = x + t.avatarSize + t.avatarGap;
  prims.push({
    t: 'image',
    x,
    y,
    w: t.avatarSize,
    h: t.avatarSize,
    img: images.get(entry.avatar.src) ?? null,
    circle: false,
    radius: t.avatarRadius,
    placeholder: t.placeholder,
  });
  prims.push({
    t: 'text',
    x: headerTextX,
    y: y + (t.avatarSize - lineHeight(t.usernameSize)) / 2,
    text: username,
    font: font(t.usernameSize, 'bold'),
    color: t.text,
  });
  if (isSilent) {
    // Compact "reblogged this" line, inline next to the username.
    const nameW = widthOf(username, t.usernameSize, 'bold');
    prims.push({
      t: 'text',
      x: headerTextX + nameW + 6,
      y: y + (t.avatarSize - lineHeight(t.silentSize)) / 2,
      text: 'reblogged this',
      font: font(t.silentSize),
      color: t.muted,
    });
    return y + t.avatarSize + t.entryPadY;
  }

  // Past the header.
  y += t.avatarSize + t.contentGap;

  // Content text, wrapped to full inner width (Tumblr lets body text use
  // the whole card width even though the avatar sits in the header above).
  if (content) {
    const wrapped = wrapText(measurer(t.contentSize), content, width);
    const lh = lineHeight(t.contentSize);
    wrapped.forEach((paragraph, pi) => {
      for (const line of paragraph) {
        prims.push({ t: 'text', x, y, text: line, font: font(t.contentSize), color: t.text });
        y += lh;
      }
      if (pi < wrapped.length - 1) y += t.paragraphGap;
    });
  }

  // Inline image.
  if (hasImage) {
    if (content) y += t.imageGap;
    const img = images.get(entry.image.src) ?? null;
    const ratio = img && img.naturalWidth
      ? img.naturalHeight / img.naturalWidth
      : 0.5625;
    const h = width * ratio;
    prims.push({
      t: 'image',
      x,
      y,
      w: width,
      h,
      img,
      circle: false,
      radius: t.imageRadius,
      placeholder: t.placeholder,
    });
    y += h;
  }

  // Tags row.
  if (tags.length > 0) {
    y += t.tagGap;
    let tx = x;
    const lineH = lineHeight(t.tagSize);
    for (const tag of tags) {
      const display = `#${tag}`;
      const tw = widthOf(display, t.tagSize);
      if (tx > x && tx + tw > x + width) {
        // Wrap to next line.
        tx = x;
        y += lineH;
      }
      prims.push({
        t: 'text',
        x: tx,
        y,
        text: display,
        font: font(t.tagSize),
        color: t.muted,
      });
      tx += tw + t.tagInline;
    }
    y += lineH;
  }

  y += t.entryPadY;
  return y;
}

export function paintPost(ctx: CanvasRenderingContext2D, layout: PostLayout, t: Theme = theme): void {
  ctx.clearRect(0, 0, layout.width, layout.height);
  ctx.textBaseline = 'top';

  for (const p of layout.prims) {
    switch (p.t) {
      case 'rect': {
        roundRectPath(ctx, p.x, p.y, p.w, p.h, p.radius);
        if (p.fill) { ctx.fillStyle = p.fill; ctx.fill(); }
        if (p.stroke) {
          ctx.strokeStyle = p.stroke;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
        break;
      }
      case 'text': {
        ctx.font = p.font;
        ctx.fillStyle = p.color;
        ctx.textAlign = p.align ?? 'left';
        ctx.fillText(p.text, p.x, p.y);
        ctx.textAlign = 'left';
        break;
      }
      case 'image': {
        drawImagePrim(ctx, p, t);
        break;
      }
    }
  }
}

function drawImagePrim(
  ctx: CanvasRenderingContext2D,
  p: Extract<Prim, { t: 'image' }>,
  t: Theme,
): void {
  ctx.save();
  if (p.circle) {
    ctx.beginPath();
    ctx.arc(p.x + p.w / 2, p.y + p.h / 2, p.w / 2, 0, Math.PI * 2);
    ctx.clip();
  } else if (p.radius > 0) {
    roundRectPath(ctx, p.x, p.y, p.w, p.h, p.radius);
    ctx.clip();
  }

  if (p.img) {
    drawCover(ctx, p.img, p.x, p.y, p.w, p.h);
  } else {
    ctx.fillStyle = p.placeholder;
    ctx.fillRect(p.x, p.y, p.w, p.h);
  }
  ctx.restore();

  // Hairline border on non-circular rounded images for definition.
  if (!p.circle && p.radius > 0 && p.img) {
    roundRectPath(ctx, p.x + 0.5, p.y + 0.5, p.w - 1, p.h - 1, p.radius);
    ctx.strokeStyle = t.border;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) {
    ctx.drawImage(img, x, y, w, h);
    return;
  }
  const scale = Math.max(w / iw, h / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = x + (w - dw) / 2;
  const dy = y + (h - dh) / 2;
  ctx.drawImage(img, dx, dy, dw, dh);
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}
