-- BPL-2027 patch 4: match alerts (push notifications) and the photo gallery.
-- Run after setup.sql and patches 1-3: SQL Editor -> New query -> paste -> Run.
-- Safe to run again. Push stays switched off until the two vault secrets in
-- step 4 exist (see README, "Match alerts").

-- 1. Phones that asked for alerts. Nobody reads this table from the app: phones
--    only add or remove their own entry through the two functions below, and
--    the Edge Function reads it with the service role.
create table if not exists public.push_subscriptions (
  endpoint text primary key,
  p256dh text not null,
  auth text not null,
  -- Tournament team ids to follow; empty means every team
  teams text[] not null default '{}',
  -- 'key': start, wickets, fifties, innings break, result. 'result': the result only.
  level text not null default 'key' check (level in ('key', 'result')),
  lang text not null default 'bn' check (lang in ('bn', 'en')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;

create or replace function public.push_subscribe(
  endpoint text, p256dh text, auth text, teams text[], level text, lang text
) returns void
  language plpgsql security definer set search_path = public as $$
begin
  if endpoint !~ '^https://' or length(endpoint) > 1000
     or length(p256dh) > 200 or length(auth) > 100
     or coalesce(array_length(teams, 1), 0) > 20
     or exists (select 1 from unnest(teams) t where t !~ '^[a-z0-9-]{1,60}$') then
    raise exception 'bad_subscription';
  end if;
  insert into public.push_subscriptions as s (endpoint, p256dh, auth, teams, level, lang)
    values (push_subscribe.endpoint, push_subscribe.p256dh, push_subscribe.auth,
            push_subscribe.teams, push_subscribe.level, push_subscribe.lang)
  on conflict on constraint push_subscriptions_pkey do update
    set p256dh = excluded.p256dh, auth = excluded.auth, teams = excluded.teams,
        level = excluded.level, lang = excluded.lang, updated_at = now();
end $$;

create or replace function public.push_unsubscribe(endpoint text) returns void
  language sql security definer set search_path = public as $$
  delete from public.push_subscriptions s where s.endpoint = push_unsubscribe.endpoint
$$;

revoke all on function public.push_subscribe(text, text, text, text[], text, text) from public;
revoke all on function public.push_unsubscribe(text) from public;
grant execute on function public.push_subscribe(text, text, text, text[], text, text) to anon, authenticated;
grant execute on function public.push_unsubscribe(text) to anon, authenticated;

-- 2. Alerts already sent, so a retry, a second scorer or an undo never sends one twice.
create table if not exists public.push_log (
  match_id text not null,
  key text not null,
  sent_at timestamptz not null default now(),
  primary key (match_id, key)
);
alter table public.push_log enable row level security;

-- 3. Every saved change to a tournament match calls the Edge Function
--    'match-notify', which works out what happened and sends the alerts.
create extension if not exists pg_net with schema extensions;

create or replace function public.notify_match_change() returns trigger
  language plpgsql security definer set search_path = public, extensions as $$
declare
  fn_url text;
  fn_secret text;
begin
  if new.deleted then return null; end if;
  -- The server kept its own copy (a retry or a stale upload): nothing new
  if tg_op = 'UPDATE' and new.data is not distinct from old.data then return null; end if;
  -- Only matches between two tournament teams, never a practice game
  if new.data #>> '{teams,0,teamId}' is null or new.data #>> '{teams,1,teamId}' is null then
    return null;
  end if;
  select decrypted_secret into fn_url from vault.decrypted_secrets where name = 'notify_url';
  select decrypted_secret into fn_secret from vault.decrypted_secrets where name = 'notify_secret';
  if fn_url is null or fn_secret is null then return null; end if; -- push not set up yet
  perform net.http_post(
    url := fn_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-notify-secret', fn_secret),
    body := jsonb_build_object(
      'record', to_jsonb(new),
      'old_record', case when tg_op = 'UPDATE' then to_jsonb(old) end
    ),
    timeout_milliseconds := 8000
  );
  return null;
end $$;

drop trigger if exists notify_match_change on public.matches;
create trigger notify_match_change after insert or update on public.matches
  for each row execute function public.notify_match_change();

-- 4. Switch push on (once, after deploying the Edge Function). Replace both values:
--   select vault.create_secret('https://<project-ref>.supabase.co/functions/v1/match-notify', 'notify_url');
--   select vault.create_secret('<the same random NOTIFY_SECRET you gave the function>', 'notify_secret');

-- 5. Photo gallery: one row per photo; the files live in the public 'media'
--    bucket under gallery/<season>/. Everyone sees them; the super admin manages them.
create table if not exists public.media_items (
  id uuid primary key default gen_random_uuid(),
  season integer not null check (season between 2000 and 2100),
  -- Fixture id when the photo belongs to a match
  fixture_id text,
  path text not null,
  thumb_path text not null,
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  caption text check (caption is null or length(caption) <= 200),
  created_at timestamptz not null default now(),
  created_by text
);
create index if not exists media_items_season on public.media_items (season, created_at desc);
alter table public.media_items enable row level security;

drop policy if exists "everyone sees photos" on public.media_items;
create policy "everyone sees photos" on public.media_items for select using (true);
drop policy if exists "super manages photos" on public.media_items;
create policy "super manages photos" on public.media_items for all
  using (public.my_role() = 'super') with check (public.my_role() = 'super');

create or replace function public.stamp_media_item() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  new.created_by := auth.jwt() ->> 'email';
  return new;
end $$;
drop trigger if exists stamp_media_item on public.media_items;
create trigger stamp_media_item before insert on public.media_items
  for each row execute function public.stamp_media_item();

do $$ begin
  begin alter publication supabase_realtime add table public.media_items; exception when others then null; end;
end $$;
