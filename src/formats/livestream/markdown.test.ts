import { describe, it, expect } from 'vitest';
import { segmentToMarkdown } from './markdown';
import { livestreamDefaults } from './defaults';
import type { LivestreamSegment } from './types';

describe('segmentToMarkdown', () => {
  it('opens with the streamer-is-live line', () => {
    expect(segmentToMarkdown(livestreamDefaults).split('\n')[0])
      .toBe(`**${livestreamDefaults.streamer.name}** is live`);
  });

  it('renders the title, category, and viewer count as italic lines', () => {
    const md = segmentToMarkdown(livestreamDefaults);
    expect(md).toContain(livestreamDefaults.title);
    expect(md).toContain(`_Playing: ${livestreamDefaults.category}_`);
    expect(md).toContain(`_${livestreamDefaults.viewerCount} viewers_`);
  });

  it('separates the header from chat with a horizontal rule', () => {
    expect(segmentToMarkdown(livestreamDefaults)).toContain('\n---\n');
  });

  it('formats each chat message with badges + bold username + body', () => {
    const segment: LivestreamSegment = {
      ...livestreamDefaults,
      chat: [{
        id: '1', username: 'mossy', color: '#9147ff',
        badges: ['mod', 'subscriber'], content: 'kekw',
      }],
    };
    expect(segmentToMarkdown(segment)).toContain('[mod/subscriber] **mossy**: kekw');
  });

  it('omits the chat section when there are no messages', () => {
    const md = segmentToMarkdown({ ...livestreamDefaults, chat: [] });
    expect(md).not.toContain('---');
  });
});
