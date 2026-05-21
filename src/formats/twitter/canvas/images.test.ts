import { describe, it, expect, vi, afterEach } from 'vitest';
import { collectSrcs, loadImage } from './images';
import { twitterDefaults } from '../defaults';
import type { TwitterPost } from '../types';

describe('collectSrcs', () => {
  it('collects author avatar, reply avatars, and stat icons', () => {
    const srcs = collectSrcs(twitterDefaults);
    expect(srcs).toContain(twitterDefaults.author.avatar.src);
    expect(srcs).toContain(twitterDefaults.statIcons.reply.src);
    twitterDefaults.replies.forEach((r) => expect(srcs).toContain(r.avatar.src));
  });

  it('excludes the quote avatar when the quote is disabled', () => {
    const post: TwitterPost = {
      ...twitterDefaults,
      quote: { ...twitterDefaults.quote, enabled: false, avatar: { src: 'https://q/avatar.png', alt: '' } },
    };
    expect(collectSrcs(post)).not.toContain('https://q/avatar.png');
  });

  it('includes the quote avatar and inline image when present', () => {
    const post: TwitterPost = {
      ...twitterDefaults,
      image: { src: 'https://x/inline.png', alt: '' },
      quote: { ...twitterDefaults.quote, enabled: true, avatar: { src: 'https://q/avatar.png', alt: '' } },
    };
    const srcs = collectSrcs(post);
    expect(srcs).toContain('https://x/inline.png');
    expect(srcs).toContain('https://q/avatar.png');
  });

  it('de-duplicates repeated URLs', () => {
    const dup = 'https://same/pic.png';
    const post: TwitterPost = {
      ...twitterDefaults,
      author: { ...twitterDefaults.author, avatar: { src: dup, alt: '' } },
      replies: [{ ...twitterDefaults.replies[0], avatar: { src: dup, alt: '' } }],
    };
    expect(collectSrcs(post).filter((s) => s === dup)).toHaveLength(1);
  });

  it('skips empty srcs', () => {
    const post: TwitterPost = {
      ...twitterDefaults,
      author: { ...twitterDefaults.author, avatar: { src: '', alt: '' } },
    };
    expect(collectSrcs(post)).not.toContain('');
  });
});

describe('loadImage', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('resolves null when the image fails to load', async () => {
    class FakeImage {
      crossOrigin = '';
      onload: () => void = () => {};
      onerror: () => void = () => {};
      set src(_v: string) {
        queueMicrotask(() => this.onerror());
      }
    }
    vi.stubGlobal('Image', FakeImage);
    await expect(loadImage('https://broken/x.png')).resolves.toBeNull();
  });

  it('resolves the element when the image loads', async () => {
    class FakeImage {
      crossOrigin = '';
      onload: () => void = () => {};
      onerror: () => void = () => {};
      set src(_v: string) {
        queueMicrotask(() => this.onload());
      }
    }
    vi.stubGlobal('Image', FakeImage);
    const result = await loadImage('https://ok/x.png');
    expect(result).not.toBeNull();
  });
});
