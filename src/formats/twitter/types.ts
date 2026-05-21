import type { ImageRef } from '../types';

export interface TwitterUser {
  id: string;
  name: string;
  handle: string;
  avatar: ImageRef;
}

export const TWITTER_USER_DRAG_TYPE = 'application/twitter-user';

export interface TwitterReply {
  id: string;
  avatar: ImageRef;
  name: string;
  handle: string;
  relativeTime: string;
  replyingTo: string;
  content: string;
  showStats: boolean;
}

export interface QuoteTweet {
  enabled: boolean;
  avatar: ImageRef;
  name: string;
  handle: string;
  content: string;
}

export interface TwitterPost {
  author: { avatar: ImageRef; name: string; handle: string };
  content: string;
  image?: ImageRef;
  quote: QuoteTweet;
  time: string;
  relativeTime: string;
  stats: { showRow: boolean; labels: string };
  statIcons: { reply: ImageRef; retweet: ImageRef; like: ImageRef };
  replies: TwitterReply[];
}
