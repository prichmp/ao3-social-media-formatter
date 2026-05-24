// Layout + paint for the canvas tweet renderer.
//
// `layoutTweet` does a measure pass over the post and produces a flat list of
// drawing primitives plus the total height. `paintTweet` executes those
// primitives against a real 2D context. Splitting the two lets us size the
// canvas (which clears it) before any drawing happens, and keeps the layout
// math inspectable.

import type { TweetAttachment, TwitterPost } from '../types';
import type { ImageMap } from './images';
import { wrapText, type WrappedText } from './text';
import { font, lineHeight, theme, type Theme } from './theme';

type Prim =
  | { t: 'rect'; x: number; y: number; w: number; h: number; fill?: string; stroke?: string; radius: number }
  | { t: 'line'; x: number; y: number; w: number; color: string }
  | { t: 'text'; x: number; y: number; text: string; font: string; color: string }
  | { t: 'tri'; x1: number; y1: number; x2: number; y2: number; x3: number; y3: number; fill: string }
  | { t: 'image'; x: number; y: number; w: number; h: number; img: HTMLImageElement | null; circle: boolean; radius: number };

export interface TweetLayout {
  width: number;
  height: number;
  prims: Prim[];
}

/** A measuring context: a 2D context used only for `measureText`. */
export type MeasureContext = Pick<CanvasRenderingContext2D, 'measureText' | 'font'>;

/** Trim a single line of text to fit `maxWidth`, appending an ellipsis. */
function truncateToWidth(measure: (s: string) => number, text: string, maxWidth: number): string {
  if (maxWidth <= 0 || text === '') return '';
  if (measure(text) <= maxWidth) return text;
  const ellipsis = '…';
  let lo = 0;
  let hi = text.length;
  // Binary-search the largest prefix that fits with the ellipsis appended.
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (measure(text.slice(0, mid) + ellipsis) <= maxWidth) lo = mid;
    else hi = mid - 1;
  }
  return lo === 0 ? ellipsis : text.slice(0, lo) + ellipsis;
}

export function layoutTweet(
  ctx: MeasureContext,
  post: TwitterPost,
  images: ImageMap,
  t: Theme = theme,
): TweetLayout {
  const prims: Prim[] = [];
  const innerLeft = t.padding;
  const innerWidth = t.cardWidth - t.padding * 2;
  let y = t.padding;

  // Measure helper: set the font, then return a width-measuring callback.
  const measurer = (size: number, weight: 'normal' | 'bold' = 'normal') => {
    ctx.font = font(size, weight);
    return (text: string) => ctx.measureText(text).width;
  };
  const widthOf = (text: string, size: number, weight: 'normal' | 'bold' = 'normal') =>
    measurer(size, weight)(text);

  // Draw a wrapped text block starting at (x, y); returns the y after it.
  const drawWrapped = (
    wrapped: WrappedText,
    x: number,
    startY: number,
    size: number,
    color: string,
  ): number => {
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
  };

  // Render an attachment block at (x, startY) constrained to `width`. Returns
  // the y position after the block, or `startY` unchanged if the attachment
  // renders nothing (text type, or quote/image with no data). Closes over
  // `prims`, `images`, `t`, `widthOf`, `drawWrapped`, `measurer` to keep the
  // call site terse.
  const layoutAttachment = (att: TweetAttachment, x: number, startY: number, width: number): number => {
    switch (att.type) {
      case 'text':
        return startY;
      case 'image': {
        if (!att.image.src) return startY;
        const img = images.get(att.image.src) ?? null;
        const ratio = img && img.naturalWidth ? img.naturalHeight / img.naturalWidth : 0.5625;
        const h = width * ratio;
        prims.push({ t: 'image', x, y: startY, w: width, h, img, circle: false, radius: t.imageRadius });
        return startY + h;
      }
      case 'quote': {
        if (!att.name && !att.content) return startY;
        const boxTop = startY;
        const pad = t.quotePadding;
        let qy = boxTop + pad;
        const qTextX = x + pad + t.quoteAvatarSize + t.avatarGap;
        // Remember where the quote's contents start so we can splice the box
        // background in behind them once we know its height.
        const quoteContentStart = prims.length;

        prims.push({
          t: 'image',
          x: x + pad,
          y: qy,
          w: t.quoteAvatarSize,
          h: t.quoteAvatarSize,
          img: images.get(att.avatar.src) ?? null,
          circle: true,
          radius: 0,
        });
        const qName = att.name;
        const qHandle = `@${att.handle}`;
        const qHeaderWidth = width - pad * 2 - t.quoteAvatarSize - t.avatarGap;
        prims.push({ t: 'text', x: qTextX, y: qy, text: qName, font: font(t.quoteNameSize, 'bold'), color: t.text });
        const qNameW = widthOf(qName, t.quoteNameSize, 'bold');
        const qHandleW = widthOf(qHandle, t.handleSize);
        if (qNameW + 6 + qHandleW <= qHeaderWidth) {
          prims.push({ t: 'text', x: qTextX + qNameW + 6, y: qy, text: qHandle, font: font(t.handleSize), color: t.muted });
          qy += Math.max(t.quoteAvatarSize, lineHeight(t.quoteNameSize)) + 4;
        } else {
          qy += lineHeight(t.quoteNameSize);
          prims.push({ t: 'text', x: qTextX, y: qy, text: qHandle, font: font(t.handleSize), color: t.muted });
          qy = Math.max(boxTop + pad + t.quoteAvatarSize, qy + lineHeight(t.handleSize)) + 4;
        }

        if (att.content.trim() !== '') {
          const qWidth = width - pad * 2;
          const wrapped = wrapText(measurer(t.quoteContentSize), att.content, qWidth);
          qy = drawWrapped(wrapped, x + pad, qy, t.quoteContentSize, t.text);
        }
        const boxHeight = qy + pad - boxTop;
        prims.splice(quoteContentStart, 0, {
          t: 'rect',
          x,
          y: boxTop,
          w: width,
          h: boxHeight,
          stroke: t.border,
          radius: t.borderRadius,
        });
        return boxTop + boxHeight;
      }
      case 'video': {
        const img = images.get(att.thumbnail.src) ?? null;
        const ratio = img && img.naturalWidth ? img.naturalHeight / img.naturalWidth : 0.5625;
        const h = width * ratio;
        // 1) Thumbnail (or placeholder rect if no image).
        prims.push({ t: 'image', x, y: startY, w: width, h, img, circle: false, radius: t.imageRadius });
        // 2) Centered play-button overlay: a circle with a right-pointing triangle.
        const ps = t.videoPlaySize;
        const cx = x + width / 2;
        const cy = startY + h / 2;
        prims.push({ t: 'rect', x: cx - ps / 2, y: cy - ps / 2, w: ps, h: ps, fill: t.videoOverlay, radius: ps / 2 });
        // Triangle sized to roughly half the circle, nudged right so its visual
        // centroid lines up with the circle's center (an equilateral triangle's
        // centroid sits 1/3 of the way from the base).
        const triH = ps * 0.42;
        const triW = triH * 0.92;
        const triLeft = cx - triW / 3;
        prims.push({
          t: 'tri',
          x1: triLeft,           y1: cy - triH / 2,
          x2: triLeft + triW,    y2: cy,
          x3: triLeft,           y3: cy + triH / 2,
          fill: t.videoOverlayText,
        });
        // 3) Optional duration badge in the bottom-right corner.
        if (att.duration.trim() !== '') {
          const bw = widthOf(att.duration, t.videoBadgeSize, 'bold') + t.videoBadgePadX * 2;
          // Use the raw font size (not lineHeight) so the badge hugs a single
          // line of digits instead of including the 1.35x line-leading slack.
          const bh = t.videoBadgeSize + t.videoBadgePadY * 2;
          const bx = x + width - t.videoBadgeInset - bw;
          const by = startY + h - t.videoBadgeInset - bh;
          prims.push({ t: 'rect', x: bx, y: by, w: bw, h: bh, fill: t.videoOverlay, radius: t.videoBadgeRadius });
          prims.push({
            t: 'text',
            x: bx + t.videoBadgePadX,
            y: by + t.videoBadgePadY,
            text: att.duration,
            font: font(t.videoBadgeSize, 'bold'),
            color: t.videoOverlayText,
          });
        }
        return startY + h;
      }
      case 'music': {
        const pad = t.musicPadding;
        const art = t.musicArtSize;
        const boxTop = startY;
        const boxHeight = art + pad * 2;
        // Card background + border first so subsequent prims stack on top.
        prims.push({
          t: 'rect',
          x,
          y: boxTop,
          w: width,
          h: boxHeight,
          stroke: t.border,
          radius: t.borderRadius,
        });
        // Album art with a small radius -- matches the inline image look.
        prims.push({
          t: 'image',
          x: x + pad,
          y: boxTop + pad,
          w: art,
          h: art,
          img: images.get(att.albumArt.src) ?? null,
          circle: false,
          radius: 4,
        });
        // Play button on the right: a dark circle with a white right-pointing
        // triangle. Vertically centered against the card, tucked into the
        // right padding -- visual rhyme with the video overlay button.
        const ps = t.musicPlaySize;
        const playX = x + width - pad - ps;
        const playY = boxTop + (boxHeight - ps) / 2;
        prims.push({ t: 'rect', x: playX, y: playY, w: ps, h: ps, fill: t.videoOverlay, radius: ps / 2 });
        const triH = ps * 0.42;
        const triW = triH * 0.92;
        const triLeft = playX + ps / 2 - triW / 3;
        const triCy = playY + ps / 2;
        prims.push({
          t: 'tri',
          x1: triLeft,        y1: triCy - triH / 2,
          x2: triLeft + triW, y2: triCy,
          x3: triLeft,        y3: triCy + triH / 2,
          fill: t.videoOverlayText,
        });
        // Title + artist stacked, vertically centered against the album art.
        // The available text width stops short of the play button so long
        // strings overflow the card edge rather than crashing into the button.
        const titleLH = lineHeight(t.musicTitleSize);
        const artistLH = lineHeight(t.musicArtistSize);
        const textBlockH = titleLH + artistLH;
        const textX = x + pad + art + t.avatarGap;
        const textRight = playX - t.avatarGap;
        const textWidth = Math.max(0, textRight - textX);
        let textY = boxTop + pad + (art - textBlockH) / 2;
        prims.push({
          t: 'text',
          x: textX,
          y: textY,
          text: truncateToWidth(measurer(t.musicTitleSize, 'bold'), att.title, textWidth),
          font: font(t.musicTitleSize, 'bold'),
          color: t.text,
        });
        textY += titleLH;
        prims.push({
          t: 'text',
          x: textX,
          y: textY,
          text: truncateToWidth(measurer(t.musicArtistSize), att.artist, textWidth),
          font: font(t.musicArtistSize),
          color: t.muted,
        });
        return boxTop + boxHeight;
      }
    }
  };

  // ── Header: avatar + name/handle ────────────────────────────────────────
  const headTextX = innerLeft + t.avatarSize + t.avatarGap;
  prims.push({
    t: 'image',
    x: innerLeft,
    y,
    w: t.avatarSize,
    h: t.avatarSize,
    img: images.get(post.author.avatar.src) ?? null,
    circle: true,
    radius: 0,
  });
  prims.push({ t: 'text', x: headTextX, y, text: post.author.name, font: font(t.nameSize, 'bold'), color: t.text });
  prims.push({
    t: 'text',
    x: headTextX,
    y: y + lineHeight(t.nameSize),
    text: `@${post.author.handle}`,
    font: font(t.handleSize),
    color: t.muted,
  });
  y += Math.max(t.avatarSize, lineHeight(t.nameSize) + lineHeight(t.handleSize)) + t.blockGap;

  // ── Content ─────────────────────────────────────────────────────────────
  if (post.content.trim() !== '') {
    const wrapped = wrapText(measurer(t.contentSize), post.content, innerWidth);
    y = drawWrapped(wrapped, innerLeft, y, t.contentSize, t.text);
    y += t.blockGap;
  }

  // ── Attachment (image / quote / video / music) ───────────────────────────
  const afterAttachment = layoutAttachment(post.attachment, innerLeft, y, innerWidth);
  if (afterAttachment > y) {
    y = afterAttachment + t.blockGap;
  }

  // ── Timestamp ─────────────────────────────────────────────────────────────
  const stamp = [post.time, post.relativeTime].filter(Boolean).join(' · ');
  if (stamp) {
    prims.push({ t: 'text', x: innerLeft, y, text: stamp, font: font(t.timestampSize), color: t.muted });
    y += lineHeight(t.timestampSize) + t.blockGap;
  }

  // ── Stats label ─────────────────────────────────────────────────────────────
  if (post.stats.showRow && post.stats.labels.trim() !== '') {
    prims.push({ t: 'line', x: innerLeft, y, w: innerWidth, color: t.separator });
    y += t.blockGap;
    const wrapped = wrapText(measurer(t.statsSize), post.stats.labels, innerWidth);
    y = drawWrapped(wrapped, innerLeft, y, t.statsSize, t.muted);
    y += t.blockGap;
  }

  // ── Replies ───────────────────────────────────────────────────────────────
  for (const reply of post.replies) {
    prims.push({ t: 'line', x: innerLeft, y, w: innerWidth, color: t.separator });
    y += t.blockGap;

    const replyTextX = innerLeft + t.avatarSize + t.avatarGap;
    const replyTextWidth = innerWidth - t.avatarSize - t.avatarGap;
    const blockTop = y;
    prims.push({
      t: 'image',
      x: innerLeft,
      y,
      w: t.avatarSize,
      h: t.avatarSize,
      img: images.get(reply.avatar.src) ?? null,
      circle: true,
      radius: 0,
    });

    let ry = y;
    // Name + "@handle · time": same line if it fits, otherwise stacked.
    prims.push({ t: 'text', x: replyTextX, y: ry, text: reply.name, font: font(t.nameSize, 'bold'), color: t.text });
    const nameW = widthOf(reply.name, t.nameSize, 'bold');
    const meta = `@${reply.handle}${reply.relativeTime ? ` · ${reply.relativeTime}` : ''}`;
    const metaW = widthOf(meta, t.handleSize);
    if (nameW + 6 + metaW <= replyTextWidth) {
      prims.push({ t: 'text', x: replyTextX + nameW + 6, y: ry, text: meta, font: font(t.handleSize), color: t.muted });
      ry += lineHeight(t.nameSize);
    } else {
      ry += lineHeight(t.nameSize);
      prims.push({ t: 'text', x: replyTextX, y: ry, text: meta, font: font(t.handleSize), color: t.muted });
      ry += lineHeight(t.handleSize);
    }

    // "Replying to @target"
    const target = reply.replyingTo || post.author.handle;
    if (target) {
      const prefix = 'Replying to ';
      prims.push({ t: 'text', x: replyTextX, y: ry, text: prefix, font: font(t.handleSize), color: t.muted });
      const prefixW = widthOf(prefix, t.handleSize);
      prims.push({ t: 'text', x: replyTextX + prefixW, y: ry, text: `@${target}`, font: font(t.handleSize), color: t.link });
      ry += lineHeight(t.handleSize);
    }

    // Reply content.
    if (reply.content.trim() !== '') {
      const wrapped = wrapText(measurer(t.contentSize), reply.content, replyTextWidth);
      ry = drawWrapped(wrapped, replyTextX, ry, t.contentSize, t.text);
    }

    // Reply attachment, constrained to the reply text column. Add a small
    // pre-gap when there's content above so the block doesn't sit flush.
    const replyHasContent = reply.content.trim() !== '';
    const attStartY = ry + (replyHasContent ? 6 : 0);
    const afterReplyAtt = layoutAttachment(reply.attachment, replyTextX, attStartY, replyTextWidth);
    if (afterReplyAtt > attStartY) {
      ry = afterReplyAtt;
    }

    // Stat icons.
    if (reply.showStats) {
      ry += 4;
      const icons = [post.statIcons.reply, post.statIcons.retweet, post.statIcons.like];
      let ix = replyTextX;
      for (const icon of icons) {
        const img = images.get(icon.src) ?? null;
        const ratio = img && img.naturalHeight ? img.naturalWidth / img.naturalHeight : 1;
        const w = t.statIconHeight * ratio;
        prims.push({ t: 'image', x: ix, y: ry, w, h: t.statIconHeight, img, circle: false, radius: 0 });
        // Advance past the icon plus the visible gap between icons.
        ix += w + t.statIconGap;
      }
      ry += t.statIconHeight;
    }

    y = Math.max(blockTop + t.avatarSize, ry) + t.blockGap;
  }

  const height = y - t.blockGap + t.padding;

  // Card background + border behind everything.
  prims.unshift({ t: 'rect', x: 0.5, y: 0.5, w: t.cardWidth - 1, h: height - 1, fill: t.bg, stroke: t.border, radius: t.borderRadius });

  return { width: t.cardWidth, height, prims };
}

export function paintTweet(ctx: CanvasRenderingContext2D, layout: TweetLayout, t: Theme = theme): void {
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
      case 'line': {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.w, 1);
        break;
      }
      case 'text': {
        ctx.font = p.font;
        ctx.fillStyle = p.color;
        ctx.fillText(p.text, p.x, p.y);
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
    ctx.fillStyle = t.placeholder;
    ctx.fillRect(p.x, p.y, p.w, p.h);
  }
  ctx.restore();

  // Hairline border on non-circular images for definition.
  if (!p.circle && p.radius > 0) {
    roundRectPath(ctx, p.x + 0.5, p.y + 0.5, p.w - 1, p.h - 1, p.radius);
    ctx.strokeStyle = t.border;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

/** Draw `img` covering the target box (object-fit: cover), centered. */
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
