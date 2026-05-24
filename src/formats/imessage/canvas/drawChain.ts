// Layout + paint for the iMessage canvas renderer.
//
// `layoutChain` does a measure pass over the chain and produces a flat list
// of drawing primitives plus the total height. `paintChain` executes those
// primitives. Same shape as the Twitter renderer (and the formats stay
// independent), but the prim set is iMessage-specific.

import type { IMessage, IMessageChain, MessageContent, MessageSender } from '../types';
import type { ImageMap } from './images';
import { wrapText, type WrappedText } from '../../../lib/canvasText';
import { font, lineHeight, theme, type Theme } from './theme';

type Prim =
  | { t: 'rect'; x: number; y: number; w: number; h: number; fill?: string; stroke?: string; radius: number }
  | { t: 'text'; x: number; y: number; text: string; font: string; color: string; align?: 'left' | 'center' | 'right' }
  | { t: 'tri'; x1: number; y1: number; x2: number; y2: number; x3: number; y3: number; fill: string }
  | { t: 'image'; x: number; y: number; w: number; h: number; img: HTMLImageElement | null; circle: boolean; radius: number; placeholder: string };

export interface ChainLayout {
  width: number;
  height: number;
  prims: Prim[];
}

export type MeasureContext = Pick<CanvasRenderingContext2D, 'measureText' | 'font'>;

export function layoutChain(
  ctx: MeasureContext,
  chain: IMessageChain,
  images: ImageMap,
  t: Theme = theme,
): ChainLayout {
  const prims: Prim[] = [];
  const innerLeft = t.paddingX;
  const innerWidth = t.cardWidth - t.paddingX * 2;

  // Measure helper: set the font, then return a width-measuring callback.
  const measurer = (size: number, weight: 'normal' | 'bold' = 'normal') => {
    ctx.font = font(size, weight);
    return (text: string) => ctx.measureText(text).width;
  };
  const widthOf = (text: string, size: number, weight: 'normal' | 'bold' = 'normal') =>
    measurer(size, weight)(text);

  // ── Header (gray nav bar with avatar + name) ─────────────────────────────
  prims.push({
    t: 'rect',
    x: 0,
    y: 0,
    w: t.cardWidth,
    h: t.headerHeight,
    fill: t.headerBg,
    radius: 0,
  });
  prims.push({
    t: 'rect',
    x: 0,
    y: t.headerHeight - 1,
    w: t.cardWidth,
    h: 1,
    fill: t.border,
    radius: 0,
  });
  const avatarX = (t.cardWidth - t.headerAvatarSize) / 2;
  prims.push({
    t: 'image',
    x: avatarX,
    y: t.headerPadTop,
    w: t.headerAvatarSize,
    h: t.headerAvatarSize,
    img: images.get(chain.contactAvatar.src) ?? null,
    circle: true,
    radius: 0,
    placeholder: t.placeholder,
  });
  prims.push({
    t: 'text',
    x: t.cardWidth / 2,
    y: t.headerPadTop + t.headerAvatarSize + 4,
    text: chain.contactName,
    font: font(t.headerNameSize),
    color: t.headerText,
    align: 'center',
  });

  let y = t.headerHeight + t.burstGap;

  // ── Messages ──────────────────────────────────────────────────────────────
  const bubbleMaxWidth = innerWidth * t.bubbleMaxWidthRatio;
  const lastMeIndex = lastIndexBySender(chain.messages, 'me');

  // Lay out a single message body. Returns the bubble box {width, height}.
  // Each branch emits all the prims for that body anchored at (boxX, boxY).
  const layoutBody = (content: MessageContent, boxX: number, boxY: number, isMe: boolean): { width: number; height: number } => {
    switch (content.type) {
      case 'text': {
        return renderTextBubble(content.text, boxX, boxY, isMe);
      }
      case 'image': {
        const img = images.get(content.image.src) ?? null;
        const { w, h } = mediaSize(img, bubbleMaxWidth, t);
        prims.push({
          t: 'image',
          x: boxX,
          y: boxY,
          w,
          h,
          img,
          circle: false,
          radius: t.bubbleRadius,
          placeholder: t.placeholder,
        });
        return { width: w, height: h };
      }
      case 'video': {
        const img = images.get(content.thumbnail.src) ?? null;
        const { w, h } = mediaSize(img, bubbleMaxWidth, t);
        // Thumbnail.
        prims.push({
          t: 'image',
          x: boxX,
          y: boxY,
          w,
          h,
          img,
          circle: false,
          radius: t.bubbleRadius,
          placeholder: t.placeholder,
        });
        // Centered play-button overlay (circle + white triangle).
        const ps = t.videoPlaySize;
        const cx = boxX + w / 2;
        const cy = boxY + h / 2;
        prims.push({ t: 'rect', x: cx - ps / 2, y: cy - ps / 2, w: ps, h: ps, fill: t.videoOverlay, radius: ps / 2 });
        // Centroid-correction so the triangle reads as visually centered.
        const triH = ps * 0.42;
        const triW = triH * 0.92;
        const triLeft = cx - triW / 3;
        prims.push({
          t: 'tri',
          x1: triLeft,        y1: cy - triH / 2,
          x2: triLeft + triW, y2: cy,
          x3: triLeft,        y3: cy + triH / 2,
          fill: t.videoOverlayText,
        });
        // Optional duration badge tucked into the bottom-right.
        if (content.duration.trim() !== '') {
          const bw = widthOf(content.duration, t.videoBadgeSize, 'bold') + t.videoBadgePadX * 2;
          // Raw size (not lineHeight) so the badge hugs the digits.
          const bh = t.videoBadgeSize + t.videoBadgePadY * 2;
          const bx = boxX + w - t.videoBadgeInset - bw;
          const by = boxY + h - t.videoBadgeInset - bh;
          prims.push({ t: 'rect', x: bx, y: by, w: bw, h: bh, fill: t.videoOverlay, radius: t.videoBadgeRadius });
          prims.push({
            t: 'text',
            x: bx + t.videoBadgePadX,
            y: by + t.videoBadgePadY,
            text: content.duration,
            font: font(t.videoBadgeSize, 'bold'),
            color: t.videoOverlayText,
          });
        }
        return { width: w, height: h };
      }
    }
  };

  // Wrap text into the bubble's content width, draw the colored bubble
  // background, then the text prims on top. The bubble hugs its content
  // up to bubbleMaxWidth.
  const renderTextBubble = (text: string, boxX: number, boxY: number, isMe: boolean): { width: number; height: number } => {
    const wrapped = wrapText(measurer(t.bubbleSize), text, bubbleMaxWidth - t.bubblePadX * 2);
    const bubbleW = widthOfWrapped(wrapped, measurer(t.bubbleSize)) + t.bubblePadX * 2;
    const bubbleH = heightOfWrapped(wrapped, t) + t.bubblePadY * 2;
    prims.push({
      t: 'rect',
      x: boxX,
      y: boxY,
      w: bubbleW,
      h: bubbleH,
      fill: isMe ? t.meBg : t.themBg,
      radius: t.bubbleRadius,
    });
    drawWrapped(
      prims,
      wrapped,
      boxX + t.bubblePadX,
      boxY + t.bubblePadY,
      t.bubbleSize,
      isMe ? t.meText : t.themText,
      t,
    );
    return { width: bubbleW, height: bubbleH };
  };

  chain.messages.forEach((msg, i) => {
    // Timestamp line, centered. Renders above the message it precedes.
    if (msg.timestamp.trim() !== '') {
      if (i > 0) y += t.timestampGap;
      prims.push({
        t: 'text',
        x: t.cardWidth / 2,
        y,
        text: msg.timestamp,
        font: font(t.timestampSize, 'bold'),
        color: t.timestampText,
        align: 'center',
      });
      y += lineHeight(t.timestampSize) + t.timestampGap;
    } else if (i > 0 && chain.messages[i - 1].sender !== msg.sender) {
      y += t.burstGap;
    } else if (i > 0) {
      y += t.bubbleGap;
    }

    const isMe = msg.sender === 'me';
    // Lay out the message body at the left edge first so it can size
    // itself, then translate every prim it emitted to the correct side.
    const startPrimsAt = prims.length;
    const size = layoutBody(msg.content, innerLeft, y, isMe);
    const targetX = isMe ? innerLeft + innerWidth - size.width : innerLeft;
    if (targetX !== innerLeft) {
      shiftPrimsX(prims, startPrimsAt, prims.length, targetX - innerLeft);
    }

    y += size.height;

    // "Delivered" label under the final 'me' bubble.
    if (chain.showDeliveredOnLast && isMe && i === lastMeIndex) {
      y += t.deliveredGap;
      prims.push({
        t: 'text',
        x: innerLeft + innerWidth,
        y,
        text: 'Delivered',
        font: font(t.deliveredSize),
        color: t.timestampText,
        align: 'right',
      });
      y += lineHeight(t.deliveredSize);
    }
  });

  const height = y + t.bottomPad;

  // Card background drawn behind everything.
  prims.unshift({
    t: 'rect',
    x: 0,
    y: 0,
    w: t.cardWidth,
    h: height,
    fill: t.bg,
    radius: 0,
  });

  return { width: t.cardWidth, height, prims };
}

/**
 * Decide the rendered width and height of a media bubble. Honors the
 * image's natural aspect ratio when available; falls back to a portrait-ish
 * default otherwise. Height is capped by `mediaMaxHeight` so a tall
 * portrait gets scaled down (and its width follows) instead of bloating
 * the chain.
 */
function mediaSize(
  img: HTMLImageElement | null,
  maxWidth: number,
  t: Theme,
): { w: number; h: number } {
  const aspect = img && img.naturalWidth
    ? img.naturalHeight / img.naturalWidth
    : t.mediaDefaultAspectRatio;
  let w = maxWidth;
  let h = w * aspect;
  if (h > t.mediaMaxHeight) {
    h = t.mediaMaxHeight;
    w = h / aspect;
  }
  return { w, h };
}

function shiftPrimsX(prims: Prim[], start: number, end: number, dx: number): void {
  for (let i = start; i < end; i++) {
    const p = prims[i];
    if (p.t === 'tri') {
      p.x1 += dx; p.x2 += dx; p.x3 += dx;
    } else {
      p.x += dx;
    }
  }
}

function widthOfWrapped(
  wrapped: WrappedText,
  measure: (s: string) => number,
): number {
  let max = 0;
  for (const paragraph of wrapped) {
    for (const line of paragraph) {
      const w = measure(line);
      if (w > max) max = w;
    }
  }
  return max;
}

function heightOfWrapped(wrapped: WrappedText, t: Theme): number {
  let total = 0;
  const lh = lineHeight(t.bubbleSize);
  wrapped.forEach((paragraph, pi) => {
    total += paragraph.length * lh;
    if (pi < wrapped.length - 1) total += t.paragraphGap;
  });
  return total;
}

function drawWrapped(
  prims: Prim[],
  wrapped: WrappedText,
  x: number,
  startY: number,
  size: number,
  color: string,
  t: Theme,
): number {
  let cy = startY;
  const lh = lineHeight(size);
  wrapped.forEach((paragraph, pi) => {
    for (const line of paragraph) {
      prims.push({ t: 'text', x, y: cy, text: line, font: font(size), color });
      cy += lh;
    }
    if (pi < wrapped.length - 1) cy += t.paragraphGap;
  });
  return cy;
}

function lastIndexBySender(messages: IMessage[], sender: MessageSender): number {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].sender === sender) return i;
  }
  return -1;
}

export function paintChain(ctx: CanvasRenderingContext2D, layout: ChainLayout): void {
  ctx.clearRect(0, 0, layout.width, layout.height);
  ctx.textBaseline = 'top';

  for (const p of layout.prims) {
    switch (p.t) {
      case 'rect': {
        roundRectPath(ctx, p.x, p.y, p.w, p.h, p.radius);
        if (p.fill) {
          ctx.fillStyle = p.fill;
          ctx.fill();
        }
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
      case 'tri': {
        ctx.beginPath();
        ctx.moveTo(p.x1, p.y1);
        ctx.lineTo(p.x2, p.y2);
        ctx.lineTo(p.x3, p.y3);
        ctx.closePath();
        ctx.fillStyle = p.fill;
        ctx.fill();
        break;
      }
      case 'image': {
        drawImagePrim(ctx, p);
        break;
      }
    }
  }
}

function drawImagePrim(
  ctx: CanvasRenderingContext2D,
  p: Extract<Prim, { t: 'image' }>,
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
