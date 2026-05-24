// Render a TumblrPost as Markdown for the AO3 <img alt="..."> fallback.

import type { TumblrEntry, TumblrPost } from './types';

export function postToMarkdown(post: TumblrPost): string {
  const lines: string[] = [];

  post.entries.forEach((entry, i) => {
    if (i > 0) lines.push('', '---', '');
    lines.push(...entryToMarkdown(entry, i === 0));
  });

  if (post.notes.trim() || post.timestamp.trim()) {
    lines.push('');
    const parts: string[] = [];
    if (post.notes.trim())     parts.push(`**${post.notes.trim()}**`);
    if (post.timestamp.trim()) parts.push(`_${post.timestamp.trim()}_`);
    lines.push(parts.join(' · '));
  }

  return lines.join('\n').trim();
}

function entryToMarkdown(entry: TumblrEntry, isOriginal: boolean): string[] {
  const out: string[] = [];
  const username = entry.username.trim();
  const content = entry.content.trim();
  const tags = entry.tags.map(t => t.trim()).filter(Boolean);
  const hasImage = !!entry.image.src;
  const isSilent = !isOriginal && content === '' && !hasImage && tags.length === 0;

  if (isSilent) {
    out.push(`**${username || 'anonymous'}** reblogged this`);
    return out;
  }

  out.push(`**${username || 'anonymous'}**`);
  if (content) {
    out.push('');
    out.push(content);
  }
  if (hasImage) {
    out.push('');
    out.push(entry.image.alt.trim() !== '' ? `[Image: ${entry.image.alt.trim()}]` : '[Image]');
  }
  if (tags.length > 0) {
    out.push('');
    out.push(tags.map(t => `#${t}`).join(' '));
  }
  return out;
}
