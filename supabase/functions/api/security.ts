// Shared, runtime-independent security primitives. No credentials cross the client boundary.
export class SafeError extends Error {
  constructor(message: string, public code = 'INVALID_REQUEST', public status = 400, public retryable = false, public reconnect = false) {
    super(message);
  }
}

export const publicError = (e: unknown) =>
  e instanceof SafeError
    ? { message: e.message, code: e.code, retryable: e.retryable, reconnect: e.reconnect }
    : { message: 'The request could not be completed. Please try again.', code: 'REQUEST_FAILED', retryable: false };

export const b64url = (b: Uint8Array) => btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unbase64 = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
export const random = () => b64url(crypto.getRandomValues(new Uint8Array(32)));
const bytes = (s: string) => new TextEncoder().encode(s);
export const hash = async (s: string) => b64url(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes(s))));
export async function hmac(secret: string, value: string) {
  const key = await crypto.subtle.importKey('raw', bytes(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, bytes(value)));
}
export const hex = (b: Uint8Array) => Array.from(b, (v) => v.toString(16).padStart(2, '0')).join('');
export function equal(a: string, b: string) {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}
export const platforms = ['facebook', 'instagram', 'tiktok', 'youtube', 'x', 'telegram'] as const;
export function validPlatform(p: unknown): asserts p is typeof platforms[number] {
  if (!platforms.includes(p as typeof platforms[number])) throw new SafeError('Unsupported platform.');
}
export function returnUrl(value: unknown, allowlist: string) {
  if (typeof value !== 'string' || !allowlist.split(',').map((s) => s.trim()).filter(Boolean).includes(value)) {
    throw new SafeError('This app return URL is not allowed.');
  }
  const u = new URL(value);
  if (u.username || u.password || u.search || u.hash || !['https:', 'outpost:', 'multipostly:'].includes(u.protocol)) {
    throw new SafeError('Invalid app return URL.');
  }
  return value;
}
export function validFlow(
  flow: { created_at: string; platform: unknown; redirect_uri: string } | null,
  allowlist: string,
  now = Date.now(),
) {
  if (
    !flow || !Number.isFinite(Date.parse(flow.created_at)) || now - Date.parse(flow.created_at) > 600_000 ||
    Date.parse(flow.created_at) > now + 30_000
  ) throw new SafeError('This connection link expired. Start again in the app.');
  validPlatform(flow.platform);
  returnUrl(flow.redirect_uri, allowlist);
  return flow;
}
export const accountKey = (user: string, platform: string, external: string) => `${user}:${platform}:${external}`;
export const pageKey = (account: string, external: string) => `${account}:${external}`;

function encryptionKey(secret: string) {
  const raw = unbase64(secret);
  if (raw.length !== 32) throw new Error('Invalid token encryption configuration');
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
}
export async function seal(value: unknown, secret: string, context: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: bytes(context) },
    await encryptionKey(secret),
    bytes(JSON.stringify(value)),
  );
  return `v1.${b64url(iv)}.${b64url(new Uint8Array(ciphertext))}`;
}
export async function open<T>(value: string, secret: string, context: string): Promise<T> {
  const [version, iv, ciphertext, extra] = value.split('.');
  if (version !== 'v1' || extra) throw new Error('Invalid encrypted token');
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: unbase64(iv), additionalData: bytes(context) },
    await encryptionKey(secret),
    unbase64(ciphertext),
  );
  return JSON.parse(new TextDecoder().decode(plain));
}
export async function signedRequest(value: string, secret: string) {
  try {
    if (value.length > 8192) throw new Error();
    const [signature, encoded, extra] = value.split('.');
    if (!signature || !encoded || extra || !equal(signature, b64url(await hmac(secret, encoded)))) throw new Error();
    const data = JSON.parse(new TextDecoder().decode(unbase64(encoded)));
    if (
      data.algorithm !== 'HMAC-SHA256' || !/^\d+$/.test(data.user_id) || !Number.isFinite(data.issued_at) ||
      data.issued_at * 1000 > Date.now() + 60_000 || data.issued_at * 1000 < Date.now() - 86400_000
    ) throw new Error();
    return data as { user_id: string; issued_at: number };
  } catch {
    throw new SafeError('Invalid signed request.', 'INVALID_SIGNATURE', 403);
  }
}

/** Only the caller's uploaded media may be fetched by the backend or passed to a platform. */
export function mediaPath(value: unknown, userId: string, supabaseUrl: string) {
  if (typeof value !== 'string') throw new SafeError('Upload media before publishing.');
  const u = new URL(value), base = new URL(supabaseUrl);
  const path = decodeURIComponent(u.pathname);
  const prefix = ['/storage/v1/object/public/media/', '/storage/v1/object/sign/media/'].find((p) => path.startsWith(`${p}${userId}/`));
  const name = prefix ? path.slice(prefix.length + userId.length + 1) : '';
  if (
    u.origin !== base.origin || u.protocol !== 'https:' || u.username || u.password || u.hash || !prefix || !/^[\w.-]+$/.test(name) ||
    [...u.searchParams.keys()].some((k) => k !== 'token')
  ) throw new SafeError('Media must belong to your account.');
  return `${userId}/${name}`;
}
export function ownedMedia(value: unknown, userId: string, supabaseUrl: string) {
  mediaPath(value, userId, supabaseUrl);
  return value as string;
}

type SecurityPayload = {
  pageId: string;
  kind: string;
  message: string;
  media: { url: string; type: string; media: string }[];
  igUserId: string;
  items: { video_url?: string; image_url?: string }[];
  mediaType: string;
  chat_id: string;
  method: string;
  photo: string;
  video: string;
  videoUrl: string;
  mediaUrls: string[];
  source_info?: { video_url?: string; photo_images?: string[]; source?: string };
};
export function authorizedPayload(
  page: { external_id: string; platform: string },
  payload: Record<string, unknown>,
  userId: string,
  storageUrl: string,
) {
  const p = structuredClone(payload) as SecurityPayload;
  const media = (v: unknown) => ownedMedia(v, userId, storageUrl);
  if (page.platform === 'facebook') {
    if (p.pageId !== page.external_id) {
      throw new SafeError('The post destination does not match the connected Page.', 'DESTINATION_MISMATCH');
    }
    if (
      !['text', 'photo', 'album', 'video', 'reel', 'story'].includes(p.kind) || typeof p.message !== 'string' || p.message.length > 63206 ||
      !Array.isArray(p.media) || p.media.length > 10
    ) throw new SafeError('Invalid Facebook post.');
    for (const m of p.media) {
      media(m.url);
      if (!['image', 'video'].includes(m.type)) throw new SafeError('Invalid media type.');
    }
    const n = p.media.length;
    if (
      (p.kind === 'text' && (n !== 0 || !p.message.trim())) ||
      (p.kind === 'album' && (n < 2 || p.media.some((m: { url: string; type: string }) => m.type !== 'image'))) ||
      (['photo', 'video', 'reel', 'story'].includes(p.kind) && n !== 1) || (p.kind === 'photo' && p.media[0].type !== 'image') ||
      (['video', 'reel'].includes(p.kind) && p.media[0].type !== 'video')
    ) throw new SafeError('The Facebook format does not match its media.');
    return {
      pageId: page.external_id,
      kind: p.kind,
      message: p.message,
      media: p.media.map((m: { url: string; type: string }) => ({ url: m.url, type: m.type })),
    };
  }
  if (page.platform === 'instagram') {
    if (
      p.igUserId !== page.external_id || !Array.isArray(p.items) || !p.items.length || p.items.length > 10 ||
      !['IMAGE', 'CAROUSEL', 'REELS', 'STORIES'].includes(p.mediaType)
    ) throw new SafeError('Invalid Instagram destination or media.');
    for (const m of p.items) media(m.video_url ?? m.image_url);
    p.igUserId = page.external_id;
  } else if (page.platform === 'telegram') {
    if (!['sendMessage', 'sendPhoto', 'sendVideo', 'sendMediaGroup'].includes(p.method)) {
      throw new SafeError('Unsupported Telegram operation.');
    }
    p.chat_id = page.external_id;
    if (p.photo) media(p.photo);
    if (p.video) media(p.video);
    for (const m of p.media ?? []) media(m.media);
    // Prevent arbitrary Bot API parameters that can redirect actions to other chats.
    return Object.fromEntries(
      Object.entries(p).filter(([k]) =>
        ['method', 'chat_id', 'text', 'caption', 'photo', 'video', 'media', 'pin', 'disable_notification'].includes(k)
      ),
    );
  } else if (page.platform === 'youtube') media(p.videoUrl);
  else if (page.platform === 'x') { for (const u of p.mediaUrls ?? []) media(u); }
  else if (page.platform === 'tiktok') {
    if (p.source_info?.video_url) media(p.source_info.video_url);
    for (const u of p.source_info?.photo_images ?? []) media(u);
    if (p.source_info?.source && !['FILE_UPLOAD', 'PULL_FROM_URL'].includes(p.source_info.source)) {
      throw new SafeError('Unsupported media source.');
    }
  }
  return p;
}
