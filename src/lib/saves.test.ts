import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { loadSaves, upsertSave } from './saves';
import { twitterDefaults } from '../formats/twitter/defaults';

const STORAGE_KEY = 'ao3-formatter-saves';

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('loadSaves', () => {
  it('returns an empty array when the key is absent', () => {
    expect(loadSaves()).toEqual([]);
  });

  it('round-trips a valid NamedSave through localStorage', () => {
    upsertSave({ id: 'a', name: 'first', savedAt: '2026-01-01', twitter: twitterDefaults });
    const saves = loadSaves();
    expect(saves).toHaveLength(1);
    expect(saves[0].name).toBe('first');
  });

  it('clears localStorage and returns [] when the stored array fails zod validation', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    // Bad shape: each entry must have id/name/savedAt/twitter.
    localStorage.setItem(STORAGE_KEY, JSON.stringify([{ id: 1, name: 'oops' }]));

    expect(loadSaves()).toEqual([]);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(warn).toHaveBeenCalled();
  });

  it('clears localStorage and returns [] when stored data is not valid JSON', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    localStorage.setItem(STORAGE_KEY, 'not json at all');

    expect(loadSaves()).toEqual([]);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(warn).toHaveBeenCalled();
  });
});
