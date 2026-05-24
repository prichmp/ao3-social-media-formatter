import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { imessageSchema } from './schema';
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
      messages: [{ id: '1', sender: 'bot', content: 'hi', timestamp: '' }],
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
});
