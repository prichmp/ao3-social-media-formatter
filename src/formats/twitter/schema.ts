// Zod schemas for the Twitter format.
//
// These are the source of truth for what shape persisted / imported data
// must take. Anything loaded from localStorage or a user-supplied file is
// run through `.parse()`, which throws a ZodError on mismatch. We do not
// migrate -- old or hand-edited data that doesn't fit the current schema is
// rejected at the boundary so bad shapes can't sneak into app state.

import { z } from 'zod';
import type { TweetAttachment, TwitterPost, TwitterReply } from './types';

const imageRefSchema = z.object({
  src: z.string(),
  alt: z.string(),
  width: z.number().optional(),
  height: z.number().optional(),
});

export const tweetAttachmentSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('text') }),
  z.object({ type: z.literal('image'), image: imageRefSchema }),
  z.object({
    type: z.literal('quote'),
    avatar: imageRefSchema,
    name: z.string(),
    handle: z.string(),
    verified: z.boolean(),
    content: z.string(),
  }),
  z.object({
    type: z.literal('video'),
    thumbnail: imageRefSchema,
    duration: z.string(),
  }),
  z.object({
    type: z.literal('music'),
    albumArt: imageRefSchema,
    title: z.string(),
    artist: z.string(),
  }),
]);

export const twitterReplySchema = z.object({
  id: z.string(),
  avatar: imageRefSchema,
  name: z.string(),
  handle: z.string(),
  verified: z.boolean(),
  relativeTime: z.string(),
  replyingTo: z.string(),
  content: z.string(),
  attachment: tweetAttachmentSchema,
  showStats: z.boolean(),
});

export const twitterPostSchema = z.object({
  author: z.object({
    avatar: imageRefSchema,
    name: z.string(),
    handle: z.string(),
    verified: z.boolean(),
  }),
  content: z.string(),
  attachment: tweetAttachmentSchema,
  time: z.string(),
  relativeTime: z.string(),
  stats: z.object({ showRow: z.boolean(), labels: z.string() }),
  statIcons: z.object({
    reply: imageRefSchema,
    retweet: imageRefSchema,
    like: imageRefSchema,
  }),
  replies: z.array(twitterReplySchema),
});

// Spot-check that the schema types satisfy the hand-written interfaces. If
// these compile, the runtime parse() result lines up with the static types.
type _AttachmentMatches = z.infer<typeof tweetAttachmentSchema> extends TweetAttachment ? true : never;
type _ReplyMatches = z.infer<typeof twitterReplySchema> extends TwitterReply ? true : never;
type _PostMatches = z.infer<typeof twitterPostSchema> extends TwitterPost ? true : never;
type _Checks = [_AttachmentMatches, _ReplyMatches, _PostMatches];
const _checks: _Checks = [true, true, true];
void _checks;
