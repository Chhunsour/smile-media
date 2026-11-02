# MultiPostly continuation from 35a0b1e — 1 November 2026

**Superseded candidate:** see [external-users-approval-2026-11-02.md](external-users-approval-2026-11-02.md) for contract security.3, Facebook read/edit/delete, recovery/policy work, current registry evidence and the owner's decision not to accept Beta/AI terms. Observations below describe the earlier security.2 candidate.

**Controlled production publishing rollout: NO-GO today.** Local development, migration rehearsal and preparation of a maintenance-only release can continue. A full hosted recovery rehearsal and real device/OAuth validation are still missing. No push, deployment, credential change, legal acceptance, Meta submission or real social post was performed.

## Current Meta state and corrected requirements

App **1076171658459706** is explicitly **Owned by: Smile Media**, portfolio **1474214077899078**. Business information gives legal name **SMILE MEDIA CO., LTD.** This confirms the current asset owner, not the owner's final decision to operate MultiPostly through that company. Confirm that operating entity before finalizing notices or business declarations. Chhunsour Seng is the one listed app administrator/full-access person; the Roles view shows **0 testers**. Technical administrator access does not itself certify legal representative authority or complete Business Verification.

The existing Business Verification was **not retried or restarted in this continuation**. Read-only inspection found it had reached **Select your business**, with a public-record result for the same legal name and address. That record was already selected; no selection or Next action was performed by this continuation. Its contact number is masked and ends **8213**. The owner must confirm the record and control of the proposed verification contact before continuing. The previously blank challenge and historical `4961003` remain evidence of intermittent failure; the new screen is not proof of verification approval or resolution of the old save failure.

The legacy Access Verification dashboard still says Not verified, cannot start before Business Verification, and displays **December 31, 2026**. However, Meta's [9 October retirement announcement](https://developers.facebook.com/blog/post/2026/10/09/retiring-access-verification-for-tech-provider-apps) and [current Access Verification reference](https://developers.facebook.com/documentation/development/release/access-verification) say the separate process is retired. Treat the dashboard as a documentation/UI conflict requiring clarification if it continues to gate publication. Do not submit a legacy Access Verification form or treat that deadline as a newly established requirement. Business Verification and Advanced Access/App Review remain required for external business customers. No approval is inferred from the retirement.

App publication remains Unpublished; the existing review draft **1097763999633805** remains unsubmitted. No permission or role was changed.

## Exact approval checklist

| Gate | Required action/evidence | Current state / owner |
| --- | --- | --- |
| Operating identity | Confirm SMILE MEDIA CO., LTD. is the intended operator; keep the existing app/portfolio and use the approved entity in notices | Current ownership confirmed; operator declaration and public final notices unfinished |
| Business record | Owner checks the current matching legal record and its verification contact | Existing record-selection screen preserved; owner action |
| Business details | Match the legal name, registered address and contact information to authentic records; if Meta requests documents, follow its actual country-specific accepted list | No invented business details or independent registry certification |
| Contact proof | Complete Meta's actual offered contact/identity confirmation; human handles any OTP/CAPTCHA | Not completed or triggered here; no contact number substituted |
| Documents | Supply approved authentic business/contact evidence only if Meta requests it | No upload authorized or performed |
| Business approval | Dashboard must actually show Verified / completed | Still unverified / pending submission in the business record |
| Separate Tech Provider Access Verification | Retired in current official guidance; reconcile stale UI if necessary | No legacy submission; support clarification prepared |
| App settings | Name/icon/category/contact/domain and actual production platform settings | Name/category present; compliant 1024px icon and final Privacy URL were missing at inspection |
| Public policy | Own, accessible, crawler-readable privacy notice with actual collection/use/deletion route; final terms and contact details | Privacy/terms HTTP 200 but explicitly drafts |
| Deletion | Reachable instructions or configured HTTPS signed callback with confirmation code and human-readable status | Public instructions 404; local lifecycle/status implementation tested, undeployed |
| OAuth | Exact production callback, strict HTTPS redirects and real app-to-browser-to-app return; granted assets/tasks checked | Saved callback retained; real round trip not certified |
| Permission use | Minimum required scopes and a recent successful call for each requested permission | Testing access only; prior Instagram publishing count 0 |
| Reviewer access | Reproducible live build, secure MultiPostly login instructions, test assets and permitted reset path | No validated reviewer build/account arrangement |
| Recording | Actual consent, each permission's use, destinations and actual results; no simulated API success | Script prepared; recording blocked by deployment/test-post approvals |
| Data handling | Accurate answers for deployed storage, processors, access, retention and deletion; applicable ongoing reviews | Draft inventory only; no certification |
| Advanced Access | Approved per permission, then completed publishing checklist/live app | No Advanced Access approval |
| Submission consent | Review final permission descriptions, reviewer access, recordings and Platform Onboarding Terms before Submit for Review | Requires separate owner approval; no final terms accepted |
| External-user proof | Approved account with no app role can connect/publish only to authorized assets | Not possible to certify yet |

[Business Verification](https://developers.facebook.com/documentation/development/release/business-verification), [access levels](https://developers.facebook.com/documentation/development/graph-api/overview/access-levels), [App Review](https://developers.facebook.com/documentation/resp-plat-initiatives/individual-processes/app-review) and [submission walkthrough](https://developers.facebook.com/documentation/resp-plat-initiatives/individual-processes/app-review/submission-guide) were read from current official sources. The walkthrough asks for successful permission calls within 30 days and allows up to two days for logging, usable reviewer access and a recording for every requested permission. Its older Access Verification reference is superseded by the explicit retirement notice.

| Permission | Purpose in the existing code | Approval position |
| --- | --- | --- |
| `pages_show_list` | Discover authorized Pages through `/me/accounts` | Ready for testing; existing draft request |
| `pages_read_engagement` | Page identity metadata and Page publishing dependency | Ready for testing; existing draft request |
| `pages_manage_posts` | User-directed publication to selected Pages | Ready for testing; existing draft request |
| `public_profile` | Connected Facebook person's app-scoped identity/name/avatar | Ready for testing; existing draft request; external-user Login for Business needs Advanced Access |
| `instagram_basic` | Linked professional Instagram identity under Facebook Login | Ready for testing; not in current draft |
| `instagram_content_publish` | Instagram container creation and publication | Ready for testing; not in current draft; successful publishing test still needed |

The dashboard displays testing labels rather than an explicit Standard/Advanced column. Current [access-level guidance](https://developers.facebook.com/documentation/development/graph-api/overview/access-levels) limits Standard Access to app-role users. Counts alone do not establish access approval. Continue Facebook Login, not a speculative switch to Instagram Login or Unified Login. Do not request `business_management`, advertising or comment permissions without a real implemented need. Account-role-specific Instagram dependencies must be checked against the current [publishing guide](https://developers.facebook.com/documentation/instagram-platform/content-publishing) before representing universal compatibility.

## Support preparation and approval boundary

The official entry is Business Support Home for portfolio **1474214077899078** → Help → Contact support. Its current first screen is an AI/beta support intake, not evidence of a dedicated human case. The text field has a **1000-character limit**. A corrected **961-character** message is entered and reviewable, including the new record-selection state, previous blank panel/error trace, preservation request and legacy Access Verification conflict.

**Next step was not clicked.** The displayed notice says selecting it accepts Beta Product Testing Terms, AI terms and the Privacy Policy. The owner must approve that specific action before proceeding. Fields or a final case submission behind this terms gate cannot yet be inspected; any later submission should be reviewed separately. The previous feedback acknowledgment still supplies no case ID. The extended report/evidence is prepared locally and no attachment was uploaded.

Current linked terms were read in the signed-in browser: [Beta Product Testing Terms](https://www.facebook.com/legal/BetaProductTestingTerms), displayed modification 6 June 2023; [Meta AI terms](https://www.facebook.com/legal/ai-terms), displayed effective date 13 May 2026, with links to regional variants. The owner-facing approval artifact provides concise summaries and the exact intake text. This is a separate decision from verification, App Review or deployment approval.

## Website and reviewer audit

| Surface | Live result | Local implementation / gap |
| --- | --- | --- |
| `/privacy/` | 200; explicitly draft app overview | Final operator/contact, retention, processors and rights/deletion details require approval |
| `/terms/` | 200; preview terms | Final service terms, operator/support and jurisdiction unfinished |
| `/data-deletion/` | **404** | Local page builds; callback and human-readable status are not deployed |
| `/app/`, `/app/sign-in/` | 200; demo shell, with notice to get the app for real connections | Copy-only browser export forces demo mode and strips public runtime overrides; it is not reviewer access to production OAuth |
| `/download/` | 200 | No validated reviewer install/build arrangement |
| Mobile account deletion | Not available in public demo | Live profile has confirmed deletion; backend and failure recovery tested locally |
| Legal navigation | Local footer links Privacy/Data deletion/Terms | Native policy links and final no-login privacy/support route still need completion |

The public browser observation showed only its demo banner; no real account connection was attempted. The rebuilt local website demo mounted and was inspected. The public observation alone does not establish the cause of its missing workspace content or global availability. A fresh reviewer environment must be checked before submission. The correct reviewer target is a validated live build. A 200 response from a simulated `/app/sign-in/` is not a functioning reviewer login.

The audited origin is **https://multipostly-site.vercel.app**. The existing backend origin is **https://pdecqyjanliqocfigkvd.supabase.co/functions/v1/api**. After an approved release, verify `/oauth/callback`, `/deauthorize`, `/data-deletion` and `/deletion-status` against the deployed implementation before entering or changing Meta settings. These are candidate release targets, not claims that the current API has the new behavior.

The [privacy expectations](https://developers.facebook.com/documentation/development/terms-and-policies/privacy-policy) and [data-deletion callback guide](https://developers.facebook.com/documentation/development/create-an-app/app-dashboard/data-deletion-callback) were reviewed. The new local status route serves a human-readable HTML explanation to browsers, retains JSON for machine clients, and gives unknown/expired codes a truthful 404.

## Verified local fixes

- Reconcile persisted posts with canonical DB IDs/status/schedule and durable publication attempts. A lost client response no longer hides an actual confirmed publication; in-progress/unknown claims cannot become retryable client failures. Unrelated or partial results cannot promote a whole post to published.
- Reject empty, duplicate and missing scheduler destinations. Invalid schedules become failed in both the DB columns and saved JSON; no empty schedule is labeled published.
- Preserve deletion jobs after Auth removal until a receipt is durable. Previously, the Auth foreign-key cascade could destroy the retry job before a failing receipt write. The pending, unshipped migration now retains that job; only documented `user_not_found` Auth errors count as an already-completed delete. Other Auth failures stay queued.
- Add `PUBLISH_MODE`: absent/invalid/disabled prevents publishing. `controlled` requires exact Supabase Auth UUID membership in `PUBLISH_USER_ALLOWLIST`; `public` is a separate explicit release setting. Manual and cron paths enforce this; deletion housekeeping continues with publication disabled. These flags do not grant Meta permissions.
- Advance the paired client/API contract to **`2026-11-01.security.2`** because of the release controls and deletion recovery semantics. Deploy the matching API, migration and client under maintenance.
- Correct SQL-null handling in the DB test transport; new integration coverage exercises real timestamp clearing. Make the isolated website exporter avoid duplicate dark-mode configuration already present in the root source.

No existing credentials were read/rotated. The environment-preparation script was updated, not executed. Its defaults now prepare maintenance mode with publishing disabled and omit a replacement token-encryption key, avoiding accidental key rotation. Initial key provisioning, if required, needs a separate reviewed action. It still refuses overwriting existing candidate files.

## Safe rollout plan — prepared, not authorized to execute

1. **Access and inventory:** establish the correct release actor for `pdecqyjanliqocfigkvd`; recheck deployment/migrations, policies, schema, schedules, storage, source and secret names without printing values. The owner's confirmed pending migration remains `20261030094002_security_isolation_oauth.sql`; its job definition has changed locally. If it has unexpectedly been applied, stop and create a separate reviewed migration rather than editing applied history.
2. **Recovery first:** approve an isolated hosted recovery target and any cost. Back up the full DB/Auth/identity/service metadata, Storage object bytes, relevant Vault/secret configuration and current function/client source securely. Keep encryption keys separately protected. A database backup does not contain Storage object bytes. Restore and validate actual hosted Auth, object storage, cron/Vault and matching function behavior. Do not substitute the embedded rehearsal for this step.
3. **Maintenance:** separately approve downtime. Stop only MultiPostly's scheduler, retain its previous configuration, stage the new API with `MAINTENANCE_MODE=true`, **`PUBLISH_MODE=disabled`**, and an empty publish allowlist. Apply only the reviewed freeze policies; verify ordinary client writes are denied. Allow transmitted requests to settle. No other project is paused/resumed.
4. **Fresh backup and migration:** capture a fresh encrypted snapshot under maintenance, verify it, run the revised migration rehearsal and reviewed dry run, then apply only the approved pending migration. It remaps account/Page/destination IDs, removes unproven legacy credentials and states, expires connections, and turns legacy schedules into drafts. Confirm integrity and grants before thaw.
5. **Secrets:** preserve existing Meta and cron secrets. Reuse the approved securely backed-up 32-byte token-encryption key; do not regenerate/rotate it for convenience. Keep service-role/Meta/encryption/cron values server-only. Validate exact API URL, existing mobile return schemes and any actually supported web origin. Configure no untested callback URLs in Meta.
6. **Private smoke window:** approve removal of maintenance/freeze, while keeping publishing disabled and cron stopped. Use the matching client/API contract `2026-11-01.security.2`. Check normal auth, private media, two-user isolation, reconnect, disconnect, signed lifecycle requests and approved disposable-user deletion. Verify deletion receipt failure recovery and reject unauthorized/invalid requests.
7. **Device and role tests:** validate actual iOS/Android callback and secure-session behavior with the existing authorized Meta administrator or explicitly approved testers. Confirm the person manages the controlled Pages and linked professional Instagram account. No native signed build or real OAuth round trip is claimed yet.
8. **Controlled publication:** obtain explicit approval for exact test accounts, Page IDs, content and formats. Only then set `PUBLISH_MODE=controlled` and the exact Supabase Auth UUID allowlist. Start with Facebook text/photo and an eligible Instagram JPEG; video/carousel processing remains unproven. Enable cron separately only for a deliberately rescheduled test; inspect and clear any unintended overdue schedules first.
9. **Submission/public launch:** publish approved policies, icon and tested callbacks, prepare real reviewer access/recording, complete Business Verification and obtain the actual Advanced Access approvals. Resolve any remaining legacy UI gate with Meta. Require a person without an app role to pass a controlled external-user test after approval. `PUBLISH_MODE=public` is a later, separately approved launch decision.

**Rollback:** before migration commit, abort and verify real history/schema before reopening. After commit, keep maintenance, publishing disabled and cron stopped; prefer a reviewed forward fix. Do not run old v11 or the old security client/API pair against the new schema. A true rollback requires a tested full compatible restore into an approved isolated target before a separately approved cutover. Preserve publication/deletion ledgers; database restoration cannot undo external posts or justify replaying uncertain requests. Never resurrect deleted users or automatically catch up schedules.

**Reconnect:** every migrated connection must consent again. Restore selected destinations only after current Page tasks/scopes are checked. Keep drafts/history and verify previous remote posts. Owners deliberately review timezone, content, recipients and schedule when rescheduling; do not automatically resume old schedules.

## What may be demonstrated now

Local demo and mocked Graph tests can demonstrate UI composition, selection, error states and offline behavior, with clear simulated labels. The existing administrator can use role-only Standard Access for genuine OAuth/discovery and controlled publishing after the secure environment and exact test actions are authorized; Business Verification/Advanced Access are not prerequisites for those app-role-only tests. The single confirmed administrator is not evidence of eligible Pages or a second tester. No roles or test users were created.

Reviewer evidence still needs actual build/login, consent, multiple authorized Pages, selected destinations, real immediate/scheduled responses/permalinks, safe retries, reconnect/disconnect and deletion. Page-content readback and remote edit/delete are absent and must be implemented/tested if required by the permission-specific review directions. No fabricated recording, credentials or API success is supplied.

## Validation and remaining technical gates

**50 automated tests pass**, including real PostgreSQL/PGlite migration/RLS/transaction checks, mocked Graph, new failure recovery, scheduler validation, publication gates and status restoration. Mobile/backend type checks and lint, Deno frozen check/lint, website typecheck/lint/full `build:all`, and mobile exports were run; final output records their completion. Browser checks use the real rebuilt local website. Generated checked-in demo assets were restored after build verification; authored source is retained and the deployment pipeline regenerates those assets with `build:all`.

The encrypted 30 October application/media snapshot checksum was reverified. The revised local migration passed freeze/thaw, transactional rollback, fresh embedded restore, preservation of **3 accounts / 8 Pages / 6 posts**, remapping **22 destinations**, and checksums for **11 media files**. This remains an older targeted snapshot with Auth/Storage schema stubs, not a fresh full platform backup or hosted rollback proof.

Remaining gates: hosted recovery and correct release access; native device/session/OAuth evidence; approved live Page/format tests; reliable durable asynchronous media completion/reconciliation (existing Instagram polling can exceed a Free function window); final privacy/deletion/support, password recovery and reviewer access; current dependency exposure disposition. The historical October 30 audit recorded 11 mobile package reports (6 high, 5 low) and a clean website audit after compatible fixes; those counts were not refreshed here and are not a claim of current resolution. Shared-team workspaces and live Telegram ownership verification remain unsupported and are excluded from this controlled Meta scope. No claim of public readiness is made.

## Action ownership

| Agent can continue independently | Owner / external dependency |
| --- | --- |
| Local fixes, test coverage, migration scripts/rehearsal, truthful review text and recording scripts | Confirm the selected company record and verification contact ending 8213; human handles any new OTP/CAPTCHA |
| Maintain the prepared support intake and evidence | Approve the displayed Beta/AI terms and specific Next-step intake action, or decline that support route |
| Complete code-side recovery/media validation work | Approve isolated recovery environment/cost, maintenance, migration, secrets changes and deployments |
| Check policy wording against implemented data flows | Confirm company operator/authority and approve final contact, retention/backups, jurisdiction and actual processors |
| Prepare controlled test matrix and release artifacts | Authorize named test users, exact Page IDs/content, disposable-data deletion and device distribution |
| Prepare final App Review form material | Owner approves actual legal/data-handling certifications and final review submission; Meta grants permissions |

**Decision:** the code is ready for further local/staging validation and a reviewed maintenance-release proposal. It is **not technically ready to open a controlled production publishing window** until the hosted recovery and device/OAuth gates pass. Public external-customer release additionally needs Business Verification, actual Advanced Access, final notices and reviewer evidence.
