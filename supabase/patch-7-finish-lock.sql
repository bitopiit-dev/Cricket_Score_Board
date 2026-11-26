-- BPL-2027: patch 7, finished matches are locked. Run once in Supabase: SQL Editor -> New query -> paste -> Run.
-- Safe to run again. setup.sql already includes it for a fresh project.
--
-- When the scorer taps Finish match, the app saves finishedAt in the match.
-- From then on the server refuses any change to that match's score from
-- anyone but a super admin, so an old phone or a second scorer can't change a
-- finished result. Choosing the Man of the Match is still allowed.

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
    -- A finished match (patch 7): only a super admin may change its score or
    -- unlock it. A scorer may still choose the Man of the Match. A refused copy
    -- gets 'stale_match', so the phone takes the server's locked copy.
    if old.data ? 'finishedAt' and coalesce(public.my_role(), '') <> 'super'
       and (new.data - 'manOfTheMatch' - 'updatedAt' - 'rev')
           is distinct from (old.data - 'manOfTheMatch' - 'updatedAt' - 'rev') then
      raise exception 'stale_match' using errcode = 'P0001', hint = old.rev::text;
    end if;
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
