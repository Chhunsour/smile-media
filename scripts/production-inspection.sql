-- Read-only, credential-free deployment preflight. One result preserves a consistent view.
select jsonb_build_object(
 'database_version', current_setting('server_version'),
 'migrations', (select jsonb_agg(jsonb_build_object('version',version,'name',name) order by version) from supabase_migrations.schema_migrations),
 'tables', (select jsonb_agg(jsonb_build_object('name',tablename,'rls',rowsecurity) order by tablename) from pg_tables where schemaname='public'),
 'columns', (select jsonb_agg(jsonb_build_object('table',table_name,'column',column_name,'type',data_type,'nullable',is_nullable) order by table_name,ordinal_position) from information_schema.columns where table_schema='public'),
 'constraints', (select jsonb_agg(jsonb_build_object('table',c.relname,'name',con.conname,'definition',pg_get_constraintdef(con.oid)) order by c.relname,con.conname) from pg_constraint con join pg_class c on c.oid=con.conrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public'),
 'policies', (select jsonb_agg(jsonb_build_object('schema',schemaname,'table',tablename,'name',policyname,'command',cmd,'roles',roles,'using',qual,'check',with_check)) from pg_policies where schemaname in ('public','storage')),
 'grants', (select jsonb_agg(jsonb_build_object('table',table_name,'role',grantee,'privilege',privilege_type)) from information_schema.role_table_grants where table_schema='public' and grantee in ('anon','authenticated','service_role','PUBLIC')),
 'counts', jsonb_build_object('users',(select count(*) from auth.users),'accounts',(select count(*) from public.social_accounts),'pages',(select count(*) from public.social_pages),'tokens',(select count(*) from public.social_tokens),'oauth_states',(select count(*) from public.oauth_states),'posts',(select count(*) from public.posts),'storage_objects',(select count(*) from storage.objects where bucket_id='media')),
 'posts_by_status', (select jsonb_object_agg(status,n) from (select status,count(*) n from public.posts group by status) x),
 'accounts_by_platform', (select jsonb_object_agg(platform,n) from (select platform,count(*) n from public.social_accounts group by platform) x),
 'ownership_mismatches', (select count(*) from public.social_pages p join public.social_accounts a on a.id=p.account_id where p.user_id<>a.user_id or p.platform<>a.platform),
 'orphan_tokens', (select count(*) from public.social_tokens t where not exists(select 1 from public.social_accounts a where a.id=t.id and a.user_id=t.user_id) and not exists(select 1 from public.social_pages p where p.id=t.id and p.user_id=t.user_id)),
 'buckets', (select jsonb_agg(jsonb_build_object('id',id,'public',public,'file_size_limit',file_size_limit,'allowed_mime_types',allowed_mime_types)) from storage.buckets),
 'jobs', (select jsonb_agg(jsonb_build_object('name',jobname,'active',active,'schedule',schedule)) from cron.job),
 'vault_names', (select jsonb_agg(name) from vault.secrets),
 'cron_url_matches_project', (select decrypted_secret='https://pdecqyjanliqocfigkvd.supabase.co/functions/v1/api' from vault.decrypted_secrets where name='api_url' limit 1)
) inspection;
