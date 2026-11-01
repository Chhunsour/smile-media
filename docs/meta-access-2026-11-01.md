# MultiPostly production and Meta access status — 1 November 2026

**Later continuation correction:** current official Meta documentation says separate Access Verification was retired on 9 October 2026; the legacy dashboard deadline below conflicts with that guidance. The preserved Business Verification tab has since reached “Select your business.” See [production-readiness-2026-11-01.md](production-readiness-2026-11-01.md) for the latest checklist, state and local fixes. Earlier observations below are retained as historical evidence.

**Public launch: NO.** Browser inspection confirms that Business Verification, separate Tech Provider Access Verification, App Review and app publication are incomplete. Local security work is ahead of the hosted backend. Authentication or a healthy Supabase project does not establish production publishing access.

## A. Current application state

The existing repository is `/Users/chhunsour/Side Project/MultiPostly`, branch `master`, remote `https://github.com/Chhunsour/smile-media.git`. It began this task clean at `7634e02`, two commits ahead of the locally recorded `origin/master` (`a26d3f1`). No fetch or remote write was performed, so this is not a claim about the current GitHub head.

Commit `cf18c74` already implemented owner-scoped connections, transactional saves, a personal organization per user, encrypted token envelopes, expiring one-use OAuth state, Page authorization, private media, publication claims, signed Meta lifecycle callbacks, deletion cleanup and secure native session storage. Commit `7634e02` added guarded deployment/recovery preparation and device build configuration. These were reviewed and tested, not reimplemented.

The signed-in Supabase browser reaches the original `outpost` project `pdecqyjanliqocfigkvd`, organization Muffy, with status **Healthy**. The overview still reports last migration **media_upsert** and no backups; the function editor lists the legacy `index.ts` and `platforms.ts`. JWT verification at the gateway is off, as expected for the public OAuth route with application-managed authorization. The current migration/version observations do not establish that the local security controls are deployed. The earlier runbook records API v11; its exact version number was not independently retrieved today.

The Supabase connector denied project access. The currently authenticated CLI listed a different project in another organization, so it was not used to query, link, migrate or modify this project. The browser was the read-only fallback. No access token or session cookie was extracted to bypass this mismatch. No new production row/token inventory was taken; counts in the 30 October runbook remain historical.

The public website privacy notice still explicitly calls the app overview a draft. Its data-deletion page returns **404**. Its browser workspace is a simulated Expo app, not a production Next.js OAuth/publishing client. The separate Next.js website builds, including the local deletion page. No live reviewer build or recorded real Meta publication was produced.

## B. Meta business and verification state

| Item | Observed status |
| --- | --- |
| App | MultiPostly, **1076171658459706** |
| Owner | **Smile Media**, portfolio **1474214077899078**; Apps explicitly says “Owned by: Smile Media” |
| Administrator | Chhunsour Seng has full access |
| Legal business | SMILE MEDIA CO., LTD. |
| Business Verification | **Unverified / Incomplete**; Security Centre says **Pending submission**, started **30 October 2026** |
| Tech Provider Access Verification | **Not verified**, cannot start until Business Verification completes |
| Access Verification deadline | **December 31, 2026**, displayed on its dedicated page for one app |
| App publication | **Unpublished**; Publish disabled |
| Profile contact email | Pending confirmation |
| Primary Page | None |
| Developer alerts | Inbox (0); no alerts |
| Business Suite notification inbox | No new notifications |
| Business Support Home | No data-source issues for MultiPostly; this is not verification or Advanced Access approval |

Selecting Tech Provider as an app classification is different from passing Access Verification. Business Verification verifies the business; Access Verification assesses Tech Provider access to other businesses' assets; App Review assesses permission usage; publishing enables the completed app lifecycle. The actual dashboard currently requires all applicable gates.

The existing verification was continued without a duplicate app/business/application or changing saved business details. The country and private-company selection were traversed, and saved business name, address and contact information remained populated. The flow reached **“Help us confirm that it’s you”**, but its challenge area was **blank** and Next disabled. The user independently confirmed the blank panel with a screenshot. No CAPTCHA was available to complete, and none was solved.

The browser reported no captured console warnings/errors for that tab; that does not identify the cause of the empty challenge. A single reload of the same tab preserved the existing pending application and populated details, then returned to the same **blank challenge with Next disabled**. No usable CAPTCHA appeared. Repeated attempts were stopped; the existing tab remains open. There is no CAPTCHA action for the owner to perform while the panel is empty.

Historical evidence dated 30 October records GraphQL **4961003**, `field_exception`, `ixt_screen_next=null`, “Changes couldn't be saved,” after a human completed CAPTCHA. That prior error has **not been reproduced today**, because the current challenge did not load. There is no evidence that Meta fixed it. The previous feedback receipt confirms ordinary technical feedback was sent, with no case ID or promised response. It does not prove a dedicated support case exists.

The current Contact support flow again says selecting Next step accepts **Beta Product Testing Terms and AI terms**. Neither was accepted and no follow-up was sent. A follow-up draft is supplied separately. This terms gate is a property of that support route, not evidence that every verification flow requires those agreements.

Dashboard locations:

- [Security Centre](https://business.facebook.com/latest/settings/security_center?business_id=1474214077899078)
- [Business information](https://business.facebook.com/latest/settings/business_info?business_id=1474214077899078)
- [Owning app asset](https://business.facebook.com/latest/settings/apps?business_id=1474214077899078)
- [Separate Access Verification](https://developers.facebook.com/1474214077899078/access-verification/)
- [App verification](https://developers.facebook.com/apps/1076171658459706/verification/?business_id=1474214077899078)
- [Publish requirements](https://developers.facebook.com/apps/1076171658459706/go_live/?business_id=1474214077899078)

## C. API access and architecture

The new dashboard uses **Ready for testing**, rather than displaying a Standard/Advanced column. The following are testing access observations; **Advanced Access is not approved**. An approved production tier must not be inferred from historical call counts.

| Permission | Dashboard status / recorded calls | Existing review draft | External customers now |
| --- | --- | --- | --- |
| `pages_show_list` | Ready for testing / 17 | New request | No |
| `pages_read_engagement` | Ready for testing / 17 | New request | No |
| `pages_manage_posts` | Ready for testing / 8 | New request | No |
| `public_profile` | Ready for testing / 31 | New request | No |
| `instagram_basic` | Ready for testing / 6 | Not included | No |
| `instagram_content_publish` | Ready for testing / **0** | Not included | No |
| `business_management` | Ready for testing / 10 | Not included; removed from local Instagram scope request | No production approval shown |

The existing **Not submitted** draft **1097763999633805** still requests exactly the three Page scopes plus `public_profile`. Its Verification, App settings, Allowed usage, Data handling and Reviewer instructions sections are incomplete; Submit for review is disabled. No permission was added, removed or submitted in Meta during this task.

Continue the current **Instagram API with Facebook Login** architecture: a Facebook user grants access, `/me/accounts` supplies authorized Pages, and eligible linked professional Instagram accounts become destinations. Facebook requests only the three Page scopes. Instagram locally requests `instagram_basic`, `instagram_content_publish`, `pages_show_list`, `pages_read_engagement`. No Business Manager management operation in this code justifies requesting `business_management` universally.

Meta's current publishing guide includes a conditional `ads_management`/`ads_read` requirement for some Business Manager-assigned Page roles. This is an unresolved account/endpoint eligibility check, not permission to add advertising scopes speculatively. Test the actual intended role arrangement before claiming it works universally. The dashboard's new Unified Login setup has no compatible configuration; that is a different token flow and not proof the existing Facebook Login flow must be replaced.

Instagram Login is a distinct alternative using `instagram_business_basic` and `instagram_business_content_publish`; it does not require a linked Page. It would need its own authorization, token handling and review work. No switch was made. Personal Facebook timeline publishing is not offered by this implementation.

Official documentation retrieved on 1 November as Markdown after the normal documentation endpoint returned rate limits:

- [Permissions and dependencies](https://developers.facebook.com/documentation/development/permissions): Page publishing depends on Page discovery and engagement access. Review guidance includes Page content reading and create/edit/delete demonstrations; those missing real-app operations must be resolved truthfully.
- [Facebook Login for Business](https://developers.facebook.com/documentation/facebook-login/facebook-login-for-business): external-business access and external-user `public_profile` require Advanced Access. Manual configuration IDs are optional for the existing user-token flow; system-user tokens require a different architecture.
- [Instagram with Facebook Login](https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-facebook-login), [Instagram publishing](https://developers.facebook.com/documentation/instagram-platform/content-publishing), and [Instagram Login](https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-instagram-login).

The implementation retains Graph **v23.0**. No unsupported assumption about upgrading to the latest version was introduced. Full v23 media-format and account-eligibility contract tests remain a release gate.

## D. Local work and checks

New fixes:

1. Require valid Instagram container and published-media IDs; only `FINISHED` containers proceed. Missing/unknown/expired/error/already-published statuses fail closed instead of being treated as ready.
2. Validate Instagram destination, caption length, item count, media kind and owner URLs before provider calls; return only permitted routing/media fields.
3. Remove the unneeded universal Business Manager scope and correct the mobile adapter's scope metadata to match Facebook Login.
4. Remove the unsupported first-comment option and swallowed comment-publication call. Old payloads with first comments require editing and resaving; no comment permission was added.
5. Require explicit retryable results across publishing controls and store actions. Live interruptions and lost provider responses no longer imply it is safe to resend. Known remote links remain accessible for unconfirmed outcomes. Recovery preserves confirmed destinations and recognizes an entirely confirmed publication.
6. Replace the inaccurate “Nothing went out” statement and misleading retry prompts with result/check-channel guidance.
7. Fix an actual blank browser-app crash: NativeWind was configured for media-based dark mode while the root called manual `colorScheme.set`. Enable class-based dark mode. Browser startup, light/dark selection and reload now work.

Changed implementation/test files:

```text
src/app/(tabs)/index.tsx
src/app/post/[id].tsx
src/app/publishing/[id].tsx
src/components/post.tsx
src/lib/publishing-state.ts
src/lib/store.ts
src/platforms/instagram/index.ts
supabase/functions/api/platforms.ts
supabase/functions/api/security.ts
tailwind.config.js
tests/publishing-state.test.ts
tests/security.test.ts
```

Validation: **41 automated tests pass**, including actual PGlite PostgreSQL migration/RLS/transaction tests and mocked Graph transport. Mobile lint and TypeScript, backend TypeScript, Deno 2.9.6 frozen check/lint, website lint/typecheck/production build, Expo web export and iOS/Android Hermes exports passed. Browser checks verified the running local demo, theme toggles/reload and failure details with no unsafe retry. The first website checker overlapped its build and saw disappearing generated `.next/types` files; a subsequent sequential typecheck passed.

These are local checks. Mock Graph success, demo sample results and Hermes exports are not live Meta publications, signed device binaries, native device tests or Meta approval. No new dependency changes, production credentials, remote migrations, deployment or social posts are included.

## E. Next actions and ownership

Independent preparation completed: current status audit, local fixes/regressions, review explanations, evidence/recording checklist, support follow-up and existing release plan reconciliation.

Owner/platform gates:

1. Resolve the blank challenge in the **existing** Business Verification. If an actionable challenge appears, the owner completes it; document upload/declaration/submission require explicit approval. If the save error returns, use the prior trace evidence plus today's blank-panel evidence in the prepared follow-up.
2. Confirm the pending business contact email and approve real service privacy/support contacts, retention choices and final policies. No policy URL can honestly point to the current draft as final service policy.
3. Complete the distinct Tech Provider Access Verification when Business Verification unlocks it, before the displayed December 31 deadline.
4. Authorize a concrete secure rollout only after the existing runbook's full hosted backup/recovery gate is satisfied. The pending compatibility migration clears legacy credentials/states and expires connections; it is intentionally consequential. Preserve existing Meta credentials and project identity.
5. Authorize named test accounts, exact controlled Page IDs and content for live OAuth/publishing tests. Approve device build/distribution and final website/callback configuration separately.
6. Record the real consent → two Pages → selected destinations → immediate/scheduled publication → actual results/permalinks → disconnect/deletion journey. Add honest Page-content read/edit/delete functionality/evidence if required for this submission. Do not label the local demo as review evidence of API publishing.
7. Review the completed submission packet, then explicitly approve App Review submission. Only after actual approval and publication can an account without an app role verify external-customer access.

Other technical launch gaps remain: shared/team organization access is unsupported; durable asynchronous media processing/reconciliation is unfinished (the existing Instagram polling can exceed a Free Edge Function execution window); Page remote read/edit/delete flows are missing; native device OAuth/keychain behavior is untested; final auth recovery/legal links and provider configuration need completion. Dependency advisories in the 30 October runbook were not re-audited here and are not claimed resolved.

## F. Launch decision

**NO.** Current blockers are visible Meta verification/review/publication gates, an undeployed security migration/API/client transition, draft or missing live legal/deletion routes, and absence of an approved, tested real publishing demonstration. The next action is resolving the existing verification challenge and obtaining the necessary owner approvals, not creating another app or calling successful login “production access.”
