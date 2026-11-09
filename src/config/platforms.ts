import type { PlatformId } from '@/models';

import { APP_MODE } from './app';

// Live ships only the Meta integrations the backend is configured and reviewed for; the demo shows all.
const demoOnly = APP_MODE === 'demo';

/**
 * Turn platforms on or off. Disabled platforms disappear from the composer, the channel picker and
 * Connected accounts; existing posts that mention them still render.
 */
export const enabledPlatforms: Record<PlatformId, boolean> = {
  facebook: true,
  instagram: true,
  tiktok: demoOnly,
  youtube: demoOnly,
  x: demoOnly,
  telegram: demoOnly,
};
