import type { MediaAsset, PlatformId, PlatformOptions, SocialPage } from '@/models';

export type Option =
  | { key: string; label: string; type: 'choice'; default: string; choices: { value: string; label: string }[] }
  | { key: string; label: string; type: 'toggle'; default: boolean; hint?: string }
  | { key: string; label: string; type: 'text'; placeholder: string; max: number };

/** Caption, media and options for one platform after per-platform overrides and defaults. */
export type ResolvedContent = { caption: string; media: MediaAsset[]; options: PlatformOptions };

export type Issue = { level: 'error' | 'warning'; message: string; fix?: 'shorten' };

/**
 * Everything the app knows about one social network. Adapters are pure (no network, no secrets):
 * actual API calls happen in your backend, which receives `toPayload()` output via the publishing provider.
 */
export interface PlatformAdapter {
  id: PlatformId;
  name: string;
  /** Badge background color. */
  color: string;
  /** FontAwesome6 glyph for the badge. */
  glyph: { name: string; brand: boolean };
  /** What one destination is called in the UI: "Page", "Channel"… */
  noun: string;
  audience: 'followers' | 'subscribers';
  limits: {
    caption: number;
    /** Lower caption cap when media is attached (Telegram: 1024). */
    captionWithMedia?: number;
    media: number;
  };
  requires?: 'media' | 'video';
  /** Per-platform settings rendered on the customize screen. */
  options: Option[];
  /** Fill derived values, e.g. a YouTube title from the caption. */
  resolve?(content: ResolvedContent): ResolvedContent;
  /** Rules beyond the shared limits checked in platforms/index.ts. */
  validate?(content: ResolvedContent): Issue[];
  /** Request body for the platform API. Your backend adds credentials and calls the endpoint. */
  toPayload(content: ResolvedContent, page: SocialPage): Record<string, unknown>;
  /** How accounts are connected. Metadata only — secrets live in your backend's environment. */
  connection: { method: 'oauth2' | 'bot'; scopes: string[]; serverEnv: string[]; docs: string };
  /** Messages the demo publisher uses when simulating failures. */
  demoErrors: string[];
}
