import type { TwitterPost } from './types';

const REPLY_ICON = { src: 'https://i.imgur.com/dJg9v1v.png', alt: 'reply' };
const RETWEET_ICON = { src: 'https://i.imgur.com/UeOnwXk.png', alt: 'retweet' };
const LIKE_ICON = { src: 'https://i.imgur.com/eM56CN2.png', alt: 'like' };
const DEFAULT_STATS = { reply: REPLY_ICON, retweet: RETWEET_ICON, like: LIKE_ICON };

export const twitterDefaults: TwitterPost = {
  author: {
    avatar: {
      src: 'https://64.media.tumblr.com/f35a9693923baa5c1633e7c8dd010fef/e32fa7d1e8eb4ba6-29/s400x600/c524a0bad44f2016c04ec3fd29b2d0f282465926.pnj',
      alt: 'Sabrina Carpenter profile picture',
      width: 50,
      height: 50,
    },
    name: 'CherryBonfire',
    handle: 'brightsidercherrybonfire',
  },
  content: 'Seriously I need to hear from Adora. Is she okay??',
  image: undefined,
  quote: {
    enabled: false,
    avatar: { src: '', alt: '', width: 50, height: 50 },
    name: '',
    handle: '',
    content: '',
  },
  time: '9:40 AM',
  relativeTime: '10 hours ago',
  stats: {
    showRow: true,
    labels: 'Retweets    Quote Tweets    Likes',
  },
  statIcons: DEFAULT_STATS,
  replies: [
    {
      id: crypto.randomUUID(),
      avatar: {
        src: 'https://64.media.tumblr.com/2cdf9b19e0ebd09d5d938a9545cbb685/d11cf25c9256eceb-4c/s500x750/6143ac0182a2e55f86af6bd7fc4ba238697fe3a8.pnj',
        alt: 'glimmer profile picture',
        width: 50,
        height: 50,
      },
      name: 'Replay Diamond now1!',
      handle: 'd1am0nddancefloor',
      relativeTime: '10 hours ago',
      replyingTo: 'brightsidercherrybonfire',
      content: "That was the most disrespectful thing I've ever seen happen at an awards show, I don't blame her for not wanting to make things any more public",
      showStats: true,
    },
    {
      id: crypto.randomUUID(),
      avatar: {
        src: 'https://64.media.tumblr.com/4c30be2a8ab8a6439ac689ed097c1b71/c6a2e94da7cadf16-cb/s400x600/74270a8ca1adb15d85e365920d3bbf9ed931db2c.jpg',
        alt: 'madison beer profile picture',
        width: 50,
        height: 50,
      },
      name: 'Avery',
      handle: 'shegotherwayaway',
      relativeTime: '10 hours ago',
      replyingTo: 'brightsidercherrybonfire',
      content: "I can't believe the VMAs allowed that performance. We should be demanding answers from them, not her",
      showStats: true,
    },
    {
      id: crypto.randomUUID(),
      avatar: {
        src: 'https://64.media.tumblr.com/e215bcd4ea0e5d9afaa06ceec5db4270/4b49c4fdb40dfee8-42/s540x810/f8decf443ddba78b8a15c080a6b6eccff532f4cb.jpg',
        alt: 'Chappell Roan profile picture',
        width: 50,
        height: 50,
      },
      name: 'studying stantwt like a bug',
      handle: 'getmeoutttahere',
      relativeTime: '10 hours ago',
      replyingTo: 'brightsidercherrybonfire',
      content: "girl, her ex called her shitty. this is breaking news to no one who has ever been through a relationship, she'll be fine",
      showStats: true,
    },
  ],
};
