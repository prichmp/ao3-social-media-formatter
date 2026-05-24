import React, { useState } from 'react';
import type { BadgeKind, ChatMessage, LivestreamSegment } from './types';
import type { ImageRef } from '../types';
import { ImageInput } from '../../components/ImageInput';
import { RepeatableList } from '../../components/RepeatableList';
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
  const set = <K extends keyof ChatMessage>(k: K, v: ChatMessage[K]) =>
    onChange({ ...message, [k]: v });

  function toggleBadge(kind: BadgeKind) {
    const has = message.badges.includes(kind);
    set('badges', has ? message.badges.filter(b => b !== kind) : [...message.badges, kind]);
  }

  return (
    <div className={styles.chatCard}>
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
    </div>
  );
}

export function LivestreamForm({ state, onChange }: Props) {
  const set = <K extends keyof LivestreamSegment>(k: K, v: LivestreamSegment[K]) =>
    onChange({ ...state, [k]: v });
  const setStreamer = <K extends keyof LivestreamSegment['streamer']>(k: K, v: LivestreamSegment['streamer'][K]) =>
    set('streamer', { ...state.streamer, [k]: v });
  const setAvatar = (v: ImageRef) => setStreamer('avatar', v);

  return (
    <div className={styles.form}>
      <Section title="Stream">
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
