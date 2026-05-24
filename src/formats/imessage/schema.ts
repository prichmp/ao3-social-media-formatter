// Zod schemas for the iMessage format. Same boundary contract as the
// Twitter schemas: persisted / imported data is validated and a mismatch
// throws (or, for localStorage, clears the bad value).

import { z } from 'zod';
import type { IMessage, IMessageChain } from './types';

const imageRefSchema = z.object({
  src: z.string(),
  alt: z.string(),
  width: z.number().optional(),
  height: z.number().optional(),
});

export const imessageSchema = z.object({
  contactName: z.string(),
  contactAvatar: imageRefSchema,
  messages: z.array(z.object({
    id: z.string(),
    sender: z.enum(['me', 'them']),
    content: z.string(),
    timestamp: z.string(),
  })),
  showDeliveredOnLast: z.boolean(),
});

// Static-shape sanity checks (won't run at runtime but fail to compile if
// the schema drifts from the hand-written types).
type _MessageMatches = z.infer<typeof imessageSchema>['messages'][number] extends IMessage ? true : never;
type _ChainMatches = z.infer<typeof imessageSchema> extends IMessageChain ? true : never;
const _checks: [_MessageMatches, _ChainMatches] = [true, true];
void _checks;
