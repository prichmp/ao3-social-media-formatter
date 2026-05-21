import { useEffect, useRef, useState } from 'react';
import styles from './DropdownMenu.module.css';

export interface DropdownItem {
  label: string;
  onClick: () => void;
  danger?: boolean;
}

interface Props {
  label: string;
  items: DropdownItem[];
}

export function DropdownMenu({ label, items }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen(o => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {label}
        <span className={styles.caret} aria-hidden="true">▾</span>
      </button>
      {open && (
        <div className={styles.menu} role="menu">
          {items.map((item, i) => (
            <button
              key={i}
              type="button"
              role="menuitem"
              className={`${styles.item} ${item.danger ? styles.danger : ''}`}
              onClick={() => {
                setOpen(false);
                item.onClick();
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
