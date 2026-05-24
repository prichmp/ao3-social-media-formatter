import React, { useState } from 'react';
import type { EmailMessage, EmailThread } from './types';
import type { ImageRef } from '../types';
import { ImageInput } from '../../components/ImageInput';
import { RepeatableList } from '../../components/RepeatableList';
import styles from './Form.module.css';

interface Props {
  state: EmailThread;
  onChange: (s: EmailThread) => void;
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

function TextArea({ value, onChange, placeholder, rows = 4 }: {
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

function makeMessage(): EmailMessage {
  return {
    id: crypto.randomUUID(),
    senderName: '',
    senderEmail: '',
    senderAvatar: { src: '', alt: '' },
    senderColor: '#1A73E8',
    recipients: 'me',
    timestamp: '',
    body: '',
  };
}

function MessageCard({ message, onChange }: {
  message: EmailMessage;
  onChange: (m: EmailMessage) => void;
}) {
  const set = <K extends keyof EmailMessage>(k: K, v: EmailMessage[K]) =>
    onChange({ ...message, [k]: v });
  const setAvatar = (v: ImageRef) => set('senderAvatar', v);

  return (
    <div className={styles.messageCard}>
      <Field label="Sender name">
        <TextInput value={message.senderName} onChange={v => set('senderName', v)} />
      </Field>
      <Field label="Sender email">
        <TextInput value={message.senderEmail} onChange={v => set('senderEmail', v)} placeholder="alice@example.com" />
      </Field>
      <Field label="Sender avatar (optional)">
        <ImageInput
          value={message.senderAvatar}
          onChange={setAvatar}
          defaultDimensions={40}
          showDimensions={false}
          uploadMaxSize={240}
        />
      </Field>
      <Field label="Avatar fallback color">
        <div className={styles.colorRow}>
          <input
            type="color"
            className={styles.colorSwatch}
            value={message.senderColor || '#1A73E8'}
            onChange={e => set('senderColor', e.target.value)}
            aria-label="Avatar color"
          />
          <TextInput
            value={message.senderColor}
            onChange={v => set('senderColor', v)}
            placeholder="#1A73E8"
          />
        </div>
      </Field>
      <Field label="To">
        <TextInput value={message.recipients} onChange={v => set('recipients', v)} placeholder="me" />
      </Field>
      <Field label="Timestamp">
        <TextInput
          value={message.timestamp}
          onChange={v => set('timestamp', v)}
          placeholder="Mon, Sep 16, 10:32 AM"
        />
      </Field>
      <Field label="Body">
        <TextArea value={message.body} onChange={v => set('body', v)} />
      </Field>
    </div>
  );
}

export function EmailForm({ state, onChange }: Props) {
  const set = <K extends keyof EmailThread>(k: K, v: EmailThread[K]) =>
    onChange({ ...state, [k]: v });

  return (
    <div className={styles.form}>
      <Section title="Thread">
        <Field label="Subject">
          <TextInput value={state.subject} onChange={v => set('subject', v)} />
        </Field>
        <Field label="Label (optional)">
          <TextInput value={state.label} onChange={v => set('label', v)} placeholder="Inbox" />
        </Field>
      </Section>

      <Section title="Messages">
        <RepeatableList
          items={state.messages}
          getId={m => m.id}
          onReorder={messages => set('messages', messages)}
          onAdd={() => set('messages', [...state.messages, makeMessage()])}
          onRemove={id => set('messages', state.messages.filter(m => m.id !== id))}
          addLabel="Add message"
          renderItem={(message, onItemChange) => (
            <MessageCard
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
