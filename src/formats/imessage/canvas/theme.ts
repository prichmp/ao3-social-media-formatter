// Visual constants for the iMessage canvas renderer.
//
// Colors and spacing roughly match iOS Messages on a light-mode background:
// blue "me" bubbles right-aligned, gray "them" bubbles left-aligned, a
// centered nav-bar header with the contact's avatar and name, and gray
// timestamp lines centered between message bursts.

export interface Theme {
  // Layout
  cardWidth: number;
  paddingX: number;
  headerHeight: number;
  headerAvatarSize: number;
  headerPadTop: number;
  bubblePadX: number;
  bubblePadY: number;
  bubbleRadius: number;
  bubbleMaxWidthRatio: number;
  bubbleGap: number;
  burstGap: number;
  timestampGap: number;
  deliveredGap: number;
  bottomPad: number;

  // Colors
  bg: string;
  meBg: string;
  meText: string;
  themBg: string;
  themText: string;
  border: string;
  headerBg: string;
  headerText: string;
  headerSub: string;
  timestampText: string;
  placeholder: string;

  // Type
  fontFamily: string;
  bubbleSize: number;
  headerNameSize: number;
  timestampSize: number;
  deliveredSize: number;
  lineHeightRatio: number;
  paragraphGap: number;

  // Export
  exportScale: number;
}

export const theme: Theme = {
  cardWidth: 420,
  paddingX: 14,
  headerHeight: 78,
  headerAvatarSize: 40,
  headerPadTop: 8,
  bubblePadX: 12,
  bubblePadY: 8,
  bubbleRadius: 18,
  // Real iMessage caps bubbles around ~70-75% of the screen width.
  bubbleMaxWidthRatio: 0.72,
  bubbleGap: 3,
  burstGap: 10,
  timestampGap: 12,
  deliveredGap: 4,
  bottomPad: 18,

  bg: '#ffffff',
  meBg: '#1982FC',
  meText: '#ffffff',
  themBg: '#E9E9EB',
  themText: '#000000',
  border: '#d6d6d6',
  headerBg: '#F6F6F6',
  headerText: '#000000',
  headerSub: '#8E8E93',
  timestampText: '#8E8E93',
  placeholder: '#d2d2d7',

  fontFamily:
    '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, system-ui, sans-serif',
  bubbleSize: 16,
  headerNameSize: 13,
  timestampSize: 11,
  deliveredSize: 10,
  lineHeightRatio: 1.3,
  paragraphGap: 4,

  exportScale: 2,
};

export function font(size: number, weight: 'normal' | 'bold' = 'normal'): string {
  return `${weight} ${size}px ${theme.fontFamily}`;
}

export function lineHeight(size: number): number {
  return size * theme.lineHeightRatio;
}
