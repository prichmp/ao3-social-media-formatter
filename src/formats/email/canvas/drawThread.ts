// Layout + paint for the email canvas renderer.
//
// `layoutThread` does a measure pass over the thread and produces a flat
// list of drawing primitives. `paintThread` executes them. Same two-pass
// shape as the other formats so we can size the canvas before any drawing.

import type { EmailThread } from '../types';
import type { ImageMap } from './images';
import { wrapText } from '../../../lib/canvasText';
import { font, lineHeight, theme, type Theme } from './theme';

type Prim =
  | { t: 'rect'; x: number; y: number; w: number; h: number; fill?: string; stroke?: string; radius: number }
  | { t: 'text'; x: number; y: number; text: string; font: string; color: string; align?: 'left' | 'center' | 'right' }
  | { t: 'image'; x: number; y: number; w: number; h: number; img: HTMLImageElement | null; circle: boolean; placeholder: string; placeholderLetter?: string; placeholderColor?: string };

export interface ThreadLayout {
  width: number;
  height: number;
  prims: Prim[];
}

export type MeasureContext = Pick<CanvasRenderingContext2D, 'measureText' | 'font'>;

export function layoutThread(
  ctx: MeasureContext,
  thread: EmailThread,
  images: ImageMap,
  t: Theme = theme,
): ThreadLayout {
  const prims: Prim[] = [];

  const measurer = (size: number, weight: 'normal' | 'bold' = 'normal') => {
    ctx.font = font(size, weight);
    return (text: string) => ctx.measureText(text).width;
  };
  const widthOf = (text: string, size: number, weight: 'normal' | 'bold' = 'normal') =>
    measurer(size, weight)(text);

  const innerLeft = t.outerPad;
  const innerWidth = t.cardWidth - t.outerPad * 2;
  let y = t.outerPad;

  // ── Subject row ───────────────────────────────────────────────────────────
  // Subject wraps; the optional label pill sits to the right of the first
  // line, vertically centered against it.
  const subject = thread.subject;
  const label = thread.label.trim();
  let labelW = 0, labelH = 0;
  if (label) {
    labelW = widthOf(label, t.labelSize) + t.labelPadX * 2;
    labelH = t.labelSize + t.labelPadY * 2;
  }
  const firstLineMax = label ? innerWidth - labelW - t.subjectLabelGap : innerWidth;

  if (subject.trim() !== '' || label) {
    const wrapped = wrapSubject(measurer(t.subjectSize), subject, innerWidth, firstLineMax);
    let sy = y;
    let firstLineEnd = innerLeft;
    wrapped.forEach((line, i) => {
      prims.push({ t: 'text', x: innerLeft, y: sy, text: line, font: font(t.subjectSize), color: t.text });
      if (i === 0) firstLineEnd = innerLeft + widthOf(line, t.subjectSize);
      sy += lineHeight(t.subjectSize);
    });
    if (label) {
      const labelX = Math.min(firstLineEnd + t.subjectLabelGap, innerLeft + innerWidth - labelW);
      const labelY = y + (lineHeight(t.subjectSize) - labelH) / 2;
      prims.push({ t: 'rect', x: labelX, y: labelY, w: labelW, h: labelH, fill: t.labelBg, radius: t.labelRadius });
      prims.push({
        t: 'text',
        x: labelX + t.labelPadX,
        y: labelY + t.labelPadY,
        text: label,
        font: font(t.labelSize),
        color: t.labelText,
      });
    }
    y = sy + t.subjectGap;
    prims.push({ t: 'rect', x: innerLeft, y, w: innerWidth, h: 1, fill: t.border, radius: 0 });
    y += t.messageGap;
  }

  // ── Messages ──────────────────────────────────────────────────────────────
  thread.messages.forEach((msg, i) => {
    if (i > 0) {
      prims.push({ t: 'rect', x: innerLeft, y, w: innerWidth, h: 1, fill: t.border, radius: 0 });
      y += t.messageGap;
    }

    const msgTop = y + t.messageTopPad;
    const avatarX = innerLeft;
    const textX = innerLeft + t.avatarSize + t.avatarGap;
    const textWidth = innerWidth - t.avatarSize - t.avatarGap;

    // Avatar -- image if supplied, otherwise an initial-letter placeholder.
    prims.push({
      t: 'image',
      x: avatarX,
      y: msgTop,
      w: t.avatarSize,
      h: t.avatarSize,
      img: images.get(msg.senderAvatar.src) ?? null,
      circle: true,
      placeholder: t.placeholder,
      placeholderLetter: initialOf(msg.senderName),
      placeholderColor: msg.senderColor.trim() || t.defaultAvatarColor,
    });

    // Header row: name (bold) + email (gray), with timestamp right-aligned.
    let ry = msgTop;
    const timestamp = msg.timestamp.trim();
    const timestampW = timestamp ? widthOf(timestamp, t.timestampSize) : 0;
    const headerBudget = textWidth - (timestamp ? timestampW + 8 : 0);

    const name = msg.senderName.trim();
    const email = msg.senderEmail.trim() !== '' ? `<${msg.senderEmail.trim()}>` : '';
    prims.push({ t: 'text', x: textX, y: ry, text: name, font: font(t.nameSize, 'bold'), color: t.text });
    const nameW = widthOf(name, t.nameSize, 'bold');
    if (email) {
      const emailX = textX + nameW + 6;
      const emailFits = nameW + 6 + widthOf(email, t.emailSize) <= headerBudget;
      if (emailFits) {
        prims.push({
          t: 'text',
          x: emailX,
          y: ry + (lineHeight(t.nameSize) - lineHeight(t.emailSize)) / 2,
          text: email,
          font: font(t.emailSize),
          color: t.muted,
        });
      }
      // If it doesn't fit inline, drop it altogether -- email shown alone on
      // a new line below the name reads worse than just trusting the name.
    }
    if (timestamp) {
      prims.push({
        t: 'text',
        x: innerLeft + innerWidth,
        y: ry + (lineHeight(t.nameSize) - lineHeight(t.timestampSize)) / 2,
        text: timestamp,
        font: font(t.timestampSize),
        color: t.muted,
        align: 'right',
      });
    }
    ry += lineHeight(t.nameSize);

    // "to me" line.
    const recipients = msg.recipients.trim();
    if (recipients) {
      prims.push({
        t: 'text',
        x: textX,
        y: ry,
        text: `to ${recipients}`,
        font: font(t.recipientsSize),
        color: t.muted,
      });
      ry += lineHeight(t.recipientsSize);
    }

    // Body, wrapped to the avatar-indented column. Stretches the full inner
    // width by starting at innerLeft (most Gmail clients indent body under
    // the avatar; we match that here).
    if (msg.body.trim() !== '') {
      ry += t.bodyTopGap;
      const wrapped = wrapText(measurer(t.bodySize), msg.body, textWidth);
      const lh = lineHeight(t.bodySize);
      wrapped.forEach((paragraph, pi) => {
        for (const line of paragraph) {
          prims.push({ t: 'text', x: textX, y: ry, text: line, font: font(t.bodySize), color: t.text });
          ry += lh;
        }
        if (pi < wrapped.length - 1) ry += t.paragraphGap;
      });
    }

    // Make sure the avatar dictates a minimum row height (matters for
    // very short messages).
    y = Math.max(msgTop + t.avatarSize, ry);
  });

  const height = y + t.bottomPad;

  // Card background + hairline border drawn behind everything.
  prims.unshift({ t: 'rect', x: 0.5, y: 0.5, w: t.cardWidth - 1, h: height - 1, fill: t.bg, stroke: t.border, radius: 0 });

  return { width: t.cardWidth, height, prims };
}

function initialOf(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  // Grab the first codepoint -- some sender names start with an emoji.
  return Array.from(trimmed)[0].toUpperCase();
}

/**
 * Wrap the subject with one quirk: the first line is constrained to
 * `firstLineMax` so it doesn't overlap the label pill. Subsequent lines use
 * the full innerWidth.
 */
function wrapSubject(
  measure: (s: string) => number,
  text: string,
  innerWidth: number,
  firstLineMax: number,
): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  let max = firstLineMax;

  for (const word of words) {
    const candidate = current === '' ? word : `${current} ${word}`;
    if (measure(candidate) <= max) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
      max = innerWidth;
    }
  }
  if (current !== '') lines.push(current);
  if (lines.length === 0) lines.push('');
  return lines;
}

export function paintThread(ctx: CanvasRenderingContext2D, layout: ThreadLayout, t: Theme = theme): void {
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
  }

  if (p.img) {
    drawCover(ctx, p.img, p.x, p.y, p.w, p.h);
  } else if (p.placeholderLetter !== undefined) {
    // Fill the circle with the per-sender color and draw a centered initial.
    ctx.fillStyle = p.placeholderColor ?? t.defaultAvatarColor;
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.fillStyle = t.avatarPlaceholderText;
    ctx.font = font(t.avatarInitialSize, 'bold');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(p.placeholderLetter, p.x + p.w / 2, p.y + p.h / 2 + 1);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
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

