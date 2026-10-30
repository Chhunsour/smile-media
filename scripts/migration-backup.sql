-- Read-only snapshot of all data the pending security migration changes.
-- Contains credentials and private content. The backup tool encrypts this response before writing it.
select jsonb_build_object(
 'project','pdecqyjanliqocfigkvd','captured_at',now(),
 'auth_user_ids',(select coalesce(jsonb_agg(id order by id),'[]') from auth.users),
 'tables',jsonb_build_object(
  'social_accounts',(select coalesce(jsonb_agg(to_jsonb(x) order by id),'[]') from public.social_accounts x),
  'social_pages',(select coalesce(jsonb_agg(to_jsonb(x) order by id),'[]') from public.social_pages x),
  'social_tokens',(select coalesce(jsonb_agg(to_jsonb(x) order by id),'[]') from public.social_tokens x),
  'oauth_states',(select coalesce(jsonb_agg(to_jsonb(x) order by state),'[]') from public.oauth_states x),
  'posts',(select coalesce(jsonb_agg(to_jsonb(x) order by id),'[]') from public.posts x)
 ),
 'storage',jsonb_build_object(
  'buckets',(select coalesce(jsonb_agg(to_jsonb(x) order by id),'[]') from storage.buckets x where id='media'),
  'objects',(select coalesce(jsonb_agg(to_jsonb(x) order by name),'[]') from storage.objects x where bucket_id='media')
 ),
 'migrations',(select coalesce(jsonb_agg(jsonb_build_object('version',version,'name',name) order by version),'[]') from supabase_migrations.schema_migrations),
 'policies',(select jsonb_agg(to_jsonb(x)) from pg_policies x where schemaname in ('public','storage')),
 'constraints',(select jsonb_agg(jsonb_build_object('table',c.relname,'name',con.conname,'definition',pg_get_constraintdef(con.oid))) from pg_constraint con join pg_class c on c.oid=con.conrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public'),
 'grants',(select jsonb_agg(to_jsonb(x)) from information_schema.role_table_grants x where table_schema='public'),
 'jobs',(select jsonb_agg(jsonb_build_object('jobid',jobid,'jobname',jobname,'active',active,'schedule',schedule)) from cron.job),
 'media_public',(select public from storage.buckets where id='media')
) snapshot;
