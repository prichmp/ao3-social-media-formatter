// Zod schemas for the iMessage format. Same boundary contract as the
// Twitter schemas: persisted / imported data is validated and a mismatch
// throws (or, for localStorage, clears the bad value).

import { z } from 'zod';
import type { IMessage, IMessageChain, MessageContent } from './types';

const imageRefSchema = z.object({
  src: z.string(),
  alt: z.string(),
  width: z.number().optional(),
  height: z.number().optional(),
});

export const messageContentSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('text'),  text: z.string() }),
  z.object({ type: z.literal('image'), image: imageRefSchema }),
  z.object({ type: z.literal('video'), thumbnail: imageRefSchema, duration: z.string() }),
]);

export const imessageSchema = z.object({
  contactName: z.string(),
  contactAvatar: imageRefSchema,
  messages: z.array(z.object({
    id: z.string(),
    sender: z.enum(['me', 'them']),
    senderName: z.string(),
    senderAvatar: imageRefSchema,
    content: messageContentSchema,
    timestamp: z.string(),
  })),
  showDeliveredOnLast: z.boolean(),
});

// Static-shape sanity checks (won't run at runtime but fail to compile if
// the schema drifts from the hand-written types).
type _ContentMatches = z.infer<typeof messageContentSchema> extends MessageContent ? true : never;
type _MessageMatches = z.infer<typeof imessageSchema>['messages'][number] extends IMessage ? true : never;
type _ChainMatches = z.infer<typeof imessageSchema> extends IMessageChain ? true : never;
const _checks: [_ContentMatches, _MessageMatches, _ChainMatches] = [true, true, true];
void _checks;
