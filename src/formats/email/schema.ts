// Zod schemas for the email format. Same boundary contract as the other
// formats: persisted / imported data is validated; mismatches throw or
// (for localStorage) clear the bad value.

import { z } from 'zod';
import type { EmailMessage, EmailThread } from './types';

const imageRefSchema = z.object({
  src: z.string(),
  alt: z.string(),
  width: z.number().optional(),
  height: z.number().optional(),
});

export const emailMessageSchema = z.object({
  id: z.string(),
  senderName: z.string(),
  senderEmail: z.string(),
  senderAvatar: imageRefSchema,
  senderColor: z.string(),
  recipients: z.string(),
  timestamp: z.string(),
  body: z.string(),
});

export const emailSchema = z.object({
  subject: z.string(),
  label: z.string(),
  messages: z.array(emailMessageSchema),
});

// Static-shape sanity checks.
type _MessageMatches = z.infer<typeof emailMessageSchema> extends EmailMessage ? true : never;
type _ThreadMatches = z.infer<typeof emailSchema> extends EmailThread ? true : never;
const _checks: [_MessageMatches, _ThreadMatches] = [true, true];
void _checks;
