import type { LivestreamSegment } from './types';

export const livestreamDefaults: LivestreamSegment = {
  streamer: {
    avatar: { src: '', alt: '' },
    name: 'AdoraIRL',
  },
  title: 'first time playing hades ii blind (no spoilers!!)',
  category: 'Hades II',
  viewerCount: '3.2K',
  thumbnail: { src: '', alt: '' },
  showLiveBadge: true,
  chat: [
    {
      id: crypto.randomUUID(),
      username: 'best_friend_squad',
      color: '#1E90FF',
      badges: ['mod', 'subscriber'],
      content: 'GO MELINOË GO',
    },
    {
      id: crypto.randomUUID(),
      username: 'sword_lesbian',
      color: '#FF7F50',
      badges: ['subscriber'],
      content: 'wait you ACTUALLY havent played the first one???',
    },
    {
      id: crypto.randomUUID(),
      username: 'catra_apologist',
      color: '#9147FF',
      badges: ['vip'],
      content: 'this is rigged',
    },
    {
      id: crypto.randomUUID(),
      username: 'AdoraIRL',
      color: '#FF4500',
      badges: ['broadcaster'],
      content: 'it is NOT rigged. ok maybe a little',
    },
    {
      id: crypto.randomUUID(),
      username: 'arrows_for_days',
      color: '#00C16E',
      badges: ['subscriber'],
      content: 'pog',
    },
    {
      id: crypto.randomUUID(),
      username: 'glimmerglow',
      color: '#FF69B4',
      badges: [],
      content: 'first time caller long time listener — die already so we can move on',
    },
  ],
};
