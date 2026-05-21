import type React from 'react';

export interface ImageRef {
  src: string;
  alt: string;
  width?: number;
  height?: number;
}

export interface RenderResult {
  ok: boolean;
  /** Logical (CSS px) dimensions of the rendered image. */
  width: number;
  height: number;
  /** Image URLs that failed to load (drawn as placeholders). */
  failed: string[];
  error?: string;
}

export interface FormatDefinition<TState> {
  id: string;
  label: string;
  defaults: TState;
  Form: React.FC<{ state: TState; onChange: (s: TState) => void }>;
  /** Render the state onto a canvas, returning the result + any load failures. */
  renderImage: (canvas: HTMLCanvasElement, state: TState) => Promise<RenderResult>;
}
