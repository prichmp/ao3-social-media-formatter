// HTML snippet panel for the output section.
//
// AO3 doesn't host images, so we can't fill in `src`. We can prepopulate
// `alt` (with the post rendered as Markdown), `width`, and `height` (logical
// CSS-px dimensions from the canvas render). The user pastes this into their
// work, adds their hosted-image URL, and they're done.

import { useEffect, useState } from 'react';
import styles from './ImgTagSnippet.module.css';

interface Props {
  /** The fully-formed <img ... /> tag string to display. */
  imgTag: string;
  /** Disable the Copy button when the render isn't ready yet. */
  disabled?: boolean;
}

export function ImgTagSnippet({ imgTag, disabled }: Props) {
  const [copied, setCopied] = useState(false);

  // Reset the "Copied!" flash if the snippet itself changes -- otherwise the
  // label could linger over a snippet the user hasn't actually copied yet.
  useEffect(() => setCopied(false), [imgTag]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(imgTag);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard write rejected -- usually a permissions issue, nothing to do.
    }
  }

  return (
    <div className={styles.snippet}>
      <div className={styles.header}>
        <span className={styles.label}>HTML for AO3</span>
        <button
          type="button"
          className={styles.copyBtn}
          onClick={handleCopy}
          disabled={disabled}
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre className={styles.code}>{imgTag}</pre>
      <p className={styles.hint}>
        Paste into your AO3 work, then fill in <code>src=&quot;…&quot;</code> with the URL
        where you&apos;ve uploaded the downloaded image.
      </p>
    </div>
  );
}
