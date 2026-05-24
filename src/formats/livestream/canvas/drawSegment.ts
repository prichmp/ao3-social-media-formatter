// Layout + paint for the livestream canvas renderer.
//
// `layoutSegment` does a measure pass and produces a flat list of drawing
// primitives. `paintSegment` executes them. The two-pass split lets us
// size the canvas before any drawing happens.

import type { BadgeKind, ChatMessage, LivestreamSegment } from '../types';
import type { ImageMap } from './images';
import { wrapText, type WrappedText } from '../../../lib/canvasText';
import { font, lineHeight, theme, type Theme } from './theme';

type Prim =
  | { t: 'rect'; x: number; y: number; w: number; h: number; fill?: string; stroke?: string; radius: number }
  | { t: 'text'; x: number; y: number; text: string; font: string; color: string; align?: 'left' | 'center' | 'right' }
  | { t: 'circle'; cx: number; cy: number; r: number; fill: string }
  | { t: 'image'; x: number; y: number; w: number; h: number; img: HTMLImageElement | null; circle: boolean; placeholder: string };

export interface SegmentLayout {
  width: number;
  height: number;
  prims: Prim[];
}

export type MeasureContext = Pick<CanvasRenderingContext2D, 'measureText' | 'font'>;

// Single-letter inside each chat badge -- compact and lets us draw badges
// purely as rect + text (no SVG paths).
const BADGE_LETTER: Record<BadgeKind, string> = {
  broadcaster: 'B',
  mod:         'M',
  vip:         'V',
  subscriber:  'S',
};

export function layoutSegment(
  ctx: MeasureContext,
  segment: LivestreamSegment,
  images: ImageMap,
  t: Theme = theme,
): SegmentLayout {
  const prims: Prim[] = [];

  const measurer = (size: number, weight: 'normal' | 'bold' = 'normal') => {
    ctx.font = font(size, weight);
    return (text: string) => ctx.measureText(text).width;
  };
  const widthOf = (text: string, size: number, weight: 'normal' | 'bold' = 'normal') =>
    measurer(size, weight)(text);

  // ── Player area ───────────────────────────────────────────────────────────
  const playerH = t.cardWidth * t.playerAspect;
  const thumbImg = images.get(segment.thumbnail.src) ?? null;
  prims.push({
    t: 'image',
    x: 0,
    y: 0,
    w: t.cardWidth,
    h: playerH,
    img: thumbImg,
    circle: false,
    placeholder: t.playerBg,
  });

  // LIVE pill in the top-left overlay.
  if (segment.showLiveBadge) {
    const liveLabel = 'LIVE';
    const liveTextW = widthOf(liveLabel, t.liveSize, 'bold');
    const liveBadgeW = t.livePadX * 2 + t.liveDotSize + 4 + liveTextW;
    const liveBadgeH = t.liveSize + t.livePadY * 2;
    prims.push({
      t: 'rect',
      x: t.liveInset,
      y: t.liveInset,
      w: liveBadgeW,
      h: liveBadgeH,
      fill: t.liveBg,
      radius: t.liveRadius,
    });
    // Pulsing dot to the left of the LIVE text.
    prims.push({
      t: 'circle',
      cx: t.liveInset + t.livePadX + t.liveDotSize / 2,
      cy: t.liveInset + liveBadgeH / 2,
      r: t.liveDotSize / 2,
      fill: '#ffffff',
    });
    prims.push({
      t: 'text',
      x: t.liveInset + t.livePadX + t.liveDotSize + 4,
      y: t.liveInset + t.livePadY,
      text: liveLabel,
      font: font(t.liveSize, 'bold'),
      color: t.liveText,
    });

    // Viewer count pill, sat right next to LIVE.
    if (segment.viewerCount.trim() !== '') {
      const viewers = segment.viewerCount.trim();
      const viewersW = widthOf(viewers, t.viewerSize);
      const viewerPad = 8;
      const viewerBadgeW = viewerPad * 2 + t.viewerDotSize + 5 + viewersW;
      const viewerBadgeH = t.viewerSize + t.livePadY * 2;
      const viewerX = t.liveInset + liveBadgeW + 6;
      prims.push({
        t: 'rect',
        x: viewerX,
        y: t.liveInset,
        w: viewerBadgeW,
        h: viewerBadgeH,
        fill: t.viewerBg,
        radius: t.liveRadius,
      });
      prims.push({
        t: 'circle',
        cx: viewerX + viewerPad + t.viewerDotSize / 2,
        cy: t.liveInset + viewerBadgeH / 2,
        r: t.viewerDotSize / 2,
        fill: t.liveBg,
      });
      prims.push({
        t: 'text',
        x: viewerX + viewerPad + t.viewerDotSize + 5,
        y: t.liveInset + t.livePadY,
        text: viewers,
        font: font(t.viewerSize),
        color: t.viewerText,
      });
    }
  }

  // ── Streamer info bar ─────────────────────────────────────────────────────
  let y = playerH;
  const infoTop = y;
  const infoTextX = t.infoBarPadX + t.streamerAvatarSize + t.streamerGap;
  const infoTextWidth = t.cardWidth - infoTextX - t.infoBarPadX;
  const streamerName = segment.streamer.name.trim();
  const title = segment.title.trim();
  const category = segment.category.trim();

  // Compute info bar height from the lines we'll render.
  let infoLines = 0;
  if (streamerName) infoLines += 1;
  if (title)        infoLines += 1;
  if (category)     infoLines += 1;
  const textBlockH =
    (streamerName ? lineHeight(t.streamerNameSize) : 0) +
    (title        ? lineHeight(t.titleSize)        : 0) +
    (category     ? lineHeight(t.categorySize)     : 0);
  const minBarH = t.streamerAvatarSize + t.infoBarPadY * 2;
  const infoBarH = Math.max(minBarH, textBlockH + t.infoBarPadY * 2);

  // Background + bottom divider.
  prims.push({ t: 'rect', x: 0, y: infoTop, w: t.cardWidth, h: infoBarH, fill: t.bg, radius: 0 });
  prims.push({ t: 'rect', x: 0, y: infoTop + infoBarH - 1, w: t.cardWidth, h: 1, fill: t.border, radius: 0 });

  // Avatar -- vertically centered against the info bar.
  prims.push({
    t: 'image',
    x: t.infoBarPadX,
    y: infoTop + (infoBarH - t.streamerAvatarSize) / 2,
    w: t.streamerAvatarSize,
    h: t.streamerAvatarSize,
    img: images.get(segment.streamer.avatar.src) ?? null,
    circle: true,
    placeholder: t.placeholder,
  });

  // Text lines, vertically centered as a block against the bar.
  let ty = infoTop + (infoBarH - textBlockH) / 2;
  if (streamerName) {
    prims.push({
      t: 'text',
      x: infoTextX,
      y: ty,
      text: truncateToWidth(measurer(t.streamerNameSize, 'bold'), streamerName, infoTextWidth),
      font: font(t.streamerNameSize, 'bold'),
      color: t.text,
    });
    ty += lineHeight(t.streamerNameSize);
  }
  if (title) {
    prims.push({
      t: 'text',
      x: infoTextX,
      y: ty,
      text: truncateToWidth(measurer(t.titleSize), title, infoTextWidth),
      font: font(t.titleSize),
      color: t.text,
    });
    ty += lineHeight(t.titleSize);
  }
  if (category) {
    prims.push({
      t: 'text',
      x: infoTextX,
      y: ty,
      text: truncateToWidth(measurer(t.categorySize), category, infoTextWidth),
      font: font(t.categorySize),
      color: t.muted,
    });
    ty += lineHeight(t.categorySize);
  }
  // Suppress the unused-warning on infoLines (kept for readability).
  void infoLines;

  y = infoTop + infoBarH;

  // ── Chat panel ────────────────────────────────────────────────────────────
  const chatTop = y;
  const chatBackgroundStart = prims.length;   // splice the bg in after sizing
  let cy = chatTop + t.chatPadY;
  const chatLeft = t.chatPadX;
  const chatTextWidth = t.cardWidth - t.chatPadX * 2;

  for (const msg of segment.chat) {
    cy = layoutChatMessage(prims, msg, chatLeft, cy, chatTextWidth, measurer, widthOf, t);
    cy += t.chatLineGap;
  }
  if (segment.chat.length > 0) cy -= t.chatLineGap;          // no trailing gap
  cy += t.chatPadY;
  const chatBottom = cy;

  // Insert chat background behind everything we just pushed.
  prims.splice(chatBackgroundStart, 0, {
    t: 'rect',
    x: 0,
    y: chatTop,
    w: t.cardWidth,
    h: chatBottom - chatTop,
    fill: t.chatBg,
    radius: 0,
  });

  const height = chatBottom;

  // Hairline border around the whole card.
  prims.push({
    t: 'rect',
    x: 0.5,
    y: 0.5,
    w: t.cardWidth - 1,
    h: height - 1,
    stroke: t.border,
    radius: 0,
  });

  return { width: t.cardWidth, height, prims };
}

/**
 * Render a single chat line: badges, colored username + ": ", then wrapping
 * message text. Continuation lines flow back to the left margin (matching
 * Twitch's web chat behavior).
 */
function layoutChatMessage(
  prims: Prim[],
  msg: ChatMessage,
  x: number,
  startY: number,
  maxWidth: number,
  measurer: (size: number, weight?: 'normal' | 'bold') => (s: string) => number,
  widthOf: (s: string, size: number, weight?: 'normal' | 'bold') => number,
  t: Theme,
): number {
  const lineY = startY;
  let cursor = x;

  // Badges first, vertically centered against the chat line.
  for (const badge of msg.badges) {
    const badgeColor = t.badgeColors[badge];
    prims.push({
      t: 'rect',
      x: cursor,
      y: lineY + (lineHeight(t.chatSize) - t.badgeSize) / 2,
      w: t.badgeSize,
      h: t.badgeSize,
      fill: badgeColor,
      radius: t.badgeRadius,
    });
    // Letter centered in the badge.
    const letter = BADGE_LETTER[badge];
    const letterW = widthOf(letter, t.badgeSizePx, 'bold');
    prims.push({
      t: 'text',
      x: cursor + (t.badgeSize - letterW) / 2,
      y: lineY + (lineHeight(t.chatSize) - t.badgeSize) / 2 + (t.badgeSize - t.badgeSizePx) / 2,
      text: letter,
      font: font(t.badgeSizePx, 'bold'),
      color: t.badgeText,
    });
    cursor += t.badgeSize + t.badgeGap;
  }
  if (msg.badges.length > 0) cursor += t.badgeUserGap - t.badgeGap;

  // Username + ": " in user color.
  const userText = msg.username + ':';
  const userColor = msg.color.trim() || t.defaultChatColor;
  prims.push({
    t: 'text',
    x: cursor,
    y: lineY,
    text: userText,
    font: font(t.chatSize, 'bold'),
    color: userColor,
  });
  // Use the one-shot widthOf so the font reflects "chat-size bold" rather
  // than whatever the most-recent `measurer(...)` call left in ctx.font
  // (the badge loop above sets it to the 9px badge font).
  cursor += widthOf(userText, t.chatSize, 'bold') + 5;

  // Wrap the message body. The first line shares horizontal space with the
  // username; continuation lines wrap back to x.
  const remainingFirstLineWidth = Math.max(0, x + maxWidth - cursor);
  const wrapped = wrapText(measurer(t.chatSize), msg.content, maxWidth);
  const flat = flattenWrapped(wrapped);
  let yy = lineY;
  if (flat.length === 0) {
    return yy + lineHeight(t.chatSize);
  }

  // Try to fit the first line beside the username; otherwise drop it down.
  const firstLine = flat[0];
  const firstLineW = measurer(t.chatSize)(firstLine);
  let fitFirstNextToUser = firstLineW <= remainingFirstLineWidth;
  if (!fitFirstNextToUser) {
    // Re-wrap with the narrower remaining width so we can still try.
    const reWrapped = wrapText(measurer(t.chatSize), msg.content, remainingFirstLineWidth);
    const reFlat = flattenWrapped(reWrapped);
    if (reFlat.length > 0 && measurer(t.chatSize)(reFlat[0]) <= remainingFirstLineWidth) {
      prims.push({
        t: 'text',
        x: cursor,
        y: yy,
        text: reFlat[0],
        font: font(t.chatSize),
        color: t.text,
      });
      yy += lineHeight(t.chatSize);
      // Remainder wraps to the full width on continuation lines.
      const remainder = msg.content.slice(reFlat[0].length).trimStart();
      if (remainder) {
        const remWrap = wrapText(measurer(t.chatSize), remainder, maxWidth);
        for (const para of remWrap) {
          for (const line of para) {
            prims.push({ t: 'text', x, y: yy, text: line, font: font(t.chatSize), color: t.text });
            yy += lineHeight(t.chatSize);
          }
        }
      }
      return yy;
    }
    fitFirstNextToUser = false;
  }

  if (fitFirstNextToUser) {
    prims.push({
      t: 'text',
      x: cursor,
      y: yy,
      text: firstLine,
      font: font(t.chatSize),
      color: t.text,
    });
    for (let i = 1; i < flat.length; i++) {
      yy += lineHeight(t.chatSize);
      prims.push({ t: 'text', x, y: yy, text: flat[i], font: font(t.chatSize), color: t.text });
    }
    return yy + lineHeight(t.chatSize);
  }

  // Nothing fit on the first line at all -- start fresh on the next.
  yy += lineHeight(t.chatSize);
  for (const line of flat) {
    prims.push({ t: 'text', x, y: yy, text: line, font: font(t.chatSize), color: t.text });
    yy += lineHeight(t.chatSize);
  }
  return yy;
}

function flattenWrapped(wrapped: WrappedText): string[] {
  const out: string[] = [];
  for (const para of wrapped) {
    for (const line of para) out.push(line);
  }
  return out;
}

function truncateToWidth(measure: (s: string) => number, text: string, maxWidth: number): string {
  if (maxWidth <= 0 || text === '') return '';
  if (measure(text) <= maxWidth) return text;
  const ellipsis = '…';
  let lo = 0;
  let hi = text.length;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (measure(text.slice(0, mid) + ellipsis) <= maxWidth) lo = mid;
    else hi = mid - 1;
  }
  return lo === 0 ? ellipsis : text.slice(0, lo) + ellipsis;
}

export function paintSegment(ctx: CanvasRenderingContext2D, layout: SegmentLayout, t: Theme = theme): void {
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
      case 'circle': {
        ctx.beginPath();
        ctx.arc(p.cx, p.cy, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.fill;
        ctx.fill();
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
  _t: Theme,
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
