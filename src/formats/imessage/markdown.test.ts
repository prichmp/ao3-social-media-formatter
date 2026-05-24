import { describe, it, expect } from 'vitest';
import { chainToMarkdown } from './markdown';
import { imessageDefaults } from './defaults';
import type { IMessageChain, MessageContent } from './types';

const text = (s: string): MessageContent => ({ type: 'text', text: s });

describe('chainToMarkdown', () => {
  it('opens with a "Conversation with NAME" line', () => {
    expect(chainToMarkdown(imessageDefaults).split('\n')[0])
      .toBe(`Conversation with ${imessageDefaults.contactName}`);
  });

  it('prefixes "me" messages with Me and "them" messages with the contact name', () => {
    const chain: IMessageChain = {
      ...imessageDefaults,
      messages: [
        { id: '1', sender: 'me',   content: text('hello'), timestamp: '' },
        { id: '2', sender: 'them', content: text('hi'),    timestamp: '' },
      ],
    };
    const md = chainToMarkdown(chain);
    expect(md).toContain('Me: hello');
    expect(md).toContain(`${chain.contactName}: hi`);
  });

  it('inserts a timestamp line when a message has one', () => {
    const chain: IMessageChain = {
      ...imessageDefaults,
      messages: [{ id: '1', sender: 'me', content: text('hello'), timestamp: 'Today 10:32 AM' }],
    };
    expect(chainToMarkdown(chain)).toContain('Today 10:32 AM');
  });

  it('appends a Delivered marker when the flag is set and any "me" message exists', () => {
    expect(chainToMarkdown(imessageDefaults)).toMatch(/Delivered$/);
  });

  it('omits Delivered when the flag is off', () => {
    const chain: IMessageChain = { ...imessageDefaults, showDeliveredOnLast: false };
    expect(chainToMarkdown(chain)).not.toContain('Delivered');
  });

  it('omits Delivered when there are no "me" messages even if the flag is on', () => {
    const chain: IMessageChain = {
      ...imessageDefaults,
      messages: imessageDefaults.messages.filter(m => m.sender !== 'me'),
      showDeliveredOnLast: true,
    };
    expect(chainToMarkdown(chain)).not.toContain('Delivered');
  });

  it('renders an image message with its alt text in brackets', () => {
    const chain: IMessageChain = {
      ...imessageDefaults,
      messages: [{
        id: '1', sender: 'me',
        content: { type: 'image', image: { src: 'x', alt: 'a sunset' } },
        timestamp: '',
      }],
    };
    expect(chainToMarkdown(chain)).toContain('Me: [Image: a sunset]');
  });

  it('renders a video message with its duration in brackets', () => {
    const chain: IMessageChain = {
      ...imessageDefaults,
      messages: [{
        id: '1', sender: 'them',
        content: { type: 'video', thumbnail: { src: 'x', alt: '' }, duration: '0:42' },
        timestamp: '',
      }],
    };
    expect(chainToMarkdown(chain)).toContain(`${imessageDefaults.contactName}: [Video (0:42)]`);
  });
});
