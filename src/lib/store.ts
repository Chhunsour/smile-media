import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { AppState } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { APP_MODE } from '@/config/app';
import { resetDemoData } from '@/demo/persist';
import type { MediaAsset, PlatformId, PlatformOptions, Post, PostDestination, SocialAccount, User } from '@/models';
import { PLATFORMS, resolveContent } from '@/platforms';
import { setDemoFailureRate } from '@/services/publishing/demo';
import { services } from '@/services';

import { plural } from './format';

export type ThemePref = 'system' | 'light' | 'dark';
export type FailureMode = 'off' | 'sometimes' | 'always';
export type Settings = { theme: ThemePref; failures: FailureMode; notifications: boolean; lastPageIds: string[] };

/** The composer's working copy. Not persisted: closing the composer asks to save it as a draft. */
export type Draft = {
  id?: string;
  caption: string;
  media: MediaAsset[];
  pageIds: string[];
  captions: Partial<Record<PlatformId, string>>;
  options: Partial<Record<PlatformId, PlatformOptions>>;
  scheduledAt?: string;
  dirty: boolean;
};

/** A reusable caption snippet or hashtag set. Stored on the device. */
export type Template = { id: string; title: string; text: string };

export type Toast = { id: number; message: string; tone: 'success' | 'error' | 'info'; action?: string; onPress?: () => void };

type State = {
  /** undefined while restoring the session, null when signed out. */
  user: User | null | undefined;
  posts: Post[];
  accounts: SocialAccount[];
  settings: Settings;
  draft: Draft;
  templates: Template[];
  toast: Toast | null;
};

const emptyDraft = (): Draft => ({ caption: '', media: [], pageIds: [], captions: {}, options: {}, dirty: false });
const defaultTemplates: Template[] = [
  { id: 't_cta', title: 'Link in bio', text: '🔗 Full details at the link in our bio.' },
  { id: 't_ask', title: 'Ask the audience', text: 'What do you think? Tell us in the comments 👇' },
  { id: 't_tags', title: 'Creator hashtags', text: '#behindthescenes #creator #newpost #contentcreator' },
  { id: 't_follow', title: 'Follow for more', text: 'Follow for more ✨ New drops every week.' },
];
const defaultSettings: Settings = { theme: 'dark', failures: 'sometimes', notifications: true, lastPageIds: APP_MODE === 'demo' ? ['fb_acme', 'ig_acme', 'x_acme'] : [] };

// Only preferences live on the device; posts and accounts come from the providers.
export const useStore = create<State>()(
  persist(
    (): State => ({
      user: undefined,
      posts: [],
      accounts: [],
      settings: defaultSettings,
      draft: emptyDraft(),
      templates: defaultTemplates,
      toast: null,
    }),
    {
      name: 'outpost',
      version: 3,
      migrate: () => ({ settings: defaultSettings }) as unknown as State,
      storage: createJSONStorage(() => AsyncStorage),
      // ponytail: templates live on the device only; move them to the database provider if they need to sync.
      partialize: ({ settings, templates }) => ({ settings, templates }) as State,
    },
  ),
);

const set = useStore.setState;
const get = useStore.getState;

const nowIso = () => new Date().toISOString();
const uid = () => Math.random().toString(36).slice(2, 10);
const message = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong.');

export const allPages = (accounts: SocialAccount[]) => accounts.flatMap((a) => a.pages);

let toastId = 0;
export function toast(text: string, tone: Toast['tone'] = 'success', extra?: Pick<Toast, 'action' | 'onPress'>) {
  set({ toast: { id: ++toastId, message: text, tone, ...extra } });
}
export const dismissToast = () => set({ toast: null });

/* ───────────── Session & data ───────────── */

/** A publish that was mid-flight when the app was killed can't be resumed; surface it as a retryable failure. */
const recoverInterrupted = (p: Post): Post =>
  p.status !== 'publishing'
    ? p
    : {
        ...p,
        status: 'failed',
        destinations: p.destinations.map((d) =>
          d.status === 'publishing'
            ? { ...d, status: 'failed', progress: undefined, result: { status: 'failed', error: { message: 'Interrupted — the app closed before this finished.', retryable: true } } }
            : d,
        ),
      };

/** Reload posts and accounts from the backend. Keeps local in-flight publishes. */
export async function refresh() {
  if (!get().user) return;
  try {
    const [posts, accounts] = await Promise.all([services.database.listPosts(), services.publishing.listAccounts()]);
    const local = new Map(get().posts.filter((p) => p.status === 'publishing').map((p) => [p.id, p]));
    set({ posts: posts.map((p) => local.get(p.id) ?? recoverInterrupted(p)), accounts });
  } catch (e) {
    toast(message(e), 'error');
  }
}

/** Restore the session, then load data and start the scheduler. Call once at launch. */
export async function bootstrap() {
  setDemoFailureRate(FAIL_RATE[get().settings.failures]);
  const user = await services.auth.getUser().catch(() => null);
  set({ user });
  await refresh();
  services.scheduling.watch?.(publishDuePosts);
  AppState.addEventListener('change', (s) => s === 'active' && refresh());
}

export async function signIn(email: string, password: string) {
  set({ user: await services.auth.signIn(email.trim(), password) });
  await refresh();
}

/** Returns false when the account needs email confirmation before signing in. */
export async function signUp(name: string, email: string, password: string) {
  const user = await services.auth.signUp(name.trim(), email.trim(), password);
  if (!user) return false;
  set({ user });
  await refresh();
  return true;
}

/** Apple / Google. Resolves false if cancelled. */
export async function signInWith(provider: 'apple' | 'google') {
  const user = await services.auth.signInWith!(provider);
  if (!user) return false;
  set({ user });
  await refresh();
  return true;
}

export async function signOut() {
  await services.auth.signOut();
  set({ user: null, posts: [], accounts: [], draft: emptyDraft() });
}

/* ───────────── Composer ───────────── */

const draftFrom = (p: Post): Draft => ({
  id: p.id,
  caption: p.caption,
  media: p.media,
  pageIds: p.destinations.map((d) => d.pageId),
  captions: p.captions,
  options: p.options,
  scheduledAt: p.scheduledAt,
  dirty: false,
});

/** `open`: jump straight into a composer tool (media sheet, camera, templates). */
export type ComposeTool = 'media' | 'camera' | 'templates';

export function startCompose({ postId, date, open }: { postId?: string; date?: Date; open?: ComposeTool } = {}) {
  const { posts, settings, accounts } = get();
  const post = postId ? posts.find((p) => p.id === postId) : undefined;
  const connected = new Set(allPages(accounts).map((p) => p.id));
  set({
    draft: post
      ? draftFrom(post)
      : { ...emptyDraft(), pageIds: settings.lastPageIds.filter((id) => connected.has(id)), scheduledAt: date?.toISOString() },
  });
  router.push({ pathname: '/compose', params: open ? { open } : {} });
}

export function duplicatePost(postId: string) {
  const post = get().posts.find((p) => p.id === postId);
  if (!post) return;
  set({ draft: { ...draftFrom(post), id: undefined, scheduledAt: undefined, dirty: true } });
  router.push('/compose');
}

export const updateDraft = (patch: Partial<Draft>) => set((s) => ({ draft: { ...s.draft, ...patch, dirty: true } }));

export const MAX_MEDIA = 10;

export function addMedia(media: MediaAsset[]) {
  const current = get().draft.media;
  updateDraft({ media: [...current, ...media.filter((m) => !current.some((c) => c.id === m.id))].slice(0, MAX_MEDIA) });
}

export const removeMedia = (id: string) => updateDraft({ media: get().draft.media.filter((m) => m.id !== id) });

/** Appends text to the caption on a new paragraph. */
export function insertIntoCaption(text: string) {
  const caption = get().draft.caption.trimEnd();
  updateDraft({ caption: caption ? `${caption}\n\n${text}` : text });
}

export function saveTemplate(title: string, text: string) {
  set((s) => ({ templates: [{ id: uid(), title: title.trim(), text: text.trim() }, ...s.templates] }));
}

export const deleteTemplate = (id: string) => set((s) => ({ templates: s.templates.filter((t) => t.id !== id) }));

export function setPlatformOption(platform: PlatformId, key: string, value: PlatformOptions[string]) {
  const { options } = get().draft;
  updateDraft({ options: { ...options, [platform]: { ...options[platform], [key]: value } } });
}

function patchPost(id: string, fn: (p: Post) => Post) {
  set((s) => ({ posts: s.posts.map((p) => (p.id === id ? fn(p) : p)) }));
}

function patchDestination(postId: string, pageId: string, patch: Partial<PostDestination>) {
  patchPost(postId, (p) => ({ ...p, destinations: p.destinations.map((d) => (d.pageId === pageId ? { ...d, ...patch } : d)) }));
}

/** Upload local media, compute per-page payloads, save. Returns the stored post. */
async function store(id: string) {
  const post = get().posts.find((p) => p.id === id);
  if (!post) throw new Error('Post not found.');
  const media = await Promise.all(post.media.map((m) => services.storage.upload(m)));
  const pages = allPages(get().accounts);
  const payloads = Object.fromEntries(
    post.destinations.flatMap((d) => {
      const page = pages.find((p) => p.id === d.pageId);
      return page ? [[d.pageId, PLATFORMS[d.platform].toPayload(resolveContent({ ...post, media }, d.platform), page)]] : [];
    }),
  );
  // Merge into the latest copy: progress may have changed while uploading.
  patchPost(id, (p) => ({ ...p, media, payloads }));
  const saved = get().posts.find((p) => p.id === id)!;
  await services.database.savePost(saved);
  return saved;
}

/** Turns the draft into a post. Returns the post id. */
export function commitDraft(mode: 'draft' | 'schedule' | 'publish', scheduledAt?: string) {
  const { draft, posts, accounts } = get();
  const pages = allPages(accounts);
  const existing = draft.id ? posts.find((p) => p.id === draft.id) : undefined;
  const id = existing?.id ?? uid();
  const ts = nowIso();
  const platforms = new Set(pages.filter((p) => draft.pageIds.includes(p.id)).map((p) => p.platform));
  const keep = <T>(m: Partial<Record<PlatformId, T>>) =>
    Object.fromEntries(Object.entries(m).filter(([k]) => platforms.has(k as PlatformId))) as Partial<Record<PlatformId, T>>;

  const post: Post = {
    id,
    caption: draft.caption.trim(),
    media: draft.media,
    captions: keep(draft.captions),
    options: keep(draft.options),
    destinations: draft.pageIds.flatMap((pageId): PostDestination[] => {
      const page = pages.find((x) => x.id === pageId);
      return page ? [{ pageId, platform: page.platform, name: page.name, handle: page.handle, avatar: page.avatar, status: 'pending' }] : [];
    }),
    status: mode === 'draft' ? 'draft' : mode === 'schedule' ? 'scheduled' : 'publishing',
    scheduledAt: mode === 'schedule' ? scheduledAt : undefined,
    createdAt: existing?.createdAt ?? ts,
    updatedAt: ts,
  };

  set((s) => ({
    posts: existing ? s.posts.map((p) => (p.id === id ? post : p)) : [post, ...s.posts],
    settings: mode === 'draft' ? s.settings : { ...s.settings, lastPageIds: draft.pageIds },
    draft: { ...s.draft, id, dirty: false },
  }));

  if (mode === 'publish') publish(id);
  else
    store(id)
      .then((saved) => (mode === 'schedule' ? services.scheduling.schedule(saved) : services.scheduling.cancel(id)))
      .catch((e) => toast(`Couldn’t save: ${message(e)}`, 'error'));
  return id;
}

/** "Save" from the composer: drafts stay drafts, scheduled posts keep their slot. */
export function saveDraft() {
  const { draft, posts } = get();
  const existing = posts.find((p) => p.id === draft.id);
  return existing?.status === 'scheduled' && draft.scheduledAt ? commitDraft('schedule', draft.scheduledAt) : commitDraft('draft');
}

/* ───────────── Publishing ───────────── */

const FAIL_RATE: Record<FailureMode, number> = { off: 0, sometimes: 0.25, always: 1 };

/** Publishes every unpublished destination, or just `only`. Safe to call while others are in flight. */
export async function publish(postId: string, only?: string[]) {
  const post = get().posts.find((p) => p.id === postId);
  if (!post) return;
  const ids = only ?? post.destinations.filter((d) => d.status === 'pending' || d.status === 'failed').map((d) => d.pageId);
  if (!ids.length) return;

  patchPost(postId, (p) => ({
    ...p,
    status: 'publishing',
    destinations: p.destinations.map((d) => (ids.includes(d.pageId) ? { ...d, status: 'publishing', progress: 0, result: undefined } : d)),
  }));

  const fail = (pageId: string, e: unknown) =>
    patchDestination(postId, pageId, { status: 'failed', progress: undefined, result: { status: 'failed', error: { message: message(e), retryable: true } } });

  let saved: Post | undefined;
  try {
    saved = await store(postId);
  } catch (e) {
    ids.forEach((id) => fail(id, `Upload failed: ${message(e)}`));
  }

  if (saved) {
    const current = saved;
    await services.scheduling.cancel(postId).catch(() => {});
    await Promise.all(
      ids.map(async (pageId) => {
        const dest = current.destinations.find((d) => d.pageId === pageId)!;
        const page = allPages(get().accounts).find((p) => p.id === pageId);
        try {
          if (!page) {
            const { noun, name } = PLATFORMS[dest.platform];
            throw new Error(`This ${noun.toLowerCase()} is disconnected. Reconnect ${name} to publish.`);
          }
          const content = resolveContent(current, page.platform);
          const result = await services.publishing.publish(
            { postId, page, content, payload: current.payloads?.[pageId] ?? {} },
            (progress) => patchDestination(postId, pageId, { progress }),
          );
          patchDestination(postId, pageId, { status: result.status, progress: result.status === 'published' ? 1 : undefined, result });
        } catch (e) {
          fail(pageId, e);
        }
      }),
    );
  }

  const done = get().posts.find((p) => p.id === postId);
  if (!done || done.destinations.some((d) => d.status === 'publishing')) return;
  const failed = done.destinations.filter((d) => d.status === 'failed').length;
  const total = done.destinations.length;
  patchPost(postId, (p) => ({ ...p, status: failed ? 'failed' : 'published', publishedAt: nowIso(), updatedAt: nowIso() }));
  services.database.savePost(get().posts.find((p) => p.id === postId)!).catch((e) => toast(`Couldn’t save: ${message(e)}`, 'error'));

  Haptics.notificationAsync(failed ? Haptics.NotificationFeedbackType.Error : Haptics.NotificationFeedbackType.Success);
  if (get().settings.notifications) {
    toast(failed ? `${failed} of ${plural(total, 'channel')} failed` : `Published to ${plural(total, 'channel')}`, failed ? 'error' : 'success', {
      action: 'View',
      onPress: () => router.push({ pathname: '/post/[id]', params: { id: postId } }),
    });
  }
}

export function retry(postId: string, pageId?: string) {
  const post = get().posts.find((p) => p.id === postId);
  publish(postId, pageId ? [pageId] : post?.destinations.filter((d) => d.status === 'failed').map((d) => d.pageId));
}

/** Device-side scheduler (demo only; live mode publishes from the server's cron). */
export function publishDuePosts() {
  const now = Date.now();
  get()
    .posts.filter((p) => p.status === 'scheduled' && p.scheduledAt && new Date(p.scheduledAt).getTime() <= now)
    .forEach((p) => publish(p.id));
}

/* ───────────── Posts, accounts, settings ───────────── */

export function deletePost(id: string) {
  set((s) => ({ posts: s.posts.filter((p) => p.id !== id) }));
  services.scheduling.cancel(id).catch(() => {});
  services.database.deletePost(id).catch((e) => toast(`Couldn’t delete: ${message(e)}`, 'error'));
}

/** Runs the platform's connect flow. Resolves false if it was cancelled or failed (failures toast). */
export async function connect(platform: PlatformId) {
  const account = await services.publishing.connect(platform).catch((e) => {
    toast(message(e), 'error');
    return null;
  });
  if (!account) return false;
  set((s) => ({ accounts: [...s.accounts.filter((a) => a.id !== account.id), account] }));
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  return true;
}

export async function disconnect(accountId: string) {
  try {
    await services.publishing.disconnect(accountId);
  } catch (e) {
    toast(message(e), 'error');
    return;
  }
  set((s) => {
    const gone = new Set(s.accounts.find((a) => a.id === accountId)?.pages.map((p) => p.id));
    return {
      accounts: s.accounts.filter((a) => a.id !== accountId),
      settings: { ...s.settings, lastPageIds: s.settings.lastPageIds.filter((id) => !gone.has(id)) },
    };
  });
}

export function setSettings(patch: Partial<Settings>) {
  set((s) => ({ settings: { ...s.settings, ...patch } }));
  if (patch.failures) setDemoFailureRate(FAIL_RATE[patch.failures]);
}

export async function resetDemo() {
  await resetDemoData();
  set({ draft: emptyDraft(), toast: null });
  await refresh();
}
