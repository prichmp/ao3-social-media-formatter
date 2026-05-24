import type { ImageRef } from '../types';

export interface TwitterUser {
  id: string;
  name: string;
  handle: string;
  avatar: ImageRef;
}

export const TWITTER_USER_DRAG_TYPE = 'application/twitter-user';

// Discriminated union: a tweet (or reply) has exactly one attachment kind.
// The 'text' case is the no-attachment default and carries no extra data.
export type TweetAttachment =
  | { type: 'text' }
  | { type: 'image'; image: ImageRef }
  | { type: 'quote'; avatar: ImageRef; name: string; handle: string; content: string }
  | { type: 'video'; thumbnail: ImageRef; duration: string }
  | { type: 'music'; albumArt: ImageRef; title: string; artist: string };

export type AttachmentType = TweetAttachment['type'];

export interface TwitterReply {
  id: string;
  avatar: ImageRef;
  name: string;
  handle: string;
  relativeTime: string;
  replyingTo: string;
  content: string;
  attachment: TweetAttachment;
  showStats: boolean;
}

export interface TwitterPost {
  author: { avatar: ImageRef; name: string; handle: string };
  content: string;
  attachment: TweetAttachment;
  time: string;
  relativeTime: string;
  stats: { showRow: boolean; labels: string };
  statIcons: { reply: ImageRef; retweet: ImageRef; like: ImageRef };
  replies: TwitterReply[];
}

/** Empty-but-typed attachment of the given kind, for dropdown switches. */
export function defaultAttachment(type: AttachmentType): TweetAttachment {
  switch (type) {
    case 'text':  return { type: 'text' };
    case 'image': return { type: 'image', image: { src: '', alt: '' } };
    case 'quote': return { type: 'quote', avatar: { src: '', alt: '', width: 50, height: 50 }, name: '', handle: '', content: '' };
    case 'video': return { type: 'video', thumbnail: { src: '', alt: '' }, duration: '' };
    case 'music': return { type: 'music', albumArt: { src: '', alt: '' }, title: '', artist: '' };
  }
}
