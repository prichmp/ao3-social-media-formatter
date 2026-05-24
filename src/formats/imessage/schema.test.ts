import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { imessageSchema, messageContentSchema } from './schema';
import { imessageDefaults } from './defaults';

describe('imessageSchema', () => {
  it('accepts the example defaults round-trip', () => {
    expect(() => imessageSchema.parse(imessageDefaults)).not.toThrow();
  });

  it('round-trips through JSON without losing or coercing fields', () => {
    const json = JSON.stringify(imessageDefaults);
    const parsed = imessageSchema.parse(JSON.parse(json));
    expect(JSON.stringify(parsed)).toBe(json);
  });

  it('rejects an unknown sender value', () => {
    const bad = {
      ...imessageDefaults,
      messages: [{ id: '1', sender: 'bot', content: { type: 'text', text: 'hi' }, timestamp: '' }],
    };
    expect(() => imessageSchema.parse(bad)).toThrow(z.ZodError);
  });

  it('rejects a message that is missing a required field', () => {
    const bad = {
      ...imessageDefaults,
      messages: [{ id: '1', sender: 'me', timestamp: '' }],
    };
    expect(() => imessageSchema.parse(bad)).toThrow(z.ZodError);
  });

  it('rejects a non-boolean showDeliveredOnLast', () => {
    const bad = { ...imessageDefaults, showDeliveredOnLast: 'yes' };
    expect(() => imessageSchema.parse(bad)).toThrow(z.ZodError);
  });

  it('rejects the legacy `content: string` shape', () => {
    // Pre-refactor data carried `content` as a bare string. Reject so bad
    // shapes don't sneak through.
    const bad = {
      ...imessageDefaults,
      messages: [{ id: '1', sender: 'me', content: 'hi', timestamp: '' }],
    };
    expect(() => imessageSchema.parse(bad)).toThrow(z.ZodError);
  });
});

describe('messageContentSchema', () => {
  it('accepts every valid discriminator', () => {
    expect(() => messageContentSchema.parse({ type: 'text', text: 'hi' })).not.toThrow();
    expect(() => messageContentSchema.parse({ type: 'image', image: { src: '', alt: '' } })).not.toThrow();
    expect(() => messageContentSchema.parse({ type: 'video', thumbnail: { src: '', alt: '' }, duration: '0:42' })).not.toThrow();
  });

  it('rejects an unknown content type', () => {
    expect(() => messageContentSchema.parse({ type: 'gif', src: '' })).toThrow(z.ZodError);
  });

  it('rejects a missing required field per variant', () => {
    expect(() => messageContentSchema.parse({ type: 'text' })).toThrow(z.ZodError);
    expect(() => messageContentSchema.parse({ type: 'image' })).toThrow(z.ZodError);
    expect(() => messageContentSchema.parse({ type: 'video', thumbnail: { src: '', alt: '' } })).toThrow(z.ZodError);
  });
});
