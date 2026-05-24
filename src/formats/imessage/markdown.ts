// Render an IMessageChain as Markdown for the AO3 <img alt="..."> fallback.
// Mirrors the twitter tweetToMarkdown shape: header, then each message
// prefixed with its sender, with timestamp lines kept inline.

import type { IMessageChain, MessageContent } from './types';

export function chainToMarkdown(chain: IMessageChain): string {
  const lines: string[] = [];

  const name = chain.contactName.trim();
  if (name) lines.push(`Conversation with ${name}`);

  for (const msg of chain.messages) {
    if (msg.timestamp.trim() !== '') {
      lines.push('', `_${msg.timestamp.trim()}_`);
    }
    const speaker = msg.sender === 'me' ? 'Me' : name || 'Them';
    const body = contentToMarkdown(msg.content);
    if (body) {
      lines.push('', `${speaker}: ${body}`);
    }
  }

  if (chain.showDeliveredOnLast && hasMe(chain)) {
    lines.push('', '_Delivered_');
  }

  return lines.join('\n').trim();
}

function contentToMarkdown(content: MessageContent): string {
  switch (content.type) {
    case 'text':
      return content.text.trim();
    case 'image':
      return content.image.alt.trim() !== ''
        ? `[Image: ${content.image.alt.trim()}]`
        : '[Image]';
    case 'video':
      return content.duration.trim() !== ''
        ? `[Video (${content.duration.trim()})]`
        : '[Video]';
  }
}

function hasMe(chain: IMessageChain): boolean {
  return chain.messages.some(m => m.sender === 'me');
}
