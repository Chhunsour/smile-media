import { enabledPlatforms } from '@/config/platforms';
import type { MediaAsset, PlatformId, Post } from '@/models';

import facebook from './facebook';
import instagram from './instagram';
import telegram from './telegram';
import tiktok from './tiktok';
import type { Issue, PlatformAdapter, ResolvedContent } from './types';
import x from './x';
import youtube from './youtube';

export type { Issue, Option, PlatformAdapter, ResolvedContent } from './types';

/** Every known platform, enabled or not, so old posts still render. Register new adapters here. */
export const PLATFORMS: Record<PlatformId, PlatformAdapter> = { facebook, instagram, tiktok, youtube, x, telegram };

/** Enabled platforms in display order (see config/platforms.ts). */
export const PLATFORM_ORDER = (Object.keys(PLATFORMS) as PlatformId[]).filter((id) => enabledPlatforms[id]);

export const audience = (p: PlatformId) => PLATFORMS[p].audience;

type ContentSource = Pick<Post, 'caption' | 'media' | 'captions' | 'options'>;

/** What actually goes to one platform: override caption + options merged over the adapter's defaults. */
export function resolveContent(post: ContentSource, platform: PlatformId): ResolvedContent {
  const adapter = PLATFORMS[platform];
  const defaults = Object.fromEntries(adapter.options.map((o) => [o.key, o.type === 'text' ? '' : o.default]));
  const content = { caption: post.captions[platform] ?? post.caption, media: post.media, options: { ...defaults, ...post.options[platform] } };
  return adapter.resolve ? adapter.resolve(content) : content;
}

export const captionLimit = (platform: PlatformId, media: MediaAsset[]) =>
  (media.length && PLATFORMS[platform].limits.captionWithMedia) || PLATFORMS[platform].limits.caption;

/** Shared limits plus the adapter's own rules. Errors block publishing; warnings don't. */
export function issuesFor(platform: PlatformId, post: ContentSource): Issue[] {
  const p = PLATFORMS[platform];
  const content = resolveContent(post, platform);
  const { caption, media, options } = content;
  const out: Issue[] = [];
  const err = (message: string, fix?: Issue['fix']) => out.push({ level: 'error', message, fix });
  const hasVideo = media.some((m) => m.type === 'video');
  const limit = captionLimit(platform, media);

  if (!caption.trim() && !media.length) err('Add a caption or media.');
  if (caption.length > limit) {
    const what = media.length && p.limits.captionWithMedia ? 'media captions are limited to' : 'the limit is';
    err(`${caption.length - limit} characters too long — ${what} ${limit.toLocaleString()}.`, 'shorten');
  }
  if (p.requires === 'video' && !hasVideo) err(`${p.name} needs a video.`);
  else if (p.requires === 'media' && !media.length) err(`${p.name} needs at least one photo or video.`);
  if (media.length > p.limits.media) err(`${p.name} allows up to ${p.limits.media} media item${p.limits.media > 1 ? 's' : ''}.`);
  // `format` is a shared option key (Facebook, Instagram).
  if (options.format === 'reel' && !hasVideo) err('Reels need a video.');
  if (options.format === 'story' && !media.length) err('Stories need a photo or video.');
  if (options.format === 'story' && caption.trim()) out.push({ level: 'warning', message: 'Captions aren’t shown on Stories.' });
  return [...out, ...(p.validate?.(content) ?? [])];
}
