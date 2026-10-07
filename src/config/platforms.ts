import type { PlatformId } from '@/models';

/**
 * Turn platforms on or off. Disabled platforms disappear from the composer, the channel picker and
 * Connected accounts; existing posts that mention them still render.
 */
export const enabledPlatforms: Record<PlatformId, boolean> = {
  facebook: true,
  instagram: true,
  tiktok: true,
  youtube: true,
  x: true,
  telegram: true,
};
