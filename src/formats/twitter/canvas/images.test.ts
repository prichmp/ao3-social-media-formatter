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

  it('excludes attachment images when the type is text', () => {
    const post: TwitterPost = {
      ...twitterDefaults,
      attachment: { type: 'text' },
    };
    // text attachment has no media sources of its own.
    const srcs = collectSrcs(post);
    expect(srcs).not.toContain('https://q/avatar.png');
    expect(srcs).not.toContain('https://x/inline.png');
  });

  it('includes the image src for an image attachment', () => {
    const post: TwitterPost = {
      ...twitterDefaults,
      attachment: { type: 'image', image: { src: 'https://x/inline.png', alt: '' } },
    };
    expect(collectSrcs(post)).toContain('https://x/inline.png');
  });

  it('includes the avatar src for a quote attachment', () => {
    const post: TwitterPost = {
      ...twitterDefaults,
      attachment: { type: 'quote', avatar: { src: 'https://q/avatar.png', alt: '' }, name: 'n', handle: 'h', content: 'c' },
    };
    expect(collectSrcs(post)).toContain('https://q/avatar.png');
  });

  it('includes the thumbnail src for a video attachment', () => {
    const post: TwitterPost = {
      ...twitterDefaults,
      attachment: { type: 'video', thumbnail: { src: 'https://x/thumb.png', alt: '' }, duration: '1:23' },
    };
    expect(collectSrcs(post)).toContain('https://x/thumb.png');
  });

  it('includes the album art src for a music attachment', () => {
    const post: TwitterPost = {
      ...twitterDefaults,
      attachment: { type: 'music', albumArt: { src: 'https://x/art.png', alt: '' }, title: 't', artist: 'a' },
    };
    expect(collectSrcs(post)).toContain('https://x/art.png');
  });

  it('collects attachment sources from replies as well as the main tweet', () => {
    const post: TwitterPost = {
      ...twitterDefaults,
      replies: [{
        ...twitterDefaults.replies[0],
        attachment: { type: 'image', image: { src: 'https://r/inline.png', alt: '' } },
      }],
    };
    expect(collectSrcs(post)).toContain('https://r/inline.png');
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
