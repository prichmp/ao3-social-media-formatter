// Visual constants for the canvas tweet renderer.
//
// These are lifted from the original AO3 work-skin CSS (tweet.css.ejs) so the
// image keeps the same palette and type scale, but the layout itself is a clean
// re-implementation rather than a pixel-replica of the CSS's negative-margin
// float hacks.

export interface Theme {
  // Layout (logical px, before DPR scaling)
  cardWidth: number;
  padding: number;
  avatarSize: number;
  avatarGap: number;
  blockGap: number;
  borderRadius: number;
  imageRadius: number;
  quotePadding: number;
  quoteAvatarSize: number;

  // Colors
  bg: string;
  text: string;
  muted: string;
  link: string;
  border: string;
  separator: string;
  placeholder: string;

  // Type
  fontFamily: string;
  nameSize: number;
  handleSize: number;
  contentSize: number;
  timestampSize: number;
  statsSize: number;
  quoteNameSize: number;
  quoteContentSize: number;
  lineHeightRatio: number;
  paragraphGap: number;

  // Stat icons
  statIconHeight: number;
  statIconGap: number;

  // Export
  exportScale: number;
}

export const theme: Theme = {
  cardWidth: 450,
  padding: 20,
  avatarSize: 50,
  avatarGap: 12,
  blockGap: 12,
  borderRadius: 10,
  imageRadius: 10,
  quotePadding: 12,
  quoteAvatarSize: 24,

  bg: '#ffffff',
  text: '#0f1419',
  muted: '#657786',
  link: '#1da1f2',
  border: '#c7c7c7',
  separator: '#e6e6e6',
  placeholder: '#e1e8ed',

  fontFamily:
    'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Ubuntu, "Helvetica Neue", sans-serif',
  nameSize: 15.12,
  handleSize: 15.12,
  contentSize: 19.656,
  timestampSize: 15.12,
  statsSize: 13.6,
  quoteNameSize: 15.12,
  quoteContentSize: 16,
  lineHeightRatio: 1.35,
  paragraphGap: 8,

  statIconHeight: 13,
  statIconGap: 27.2,

  exportScale: 2,
};

/** Build a canvas `font` shorthand string for the given size/weight. */
export function font(size: number, weight: 'normal' | 'bold' = 'normal'): string {
  return `${weight} ${size}px ${theme.fontFamily}`;
}

/** Line height in px for a given font size. */
export function lineHeight(size: number): number {
  return size * theme.lineHeightRatio;
}
