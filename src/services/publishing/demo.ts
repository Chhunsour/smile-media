import { demoTable, sleep } from '@/demo/persist';
import { DEMO_ACCOUNTS } from '@/demo/seed';
import type { SocialAccount } from '@/models';
import { PLATFORMS } from '@/platforms';

import type { PublishingProvider } from '../types';

const accounts = demoTable<SocialAccount[]>('outpost:demo:accounts', () => DEMO_ACCOUNTS);

let failRate = 0.25;
/** Profile → Testing → "Simulate API failures". */
export const setDemoFailureRate = (rate: number) => {
  failRate = rate;
};

const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];

export const demoPublishing: PublishingProvider = {
  listAccounts: async () => [...(await accounts.get())],
  async connect(platform) {
    await sleep(1300);
    const seed = DEMO_ACCOUNTS.find((a) => a.platform === platform);
    if (!seed) return null;
    const account = { ...seed, connectedAt: new Date().toISOString() };
    await accounts.set([...(await accounts.get()).filter((a) => a.id !== seed.id), account]);
    return account;
  },
  async disconnect(id) {
    await sleep(400);
    await accounts.set((await accounts.get()).filter((a) => a.id !== id));
  },
  async publish({ page, content }, onProgress) {
    const failAt = Math.random() < failRate ? 0.3 + Math.random() * 0.55 : 2;
    const step = content.media.length ? 0.035 + Math.random() * 0.05 : 0.12 + Math.random() * 0.08;
    let progress = 0;
    while (progress < 1) {
      await sleep(140 + Math.random() * 160);
      progress = Math.min(1, progress + step * (0.5 + Math.random()));
      if (progress >= failAt) return { status: 'failed', error: { message: pick(PLATFORMS[page.platform].demoErrors), retryable: true } };
      onProgress?.(progress);
    }
    return {
      status: 'published',
      remoteId: Date.now().toString(36),
      url: `https://example.com/${page.handle}/${Date.now().toString(36)}`,
      publishedAt: new Date().toISOString(),
      metrics: { likes: 0, comments: 0, shares: 0, reach: 0 },
    };
  },
};
