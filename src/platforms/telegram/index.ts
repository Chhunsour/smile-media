import type { PlatformAdapter } from '../types';

/** Telegram channels via the Bot API. The bot must be an admin of each channel; its token stays on your backend. */
const telegram: PlatformAdapter = {
  id: 'telegram',
  name: 'Telegram',
  color: '#2AABEE',
  glyph: { name: 'paper-plane', brand: false },
  noun: 'Channel',
  audience: 'subscribers',
  limits: { caption: 4096, captionWithMedia: 1024, media: 10 },
  options: [
    { key: 'silent', label: 'Send silently', type: 'toggle', default: false, hint: 'Subscribers get a notification without sound.' },
    { key: 'pin', label: 'Pin in channel', type: 'toggle', default: false },
  ],
  // Bot API method + params; when pin is set, call pinChatMessage with the returned message_id.
  toPayload({ caption, media, options }, page) {
    const base = { chat_id: page.externalId ?? `@${page.handle}`, disable_notification: !!options.silent, pin: !!options.pin };
    if (media.length > 1) {
      return {
        ...base,
        method: 'sendMediaGroup',
        media: media.map((m, i) => ({ type: m.type === 'video' ? 'video' : 'photo', media: m.uri, caption: i ? undefined : caption })),
      };
    }
    if (media.length) {
      const video = media[0].type === 'video';
      return { ...base, method: video ? 'sendVideo' : 'sendPhoto', [video ? 'video' : 'photo']: media[0].uri, caption };
    }
    return { ...base, method: 'sendMessage', text: caption };
  },
  connection: { method: 'bot', scopes: [], serverEnv: ['TELEGRAM_BOT_TOKEN'], docs: 'https://core.telegram.org/bots/api' },
  demoErrors: ['The bot isn’t an admin in this channel anymore.', 'Request timed out. Telegram didn’t respond.'],
};

export default telegram;
