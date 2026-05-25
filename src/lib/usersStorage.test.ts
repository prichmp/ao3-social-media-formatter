import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { loadUsers, saveUsers } from './usersStorage';
import { emptySavedUser } from './savedUser';

const KEY = 'ao3-formatter-users';

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('usersStorage', () => {
  it('returns [] when the key is absent', () => {
    expect(loadUsers()).toEqual([]);
  });

  it('round-trips a list of users through localStorage (after the debounce fires)', () => {
    const alice = { ...emptySavedUser(), name: 'Alice', handle: 'alice' };
    const bob   = { ...emptySavedUser(), name: 'Bob',   handle: 'bob'   };
    saveUsers([alice, bob]);
    vi.runAllTimers();

    const loaded = loadUsers();
    expect(loaded).toHaveLength(2);
    expect(loaded[0].name).toBe('Alice');
    expect(loaded[1].handle).toBe('bob');
  });

  it('clears localStorage and returns [] when the stored value fails schema validation', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    // Bad shape: an array of strings instead of SavedUser objects.
    localStorage.setItem(KEY, JSON.stringify(['Alice', 'Bob']));

    expect(loadUsers()).toEqual([]);
    expect(localStorage.getItem(KEY)).toBeNull();
    expect(warn).toHaveBeenCalled();
  });

  it('clears localStorage and returns [] when the stored value is not valid JSON', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    localStorage.setItem(KEY, 'definitely not json');

    expect(loadUsers()).toEqual([]);
    expect(localStorage.getItem(KEY)).toBeNull();
    expect(warn).toHaveBeenCalled();
  });
});
