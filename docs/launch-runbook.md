# MultiPostly launch gate — 30 October 2026

For the 1 November browser audit, current Meta Business/Tech Provider/App Review gates, and subsequent local fixes, see [meta-access-2026-11-01.md](meta-access-2026-11-01.md). The production inventory and backup evidence below remain dated observations.

**NO-GO for a public production launch.** Local preparation continues from `cf18c74`. The security migration and API in that commit have not been deployed. This run made no production schema, secret, cron, deployment, ownership or verification changes, and published no Facebook posts.

The owner's latest instruction is to keep Smile Media paused and MultiPostly resumed. Current project states: `rcfpzphrdjlekldfcjlk` INACTIVE; `pdecqyjanliqocfigkvd` ACTIVE_HEALTHY. Smile Media's home page returns 200 but references the paused backend; its Apple auth-provider route returns 503 `auth_unavailable`, and the paused backend fails DNS resolution. Its database-dependent production services remain affected. Do not resume it or pause another project without a new instruction.

## Verified production inventory

Read-only SQL matched the two initial migrations; only `20261030094002_security_isolation_oauth.sql` is pending. A real `supabase db push --dry-run --skip-vault --linked --project-ref pdecqyjanliqocfigkvd` confirmed exactly that migration without applying it.

| Item | Observed |
| --- | --- |
| Database / API | PostgreSQL 17.11; `api` v11; `verify_jwt=false` |
| Data | 4 Auth users, 3 connected accounts (Facebook, Instagram, TikTok), 8 Pages, 6 posts |
| Post status | 4 drafts, 1 failed, 1 published; no currently scheduled/publishing posts |
| Credentials | 8 legacy plaintext token rows, 16 pending OAuth states; values were never printed |
| Integrity | 0 account/Page ownership mismatches; 0 orphan credentials |
| Media | 11 objects; bucket public, no bucket-specific MIME/size restrictions |
| Scheduler | `publish-due-posts` active every minute; Vault API URL matches this project |
| RLS | Enabled on all five app tables; legacy owner policies remain; credentials have no client RLS policies |
| Advisors | `pg_net` in public schema; leaked-password protection disabled |
| Auth settings | Apple/email enabled; Google disabled; email auto-confirm enabled |
| Platform backups | Listing returned no restorable backups; PITR disabled |

The healthy project status does not mean the security fixes are deployed. Existing global connection IDs, plaintext server-side token columns and public draft media remain launch blockers. This audit found no ownership anomaly; it is not a forensic proof that credentials were never exposed.

## Backup and rehearsal evidence

Private artifacts are outside this repository and public reports, under this chat's `work/launch/private-backup-stable/`. AES-256-GCM snapshot `migration-2026-10-30T10-53-22-262Z.mpb` has SHA-256 `19b89d7a6098355843c533870547132e36b0fc211f36ee7fe5da65e2c55bbb2d`. It was captured at 10:53:04 UTC and rechecked at 10:53:21 UTC, with unchanged app rows, Auth IDs, migration history and object metadata across downloads. It includes all five affected tables, schema metadata and all 11 media objects (23,654,028 bytes). Directory mode is 0700 and backup/key files 0600. The key is a separate local file; move a protected copy into separately controlled secure storage before any deployment. Do not attach it to a report or commit it.

The deployed v11 function source was downloaded read-only to a private directory and separately encrypted using the same backup key. Its verified encrypted checksum is `c62c1f5c3e5743d94e77c2a22154e6a7ea20d1c10ffaa000e972822ef4946fc2` (four source files). No deployed secret values are included by the function-download operation.

Actual local PostgreSQL-engine rehearsal restored all original rows exactly, exercised the restrictive freeze/thaw policies, applied and rolled back the pending migration transaction, committed it locally, and restored the original snapshot into a fresh local database. It retained 3 accounts, 8 Pages and 6 posts, correctly remapped all 22 saved destinations, and cleared 8 unproven credentials plus 16 OAuth states. All 11 media checksums passed.

**Scope limit:** this is a verified migration-targeted application/media/source backup, not a full Auth/Vault/platform disaster-recovery backup. Auth and Storage service schemas are stubbed in PGlite; actual hosted Auth, object-store restore, pg_cron, Edge Function redeployment and post-commit production recovery have not been rehearsed. A fresh backup under maintenance and a full hosted recovery rehearsal are required before approving production migration. A new isolated project, paid backup/PITR or plan change requires separate approval; do not free a project slot by pausing another production service.

Read-only/local commands, run from the repository:

```sh
supabase db query --linked --project-ref pdecqyjanliqocfigkvd --file scripts/production-inspection.sql --output-format json
supabase db push --dry-run --skip-vault --linked --project-ref pdecqyjanliqocfigkvd
npm run backup:migration -- /absolute/private/work/launch/backup
npm run rehearse:migration -- /absolute/private/work/launch/backup/migration-TIMESTAMP.manifest.json
```

The inspection prints schema/count metadata only. The backup tool captures credential-bearing SQL in memory and encrypts it before writing. It refuses captures if data changes during download. Rehearsal errors suppress raw SQL parameters and credentials. Public-media backup transport is intentionally limited to this project's current public bucket; it must fail closed after the bucket becomes private.

## Approval-gated production sequence

Every write in this sequence remains unapproved. First finish the hosted recovery rehearsal, decide how residual advisories will be resolved, and agree the downtime, client version transition and support contact.

1. Verify the exact project again. Stop only MultiPostly's job with `select cron.alter_job((select jobid from cron.job where jobname='publish-due-posts'), active := false);`. Preserve the prior active/schedule metadata. Prepare a full platform backup and protect its key material separately; do not print Vault values.
2. Apply the private new server additions with `supabase secrets set --project-ref pdecqyjanliqocfigkvd --env-file /private/server-additions.env`. This file must include `MAINTENANCE_MODE=true`. Keep the existing Meta and cron secrets. Deploy the prepared function with `supabase functions deploy api --project-ref pdecqyjanliqocfigkvd --no-verify-jwt --use-api`. Confirm all functional routes return 503 `MAINTENANCE`. The gate executes before DB/Meta access, so it can stage against the legacy schema. Allow already-running requests to finish and verify no publish is in flight; a request already sent to Meta cannot be cancelled.
3. Execute `scripts/release-freeze.sql` against this project. Its named restrictive policies stop direct client access to posts, accounts, Pages and this media bucket while service-role backup/migration remains available. Independently verify a normal user's writes are denied; pause new sign-ups for the agreed backup window if a full Auth snapshot requires it. Take a fresh encrypted snapshot, run the rehearsal again, and compare the inventory against this report. Abort for unexpected drift.
4. Run the reviewed dry run again, then the approved `supabase db push --skip-vault --linked --project-ref pdecqyjanliqocfigkvd`. Confirm migration history, owner constraints, policies/grants, encrypted token columns, private media, preserved posts/destinations and empty old credentials/states. The migration is incompatible with the old app/API.
5. Remove only this release's access freeze using `scripts/release-thaw.sql`. Set `MAINTENANCE_MODE=false` only for the approved controlled test window; keep cron stopped. Restrict distribution to named developer/test accounts. Verify `capabilities` returns `2026-10-30.security.1` after authentication, then test isolation, private media, reconnect, disconnect and deletion on disposable accounts. These tests mutate test data and may revoke test grants; obtain the agreed test-account authorization first. No public Page publication is included in migration approval.
6. Complete real device/OAuth tests, deploy approved final legal notices/callback settings, and validate the matching live mobile build. Keep public launch closed until every gate passes. Re-enable `publish-due-posts` with the same `cron.alter_job(..., active := true)` only after a separate decision; verify its existing Vault URL/secret alignment without displaying values. Monitor pending deletion jobs, failures and ambiguous `publish_attempts`.

Rollback procedure:

- Before the database migration commits, an SQL failure should abort the migration transaction. The explicit BEGIN/migration/ROLLBACK path passed locally. Inspect the real migration history and schema before reopening access; do not assume a failed CLI request proves rollback.
- If maintenance deployment is abandoned before migration, keep the gate/freeze and cron stopped while inspecting state. The encrypted v11 source and unchanged legacy snapshot provide an emergency baseline, but redeploying v11 reintroduces known weaknesses. That rollback needs explicit approval, an authenticated restore/deploy procedure and validation; it is not the default recovery.
- After migration commits, keep maintenance/freeze and cron stopped, capture the failed state privately, and prefer a reviewed forward repair on the secured schema. Do not run old v11 against it. Do not mark migration history reverted without restoring compatible schema/data. For true database rollback, first restore the full preflight platform backup into an approved isolated target, restore missing object bytes using authenticated Storage APIs, verify Auth/Vault/key material and exact app data, and validate the matching old source there. A production overwrite/cutover is separately approval-gated. No hosted post-commit rollback is currently verified, so migration remains NO-GO.
- Reconcile every external post attempted during a test window against the actual Page before any restore/retry. A database rollback cannot undo a Facebook post. Preserve the post-migration publish ledger and deletion requests; never resurrect deleted users or replay historical publications from a backup.

Reconnection/recovery: the migration deliberately expires all 3 existing accounts and deletes all legacy credentials and pending OAuth flows. Each owner must sign in and reconnect using fresh consent. Global IDs become owner-scoped IDs; saved Page destinations were verified locally. Preserve all 6 posts and manually check the previously published post on its platform. There are currently no scheduled/publishing rows; if new ones appear before rollout, the migration converts them to drafts and clears schedule times. Never automatically catch up overdue jobs. Review dates/time zones, reconnect every selected Page, confirm content, and reschedule individually only at the owner's request.

## Mobile, Meta and environment gates

SDK 57 development-client dependency/plugin and EAS development/demo/live/production profiles are prepared. The existing iOS bundle ID `com.chhunsour.outpost` and `outpost`/`multipostly` schemes are preserved. Android now has that same package ID, overridable by the known existing store identifier; verify the actual Play identity before signing. `start:device` uses LAN. EAS excludes all env files, backend, backup scripts and private artifacts. Live config rejects a different project, a missing public key and privileged JWT roles. A live client compatibility check prevents content/account operations against the old backend.

The private `work/launch/private-config/mobile.env` contains the actual project's public publishable key; `server-additions.env` contains a new valid 32-byte base64 encryption-key candidate and exact API/redirect requirements, initially in maintenance mode. Files are 0600 and were not applied. The Meta App ID matches the expected configured ID `1076171658459706`; its App Secret and existing cron secret were not read, changed or rotated. The presence of a secret name/digest does not prove that credential is valid at Meta. Hosted `SUPABASE_URL`/service-role credentials stay server-only. Retain the encryption key securely for the life of its encrypted tokens. Google auth is disabled remotely despite its current button; use email for Android testing or separately approve/configure Google. Confirm email-verification, password-recovery, SMTP and abuse-protection settings before public registration. Password-reset UI and native privacy/terms links are still missing. Do not run `supabase config push` with the development config.

Device workflow after build authorization: link the existing correct EAS project, validate store identities/signing accounts, register the test iPhone if needed, then `npx eas-cli@latest build --platform all --profile development`. Start `npm run start:device` on the same trusted LAN. Use `preview-demo` for an installable standalone demo or `preview-live` with the private public-only environment after backend deployment. These profiles are prepared, not generated IPA/APK files. No EAS cloud build/upload, project creation, signing change or charge was initiated. Android adb sees no attached devices; local Xcode tools are blocked by an unaccepted license. No legal agreement was accepted.

On both real phones: launch/cold start, email sign-in/out, relaunch/secure session recovery, browser cancellation and return to the exact callback, expired/replayed state, two users with the same controlled Page, permission narrowing/revocation, private photo/video upload and preview, foreground/background interruption, per-Page failures, duplicate request, disconnect and disposable-account deletion. Test Apple on iPhone, email on Android. Verify package/scheme routing on release-like builds, not only Expo Go.

Facebook remains a direct Graph integration with the existing three Page scopes (`pages_show_list`, `pages_read_engagement`, `pages_manage_posts`); no third-party publishing provider was added. Business Verification remains unresolved, and no Advanced Access is assumed. No review, legal terms, CAPTCHA or ownership changes were made. Fresh OAuth/Page/publish authorization cannot be certified against the old deployed API. Existing stored end-user tokens were not reused as test credentials. Use only explicitly named existing app-role/test accounts and Pages with currently granted permissions after the approved test deployment. Local mocked Graph success is not real Meta success. Exact Graph v23 endpoint/version/media contracts still need confirmation; current official Meta documentation fetches returned 429.

The controlled App Review recording must show real mobile consent, eligible Page discovery (including multiple Pages), selected destinations, separately authorized test content, actual per-Page responses/permalinks, no duplicate publication, honest revoked/API failure, disconnect, disposable-user deletion and final public legal pages. No live post is authorized yet. Unknown/async remote publication reconciliation UI, remote post edit/delete, shared workspaces and Telegram owner verification remain missing. Optional providers/AI also require their own valid configuration and validation.

Live `https://multipostly-site.vercel.app/privacy/` and `/terms/` return 200 but remain draft/preview notices without final operator/contact/retention/jurisdiction details. `/data-deletion/` returns 404. The local deletion page and signed callback implementation build/test successfully but are not deployed; an invalid signed deletion probe currently returns the old API's 401. The OAuth callback rejects invalid state with 400. Final operator-approved notices, an accessible no-login deletion/support route, correct Meta callback URLs and real deletion evidence are required before App Review. No legal details were invented or submitted.

## Checks and remaining dependency advisories

36 automated tests passed, including existing actual PostgreSQL RLS/ownership/session/claim/deletion checks, mocked direct-Graph errors/expiry/revocation/multiple Pages, encrypted-backup tamper rejection, build configuration and maintenance route gating. Mobile lint, mobile/backend TypeScript, Deno lint/frozen check, website lint/typecheck/build, Expo Doctor (21/21), and iOS/Android/web JS exports passed. Exported Hermes bundles are not device-tested signed binaries.

Website audit: **0 vulnerabilities**, after `sharp` 0.35.5 and a scoped `serve → compression` 1.8.2 override; image transformation smoke and website production build passed. Mobile audit: **11 package reports (6 high, 5 low)** across three advisory sources. `decode-uri-component` 0.2.2 is pulled through router/query-string; the patched 0.5.1 is ESM and is not a safe untested override for that dependency chain. Zod 3 is used by Expo CLI; the fix is Zod 4.6.6+, requiring upstream/compatibility work. `deepmerge` 4.3.1 has no patched version in the audit. Do not force an SDK major change or downgrade as an audit shortcut. Resolve or explicitly accept the remaining reviewed exposure before public launch, including untrusted deep-link input.

Primary references: [Supabase backups](https://supabase.com/docs/guides/platform/backups), [Expo SDK 57 DevClient](https://docs.expo.dev/versions/v57.0.0/sdk/dev-client/), [EAS profiles](https://docs.expo.dev/build/eas-json/), [decoder advisory](https://github.com/advisories/GHSA-qr28-fpjm-wq7f), [Zod advisory](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5).

Authorization still needed: full hosted backup/recovery target and any cost; maintenance/cron/access-freeze operations; new server configuration and destructive security migration; API/website/mobile deployments and EAS builds; named developer/test-account consent and disposable-data deletion; exact Page IDs/content for any real post; callback/provider/auth-hardening changes; final policy details and support route. Pushes and any production secret rotation remain separately unapproved. Smile Media must remain paused unless the owner changes that instruction.
