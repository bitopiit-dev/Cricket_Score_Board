-- BPL-2027 patch 6: the super admin edits the sports committee.
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run. Safe to run again.
-- setup.sql already includes it for a fresh project.
--
-- The committee list (names, posts, photos) is saved in app_data under the key
-- 'committee', next to the fixture and team lists, with the same rules:
-- everyone reads it, only the super admin writes it. Photos go to the public
-- 'media' bucket under committee/, which the super admin can already upload to.

do $$
declare c record;
begin
  -- Drop the old "which keys are allowed" check, whatever it was named
  for c in
    select conname from pg_constraint
    where conrelid = 'public.app_data'::regclass and contype = 'c'
  loop
    execute format('alter table public.app_data drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.app_data
  add constraint app_data_key_check check (key in ('fixtures', 'teams', 'settings', 'committee'));

notify pgrst, 'reload schema';
