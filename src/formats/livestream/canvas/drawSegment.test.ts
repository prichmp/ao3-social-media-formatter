import { describe, it, expect } from 'vitest';
import { layoutSegment, type MeasureContext } from './drawSegment';
import { theme } from './theme';
import { livestreamDefaults } from '../defaults';
import type { ImageMap } from './images';
import type { LivestreamSegment } from '../types';

// Stub measuring context: width ≈ 8px per character.
const stubCtx = (): MeasureContext => ({
  font: '',
  measureText: (s: string) => ({ width: s.length * 8 }) as TextMetrics,
});

const emptyImages: ImageMap = new Map();

function layout(segment: LivestreamSegment) {
  return layoutSegment(stubCtx(), segment, emptyImages);
}

describe('layoutSegment', () => {
  it('produces a positive-height card sized to the theme width', () => {
    const result = layout(livestreamDefaults);
    expect(result.width).toBe(theme.cardWidth);
    expect(result.height).toBeGreaterThan(0);
  });

  it('emits the player rectangle as the first image prim', () => {
    const result = layout(livestreamDefaults);
    const firstImage = result.prims.find(p => p.t === 'image');
    expect(firstImage).toBeDefined();
    if (firstImage && firstImage.t === 'image') {
      expect(firstImage.w).toBe(theme.cardWidth);
      expect(firstImage.h).toBeCloseTo(theme.cardWidth * theme.playerAspect, 5);
    }
  });

  it('emits a LIVE pill when showLiveBadge is on', () => {
    const result = layout(livestreamDefaults);
    expect(result.prims.some(p => p.t === 'text' && p.text === 'LIVE')).toBe(true);
  });

  it('omits the LIVE pill when showLiveBadge is off', () => {
    const result = layout({ ...livestreamDefaults, showLiveBadge: false });
    expect(result.prims.some(p => p.t === 'text' && p.text === 'LIVE')).toBe(false);
  });

  it('renders the viewer count when provided alongside the LIVE pill', () => {
    const result = layout({ ...livestreamDefaults, viewerCount: '1.2K' });
    expect(result.prims.some(p => p.t === 'text' && p.text === '1.2K')).toBe(true);
  });

  it('renders the streamer name in bold', () => {
    const result = layout(livestreamDefaults);
    const nameText = result.prims.find(p => p.t === 'text' && p.text === livestreamDefaults.streamer.name);
    expect(nameText).toBeDefined();
    if (nameText && nameText.t === 'text') {
      expect(nameText.font).toMatch(/bold/);
    }
  });

  it('renders every chat username (with trailing colon) in its picked color', () => {
    const result = layout(livestreamDefaults);
    for (const msg of livestreamDefaults.chat) {
      const userText = result.prims.find(p => p.t === 'text' && p.text === `${msg.username}:`);
      expect(userText).toBeDefined();
      if (userText && userText.t === 'text') {
        expect(userText.color).toBe(msg.color);
      }
    }
  });

  it('emits a colored badge rect for each badge on a chat message', () => {
    const segment: LivestreamSegment = {
      ...livestreamDefaults,
      chat: [{
        id: '1', username: 'u', color: '#fff',
        badges: ['broadcaster', 'mod'], content: 'hi',
      }],
      showLiveBadge: false,
    };
    const result = layout(segment);
    const broadcasterBadge = result.prims.find(p => p.t === 'rect' && p.fill === theme.badgeColors.broadcaster);
    const modBadge = result.prims.find(p => p.t === 'rect' && p.fill === theme.badgeColors.mod);
    expect(broadcasterBadge).toBeDefined();
    expect(modBadge).toBeDefined();
  });

  it('grows taller when chat messages are added', () => {
    const small = layout({ ...livestreamDefaults, chat: livestreamDefaults.chat.slice(0, 1) });
    const large = layout(livestreamDefaults);
    expect(large.height).toBeGreaterThan(small.height);
  });

  it('handles an empty chat without throwing', () => {
    const result = layout({ ...livestreamDefaults, chat: [] });
    expect(result.height).toBeGreaterThan(0);
  });

  it('positions the body text after the username -- no overlap even when badges precede it', () => {
    // Regression: ctx.font is shared across measurer() closures, and the
    // badge loop leaves it set to the small badge font. The username's
    // width must still be measured at chatSize bold so the body doesn't
    // get drawn on top of it.
    const segment: LivestreamSegment = {
      ...livestreamDefaults,
      showLiveBadge: false,
      chat: [{
        id: '1',
        username: 'best_friend_squad',   // chosen for length
        color: '#1E90FF',
        badges: ['mod', 'subscriber'],
        content: 'GO MELINOE GO',
      }],
    };
    const result = layout(segment);
    const userPrim = result.prims.find(p => p.t === 'text' && p.text === 'best_friend_squad:');
    const bodyPrim = result.prims.find(p => p.t === 'text' && p.text === 'GO MELINOE GO');
    expect(userPrim).toBeDefined();
    expect(bodyPrim).toBeDefined();
    if (userPrim && userPrim.t === 'text' && bodyPrim && bodyPrim.t === 'text') {
      // stub measureText: width = chars * 8 → username:'best_friend_squad:' is 18 chars = 144px wide.
      // Body must start past userPrim.x + 144.
      const userEndX = userPrim.x + 'best_friend_squad:'.length * 8;
      expect(bodyPrim.x).toBeGreaterThanOrEqual(userEndX);
    }
  });
});
