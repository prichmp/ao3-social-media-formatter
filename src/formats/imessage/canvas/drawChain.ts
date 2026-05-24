// Layout + paint for the iMessage canvas renderer.
//
// `layoutChain` does a measure pass over the chain and produces a flat list
// of drawing primitives plus the total height. `paintChain` executes those
// primitives. Same shape as the Twitter renderer (and the formats stay
// independent), but the prim set is iMessage-specific.

import type { IMessageChain, IMessage } from '../types';
import type { ImageMap } from './images';
import { wrapText, type WrappedText } from '../../../lib/canvasText';
import { font, lineHeight, theme, type Theme } from './theme';

type Prim =
  | { t: 'rect'; x: number; y: number; w: number; h: number; fill?: string; stroke?: string; radius: number }
  | { t: 'text'; x: number; y: number; text: string; font: string; color: string; align?: 'left' | 'center' | 'right' }
  | { t: 'image'; x: number; y: number; w: number; h: number; img: HTMLImageElement | null; circle: boolean; placeholder: string };

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
  // Bottom hairline
  prims.push({
    t: 'rect',
    x: 0,
    y: t.headerHeight - 1,
    w: t.cardWidth,
    h: 1,
    fill: t.border,
    radius: 0,
  });
  // Centered avatar
  const avatarX = (t.cardWidth - t.headerAvatarSize) / 2;
  prims.push({
    t: 'image',
    x: avatarX,
    y: t.headerPadTop,
    w: t.headerAvatarSize,
    h: t.headerAvatarSize,
    img: images.get(chain.contactAvatar.src) ?? null,
    circle: true,
    placeholder: t.placeholder,
  });
  // Contact name underneath the avatar (real iMessage uses small text +
  // a chevron; we render just the name centered).
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

  chain.messages.forEach((msg, i) => {
    // Timestamp line, centered. Renders above the message it precedes.
    if (msg.timestamp.trim() !== '') {
      // Slightly larger gap before a timestamp so groups read as separated.
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
      // Sender flip without a timestamp -- give it a slightly bigger gap.
      y += t.burstGap;
    } else if (i > 0) {
      y += t.bubbleGap;
    }

    // Wrap the content to the bubble's max inner width.
    const wrapped = wrapText(measurer(t.bubbleSize), msg.content, bubbleMaxWidth - t.bubblePadX * 2);
    const bubbleWidth = widthOfWrapped(wrapped, measurer(t.bubbleSize)) + t.bubblePadX * 2;
    const bubbleHeight = heightOfWrapped(wrapped, t) + t.bubblePadY * 2;
    const isMe = msg.sender === 'me';
    const bubbleX = isMe
      ? innerLeft + innerWidth - bubbleWidth
      : innerLeft;

    prims.push({
      t: 'rect',
      x: bubbleX,
      y,
      w: bubbleWidth,
      h: bubbleHeight,
      fill: isMe ? t.meBg : t.themBg,
      radius: t.bubbleRadius,
    });

    drawWrapped(
      prims,
      wrapped,
      bubbleX + t.bubblePadX,
      y + t.bubblePadY,
      t.bubbleSize,
      isMe ? t.meText : t.themText,
      t,
    );

    y += bubbleHeight;

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

  // Card background + hairline border, drawn behind everything.
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

function lastIndexBySender(messages: IMessage[], sender: IMessage['sender']): number {
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
