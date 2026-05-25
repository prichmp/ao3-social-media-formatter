import React, { useEffect, useState } from 'react';
import type { TumblrEntry, TumblrPost } from './types';
import type { ImageRef } from '../types';
import { ImageInput } from '../../components/ImageInput';
import { RepeatableList } from '../../components/RepeatableList';
import { SAVED_USER_DRAG_TYPE, type SavedUser } from '../../lib/savedUser';
import { useDropTarget } from '../../lib/useDropTarget';
import { useUserList } from '../../lib/UserListContext';
import styles from './Form.module.css';

interface Props {
  state: TumblrPost;
  onChange: (s: TumblrPost) => void;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <details
      className={styles.section}
      open={open}
      onToggle={e => setOpen((e.currentTarget as HTMLDetailsElement).open)}
    >
      <summary className={styles.sectionTitle}>{title}</summary>
      <div className={styles.sectionBody}>{children}</div>
    </details>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      {children}
    </label>
  );
}

function TextInput({ value, onChange, placeholder }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      className={styles.input}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
    />
  );
}

function TextArea({ value, onChange, placeholder, rows = 3 }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      className={styles.textarea}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
    />
  );
}

function parseTags(raw: string): string[] {
  return raw.split(',').map(p => p.trim()).filter(Boolean);
}

function makeEntry(): TumblrEntry {
  return {
    id: crypto.randomUUID(),
    username: '',
    avatar: { src: '', alt: '' },
    content: '',
    image: { src: '', alt: '' },
    tags: [],
  };
}

function EntryCard({ entry, isOriginal, onChange }: {
  entry: TumblrEntry;
  isOriginal: boolean;
  onChange: (e: TumblrEntry) => void;
}) {
  const { users, addUser } = useUserList();
  const set = <K extends keyof TumblrEntry>(k: K, v: TumblrEntry[K]) =>
    onChange({ ...entry, [k]: v });
  const setAvatar = (v: ImageRef) => set('avatar', v);

  // Tags are stored as string[] but the input is a single comma-separated
  // string. Keep the raw text as local state so typing a comma or trailing
  // space isn't immediately erased by re-derivation from `entry.tags`.
  // When `entry.tags` changes externally (drag-drop on the card, etc.) the
  // effect below replaces the local text to match.
  const [tagsRaw, setTagsRaw] = useState(() => entry.tags.join(', '));

  useEffect(() => {
    const parsedFromRaw = parseTags(tagsRaw);
    if (JSON.stringify(parsedFromRaw) !== JSON.stringify(entry.tags)) {
      setTagsRaw(entry.tags.join(', '));
    }
    // Intentionally only watch entry.tags. Watching tagsRaw too would
    // fight the user mid-keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry.tags]);

  function setTagsFromString(raw: string) {
    setTagsRaw(raw);
    set('tags', parseTags(raw));
  }

  function handleDrop(data: string) {
    try {
      const user = JSON.parse(data) as SavedUser;
      onChange({
        ...entry,
        username: user.handle || user.name || entry.username,
        avatar: { ...user.avatar },
      });
    } catch { /* ignore */ }
  }

  // Tumblr usernames live in `handle` on a SavedUser.
  const canAddToList =
    entry.username.trim() !== '' &&
    !users.some(u => u.handle === entry.username);

  function handleAddToUserList() {
    const user: SavedUser = {
      id: crypto.randomUUID(),
      name: '',
      handle: entry.username,
      email: '',
      color: '',
      avatar: entry.avatar,
      verified: false,
    };
    addUser(user);
  }

  const drop = useDropTarget(SAVED_USER_DRAG_TYPE, handleDrop);

  return (
    <div
      className={`${styles.entryCard}${drop.isDragOver ? ` ${styles.entryCardDropTarget}` : ''}`}
      onDragEnter={drop.onDragEnter}
      onDragOver={drop.onDragOver}
      onDragLeave={drop.onDragLeave}
      onDrop={drop.onDrop}
    >
      {isOriginal && <span className={styles.originalChip}>Original post</span>}
      <Field label="Username">
        <TextInput value={entry.username} onChange={v => set('username', v)} placeholder="best-friend-squad" />
      </Field>
      <Field label="Avatar">
        <ImageInput
          value={entry.avatar}
          onChange={setAvatar}
          defaultDimensions={28}
          showDimensions={false}
          uploadMaxSize={240}
        />
      </Field>
      <Field label={isOriginal ? 'Post body' : 'Reblog commentary (leave empty for silent reblog)'}>
        <TextArea value={entry.content} onChange={v => set('content', v)} />
      </Field>
      <Field label="Inline image (optional)">
        <ImageInput
          value={entry.image}
          onChange={v => set('image', v)}
          showDimensions={false}
        />
      </Field>
      <Field label="Tags (comma-separated, no #)">
        <TextInput
          value={tagsRaw}
          onChange={setTagsFromString}
          placeholder="adoradiscourse, long post, sword lesbians"
        />
      </Field>
      {canAddToList && (
        <button type="button" className={styles.addUserBtn} onClick={handleAddToUserList}>
          + Add to user list
        </button>
      )}
    </div>
  );
}

export function TumblrForm({ state, onChange }: Props) {
  const set = <K extends keyof TumblrPost>(k: K, v: TumblrPost[K]) =>
    onChange({ ...state, [k]: v });

  function handleEntryListDrop(data: string, index: number) {
    try {
      const user = JSON.parse(data) as SavedUser;
      const newEntry: TumblrEntry = {
        id: crypto.randomUUID(),
        username: user.handle || user.name,
        avatar: { ...user.avatar },
        content: '',
        image: { src: '', alt: '' },
        tags: [],
      };
      const next = [...state.entries];
      next.splice(index, 0, newEntry);
      set('entries', next);
    } catch { /* ignore */ }
  }

  return (
    <div className={styles.form}>
      <Section title="Reblog tower">
        <RepeatableList
          items={state.entries}
          getId={e => e.id}
          onReorder={entries => set('entries', entries)}
          onAdd={() => set('entries', [...state.entries, makeEntry()])}
          onRemove={id => set('entries', state.entries.filter(e => e.id !== id))}
          addLabel="Add reblog"
          externalDragType={SAVED_USER_DRAG_TYPE}
          onExternalDrop={handleEntryListDrop}
          renderItem={(entry, onItemChange) => (
            <EntryCard
              key={entry.id}
              entry={entry}
              isOriginal={state.entries[0]?.id === entry.id}
              onChange={updated => onItemChange(updated)}
            />
          )}
        />
      </Section>

      <Section title="Footer">
        <Field label="Notes count">
          <TextInput value={state.notes} onChange={v => set('notes', v)} placeholder="47,283 notes" />
        </Field>
        <Field label="Timestamp">
          <TextInput value={state.timestamp} onChange={v => set('timestamp', v)} placeholder="2 days ago" />
        </Field>
      </Section>
    </div>
  );
}
