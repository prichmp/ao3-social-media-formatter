import { describe, it, expect } from 'vitest';
import { layoutPost, type MeasureContext } from './drawPost';
import { theme } from './theme';
import { tumblrDefaults } from '../defaults';
import type { ImageMap } from './images';
import type { TumblrPost } from '../types';

// Stub measuring context: width ≈ 8px per character.
const stubCtx = (): MeasureContext => ({
  font: '',
  measureText: (s: string) => ({ width: s.length * 8 }) as TextMetrics,
});

const emptyImages: ImageMap = new Map();

function layout(post: TumblrPost) {
  return layoutPost(stubCtx(), post, emptyImages);
}

describe('layoutPost', () => {
  it('produces a positive-height card sized to the theme width', () => {
    const result = layout(tumblrDefaults);
    expect(result.width).toBe(theme.cardWidth);
    expect(result.height).toBeGreaterThan(0);
  });

  it('puts the card background rect first', () => {
    const result = layout(tumblrDefaults);
    expect(result.prims[0].t).toBe('rect');
  });

  it('emits each entry username as a bold text prim', () => {
    const result = layout(tumblrDefaults);
    for (const entry of tumblrDefaults.entries) {
      const namePrim = result.prims.find(p => p.t === 'text' && p.text === entry.username);
      expect(namePrim).toBeDefined();
      if (namePrim && namePrim.t === 'text') {
        expect(namePrim.font).toMatch(/bold/);
      }
    }
  });

  it('collapses an entry with no content/image/tags into a "reblogged this" line', () => {
    const result = layout(tumblrDefaults);
    // The defaults include a silent reblog by cherrybonfire-official.
    expect(result.prims.some(p => p.t === 'text' && p.text === 'reblogged this')).toBe(true);
  });

  it('does not collapse the original post even if it has no content/image/tags', () => {
    const post: TumblrPost = {
      entries: [{
        id: '1',
        username: 'op',
        avatar: { src: '', alt: '' },
        content: '',
        image: { src: '', alt: '' },
        tags: [],
      }],
      notes: '',
      timestamp: '',
    };
    const result = layout(post);
    // Original-only with empty body should not say "reblogged this".
    expect(result.prims.some(p => p.t === 'text' && p.text === 'reblogged this')).toBe(false);
  });

  it('renders each tag with a leading "#"', () => {
    const result = layout(tumblrDefaults);
    for (const entry of tumblrDefaults.entries) {
      for (const tag of entry.tags) {
        const prim = result.prims.find(p => p.t === 'text' && p.text === `#${tag}`);
        expect(prim).toBeDefined();
      }
    }
  });

  it('shows the notes count in the footer when present', () => {
    const result = layout(tumblrDefaults);
    expect(result.prims.some(p => p.t === 'text' && p.text === tumblrDefaults.notes)).toBe(true);
  });

  it('shows the timestamp as a right-aligned text prim in the footer', () => {
    const result = layout(tumblrDefaults);
    const ts = result.prims.find(p => p.t === 'text' && p.text === tumblrDefaults.timestamp);
    expect(ts).toBeDefined();
    if (ts && ts.t === 'text') expect(ts.align).toBe('right');
  });

  it('omits the footer when both notes and timestamp are empty', () => {
    const result = layout({ ...tumblrDefaults, notes: '', timestamp: '' });
    // Footer absence: no text prim equal to "47,283 notes" or "2 days ago".
    expect(result.prims.some(p => p.t === 'text' && p.text === '47,283 notes')).toBe(false);
    expect(result.prims.some(p => p.t === 'text' && p.text === '2 days ago')).toBe(false);
  });

  it('grows taller when more entries are added', () => {
    const small = layout({ ...tumblrDefaults, entries: tumblrDefaults.entries.slice(0, 1) });
    const large = layout(tumblrDefaults);
    expect(large.height).toBeGreaterThan(small.height);
  });

  it('handles an empty entries list without throwing', () => {
    const result = layout({ ...tumblrDefaults, entries: [] });
    expect(result.height).toBeGreaterThan(0);
  });
});
