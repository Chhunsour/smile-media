import type { PlatformAdapter } from '../types';

export const autoTitle = (caption: string) => caption.split('\n')[0].replace(/#\w+/g, '').trim().slice(0, 100);

/** YouTube channels via the Data API v3 (videos.insert, resumable upload). */
const youtube: PlatformAdapter = {
  id: 'youtube',
  name: 'YouTube',
  color: '#FF0000',
  glyph: { name: 'youtube', brand: true },
  noun: 'Channel',
  audience: 'subscribers',
  limits: { caption: 5000, media: 1 },
  requires: 'video',
  options: [
    { key: 'title', label: 'Title', type: 'text', placeholder: 'Video title', max: 100 },
    {
      key: 'visibility',
      label: 'Visibility',
      type: 'choice',
      default: 'public',
      choices: [
        { value: 'public', label: 'Public' },
        { value: 'unlisted', label: 'Unlisted' },
        { value: 'private', label: 'Private' },
      ],
    },
    { key: 'kids', label: 'Made for kids', type: 'toggle', default: false, hint: 'Required by YouTube for every upload.' },
  ],
  resolve: (c) => (String(c.options.title).trim() ? c : { ...c, options: { ...c.options, title: autoTitle(c.caption) } }),
  validate: ({ options }) =>
    String(options.title).length > 100 ? [{ level: 'error', message: 'Titles are limited to 100 characters.' }] : [],
  // POST https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status
  toPayload({ caption, media, options }) {
    return {
      snippet: { title: options.title, description: caption },
      status: { privacyStatus: options.visibility, selfDeclaredMadeForKids: !!options.kids },
      videoUrl: media.find((m) => m.type === 'video')?.uri,
    };
  },
  connection: {
    method: 'oauth2',
    scopes: ['https://www.googleapis.com/auth/youtube.upload', 'https://www.googleapis.com/auth/youtube.readonly'],
    serverEnv: ['YOUTUBE_CLIENT_ID', 'YOUTUBE_CLIENT_SECRET'],
    docs: 'https://developers.google.com/youtube/v3/guides/uploading_a_video',
  },
  demoErrors: ['Upload quota exceeded for today. Try again after midnight PT.', 'Processing failed — unsupported video codec.'],
};

export default youtube;
