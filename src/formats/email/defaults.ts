import type { EmailThread } from './types';

export const emailDefaults: EmailThread = {
  subject: 'Re: VMAs follow-up — please read before posting anything',
  label: 'Inbox',
  messages: [
    {
      id: crypto.randomUUID(),
      senderName: 'Mara Skye',
      senderEmail: 'mara@brightmoonpr.com',
      senderAvatar: { src: '', alt: '' },
      senderColor: '#1A73E8',
      recipients: 'me',
      timestamp: 'Mon, Sep 16, 9:02 AM',
      body:
        "Adora, please don't respond to anything from Catra's camp without running it past us first. We can issue a measured statement by EOD.\n\nMore importantly: how are you? I'm in town if you want to talk.",
    },
    {
      id: crypto.randomUUID(),
      senderName: 'Adora Grayskull',
      senderEmail: 'adora@adoragrayskull.com',
      senderAvatar: { src: '', alt: '' },
      senderColor: '#0F9D58',
      recipients: 'Mara Skye',
      timestamp: 'Mon, Sep 16, 11:47 AM',
      body:
        "I'm okay. I won't post anything. But Mara — we never dated. I don't know why she'd say that. Whatever statement you write, please don't deny we were friends.",
    },
  ],
};
