// Named-save list persisted in localStorage.
//
// `loadSaves` validates the stored array with zod and throws on mismatch --
// no migration. Writes are tolerant: if storage rejects (quota, etc.) we
// drop the write so the rest of the app can keep running.

import { z } from 'zod';
import { twitterPostSchema } from '../formats/twitter/schema';
import type { TwitterPost } from '../formats/twitter/types';

const KEY = 'ao3-formatter-saves';

export interface NamedSave {
  id: string;
  name: string;
  savedAt: string;
  twitter: TwitterPost;
}

export const namedSaveSchema = z.object({
  id: z.string(),
  name: z.string(),
  savedAt: z.string(),
  twitter: twitterPostSchema,
});

const namedSaveListSchema = z.array(namedSaveSchema);

export function loadSaves(): NamedSave[] {
  let raw: string | null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return [];
  }
  if (!raw) return [];

  try {
    return namedSaveListSchema.parse(JSON.parse(raw));
  } catch (err) {
    // Same recovery posture as loadState: corrupt or shape-mismatched
    // data is wiped so the app doesn't crash on every load.
    console.warn('Stored saves failed validation; clearing.', err);
    try {
      localStorage.removeItem(KEY);
    } catch {
      // ignore
    }
    return [];
  }
}

export function deleteSave(id: string): void {
  try {
    const saves = loadSaves().filter(s => s.id !== id);
    localStorage.setItem(KEY, JSON.stringify(saves));
  } catch {
    // ignore
  }
}

export function upsertSave(save: NamedSave): void {
  try {
    const saves = loadSaves();
    const idx = saves.findIndex(s => s.id === save.id);
    if (idx >= 0) saves[idx] = save;
    else saves.unshift(save);
    localStorage.setItem(KEY, JSON.stringify(saves));
  } catch {
    // Storage failure degrades gracefully.
  }
}
