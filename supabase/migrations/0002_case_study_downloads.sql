-- A case study's downloadable version (one PDF, PowerPoint or Word file),
-- kept apart from the written story. Each entry: {kind, path, name, size, mime},
-- where path is a file in the case-study-media bucket.
-- Run once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.

alter table public.case_studies
  add column if not exists downloads jsonb not null default '[]'::jsonb;

-- Tell the API about the new column straight away.
notify pgrst, 'reload schema';
