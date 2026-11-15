-- BPL-2027: security patch 1. Run once in Supabase: SQL Editor -> New query -> paste -> Run.
-- Safe to run again. setup.sql already includes these rules for a fresh project.

-- 1. A role only for a confirmed email address, so nobody can sign up with an
--    admin's email (whatever the "Confirm email" setting is).
create or replace function public.my_role() returns text
  language sql stable security definer set search_path = public as $$
  select a.role
  from public.app_admins a
  join auth.users u on lower(u.email) = lower(a.email)
  where u.id = auth.uid() and u.email_confirmed_at is not null
$$;
grant execute on function public.my_role() to anon, authenticated;

-- 2. Uploaded scores: the server keeps the newest copy, only the super admin
--    deletes or brings back a match, and "updated by" is the signed-in email.
--    A refused change is skipped quietly (no error), so a phone does not retry it forever.
create or replace function public.guard_match_write() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  new.updated_by := auth.jwt() ->> 'email';
  if tg_op = 'UPDATE' then
    -- An older copy from another phone never replaces a newer score
    if new.updated_at < old.updated_at then return old; end if;
    -- Deleting a match, or bringing a deleted one back, is for the super admin
    if new.deleted is distinct from old.deleted and coalesce(public.my_role(), '') <> 'super' then
      return old;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists guard_match_write on public.matches;
create trigger guard_match_write before insert or update on public.matches
  for each row execute function public.guard_match_write();

-- 3. "Updated by" on fixtures and teams is the signed-in email too.
create or replace function public.stamp_app_data() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  new.updated_by := auth.jwt() ->> 'email';
  return new;
end $$;
drop trigger if exists stamp_app_data on public.app_data;
create trigger stamp_app_data before insert or update on public.app_data
  for each row execute function public.stamp_app_data();
