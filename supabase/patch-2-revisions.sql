-- BPL-2027: patch 2, match revisions. Run once in Supabase: SQL Editor -> New query -> paste -> Run.
-- Safe to run again. setup.sql already includes it for a fresh project.
--
-- Before: the copy with the later phone-clock time won, and an older one was
-- dropped without an error, so a phone with a wrong clock could lose balls
-- while showing "uploaded".
-- Now: every change raises the match's revision number by one. The server keeps
-- the higher revision and answers a stale copy with the error 'stale_match', so
-- the phone knows, keeps a backup and tells the scorer.

alter table public.matches add column if not exists rev integer not null default 0;

create or replace function public.guard_match_write() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  new.updated_by := auth.jwt() ->> 'email';
  if tg_op = 'UPDATE' then
    -- Deleting a match, or bringing a deleted one back, is for the super admin
    if new.deleted is distinct from old.deleted then
      if coalesce(public.my_role(), '') <> 'super' then return old; end if;
      return new;
    end if;
    -- The same copy sent again (a retry after a lost answer): nothing to do
    if new.data is not distinct from old.data then return old; end if;
    -- A newer revision always goes in
    if new.rev > old.rev then return new; end if;
    -- Rows and apps from before revisions: the old rule by time
    if new.rev = 0 and old.rev = 0 then
      if new.updated_at < old.updated_at then return old; end if;
      return new;
    end if;
    -- Another phone has already changed this match
    raise exception 'stale_match' using errcode = 'P0001', hint = old.rev::text;
  end if;
  return new;
end $$;
drop trigger if exists guard_match_write on public.matches;
create trigger guard_match_write before insert or update on public.matches
  for each row execute function public.guard_match_write();
