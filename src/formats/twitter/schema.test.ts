import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { tweetAttachmentSchema, twitterPostSchema } from './schema';
import { twitterDefaults } from './defaults';

describe('twitterPostSchema', () => {
  it('accepts the example defaults round-trip', () => {
    expect(() => twitterPostSchema.parse(twitterDefaults)).not.toThrow();
  });

  it('round-trips through JSON without losing or coercing fields', () => {
    const json = JSON.stringify(twitterDefaults);
    const parsed = twitterPostSchema.parse(JSON.parse(json));
    expect(JSON.stringify(parsed)).toBe(json);
  });

  it('throws when `attachment` is missing', () => {
    const { attachment: _a, ...withoutAttachment } = twitterDefaults;
    void _a;
    expect(() => twitterPostSchema.parse(withoutAttachment)).toThrow(z.ZodError);
  });

  it('throws when a reply is missing `attachment`', () => {
    const broken = {
      ...twitterDefaults,
      replies: twitterDefaults.replies.map(r => {
        const { attachment: _a, ...rest } = r;
        void _a;
        return rest;
      }),
    };
    expect(() => twitterPostSchema.parse(broken)).toThrow(z.ZodError);
  });

  it('throws when the legacy shape (sibling `image`/`quote`) is supplied', () => {
    // Pre-refactor data lacks `attachment` and has sibling fields instead.
    // The schema should reject it outright rather than coercing.
    const { attachment: _a, ...rest } = twitterDefaults;
    void _a;
    const legacy = {
      ...rest,
      image: { src: 'x', alt: '' },
      quote: { enabled: false, name: '', handle: '', content: '', avatar: { src: '', alt: '' } },
    };
    expect(() => twitterPostSchema.parse(legacy)).toThrow(z.ZodError);
  });
});

describe('tweetAttachmentSchema', () => {
  it('accepts every valid discriminator', () => {
    expect(() => tweetAttachmentSchema.parse({ type: 'text' })).not.toThrow();
    expect(() => tweetAttachmentSchema.parse({ type: 'image', image: { src: '', alt: '' } })).not.toThrow();
    expect(() => tweetAttachmentSchema.parse({ type: 'quote', avatar: { src: '', alt: '' }, name: '', handle: '', content: '' })).not.toThrow();
    expect(() => tweetAttachmentSchema.parse({ type: 'video', thumbnail: { src: '', alt: '' }, duration: '' })).not.toThrow();
    expect(() => tweetAttachmentSchema.parse({ type: 'music', albumArt: { src: '', alt: '' }, title: '', artist: '' })).not.toThrow();
  });

  it('throws on an unknown discriminator', () => {
    expect(() => tweetAttachmentSchema.parse({ type: 'gif', src: '' })).toThrow(z.ZodError);
  });

  it('throws when a required field for a variant is missing', () => {
    expect(() => tweetAttachmentSchema.parse({ type: 'image' })).toThrow(z.ZodError);
    expect(() => tweetAttachmentSchema.parse({ type: 'quote', name: 'n', handle: 'h', content: 'c' })).toThrow(z.ZodError);
  });
});
