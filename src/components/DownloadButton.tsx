import { useState } from 'react';
import styles from './DownloadButton.module.css';

interface Props {
  canvas: HTMLCanvasElement | null;
  /** Whether the canvas has finished its first successful render. */
  ready?: boolean;
  filename?: string;
}

export function DownloadButton({ canvas, ready = true, filename = 'tweet.png' }: Props) {
  const [busy, setBusy] = useState(false);

  function handleDownload() {
    if (!canvas || !ready) return;
    setBusy(true);
    try {
      canvas.toBlob((blob) => {
        setBusy(false);
        if (!blob) {
          alert('Could not generate the image.');
          return;
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      }, 'image/png');
    } catch {
      // toBlob throws synchronously if the canvas is tainted by a cross-origin
      // image whose host didn't allow CORS.
      setBusy(false);
      alert(
        'Could not export the image because one of the images is blocked by its host. ' +
          'Try hosting images on Imgur or Tumblr, which allow cross-origin use.',
      );
    }
  }

  return (
    <div className={styles.panel}>
      <button
        className={styles.button}
        onClick={handleDownload}
        disabled={!canvas || !ready || busy}
      >
        {busy ? 'Preparing…' : 'Download image (PNG)'}
      </button>
      <p className={styles.hint}>
        Saves the preview above as a PNG. Upload it to your image host and embed the link in your AO3 work.
      </p>
    </div>
  );
}
