-- PREPARED ONLY. Remove only this release's temporary policies, after validation or an aborted rollout.
begin;
drop policy multipostly_release_freeze on public.posts;
drop policy multipostly_release_freeze on public.social_accounts;
drop policy multipostly_release_freeze on public.social_pages;
drop policy multipostly_release_freeze on storage.objects;
commit;
