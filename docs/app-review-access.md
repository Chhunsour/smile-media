# MultiPostly reviewer access and live evidence plan

Prepared 2 November 2026. App `1076171658459706`; existing unsubmitted draft `1097763999633805`. This is a preparation plan, not a created reviewer account or tested native release.

## Dedicated app login

After the security migration/API/client release is approved and validated, create one ordinary **MultiPostly** account using an owner-approved monitored reviewer email. Do not create it on the old unsecured production backend. The ordinary account receives its personal workspace through the normal Auth trigger; it receives no service-role, database administrator, owner-wallet or Meta administrator privileges.

The reviewable provisioning request is:

```json
{
  "purpose": "Meta App Review ordinary MultiPostly account",
  "projectRef": "pdecqyjanliqocfigkvd",
  "email": "OWNER_MUST_SUPPLY",
  "displayName": "MultiPostly App Review",
  "privilegedRoles": [],
  "emailConfirmation": "verify through the approved mailbox or explicitly approve administrative confirmation",
  "password": "generate securely at execution and deliver only through Meta's reviewer-access field"
}
```

No account, email confirmation, password or credential file has been created by this run. A successful local fixture is not a working reviewer login. Actual creation is a production change requiring approval. Provide the validated signed-build install URL/version/OS, login steps, a working reset path and support contact in Meta's private reviewer-access field. Do not use the public simulated `/app/` as the reviewer environment or share a personal Facebook password.

Use a separate approved ordinary account for two-user isolation and disposable account/data deletion; deletion of the main reviewer account during review would prevent review. Keep main reviewer credentials valid until the review ends. Then revoke access and run the normal application data-deletion process after approval, including media cleanup; do not directly delete Auth first and leave Storage objects behind.

## Meta identities and assets

The last confirmed Roles view listed Chhunsour Seng as Administrator and zero testers. No invitation or test Facebook account was created. The existing administrator or explicitly approved legitimate testers may perform app-role-only Standard testing before Business Verification/Advanced Access. Each person must actually manage the chosen Page(s) and linked professional Instagram account. App roles and Supabase user IDs are different identities.

For Meta's actual reviewer, follow the access/test-asset instructions shown in the submission flow. Do not assume that sharing the app login also grants Page access, or that a third-party reviewer can authorize customer scopes before approval. Test the complete arrangement before submission.

## Initial review scope and release controls

- Existing Facebook Login architecture: `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`, `public_profile`, `instagram_basic`, `instagram_content_publish`.
- Page text/photo and eligible Instagram JPEG are the initial real-test candidates. Video/carousel and asynchronous completion are unproven; do not advertise universal live-format support or add scopes simply to make a demonstration.
- Keep `PUBLISH_MODE=disabled` until exact real test assets/content are approved. Controlled mode requires exact **Supabase Auth UUIDs** in `PUBLISH_USER_ALLOWLIST`. It does not grant Meta permissions. Facebook edits/deletion require separately approved `FACEBOOK_POST_MANAGEMENT=true` and the same user gate.
- Live AI is off on client/server by default; live analytics UI is excluded. Recovery/Apple/Google UI stays off until the corresponding hosted configuration and real device flow are verified.
- Recovery requires the Supabase recovery email template to display `{{ .Token }}`, tested email delivery, code expiry/throttling and session revocation. Configure only after approval; no recovery email/password operation was executed here. The UI does not claim that a partial sign-out succeeded.
- A successful global sign-out request is not proof that every existing JWT instantly expires. Test the old disposable session/JWT against the actual API/session checks after recovery and sign-out before release.

## Actual-app recording script

Prepare a continuous English 1080p-or-better master with clear captions and a clip for each permission. Record the actual validated native candidate, not mocked responses. Do not rely on audio. Keep credentials/OTPs/tokens out of the recording. All real posts, edits, deletions, revocations and disposable account cleanup require the exact approved test scope first.

1. **Access:** show app name/version, how the reviewer installs/signs in and where Connections is located. Prove the supplied credentials work from a fresh session.
2. **Consent and identity:** You → Connected accounts → Facebook. Show actual Meta consent, permissions and asset choices. Return to the app; show the connected Facebook person separately from the granted eligible Pages. This supports `public_profile` and `pages_show_list`.
3. **Creation:** compose the approved harmless text, choose the two approved Pages and review the exact recipients. Publish once. Show per-Page results and actual remote IDs/permalinks. Open the real Page and match content/identity.
4. **Readback:** open that post in MultiPostly; in its Facebook panel select **Load Facebook post**. Show the current content fetched from Graph and the Page post ID. This supplies concrete `pages_read_engagement` evidence.
5. **Edit:** change the caption in the selected Page panel, confirm **Update caption on Facebook**, refresh readback and show the updated text on Facebook. Show the other destination is unchanged. The original saved composition is history, not the current remote caption.
6. **Remote delete:** for the specifically approved disposable test publication, select **Delete from Facebook**, confirm, show the real success acknowledgment and check the actual Page. Local history deletion and account deletion are separate controls and cannot substitute for this demonstration. Do not repeat an uncertain change.
7. **Scheduling:** deliberately schedule another approved publication with visible date/time/timezone, close the app, then show the worker result and actual destination content. Do not enable unrelated overdue schedules.
8. **Instagram:** complete its actual permission/asset selection, show the eligible linked professional account, publish the approved JPEG and show the actual published media ID/content/permalink. This covers `instagram_basic` and `instagram_content_publish`; zero real publishing calls are currently claimed.
9. **Lifecycle:** on approved disposable authorization/accounts, show denied/revoked permission, reconnect, disconnect stopping new work, signed/account deletion and truthful status. Do not revoke the owner's broad grant just to stage a failure.
10. **Policies and support:** open the approved live privacy/terms/deletion/support pages without login. They must contain verified contacts and actual retention/processors; the current local drafts do not satisfy this final step.

## Evidence sheet to complete after real tests

For each scope record the consenting app-role person, app account UUID, approved Page/Instagram IDs, granted scopes/tasks, exact test time, endpoint, safe success/remote IDs, matching recording filename/timecodes and Meta dashboard test-log confirmation. Successful permission calls must be recent enough for submission. Store operational tokens separately; never put them in this evidence sheet.

Record device/OS/build ID and actual cold start, session restoration, browser cancel/return, revoked/expired/replayed state, connection-generation rejection, narrowed assets, private upload, duplicate/lost response, reconnect/disconnect, password recovery and deletion behavior. Local tests cover important failures but cannot fill in real-device outcomes.

The six descriptions and form answers are prepared separately. Finalize them against the deployed reviewer build, complete Business Verification, add the tested Instagram requests to the existing draft, review the final onboarding terms, and submit only after owner approval. No Advanced Access or external-customer eligibility is inferred from these preparations.
