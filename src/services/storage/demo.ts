import { LIBRARY } from '@/demo/seed';

import type { StorageProvider } from '../types';

/** Demo keeps local file URIs as-is. */
export const demoStorage: StorageProvider = {
  upload: async (asset) => asset,
  library: async () => LIBRARY,
};
