// Visual constants for the email (Gmail-style) canvas renderer.

export interface Theme {
  // Layout
  cardWidth: number;
  outerPad: number;
  subjectGap: number;
  subjectLabelGap: number;
  labelPadX: number;
  labelPadY: number;
  labelRadius: number;
  messageGap: number;
  messageTopPad: number;
  avatarSize: number;
  avatarGap: number;
  bodyTopGap: number;
  bottomPad: number;

  // Colors
  bg: string;
  text: string;
  muted: string;
  border: string;
  labelBg: string;
  labelText: string;
  avatarPlaceholderText: string;
  defaultAvatarColor: string;
  placeholder: string;

  // Type
  fontFamily: string;
  subjectSize: number;
  labelSize: number;
  nameSize: number;
  emailSize: number;
  timestampSize: number;
  recipientsSize: number;
  bodySize: number;
  avatarInitialSize: number;
  lineHeightRatio: number;
  paragraphGap: number;

  exportScale: number;
}

export const theme: Theme = {
  cardWidth: 560,
  outerPad: 24,
  subjectGap: 16,
  subjectLabelGap: 10,
  labelPadX: 8,
  labelPadY: 3,
  labelRadius: 4,
  messageGap: 18,
  messageTopPad: 16,
  avatarSize: 40,
  avatarGap: 14,
  bodyTopGap: 8,
  bottomPad: 22,

  bg: '#ffffff',
  text: '#202124',
  muted: '#5f6368',
  border: '#e8eaed',
  labelBg: '#e8eaed',
  labelText: '#3c4043',
  avatarPlaceholderText: '#ffffff',
  defaultAvatarColor: '#1A73E8',
  placeholder: '#e8eaed',

  fontFamily:
    'Roboto, Arial, "Helvetica Neue", Helvetica, system-ui, -apple-system, sans-serif',
  subjectSize: 22,
  labelSize: 11,
  nameSize: 14,
  emailSize: 13,
  timestampSize: 12,
  recipientsSize: 12,
  bodySize: 14,
  avatarInitialSize: 18,
  lineHeightRatio: 1.4,
  paragraphGap: 8,

  exportScale: 2,
};

export function font(size: number, weight: 'normal' | 'bold' = 'normal'): string {
  return `${weight} ${size}px ${theme.fontFamily}`;
}

export function lineHeight(size: number): number {
  return size * theme.lineHeightRatio;
}
