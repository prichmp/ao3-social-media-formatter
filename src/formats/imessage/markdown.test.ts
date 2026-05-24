import { describe, it, expect } from 'vitest';
import { chainToMarkdown } from './markdown';
import { imessageDefaults } from './defaults';
import type { IMessageChain } from './types';

describe('chainToMarkdown', () => {
  it('opens with a "Conversation with NAME" line', () => {
    expect(chainToMarkdown(imessageDefaults).split('\n')[0])
      .toBe(`Conversation with ${imessageDefaults.contactName}`);
  });

  it('prefixes "me" messages with Me and "them" messages with the contact name', () => {
    const chain: IMessageChain = {
      ...imessageDefaults,
      messages: [
        { id: '1', sender: 'me',   content: 'hello', timestamp: '' },
        { id: '2', sender: 'them', content: 'hi',    timestamp: '' },
      ],
    };
    const md = chainToMarkdown(chain);
    expect(md).toContain('Me: hello');
    expect(md).toContain(`${chain.contactName}: hi`);
  });

  it('inserts italic timestamp lines when a message has one', () => {
    const chain: IMessageChain = {
      ...imessageDefaults,
      messages: [{ id: '1', sender: 'me', content: 'hello', timestamp: 'Today 10:32 AM' }],
    };
    expect(chainToMarkdown(chain)).toContain('_Today 10:32 AM_');
  });

  it('appends a Delivered marker when the flag is set and any "me" message exists', () => {
    expect(chainToMarkdown(imessageDefaults)).toMatch(/_Delivered_$/);
  });

  it('omits Delivered when the flag is off', () => {
    const chain: IMessageChain = { ...imessageDefaults, showDeliveredOnLast: false };
    expect(chainToMarkdown(chain)).not.toContain('_Delivered_');
  });

  it('omits Delivered when there are no "me" messages even if the flag is on', () => {
    const chain: IMessageChain = {
      ...imessageDefaults,
      messages: imessageDefaults.messages.filter(m => m.sender !== 'me'),
      showDeliveredOnLast: true,
    };
    expect(chainToMarkdown(chain)).not.toContain('_Delivered_');
  });
});
