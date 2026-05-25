// Persists the SavedUser list across page loads in its own localStorage
// key, independent of any tab's editing buffer. Editing state is now
// session-local (tabs don't share or auto-save it), but the users list
// stays sticky so the contacts you've built up survive a refresh.
//
// Cross-tab semantics: last-write-wins. A tab writing the user list
// overwrites whatever any other tab last wrote. No `storage`-event
// listener (it would risk clobbering an in-flight edit in another tab),
// no read-modify-write merge (can't reconcile deletions across tabs).
// Add a CRDT or move to a server if better-than-LWW becomes required.

import { z } from 'zod';
import { savedUserSchema, type SavedUser } from './savedUser';

const KEY = 'ao3-formatter-users';
const usersListSchema = z.array(savedUserSchema);

let timer: ReturnType<typeof setTimeout> | null = null;

/**
 * Load the persisted users list. Returns `[]` if no value is stored.
 * A stored value that doesn't validate is wiped (same recovery posture
 * as the other storage helpers) so the next render doesn't crash on a
 * corrupt key.
 */
export function loadUsers(): SavedUser[] {
  let raw: string | null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return [];
  }
  if (!raw) return [];

  try {
    return usersListSchema.parse(JSON.parse(raw));
  } catch (err) {
    console.warn('Stored user list failed validation; clearing.', err);
    try {
      localStorage.removeItem(KEY);
    } catch {
      // ignore
    }
    return [];
  }
}

/** Debounced write of the users list. Silently drops the write on quota / private-browsing failures. */
export function saveUsers(users: SavedUser[]): void {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(users));
    } catch {
      // ignore
    }
  }, 500);
}
