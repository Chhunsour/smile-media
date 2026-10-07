import { DEMO_USER } from '@/demo/seed';

import type { AuthProvider } from '../types';

export const demoAuth: AuthProvider = {
  getUser: async () => DEMO_USER,
  signIn: async () => DEMO_USER,
  signUp: async () => DEMO_USER,
  signOut: async () => {},
};
