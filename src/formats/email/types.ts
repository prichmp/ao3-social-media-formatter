import type { ImageRef } from '../types';

export interface EmailMessage {
  id: string;
  senderName: string;
  senderEmail: string;
  senderAvatar: ImageRef;
  /** Hex background color for the initial-letter avatar placeholder (when no image). */
  senderColor: string;
  /** Free-form recipient line, e.g. "me" or "alice@example.com, bob@example.com". */
  recipients: string;
  /** Timestamp shown right-aligned in the message header (e.g. "Mon, Jan 5, 10:32 AM"). */
  timestamp: string;
  body: string;
}

export interface EmailThread {
  subject: string;
  /** Small pill shown next to the subject (e.g. "Inbox", "Important"). Empty hides it. */
  label: string;
  messages: EmailMessage[];
}
