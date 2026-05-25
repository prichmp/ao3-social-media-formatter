import type { ImageRef } from '../types';

// "me" = right-side blue bubbles; "them" = left-side gray bubbles.
export type MessageSender = 'me' | 'them';

// Discriminated union: each message is exactly one of text, image, or video.
// Mirrors the shape of Twitter's TweetAttachment but stays independent so
// the two formats don't depend on each other.
export type MessageContent =
  | { type: 'text'; text: string }
  | { type: 'image'; image: ImageRef }
  | { type: 'video'; thumbnail: ImageRef; duration: string };

export type MessageContentType = MessageContent['type'];

export interface IMessage {
  id: string;
  sender: MessageSender;
  /**
   * Per-message sender info for group chats. Only meaningful when
   * `sender === 'them'`. `senderName` is drawn above the first message in
   * a burst from that sender; `senderAvatar` is drawn next to the last
   * message in the burst. Empty values fall back to single-person mode
   * (no name / no avatar slot reserved).
   */
  senderName: string;
  senderAvatar: ImageRef;
  content: MessageContent;
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

/** Empty-but-typed message content of the given kind. Used by the dropdown. */
export function defaultMessageContent(type: MessageContentType): MessageContent {
  switch (type) {
    case 'text':  return { type: 'text', text: '' };
    case 'image': return { type: 'image', image: { src: '', alt: '' } };
    case 'video': return { type: 'video', thumbnail: { src: '', alt: '' }, duration: '' };
  }
}
