# Security release deployed to outpost — 9 November 2026

Supersedes the "not deployed" status in [launch-runbook.md](launch-runbook.md) and [external-users-approval-2026-11-02.md](external-users-approval-2026-11-02.md). Owner approved the backup → maintenance → migration sequence in chat.

Project `pdecqyjanliqocfigkvd` (outpost, org Muffy). Repo is linked with the Supabase CLI.

## What ran (UTC, in order)

1. Read-only preflight: data identical to the 30 Oct inventory (4 users, 3 accounts, 8 Pages, 6 posts, 8 tokens, 16 OAuth states, 11 media; last post change 9 Oct).
2. Encrypted backup `migration-2026-11-09T02-47-14-208Z.mpb` (SHA-256 `e9d4fc89824792c2ed9be3cb44cbf0cb7a1a0d2f65356d1521028dd926351f4b`) in the private `work/launch/private-backup-2026-11-09/` folder outside the repo; key stored beside it (0600). Round-trip and 11 media checksums verified. Scope: migration-affected app data, media and schema metadata, not full Auth/Vault DR.
3. Local rehearsal against that backup passed (freeze/thaw, rollback, fresh restore, migration; 22 destinations remapped).
4. `db push --dry-run`: only `20261030094002_security_isolation_oauth.sql` pending.
5. Secrets added: `TOKEN_ENCRYPTION_KEY`, `PUBLIC_API_URL`, `OAUTH_REDIRECT_ALLOWLIST`, `WEB_ORIGIN_ALLOWLIST` (empty), `MAINTENANCE_MODE=true`, `PUBLISH_MODE=disabled`, `FACEBOOK_POST_MANAGEMENT=false`, `AI_ENABLED=false`. Existing Meta/cron secrets untouched.
6. `api` deployed as v14 (`--no-verify-jwt --use-api`); every route returned `MAINTENANCE`.
7. `publish-due-posts` cron set inactive. `release-freeze.sql` applied; counts rechecked unchanged.
8. Migration applied. Verified: history has all 3 migrations; RLS on all 10 public tables; `social_tokens` is `sealed` and empty; OAuth states empty; `media` bucket private; no `anon` grants; 6 posts (4 draft, 1 failed, 1 published), 3 accounts, 8 Pages, 11 media preserved.
9. `release-thaw.sql` applied (0 freeze policies). `MAINTENANCE_MODE=false`.
10. Live probes: unauthenticated `capabilities` 401, bad cron secret 403, unsigned data-deletion 403, unknown deletion code 400, invalid OAuth state 400.

## Later the same day (owner-approved in chat)

11. Owner confirmed MultiPostly is a Smile Media company project; `website/legal.config.json` `operatorConfirmed` set true.
12. Meta Business Verification for SMILE MEDIA CO., LTD. submitted (document route; smilemedia.tv domain verified by Cloudflare DNS TXT `facebook-domain-verification=…`, which must stay). Meta review ~2 working days.
13. Meta Login for Business: deauthorize callback `…/functions/v1/api/deauthorize` and data deletion URL `…/functions/v1/api/data-deletion` set. Redirect URI `…/api/callback` confirmed.
14. Owner approved "publishing on for all users": `PUBLISH_MODE=public`; `publish-due-posts` cron re-enabled; first call to v14 returned 200 `{"processed":0}`. `FACEBOOK_POST_MANAGEMENT` and `AI_ENABLED` stay false.
15. Live iOS build 5 (client contract `2026-11-01.security.3`, outpost) archived locally and uploaded to App Store Connect/TestFlight. Builds 1/3/4 are old clients and are refused by the new API.
16. Live client shows only Facebook and Instagram (`src/config/platforms.ts`); the demo still shows all six.
17. support@smilemedia.tv created with Cloudflare Email Routing (MX/SPF/DKIM added to smilemedia.tv; forwards to smilemediabusinesses@gmail.com; receive-only). Owner approved.
18. Legal pages finalized (draft wording removed; `legal.config.json` status approved, effective 2026-11-09, contact support@smilemedia.tv) and owner-approved. `check:policies` passes. Website rebuilt with `build:all`, site/app checks passed, prebuilt `out/` deployed to Vercel production `multipostly-site`; `/privacy/`, `/terms/`, `/data-deletion/`, `/support/` return 200.
19. Meta app Basic settings: Privacy URL, Terms URL and data deletion callback saved. Only the 1024px app icon remains flagged.

## Current state

- Backend usable for sign-in, account connection and publishing for anyone who can connect. Until Meta grants Advanced Access, only people with a role on Meta app 1076171658459706 can connect Facebook/Instagram.
- The 3 existing social connections must be reconnected (fresh consent).
- Not done: Meta app icon upload, Meta app contact email review, real phone OAuth/publish test and recordings, App Review submission (after Business Verification approval).
