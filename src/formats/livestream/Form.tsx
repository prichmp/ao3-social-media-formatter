import React, { useState } from 'react';
import type { BadgeKind, ChatMessage, LivestreamSegment } from './types';
import type { ImageRef } from '../types';
import { ImageInput } from '../../components/ImageInput';
import { RepeatableList } from '../../components/RepeatableList';
import { SAVED_USER_DRAG_TYPE, type SavedUser } from '../../lib/savedUser';
import { useDropTarget } from '../../lib/useDropTarget';
import { useUserList } from '../../lib/UserListContext';
import styles from './Form.module.css';

interface Props {
  state: LivestreamSegment;
  onChange: (s: LivestreamSegment) => void;
}

const BADGE_OPTIONS: { kind: BadgeKind; label: string; cls: string }[] = [
  { kind: 'broadcaster', label: 'Broadcaster', cls: styles.badgeBroadcaster },
  { kind: 'mod',         label: 'Mod',         cls: styles.badgeMod         },
  { kind: 'vip',         label: 'VIP',         cls: styles.badgeVip         },
  { kind: 'subscriber',  label: 'Subscriber',  cls: styles.badgeSubscriber  },
];

function Section({ title, children, externalDragType, onExternalDrop }: {
  title: string;
  children: React.ReactNode;
  externalDragType?: string;
  onExternalDrop?: (data: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const drop = useDropTarget(externalDragType, onExternalDrop);
  return (
    <details
      className={`${styles.section}${drop.isDragOver ? ` ${styles.sectionDropTarget}` : ''}`}
      open={open}
      onToggle={e => setOpen((e.currentTarget as HTMLDetailsElement).open)}
      onDragEnter={drop.onDragEnter}
      onDragOver={drop.onDragOver}
      onDragLeave={drop.onDragLeave}
      onDrop={drop.onDrop}
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

function TextArea({ value, onChange, placeholder, rows = 2 }: {
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

function makeChatMessage(): ChatMessage {
  return {
    id: crypto.randomUUID(),
    username: '',
    color: '#9147ff',
    badges: [],
    content: '',
  };
}

function ChatCard({ message, onChange }: {
  message: ChatMessage;
  onChange: (m: ChatMessage) => void;
}) {
  const { users, addUser } = useUserList();
  const set = <K extends keyof ChatMessage>(k: K, v: ChatMessage[K]) =>
    onChange({ ...message, [k]: v });

  function toggleBadge(kind: BadgeKind) {
    const has = message.badges.includes(kind);
    set('badges', has ? message.badges.filter(b => b !== kind) : [...message.badges, kind]);
  }

  function handleDrop(data: string) {
    try {
      const user = JSON.parse(data) as SavedUser;
      onChange({
        ...message,
        // Chat treats handle as the username; fall back to name if there's no handle.
        username: user.handle || user.name || message.username,
        color: user.color || message.color,
      });
    } catch {
      // ignore malformed drag data
    }
  }

  // Twitch usernames live in `handle` on a SavedUser. Avoid duplicating a
  // user that's already in the list at the same handle.
  const canAddToList =
    message.username.trim() !== '' &&
    !users.some(u => u.handle === message.username);

  function handleAddToUserList() {
    const user: SavedUser = {
      id: crypto.randomUUID(),
      name: '',
      handle: message.username,
      email: '',
      color: message.color,
      avatar: { src: '', alt: '' },
      verified: false,
    };
    addUser(user);
  }

  const drop = useDropTarget(SAVED_USER_DRAG_TYPE, handleDrop);

  return (
    <div
      className={`${styles.chatCard}${drop.isDragOver ? ` ${styles.chatCardDropTarget}` : ''}`}
      onDragEnter={drop.onDragEnter}
      onDragOver={drop.onDragOver}
      onDragLeave={drop.onDragLeave}
      onDrop={drop.onDrop}
    >
      <Field label="Username">
        <TextInput value={message.username} onChange={v => set('username', v)} />
      </Field>
      <Field label="Username color">
        <div className={styles.colorRow}>
          <input
            type="color"
            className={styles.colorSwatch}
            value={message.color || '#9147ff'}
            onChange={e => set('color', e.target.value)}
            aria-label="Username color"
          />
          <TextInput value={message.color} onChange={v => set('color', v)} placeholder="#9147ff" />
        </div>
      </Field>
      <Field label="Badges">
        <div className={styles.badgeRow}>
          {BADGE_OPTIONS.map(opt => {
            const active = message.badges.includes(opt.kind);
            return (
              <button
                type="button"
                key={opt.kind}
                className={`${styles.badgeBtn}${active ? ` ${styles.badgeBtnActive} ${opt.cls}` : ''}`}
                onClick={() => toggleBadge(opt.kind)}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </Field>
      <Field label="Message">
        <TextArea value={message.content} onChange={v => set('content', v)} />
      </Field>
      {canAddToList && (
        <button type="button" className={styles.addUserBtn} onClick={handleAddToUserList}>
          + Add to user list
        </button>
      )}
    </div>
  );
}

export function LivestreamForm({ state, onChange }: Props) {
  const set = <K extends keyof LivestreamSegment>(k: K, v: LivestreamSegment[K]) =>
    onChange({ ...state, [k]: v });
  const setStreamer = <K extends keyof LivestreamSegment['streamer']>(k: K, v: LivestreamSegment['streamer'][K]) =>
    set('streamer', { ...state.streamer, [k]: v });
  const setAvatar = (v: ImageRef) => setStreamer('avatar', v);

  function handleStreamerDrop(data: string) {
    try {
      const user = JSON.parse(data) as SavedUser;
      onChange({
        ...state,
        streamer: {
          name: user.name || user.handle || state.streamer.name,
          avatar: { ...user.avatar },
        },
      });
    } catch { /* ignore */ }
  }

  function handleChatListDrop(data: string, index: number) {
    try {
      const user = JSON.parse(data) as SavedUser;
      const newMessage: ChatMessage = {
        id: crypto.randomUUID(),
        username: user.handle || user.name,
        color: user.color || '#9147ff',
        badges: [],
        content: '',
      };
      const next = [...state.chat];
      next.splice(index, 0, newMessage);
      set('chat', next);
    } catch { /* ignore */ }
  }

  return (
    <div className={styles.form}>
      <Section
        title="Stream"
        externalDragType={SAVED_USER_DRAG_TYPE}
        onExternalDrop={handleStreamerDrop}
      >
        <Field label="Streamer name">
          <TextInput value={state.streamer.name} onChange={v => setStreamer('name', v)} />
        </Field>
        <Field label="Streamer avatar">
          <ImageInput
            value={state.streamer.avatar}
            onChange={setAvatar}
            defaultDimensions={40}
            showDimensions={false}
            uploadMaxSize={240}
          />
        </Field>
        <Field label="Stream title">
          <TextInput value={state.title} onChange={v => set('title', v)} />
        </Field>
        <Field label="Category">
          <TextInput value={state.category} onChange={v => set('category', v)} placeholder="Just Chatting" />
        </Field>
        <Field label="Viewer count">
          <TextInput value={state.viewerCount} onChange={v => set('viewerCount', v)} placeholder="3.2K" />
        </Field>
        <Field label="Stream thumbnail (optional)">
          <ImageInput
            value={state.thumbnail}
            onChange={v => set('thumbnail', v)}
            showDimensions={false}
          />
        </Field>
        <label className={styles.checkLabel}>
          <input
            type="checkbox"
            checked={state.showLiveBadge}
            onChange={e => set('showLiveBadge', e.target.checked)}
          />
          Show LIVE badge over the player
        </label>
      </Section>

      <Section title="Chat">
        <RepeatableList
          items={state.chat}
          getId={m => m.id}
          onReorder={chat => set('chat', chat)}
          onAdd={() => set('chat', [...state.chat, makeChatMessage()])}
          onRemove={id => set('chat', state.chat.filter(m => m.id !== id))}
          addLabel="Add chat message"
          externalDragType={SAVED_USER_DRAG_TYPE}
          onExternalDrop={handleChatListDrop}
          renderItem={(message, onItemChange) => (
            <ChatCard
              key={message.id}
              message={message}
              onChange={updated => onItemChange(updated)}
            />
          )}
        />
      </Section>
    </div>
  );
}
