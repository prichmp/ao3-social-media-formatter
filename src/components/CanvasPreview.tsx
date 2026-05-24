import { useEffect, useRef, useState } from 'react';
import type { RenderResult } from '../formats/types';
import styles from './CanvasPreview.module.css';

export type RenderStatus = 'pending' | 'ok' | 'error';

interface Props<T> {
  post: T;
  render: (canvas: HTMLCanvasElement, post: T) => Promise<RenderResult>;
  onCanvasReady?: (canvas: HTMLCanvasElement | null) => void;
  onStatusChange?: (status: RenderStatus) => void;
  /** Logical (CSS-px) dimensions of the last successful render. */
  onDimensionsChange?: (size: { width: number; height: number } | null) => void;
}

export function CanvasPreview<T>({ post, render, onCanvasReady, onStatusChange, onDimensionsChange }: Props<T>) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderToken = useRef(0);
  const [failed, setFailed] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Hand the canvas element to the parent once (the DOM node is stable).
  useEffect(() => {
    onCanvasReady?.(canvasRef.current);
    return () => onCanvasReady?.(null);
  }, [onCanvasReady]);

  // Re-render whenever the post changes, ignoring stale async results.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const token = ++renderToken.current;
    onStatusChange?.('pending');

    render(canvas, post)
      .then((result) => {
        if (token !== renderToken.current) return;
        setFailed(result.failed);
        setError(result.ok ? null : result.error ?? 'render-failed');
        onStatusChange?.(result.ok ? 'ok' : 'error');
        onDimensionsChange?.(result.ok ? { width: result.width, height: result.height } : null);
      })
      .catch(() => {
        if (token !== renderToken.current) return;
        setError('render-failed');
        onStatusChange?.('error');
        onDimensionsChange?.(null);
      });
  }, [post, render, onStatusChange, onDimensionsChange]);

  return (
    <div className={styles.wrapper}>
      <canvas ref={canvasRef} className={styles.canvas} />
      {error && (
        <p className={styles.error}>Could not render the preview. Try reloading the page.</p>
      )}
      {failed.length > 0 && (
        <p className={styles.warning}>
          {failed.length} image{failed.length > 1 ? 's' : ''} couldn’t be loaded and{' '}
          {failed.length > 1 ? 'were' : 'was'} drawn as a placeholder. The host may block
          cross-origin use — try an Imgur or Tumblr URL.
        </p>
      )}
    </div>
  );
}
