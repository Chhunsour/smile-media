/*
 * Runtime configuration read from EXPO_PUBLIC_* variables (see .env.example).
 * Everything here is bundled into the app and visible to anyone who has it: never put secrets here.
 */

export type AppMode = 'demo' | 'live';

/** "demo" runs entirely on mock data; 'live' talks to your backend through the configured providers. */
export const APP_MODE: AppMode = process.env.EXPO_PUBLIC_APP_MODE === 'live' ? 'live' : 'demo';

/** Base URL of your backend for the REST providers, e.g. https://api.example.com. */
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/+$/, '');

export const APP_NAME = process.env.EXPO_PUBLIC_APP_NAME || 'MultiPostly';

/** Supabase project for live mode. The anon key is public by design; Row Level Security protects data. */
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
