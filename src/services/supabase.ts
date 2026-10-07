import AsyncStorage from '@react-native-async-storage/async-storage';
import * as AppleAuthentication from 'expo-apple-authentication';
import { createClient, type User as AuthUser } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Alert } from 'react-native';
import 'react-native-url-polyfill/auto';

import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/config/app';
import type { MediaAsset, Post, PublishResult, SocialAccount, User } from '@/models';

import type { Services } from './types';

/*
 * Live providers backed by Supabase: Auth, Postgres (RLS), Storage and the `api` Edge Function
 * (supabase/functions/api), which holds every platform secret and token.
 */

export const supabase = createClient(SUPABASE_URL || 'https://missing.supabase.co', SUPABASE_ANON_KEY || 'missing', {
  auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false, flowType: 'pkce' },
});

async function api<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('api', { body });
  if (error) {
    // FunctionsHttpError carries the response; surface the server's message.
    const msg = await (error as { context?: Response }).context?.json?.().then((d) => d?.error?.message).catch(() => undefined);
    throw new Error(msg ?? error.message);
  }
  return data as T;
}

const toUser = (u: AuthUser): User => ({
  id: u.id,
  email: u.email ?? '',
  name: (u.user_metadata?.name as string) || (u.email ?? '').split('@')[0],
  avatar: u.user_metadata?.avatar_url as string | undefined,
});

const must = <T>({ data, error }: { data: T; error: { message: string } | null }) => {
  if (error) throw new Error(error.message);
  return data;
};

async function uploadFile(uri: string, userId: string, name: string, mimeType?: string) {
  if (/^https?:/.test(uri)) return uri;
  const body = await (await fetch(uri)).arrayBuffer();
  const ext = uri.split('?')[0].split('.').pop()?.toLowerCase() || 'jpg';
  const path = `${userId}/${name.replace(/[^\w-]/g, '_')}.${ext}`;
  must(await supabase.storage.from('media').upload(path, body, { contentType: mimeType, upsert: true }));
  return supabase.storage.from('media').getPublicUrl(path).data.publicUrl;
}

const askChannel = () =>
  new Promise<string | null>((resolve) =>
    Alert.prompt(
      'Connect a Telegram channel',
      'Add the bot as an admin of your channel with “Post messages”, then enter the channel’s @username.',
      [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
        { text: 'Connect', onPress: (v?: string) => resolve(v?.trim() || null) },
      ],
      'plain-text',
      '@',
    ),
  );

export const supabaseServices: Services = {
  auth: {
    async getUser() {
      const { data } = await supabase.auth.getSession();
      return data.session ? toUser(data.session.user) : null;
    },
    async signIn(email, password) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);
      return toUser(data.user);
    },
    async signUp(name, email, password) {
      const data = must(await supabase.auth.signUp({ email, password, options: { data: { name } } }));
      return data.session && data.user ? toUser(data.user) : null;
    },
    async signInWith(provider) {
      if (provider === 'apple') {
        const cred = await AppleAuthentication.signInAsync({
          requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
        }).catch((e) => {
          if (e?.code === 'ERR_REQUEST_CANCELED') return null;
          throw e;
        });
        if (!cred?.identityToken) return null;
        const { data, error } = await supabase.auth.signInWithIdToken({ provider: 'apple', token: cred.identityToken });
        if (error) throw new Error(error.message);
        // Apple only shares the name on the first sign-in.
        const name = cred.fullName ? AppleAuthentication.formatFullName(cred.fullName) : '';
        if (name && !data.user.user_metadata?.name) return toUser((await supabase.auth.updateUser({ data: { name } })).data.user ?? data.user);
        return toUser(data.user);
      }
      const redirectTo = Linking.createURL('oauth/callback');
      const { data, error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo, skipBrowserRedirect: true } });
      if (error) throw new Error(error.message);
      const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (res.type !== 'success') return null;
      const q = Linking.parse(res.url).queryParams ?? {};
      if (q.error_description || q.error) throw new Error(String(q.error_description ?? q.error));
      const { data: session, error: exchangeError } = await supabase.auth.exchangeCodeForSession(String(q.code));
      if (exchangeError) throw new Error(exchangeError.message);
      return toUser(session.user);
    },
    async signOut() {
      await supabase.auth.signOut();
    },
  },

  database: {
    async listPosts() {
      const rows = must(await supabase.from('posts').select('data').order('updated_at', { ascending: false }));
      return (rows ?? []).map((r) => r.data as Post);
    },
    async savePost(post) {
      must(
        await supabase.from('posts').upsert({ id: post.id, data: post, status: post.status, scheduled_at: post.scheduledAt ?? null, updated_at: post.updatedAt }),
      );
    },
    async deletePost(id) {
      must(await supabase.from('posts').delete().eq('id', id));
    },
  },

  storage: {
    async upload(asset: MediaAsset) {
      const { data } = await supabase.auth.getUser();
      if (!data.user) throw new Error('Sign in to upload media.');
      const uri = await uploadFile(asset.uri, data.user.id, asset.id, asset.mimeType);
      const thumb = asset.thumb ? await uploadFile(asset.thumb, data.user.id, `${asset.id}-thumb`, 'image/jpeg') : undefined;
      return { ...asset, uri, thumb };
    },
  },

  ai: {
    improve: async (text, tone, attempt) => (await api<{ text: string }>({ action: 'ai', kind: 'improve', text, tone, attempt })).text,
    translate: async (text, lang) => (await api<{ text: string }>({ action: 'ai', kind: 'translate', text, lang })).text,
    hashtags: async (text) => (await api<{ hashtags: string[] }>({ action: 'ai', kind: 'hashtags', text })).hashtags,
    shorten: async (text, limit) => (await api<{ text: string }>({ action: 'ai', kind: 'shorten', text, limit })).text,
  },

  publishing: {
    async listAccounts() {
      const accounts = must(await supabase.from('social_accounts').select('*, social_pages(*)').order('connected_at'));
      return (accounts ?? []).map(
        (a): SocialAccount => ({
          id: a.id,
          platform: a.platform,
          name: a.name,
          avatar: a.avatar ?? undefined,
          status: a.status,
          connectedAt: a.connected_at,
          pages: a.social_pages.map((p: Record<string, any>) => ({
            id: p.id,
            accountId: p.account_id,
            platform: p.platform,
            externalId: p.external_id,
            name: p.name,
            handle: p.handle,
            avatar: p.avatar,
            followers: p.followers,
            kind: p.kind,
          })),
        }),
      );
    },
    async connect(platform) {
      let accountId: string;
      if (platform === 'telegram') {
        const channel = await askChannel();
        if (!channel) return null;
        accountId = (await api<{ account: string }>({ action: 'connect', platform, channel })).account;
      } else {
        const redirectUri = Linking.createURL('oauth/callback');
        const { authUrl } = await api<{ authUrl: string }>({ action: 'connect', platform, redirectUri });
        const res = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);
        if (res.type !== 'success') return null;
        const q = Linking.parse(res.url).queryParams ?? {};
        if (q.error) throw new Error(String(q.error));
        accountId = String(q.account);
      }
      return (await this.listAccounts()).find((a) => a.id === accountId) ?? null;
    },
    async disconnect(accountId) {
      await api({ action: 'disconnect', accountId });
    },
    async publish({ postId, page }, onProgress) {
      onProgress?.(0.3);
      return api<PublishResult>({ action: 'publish', postId, pageId: page.id });
    },
  },

  // The server's pg_cron job publishes due posts straight from the posts table; nothing to do here.
  scheduling: { schedule: async () => {}, cancel: async () => {} },
};
