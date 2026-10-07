// Server-side platform integrations. Credentials come from function secrets (see .env.example);
// tokens are stored in social_tokens and never returned to the app.

export type Platform = 'facebook' | 'instagram' | 'tiktok' | 'youtube' | 'x' | 'telegram';
export type Token = { access_token: string; refresh_token?: string | null; expires_at?: string | null };
export type Page = { id: string; external_id: string; name: string; handle: string; avatar: string; followers: number; kind: string; token?: Token };
export type Connected = { externalId: string; name: string; avatar?: string; token?: Token; pages: Page[] };
export type Result = { status: 'published' | 'failed'; remoteId?: string; url?: string; publishedAt?: string; error?: { message: string; retryable?: boolean } };

const env = (k: string) => {
  const v = Deno.env.get(k);
  if (!v) throw new Error(`Server is missing ${k}. Add it to the function secrets.`);
  return v;
};
const GRAPH = 'https://graph.facebook.com/v23.0';
const expiresIn = (s?: number) => (s ? new Date(Date.now() + (s - 60) * 1000).toISOString() : null);

async function json(res: Response) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    const e = data.error;
    const msg = typeof e === 'string' ? (data.error_description ?? e) : (e?.message ?? data.detail ?? data.description ?? `HTTP ${res.status}`);
    throw new Error(msg);
  }
  return data;
}
const form = (o: Record<string, string>) => new URLSearchParams(o);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ───────── OAuth: authorize URL, code exchange, refresh ───────── */

export function authUrl(platform: Platform, redirect: string, state: string, challenge: string) {
  const q = (base: string, p: Record<string, string>) => `${base}?${new URLSearchParams(p)}`;
  switch (platform) {
    case 'facebook':
    case 'instagram':
      return q('https://www.facebook.com/v23.0/dialog/oauth', {
        client_id: env('META_APP_ID'),
        redirect_uri: redirect,
        state,
        scope:
          platform === 'facebook'
            ? 'pages_show_list,pages_manage_posts,pages_read_engagement'
            : 'instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement,business_management',
      });
    case 'tiktok':
      return q('https://www.tiktok.com/v2/auth/authorize/', {
        client_key: env('TIKTOK_CLIENT_KEY'),
        response_type: 'code',
        scope: 'user.info.basic,user.info.stats,video.publish,video.upload',
        redirect_uri: redirect,
        state,
        code_challenge: challenge,
        code_challenge_method: 'S256',
      });
    case 'youtube':
      return q('https://accounts.google.com/o/oauth2/v2/auth', {
        client_id: env('YOUTUBE_CLIENT_ID'),
        redirect_uri: redirect,
        response_type: 'code',
        scope: 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly',
        access_type: 'offline',
        prompt: 'consent',
        state,
      });
    case 'x':
      return q('https://x.com/i/oauth2/authorize', {
        response_type: 'code',
        client_id: env('X_CLIENT_ID'),
        redirect_uri: redirect,
        scope: 'tweet.read tweet.write users.read media.write offline.access',
        state,
        code_challenge: challenge,
        code_challenge_method: 'S256',
      });
    default:
      throw new Error(`${platform} does not use OAuth.`);
  }
}

export async function exchange(platform: Platform, code: string, redirect: string, verifier: string): Promise<Connected> {
  if (platform === 'facebook' || platform === 'instagram') {
    const short = await json(
      await fetch(`${GRAPH}/oauth/access_token?${form({ client_id: env('META_APP_ID'), client_secret: env('META_APP_SECRET'), redirect_uri: redirect, code })}`),
    );
    const long = await json(
      await fetch(
        `${GRAPH}/oauth/access_token?${form({ grant_type: 'fb_exchange_token', client_id: env('META_APP_ID'), client_secret: env('META_APP_SECRET'), fb_exchange_token: short.access_token })}`,
      ),
    );
    const me = await json(await fetch(`${GRAPH}/me?fields=id,name,picture{url}&access_token=${long.access_token}`));
    const fields = 'id,name,username,access_token,picture{url},followers_count,instagram_business_account{id,username,name,profile_picture_url,followers_count}';
    const accounts = await json(await fetch(`${GRAPH}/me/accounts?fields=${fields}&limit=100&access_token=${long.access_token}`));
    // Page tokens derived from a long-lived user token don't expire.
    const pages: Page[] =
      platform === 'facebook'
        ? accounts.data.map((p: any) => ({
            id: `facebook:${p.id}`,
            external_id: p.id,
            name: p.name,
            handle: p.username ?? p.id,
            avatar: p.picture?.data?.url ?? '',
            followers: p.followers_count ?? 0,
            kind: 'page',
            token: { access_token: p.access_token },
          }))
        : accounts.data
            .filter((p: any) => p.instagram_business_account)
            .map((p: any) => {
              const ig = p.instagram_business_account;
              return {
                id: `instagram:${ig.id}`,
                external_id: ig.id,
                name: ig.name ?? ig.username,
                handle: ig.username,
                avatar: ig.profile_picture_url ?? '',
                followers: ig.followers_count ?? 0,
                kind: 'profile',
                token: { access_token: p.access_token },
              };
            });
    if (!pages.length) throw new Error(platform === 'facebook' ? 'No Facebook Pages found on this account.' : 'No Instagram professional account is linked to your Pages.');
    return { externalId: me.id, name: me.name, avatar: me.picture?.data?.url, pages };
  }
  if (platform === 'tiktok') {
    const t = await json(
      await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form({ client_key: env('TIKTOK_CLIENT_KEY'), client_secret: env('TIKTOK_CLIENT_SECRET'), code, grant_type: 'authorization_code', redirect_uri: redirect, code_verifier: verifier }),
      }),
    );
    const token = { access_token: t.access_token, refresh_token: t.refresh_token, expires_at: expiresIn(t.expires_in) };
    const u = (
      await json(
        await fetch('https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,username,avatar_url,follower_count', {
          headers: { Authorization: `Bearer ${t.access_token}` },
        }),
      )
    ).data.user;
    return {
      externalId: u.open_id,
      name: u.display_name,
      avatar: u.avatar_url,
      token,
      pages: [{ id: `tiktok:${u.open_id}`, external_id: u.open_id, name: u.display_name, handle: u.username ?? '', avatar: u.avatar_url ?? '', followers: u.follower_count ?? 0, kind: 'profile' }],
    };
  }
  if (platform === 'youtube') {
    const t = await json(
      await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        body: form({ client_id: env('YOUTUBE_CLIENT_ID'), client_secret: env('YOUTUBE_CLIENT_SECRET'), code, grant_type: 'authorization_code', redirect_uri: redirect }),
      }),
    );
    const token = { access_token: t.access_token, refresh_token: t.refresh_token, expires_at: expiresIn(t.expires_in) };
    const ch = await json(await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true', { headers: { Authorization: `Bearer ${t.access_token}` } }));
    if (!ch.items?.length) throw new Error('This Google account has no YouTube channel.');
    const c = ch.items[0];
    return {
      externalId: c.id,
      name: c.snippet.title,
      avatar: c.snippet.thumbnails?.default?.url,
      token,
      pages: [
        {
          id: `youtube:${c.id}`,
          external_id: c.id,
          name: c.snippet.title,
          handle: (c.snippet.customUrl ?? c.id).replace(/^@/, ''),
          avatar: c.snippet.thumbnails?.default?.url ?? '',
          followers: Number(c.statistics?.subscriberCount ?? 0),
          kind: 'channel',
        },
      ],
    };
  }
  if (platform === 'x') {
    const t = await json(
      await fetch('https://api.x.com/2/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: `Basic ${btoa(`${env('X_CLIENT_ID')}:${env('X_CLIENT_SECRET')}`)}` },
        body: form({ code, grant_type: 'authorization_code', redirect_uri: redirect, code_verifier: verifier }),
      }),
    );
    const token = { access_token: t.access_token, refresh_token: t.refresh_token, expires_at: expiresIn(t.expires_in) };
    const u = (await json(await fetch('https://api.x.com/2/users/me?user.fields=profile_image_url,public_metrics', { headers: { Authorization: `Bearer ${t.access_token}` } }))).data;
    return {
      externalId: u.id,
      name: `@${u.username}`,
      avatar: u.profile_image_url,
      token,
      pages: [{ id: `x:${u.id}`, external_id: u.id, name: u.name, handle: u.username, avatar: u.profile_image_url ?? '', followers: u.public_metrics?.followers_count ?? 0, kind: 'profile' }],
    };
  }
  throw new Error(`${platform} does not use OAuth.`);
}

/** Refresh an expiring token (TikTok, YouTube, X). Returns null when no refresh is needed. */
export async function refresh(platform: Platform, t: Token): Promise<Token | null> {
  if (!t.expires_at || new Date(t.expires_at).getTime() > Date.now() || !t.refresh_token) return null;
  const r =
    platform === 'tiktok'
      ? await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: form({ client_key: env('TIKTOK_CLIENT_KEY'), client_secret: env('TIKTOK_CLIENT_SECRET'), grant_type: 'refresh_token', refresh_token: t.refresh_token }),
        })
      : platform === 'youtube'
        ? await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            body: form({ client_id: env('YOUTUBE_CLIENT_ID'), client_secret: env('YOUTUBE_CLIENT_SECRET'), grant_type: 'refresh_token', refresh_token: t.refresh_token }),
          })
        : await fetch('https://api.x.com/2/oauth2/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: `Basic ${btoa(`${env('X_CLIENT_ID')}:${env('X_CLIENT_SECRET')}`)}` },
            body: form({ grant_type: 'refresh_token', refresh_token: t.refresh_token }),
          });
  const d = await json(r);
  return { access_token: d.access_token, refresh_token: d.refresh_token ?? t.refresh_token, expires_at: expiresIn(d.expires_in) };
}

/* ───────── Telegram (bot token, no OAuth) ───────── */

const tg = async (method: string, params: Record<string, unknown>) => {
  const d = await json(
    await fetch(`https://api.telegram.org/bot${env('TELEGRAM_BOT_TOKEN')}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    }),
  );
  if (!d.ok) throw new Error(d.description ?? 'Telegram error');
  return d.result;
};

/** Link a channel the bot administers. `channel` is @username or a numeric chat id. */
export async function connectTelegram(channel: string): Promise<Connected> {
  const chat_id = /^-?\d+$/.test(channel) ? channel : `@${channel.replace(/^@/, '')}`;
  const bot = await tg('getMe', {});
  const chat = await tg('getChat', { chat_id });
  const member = await tg('getChatMember', { chat_id, user_id: bot.id });
  if (member.status !== 'administrator' || !member.can_post_messages) throw new Error(`Make @${bot.username} an admin of ${chat.title} with “Post messages” enabled, then try again.`);
  const count = await tg('getChatMemberCount', { chat_id }).catch(() => 0);
  return {
    externalId: String(bot.id),
    name: `@${bot.username}`,
    pages: [{ id: `telegram:${chat.id}`, external_id: String(chat.id), name: chat.title, handle: chat.username ?? String(chat.id), avatar: '', followers: count, kind: 'channel' }],
  };
}

/* ───────── Publishing ───────── */

type Payload = Record<string, any>;

async function graph(path: string, token: string, body: Record<string, unknown>) {
  return json(await fetch(`${GRAPH}/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, access_token: token }) }));
}

async function facebook(p: Payload, token: string): Promise<Result> {
  const page = p.pageId;
  const media: { url: string; type: string }[] = p.media ?? [];
  let id: string;
  if (p.kind === 'text') id = (await graph(`${page}/feed`, token, { message: p.message })).id;
  else if (p.kind === 'photo') id = (await graph(`${page}/photos`, token, { url: media[0].url, caption: p.message })).post_id;
  else if (p.kind === 'album') {
    const ids = [];
    for (const m of media) ids.push((await graph(`${page}/photos`, token, { url: m.url, published: false })).id);
    id = (await graph(`${page}/feed`, token, { message: p.message, attached_media: ids.map((media_fbid) => ({ media_fbid })) })).id;
  } else if (p.kind === 'video') id = (await graph(`${page}/videos`, token, { file_url: media[0].url, description: p.message })).id;
  else if (p.kind === 'story' && media[0]?.type !== 'video') {
    const photo = await graph(`${page}/photos`, token, { url: media[0].url, published: false });
    id = (await graph(`${page}/photo_stories`, token, { photo_id: photo.id })).post_id;
  } else {
    // Reels and video stories: start → hosted upload by URL → finish.
    const edge = p.kind === 'reel' ? 'video_reels' : 'video_stories';
    const start = await graph(`${page}/${edge}`, token, { upload_phase: 'start' });
    await json(await fetch(`https://rupload.facebook.com/video-upload/v23.0/${start.video_id}`, { method: 'POST', headers: { Authorization: `OAuth ${token}`, file_url: media[0].url } }));
    await graph(`${page}/${edge}`, token, { upload_phase: 'finish', video_id: start.video_id, video_state: 'PUBLISHED', description: p.message });
    id = start.video_id;
  }
  return { status: 'published', remoteId: id, url: `https://www.facebook.com/${id}` };
}

async function instagram(p: Payload, token: string): Promise<Result> {
  const ig = p.igUserId;
  const container = async (body: Record<string, unknown>) => {
    const c = await graph(`${ig}/media`, token, body);
    // Video containers process asynchronously.
    for (let i = 0; i < 60; i++) {
      const s = await json(await fetch(`${GRAPH}/${c.id}?fields=status_code&access_token=${token}`));
      if (s.status_code === 'FINISHED' || !s.status_code) return c.id;
      if (s.status_code === 'ERROR') throw new Error('Instagram could not process this media.');
      await sleep(3000);
    }
    throw new Error('Instagram media processing timed out.');
  };
  const item = (m: any, extra: Record<string, unknown> = {}) =>
    m.video_url ? { media_type: extra.media_type ?? 'VIDEO', video_url: m.video_url, ...extra } : { image_url: m.image_url, ...extra };
  let creation: string;
  if (p.mediaType === 'CAROUSEL') {
    const children = [];
    for (const m of p.items) children.push(await container(item(m, { is_carousel_item: true })));
    creation = await container({ media_type: 'CAROUSEL', children: children.join(','), caption: p.caption });
  } else if (p.mediaType === 'REELS') creation = await container({ media_type: 'REELS', video_url: p.items[0].video_url, caption: p.caption });
  else if (p.mediaType === 'STORIES') creation = await container({ media_type: 'STORIES', ...(p.items[0].video_url ? { video_url: p.items[0].video_url } : { image_url: p.items[0].image_url }) });
  else creation = await container({ image_url: p.items[0].image_url, caption: p.caption });
  const published = await graph(`${ig}/media_publish`, token, { creation_id: creation });
  if (p.firstComment) await graph(`${published.id}/comments`, token, { message: p.firstComment }).catch(() => {});
  const link = await json(await fetch(`${GRAPH}/${published.id}?fields=permalink&access_token=${token}`)).catch(() => ({}));
  return { status: 'published', remoteId: published.id, url: link.permalink };
}

async function tiktok(p: Payload, token: string): Promise<Result> {
  const auth = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json; charset=UTF-8' };
  // Unaudited apps may only post privately; fall back to the first privacy level TikTok allows.
  const creator = (await json(await fetch('https://open.tiktokapis.com/v2/post/publish/creator_info/query/', { method: 'POST', headers: auth }))).data;
  const levels: string[] = creator.privacy_level_options ?? [];
  const post_info = { ...p.post_info, privacy_level: levels.includes(p.post_info.privacy_level) ? p.post_info.privacy_level : (levels.includes('SELF_ONLY') ? 'SELF_ONLY' : levels[0]) };
  if (p.media_type !== 'VIDEO') {
    // Photos can only be pulled from a TikTok-verified domain.
    const init = await json(await fetch('https://open.tiktokapis.com/v2/post/publish/content/init/', { method: 'POST', headers: auth, body: JSON.stringify({ ...p, post_info }) }));
    return { status: 'published', remoteId: init.data.publish_id };
  }
  // Videos: upload the bytes ourselves (FILE_UPLOAD) so no domain verification is needed.
  const file = await fetch(p.source_info.video_url);
  if (!file.ok) throw new Error('Could not download the video from storage.');
  const bytes = new Uint8Array(await file.arrayBuffer());
  const size = bytes.length;
  const MB = 1024 * 1024;
  const chunk = size <= 64 * MB ? size : 10 * MB; // last chunk absorbs the remainder
  const count = Math.max(1, Math.floor(size / chunk));
  const init = await json(
    await fetch('https://open.tiktokapis.com/v2/post/publish/video/init/', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ post_info, source_info: { source: 'FILE_UPLOAD', video_size: size, chunk_size: chunk, total_chunk_count: count } }),
    }),
  );
  for (let i = 0; i < count; i++) {
    const from = i * chunk;
    const to = i === count - 1 ? size : from + chunk;
    const res = await fetch(init.data.upload_url, {
      method: 'PUT',
      headers: { 'Content-Type': file.headers.get('content-type') ?? 'video/mp4', 'Content-Range': `bytes ${from}-${to - 1}/${size}` },
      body: bytes.slice(from, to),
    });
    if (!res.ok) throw new Error(`TikTok upload failed (${res.status}).`);
  }
  return { status: 'published', remoteId: init.data.publish_id };
}

async function youtube(p: Payload, token: string): Promise<Result> {
  const video = await fetch(p.videoUrl);
  if (!video.ok) throw new Error('Could not download the video from storage.');
  const bytes = new Uint8Array(await video.arrayBuffer());
  const start = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json; charset=UTF-8',
      'X-Upload-Content-Type': video.headers.get('content-type') ?? 'video/mp4',
      'X-Upload-Content-Length': String(bytes.length),
    },
    body: JSON.stringify({ snippet: p.snippet, status: p.status }),
  });
  if (!start.ok) await json(start);
  const done = await json(await fetch(start.headers.get('location')!, { method: 'PUT', headers: { 'Content-Type': video.headers.get('content-type') ?? 'video/mp4' }, body: bytes }));
  return { status: 'published', remoteId: done.id, url: `https://www.youtube.com/watch?v=${done.id}` };
}

async function x(p: Payload, token: string, handle: string): Promise<Result> {
  const media_ids: string[] = [];
  for (const url of p.mediaUrls ?? []) {
    const file = await fetch(url);
    const type = file.headers.get('content-type') ?? 'image/jpeg';
    const blob = await file.blob();
    if (type.startsWith('video')) {
      const auth = { Authorization: `Bearer ${token}` };
      const init = await json(
        await fetch('https://api.x.com/2/media/upload/initialize', {
          method: 'POST',
          headers: { ...auth, 'Content-Type': 'application/json' },
          body: JSON.stringify({ media_type: type, total_bytes: blob.size, media_category: 'tweet_video' }),
        }),
      );
      const id = init.data.id;
      const chunk = 4 * 1024 * 1024;
      for (let i = 0, seg = 0; i < blob.size; i += chunk, seg++) {
        const fd = new FormData();
        fd.append('media', blob.slice(i, i + chunk));
        fd.append('segment_index', String(seg));
        await fetch(`https://api.x.com/2/media/upload/${id}/append`, { method: 'POST', headers: auth, body: fd });
      }
      let info = (await json(await fetch(`https://api.x.com/2/media/upload/${id}/finalize`, { method: 'POST', headers: auth }))).data.processing_info;
      while (info && (info.state === 'pending' || info.state === 'in_progress')) {
        await sleep((info.check_after_secs ?? 2) * 1000);
        info = (await json(await fetch(`https://api.x.com/2/media/upload?command=STATUS&media_id=${id}`, { headers: auth }))).data.processing_info;
      }
      if (info?.state === 'failed') throw new Error('X could not process the video.');
      media_ids.push(id);
    } else {
      const fd = new FormData();
      fd.append('media', blob);
      fd.append('media_category', 'tweet_image');
      media_ids.push((await json(await fetch('https://api.x.com/2/media/upload', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd }))).data.id);
    }
  }
  const tweet = await json(
    await fetch('https://api.x.com/2/tweets', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: p.text, ...(media_ids.length ? { media: { media_ids } } : {}), ...(p.reply_settings ? { reply_settings: p.reply_settings } : {}) }),
    }),
  );
  return { status: 'published', remoteId: tweet.data.id, url: `https://x.com/${handle}/status/${tweet.data.id}` };
}

async function telegram(p: Payload): Promise<Result> {
  const { method, pin, ...params } = p;
  const sent = await tg(method, params);
  const msg = Array.isArray(sent) ? sent[0] : sent;
  if (pin) await tg('pinChatMessage', { chat_id: params.chat_id, message_id: msg.message_id, disable_notification: params.disable_notification }).catch(() => {});
  const username = msg.chat?.username;
  return { status: 'published', remoteId: String(msg.message_id), url: username ? `https://t.me/${username}/${msg.message_id}` : undefined };
}

export async function publish(platform: Platform, payload: Payload, token: string | null, handle: string): Promise<Result> {
  try {
    const r =
      platform === 'telegram'
        ? await telegram(payload)
        : platform === 'facebook'
          ? await facebook(payload, token!)
          : platform === 'instagram'
            ? await instagram(payload, token!)
            : platform === 'tiktok'
              ? await tiktok(payload, token!)
              : platform === 'youtube'
                ? await youtube(payload, token!)
                : await x(payload, token!, handle);
    return { ...r, publishedAt: new Date().toISOString() };
  } catch (e) {
    return { status: 'failed', error: { message: e instanceof Error ? e.message : 'Publishing failed.', retryable: true } };
  }
}
