import React, { useState } from 'react';
import type { AttachmentType, TweetAttachment, TwitterPost, TwitterReply, TwitterUser } from './types';
import { TWITTER_USER_DRAG_TYPE, defaultAttachment } from './types';
import type { ImageRef } from '../types';
import { ImageInput } from '../../components/ImageInput';
import { RepeatableList } from '../../components/RepeatableList';
import { useUserList } from '../../lib/UserListContext';
import styles from './Form.module.css';

interface Props {
  state: TwitterPost;
  onChange: (s: TwitterPost) => void;
}

interface SectionProps {
  title: string;
  children: React.ReactNode;
  externalDragType?: string;
  onExternalDrop?: (data: string) => void;
}

function Section({ title, children, externalDragType, onExternalDrop }: SectionProps) {
  const [open, setOpen] = useState(true);
  const [isDragOver, setIsDragOver] = useState(false);
  const isDropTarget = !!(externalDragType && onExternalDrop);

  return (
    <details
      className={`${styles.section}${isDragOver ? ` ${styles.sectionDropTarget}` : ''}`}
      open={open}
      onToggle={e => setOpen((e.currentTarget as HTMLDetailsElement).open)}
      onDragEnter={isDropTarget ? e => {
        if (!e.dataTransfer.types.includes(externalDragType!)) return;
        e.preventDefault();
        setIsDragOver(true);
      } : undefined}
      onDragOver={isDropTarget ? e => {
        if (!e.dataTransfer.types.includes(externalDragType!)) return;
        e.preventDefault();
      } : undefined}
      onDragLeave={isDropTarget ? e => {
        if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
        setIsDragOver(false);
      } : undefined}
      onDrop={isDropTarget ? e => {
        setIsDragOver(false);
        const data = e.dataTransfer.getData(externalDragType!);
        if (!data) return;
        e.preventDefault();
        onExternalDrop!(data);
      } : undefined}
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

function TextInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <input type="text" className={styles.input} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />;
}

function TextArea({ value, onChange, placeholder, rows = 3 }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return <textarea className={styles.textarea} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows} />;
}

interface ReplyOption {
  label: string;
  handle: string;
}

function makeReply(authorHandle: string): TwitterReply {
  return {
    id: crypto.randomUUID(),
    avatar: { src: '', alt: '', width: 50, height: 50 },
    name: '',
    handle: '',
    relativeTime: '',
    replyingTo: authorHandle,
    content: '',
    attachment: { type: 'text' },
    showStats: true,
  };
}

function ReplyCard({ reply, onChange, replyOptions }: {
  reply: TwitterReply;
  onChange: (r: TwitterReply) => void;
  replyOptions: ReplyOption[];
}) {
  const { users, addUser } = useUserList();
  const set = <K extends keyof TwitterReply>(k: K, v: TwitterReply[K]) => onChange({ ...reply, [k]: v });
  const setAvatar = (v: ImageRef) => set('avatar', v);

  const canAddToList =
    reply.name.trim() !== '' &&
    reply.handle.trim() !== '' &&
    !users.some(u => u.name === reply.name && u.handle === reply.handle);

  function handleAddToUserList() {
    const user: TwitterUser = {
      id: crypto.randomUUID(),
      name: reply.name,
      handle: reply.handle,
      email: '',
      color: '',
      avatar: reply.avatar,
    };
    addUser(user);
  }

  return (
    <div className={styles.replyCard}>
      <Field label="Avatar">
        <ImageInput value={reply.avatar} onChange={setAvatar} defaultDimensions={50} showDimensions={false} uploadMaxSize={240} />
      </Field>
      <Field label="Display name">
        <TextInput value={reply.name} onChange={v => set('name', v)} />
      </Field>
      <Field label="Handle (@)">
        <TextInput value={reply.handle} onChange={v => set('handle', v)} placeholder="handle" />
      </Field>
      <Field label="Relative time">
        <TextInput value={reply.relativeTime} onChange={v => set('relativeTime', v)} placeholder="10 hours ago" />
      </Field>
      <Field label="Replying to">
        <select
          className={styles.input}
          value={reply.replyingTo}
          onChange={e => set('replyingTo', e.target.value)}
        >
          {replyOptions.map(opt => (
            <option key={opt.handle} value={opt.handle}>{opt.label}</option>
          ))}
          {/* Keep current value selectable even if not in list */}
          {reply.replyingTo && !replyOptions.some(o => o.handle === reply.replyingTo) && (
            <option value={reply.replyingTo}>@{reply.replyingTo}</option>
          )}
        </select>
      </Field>
      <Field label="Reply text">
        <TextArea value={reply.content} onChange={v => set('content', v)} rows={2} />
      </Field>
      <Field label="Content type">
        <select
          className={styles.input}
          value={reply.attachment.type}
          onChange={e => set('attachment', defaultAttachment(e.target.value as AttachmentType))}
        >
          <option value="text">Text</option>
          <option value="image">Image</option>
          <option value="quote">Quote</option>
          <option value="video">Video</option>
          <option value="music">Music</option>
        </select>
      </Field>
      <AttachmentFields attachment={reply.attachment} onChange={a => set('attachment', a)} />
      <label className={styles.checkLabel}>
        <input type="checkbox" checked={reply.showStats} onChange={e => set('showStats', e.target.checked)} />
        Show stat icons
      </label>
      {canAddToList && (
        <button className={styles.addUserBtn} onClick={handleAddToUserList}>
          + Add to user list
        </button>
      )}
    </div>
  );
}

type QuoteAttachment = Extract<TweetAttachment, { type: 'quote' }>;

function QuoteFields({ attachment, onChange }: {
  attachment: QuoteAttachment;
  onChange: (a: QuoteAttachment) => void;
}) {
  const { users, addUser } = useUserList();
  const [isDragOver, setIsDragOver] = useState(false);

  // Same shape as the ReplyCard helper -- enable the button once both name
  // and handle are non-empty, and only if this exact user isn't already
  // present in the user list.
  const canAddToList =
    attachment.name.trim() !== '' &&
    attachment.handle.trim() !== '' &&
    !users.some(u => u.name === attachment.name && u.handle === attachment.handle);

  function handleAddToUserList() {
    addUser({
      id: crypto.randomUUID(),
      name: attachment.name,
      handle: attachment.handle,
      email: '',
      color: '',
      avatar: attachment.avatar,
    });
  }

  function handleDrop(e: React.DragEvent) {
    setIsDragOver(false);
    const data = e.dataTransfer.getData(TWITTER_USER_DRAG_TYPE);
    if (!data) return;
    e.preventDefault();
    try {
      const user = JSON.parse(data) as TwitterUser;
      onChange({ ...attachment, name: user.name, handle: user.handle, avatar: { ...user.avatar } });
    } catch {
      // ignore malformed drag data
    }
  }

  return (
    <div
      className={`${styles.attachmentBox}${isDragOver ? ` ${styles.attachmentDropTarget}` : ''}`}
      onDragEnter={e => {
        if (!e.dataTransfer.types.includes(TWITTER_USER_DRAG_TYPE)) return;
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragOver={e => {
        if (!e.dataTransfer.types.includes(TWITTER_USER_DRAG_TYPE)) return;
        e.preventDefault();
      }}
      onDragLeave={e => {
        if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
        setIsDragOver(false);
      }}
      onDrop={handleDrop}
    >
      <Field label="Quote avatar">
        <ImageInput
          value={attachment.avatar}
          onChange={v => onChange({ ...attachment, avatar: v })}
          defaultDimensions={50}
          showDimensions={false}
          uploadMaxSize={240}
        />
      </Field>
      <Field label="Quote display name">
        <TextInput value={attachment.name} onChange={v => onChange({ ...attachment, name: v })} />
      </Field>
      <Field label="Quote handle (@)">
        <TextInput value={attachment.handle} onChange={v => onChange({ ...attachment, handle: v })} placeholder="handle" />
      </Field>
      <Field label="Quote text">
        <TextArea value={attachment.content} onChange={v => onChange({ ...attachment, content: v })} rows={2} />
      </Field>
      {canAddToList && (
        <button className={styles.addUserBtn} onClick={handleAddToUserList}>
          + Add to user list
        </button>
      )}
    </div>
  );
}

function AttachmentFields({ attachment, onChange }: {
  attachment: TweetAttachment;
  onChange: (a: TweetAttachment) => void;
}) {
  // Each branch returns the attachment-specific sub-form. The 'text' case has
  // nothing to render. All sub-forms share a tinted container so it's clear
  // they belong to whichever type the dropdown selected.
  switch (attachment.type) {
    case 'text':
      return null;
    case 'image':
      return (
        <div className={styles.attachmentBox}>
          <Field label="Image">
            <ImageInput
              value={attachment.image}
              onChange={v => onChange({ ...attachment, image: v })}
              showDimensions={false}
            />
          </Field>
        </div>
      );
    case 'quote':
      return <QuoteFields attachment={attachment} onChange={onChange} />;
    case 'video':
      return (
        <div className={styles.attachmentBox}>
          <Field label="Video thumbnail">
            <ImageInput
              value={attachment.thumbnail}
              onChange={v => onChange({ ...attachment, thumbnail: v })}
              showDimensions={false}
            />
          </Field>
          <Field label="Duration">
            <TextInput
              value={attachment.duration}
              onChange={v => onChange({ ...attachment, duration: v })}
              placeholder="0:42"
            />
          </Field>
        </div>
      );
    case 'music':
      return (
        <div className={styles.attachmentBox}>
          <Field label="Album art">
            <ImageInput
              value={attachment.albumArt}
              onChange={v => onChange({ ...attachment, albumArt: v })}
              defaultDimensions={64}
              showDimensions={false}
              uploadMaxSize={240}
            />
          </Field>
          <Field label="Track title">
            <TextInput value={attachment.title} onChange={v => onChange({ ...attachment, title: v })} />
          </Field>
          <Field label="Artist">
            <TextInput value={attachment.artist} onChange={v => onChange({ ...attachment, artist: v })} />
          </Field>
        </div>
      );
  }
}

export function TwitterForm({ state, onChange }: Props) {
  const set = <K extends keyof TwitterPost>(k: K, v: TwitterPost[K]) => onChange({ ...state, [k]: v });

  function handleAuthorDrop(data: string) {
    try {
      const user = JSON.parse(data) as TwitterUser;
      set('author', { ...state.author, name: user.name, handle: user.handle, avatar: user.avatar });
    } catch {
      // ignore malformed drag data
    }
  }

  function handleReplyDrop(data: string, index: number) {
    try {
      const user = JSON.parse(data) as TwitterUser;
      const newReply = makeReply(state.author.handle);
      newReply.name = user.name;
      newReply.handle = user.handle;
      newReply.avatar = { ...user.avatar };
      const next = [...state.replies];
      next.splice(index, 0, newReply);
      set('replies', next);
    } catch {
      // ignore malformed drag data
    }
  }

  function buildReplyOptions(excludeId: string): ReplyOption[] {
    const options: ReplyOption[] = [];
    const seen = new Set<string>();

    if (state.author.handle) {
      options.push({
        handle: state.author.handle,
        label: state.author.name
          ? `${state.author.name} (@${state.author.handle})`
          : `@${state.author.handle}`,
      });
      seen.add(state.author.handle);
    }

    for (const r of state.replies) {
      if (r.id !== excludeId && r.handle.trim() && !seen.has(r.handle)) {
        options.push({
          handle: r.handle,
          label: r.name ? `${r.name} (@${r.handle})` : `@${r.handle}`,
        });
        seen.add(r.handle);
      }
    }

    return options;
  }

  return (
    <div className={styles.form}>
      <Section
        title="Author"
        externalDragType={TWITTER_USER_DRAG_TYPE}
        onExternalDrop={handleAuthorDrop}
      >
        <Field label="Avatar">
          <ImageInput
            value={state.author.avatar}
            onChange={v => set('author', { ...state.author, avatar: v })}
            defaultDimensions={50}
            showDimensions={false}
            uploadMaxSize={240}
          />
        </Field>
        <Field label="Display name">
          <TextInput value={state.author.name} onChange={v => set('author', { ...state.author, name: v })} />
        </Field>
        <Field label="Handle (@)">
          <TextInput value={state.author.handle} onChange={v => set('author', { ...state.author, handle: v })} placeholder="handle" />
        </Field>
        <Field label="Time">
          <TextInput value={state.time} onChange={v => set('time', v)} placeholder="9:40 AM" />
        </Field>
        <Field label="Relative time">
          <TextInput value={state.relativeTime} onChange={v => set('relativeTime', v)} placeholder="10 hours ago" />
        </Field>
      </Section>

      <Section title="Tweet content">
        <Field label="Content type">
          <select
            className={styles.input}
            value={state.attachment.type}
            onChange={e => set('attachment', defaultAttachment(e.target.value as AttachmentType))}
          >
            <option value="text">Text</option>
            <option value="image">Image</option>
            <option value="quote">Quote</option>
            <option value="video">Video</option>
            <option value="music">Music</option>
          </select>
        </Field>
        <Field label="Tweet text">
          <TextArea value={state.content} onChange={v => set('content', v)} rows={4} placeholder="What's happening?" />
        </Field>
        <AttachmentFields attachment={state.attachment} onChange={a => set('attachment', a)} />
      </Section>

      <Section title="Stats row">
        <label className={styles.checkLabel}>
          <input type="checkbox" checked={state.stats.showRow} onChange={e => set('stats', { ...state.stats, showRow: e.target.checked })} />
          Show stats row
        </label>
        {state.stats.showRow && (
          <Field label="Stats label text">
            <TextInput value={state.stats.labels} onChange={v => set('stats', { ...state.stats, labels: v })} />
          </Field>
        )}
      </Section>

      <Section title="Replies">
        <RepeatableList
          items={state.replies}
          getId={r => r.id}
          onReorder={replies => set('replies', replies)}
          onAdd={() => set('replies', [...state.replies, makeReply(state.author.handle)])}
          onRemove={id => set('replies', state.replies.filter(r => r.id !== id))}
          addLabel="Add reply"
          externalDragType={TWITTER_USER_DRAG_TYPE}
          onExternalDrop={handleReplyDrop}
          renderItem={(reply, onChange) => (
            <ReplyCard
              key={reply.id}
              reply={reply}
              onChange={updated => onChange(updated)}
              replyOptions={buildReplyOptions(reply.id)}
            />
          )}
        />
      </Section>
    </div>
  );
}
