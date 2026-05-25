import type { TwitterPost } from './types';

const REPLY_ICON = { src: 'https://i.imgur.com/dJg9v1v.png', alt: 'reply' };
const RETWEET_ICON = { src: 'https://i.imgur.com/UeOnwXk.png', alt: 'retweet' };
const LIKE_ICON = { src: 'https://i.imgur.com/eM56CN2.png', alt: 'like' };
const DEFAULT_STATS = { reply: REPLY_ICON, retweet: RETWEET_ICON, like: LIKE_ICON };

export const twitterDefaults: TwitterPost = {
    "author": {
      "avatar": {
        "src": "https://i.imgur.com/A8D9j6D.png",
        "alt": "L-Corp Logo",
        "width": 50,
        "height": 50
      },
      "name": "L-Corp Official",
      "handle": "lcorp",
      "verified": true
    },
    "content": "This Pride Month, L-Corp reaffirms our commitment to be inclusive of LGBT+ individuals. Everyone is due to be treated with respect - no matter the gender or sexual orientation.",
    "attachment": {
      "type": "text"
    },
    "time": "9:40 AM",
    "relativeTime": "3 min ago",
    "stats": {
      "showRow": true,
      "labels": "Retweets    Quote Tweets    Likes"
    },
    "statIcons": DEFAULT_STATS,
    "replies": []
};
