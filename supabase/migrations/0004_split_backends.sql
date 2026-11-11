-- The studio now runs on three services (see README.md):
--   * the Django auth service signs the owner in and issues JWTs,
--   * the Express API reads and writes these tables with the service-role key
--     (which bypasses row-level security) after checking that JWT,
--   * the Next.js frontend talks only to those two.
-- Supabase Auth is no longer used, so nobody holds a Supabase session that
-- could pass is_cms_owner(). Run once, after 0001-0003:
-- SQL Editor -> New query -> paste -> Run.

-- ---------------------------------------------------------------------------
-- 1. No browser (anon or a Supabase Auth user) may write any more: the owner
--    policies all go through is_cms_owner(), which now always says no. Only
--    the Express API's service role writes.
-- ---------------------------------------------------------------------------
create or replace function public.is_cms_owner()
returns boolean
language sql
stable
as $$
  select false;
$$;

-- ---------------------------------------------------------------------------
-- 2. Public reads stay as they were (published case studies, assets, side
--    work, and the public media bucket), so media URLs keep working.
--    Uploads now use one-time signed URLs that the Express API creates.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 3. The Django auth service keeps its tables (users, login codes, revoked
--    tokens) in their own schema, which the Supabase REST API does not
--    expose. Point Django at this database with DATABASE_URL and
--    DJANGO_DB_SCHEMA=django, then run `python manage.py migrate`.
-- ---------------------------------------------------------------------------
create schema if not exists django;
revoke all on schema django from anon, authenticated;
alter default privileges in schema django revoke all on tables from anon, authenticated;
alter default privileges in schema django revoke all on sequences from anon, authenticated;

notify pgrst, 'reload schema';
