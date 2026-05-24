import type { ImageRef } from '../types';

// The four badges that show before a username in Twitch chat. The set is
// kept small on purpose -- broadcaster / mod / vip / subscriber covers
// almost every fic context without dragging in BTTV/FFZ noise.
export type BadgeKind = 'broadcaster' | 'mod' | 'vip' | 'subscriber';

export interface ChatMessage {
  id: string;
  username: string;
  /** Hex color for the username, e.g. "#FF7F50". Empty falls back to the theme default. */
  color: string;
  badges: BadgeKind[];
  content: string;
}

export interface LivestreamSegment {
  streamer: {
    avatar: ImageRef;
    name: string;
  };
  /** Stream title shown under the player (e.g. "playing Hades II blind"). */
  title: string;
  /** Game/category tag (e.g. "Hades II", "Just Chatting"). */
  category: string;
  /** Free-form viewer count text shown next to the LIVE badge (e.g. "3.2K"). */
  viewerCount: string;
  /** Stream preview shown in the player area. Falls back to a dark placeholder. */
  thumbnail: ImageRef;
  /** When true, draws a red LIVE pill over the player. */
  showLiveBadge: boolean;
  chat: ChatMessage[];
}
