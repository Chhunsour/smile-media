/*
 * The data contract. These interfaces are the source of truth for every provider:
 * whatever backend you plug in (REST, Supabase, Firebase, Appwrite, PocketBase…) must
 * read and write these shapes. See docs/backend-integration.md for relationships and
 * a reference SQL schema.
 *
 * Platform credentials (OAuth access/refresh tokens, bot tokens, app secrets) are deliberately
 * absent: they belong to your backend and must never be sent to or stored in the app.
 */

export type PlatformId = 'facebook' | 'instagram' | 'tiktok' | 'youtube' | 'x' | 'telegram';

/** The signed-in person. Owned by your auth system. */
export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  /** Workspace/organization label shown in the UI. */
  workspace?: string;
  role?: string;
}

/**
 * One authorized platform login: a Facebook user, an Instagram/TikTok/X account, a Google account
 * for YouTube, or a Telegram bot. It owns one or more publishable pages.
 */
export interface SocialAccount {
  id: string;
  platform: PlatformId;
  /** Display name of the login ("Alex Rivera", "@acmestudio", "Acme Bot"). */
  name: string;
  avatar?: string;
  /** Publishable destinations under this login. A Facebook login typically owns several Pages. */
  pages: SocialPage[];
  connectedAt: string;
  /** "expired" means the backend can no longer refresh the token and the user must reconnect. */
  status?: 'active' | 'expired';
}

/**
 * A destination you can publish to: a Facebook Page, Instagram professional account, TikTok account,
 * YouTube channel, X account or Telegram channel.
 */
export interface SocialPage {
  id: string;
  /** Parent SocialAccount.id. */
  accountId: string;
  platform: PlatformId;
  /** The platform's own id (Page id, IG user id, channel id, chat id…). Used by your backend. */
  externalId?: string;
  name: string;
  handle: string;
  /** Avatar URL. */
  avatar: string;
  /** Followers or subscribers. */
  followers: number;
  kind: 'page' | 'profile' | 'channel';
}

export interface MediaAsset {
  id: string;
  /** Local file URI before upload, public HTTPS URL after the storage provider uploads it. */
  uri: string;
  type: 'image' | 'video';
  /** Poster frame for videos. */
  thumb?: string;
  /** Seconds, videos only. */
  duration?: number;
  mimeType?: string;
}

export type OptionValue = string | boolean;
export type PlatformOptions = Record<string, OptionValue>;

export type Metrics = { likes: number; comments: number; shares: number; reach: number };

/** Outcome of publishing one post to one page. */
export interface PublishResult {
  status: 'published' | 'failed';
  /** The platform's id for the created post/video/message. */
  remoteId?: string;
  url?: string;
  publishedAt?: string;
  error?: { message: string; code?: string; retryable?: boolean };
  metrics?: Metrics;
}

export type DestinationStatus = 'pending' | 'publishing' | 'published' | 'failed';

/**
 * A post × page pair. Page details are snapshotted so history survives a disconnect.
 */
export interface PostDestination {
  pageId: string;
  platform: PlatformId;
  name: string;
  handle: string;
  avatar: string;
  status: DestinationStatus;
  /** 0–1 while publishing. Client-only; backends may ignore it. */
  progress?: number;
  result?: PublishResult;
}

export type PostStatus = 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed';

export interface Post {
  id: string;
  caption: string;
  media: MediaAsset[];
  /** Per-platform caption overrides; missing = use `caption`. */
  captions: Partial<Record<PlatformId, string>>;
  /** Per-platform options (format, privacy, title…), keyed by each platform adapter's option keys. */
  options: Partial<Record<PlatformId, PlatformOptions>>;
  destinations: PostDestination[];
  status: PostStatus;
  scheduledAt?: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  /** Platform API body per destination (pageId → adapter toPayload()), so a server scheduler can publish. */
  payloads?: Record<string, Record<string, unknown>>;
}

/**
 * Backend-side job record for a scheduled post. The app only sets Post.scheduledAt and calls the
 * scheduling provider; your scheduler (cron, queue, edge function…) owns this record.
 */
export interface ScheduledPost {
  postId: string;
  runAt: string;
  status: 'queued' | 'running' | 'done' | 'failed' | 'cancelled';
  attempts: number;
  lastError?: string;
}
