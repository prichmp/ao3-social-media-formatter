import type { LivestreamSegment } from './types';

export const livestreamDefaults: LivestreamSegment = {
    "streamer": {
      "avatar": {
        "src": "",
        "alt": ""
      },
      "name": "Example Streamer"
    },
    "title": "",
    "category": "",
    "viewerCount": "",
    "thumbnail": {
      "src": "",
      "alt": ""
    },
    "showLiveBadge": true,
    "chat": [
      {
        "id": "d76249e9-d710-46b4-8532-3fad09e715bd",
        "username": "IHaveThePower",
        "color": "#9147ff",
        "badges": [
          "mod"
        ],
        "content": "Ban for everyone"
      },
      {
        "id": "db8249d0-8a4d-404e-bab8-a381b86a3b1e",
        "username": "toocool4school",
        "color": "#20cb59",
        "badges": [
          "vip"
        ],
        "content": "I'm very cool"
      }
    ]
  };
