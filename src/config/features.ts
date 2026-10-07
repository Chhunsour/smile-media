/** Product features you can switch off without touching screens. */
export const features = {
  /** "Assist" sheet: improve, translate, hashtags, plus the one-tap "Shorten" fix. Needs an AI provider. */
  ai: true,
  /** Schedule for later. Live mode needs a server-side scheduler (see docs/backend-integration.md). */
  scheduling: true,
  /** Reach/likes/comments on Home and post detail. Needs your backend to return PublishResult.metrics. */
  analytics: true,
  /** Shared media library in the media picker. Shown when the storage provider implements library(). */
  mediaLibrary: true,
};
