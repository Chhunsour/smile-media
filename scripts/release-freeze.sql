-- PREPARED ONLY. Requires approval for a MultiPostly maintenance window.
-- Stage the API with MAINTENANCE_MODE=true and stop its cron job first.
-- Restrictive policies deny direct client access while service-role backup/migration stays available.
begin;
create policy multipostly_release_freeze on public.posts as restrictive for all to anon,authenticated using(false) with check(false);
create policy multipostly_release_freeze on public.social_accounts as restrictive for all to anon,authenticated using(false) with check(false);
create policy multipostly_release_freeze on public.social_pages as restrictive for all to anon,authenticated using(false) with check(false);
create policy multipostly_release_freeze on storage.objects as restrictive for all to anon,authenticated using(bucket_id<>'media') with check(bucket_id<>'media');
commit;
