import type { TwitterPost } from '../formats/twitter/types';

const KEY = 'ao3-formatter-saves';

export interface NamedSave {
  id: string;
  name: string;
  savedAt: string;
  twitter: TwitterPost;
}

export function loadSaves(): NamedSave[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as NamedSave[];
  } catch {
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
    // Storage failure degrades gracefully
  }
}
