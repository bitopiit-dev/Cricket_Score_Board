-- BPL-2027: patch 3, match times. Run once in Supabase: SQL Editor -> New query -> paste -> Run.
-- Safe to run again. setup.sql already includes it for a fresh project.
--
-- A super admin or a scorer can move a match to another start time, or let two
-- matches on the same day trade times (12:00 <-> 13:00). Scorers still cannot
-- write the fixture list directly: this function accepts a new list only when
-- every match is the same as the saved one apart from its "time" (the order may
-- change too, so the day stays in time order). Anything else is refused.

create or replace function public.reschedule_fixtures(next jsonb, base_updated_at timestamptz)
  returns timestamptz
  language plpgsql security definer set search_path = public as $$
declare
  cur jsonb;
  cur_at timestamptz;
  new_at timestamptz;
begin
  if coalesce(public.my_role(), '') not in ('super', 'scorer') then
    raise exception 'not_allowed';
  end if;

  select value, updated_at into cur, cur_at
    from public.app_data where key = 'fixtures' for update;
  if cur is null then
    raise exception 'no_published_fixtures';
  end if;
  -- Someone saved the fixtures in the meantime: the phone reloads and tries again
  if base_updated_at is distinct from cur_at then
    raise exception 'stale_fixtures';
  end if;

  if jsonb_typeof(next) <> 'array'
     or jsonb_array_length(next) <> jsonb_array_length(cur)
     or (select count(distinct n->>'id') from jsonb_array_elements(next) n) <> jsonb_array_length(next)
     or exists (
       select 1 from jsonb_array_elements(next) n
       where not exists (
         select 1 from jsonb_array_elements(cur) c
         where c->>'id' = n->>'id' and (c - 'time') = (n - 'time')
       )
     ) then
    raise exception 'only_time';
  end if;

  if exists (
    select 1 from jsonb_array_elements(next) n
    where coalesce(n->>'time', '') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
  ) then
    raise exception 'bad_time';
  end if;

  new_at := now();
  update public.app_data set value = next, updated_at = new_at where key = 'fixtures';
  return new_at;
end $$;

revoke all on function public.reschedule_fixtures(jsonb, timestamptz) from public, anon;
grant execute on function public.reschedule_fixtures(jsonb, timestamptz) to authenticated;
