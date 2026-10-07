import type { PlatformAdapter } from '../types';

const REPLIES: Record<string, string | undefined> = { everyone: undefined, following: 'following', mentioned: 'mentionedUsers' };

/** X (Twitter) via API v2: upload media, then POST /2/tweets with media_ids. */
const x: PlatformAdapter = {
  id: 'x',
  name: 'X',
  color: '#000000',
  glyph: { name: 'x-twitter', brand: true },
  noun: 'Account',
  audience: 'followers',
  limits: { caption: 280, media: 4 },
  options: [
    {
      key: 'replies',
      label: 'Who can reply',
      type: 'choice',
      default: 'everyone',
      choices: [
        { value: 'everyone', label: 'Everyone' },
        { value: 'following', label: 'Following' },
        { value: 'mentioned', label: 'Mentioned' },
      ],
    },
  ],
  toPayload({ caption, media, options }) {
    return { text: caption, mediaUrls: media.map((m) => m.uri), reply_settings: REPLIES[String(options.replies)] };
  },
  connection: {
    method: 'oauth2',
    scopes: ['tweet.read', 'tweet.write', 'users.read', 'media.write', 'offline.access'],
    serverEnv: ['X_CLIENT_ID', 'X_CLIENT_SECRET'],
    docs: 'https://docs.x.com/x-api/posts/creation-of-a-post',
  },
  demoErrors: ['Rate limit reached. Try again in 15 minutes.', 'This looks like a duplicate of a recent post.'],
};

export default x;
