import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { tumblrSchema, tumblrEntrySchema } from './schema';
import { tumblrDefaults } from './defaults';

describe('tumblrSchema', () => {
  it('accepts the example defaults', () => {
    expect(() => tumblrSchema.parse(tumblrDefaults)).not.toThrow();
  });

  it('round-trips through JSON without losing or coercing fields', () => {
    const json = JSON.stringify(tumblrDefaults);
    const parsed = tumblrSchema.parse(JSON.parse(json));
    expect(JSON.stringify(parsed)).toBe(json);
  });

  it('rejects when `entries` is missing', () => {
    const { entries: _e, ...bad } = tumblrDefaults;
    void _e;
    expect(() => tumblrSchema.parse(bad)).toThrow(z.ZodError);
  });

  it('rejects when an entry has non-string tags', () => {
    const bad = {
      ...tumblrDefaults,
      entries: [{ ...tumblrDefaults.entries[0], tags: [1, 2, 3] }],
    };
    expect(() => tumblrSchema.parse(bad)).toThrow(z.ZodError);
  });
});

describe('tumblrEntrySchema', () => {
  it('accepts a minimal valid entry', () => {
    expect(() => tumblrEntrySchema.parse({
      id: '1', username: 'u', avatar: { src: '', alt: '' },
      content: '', image: { src: '', alt: '' }, tags: [],
    })).not.toThrow();
  });

  it('rejects an entry missing `tags`', () => {
    expect(() => tumblrEntrySchema.parse({
      id: '1', username: 'u', avatar: { src: '', alt: '' },
      content: '', image: { src: '', alt: '' },
    })).toThrow(z.ZodError);
  });
});
