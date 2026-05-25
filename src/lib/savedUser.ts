// A "saved user" is a portable contact card that can be dragged from the
// left-hand UserListPanel onto any format's form. Different formats pull
// different fields off it -- twitter uses name/handle/avatar, email uses
// name/email/color/avatar, livestream chat uses handle/color, etc. Keeping
// the union of fields here lets the same dropped object satisfy all of
// them.

import { z } from 'zod';
import type { ImageRef } from '../formats/types';

export const SAVED_USER_DRAG_TYPE = 'application/saved-user';

export interface SavedUser {
  id: string;
  name: string;
  handle: string;
  email: string;
  color: string;
  avatar: ImageRef;
  /**
   * Twitter-style blue verified checkmark. Currently only the twitter
   * format renders it; other formats ignore the field when a SavedUser
   * is dragged in.
   */
  verified: boolean;
}

const imageRefSchema = z.object({
  src: z.string(),
  alt: z.string(),
  width: z.number().optional(),
  height: z.number().optional(),
});

export const savedUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  handle: z.string(),
  email: z.string(),
  color: z.string(),
  avatar: imageRefSchema,
  verified: z.boolean(),
});

// Compile-time conformance check.
type _Matches = z.infer<typeof savedUserSchema> extends SavedUser ? true : never;
const _check: _Matches = true;
void _check;

export function emptySavedUser(): SavedUser {
  return {
    id: crypto.randomUUID(),
    name: '',
    handle: '',
    email: '',
    color: '#093957',
    avatar: { src: '', alt: '' },
    verified: false,
  };
}
