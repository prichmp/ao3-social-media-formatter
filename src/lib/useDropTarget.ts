// Reusable drop-target wiring. Returns the React event handlers + the
// current is-drag-over state so callers can drive their own visuals.
// Used by every format that needs to accept dragged SavedUsers.

import { useState, type DragEvent } from 'react';

export interface DropTargetHandlers {
  isDragOver: boolean;
  onDragEnter: (e: DragEvent) => void;
  onDragOver: (e: DragEvent) => void;
  onDragLeave: (e: DragEvent) => void;
  onDrop: (e: DragEvent) => void;
}

/**
 * @param dragType MIME-ish string set on the dragged data (e.g. "application/saved-user").
 *                 When `undefined`, the returned handlers are no-ops.
 * @param onDrop   Called with the dragged payload string when the user releases over the target.
 */
export function useDropTarget(
  dragType: string | undefined,
  onDrop: ((data: string) => void) | undefined,
): DropTargetHandlers {
  const [isDragOver, setIsDragOver] = useState(false);
  const enabled = !!(dragType && onDrop);

  const noop = () => {};
  if (!enabled) {
    return {
      isDragOver: false,
      onDragEnter: noop,
      onDragOver:  noop,
      onDragLeave: noop,
      onDrop:      noop,
    };
  }

  return {
    isDragOver,
    onDragEnter: (e) => {
      if (!e.dataTransfer.types.includes(dragType!)) return;
      e.preventDefault();
      setIsDragOver(true);
    },
    onDragOver: (e) => {
      if (!e.dataTransfer.types.includes(dragType!)) return;
      e.preventDefault();
    },
    onDragLeave: (e) => {
      // Only un-highlight when leaving the wrapping element entirely, not
      // when crossing into a child. relatedTarget is the new hover target.
      if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
      setIsDragOver(false);
    },
    onDrop: (e) => {
      setIsDragOver(false);
      const data = e.dataTransfer.getData(dragType!);
      if (!data) return;
      e.preventDefault();
      onDrop!(data);
    },
  };
}
