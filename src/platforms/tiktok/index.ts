import type { PlatformAdapter } from '../types';

const PRIVACY: Record<string, string> = { public: 'PUBLIC_TO_EVERYONE', friends: 'MUTUAL_FOLLOW_FRIENDS', private: 'SELF_ONLY' };

/** TikTok via the Content Posting API (Direct Post, media pulled from your storage URLs). */
const tiktok: PlatformAdapter = {
  id: 'tiktok',
  name: 'TikTok',
  color: '#000000',
  glyph: { name: 'tiktok', brand: true },
  noun: 'Account',
  audience: 'followers',
  limits: { caption: 2200, media: 35 },
  requires: 'media',
  options: [
    {
      key: 'privacy',
      label: 'Who can watch',
      type: 'choice',
      default: 'public',
      choices: [
        { value: 'public', label: 'Everyone' },
        { value: 'friends', label: 'Friends' },
        { value: 'private', label: 'Only me' },
      ],
    },
    { key: 'comments', label: 'Allow comments', type: 'toggle', default: true },
    { key: 'duet', label: 'Allow Duet & Stitch', type: 'toggle', default: true },
  ],
  validate: ({ media }) =>
    media.some((m) => m.type === 'video') && media.length > 1
      ? [{ level: 'error', message: 'TikTok posts are a single video or a set of photos.' }]
      : [],
  // Video: POST /v2/post/publish/video/init/ · Photos: POST /v2/post/publish/content/init/
  toPayload({ caption, media, options }) {
    const video = media.find((m) => m.type === 'video');
    return {
      media_type: video ? 'VIDEO' : 'PHOTO',
      post_mode: 'DIRECT_POST',
      post_info: {
        title: caption,
        privacy_level: PRIVACY[String(options.privacy)] ?? PRIVACY.public,
        disable_comment: !options.comments,
        disable_duet: !options.duet,
        disable_stitch: !options.duet,
      },
      source_info: video
        ? { source: 'PULL_FROM_URL', video_url: video.uri }
        : { source: 'PULL_FROM_URL', photo_images: media.map((m) => m.uri), photo_cover_index: 0 },
    };
  },
  connection: {
    method: 'oauth2',
    scopes: ['user.info.basic', 'video.publish', 'video.upload'],
    serverEnv: ['TIKTOK_CLIENT_KEY', 'TIKTOK_CLIENT_SECRET'],
    docs: 'https://developers.tiktok.com/doc/content-posting-api-get-started',
  },
  demoErrors: ['Daily posting limit reached for this account.', 'Video must be between 3 seconds and 10 minutes.'],
};

export default tiktok;
