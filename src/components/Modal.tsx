import { useEffect } from 'react';
import type React from 'react';
import styles from './Modal.module.css';

interface Props {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}

export function Modal({ title, children, onClose }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className={styles.backdrop} onMouseDown={onClose}>
      <div className={styles.dialog} onMouseDown={e => e.stopPropagation()}>
        <div className={styles.header}>
          <span className={styles.title}>{title}</span>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>
        <div className={styles.body}>{children}</div>
      </div>
    </div>
  );
}
