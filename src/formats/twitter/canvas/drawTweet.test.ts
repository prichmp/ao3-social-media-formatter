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
      expect(p.x).toBeGreaterThanOrEqual(0);
      if (p.t === 'rect' || p.t === 'image' || p.t === 'line') {
        expect(p.x + p.w).toBeLessThanOrEqual(theme.cardWidth + 0.5);
      } else {
        // text primitives start inside the card
        expect(p.x).toBeLessThan(theme.cardWidth);
      }
    }
  });

  it('flows vertically: nothing is drawn below the card bottom', () => {
    const result = layout(twitterDefaults);
    for (const p of result.prims) {
      expect(p.y).toBeLessThanOrEqual(result.height);
    }
  });

  it('grows taller when a quote tweet and inline image are added', () => {
    const base = layout({ ...twitterDefaults, replies: [] });
    const richer = layout({
      ...twitterDefaults,
      replies: [],
      image: { src: 'https://x/inline.png', alt: '' },
      quote: { enabled: true, name: 'Quoted', handle: 'quoted', content: 'A quoted tweet body.', avatar: { src: '', alt: '' } },
    });
    expect(richer.height).toBeGreaterThan(base.height);
  });

  it('renders a minimal empty post without throwing', () => {
    const empty: TwitterPost = {
      author: { avatar: { src: '', alt: '' }, name: '', handle: '' },
      content: '',
      image: undefined,
      quote: { enabled: false, avatar: { src: '', alt: '' }, name: '', handle: '', content: '' },
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
