import type { PlatformAdapter } from '../types';

/** Facebook Pages via the Graph API. One Facebook login can manage many Pages; each Page is a SocialPage. */
const facebook: PlatformAdapter = {
  id: 'facebook',
  name: 'Facebook',
  color: '#0866FF',
  glyph: { name: 'facebook-f', brand: true },
  noun: 'Page',
  audience: 'followers',
  limits: { caption: 63206, media: 10 },
  options: [
    {
      key: 'format',
      label: 'Post as',
      type: 'choice',
      default: 'post',
      choices: [
        { value: 'post', label: 'Post' },
        { value: 'reel', label: 'Reel' },
        { value: 'story', label: 'Story' },
      ],
    },
  ],
  // kind → endpoint: text /{page}/feed · photo /{page}/photos · album: unpublished /photos + /feed attached_media
  // video /{page}/videos · reel /{page}/video_reels · story /{page}/photo_stories or /video_stories
  toPayload({ caption, media, options }, page) {
    const video = media.some((m) => m.type === 'video');
    const kind =
      options.format === 'reel'
        ? 'reel'
        : options.format === 'story'
          ? 'story'
          : video
            ? 'video'
            : media.length > 1
              ? 'album'
              : media.length
                ? 'photo'
                : 'text';
    return { pageId: page.externalId ?? page.id, kind, message: caption, media: media.map((m) => ({ url: m.uri, type: m.type })) };
  },
  connection: {
    method: 'oauth2',
    scopes: ['pages_show_list', 'pages_manage_posts', 'pages_read_engagement'],
    serverEnv: ['META_APP_ID', 'META_APP_SECRET'],
    docs: 'https://developers.facebook.com/docs/pages-api/posts',
  },
  demoErrors: ['The Page access token has expired. Reconnect Facebook to keep posting.', 'Video processing failed. Try a shorter or smaller file.'],
};

export default facebook;
