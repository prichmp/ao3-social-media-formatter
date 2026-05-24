// Render a LivestreamSegment as Markdown for the AO3 <img alt="..."> fallback.

import type { ChatMessage, LivestreamSegment } from './types';

export function segmentToMarkdown(segment: LivestreamSegment): string {
  const lines: string[] = [];

  const streamer = segment.streamer.name.trim();
  const title = segment.title.trim();
  const category = segment.category.trim();
  const viewers = segment.viewerCount.trim();

  if (streamer) lines.push(`**${streamer}** is live`);
  if (title)    lines.push(title);
  if (category) lines.push(`_Playing: ${category}_`);
  if (viewers)  lines.push(`_${viewers} viewers_`);

  if (segment.chat.length > 0) {
    lines.push('', '---', '');
    for (const msg of segment.chat) {
      lines.push(chatToMarkdown(msg));
    }
  }

  return lines.join('\n').trim();
}

function chatToMarkdown(msg: ChatMessage): string {
  const badges = msg.badges.length > 0 ? `[${msg.badges.join('/')}] ` : '';
  const user = msg.username || 'anonymous';
  const body = msg.content.trim();
  return `${badges}**${user}**: ${body}`;
}
