// Heterogeneous format registry.
//
// `FormatDefinition` is generic on its state type; the registry erases the
// generic so different formats can sit in the same array. The App dispatch
// site casts back to the right state shape per `activeFormat` id.

import type { FormatDefinition } from './types';
import { twitterDefaults } from './twitter/defaults';
import { TwitterForm } from './twitter/Form';
import { renderTweetImage } from './twitter/canvas/renderTweetImage';
import { imessageDefaults } from './imessage/defaults';
import { IMessageForm } from './imessage/Form';
import { renderChainImage } from './imessage/canvas/renderChainImage';
import { livestreamDefaults } from './livestream/defaults';
import { LivestreamForm } from './livestream/Form';
import { renderSegmentImage } from './livestream/canvas/renderSegmentImage';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const formats: FormatDefinition<any>[] = [
  {
    id: 'twitter',
    label: 'Twitter / X',
    defaults: twitterDefaults,
    Form: TwitterForm,
    renderImage: (canvas, state) => renderTweetImage(canvas, state),
  },
  {
    id: 'imessage',
    label: 'iMessage',
    defaults: imessageDefaults,
    Form: IMessageForm,
    renderImage: (canvas, state) => renderChainImage(canvas, state),
  },
  {
    id: 'livestream',
    label: 'Livestream',
    defaults: livestreamDefaults,
    Form: LivestreamForm,
    renderImage: (canvas, state) => renderSegmentImage(canvas, state),
  },
];

export type AnyFormat = typeof formats[number];
