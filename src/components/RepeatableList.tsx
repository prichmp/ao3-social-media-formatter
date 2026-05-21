import { useState } from 'react';
import React from 'react';
import styles from './RepeatableList.module.css';

interface Props<T> {
  items: T[];
  getId: (item: T) => string;
  onReorder: (items: T[]) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  addLabel: string;
  renderItem: (item: T, onChange: (updated: T) => void) => React.ReactNode;
  onExternalDrop?: (data: string, index: number) => void;
  externalDragType?: string;
}

function ExternalDropZone({ index, dragType, onDrop }: {
  index: number;
  dragType: string;
  onDrop: (data: string, index: number) => void;
}) {
  const [over, setOver] = useState(0);
  return (
    <div
      className={`${styles.dropZone} ${over > 0 ? styles.dropZoneActive : ''}`}
      onDragEnter={e => {
        if (!e.dataTransfer.types.includes(dragType)) return;
        e.preventDefault();
        setOver(c => c + 1);
      }}
      onDragOver={e => {
        if (!e.dataTransfer.types.includes(dragType)) return;
        e.preventDefault();
      }}
      onDragLeave={() => setOver(c => Math.max(0, c - 1))}
      onDrop={e => {
        const data = e.dataTransfer.getData(dragType);
        if (!data) return;
        e.preventDefault();
        setOver(0);
        onDrop(data, index);
      }}
    />
  );
}

export function RepeatableList<T>({
  items,
  getId,
  onReorder,
  onAdd,
  onRemove,
  addLabel,
  renderItem,
  onExternalDrop,
  externalDragType,
}: Props<T>) {
  function handleChange(id: string, updated: T) {
    onReorder(items.map(item => (getId(item) === id ? updated : item)));
  }

  function moveUp(index: number) {
    if (index === 0) return;
    const next = [...items];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    onReorder(next);
  }

  function moveDown(index: number) {
    if (index === items.length - 1) return;
    const next = [...items];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    onReorder(next);
  }

  const showDropZones = !!(onExternalDrop && externalDragType);

  return (
    <div className={styles.list}>
      {showDropZones && (
        <ExternalDropZone index={0} dragType={externalDragType!} onDrop={onExternalDrop!} />
      )}
      {items.map((item, i) => {
        const id = getId(item);
        return (
          <React.Fragment key={id}>
            <div className={styles.item}>
              <div className={styles.controls}>
                <button className={styles.btn} onClick={() => moveUp(i)} disabled={i === 0} title="Move up">↑</button>
                <button className={styles.btn} onClick={() => moveDown(i)} disabled={i === items.length - 1} title="Move down">↓</button>
                <button className={`${styles.btn} ${styles.remove}`} onClick={() => onRemove(id)} title="Remove">×</button>
              </div>
              <div className={styles.content}>
                {renderItem(item, updated => handleChange(id, updated))}
              </div>
            </div>
            {showDropZones && (
              <ExternalDropZone index={i + 1} dragType={externalDragType!} onDrop={onExternalDrop!} />
            )}
          </React.Fragment>
        );
      })}
      <button className={styles.addBtn} onClick={onAdd}>{addLabel}</button>
    </div>
  );
}
