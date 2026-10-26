# MultiPostly 📱

<p align="center">
  <sub>Developed by <strong>Seng Chhunsour</strong></sub>
</p>

<p align="center">
  <a href="https://github.com/Chhunsour"><img src="https://img.shields.io/badge/Author-Seng%20Chhunsour-FF5A1F?style=flat-square&logo=github&logoColor=white" alt="Author: Seng Chhunsour" /></a>
  <img src="https://img.shields.io/badge/Framework-Expo%20%7C%20React%20Native-blue?style=flat-square&logo=expo&logoColor=white" alt="Expo & React Native" />
  <img src="https://img.shields.io/badge/Platforms-iOS%20%7C%20Android%20%7C%20Web-purple?style=flat-square" alt="Platforms" />
  <img src="https://img.shields.io/badge/Backend-Supabase-3ECF8E?style=flat-square&logo=supabase&logoColor=white" alt="Supabase" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="MIT License" />
</p>

Write once, publish everywhere. MultiPostly is a mobile app (Expo, React Native) for composing a post and publishing or scheduling it to **Facebook Pages, Instagram, TikTok, YouTube, X and Telegram**, with per-platform previews, captions and options.

## Modes

| Mode | `EXPO_PUBLIC_APP_MODE` | What runs |
| --- | --- | --- |
| Demo | `demo` (default) | Everything on the device with sample data. No backend, nothing is posted. |
| Live | `live` | Supabase: auth, Postgres, storage, and the `api` Edge Function that talks to the platforms. |

## Quick start (demo)

```bash
npm install
cp .env.example .env
npx expo start
```

## Live setup (Supabase)

1. Create a Supabase project, then link it and push the schema:
   ```bash
   supabase link --project-ref <ref>
   supabase db push
   ```
2. Fill `supabase/functions/.env` from `supabase/functions/.env.example` and deploy:
   ```bash
   supabase secrets set --env-file supabase/functions/.env
   supabase functions deploy api --no-verify-jwt
   ```
   `--no-verify-jwt` is required: the function checks the user's session itself, and OAuth callbacks arrive without one.
3. Turn on the scheduler (runs every minute through `pg_cron`). Use the same value as `CRON_SECRET`:
   ```sql
   select vault.create_secret('https://<ref>.supabase.co/functions/v1/api', 'api_url');
   select vault.create_secret('<CRON_SECRET>', 'cron_secret');
   ```
4. In `.env`, set `EXPO_PUBLIC_APP_MODE=live`, `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` (the publishable key).

### Connecting platforms

Every platform needs a developer app that you own. Set its OAuth redirect URI to
`https://<ref>.supabase.co/functions/v1/api/callback`.

| Platform | Where | Notes |
| --- | --- | --- |
| Facebook + Instagram | developers.facebook.com | One Meta app with Facebook Login. Instagram must be a professional account linked to a Page. Real users need App Review. |
| TikTok | developers.tiktok.com | Content Posting API. Unaudited apps can only post privately (`SELF_ONLY`), and URL pulls need a verified domain. |
| YouTube | console.cloud.google.com | Enable YouTube Data API v3 and create a "Web application" OAuth client. |
| X | developer.x.com | OAuth 2.0 with read and write permissions. |
| Telegram | @BotFather | Create a bot and make it an admin of your channel with "Post messages". |

## Architecture

```
src/app          screens (Expo Router)
src/lib/store    app state (Zustand); talks only to services
src/services     provider interfaces + demo and Supabase implementations
src/platforms    one adapter per network: limits, options, validation, preview, API payload
src/models       the data contract
supabase/        schema migrations + the `api` Edge Function (OAuth, publishing, AI, scheduler)
```

To use a different backend, implement the interfaces in `src/services/types.ts` and wire them up in `src/config/providers.ts`.

## Security

- Platform tokens and app secrets live only in the Edge Function and the `social_tokens` table. Row Level Security leaves that table with no client policies, so the app can never read it.
- The app only bundles public values (`EXPO_PUBLIC_*`). `.env` files are gitignored.
- Each user can read and write only their own rows and their own media folder.

---

## 👤 Author & Developer

**Developed by Seng Chhunsour**
- **GitHub:** [@Chhunsour](https://github.com/Chhunsour)
- **Repository:** [https://github.com/Chhunsour/smile-media](https://github.com/Chhunsour/smile-media)

---

## License

MIT
