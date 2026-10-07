import { demoTable } from '@/demo/persist';
import { seedPosts } from '@/demo/seed';
import type { Post } from '@/models';

import type { DatabaseProvider } from '../types';

const posts = demoTable<Post[]>('outpost:demo:posts', seedPosts);

export const demoDatabase: DatabaseProvider = {
  listPosts: async () => [...(await posts.get())],
  async savePost(post) {
    const all = await posts.get();
    await posts.set(all.some((p) => p.id === post.id) ? all.map((p) => (p.id === post.id ? post : p)) : [post, ...all]);
  },
  async deletePost(id) {
    await posts.set((await posts.get()).filter((p) => p.id !== id));
  },
};
