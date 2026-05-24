// Persisted app state in localStorage.
//
// `loadState` validates with a caller-supplied zod schema. On a validation
// failure (zod) or parse failure (corrupt JSON) we clear the stored value
// and return null -- the app reloads with defaults instead of crashing on
// every open. Other localStorage access errors (private browsing, quota)
// also fall through to null.

import type { ZodType } from 'zod';

const KEY = 'ao3-formatter-state';

let timer: ReturnType<typeof setTimeout> | null = null;

export function saveState(state: unknown): void {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      // Storage failure (quota, private browsing) degrades gracefully.
    }
  }, 500);
}

/**
 * Load and validate persisted state. Returns null if nothing is stored.
 * Bad data (ZodError or SyntaxError) is wiped from localStorage and null
 * is returned, so the next render falls back to defaults rather than
 * looping on a corrupt value.
 */
export function loadState<T>(schema: ZodType<T>): T | null {
  let raw: string | null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return null;
  }
  if (!raw) return null;

  try {
    return schema.parse(JSON.parse(raw));
  } catch (err) {
    console.warn('Stored state failed validation; clearing.', err);
    try {
      localStorage.removeItem(KEY);
    } catch {
      // ignore
    }
    return null;
  }
}

export function clearState(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
