import type { IMessageChain } from './types';

export const imessageDefaults: IMessageChain = {
  contactName: 'Adora',
  contactAvatar: { src: '', alt: '' },
  messages: [
    {
      id: crypto.randomUUID(),
      sender: 'me',
      content: { type: 'text', text: 'are you okay?' },
      timestamp: 'Today 10:14 PM',
    },
    {
      id: crypto.randomUUID(),
      sender: 'me',
      content: { type: 'text', text: "i saw what catra said. please don't read the comments tonight" },
      timestamp: '',
    },
    {
      id: crypto.randomUUID(),
      sender: 'them',
      content: { type: 'text', text: "i'm fine" },
      timestamp: '',
    },
    {
      id: crypto.randomUUID(),
      sender: 'them',
      content: { type: 'text', text: 'thanks for checking in' },
      timestamp: '',
    },
    {
      id: crypto.randomUUID(),
      sender: 'me',
      content: { type: 'text', text: 'always 💛' },
      timestamp: '',
    },
  ],
  showDeliveredOnLast: true,
};
