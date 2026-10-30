import * as AppleAuthentication from 'expo-apple-authentication';
import { createClient, type User as AuthUser } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Alert } from 'react-native';
import 'react-native-url-polyfill/auto';

import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/config/app';
import type { MediaAsset, Post, PublishResult, SocialAccount, User } from '@/models';

import type { Services } from './types';
import { sessionStorage } from './session-storage';

/*
 * Live providers backed by Supabase: Auth, Postgres (RLS), Storage and the `api` Edge Function
 * (supabase/functions/api), which holds every platform secret and token.
 */

export const supabase = createClient(SUPABASE_URL || 'https://missing.supabase.co', SUPABASE_ANON_KEY || 'missing', {
  auth: { storage: sessionStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false, flowType: 'pkce' },
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

let backendCheck: Promise<void> | undefined;
async function ensureBackend() {
  backendCheck ??= api<{ schemaVersion: string }>({ action: 'capabilities' }).then(result => {
    if (result.schemaVersion !== '2026-10-30.security.1') throw new Error('Backend version mismatch.');
  }).catch(() => {
    backendCheck = undefined;
    throw new Error('MultiPostly could not verify this app version with the service. Check your connection and try again later.');
  });
  await backendCheck;
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
  const signed = must(await supabase.storage.from('media').createSignedUrl(path, 3600));
  if (!signed) throw new Error('Media download URL could not be created.');
  return signed.signedUrl;
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
      const { data } = await supabase.auth.getUser();
      return data.user ? toUser(data.user) : null;
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
      if (typeof q.code !== 'string' && !q.error && !q.error_description) throw new Error('Sign-in did not return an authorization code.');
      if (q.error_description || q.error) throw new Error(String(q.error_description ?? q.error));
      const { data: session, error: exchangeError } = await supabase.auth.exchangeCodeForSession(String(q.code));
      if (exchangeError) throw new Error(exchangeError.message);
      return toUser(session.user);
    },
    async signOut() {
      const { error } = await supabase.auth.signOut();
      if (error) throw new Error(error.message);
    },
    async deleteAccount() {
      await ensureBackend();
      await api({ action: 'delete-user', confirm: 'DELETE' });
      await supabase.auth.signOut({ scope: 'local' });
    },
  },

  database: {
    async listPosts() {
      await ensureBackend();
      const rows = must(await supabase.from('posts').select('data').order('updated_at', { ascending: false }));
      const attempts = must(await supabase.from('publish_attempts').select('post_id,page_id,status,result'));
      const renew = async (uri: string) => {
        try {
          const url = new URL(uri);
          if (url.origin !== new URL(SUPABASE_URL).origin) return uri;
          const match = decodeURIComponent(url.pathname).match(/^\/storage\/v1\/object\/(?:public|sign)\/media\/(.+)$/);
          if (!match) return uri;
          const { data, error } = await supabase.storage.from('media').createSignedUrl(match[1], 3600);
          // Missing media should not hide the user's entire post history.
          return !error && data ? data.signedUrl : uri;
        } catch { return uri; }
      };
      return Promise.all((rows ?? []).map(async (r) => {
        const post = r.data as Post;
        post.destinations = post.destinations.map(d => {
          const attempt = (attempts ?? []).find(a => a.post_id === post.id && a.page_id === d.pageId);
          return attempt?.result ? { ...d, status: attempt.result.status, result: attempt.result } : d;
        });
        post.media = await Promise.all(post.media.map(async m => ({ ...m, uri: await renew(m.uri), thumb: m.thumb ? await renew(m.thumb) : undefined })));
        return post;
      }));
    },
    async savePost(post) {
      await ensureBackend();
      must(
        await supabase.from('posts').upsert({ id: post.id, data: post, status: post.status, scheduled_at: post.scheduledAt ?? null, updated_at: post.updatedAt }),
      );
    },
    async deletePost(id) {
      await ensureBackend();
      must(await supabase.from('posts').delete().eq('id', id));
    },
  },

  storage: {
    async upload(asset: MediaAsset) {
      await ensureBackend();
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
      await ensureBackend();
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
      await ensureBackend();
      let accountId: string;
      if (platform === 'telegram') {
        const channel = await askChannel();
        if (!channel) return null;
        accountId = (await api<{ account: string }>({ action: 'connect', platform, channel })).account;
      } else {
        const redirectUri = Linking.createURL('oauth/callback');
        const { authUrl, state } = await api<{ authUrl: string; state: string }>({ action: 'connect', platform, redirectUri });
        const res = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);
        if (res.type !== 'success') return null;
        const q = Linking.parse(res.url).queryParams ?? {};
        if (q.state !== state) throw new Error('The connection response did not match this request. Try connecting again.');
        if (q.error) throw new Error(String(q.error));
        if (typeof q.account !== 'string') throw new Error('The connection was not completed.');
        accountId = q.account;
      }
      return (await this.listAccounts()).find((a) => a.id === accountId) ?? null;
    },
    async disconnect(accountId) {
      await ensureBackend();
      await api({ action: 'disconnect', accountId });
    },
    async publish({ postId, page }, onProgress) {
      await ensureBackend();
      onProgress?.(0.3);
      return api<PublishResult>({ action: 'publish', postId, pageId: page.id });
    },
  },

  // The server's pg_cron job publishes due posts straight from the posts table; nothing to do here.
  scheduling: { schedule: async () => {}, cancel: async () => {} },
};
