import React, { useState } from 'react';
import type { IMessage, IMessageChain, MessageSender } from './types';
import type { ImageRef } from '../types';
import { ImageInput } from '../../components/ImageInput';
import { RepeatableList } from '../../components/RepeatableList';
import styles from './Form.module.css';

interface Props {
  state: IMessageChain;
  onChange: (s: IMessageChain) => void;
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

function makeMessage(sender: MessageSender): IMessage {
  return { id: crypto.randomUUID(), sender, content: '', timestamp: '' };
}

function MessageCard({ message, onChange }: {
  message: IMessage;
  onChange: (m: IMessage) => void;
}) {
  const set = <K extends keyof IMessage>(k: K, v: IMessage[K]) => onChange({ ...message, [k]: v });

  return (
    <div className={styles.messageCard}>
      <Field label="Sender">
        <div className={styles.senderRow}>
          <button
            type="button"
            className={`${styles.senderBtn}${message.sender === 'them' ? ` ${styles.senderBtnActive}` : ''}`}
            onClick={() => set('sender', 'them')}
          >
            Them (gray, left)
          </button>
          <button
            type="button"
            className={`${styles.senderBtn}${message.sender === 'me' ? ` ${styles.senderBtnActive}` : ''}`}
            onClick={() => set('sender', 'me')}
          >
            Me (blue, right)
          </button>
        </div>
      </Field>
      <Field label="Message text">
        <TextArea value={message.content} onChange={v => set('content', v)} />
      </Field>
      <Field label="Timestamp label (optional)">
        <TextInput
          value={message.timestamp}
          onChange={v => set('timestamp', v)}
          placeholder="Today 10:32 AM"
        />
      </Field>
    </div>
  );
}

export function IMessageForm({ state, onChange }: Props) {
  const set = <K extends keyof IMessageChain>(k: K, v: IMessageChain[K]) =>
    onChange({ ...state, [k]: v });
  const setAvatar = (v: ImageRef) => set('contactAvatar', v);

  return (
    <div className={styles.form}>
      <Section title="Contact">
        <Field label="Contact name">
          <TextInput value={state.contactName} onChange={v => set('contactName', v)} />
        </Field>
        <Field label="Contact avatar">
          <ImageInput
            value={state.contactAvatar}
            onChange={setAvatar}
            defaultDimensions={40}
            showDimensions={false}
            uploadMaxSize={240}
          />
        </Field>
        <label className={styles.checkLabel}>
          <input
            type="checkbox"
            checked={state.showDeliveredOnLast}
            onChange={e => set('showDeliveredOnLast', e.target.checked)}
          />
          Show "Delivered" under the last sent message
        </label>
      </Section>

      <Section title="Messages">
        <RepeatableList
          items={state.messages}
          getId={m => m.id}
          onReorder={messages => set('messages', messages)}
          onAdd={() => {
            // Default the new message's sender to alternate from the last
            // message, so building a back-and-forth feels less repetitive.
            const last = state.messages[state.messages.length - 1];
            const sender: MessageSender = last?.sender === 'me' ? 'them' : 'me';
            set('messages', [...state.messages, makeMessage(sender)]);
          }}
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
