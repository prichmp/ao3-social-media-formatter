import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { livestreamSchema, chatMessageSchema } from './schema';
import { livestreamDefaults } from './defaults';

describe('livestreamSchema', () => {
  it('accepts the example defaults', () => {
    expect(() => livestreamSchema.parse(livestreamDefaults)).not.toThrow();
  });

  it('round-trips through JSON without losing or coercing fields', () => {
    const json = JSON.stringify(livestreamDefaults);
    const parsed = livestreamSchema.parse(JSON.parse(json));
    expect(JSON.stringify(parsed)).toBe(json);
  });

  it('rejects when `streamer` is missing', () => {
    const { streamer: _s, ...bad } = livestreamDefaults;
    void _s;
    expect(() => livestreamSchema.parse(bad)).toThrow(z.ZodError);
  });

  it('rejects an unknown badge kind', () => {
    const bad = {
      ...livestreamDefaults,
      chat: [{ id: '1', username: 'u', color: '#fff', badges: ['admin'], content: 'hi' }],
    };
    expect(() => livestreamSchema.parse(bad)).toThrow(z.ZodError);
  });

  it('rejects a non-boolean showLiveBadge', () => {
    expect(() => livestreamSchema.parse({ ...livestreamDefaults, showLiveBadge: 'on' }))
      .toThrow(z.ZodError);
  });
});

describe('chatMessageSchema', () => {
  it('accepts a minimal valid message', () => {
    expect(() => chatMessageSchema.parse({
      id: '1', username: 'u', color: '', badges: [], content: 'hi',
    })).not.toThrow();
  });

  it('rejects when badges is not an array', () => {
    expect(() => chatMessageSchema.parse({
      id: '1', username: 'u', color: '', badges: 'mod', content: 'hi',
    })).toThrow(z.ZodError);
  });
});
