import { describe, it, expect } from 'vitest';
import { postToMarkdown } from './markdown';
import { tumblrDefaults } from './defaults';
import type { TumblrPost } from './types';

describe('postToMarkdown', () => {
  it('opens with the original poster as a bold username', () => {
    const md = postToMarkdown(tumblrDefaults);
    expect(md.split('\n')[0]).toBe(`**${tumblrDefaults.entries[0].username}**`);
  });

  it('separates entries with a horizontal rule', () => {
    const md = postToMarkdown(tumblrDefaults);
    const rules = (md.match(/^---$/gm) ?? []).length;
    expect(rules).toBe(tumblrDefaults.entries.length - 1);
  });

  it('emits a "reblogged this" line for silent reblogs', () => {
    const md = postToMarkdown(tumblrDefaults);
    expect(md).toContain('**cherrybonfire-official** reblogged this');
  });

  it('formats tags as space-separated #tags on their own line', () => {
    const md = postToMarkdown(tumblrDefaults);
    expect(md).toContain('#adora discourse #catra discourse');
  });

  it('renders the footer with notes count + timestamp', () => {
    const md = postToMarkdown(tumblrDefaults);
    expect(md).toContain(`**${tumblrDefaults.notes}** · _${tumblrDefaults.timestamp}_`);
  });

  it('omits the footer line when both notes and timestamp are empty', () => {
    const post: TumblrPost = { ...tumblrDefaults, notes: '', timestamp: '' };
    const md = postToMarkdown(post);
    expect(md).not.toContain('notes');
    expect(md).not.toContain('days ago');
  });

  it('renders an image marker when an entry has an image', () => {
    const post: TumblrPost = {
      ...tumblrDefaults,
      entries: [{
        id: '1', username: 'op',
        avatar: { src: '', alt: '' },
        content: '',
        image: { src: 'x', alt: 'a cat' },
        tags: [],
      }],
    };
    expect(postToMarkdown(post)).toContain('[Image: a cat]');
  });
});
