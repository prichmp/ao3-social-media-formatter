// Visual constants for the tumblr canvas renderer.
//
// Light-theme card with rounded corners; each reblog rung is separated by a
// thin gray divider. Tags and the notes footer are muted gray.

export interface Theme {
  // Layout
  cardWidth: number;
  outerRadius: number;
  paddingX: number;
  entryPadY: number;
  avatarSize: number;
  avatarRadius: number;
  avatarGap: number;
  contentGap: number;
  imageRadius: number;
  imageGap: number;
  tagGap: number;
  tagInline: number;
  footerPadY: number;
  silentReblogGap: number;

  // Colors
  bg: string;
  text: string;
  muted: string;
  link: string;
  border: string;
  footerBg: string;
  placeholder: string;

  // Type
  fontFamily: string;
  usernameSize: number;
  contentSize: number;
  tagSize: number;
  silentSize: number;
  footerSize: number;
  lineHeightRatio: number;
  paragraphGap: number;

  exportScale: number;
}

export const theme: Theme = {
  cardWidth: 540,
  outerRadius: 4,
  paddingX: 18,
  entryPadY: 16,
  avatarSize: 28,
  avatarRadius: 4,
  avatarGap: 10,
  contentGap: 10,
  imageRadius: 4,
  imageGap: 10,
  tagGap: 10,
  tagInline: 6,
  footerPadY: 10,
  silentReblogGap: 4,

  bg: '#ffffff',
  text: '#1a1a1a',
  muted: '#6e6e6e',
  link: '#00b8ff',
  border: '#e6e6e6',
  footerBg: '#fafafa',
  placeholder: '#e2e2e2',

  fontFamily:
    '"Helvetica Neue", Helvetica, Arial, system-ui, -apple-system, sans-serif',
  usernameSize: 15,
  contentSize: 15,
  tagSize: 13,
  silentSize: 13,
  footerSize: 12,
  lineHeightRatio: 1.45,
  paragraphGap: 8,

  exportScale: 2,
};

export function font(size: number, weight: 'normal' | 'bold' = 'normal'): string {
  return `${weight} ${size}px ${theme.fontFamily}`;
}

export function lineHeight(size: number): number {
  return size * theme.lineHeightRatio;
}
