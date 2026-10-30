-- Local only. Pause the scheduler before rollout; take a backup and inspect live schema drift.
-- Legacy global IDs cannot prove credential ownership. Discard credentials and require reconnect.
create schema if not exists private;
revoke all on schema private from public;
create table public.organizations (
  id uuid primary key references auth.users(id) on delete cascade,
  owner_id uuid not null unique references auth.users(id) on delete cascade,
  deleting_at timestamptz,
  connection_version bigint not null default 0,
  constraint personal_workspace check (id = owner_id)
);
insert into public.organizations(id, owner_id) select id,id from auth.users;
alter table public.organizations enable row level security;
create function private.new_workspace() returns trigger language plpgsql security definer set search_path = '' as $$
begin insert into public.organizations(id,owner_id) values(new.id,new.id); return new; end $$;
revoke all on function private.new_workspace() from public;
create trigger multipostly_workspace after insert on auth.users for each row execute function private.new_workspace();

alter table public.social_accounts add column external_id text;
update public.social_accounts set external_id = substring(id from position(':' in id)+1), status='expired';
alter table public.social_accounts alter column external_id set not null;
delete from public.social_pages p where not exists (select 1 from public.social_accounts a where a.id=p.account_id and a.user_id=p.user_id and a.platform=p.platform);
create temporary table page_remap on commit drop as select p.id old_id,p.user_id,
  p.user_id::text||':'||a.platform||':'||a.external_id new_account,
  p.user_id::text||':'||a.platform||':'||a.external_id||':'||p.external_id new_id
  from public.social_pages p join public.social_accounts a on a.id=p.account_id;
alter table public.social_pages drop constraint social_pages_account_id_fkey;
update public.social_accounts set id=user_id::text||':'||platform||':'||external_id;
update public.social_pages p set id=m.new_id,account_id=m.new_account from page_remap m where p.id=m.old_id and p.user_id=m.user_id;
update public.posts p set data=jsonb_set(jsonb_set(p.data,'{destinations}',coalesce((
 select jsonb_agg(case when m.new_id is null then d else jsonb_set(d,'{pageId}',to_jsonb(m.new_id)) end order by n)
 from jsonb_array_elements(case when jsonb_typeof(p.data->'destinations')='array' then p.data->'destinations' else '[]'::jsonb end) with ordinality x(d,n)
 left join page_remap m on m.old_id=d->>'pageId' and m.user_id=p.user_id),'[]')), '{payloads}',coalesce((
 select jsonb_object_agg(coalesce(m.new_id,k),v) from jsonb_each(case when jsonb_typeof(p.data->'payloads')='object' then p.data->'payloads' else '{}'::jsonb end) x(k,v)
 left join page_remap m on m.old_id=k and m.user_id=p.user_id),'{}')) where jsonb_typeof(p.data)='object';
-- Retain malformed legacy data for the operator, but remove it from runnable queues.
update public.posts set data=jsonb_build_object('id',id,'caption','','media','[]'::jsonb,'captions','{}'::jsonb,'options','{}'::jsonb,'destinations','[]'::jsonb,'status','failed','createdAt',updated_at,'updatedAt',updated_at,'legacyData',data),status='failed',scheduled_at=null where jsonb_typeof(data) is distinct from 'object';
-- Do not run old queues after restoring a previously paused project.
update public.posts set status='draft',scheduled_at=null,data=data||'{"status":"draft","scheduledAt":null}' where status in ('scheduled','publishing');
delete from public.social_tokens;
delete from public.oauth_states;
alter table public.oauth_states add column session_id text not null, add column connection_version bigint not null;
alter table public.social_tokens drop column access_token, drop column refresh_token;
alter table public.social_tokens add column sealed text not null, add column account_id text not null;

alter table public.posts add column organization_id uuid references public.organizations(id) on delete cascade;
alter table public.social_accounts add column organization_id uuid;
alter table public.social_pages add column organization_id uuid;
alter table public.social_tokens add column organization_id uuid not null;
update public.posts set organization_id=user_id;
alter table public.posts alter column organization_id set not null, alter column organization_id set default auth.uid();
update public.social_accounts set organization_id=user_id;
update public.social_pages set organization_id=user_id;
alter table public.social_accounts alter column organization_id set not null;
alter table public.social_pages alter column organization_id set not null;
alter table public.posts add constraint post_workspace_owner check (organization_id=user_id), add constraint post_document check(jsonb_typeof(data)='object' and coalesce(jsonb_typeof(data->'destinations')='array',false));
alter table public.social_accounts add constraint account_workspace_owner check (organization_id=user_id), add unique(id,user_id,organization_id), add unique(user_id,platform,external_id), add foreign key(organization_id) references public.organizations(id) on delete cascade;
alter table public.social_pages add constraint page_workspace_owner check (organization_id=user_id), add foreign key(account_id,user_id,organization_id) references public.social_accounts(id,user_id,organization_id) on delete cascade, add unique(account_id,external_id);
alter table public.social_tokens add constraint token_workspace_owner check (organization_id=user_id), add foreign key(account_id,user_id,organization_id) references public.social_accounts(id,user_id,organization_id) on delete cascade;
create index social_pages_owner on public.social_pages(user_id,account_id);
create index social_tokens_owner on public.social_tokens(user_id,account_id);
create index posts_owner on public.posts(user_id);
create index accounts_external on public.social_accounts(platform,external_id);
create index oauth_states_age on public.oauth_states(created_at);

-- Retained independently of posts/pages: deleting a draft or reconnecting must not reset idempotency.
create table public.publish_attempts (
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  post_id text not null, page_id text not null,
  status text not null check(status in ('started','finished')),
  attempts integer not null default 1, started_at timestamptz not null default now(),
  result jsonb, primary key(user_id,post_id,page_id), check(user_id=organization_id)
);
alter table public.publish_attempts enable row level security;
create table public.deletion_receipts (code_hash text primary key, completed_at timestamptz not null default now());
alter table public.deletion_receipts enable row level security;

create table public.deletion_jobs (user_id uuid primary key references auth.users(id) on delete cascade,code_hash text not null,created_at timestamptz not null default now());
alter table public.deletion_jobs enable row level security;
revoke all on public.deletion_jobs from public,anon,authenticated;
grant all on public.deletion_jobs to service_role;

-- Check actual sessions, not editable user_metadata or stale workspace claims.
create function private.active_session() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from auth.sessions s join public.organizations o on o.id=s.user_id
 where s.user_id=(select auth.uid()) and s.id::text=(select auth.jwt()->>'session_id') and o.deleting_at is null and not exists(select 1 from public.deletion_jobs j where j.user_id=o.id))
$$;
revoke all on function private.active_session() from public;
grant usage on schema private to authenticated;
grant execute on function private.active_session() to authenticated;
create function private.verify_session(p_user uuid,p_session text) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from auth.sessions s join public.organizations o on o.id=s.user_id where s.user_id=p_user and s.id::text=p_session and o.deleting_at is null and not exists(select 1 from public.deletion_jobs j where j.user_id=o.id))
$$;

revoke all on function private.verify_session(uuid,text) from public,anon,authenticated;
grant usage on schema private to service_role;
grant execute on function private.verify_session(uuid,text) to service_role;
create function public.session_active(p_user uuid,p_session text) returns boolean language sql stable security invoker set search_path='' as $$ select private.verify_session(p_user,p_session) $$;
create function private.revoke_user_sessions(p_user uuid) returns void language sql security definer set search_path='' as $$ delete from auth.sessions where user_id=p_user $$;
revoke all on function private.revoke_user_sessions(uuid) from public,anon,authenticated;
grant execute on function private.revoke_user_sessions(uuid) to service_role;

drop policy "own posts" on public.posts;
drop policy "delete own accounts" on public.social_accounts;
drop policy "read own accounts" on public.social_accounts;
drop policy "read own pages" on public.social_pages;
create policy own_workspace on public.organizations for select to authenticated using(id=(select auth.uid()) and private.active_session());
create policy own_posts on public.posts for all to authenticated using(user_id=(select auth.uid()) and organization_id=(select auth.uid()) and private.active_session()) with check(user_id=(select auth.uid()) and organization_id=(select auth.uid()) and private.active_session());
create policy own_accounts on public.social_accounts for select to authenticated using(user_id=(select auth.uid()) and organization_id=(select auth.uid()) and private.active_session());
create policy own_pages on public.social_pages for select to authenticated using(user_id=(select auth.uid()) and organization_id=(select auth.uid()) and private.active_session());
create policy own_attempts on public.publish_attempts for select to authenticated using(user_id=(select auth.uid()) and organization_id=(select auth.uid()) and private.active_session());
revoke all on public.organizations,public.posts,public.social_accounts,public.social_pages,public.social_tokens,public.oauth_states,public.publish_attempts,public.deletion_receipts from anon,authenticated;
grant select on public.organizations,public.social_accounts,public.social_pages,public.publish_attempts to authenticated;
grant select,insert,update,delete on public.posts to authenticated;
grant all on public.organizations,public.posts,public.social_accounts,public.social_pages,public.social_tokens,public.oauth_states,public.publish_attempts,public.deletion_receipts to service_role;

drop policy "update own media" on storage.objects;
drop policy "upload own media" on storage.objects;
drop policy "delete own media" on storage.objects;
drop policy "read own media" on storage.objects;
create policy media_select on storage.objects for select to authenticated using(bucket_id='media' and (storage.foldername(name))[1]=(select auth.uid())::text and private.active_session());
create policy media_insert on storage.objects for insert to authenticated with check(bucket_id='media' and (storage.foldername(name))[1]=(select auth.uid())::text and private.active_session());
create policy media_update on storage.objects for update to authenticated using(bucket_id='media' and (storage.foldername(name))[1]=(select auth.uid())::text and private.active_session()) with check(bucket_id='media' and (storage.foldername(name))[1]=(select auth.uid())::text and private.active_session());
create policy media_delete on storage.objects for delete to authenticated using(bucket_id='media' and (storage.foldername(name))[1]=(select auth.uid())::text and private.active_session());

-- Draft media is private; the backend issues short-lived download URLs only when needed.
update storage.buckets set public=false where id='media';

-- All mutating RPCs below are SECURITY INVOKER and service-role only.
create function public.save_connection(p_user uuid,p_platform text,p_external text,p_connection jsonb,p_version bigint default 0) returns text language plpgsql security invoker set search_path='' as $$
declare aid text:=p_user::text||':'||p_platform||':'||p_external; p jsonb;
begin
 perform 1 from public.organizations where id=p_user and deleting_at is null and connection_version=p_version and not exists(select 1 from public.deletion_jobs where user_id=p_user) for update;
 if not found then raise exception 'Workspace unavailable'; end if;
 insert into public.social_accounts(id,user_id,organization_id,platform,external_id,name,avatar,status)
 values(aid,p_user,p_user,p_platform,p_external,p_connection->>'name',p_connection->>'avatar','active')
 on conflict(id) do update set name=excluded.name,avatar=excluded.avatar,status='active',connected_at=now();
 delete from public.social_tokens where user_id=p_user and account_id=aid;
 delete from public.social_pages where user_id=p_user and account_id=aid;
 for p in select * from jsonb_array_elements(p_connection->'pages') loop
 insert into public.social_pages(id,account_id,user_id,organization_id,platform,external_id,name,handle,avatar,followers,kind)
 values(aid||':'||(p->>'external_id'),aid,p_user,p_user,p_platform,p->>'external_id',p->>'name',coalesce(p->>'handle',''),coalesce(p->>'avatar',''),coalesce((p->>'followers')::integer,0),p->>'kind');
 end loop;
 for p in select * from jsonb_array_elements(p_connection->'tokens') loop
 insert into public.social_tokens(id,user_id,organization_id,account_id,sealed,expires_at) values(p->>'id',p_user,p_user,aid,p->>'sealed',(p->>'expires_at')::timestamptz);
 end loop;
 return aid;
end $$;
create function public.disconnect_connection(p_user uuid,p_account text) returns void language plpgsql security invoker set search_path='' as $$
begin
 perform 1 from public.organizations where id=p_user for update;
 update public.organizations set connection_version=connection_version+1 where id=p_user;
 update public.posts x set status='failed',scheduled_at=null,data=data||'{"status":"failed","scheduledAt":null}'
 where x.user_id=p_user and x.status in ('scheduled','publishing') and exists(select 1 from public.social_pages p where p.user_id=p_user and p.account_id=p_account and x.data->'destinations' @> jsonb_build_array(jsonb_build_object('pageId',p.id)));
 delete from public.oauth_states where user_id=p_user;
 delete from public.social_accounts where id=p_account and user_id=p_user;
end $$;
create function public.claim_publish(p_user uuid,p_post text,p_page text) returns jsonb language plpgsql security invoker set search_path='' as $$
declare prior public.publish_attempts; doc jsonb;
begin
 perform 1 from public.organizations where id=p_user and deleting_at is null and not exists(select 1 from public.deletion_jobs where user_id=p_user) for update;
 if not found then raise exception 'Workspace unavailable'; end if;
 select data into doc from public.posts where id=p_post and user_id=p_user;
 if doc is null or not coalesce(doc->'destinations' @> jsonb_build_array(jsonb_build_object('pageId',p_page)),false) then raise exception 'Destination unavailable'; end if;
 -- Legacy client-written results are not proof of a Graph publication. Never replay them.
 if exists(select 1 from jsonb_array_elements(doc->'destinations') d where d->>'pageId'=p_page and d->>'status'='published') then
 if not exists(select 1 from public.publish_attempts where user_id=p_user and post_id=p_post and page_id=p_page) then return '{"cached":{"status":"failed","error":{"message":"This legacy publication needs manual verification on the Page.","code":"LEGACY_HISTORY_UNVERIFIED","retryable":false}}}'::jsonb; end if; end if;
 select * into prior from public.publish_attempts where user_id=p_user and post_id=p_post and page_id=p_page for update;
 if found then
 if prior.status='started' then return '{"busy":true}'::jsonb; end if;
 if prior.result->>'status'='published' or coalesce(prior.result#>>'{error,retryable}','false')<>'true' or prior.attempts>=3 or prior.started_at>now()-interval '60 seconds' then return jsonb_build_object('cached',prior.result); end if;
 end if;
 if not exists(select 1 from public.social_pages p join public.social_accounts a on a.id=p.account_id and a.user_id=p.user_id where p.id=p_page and p.user_id=p_user and a.status='active') then raise exception 'Page unavailable'; end if;
 insert into public.publish_attempts(user_id,organization_id,post_id,page_id,status) values(p_user,p_user,p_post,p_page,'started')
 on conflict(user_id,post_id,page_id) do update set status='started',result=null,started_at=now(),attempts=publish_attempts.attempts+1;
 return jsonb_build_object('post',doc);
end $$;
create function public.finish_publish(p_user uuid,p_post text,p_page text,p_result jsonb) returns void language plpgsql security invoker set search_path='' as $$
begin
 update public.publish_attempts set status='finished',result=p_result where user_id=p_user and post_id=p_post and page_id=p_page and status='started';
 update public.posts x set data=jsonb_set(data,'{destinations}',(select jsonb_agg(case when d->>'pageId'=p_page then d||jsonb_build_object('result',p_result,'status',p_result->>'status') else d end order by n) from jsonb_array_elements(data->'destinations') with ordinality z(d,n))),updated_at=now() where id=p_post and user_id=p_user;
end $$;
create function public.begin_user_deletion(p_user uuid) returns void language plpgsql security invoker set search_path='' as $$
begin
 perform 1 from public.organizations where id=p_user for update;
 if exists(select 1 from public.publish_attempts where user_id=p_user and status='started' and started_at>now()-interval '15 minutes') then raise exception 'Publication in progress'; end if;
 update public.organizations set deleting_at=coalesce(deleting_at,now()) where id=p_user;
 delete from public.oauth_states where user_id=p_user;
 delete from public.social_accounts where user_id=p_user;
 delete from public.posts where user_id=p_user;
 perform private.revoke_user_sessions(p_user);
end $$;
revoke all on function public.session_active(uuid,text),public.save_connection(uuid,text,text,jsonb,bigint),public.disconnect_connection(uuid,text),public.claim_publish(uuid,text,text),public.finish_publish(uuid,text,text,jsonb),public.begin_user_deletion(uuid) from public,anon,authenticated;
grant execute on function public.session_active(uuid,text),public.save_connection(uuid,text,text,jsonb,bigint),public.disconnect_connection(uuid,text),public.claim_publish(uuid,text,text),public.finish_publish(uuid,text,text,jsonb),public.begin_user_deletion(uuid) to service_role;
