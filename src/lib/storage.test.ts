import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { z } from 'zod';
import { loadState } from './storage';

const STORAGE_KEY = 'ao3-formatter-state';
const schema = z.object({ activeFormat: z.string(), count: z.number() });

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('loadState', () => {
  it('returns null when the key is absent', () => {
    expect(loadState(schema)).toBeNull();
  });

  it('returns the parsed value when stored data matches the schema', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ activeFormat: 'twitter', count: 3 }));
    expect(loadState(schema)).toEqual({ activeFormat: 'twitter', count: 3 });
  });

  it('clears localStorage and returns null when stored data fails zod validation', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    // `count` is wrong shape -- zod rejects.
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ activeFormat: 'twitter', count: 'three' }));

    expect(loadState(schema)).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(warn).toHaveBeenCalled();
  });

  it('clears localStorage and returns null when stored data is not valid JSON', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    localStorage.setItem(STORAGE_KEY, '{not json');

    expect(loadState(schema)).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(warn).toHaveBeenCalled();
  });
});
