import type { ImageRef } from '../types';

// A single rung in the reblog tower. The first entry in `TumblrPost.entries`
// is the original post; everything after is a reblog adding (or skipping)
// commentary.
export interface TumblrEntry {
  id: string;
  /** Handle shown at the top of the entry, e.g. "best-friend-squad". */
  username: string;
  avatar: ImageRef;
  /** Body text. Empty string means a "silent" reblog with no commentary. */
  content: string;
  /** Optional inline image rendered between the content and the tags. */
  image: ImageRef;
  /** Hashtags shown in muted gray under the content, each prefixed with #. */
  tags: string[];
}

export interface TumblrPost {
  entries: TumblrEntry[];
  /** Free-form notes line at the bottom (e.g. "47,283 notes"). */
  notes: string;
  /** Free-form timestamp shown alongside notes (e.g. "2 days ago"). */
  timestamp: string;
}
