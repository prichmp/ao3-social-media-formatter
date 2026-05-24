// Named-save list persisted in localStorage. Each save now carries a
// `format` discriminator so the same store can hold twitter posts and
// iMessage chains side by side -- loading switches the active format.
//
// Bad data is cleared (same recovery posture as loadState).

import { z } from 'zod';
import { twitterPostSchema } from '../formats/twitter/schema';
import { imessageSchema } from '../formats/imessage/schema';
import { livestreamSchema } from '../formats/livestream/schema';
import { emailSchema } from '../formats/email/schema';
import type { TwitterPost } from '../formats/twitter/types';
import type { IMessageChain } from '../formats/imessage/types';
import type { LivestreamSegment } from '../formats/livestream/types';
import type { EmailThread } from '../formats/email/types';

const KEY = 'ao3-formatter-saves';

interface NamedSaveBase {
  id: string;
  name: string;
  savedAt: string;
}

export type NamedSave =
  | (NamedSaveBase & { format: 'twitter';    twitter:    TwitterPost })
  | (NamedSaveBase & { format: 'imessage';   imessage:   IMessageChain })
  | (NamedSaveBase & { format: 'livestream'; livestream: LivestreamSegment })
  | (NamedSaveBase & { format: 'email';      email:      EmailThread });

const baseFields = {
  id: z.string(),
  name: z.string(),
  savedAt: z.string(),
};

export const namedSaveSchema = z.discriminatedUnion('format', [
  z.object({ ...baseFields, format: z.literal('twitter'),    twitter:    twitterPostSchema }),
  z.object({ ...baseFields, format: z.literal('imessage'),   imessage:   imessageSchema }),
  z.object({ ...baseFields, format: z.literal('livestream'), livestream: livestreamSchema }),
  z.object({ ...baseFields, format: z.literal('email'),      email:      emailSchema }),
]);

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
