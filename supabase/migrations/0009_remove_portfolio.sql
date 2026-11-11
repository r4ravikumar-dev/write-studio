-- Remove the single-owner portfolio subsystem. The product is only the
-- public, multi-user Studio (0005-0008); the portfolio's public data layer
-- is obsolete:
--   public.case_studies, public.assets, public.side_work   (0001-0003)
--   public.is_cms_owner()  (the hardcoded owner check)      (0001, 0004)
--   the public case-study-media bucket's storage policies   (0001)
--
-- Safety: refuses to run if any of that still holds data, so nothing is
-- ever dropped by accident. Export or delete the data first.
--
-- The bucket itself can't be removed with SQL (Supabase protects storage
-- tables): once this has run, delete the empty `case-study-media` bucket in
-- Supabase -> Storage, or with the Storage API (DELETE /storage/v1/bucket/case-study-media).
--
-- Kept on purpose: public.touch_updated_at() (0001), which the Studio tables'
-- updated_at triggers use, and the `django` schema (0004).
-- Forward-only: earlier migrations are not edited.

do $$
declare
  leftover text := '';
  t text;
  has_rows boolean;
begin
  foreach t in array array['public.case_studies', 'public.assets', 'public.side_work'] loop
    -- Dynamic SQL: a table that's already gone must not break the check.
    if to_regclass(t) is not null then
      execute format('select exists (select 1 from %s)', t) into has_rows;
      if has_rows then
        leftover := leftover || ' ' || t;
      end if;
    end if;
  end loop;
  if exists (select 1 from storage.objects where bucket_id = 'case-study-media') then
    leftover := leftover || ' storage(case-study-media)';
  end if;
  if leftover <> '' then
    raise exception 'Not removing the portfolio data layer: these still hold data:%', leftover;
  end if;
end;
$$;

-- Public storage access to the old bucket.
drop policy if exists "Case study media is public" on storage.objects;
drop policy if exists "Owner uploads case study media" on storage.objects;
drop policy if exists "Owner updates case study media" on storage.objects;
drop policy if exists "Owner deletes case study media" on storage.objects;

-- The portfolio tables (their policies, triggers and indexes go with them).
drop table if exists public.side_work;
drop table if exists public.assets;
drop table if exists public.case_studies;

-- The hardcoded single-owner check; nothing uses it any more.
drop function if exists public.is_cms_owner();

notify pgrst, 'reload schema';
