import type { TumblrPost } from './types';

export const tumblrDefaults: TumblrPost = {
  entries: [
    {
      id: crypto.randomUUID(),
      username: 'standom-investigations',
      avatar: { src: '', alt: '' },
      content:
        'okay i have spent the last six hours in the catra/adora yearbook PDF and i need to share',
      image: { src: '', alt: '' },
      tags: ['adora discourse', 'catra discourse', 'vmas 2024', 'long post', 'i have receipts'],
    },
    {
      id: crypto.randomUUID(),
      username: 'sword-lesbian-prime',
      avatar: { src: '', alt: '' },
      content:
        'op cooked. the part about the matching senior quotes is sending me. they were SO close how do you go from that to "we never dated"',
      image: { src: '', alt: '' },
      tags: ['adoracatra', 'putting them in my little jar'],
    },
    {
      id: crypto.randomUUID(),
      username: 'cherrybonfire-official',
      avatar: { src: '', alt: '' },
      content: '',
      image: { src: '', alt: '' },
      tags: [],
    },
    {
      id: crypto.randomUUID(),
      username: 'glimmerglow',
      avatar: { src: '', alt: '' },
      content:
        '@cherrybonfire-official the SILENT REBLOG. she knows something. she knows something.',
      image: { src: '', alt: '' },
      tags: ['breaking news'],
    },
  ],
  notes: '47,283 notes',
  timestamp: '2 days ago',
};
