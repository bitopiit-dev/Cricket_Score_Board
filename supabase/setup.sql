-- BPL-2027: database setup. Run once in Supabase: SQL Editor -> New query -> paste -> Run.
-- Safe to run again (it replaces its own policies).

-- 1. Who may change things: 'super' changes everything, 'scorer' only scores matches.
create table if not exists public.app_admins (
  email text primary key,
  role text not null check (role in ('super', 'scorer')),
  created_at timestamptz not null default now()
);
insert into public.app_admins (email, role) values ('bitopi.it@gmail.com', 'super')
  on conflict (email) do update set role = 'super';

-- The signed-in person's role, or null for everyone else.
create or replace function public.my_role() returns text
  language sql stable security definer set search_path = public as $$
  select role from public.app_admins where lower(email) = lower(auth.jwt() ->> 'email')
$$;
grant execute on function public.my_role() to anon, authenticated;

-- 2. Fixtures, teams and settings, each kept as one JSON document.
create table if not exists public.app_data (
  key text primary key check (key in ('fixtures', 'teams', 'settings')),
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by text
);

-- 3. Scored matches (one row per match; deleted ones stay as a marker so every phone drops them).
create table if not exists public.matches (
  id text primary key,
  data jsonb not null,
  deleted boolean not null default false,
  updated_at bigint not null,
  updated_by text
);

-- 4. Security: everyone reads; only the right people write.
alter table public.app_admins enable row level security;
alter table public.app_data enable row level security;
alter table public.matches enable row level security;

drop policy if exists "admins see admins" on public.app_admins;
create policy "admins see admins" on public.app_admins for select using (public.my_role() is not null);
drop policy if exists "super manages admins" on public.app_admins;
create policy "super manages admins" on public.app_admins for all
  using (public.my_role() = 'super') with check (public.my_role() = 'super');

drop policy if exists "everyone reads data" on public.app_data;
create policy "everyone reads data" on public.app_data for select using (true);
drop policy if exists "super writes data" on public.app_data;
create policy "super writes data" on public.app_data for all
  using (public.my_role() = 'super') with check (public.my_role() = 'super');

drop policy if exists "everyone reads matches" on public.matches;
create policy "everyone reads matches" on public.matches for select using (true);
drop policy if exists "scorers add matches" on public.matches;
create policy "scorers add matches" on public.matches for insert
  with check (public.my_role() in ('super', 'scorer'));
drop policy if exists "scorers update matches" on public.matches;
create policy "scorers update matches" on public.matches for update
  using (public.my_role() in ('super', 'scorer')) with check (public.my_role() in ('super', 'scorer'));
drop policy if exists "super removes matches" on public.matches;
create policy "super removes matches" on public.matches for delete using (public.my_role() = 'super');

-- 5. Live updates to every phone.
do $$ begin
  begin alter publication supabase_realtime add table public.matches; exception when others then null; end;
  begin alter publication supabase_realtime add table public.app_data; exception when others then null; end;
end $$;

-- 6. Logos and photos: public to view, only the super admin uploads.
insert into storage.buckets (id, name, public) values ('media', 'media', true) on conflict (id) do nothing;
drop policy if exists "media is public" on storage.objects;
create policy "media is public" on storage.objects for select using (bucket_id = 'media');
drop policy if exists "super uploads media" on storage.objects;
create policy "super uploads media" on storage.objects for insert
  with check (bucket_id = 'media' and public.my_role() = 'super');
drop policy if exists "super changes media" on storage.objects;
create policy "super changes media" on storage.objects for update
  using (bucket_id = 'media' and public.my_role() = 'super');
drop policy if exists "super deletes media" on storage.objects;
create policy "super deletes media" on storage.objects for delete
  using (bucket_id = 'media' and public.my_role() = 'super');
