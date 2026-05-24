// Zod schemas for the livestream format. Same boundary contract as the
// other formats: persisted/imported data is validated and a mismatch
// throws (or, for localStorage, clears the bad value).

import { z } from 'zod';
import type { ChatMessage, LivestreamSegment } from './types';

const imageRefSchema = z.object({
  src: z.string(),
  alt: z.string(),
  width: z.number().optional(),
  height: z.number().optional(),
});

const badgeKindSchema = z.enum(['broadcaster', 'mod', 'vip', 'subscriber']);

export const chatMessageSchema = z.object({
  id: z.string(),
  username: z.string(),
  color: z.string(),
  badges: z.array(badgeKindSchema),
  content: z.string(),
});

export const livestreamSchema = z.object({
  streamer: z.object({
    avatar: imageRefSchema,
    name: z.string(),
  }),
  title: z.string(),
  category: z.string(),
  viewerCount: z.string(),
  thumbnail: imageRefSchema,
  showLiveBadge: z.boolean(),
  chat: z.array(chatMessageSchema),
});

// Static-shape sanity checks.
type _ChatMatches = z.infer<typeof chatMessageSchema> extends ChatMessage ? true : never;
type _SegmentMatches = z.infer<typeof livestreamSchema> extends LivestreamSegment ? true : never;
const _checks: [_ChatMatches, _SegmentMatches] = [true, true];
void _checks;
