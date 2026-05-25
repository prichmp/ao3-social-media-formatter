import { describe, it, expect } from 'vitest';
import { tweetToMarkdown } from './markdownBuilder';
import { twitterDefaults } from '../formats/twitter/defaults';
import type { TwitterPost } from '../formats/twitter/types';

function withAttachment(a: TwitterPost['attachment']): TwitterPost {
  return { ...twitterDefaults, replies: [], attachment: a };
}

describe('tweetToMarkdown', () => {
  it('renders the author as name + handle on the first line', () => {
    const md = tweetToMarkdown({ ...twitterDefaults, replies: [] });
    expect(md.split('\n')[0]).toBe(
      `${twitterDefaults.author.name} @${twitterDefaults.author.handle}`,
    );
  });

  it('includes the tweet content body', () => {
    const md = tweetToMarkdown({ ...twitterDefaults, replies: [] });
    expect(md).toContain(twitterDefaults.content);
  });

  it('omits attachment rendering for a text-only post', () => {
    const md = tweetToMarkdown(withAttachment({ type: 'text' }));
    expect(md).not.toContain('[Image');
    expect(md).not.toContain('[Video');
    expect(md).not.toContain('🎵');
    expect(md).not.toMatch(/^>/m);
  });

  it('renders an image attachment with its alt text', () => {
    const md = tweetToMarkdown(withAttachment({ type: 'image', image: { src: 'x', alt: 'a kitten' } }));
    expect(md).toContain('[Image: a kitten]');
  });

  it('renders an image attachment without alt as a bare marker', () => {
    const md = tweetToMarkdown(withAttachment({ type: 'image', image: { src: 'x', alt: '' } }));
    expect(md).toContain('[Image]');
  });

  it('renders a quote attachment as a blockquote with header and body', () => {
    const md = tweetToMarkdown(withAttachment({
      type: 'quote',
      avatar: { src: '', alt: '' },
      name: 'Adora',
      handle: 'adoragrayskull',
      verified: false,
      content: 'We never dated',
    }));
    expect(md).toContain('   Adora @adoragrayskull');
    expect(md).toContain('   We never dated');
  });

  it('quotes each line of a multi-line quote body', () => {
    const md = tweetToMarkdown(withAttachment({
      type: 'quote',
      avatar: { src: '', alt: '' },
      name: 'A',
      handle: 'a',
      verified: false,
      content: 'line one\nline two',
    }));
    expect(md).toContain('   line one');
    expect(md).toContain('   line two');
  });

  it('renders a video attachment with the duration when present', () => {
    expect(tweetToMarkdown(withAttachment({ type: 'video', thumbnail: { src: '', alt: '' }, duration: '0:42' })))
      .toContain('[Video (0:42)]');
    expect(tweetToMarkdown(withAttachment({ type: 'video', thumbnail: { src: '', alt: '' }, duration: '' })))
      .toContain('[Video]');
  });

  it('renders a music attachment with title and artist', () => {
    const md = tweetToMarkdown(withAttachment({
      type: 'music',
      albumArt: { src: '', alt: '' },
      title: 'Song',
      artist: 'Artist',
    }));
    expect(md).toContain('🎵 Song — Artist');
  });

  it('includes the timestamp as italic text', () => {
    const md = tweetToMarkdown({ ...twitterDefaults, replies: [], time: '9:40 AM', relativeTime: '10 hours ago' });
    expect(md).toContain('9:40 AM · 10 hours ago');
  });

  it('separates each reply with a horizontal rule', () => {
    const withReplies: TwitterPost = {
      ...twitterDefaults,
      replies: [
        {
          id: 'r1', avatar: { src: '', alt: '' },
          name: 'R1', handle: 'r1', verified: false,
          relativeTime: '', replyingTo: 'op',
          content: 'first', attachment: { type: 'text' }, showStats: true,
        },
        {
          id: 'r2', avatar: { src: '', alt: '' },
          name: 'R2', handle: 'r2', verified: false,
          relativeTime: '', replyingTo: 'op',
          content: 'second', attachment: { type: 'text' }, showStats: true,
        },
      ],
    };
    const md = tweetToMarkdown(withReplies);
    const ruleCount = (md.match(/^---$/gm) ?? []).length;
    expect(ruleCount).toBe(withReplies.replies.length);
  });

  it('renders the replyingTo target inside each reply block', () => {
    const withReply: TwitterPost = {
      ...twitterDefaults,
      replies: [{
        id: 'r1', avatar: { src: '', alt: '' },
        name: 'R1', handle: 'r1', verified: false,
        relativeTime: '', replyingTo: 'somebody',
        content: 'reply body', attachment: { type: 'text' }, showStats: true,
      }],
    };
    expect(tweetToMarkdown(withReply)).toContain('Replying to @somebody');
  });
});
