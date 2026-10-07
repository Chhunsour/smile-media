import type { DestinationStatus as TargetStatus, MediaAsset as Media, Metrics, Post, PostDestination as Target, SocialAccount as Connection, SocialPage as Account } from '@/models';

// Mock data. Everything is generated relative to first launch, then persisted.

const photo = (id: string, w = 1080) => `https://images.unsplash.com/photo-${id}?w=${w}&q=80&auto=format&fit=crop`;
const square = (id: string) => `${photo(id, 200)}&h=200`;

const IMG = {
  clapper: '1485846234645-a62644f84728',
  aisle: '1489599849927-2ee91cede3ba',
  neonCinema: '1536440136628-849c177e76a1',
  projector: '1478720568477-152d9b164e26',
  reels: '1440404653325-ab127d49abc1',
  audience: '1517604931442-7e0c8ed2963c',
  darkSeats: '1524712245354-2c4e5e7121c0',
  slate: '1594909122845-11baa439b7bf',
  popClapper: '1598899134739-24c46f58b8c0',
  photographer: '1492691527719-9d1e07e534b4',
  lens: '1502982720700-bfff97f2ecac',
  podcastMic: '1590602847861-f357a9332bbc',
  studioMic: '1478737270239-2f02b77fc618',
  performer: '1493225457124-a3eb161ffa5f',
  stage: '1470229722913-7c0e2dbbafd3',
  crowd: '1501386761578-eac5c94b800a',
  confetti: '1514525253161-7a46d19cd819',
  editing: '1574717024653-61fd2cf4d44d',
  popcorn: '1505686994434-e3cc5abf1330',
  popcornBoxes: '1585647347483-22b66260dfff',
  podcaster: '1581368135153-a506cf13b1e1',
  musicStudio: '1598488035139-bdbb2231ce04',
  vintageMic: '1511671782779-c97d3d27a1d4',
  singer: '1460723237483-7a6dc9d0b212',
  filmReels: '1542204165-65bf26472b9b',
  redSeats: '1574267432553-4b4628081c31',
  filmStrip: '1543536448-1e76fc2795bf',
  stageMic: '1516280440614-37939bbacd81',
  handsCamera: '1520390138845-fd2d229dd553',
  glow: '1563089145-599997674d42',
  band: '1526478806334-5fd488fcaabc',
  portrait: '1494790108377-be9c29b29330',
};
type Img = keyof typeof IMG;

export const DEMO_USER = {
  id: 'demo-user',
  name: 'Alex Rivera',
  role: 'Social lead',
  email: 'alex@example.com',
  avatar: square(IMG.portrait),
  workspace: 'Acme Studio',
};

const acc = (
  id: string,
  platform: Account['platform'],
  name: string,
  handle: string,
  img: Img,
  followers: number,
  kind: Account['kind'],
): Account => ({ id, accountId: `c_${platform}`, platform, name, handle, avatar: square(IMG[img]), followers, kind });

const connectedAt = new Date(Date.now() - 120 * 864e5).toISOString();

export const DEMO_ACCOUNTS: Connection[] = [
  {
    id: 'c_facebook',
    platform: 'facebook',
    name: 'Alex Rivera',
    avatar: DEMO_USER.avatar,
    connectedAt,
    pages: [
      acc('fb_acme', 'facebook', 'Acme Studio', 'acmestudio', 'glow', 248000, 'page'),
      acc('fb_films', 'facebook', 'Acme Films', 'acmefilms', 'clapper', 61200, 'page'),
      acc('fb_music', 'facebook', 'Acme Music', 'acmemusic', 'vintageMic', 39500, 'page'),
      acc('fb_careers', 'facebook', 'Acme Careers', 'acmecareers', 'editing', 4300, 'page'),
    ],
  },
  {
    id: 'c_instagram',
    platform: 'instagram',
    name: '@acmestudio',
    connectedAt,
    pages: [acc('ig_acme', 'instagram', 'Acme Studio', 'acmestudio', 'glow', 412000, 'profile')],
  },
  {
    id: 'c_tiktok',
    platform: 'tiktok',
    name: '@acmestudio',
    connectedAt,
    pages: [acc('tt_acme', 'tiktok', 'Acme Studio', 'acmestudio', 'glow', 1240000, 'profile')],
  },
  {
    id: 'c_youtube',
    platform: 'youtube',
    name: 'Acme Studio',
    connectedAt,
    pages: [acc('yt_acme', 'youtube', 'Acme Studio', 'acmestudio', 'glow', 868000, 'channel')],
  },
  {
    id: 'c_x',
    platform: 'x',
    name: '@acmestudio',
    connectedAt,
    pages: [acc('x_acme', 'x', 'Acme Studio', 'acmestudio', 'glow', 96400, 'profile')],
  },
  {
    id: 'c_telegram',
    platform: 'telegram',
    name: 'Acme Bot',
    connectedAt,
    pages: [
      acc('tg_news', 'telegram', 'Acme News', 'acmenews', 'projector', 22100, 'channel'),
      acc('tg_premieres', 'telegram', 'Acme Premieres', 'acmepremieres', 'aisle', 8400, 'channel'),
    ],
  },
];

const pic = (key: Img): Media => ({ id: `lib_${key}`, uri: photo(IMG[key]), type: 'image' });
const vid = (key: Img, duration: number): Media => ({
  id: `vid_${key}`,
  uri: photo(IMG[key]),
  thumb: photo(IMG[key], 600),
  type: 'video',
  duration,
});

/** Shared brand assets shown in the media picker (stand-in for a real media library). */
export const LIBRARY: Media[] = [
  vid('stage', 42),
  pic('clapper'),
  pic('neonCinema'),
  vid('performer', 95),
  pic('reels'),
  pic('popClapper'),
  pic('lens'),
  vid('editing', 18),
  pic('podcastMic'),
  pic('confetti'),
  pic('filmStrip'),
  pic('crowd'),
  pic('photographer'),
  pic('vintageMic'),
  pic('popcornBoxes'),
  pic('darkSeats'),
  pic('band'),
  pic('filmReels'),
];

const accounts = DEMO_ACCOUNTS.flatMap((c) => c.pages);

function target(accountId: string, status: TargetStatus = 'pending', extra: Partial<Target> = {}): Target {
  const a = accounts.find((x) => x.id === accountId)!;
  return { pageId: accountId, platform: a.platform, name: a.name, handle: a.handle, avatar: a.avatar, status, ...extra };
}

function metricsFor(accountId: string, scale: number): Metrics {
  const reach = Math.round(accounts.find((a) => a.id === accountId)!.followers * 0.32 * scale);
  const likes = Math.round(reach * 0.061);
  return { reach, likes, comments: Math.round(likes * 0.08), shares: Math.round(likes * 0.05) };
}

const live = (accountId: string, publishedAt: string, scale = 1) =>
  target(accountId, 'published', {
    result: {
      status: 'published',
      publishedAt,
      url: `https://example.com/${accountId}/${publishedAt.slice(0, 10)}`,
      metrics: metricsFor(accountId, scale),
    },
  });

const at = (days: number, h: number, m = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};
const inHours = (h: number) => {
  const d = new Date(Date.now() + h * 36e5);
  d.setMinutes(d.getMinutes() < 30 ? 30 : 60, 0, 0);
  return d.toISOString();
};
const hoursAgo = (h: number) => new Date(Date.now() - h * 36e5).toISOString();

const post = (p: Partial<Post> & Pick<Post, 'id' | 'caption' | 'status' | 'destinations'>): Post => {
  const ts = p.updatedAt ?? p.publishedAt ?? hoursAgo(30);
  return { media: [], captions: {}, options: {}, createdAt: ts, updatedAt: ts, ...p };
};

export function seedPosts(): Post[] {
  const premiere = at(-2, 22);
  const reel = at(-1, 17, 45);
  const casting = at(-1, 9, 15);
  const soundtrack = at(-5, 16);
  const hiring = at(-9, 10);

  return [
    post({
      id: 'p_trailer',
      status: 'scheduled',
      scheduledAt: inHours(3),
      caption:
        'Official trailer: Golden Hour 🎬 Our first feature film lands in cinemas November 14. Watch the full trailer now — and tell us your favorite shot.',
      media: [vid('projector', 144)],
      options: { youtube: { title: 'Golden Hour — Official Trailer' }, instagram: { format: 'reel' } },
      destinations: ['yt_acme', 'ig_acme', 'fb_acme', 'fb_films', 'x_acme', 'tg_news'].map((id) => target(id)),
    }),
    post({
      id: 'p_live',
      status: 'scheduled',
      scheduledAt: at(1, 20),
      caption: 'We’re going live from the studio tomorrow at 8 PM with the Golden Hour cast. Drop your questions below 👇',
      media: [pic('podcaster')],
      destinations: ['ig_acme', 'fb_acme', 'x_acme', 'tg_news'].map((id) => target(id)),
    }),
    post({
      id: 'p_bts',
      status: 'scheduled',
      scheduledAt: at(3, 18, 30),
      caption: 'Behind the scenes: 14 nights, 3 cameras and one impossible sunset. Swipe for stills from the Golden Hour set.',
      media: [pic('clapper'), pic('handsCamera'), pic('lens')],
      destinations: ['ig_acme', 'fb_films', 'x_acme'].map((id) => target(id)),
    }),
    post({
      id: 'p_podcast',
      status: 'scheduled',
      scheduledAt: at(6, 10),
      caption:
        'New on The Final Cut podcast: how we scored Golden Hour with a 40-piece orchestra, recorded live in a single take. Full episode out now on every platform.',
      captions: { x: 'New Final Cut episode: scoring Golden Hour with a 40-piece orchestra, live in one take 🎻' },
      media: [pic('studioMic'), pic('musicStudio')],
      destinations: ['fb_music', 'ig_acme', 'x_acme', 'tg_news', 'tg_premieres'].map((id) => target(id)),
    }),
    post({
      id: 'p_reel',
      status: 'published',
      publishedAt: reel,
      caption: '60 seconds of pure on-set chaos 🎥 Which take was your favorite — 1, 2 or 3?',
      media: [vid('slate', 58)],
      options: { instagram: { format: 'reel' }, youtube: { title: 'On set: 60 seconds of chaos' } },
      destinations: [live('tt_acme', reel, 1.9), live('ig_acme', reel, 1.2), live('yt_acme', reel, 0.8)],
    }),
    post({
      id: 'p_casting',
      status: 'failed',
      publishedAt: casting,
      caption:
        'Open casting call 🎭 We’re looking for fresh faces for our next original series. Auditions in LA and London this month — link in bio.',
      media: [pic('popClapper')],
      destinations: [
        live('fb_acme', casting, 0.6),
        target('ig_acme', 'failed', { result: { status: 'failed', error: { message: 'Aspect ratio not supported. Use an image between 4:5 and 1.91:1.' } } }),
        live('x_acme', casting, 0.7),
        live('tg_news', casting, 0.9),
      ],
    }),
    post({
      id: 'p_premiere',
      status: 'published',
      publishedAt: premiere,
      caption:
        'Premiere night ✨ Thank you to everyone who packed the house for the first Golden Hour screening. This is just the beginning.',
      media: [pic('audience'), pic('redSeats'), pic('stage')],
      destinations: [
        live('fb_acme', premiere, 1.4),
        live('fb_films', premiere, 1.1),
        live('ig_acme', premiere, 1.6),
        live('x_acme', premiere, 0.9),
      ],
    }),
    post({
      id: 'p_soundtrack',
      status: 'published',
      publishedAt: soundtrack,
      caption: 'The Golden Hour original soundtrack is out now on every streaming platform 🎧 Press play and let it run.',
      media: [vid('musicStudio', 192)],
      options: { youtube: { title: 'Golden Hour (Original Soundtrack) — Full Album' } },
      destinations: [
        live('yt_acme', soundtrack, 1.3),
        live('fb_music', soundtrack),
        live('ig_acme', soundtrack, 0.8),
        live('x_acme', soundtrack),
      ],
    }),
    post({
      id: 'p_hiring',
      status: 'published',
      publishedAt: hiring,
      caption: 'We’re hiring a Senior Video Editor (remote, EU or US hours). Help us cut trailers that stop the scroll.',
      media: [pic('editing')],
      destinations: [live('fb_careers', hiring, 1.5), live('fb_acme', hiring), live('x_acme', hiring), live('tg_news', hiring)],
    }),
    post({
      id: 'd_poll',
      status: 'draft',
      updatedAt: hoursAgo(2),
      caption: 'Which genre should our next short film be? Thriller, rom-com or sci-fi? Vote below 🍿',
      destinations: ['x_acme', 'tg_news', 'fb_acme'].map((id) => target(id)),
    }),
    post({
      id: 'd_movienight',
      status: 'draft',
      updatedAt: hoursAgo(26),
      caption: 'Friday movie night essentials.',
      media: [pic('popcorn')],
      destinations: [],
    }),
  ];
}
