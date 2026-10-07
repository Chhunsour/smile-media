import type { MediaAsset, PlatformId, Post, PublishResult, SocialAccount, SocialPage, User } from '@/models';
import type { ResolvedContent } from '@/platforms/types';

/*
 * Provider interfaces. The app (store + screens) only talks to these, never to a vendor SDK.
 * config/providers.ts decides which implementation backs each one. To use Supabase, Firebase,
 * Appwrite, PocketBase or your own API, implement the interface and swap it in there.
 * See docs/provider-development.md.
 */

export interface AuthProvider {
  /** Restore the previous session. Resolve null when signed out. */
  getUser(): Promise<User | null>;
  signIn(email: string, password: string): Promise<User>;
  /** Create an account. Resolve null when the user must confirm their email first. */
  signUp(name: string, email: string, password: string): Promise<User | null>;
  /** Social sign-in. Resolve null if the user cancels. Leave out to hide the buttons. */
  signInWith?(provider: 'apple' | 'google'): Promise<User | null>;
  signOut(): Promise<void>;
}

export interface DatabaseProvider {
  listPosts(): Promise<Post[]>;
  /** Insert or update by id. */
  savePost(post: Post): Promise<void>;
  deletePost(id: string): Promise<void>;
}

export interface StorageProvider {
  /** Upload a local file (picker/camera URI) and return the asset with a public HTTPS `uri`. */
  upload(asset: MediaAsset): Promise<MediaAsset>;
  /** Optional shared media library for the media picker. */
  library?(): Promise<MediaAsset[]>;
}

export type Tone = 'friendly' | 'professional' | 'playful' | 'bold' | 'shorter';
export type Lang = 'es' | 'fr' | 'de' | 'pt';

export const TONES: { id: Tone; label: string }[] = [
  { id: 'friendly', label: 'Friendly' },
  { id: 'professional', label: 'Professional' },
  { id: 'playful', label: 'Playful' },
  { id: 'bold', label: 'Bold' },
  { id: 'shorter', label: 'Shorter' },
];

export const LANGS: { id: Lang; label: string }[] = [
  { id: 'es', label: 'Spanish' },
  { id: 'fr', label: 'French' },
  { id: 'de', label: 'German' },
  { id: 'pt', label: 'Portuguese' },
];

export interface AIProvider {
  /** Rewrite in a tone. `attempt` increments on "Try again" so you can vary the output. */
  improve(text: string, tone: Tone, attempt: number): Promise<string>;
  translate(text: string, lang: Lang): Promise<string>;
  hashtags(text: string): Promise<string[]>;
  /** Make text fit `limit` characters (used for X's 280). */
  shorten(text: string, limit: number): Promise<string>;
}

export type PublishRequest = {
  postId: string;
  page: SocialPage;
  /** Caption, media (public URLs after upload) and options for this platform. */
  content: ResolvedContent;
  /** Platform API body from the adapter's toPayload(); your backend adds credentials. */
  payload: Record<string, unknown>;
};

export interface PublishingProvider {
  /** Connected logins and the pages/profiles/channels under them. */
  listAccounts(): Promise<SocialAccount[]>;
  /** Run the platform's connect flow (OAuth or bot setup). Resolve null if the user cancels. */
  connect(platform: PlatformId): Promise<SocialAccount | null>;
  disconnect(accountId: string): Promise<void>;
  /**
   * Publish to one page. Resolve a PublishResult (status "failed" with an error for platform
   * rejections); throw only for transport problems. Call onProgress with 0–1 if you can.
   */
  publish(request: PublishRequest, onProgress?: (progress: number) => void): Promise<PublishResult>;
}

export interface SchedulingProvider {
  /** Ask your scheduler to publish this post at post.scheduledAt. */
  schedule(post: Post): Promise<void>;
  /** Drop a pending schedule (post deleted, rescheduled as draft, or published early). */
  cancel(postId: string): Promise<void>;
  /**
   * Client-side schedulers only: call `tick` whenever the app should publish due posts itself.
   * Server-side schedulers leave this out — the device never publishes scheduled posts in that case.
   */
  watch?(tick: () => void): () => void;
}

export type Services = {
  auth: AuthProvider;
  database: DatabaseProvider;
  storage: StorageProvider;
  ai: AIProvider;
  publishing: PublishingProvider;
  scheduling: SchedulingProvider;
};
