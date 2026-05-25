import { describe, it, expect } from 'vitest';
import { segmentToMarkdown } from './markdown';
import { livestreamDefaults } from './defaults';
import type { LivestreamSegment } from './types';

// Build a populated segment so the tests don't depend on the example
// defaults having any particular content.
function populated(): LivestreamSegment {
  return {
    ...livestreamDefaults,
    streamer: { ...livestreamDefaults.streamer, name: 'AdoraIRL' },
    title: 'first playthrough',
    category: 'Hades II',
    viewerCount: '3.2K',
    chat: [{
      id: 'c1', username: 'fan', color: '#9147ff',
      badges: [], content: 'hi',
    }],
  };
}

describe('segmentToMarkdown', () => {
  it('opens with the streamer-is-live line', () => {
    expect(segmentToMarkdown(populated()).split('\n')[0]).toBe('AdoraIRL is live');
  });

  it('renders the title, category, and viewer count as plain lines', () => {
    const md = segmentToMarkdown(populated());
    expect(md).toContain('first playthrough');
    expect(md).toContain('Playing: Hades II');
    expect(md).toContain('3.2K viewers');
  });

  it('separates the header from chat with a horizontal rule', () => {
    expect(segmentToMarkdown(populated())).toContain('\n---\n');
  });

  it('formats each chat message with badges + username + body', () => {
    const segment: LivestreamSegment = {
      ...livestreamDefaults,
      chat: [{
        id: '1', username: 'mossy', color: '#9147ff',
        badges: ['mod', 'subscriber'], content: 'kekw',
      }],
    };
    expect(segmentToMarkdown(segment)).toContain('[mod/subscriber] mossy: kekw');
  });

  it('omits the chat section when there are no messages', () => {
    const md = segmentToMarkdown({ ...livestreamDefaults, chat: [] });
    expect(md).not.toContain('---');
  });
});
