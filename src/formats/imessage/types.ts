import type { ImageRef } from '../types';

// "me" = right-side blue bubbles; "them" = left-side gray bubbles.
export type MessageSender = 'me' | 'them';

export interface IMessage {
  id: string;
  sender: MessageSender;
  content: string;
  /**
   * Optional gray timestamp line drawn above this message (e.g.
   * "Today 10:32 AM" or "Yesterday"). Empty string means no label.
   */
  timestamp: string;
}

export interface IMessageChain {
  /** Contact name shown in the centered nav-bar header. */
  contactName: string;
  /** Avatar shown above the contact name in the header. */
  contactAvatar: ImageRef;
  messages: IMessage[];
  /** "Delivered" / "Read" line under the final 'me' message. */
  showDeliveredOnLast: boolean;
}
