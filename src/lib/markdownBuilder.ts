// Render a TwitterPost as Markdown.
//
// Used as the alt-text fallback inside the AO3 `<img>` snippet so that screen
// readers and text-only consumers still get every word of the tweet. The
// shape mirrors what's drawn on the canvas: author header, content, optional
// attachment, timestamp, stats label, then a separator + each reply.

import type { TweetAttachment, TwitterPost } from '../formats/twitter/types';

export function tweetToMarkdown(post: TwitterPost): string {
  const lines: string[] = [];

  const header = renderAuthor(post.author.name, post.author.handle);
  if (header) lines.push(header);

  if (post.content.trim() !== '') {
    if (lines.length) lines.push('');
    lines.push(post.content);
  }

  const attachment = renderAttachment(post.attachment);
  if (attachment) {
    if (lines.length) lines.push('');
    lines.push(attachment);
  }

  const stamp = [post.time, post.relativeTime].filter(s => s.trim() !== '').join(' · ');
  if (stamp) {
    if (lines.length) lines.push('');
    lines.push(`${stamp}`);
  }

  if (post.stats.showRow && post.stats.labels.trim() !== '') {
    if (lines.length) lines.push('');
    lines.push(post.stats.labels);
  }

  for (const reply of post.replies) {
    lines.push('', '---', '');
    const replyHeader = renderAuthor(reply.name, reply.handle);
    const replyStamp = reply.relativeTime.trim() !== '' ? ` · ${reply.relativeTime}` : '';
    if (replyHeader || replyStamp) lines.push(`${replyHeader}${replyStamp}`);
    if (reply.replyingTo.trim() !== '') lines.push(`Replying to @${reply.replyingTo}`);
    if (reply.content.trim() !== '') {
      lines.push('');
      lines.push(reply.content);
    }
    const replyAttachment = renderAttachment(reply.attachment);
    if (replyAttachment) {
      lines.push('');
      lines.push(replyAttachment);
    }
  }

  return lines.join('\n').trim();
}

function renderAuthor(name: string, handle: string): string {
  const n = name.trim();
  const h = handle.trim();
  if (n && h) return `${n} @${h}`;
  if (n)      return `${n}`;
  if (h)      return `@${h}`;
  return '';
}

function renderAttachment(a: TweetAttachment): string {
  switch (a.type) {
    case 'text':
      return '';
    case 'image':
      return a.image.alt.trim() !== '' ? `[Image: ${a.image.alt.trim()}]` : '[Image]';
    case 'quote': {
      // Blockquote each line so the quote stays visually attached to the
      // tweet even in plain-text contexts.
      const header = renderAuthor(a.name, a.handle);
      const body = a.content.trim();
      const out: string[] = [];
      if (header) out.push(`   ${header}`);
      if (body) {
        if (header) out.push('  ');
        for (const line of body.split('\n')) out.push(`   ${line}`);
      }
      return out.join('\n');
    }
    case 'video':
      return a.duration.trim() !== '' ? `[Video (${a.duration.trim()})]` : '[Video]';
    case 'music': {
      const title = a.title.trim();
      const artist = a.artist.trim();
      if (title && artist) return `🎵 ${title} — ${artist}`;
      if (title)           return `🎵 ${title}`;
      if (artist)          return `🎵 ${artist}`;
      return '[Music]';
    }
  }
}
