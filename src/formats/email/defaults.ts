import type { EmailThread } from './types';

export const emailDefaults: EmailThread = {
    "subject": "Test Subject",
    "label": "Inbox",
    "messages": [
      {
        "id": "d13945c0-a9b3-4e6e-a045-8fe024980120",
        "senderName": "Person 1",
        "senderEmail": "test@example.com",
        "senderAvatar": {
          "src": "",
          "alt": ""
        },
        "senderColor": "#1A73E8",
        "recipients": "me",
        "timestamp": "",
        "body": "What?"
      },
      {
        "id": "a089974c-d94e-4486-a66c-2c123bfbd8d3",
        "senderName": "Me",
        "senderEmail": "me@example.com",
        "senderAvatar": {
          "src": "",
          "alt": ""
        },
        "senderColor": "#21d115",
        "recipients": "Person 1",
        "timestamp": "",
        "body": "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin eu commodo nibh, in consequat purus. Fusce eu erat neque. Sed feugiat lectus auctor velit ornare, quis cursus risus suscipit. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Fusce et semper augue. Etiam euismod nulla eget vehicula mattis. In hac habitasse platea dictumst. Nam ultrices velit ut fermentum accumsan. Aenean ut ligula quis ante blandit sodales."
      }
    ]
  };
