import { describe, it, expect } from 'vitest';
import { layoutChain, type MeasureContext } from './drawChain';
import { theme } from './theme';
import { imessageDefaults } from '../defaults';
import type { ImageMap } from './images';
import type { IMessageChain, MessageContent } from '../types';

// Stub measuring context: width ≈ 8px per character. Wrapping uses this so
// the laid-out text fits the widths we assert against here.
const stubCtx = (): MeasureContext => ({
  font: '',
  measureText: (s: string) => ({ width: s.length * 8 }) as TextMetrics,
});

const emptyImages: ImageMap = new Map();

function layout(chain: IMessageChain) {
  return layoutChain(stubCtx(), chain, emptyImages);
}

const text = (s: string): MessageContent => ({ type: 'text', text: s });

describe('layoutChain', () => {
  it('produces a positive-height card sized to the theme width', () => {
    const result = layout(imessageDefaults);
    expect(result.width).toBe(theme.cardWidth);
    expect(result.height).toBeGreaterThan(0);
  });

  it('puts the card background rect first', () => {
    const result = layout(imessageDefaults);
    expect(result.prims[0].t).toBe('rect');
  });

  it('renders the contact name as a centered text primitive', () => {
    const result = layout(imessageDefaults);
    const nameText = result.prims.find(p => p.t === 'text' && p.text === imessageDefaults.contactName);
    expect(nameText).toBeDefined();
    if (nameText && nameText.t === 'text') {
      expect(nameText.align).toBe('center');
    }
  });

  it('positions "me" text bubbles on the right edge and "them" bubbles on the left', () => {
    const chain: IMessageChain = {
      ...imessageDefaults,
      messages: [
        { id: '1', sender: 'them', content: text('hi'),      timestamp: '' },
        { id: '2', sender: 'me',   content: text('hi back'), timestamp: '' },
      ],
    };
    const result = layout(chain);
    const rects = result.prims.filter(p => p.t === 'rect') as Array<Extract<typeof result.prims[number], { t: 'rect' }>>;
    // Text-bubble rects are the ones with the bubble radius.
    const bubbles = rects.filter(r => r.radius === theme.bubbleRadius);
    expect(bubbles.length).toBe(2);
    const [themBubble, meBubble] = bubbles;
    expect(themBubble.x).toBe(theme.paddingX);
    expect(meBubble.x + meBubble.w).toBeCloseTo(theme.cardWidth - theme.paddingX, 5);
  });

  it('emits a "Delivered" line after the last "me" bubble when enabled', () => {
    const chain: IMessageChain = {
      ...imessageDefaults,
      messages: [
        { id: '1', sender: 'them', content: text('hi'),      timestamp: '' },
        { id: '2', sender: 'me',   content: text('hi back'), timestamp: '' },
      ],
      showDeliveredOnLast: true,
    };
    const result = layout(chain);
    const delivered = result.prims.find(p => p.t === 'text' && p.text === 'Delivered');
    expect(delivered).toBeDefined();
  });

  it('omits "Delivered" when the flag is off', () => {
    const chain: IMessageChain = { ...imessageDefaults, showDeliveredOnLast: false };
    const result = layout(chain);
    expect(result.prims.find(p => p.t === 'text' && p.text === 'Delivered')).toBeUndefined();
  });

  it('renders timestamp labels as centered text', () => {
    const chain: IMessageChain = {
      ...imessageDefaults,
      messages: [{ id: '1', sender: 'them', content: text('hi'), timestamp: 'Today 9:00 AM' }],
    };
    const result = layout(chain);
    const ts = result.prims.find(p => p.t === 'text' && p.text === 'Today 9:00 AM');
    expect(ts).toBeDefined();
    if (ts && ts.t === 'text') expect(ts.align).toBe('center');
  });

  it('grows taller when more messages are added', () => {
    const small = layout({ ...imessageDefaults, messages: imessageDefaults.messages.slice(0, 1) });
    const large = layout(imessageDefaults);
    expect(large.height).toBeGreaterThan(small.height);
  });

  it('handles an empty messages list without throwing', () => {
    const chain: IMessageChain = { ...imessageDefaults, messages: [] };
    const result = layout(chain);
    expect(result.height).toBeGreaterThan(0);
  });

  it('emits an image prim (not a colored bubble) for an image message', () => {
    const chain: IMessageChain = {
      ...imessageDefaults,
      messages: [{
        id: '1',
        sender: 'me',
        content: { type: 'image', image: { src: 'x', alt: '' } },
        timestamp: '',
      }],
      showDeliveredOnLast: false,
    };
    const result = layout(chain);
    const messageImage = result.prims.find(p => p.t === 'image' && !p.circle && p.radius === theme.bubbleRadius);
    expect(messageImage).toBeDefined();
    // No bubble-radius rect for image-type messages -- the image itself is the bubble.
    const colored = result.prims.filter(p => p.t === 'rect' && p.radius === theme.bubbleRadius);
    expect(colored.length).toBe(0);
  });

  it('aligns an image message to the right when sent by "me"', () => {
    const chain: IMessageChain = {
      ...imessageDefaults,
      messages: [{
        id: '1',
        sender: 'me',
        content: { type: 'image', image: { src: 'x', alt: '' } },
        timestamp: '',
      }],
      showDeliveredOnLast: false,
    };
    const result = layout(chain);
    const messageImage = result.prims.find(p => p.t === 'image' && !p.circle && p.radius === theme.bubbleRadius);
    expect(messageImage).toBeDefined();
    if (messageImage && messageImage.t === 'image') {
      expect(messageImage.x + messageImage.w).toBeCloseTo(theme.cardWidth - theme.paddingX, 5);
    }
  });

  it('emits a play-triangle primitive for a video message', () => {
    const chain: IMessageChain = {
      ...imessageDefaults,
      messages: [{
        id: '1',
        sender: 'them',
        content: { type: 'video', thumbnail: { src: 'x', alt: '' }, duration: '0:42' },
        timestamp: '',
      }],
      showDeliveredOnLast: false,
    };
    const result = layout(chain);
    expect(result.prims.some(p => p.t === 'tri')).toBe(true);
  });

  it('renders the duration text for a video message when supplied', () => {
    const chain: IMessageChain = {
      ...imessageDefaults,
      messages: [{
        id: '1',
        sender: 'them',
        content: { type: 'video', thumbnail: { src: 'x', alt: '' }, duration: '0:42' },
        timestamp: '',
      }],
      showDeliveredOnLast: false,
    };
    const result = layout(chain);
    expect(result.prims.some(p => p.t === 'text' && p.text === '0:42')).toBe(true);
  });
});
