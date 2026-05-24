// Render an EmailThread as Markdown for the AO3 <img alt="..."> fallback.

import type { EmailMessage, EmailThread } from './types';

export function threadToMarkdown(thread: EmailThread): string {
  const lines: string[] = [];
  const subject = thread.subject.trim();
  const label = thread.label.trim();

  if (subject || label) {
    const labelPart = label ? ` [${label}]` : '';
    lines.push(`${subject}${labelPart}`.trim() || labelPart.trim());
  }

  thread.messages.forEach((msg, i) => {
    if (i > 0 || subject || label) lines.push('', '---', '');
    lines.push(...messageHeader(msg));
    if (msg.body.trim()) {
      lines.push('');
      lines.push(msg.body.trim());
    }
  });

  return lines.join('\n').trim();
}

function messageHeader(msg: EmailMessage): string[] {
  const out: string[] = [];
  const name = msg.senderName.trim();
  const email = msg.senderEmail.trim();
  const recipients = msg.recipients.trim();
  const timestamp = msg.timestamp.trim();

  if (name || email) {
    const emailPart = email ? ` <${email}>` : '';
    out.push(`${name || email}${name ? emailPart : ''}`);
  }
  if (recipients) out.push(`to ${recipients}`);
  if (timestamp)  out.push(timestamp);
  return out;
}
