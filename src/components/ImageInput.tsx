import { useRef, useState } from 'react';
import type { ImageRef } from '../formats/types';
import { fileToWebp } from '../lib/imageUpload';
import styles from './ImageInput.module.css';

interface Props {
  value: ImageRef;
  onChange: (v: ImageRef) => void;
  defaultDimensions?: number;
  showDimensions?: boolean;
  /** Longest-edge size (px) uploaded images are resized to before encoding. */
  uploadMaxSize?: number;
}

export function ImageInput({
  value,
  onChange,
  defaultDimensions,
  showDimensions = true,
  uploadMaxSize = 1080,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isHttp = value.src.startsWith('http://');
  const isData = value.src.startsWith('data:');
  const isEmpty = !value.src;

  const set = <K extends keyof ImageRef>(k: K, v: ImageRef[K]) => onChange({ ...value, [k]: v });

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const { src } = await fileToWebp(file, uploadMaxSize);
      onChange({ ...value, src });
    } catch {
      setError('Could not process that image. Try a different file.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.container}>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className={styles.hiddenFile}
        onChange={handleFile}
      />

      {isData ? (
        <div className={styles.uploaded}>
          <img className={styles.thumb} src={value.src} alt="" />
          <span className={styles.uploadedLabel}>Uploaded image</span>
          <button type="button" className={styles.smallBtn} onClick={() => fileRef.current?.click()} disabled={busy}>
            {busy ? 'Working…' : 'Replace'}
          </button>
          <button type="button" className={styles.smallBtn} onClick={() => set('src', '')}>
            Remove
          </button>
        </div>
      ) : (
        <div className={styles.urlRow}>
          <input
            type="url"
            className={`${styles.urlInput} ${isHttp ? styles.warn : ''}`}
            value={value.src}
            onChange={e => {
              const src = e.target.value;
              const next: ImageRef = { ...value, src };
              if (defaultDimensions && !value.width && !value.height && src) {
                next.width = defaultDimensions;
                next.height = defaultDimensions;
              }
              onChange(next);
            }}
            placeholder="https://i.imgur.com/…"
          />
          <button type="button" className={styles.uploadBtn} onClick={() => fileRef.current?.click()} disabled={busy}>
            {busy ? 'Working…' : 'Upload'}
          </button>
        </div>
      )}

      {error && <p className={styles.warnMsg}>{error}</p>}

      {isHttp && (
        <p className={styles.warnMsg}>
          AO3 is HTTPS — an <code>http://</code> image will be blocked as mixed content for readers. Use an <code>https://</code> URL.
        </p>
      )}

      {!isEmpty && (
        <div className={styles.meta}>
          <label className={styles.metaField}>
            <span>Alt text</span>
            <input
              type="text"
              className={styles.metaInput}
              value={value.alt}
              onChange={e => set('alt', e.target.value)}
              placeholder="describe the image"
            />
          </label>
          {showDimensions && (
            <>
              <label className={styles.metaField}>
                <span>W</span>
                <input
                  type="number"
                  className={`${styles.metaInput} ${styles.dimInput}`}
                  value={value.width ?? ''}
                  onChange={e => set('width', e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="50"
                />
              </label>
              <label className={styles.metaField}>
                <span>H</span>
                <input
                  type="number"
                  className={`${styles.metaInput} ${styles.dimInput}`}
                  value={value.height ?? ''}
                  onChange={e => set('height', e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="50"
                />
              </label>
            </>
          )}
        </div>
      )}
    </div>
  );
}
