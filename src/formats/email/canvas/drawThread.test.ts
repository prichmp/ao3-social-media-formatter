import { describe, it, expect } from 'vitest';
import { layoutThread, type MeasureContext } from './drawThread';
import { theme } from './theme';
import { emailDefaults } from '../defaults';
import type { ImageMap } from './images';
import type { EmailThread } from '../types';

// Stub measuring context: width ≈ 8px per character.
const stubCtx = (): MeasureContext => ({
  font: '',
  measureText: (s: string) => ({ width: s.length * 8 }) as TextMetrics,
});

const emptyImages: ImageMap = new Map();

function layout(thread: EmailThread) {
  return layoutThread(stubCtx(), thread, emptyImages);
}

describe('layoutThread', () => {
  it('produces a positive-height card sized to the theme width', () => {
    const result = layout(emailDefaults);
    expect(result.width).toBe(theme.cardWidth);
    expect(result.height).toBeGreaterThan(0);
  });

  it('puts the card background rect first', () => {
    const result = layout(emailDefaults);
    expect(result.prims[0].t).toBe('rect');
  });

  it('emits each sender name as a bold text prim', () => {
    const result = layout(emailDefaults);
    for (const msg of emailDefaults.messages) {
      const namePrim = result.prims.find(p => p.t === 'text' && p.text === msg.senderName);
      expect(namePrim).toBeDefined();
      if (namePrim && namePrim.t === 'text') {
        expect(namePrim.font).toMatch(/bold/);
      }
    }
  });

  it('renders each timestamp as a right-aligned text prim', () => {
    // Force non-empty timestamps so the test doesn't depend on the
    // example defaults happening to include any.
    const thread: EmailThread = {
      ...emailDefaults,
      messages: emailDefaults.messages.map((m, i) => ({
        ...m,
        timestamp: `Mon, Jan ${i + 1}, 10:00 AM`,
      })),
    };
    const result = layout(thread);
    for (const msg of thread.messages) {
      const tsPrim = result.prims.find(p => p.t === 'text' && p.text === msg.timestamp);
      expect(tsPrim).toBeDefined();
      if (tsPrim && tsPrim.t === 'text') {
        expect(tsPrim.align).toBe('right');
      }
    }
  });

  it('renders a "to <recipients>" line for each message', () => {
    const result = layout(emailDefaults);
    for (const msg of emailDefaults.messages) {
      expect(result.prims.some(p => p.t === 'text' && p.text === `to ${msg.recipients}`)).toBe(true);
    }
  });

  it('attaches the per-message senderColor to each avatar placeholder', () => {
    const result = layout(emailDefaults);
    const avatars = result.prims.filter(p => p.t === 'image' && p.circle) as Array<Extract<typeof result.prims[number], { t: 'image' }>>;
    expect(avatars.length).toBe(emailDefaults.messages.length);
    avatars.forEach((avatar, i) => {
      expect(avatar.placeholderColor).toBe(emailDefaults.messages[i].senderColor);
    });
  });

  it('uses the first letter of senderName as the avatar initial', () => {
    const result = layout(emailDefaults);
    const avatars = result.prims.filter(p => p.t === 'image' && p.circle) as Array<Extract<typeof result.prims[number], { t: 'image' }>>;
    avatars.forEach((avatar, i) => {
      expect(avatar.placeholderLetter)
        .toBe(emailDefaults.messages[i].senderName.charAt(0).toUpperCase());
    });
  });

  it('renders the subject text', () => {
    const result = layout(emailDefaults);
    // The subject may have wrapped onto more than one line; just check the
    // first word is present in some text prim.
    const firstWord = emailDefaults.subject.split(' ')[0];
    expect(result.prims.some(p => p.t === 'text' && p.text.includes(firstWord))).toBe(true);
  });

  it('renders the inbox label pill when label is non-empty', () => {
    const result = layout({ ...emailDefaults, label: 'Important' });
    expect(result.prims.some(p => p.t === 'text' && p.text === 'Important')).toBe(true);
  });

  it('omits the label pill when label is empty', () => {
    const result = layout({ ...emailDefaults, label: '' });
    expect(result.prims.some(p => p.t === 'text' && p.text === emailDefaults.label)).toBe(false);
  });

  it('grows taller when more messages are added', () => {
    const small = layout({ ...emailDefaults, messages: emailDefaults.messages.slice(0, 1) });
    const large = layout(emailDefaults);
    expect(large.height).toBeGreaterThan(small.height);
  });

  it('handles an empty messages list without throwing', () => {
    const result = layout({ ...emailDefaults, messages: [] });
    expect(result.height).toBeGreaterThan(0);
  });
});
