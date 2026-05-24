// Visual constants for the livestream (Twitch-style) canvas renderer.
// Dark theme to match Twitch's default look.

export interface Theme {
  // Layout
  cardWidth: number;
  playerAspect: number;          // h/w ratio of the player area
  infoBarPadX: number;
  infoBarPadY: number;
  streamerAvatarSize: number;
  streamerGap: number;
  chatPadX: number;
  chatPadY: number;
  chatLineGap: number;
  badgeSize: number;
  badgeGap: number;
  badgeRadius: number;
  badgeUserGap: number;
  livePadX: number;
  livePadY: number;
  liveRadius: number;
  liveDotSize: number;
  liveInset: number;
  viewerInset: number;
  viewerDotSize: number;

  // Colors
  bg: string;
  playerBg: string;
  chatBg: string;
  text: string;
  muted: string;
  border: string;
  placeholder: string;
  liveBg: string;
  liveText: string;
  viewerBg: string;
  viewerText: string;
  defaultChatColor: string;
  badgeColors: Record<'broadcaster' | 'mod' | 'vip' | 'subscriber', string>;
  badgeText: string;

  // Type
  fontFamily: string;
  streamerNameSize: number;
  titleSize: number;
  categorySize: number;
  chatSize: number;
  badgeSizePx: number;           // font size inside the badge
  liveSize: number;
  viewerSize: number;
  lineHeightRatio: number;
  paragraphGap: number;

  exportScale: number;
}

export const theme: Theme = {
  cardWidth: 460,
  playerAspect: 9 / 16,
  infoBarPadX: 14,
  infoBarPadY: 12,
  streamerAvatarSize: 40,
  streamerGap: 12,
  chatPadX: 12,
  chatPadY: 10,
  chatLineGap: 6,
  badgeSize: 16,
  badgeGap: 4,
  badgeRadius: 3,
  badgeUserGap: 6,
  livePadX: 8,
  livePadY: 3,
  liveRadius: 4,
  liveDotSize: 7,
  liveInset: 12,
  viewerInset: 12,
  viewerDotSize: 7,

  bg: '#18181b',
  playerBg: '#000000',
  chatBg: '#0e0e10',
  text: '#efeff1',
  muted: '#adadb8',
  border: '#2f2f35',
  placeholder: '#26262c',
  liveBg: '#eb0400',
  liveText: '#ffffff',
  viewerBg: 'rgba(0, 0, 0, 0.6)',
  viewerText: '#ffffff',
  defaultChatColor: '#9147ff',
  badgeColors: {
    broadcaster: '#e91916',
    mod:         '#00ad03',
    vip:         '#e005b9',
    subscriber:  '#6441a4',
  },
  badgeText: '#ffffff',

  fontFamily:
    'Inter, "Roobert", "Helvetica Neue", Helvetica, Arial, system-ui, -apple-system, sans-serif',
  streamerNameSize: 15,
  titleSize: 14,
  categorySize: 13,
  chatSize: 13,
  badgeSizePx: 9,
  liveSize: 11,
  viewerSize: 12,
  lineHeightRatio: 1.35,
  paragraphGap: 4,

  exportScale: 2,
};

export function font(size: number, weight: 'normal' | 'bold' = 'normal'): string {
  return `${weight} ${size}px ${theme.fontFamily}`;
}

export function lineHeight(size: number): number {
  return size * theme.lineHeightRatio;
}
