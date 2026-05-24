import { describe, it, expect } from 'vitest';
import { layoutTweet, type MeasureContext } from './drawTweet';
import { theme } from './theme';
import { twitterDefaults } from '../defaults';
import type { ImageMap } from './images';
import type { TwitterPost } from '../types';

// Stub measuring context: width ≈ 8px per character. Wrapping uses this, so the
// laid-out text fits the same widths we assert against here.
const stubCtx = (): MeasureContext => ({
  font: '',
  measureText: (s: string) => ({ width: s.length * 8 }) as TextMetrics,
});

const emptyImages: ImageMap = new Map();

function layout(post: TwitterPost) {
  return layoutTweet(stubCtx(), post, emptyImages);
}

describe('layoutTweet', () => {
  it('produces a positive-height card sized to the theme width', () => {
    const result = layout(twitterDefaults);
    expect(result.width).toBe(theme.cardWidth);
    expect(result.height).toBeGreaterThan(0);
  });

  it('puts the card background rect first, covering the full height', () => {
    const result = layout(twitterDefaults);
    const first = result.prims[0];
    expect(first.t).toBe('rect');
    if (first.t === 'rect') {
      expect(first.h).toBeGreaterThanOrEqual(result.height - 2);
    }
  });

  it('never positions a drawing primitive outside the card width', () => {
    const result = layout(twitterDefaults);
    for (const p of result.prims) {
      if (p.t === 'rect' || p.t === 'image' || p.t === 'line') {
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.x + p.w).toBeLessThanOrEqual(theme.cardWidth + 0.5);
      } else if (p.t === 'text') {
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.x).toBeLessThan(theme.cardWidth);
      } else {
        // 'tri': each vertex must be inside the card.
        for (const x of [p.x1, p.x2, p.x3]) {
          expect(x).toBeGreaterThanOrEqual(0);
          expect(x).toBeLessThanOrEqual(theme.cardWidth);
        }
      }
    }
  });

  it('flows vertically: nothing is drawn below the card bottom', () => {
    const result = layout(twitterDefaults);
    for (const p of result.prims) {
      if (p.t === 'tri') {
        for (const yv of [p.y1, p.y2, p.y3]) {
          expect(yv).toBeLessThanOrEqual(result.height);
        }
      } else {
        expect(p.y).toBeLessThanOrEqual(result.height);
      }
    }
  });

  it('grows taller when an image attachment is added', () => {
    const base = layout({ ...twitterDefaults, replies: [], attachment: { type: 'text' } });
    const withImage = layout({
      ...twitterDefaults,
      replies: [],
      attachment: { type: 'image', image: { src: 'https://x/inline.png', alt: '' } },
    });
    expect(withImage.height).toBeGreaterThan(base.height);
  });

  it('grows taller when a quote attachment is added', () => {
    const base = layout({ ...twitterDefaults, replies: [], attachment: { type: 'text' } });
    const withQuote = layout({
      ...twitterDefaults,
      replies: [],
      attachment: {
        type: 'quote',
        name: 'Quoted',
        handle: 'quoted',
        content: 'A quoted tweet body.',
        avatar: { src: '', alt: '' },
      },
    });
    expect(withQuote.height).toBeGreaterThan(base.height);
  });

  it('emits a play-triangle primitive for a video attachment', () => {
    const result = layout({
      ...twitterDefaults,
      replies: [],
      attachment: { type: 'video', thumbnail: { src: 'https://x/thumb.png', alt: '' }, duration: '0:42' },
    });
    expect(result.prims.some(p => p.t === 'tri')).toBe(true);
  });

  it('renders a music card with title and artist text', () => {
    const result = layout({
      ...twitterDefaults,
      replies: [],
      attachment: { type: 'music', albumArt: { src: '', alt: '' }, title: 'Song Title', artist: 'Artist Name' },
    });
    const texts = result.prims.flatMap(p => (p.t === 'text' ? [p.text] : []));
    expect(texts).toContain('Song Title');
    expect(texts).toContain('Artist Name');
  });

  it('emits a play-triangle primitive for a music attachment', () => {
    const result = layout({
      ...twitterDefaults,
      replies: [],
      attachment: { type: 'music', albumArt: { src: '', alt: '' }, title: 't', artist: 'a' },
    });
    expect(result.prims.some(p => p.t === 'tri')).toBe(true);
  });

  it('truncates overlong music title/artist with an ellipsis', () => {
    const longTitle = 'A'.repeat(200);
    const result = layout({
      ...twitterDefaults,
      replies: [],
      attachment: { type: 'music', albumArt: { src: '', alt: '' }, title: longTitle, artist: longTitle },
    });
    const texts = result.prims.flatMap(p => (p.t === 'text' ? [p.text] : []));
    expect(texts.some(t => t.includes('…'))).toBe(true);
    expect(texts).not.toContain(longTitle);
  });

  it('grows taller when a reply has an attachment of its own', () => {
    const baseReply = twitterDefaults.replies[0];
    const noAtt = layout({
      ...twitterDefaults,
      replies: [{ ...baseReply, attachment: { type: 'text' } }],
    });
    const withAtt = layout({
      ...twitterDefaults,
      replies: [{
        ...baseReply,
        attachment: { type: 'image', image: { src: 'https://x/img.png', alt: '' } },
      }],
    });
    expect(withAtt.height).toBeGreaterThan(noAtt.height);
  });

  it('renders a minimal empty post without throwing', () => {
    const empty: TwitterPost = {
      author: { avatar: { src: '', alt: '' }, name: '', handle: '' },
      content: '',
      attachment: { type: 'text' },
      time: '',
      relativeTime: '',
      stats: { showRow: false, labels: '' },
      statIcons: twitterDefaults.statIcons,
      replies: [],
    };
    const result = layout(empty);
    expect(result.height).toBeGreaterThan(0);
  });
});
