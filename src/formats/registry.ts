import type { FormatDefinition } from './types';
import { twitterDefaults } from './twitter/defaults';
import { TwitterForm } from './twitter/Form';
import { renderTweetImage } from './twitter/canvas/renderTweetImage';
import type { TwitterPost } from './twitter/types';

export const formats: FormatDefinition<TwitterPost>[] = [
  {
    id: 'twitter',
    label: 'Twitter / X',
    defaults: twitterDefaults,
    Form: TwitterForm,
    renderImage: (canvas, state) => renderTweetImage(canvas, state),
  },
];

export type AnyFormat = typeof formats[number];
