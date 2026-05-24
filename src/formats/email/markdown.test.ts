import { describe, it, expect } from 'vitest';
import { threadToMarkdown } from './markdown';
import { emailDefaults } from './defaults';
import type { EmailThread } from './types';

describe('threadToMarkdown', () => {
  it('opens with the subject and label', () => {
    const md = threadToMarkdown(emailDefaults);
    expect(md.split('\n')[0]).toContain(emailDefaults.subject);
    expect(md.split('\n')[0]).toContain(`[${emailDefaults.label}]`);
  });

  it('includes a bold sender for each message', () => {
    const md = threadToMarkdown(emailDefaults);
    for (const msg of emailDefaults.messages) {
      expect(md).toContain(`**${msg.senderName}**`);
    }
  });

  it('renders the recipient line for each message', () => {
    const md = threadToMarkdown(emailDefaults);
    for (const msg of emailDefaults.messages) {
      expect(md).toContain(`to ${msg.recipients}`);
    }
  });

  it('renders an italic timestamp for each message', () => {
    const md = threadToMarkdown(emailDefaults);
    for (const msg of emailDefaults.messages) {
      expect(md).toContain(`_${msg.timestamp}_`);
    }
  });

  it('separates messages with a horizontal rule', () => {
    const md = threadToMarkdown(emailDefaults);
    const rules = (md.match(/^---$/gm) ?? []).length;
    // One rule between subject and first message + one between each pair.
    expect(rules).toBe(emailDefaults.messages.length);
  });

  it('renders the body verbatim under each header', () => {
    const md = threadToMarkdown(emailDefaults);
    for (const msg of emailDefaults.messages) {
      expect(md).toContain(msg.body.trim());
    }
  });

  it('handles an empty messages list without producing junk', () => {
    const md = threadToMarkdown({ ...emailDefaults, messages: [] });
    expect(md).toContain(emailDefaults.subject);
  });

  it('omits the subject line when both subject and label are empty', () => {
    // The first line should be the first message's sender header rather
    // than the original subject text.
    const thread: EmailThread = { ...emailDefaults, subject: '', label: '' };
    const md = threadToMarkdown(thread);
    expect(md).not.toContain(emailDefaults.subject);
    expect(md.split('\n')[0]).toContain(emailDefaults.messages[0].senderName);
  });
});
