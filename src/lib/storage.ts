// Persisted app state in localStorage.
//
// `loadState` validates with a caller-supplied zod schema and throws on
// mismatch -- we deliberately do not migrate or coerce. A bad value in
// localStorage surfaces as an exception so the bug is visible.

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
 * Throws ZodError (or SyntaxError from JSON.parse) if a value exists but
 * doesn't match `schema`.
 */
export function loadState<T>(schema: ZodType<T>): T | null {
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  return schema.parse(JSON.parse(raw));
}

export function clearState(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
