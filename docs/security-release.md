# MultiPostly security implementation and release evidence

30 October 2026. Repository: `/Users/chhunsour/Side Project/MultiPostly`.
This continues the earlier `implementation-tasks.md` inspection. Changes are local; the running API and database still use the old code/schema.

## Operational state and authorization

The user subsequently authorized: “pause smile media project and unpause on the multipost”. Through the signed-in Supabase dashboard, `smile-media` (`rcfpzphrdjlekldfcjlk`) was paused and `outpost` (`pdecqyjanliqocfigkvd`) resumed. The CLI confirmed **INACTIVE** and **ACTIVE_HEALTHY**, respectively. Both were Free projects; no billing plan, ownership, Meta settings, legal agreement, CAPTCHA, or permission review was changed. No push or deployment occurred.

Read-only inspection of restored `outpost` confirmed the five original public tables, RLS enabled on each, original owner policies, a public `media` bucket, and the enabled `publish-due-posts` cron job. There were **zero scheduled posts** at inspection. The applied migration shown in Studio is `media_upsert`. The live security advisor reports `extension_in_public` for `pg_net` and disabled leaked-password protection. Neither setting was changed.

## Findings and implemented controls

| Root cause | Local implementation |
| --- | --- |
| Global account/Page primary keys let a second app user overwrite ownership and credentials. Saves were several independent writes. | User + platform + external-account IDs; Page IDs include their owned account. One transactional `save_connection` RPC and composite owner/workspace foreign keys. Legacy destinations/payload keys are remapped. |
| Service-role token lookup omitted owner predicates; tokens were plaintext DB columns. | User, workspace and account predicates; AES-256-GCM envelopes with owner/record additional authenticated data; encryption key stays outside the database in Edge secrets. Legacy credentials are discarded and all connections require reconnect. No tokens are sent to clients. |
| Workspace was only a UI label and JWT/user metadata could be mistaken for authorization. | Each user has one server-created personal organization with `id = owner_id`. RLS requires the exact owner, organization, live Auth session and no pending deletion. Cross-organization reassignment is constrained. Shared/team workspaces and delegated roles remain unsupported; labels do not confer access. |
| OAuth ignored state insertion errors and age, accepted arbitrary return URLs, and did not bind flow to the login session. | State is random, stored hashed, consumed once, expires after ten minutes, and binds the initiating session and connection generation. Exact platform/return allowlists, required code, safe consent-denial messages and checked persistence. The mobile client verifies the returned state. Disconnect invalidates outstanding/in-progress saves. |
| PKCE was absent on Google’s code exchange. | S256 on Google/YouTube, TikTok and X plus Supabase Auth's existing PKCE. Facebook remains a confidential server-side code exchange with state; undocumented PKCE support is not assumed. Existing `outpost` and `multipostly` schemes are preserved. |
| Facebook discovery fetched only the first page, over-requested Instagram fields, and ignored Page tasks. | Pagination rebuilt against the fixed Graph host, repeated-cursor/bound checks, Facebook-only fields, granted-scope/app/user/expiry validation and `CREATE_CONTENT` filtering. Instagram discovery remains separate. |
| Publishing trusted a client-saved `pageId`. | Exact owned Page lookup, selected-destination check, Page routing validation, media/format validation and fresh Meta authorization immediately before every publish. No personal-profile destinations. |
| Any HTTPS media URL could trigger a backend fetch; the public bucket exposed unpublished assets. | Owner-path URL validation; private media bucket; RLS SELECT/INSERT/UPDATE/DELETE with `USING` and `WITH CHECK`; fresh one-hour signed media URLs issued for publishing and previews. Legacy stored URLs are descriptors, never fetched directly by the backend. |
| Manual requests and retry races could publish duplicates; interrupted requests were always retryable. | Persistent `(user, post, Page)` publication claims shared by manual and cron paths. Results survive local draft deletion/reconnect. Confirmed results are returned on replay. Unknown in-flight outcomes are blocked from resending. Explicit transient/rate errors allow at most three attempts, separated by at least a minute. |
| Raw provider/DB errors could leak secrets and every failure was retryable. | Safe error codes/messages, appsecret proof, bearer headers, POST token exchange, reconnect classification for revoked/expired/missing permissions. Unknown network outcomes and unconfirmed async media are not automatically resent. Only confirmed Graph responses produce success. |
| Disconnect lacked full credential/queue cleanup and public Meta lifecycle endpoints were absent. | Transactional disconnect cancels affected schedules and deletes credentials/Pages. Single-network unlink does not revoke a shared Facebook/Instagram grant. Signed deauthorization callback maps the exact app-scoped Meta identity. |
| Account deletion had no real backend/storage lifecycle. | In-app confirmed deletion; immediately blocked sessions/operations once queued; session revocation; content/connection purge; Storage API object removal; Auth user deletion; durable cleanup retry and signed Meta data-deletion/status callbacks. Receipts contain hashes and completion times, expire after 30 days, and report pending while cleanup remains. Already-published social posts are retained on the remote platform. |
| Mobile app sessions used plaintext AsyncStorage and late responses could cross account switches. | Native Keychain/Keystore chunked session adapter with migration of old app sessions; owner checks around refresh/publish/connect; clear device templates/destination preferences on sign-out/deletion. Web app sessions continue to use browser storage. |
| Root typecheck included the website with the mobile alias and excluded the backend. | Separate mobile, website and backend checks, pinned Supabase versions and Deno dependency lockfile. |

A request already transmitted to Meta cannot be cancelled retroactively by disconnect. An ambiguous publish claim remains blocked until an operator checks the actual Page; there is no unsafe automatic replay. Reels/videos can return `META_PROCESSING_UNCONFIRMED` with a remote ID while processing. That is displayed as an unconfirmed failure, not a fabricated success. A later reconciliation UI is still needed.

Telegram's previous channel connector proved only that the shared bot could post, not that the app user owned the channel. New live Telegram connections now fail closed until an owner-verification handshake is implemented. The demo remains available. Existing platform adapters are preserved.

## Local verification

- `npm test`: 31 passing tests, including actual PostgreSQL migrations/RLS/service-role functions via PGlite, two users sharing a Facebook Page, forged workspace assignments, storage isolation, invalid/replayed/stale state, code/permission/expiry errors, Graph failures, two-Page handler publishing, duplicate/racing claims, disconnect, signed callbacks, account deletion and failed-storage cleanup recovery.
- Graph transport is mocked in tests. Those responses are **not evidence of a real Facebook publication**.
- `npm run lint`, `npm run typecheck`, `npm run typecheck:backend`, plus `deno lint supabase/functions/api`.
- `deno check --frozen supabase/functions/api/index.ts` with Deno 2.9.6.
- Expo web export of the mobile application and website's own lint/typecheck/production build.
- Dependency audits and source/bundle secret-boundary checks are recorded in the final evidence output. Compatible dependency fixes were applied; remaining advisories are listed there. Do not use `npm audit fix --force` to downgrade Expo or change SDK major versions.
- Native iOS/Android runtime, Keychain behavior and real app-to-browser-to-app OAuth still require device testing. Local Xcode tools currently ask for a license agreement; no agreement was accepted.

## Restoration and rollout requirements

Restoration itself is complete under the later authorization. If the project pauses again, select the existing `outpost` project in Supabase Studio → Resume project → Resume, then wait for `ACTIVE_HEALTHY`. Do not create a replacement project or change Meta's existing callback just because the backend was paused. Studio showed a resumable window through 19 November 2027 at inspection; recheck current eligibility before any later restore.

The following **production actions are prepared but remain unapproved**:

1. Take a secure database/storage backup outside this repository and public outputs. Inventory affected accounts and legacy publication history. Pause the `publish-due-posts` cron job for the deployment window. Do not print token rows or vault values.
2. Compare live migrations, foreign-key names and policies against the repository. The read-only inspection matched the initial schema. Link only the exact project: `supabase link --project-ref pdecqyjanliqocfigkvd`; inspect `supabase db push --dry-run --skip-vault` before applying.
3. Configure server secrets from `supabase/functions/.env.example`. Keep the existing Meta App ID **1076171658459706** and App Secret. Generate a **32-byte base64 `TOKEN_ENCRYPTION_KEY`** securely and retain it: changing it without re-encryption requires reconnecting. Set the exact `PUBLIC_API_URL`, random `CRON_SECRET`, exact return allowlist, and approved web origins. Do not put server secrets in `EXPO_PUBLIC_*`, Git, screenshots or the mobile build. Existing local app `.env` is demo/placeholder configuration and was not converted to live.
4. Apply `20261030094002_security_isolation_oauth.sql`. It remaps IDs, migrates saved destinations, clears unproven legacy tokens and pending OAuth states, expires connections, and converts old schedules/in-progress posts to drafts. The user must reconnect each account and deliberately reschedule. Malformed legacy documents are retained as `legacyData` in failed posts for operator review. This is a compatibility migration, not a transparent rolling deployment.
5. Deploy the updated `api` function and updated mobile build together. `verify_jwt=false` is required for signed public Meta callbacks; authenticated routes verify the user and actual `auth.sessions` record internally. Old clients lack returned-state validation, private-media refresh and deletion controls and are not release-compatible.
6. Verify fresh-email sign-up creates a personal organization; both users can connect the same test Page independently; each user can see only their own rows/media; disconnect/revocation/deletion stops publishing. Use a disposable authorized staging/test arrangement before production data.
7. Recheck cron URL/secret against the `api_url` and `cron_secret` Vault entries, then re-enable the scheduler only after controlled tests. Monitor `deletion_jobs` and unresolved `publish_attempts` with status `started`. The cron worker also expires old OAuth state and deletion receipts.
8. Address the live advisor findings separately. Leaked-password protection may require a plan/feature decision; do not upgrade or incur charges without authorization. Inspect `pg_net`'s extension relocation support before moving it; do not drop a scheduling extension blindly.

Required callback URLs after deployment (not configured in Meta by this task):

- OAuth: `https://pdecqyjanliqocfigkvd.supabase.co/functions/v1/api/callback` (existing exact URI retained).
- Deauthorize: `https://pdecqyjanliqocfigkvd.supabase.co/functions/v1/api/deauthorize`.
- Data deletion: `https://pdecqyjanliqocfigkvd.supabase.co/functions/v1/api/data-deletion`.
- Deletion status is returned per request by the backend.

## App Review readiness and controlled demonstration

Business Verification remains unresolved and unchanged. Advanced Access is not assumed. Test only with existing app-role/test users and Page permissions that Meta actually grants. The code requests the existing three Page scopes and does not add business-management permissions to the Facebook flow. The saved App Review draft from the previous inspection is not submitted.

After an authorized deployment and reviewer-build preparation:

1. Sign in to a clean **live** MultiPostly build; show version/device information.
2. Connections → Facebook → complete real Meta consent. Show only eligible granted Pages. Return to MultiPostly and show at least two Pages. A Page without `CREATE_CONTENT` or excluded by consent must be absent.
3. Compose innocuous agreed test content, select two controlled Pages, and show content/destination review. Obtain authorization for those actual external posts before sending them.
4. Publish; show the independent actual results and open each real Facebook permalink. An unselected Page must receive nothing. Demonstrate a controlled authorization/API failure honestly.
5. Repeat the same publish request to confirm no duplicate posts; revoke only the test grant, show reconnect behavior, then disconnect one app user's connection without affecting another user's independent connection.
6. Demonstrate deletion using a disposable app account/media, the status response, and absence of credentials/queued operations. Explain that remote Facebook posts must be removed on Facebook.
7. Show deployed privacy/terms/deletion notices and approved support contact.

Remaining review gates: a verified live mobile build and end-to-end Meta posting evidence; final operator contact/retention/backup/legal terms; real published privacy/deletion URLs and callback settings; native return-flow testing; and a real Page-post content confirmation view if Meta requires that for `pages_read_engagement`. Remote Facebook post edit/delete is not implemented. Shared organizations, Telegram channel-owner verification, and automatic reconciliation of asynchronous/unknown publications remain missing functionality. Official Meta documentation fetches were rate-limited during this task; retain Graph v23.0 and recheck the exact media endpoint/version contract before claiming live support for every format.

## Dependency audit limitations

Compatible updates reduced the root audit from 17 advisories to 11 (5 low, 6 high) and the website audit from 8 to 3 high, eliminating its reported critical finding. Remaining root advisory sources are `decode-uri-component` (via router/query-string), `zod` (Expo tooling) and `deepmerge` (Expo tooling); remaining website sources are `compression` (local preview server) and `sharp` (image/build processing). Counts include dependent-package reports, not 14 distinct exploitable application bugs. Resolving them fully requires separately validated dependency/SDK changes; audits are not clean and the release is not security-certified.

The restored live API returned HTTP 401 to an unauthenticated publish probe; no Graph request or post was created. Root `package-lock.json` was already modified at the start of this task; it was updated and committed as part of the dependency/test changes.

Policy and platform references: [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [project pausing/restoration](https://supabase.com/docs/guides/platform/free-project-pausing), [Meta manual login](https://developers.facebook.com/docs/facebook-login/manually-build-a-login-flow/), [Pages API](https://developers.facebook.com/docs/pages-api/getting-started/), [Meta deletion callback](https://developers.facebook.com/docs/development/create-an-app/app-dashboard/data-deletion-callback/).
