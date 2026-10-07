-- MultiPostly schema. Posts are stored as the app's Post JSON (src/models/index.ts) plus the columns
-- the scheduler needs. Platform credentials live in social_tokens, which clients can never read.

create extension if not exists pg_cron;
create extension if not exists pg_net;

create table public.posts (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  data jsonb not null,
  status text not null,
  scheduled_at timestamptz,
  updated_at timestamptz not null default now()
);
create index posts_due on public.posts (scheduled_at) where status = 'scheduled';

create table public.social_accounts (
  id text primary key,
  user_id uuid not null references auth.users on delete cascade,
  platform text not null,
  name text not null,
  avatar text,
  status text not null default 'active',
  connected_at timestamptz not null default now()
);

create table public.social_pages (
  id text primary key,
  account_id text not null references public.social_accounts on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  platform text not null,
  external_id text not null,
  name text not null,
  handle text not null default '',
  avatar text not null default '',
  followers integer not null default 0,
  kind text not null default 'page'
);

-- Service-role only (RLS on, no policies): OAuth tokens, bot-verified channels, pending OAuth flows.
create table public.social_tokens (
  id text primary key, -- social_pages.id for page-scoped tokens (Facebook/Instagram), else social_accounts.id
  user_id uuid not null references auth.users on delete cascade,
  access_token text not null,
  refresh_token text,
  expires_at timestamptz
);

create table public.oauth_states (
  state text primary key,
  user_id uuid not null references auth.users on delete cascade,
  platform text not null,
  redirect_uri text not null,
  code_verifier text,
  created_at timestamptz not null default now()
);

alter table public.posts enable row level security;
alter table public.social_accounts enable row level security;
alter table public.social_pages enable row level security;
alter table public.social_tokens enable row level security;
alter table public.oauth_states enable row level security;

create policy "own posts" on public.posts for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "read own accounts" on public.social_accounts for select using (user_id = auth.uid());
create policy "delete own accounts" on public.social_accounts for delete using (user_id = auth.uid());
create policy "read own pages" on public.social_pages for select using (user_id = auth.uid());

-- Media: public read (platforms pull media by URL), users write only inside their own folder.
insert into storage.buckets (id, name, public) values ('media', 'media', true) on conflict do nothing;
create policy "upload own media" on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "delete own media" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

-- Scheduler: every minute, ask the api function to publish due posts.
-- Set these once per project (see docs/backend-integration.md):
--   select vault.create_secret('https://<ref>.supabase.co/functions/v1/api', 'api_url');
--   select vault.create_secret('<CRON_SECRET>', 'cron_secret');
select cron.schedule('publish-due-posts', '* * * * *', $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'api_url'),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret',
      (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')),
    body := '{"action":"cron"}'::jsonb
  ) where exists (select 1 from vault.decrypted_secrets where name = 'api_url')
$$);
