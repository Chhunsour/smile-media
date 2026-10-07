import type { PlatformAdapter } from '../types';

/** Instagram professional accounts via the Instagram Content Publishing API (container → publish). */
const instagram: PlatformAdapter = {
  id: 'instagram',
  name: 'Instagram',
  color: '#E1306C',
  glyph: { name: 'instagram', brand: true },
  noun: 'Profile',
  audience: 'followers',
  limits: { caption: 2200, media: 10 },
  requires: 'media',
  options: [
    {
      key: 'format',
      label: 'Post as',
      type: 'choice',
      default: 'feed',
      choices: [
        { value: 'feed', label: 'Feed' },
        { value: 'reel', label: 'Reel' },
        { value: 'story', label: 'Story' },
      ],
    },
    { key: 'firstComment', label: 'First comment', type: 'text', placeholder: 'Add hashtags or a link…', max: 2200 },
  ],
  validate: ({ caption }) =>
    (caption.match(/#\w+/g)?.length ?? 0) > 30 ? [{ level: 'error', message: 'Instagram allows up to 30 hashtags.' }] : [],
  // POST /{ig-user-id}/media per item (children for CAROUSEL), then POST /{ig-user-id}/media_publish.
  toPayload({ caption, media, options }, page) {
    const single = media.length === 1;
    const mediaType =
      options.format === 'story'
        ? 'STORIES'
        : options.format === 'reel' || (single && media[0].type === 'video')
          ? 'REELS'
          : single
            ? 'IMAGE'
            : 'CAROUSEL';
    return {
      igUserId: page.externalId ?? page.id,
      mediaType,
      caption: mediaType === 'STORIES' ? undefined : caption,
      items: media.map((m) => (m.type === 'video' ? { video_url: m.uri } : { image_url: m.uri })),
      firstComment: options.firstComment || undefined,
    };
  },
  connection: {
    method: 'oauth2',
    scopes: ['instagram_business_basic', 'instagram_business_content_publish'],
    serverEnv: ['META_APP_ID', 'META_APP_SECRET'],
    docs: 'https://developers.facebook.com/docs/instagram-platform/content-publishing',
  },
  demoErrors: ['Aspect ratio not supported. Use an image between 4:5 and 1.91:1.', 'Media upload timed out. Instagram didn’t respond in time.'],
};

export default instagram;
