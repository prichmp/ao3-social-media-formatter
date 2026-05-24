import type { IMessageChain } from './types';

export const imessageDefaults: IMessageChain = {
  contactName: 'Adora',
  contactAvatar: { src: '', alt: '' },
  messages: [
    {
      id: crypto.randomUUID(),
      sender: 'me',
      content: 'are you okay?',
      timestamp: 'Today 10:14 PM',
    },
    {
      id: crypto.randomUUID(),
      sender: 'me',
      content: "i saw what catra said. please don't read the comments tonight",
      timestamp: '',
    },
    {
      id: crypto.randomUUID(),
      sender: 'them',
      content: "i'm fine",
      timestamp: '',
    },
    {
      id: crypto.randomUUID(),
      sender: 'them',
      content: 'thanks for checking in',
      timestamp: '',
    },
    {
      id: crypto.randomUUID(),
      sender: 'me',
      content: 'always 💛',
      timestamp: '',
    },
  ],
  showDeliveredOnLast: true,
};
