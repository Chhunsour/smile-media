import type { ComponentType } from 'react';

import type { PlatformId } from '@/models';

import FacebookPreview from './facebook/Preview';
import InstagramPreview from './instagram/Preview';
import type { PreviewProps } from './preview-kit';
import TelegramPreview from './telegram/Preview';
import TikTokPreview from './tiktok/Preview';
import XPreview from './x/Preview';
import YouTubePreview from './youtube/Preview';

/** Register a new platform's preview here (adapters live in platforms/index.ts). */
const PREVIEWS: Record<PlatformId, ComponentType<PreviewProps>> = {
  facebook: FacebookPreview,
  instagram: InstagramPreview,
  tiktok: TikTokPreview,
  youtube: YouTubePreview,
  x: XPreview,
  telegram: TelegramPreview,
};

export function PlatformPreview(props: PreviewProps) {
  const Preview = PREVIEWS[props.platform];
  return <Preview {...props} />;
}
