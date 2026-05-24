// Zod schemas for the tumblr format. Same boundary contract as the other
// formats: persisted / imported data is validated and a mismatch throws
// (or, for localStorage, clears the bad value).

import { z } from 'zod';
import type { TumblrEntry, TumblrPost } from './types';

const imageRefSchema = z.object({
  src: z.string(),
  alt: z.string(),
  width: z.number().optional(),
  height: z.number().optional(),
});

export const tumblrEntrySchema = z.object({
  id: z.string(),
  username: z.string(),
  avatar: imageRefSchema,
  content: z.string(),
  image: imageRefSchema,
  tags: z.array(z.string()),
});

export const tumblrSchema = z.object({
  entries: z.array(tumblrEntrySchema),
  notes: z.string(),
  timestamp: z.string(),
});

// Static-shape sanity checks.
type _EntryMatches = z.infer<typeof tumblrEntrySchema> extends TumblrEntry ? true : never;
type _PostMatches  = z.infer<typeof tumblrSchema> extends TumblrPost ? true : never;
const _checks: [_EntryMatches, _PostMatches] = [true, true];
void _checks;
