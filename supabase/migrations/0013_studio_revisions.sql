-- Editor roadmap T7: version history. Earlier states of a case study's document (and its title and
-- subtitle), private to the owner:
--   auto            taken by the API before an autosave when the newest version is over 10 minutes old
--                   (the newest 50 are kept)
--   named           saved by the owner, with a name (kept until deleted)
--   before_restore  the document just before a version was restored, so a restore can be undone
-- Same access model as the other studio tables: RLS on, no policies, no anon/authenticated grants;
-- only the Express API (service role) reads or writes, always scoped to the owner.

create table if not exists public.studio_case_study_revisions (
  id                      uuid primary key default gen_random_uuid(),
  case_study_id           uuid not null references public.studio_case_studies (id) on delete cascade,
  owner_id                uuid not null references django.accounts_user (id) on delete cascade,
  kind                    text not null check (kind in ('auto', 'named', 'before_restore')),
  name                    text check (name is null or char_length(name) between 1 and 100),
  title                   text not null default '' check (char_length(title) <= 300),
  subtitle                text not null default '' check (char_length(subtitle) <= 500),
  content                 jsonb not null check (jsonb_typeof(content) = 'object' and pg_column_size(content) <= 2097152),
  content_schema_version  integer not null default 1 check (content_schema_version >= 1),
  created_at              timestamptz not null default now(),
  constraint studio_revisions_named_have_names check ((kind = 'named') = (name is not null))
);
create index if not exists studio_revisions_case_study_idx on public.studio_case_study_revisions (case_study_id, created_at desc);
create index if not exists studio_revisions_owner_idx on public.studio_case_study_revisions (owner_id);
comment on table public.studio_case_study_revisions is
  'Private version history of a case study document. Access only through the Express API.';

-- A version's owner must be the case study's owner (function from 0011).
drop trigger if exists studio_revisions_owner on public.studio_case_study_revisions;
create trigger studio_revisions_owner
  before insert or update on public.studio_case_study_revisions
  for each row execute function public.studio_same_owner_as_case_study();

alter table public.studio_case_study_revisions enable row level security;
revoke all on public.studio_case_study_revisions from anon, authenticated;
grant select, insert, update, delete on public.studio_case_study_revisions to service_role;
