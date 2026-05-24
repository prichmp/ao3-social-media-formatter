import React, { useState } from 'react';
import type { TumblrEntry, TumblrPost } from './types';
import type { ImageRef } from '../types';
import { ImageInput } from '../../components/ImageInput';
import { RepeatableList } from '../../components/RepeatableList';
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
  const set = <K extends keyof TumblrEntry>(k: K, v: TumblrEntry[K]) =>
    onChange({ ...entry, [k]: v });
  const setAvatar = (v: ImageRef) => set('avatar', v);

  // Tags are stored as string[]; display them as a single comma- or
  // space-separated input for ergonomics. We split on commas first, then
  // on whitespace, so "tag one, tag two" and "tag_one tag_two" both work.
  const tagsString = entry.tags.join(', ');
  function setTagsFromString(raw: string) {
    const parts = raw
      .split(',')
      .map(p => p.trim())
      .filter(Boolean);
    set('tags', parts);
  }

  return (
    <div className={styles.entryCard}>
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
          value={tagsString}
          onChange={setTagsFromString}
          placeholder="adoradiscourse, long post, sword lesbians"
        />
      </Field>
    </div>
  );
}

export function TumblrForm({ state, onChange }: Props) {
  const set = <K extends keyof TumblrPost>(k: K, v: TumblrPost[K]) =>
    onChange({ ...state, [k]: v });

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
