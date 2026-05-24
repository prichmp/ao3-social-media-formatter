import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { emailSchema, emailMessageSchema } from './schema';
import { emailDefaults } from './defaults';

describe('emailSchema', () => {
  it('accepts the example defaults', () => {
    expect(() => emailSchema.parse(emailDefaults)).not.toThrow();
  });

  it('round-trips through JSON without losing or coercing fields', () => {
    const json = JSON.stringify(emailDefaults);
    const parsed = emailSchema.parse(JSON.parse(json));
    expect(JSON.stringify(parsed)).toBe(json);
  });

  it('rejects when `subject` is missing', () => {
    const { subject: _s, ...bad } = emailDefaults;
    void _s;
    expect(() => emailSchema.parse(bad)).toThrow(z.ZodError);
  });

  it('rejects when a message is missing a required field', () => {
    const bad = {
      ...emailDefaults,
      messages: [{ ...emailDefaults.messages[0], body: undefined }],
    };
    expect(() => emailSchema.parse(bad)).toThrow(z.ZodError);
  });
});

describe('emailMessageSchema', () => {
  it('accepts a minimal valid message', () => {
    expect(() => emailMessageSchema.parse({
      id: '1', senderName: 'A', senderEmail: 'a@example.com',
      senderAvatar: { src: '', alt: '' }, senderColor: '#000',
      recipients: 'me', timestamp: 'now', body: 'hi',
    })).not.toThrow();
  });

  it('rejects an object without an id', () => {
    expect(() => emailMessageSchema.parse({
      senderName: 'A', senderEmail: 'a@example.com',
      senderAvatar: { src: '', alt: '' }, senderColor: '#000',
      recipients: 'me', timestamp: 'now', body: 'hi',
    })).toThrow(z.ZodError);
  });
});
