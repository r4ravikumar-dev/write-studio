-- Write Studio 2.0, Stage 2 (story structure & guidance).
--  1. studio_content_backups: the stored document as it was before a schema migration
--     (content_schema_version 1 → 2), so every migration is recoverable.
--  2. studio_section_notes: private notes per section. Never part of the document, its preview
--     or any export. Keyed by the section id stored on the section's heading.
-- Same access model as the other studio tables: RLS on, no policies, no anon/authenticated
-- grants; only the Express API (service role) reads or writes, always scoped to the owner.

create table if not exists public.studio_content_backups (
  id              uuid primary key default gen_random_uuid(),
  case_study_id   uuid not null references public.studio_case_studies (id) on delete cascade,
  owner_id        uuid not null references django.accounts_user (id) on delete cascade,
  from_version    integer not null check (from_version >= 1),
  to_version      integer not null check (to_version > from_version),
  content         jsonb not null check (jsonb_typeof(content) = 'object' and pg_column_size(content) <= 2097152),
  created_at      timestamptz not null default now()
);
create index if not exists studio_content_backups_case_study_idx on public.studio_content_backups (case_study_id);
comment on table public.studio_content_backups is
  'Documents as they were before a content schema migration (recovery only). Access only through the Express API.';

create table if not exists public.studio_section_notes (
  id              uuid primary key default gen_random_uuid(),
  case_study_id   uuid not null references public.studio_case_studies (id) on delete cascade,
  owner_id        uuid not null references django.accounts_user (id) on delete cascade,
  section_id      text not null check (section_id ~ '^s[a-z0-9]{6,24}$'),
  body            text not null check (char_length(body) between 1 and 5000),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint studio_section_notes_section_key unique (case_study_id, section_id)
);
create index if not exists studio_section_notes_owner_idx on public.studio_section_notes (owner_id);
comment on table public.studio_section_notes is
  'Private per-section notes. Never stored in the document or exported. Access only through the Express API.';

drop trigger if exists studio_section_notes_touch on public.studio_section_notes;
create trigger studio_section_notes_touch
  before update on public.studio_section_notes
  for each row execute function public.touch_updated_at();

-- A note's or backup's owner must be the case study's owner.
create or replace function public.studio_same_owner_as_case_study()
returns trigger language plpgsql as $$
begin
  if not exists (select 1 from public.studio_case_studies s where s.id = new.case_study_id and s.owner_id = new.owner_id) then
    raise exception 'owner_id must match the case study owner';
  end if;
  return new;
end $$;

drop trigger if exists studio_section_notes_owner on public.studio_section_notes;
create trigger studio_section_notes_owner
  before insert or update on public.studio_section_notes
  for each row execute function public.studio_same_owner_as_case_study();
drop trigger if exists studio_content_backups_owner on public.studio_content_backups;
create trigger studio_content_backups_owner
  before insert or update on public.studio_content_backups
  for each row execute function public.studio_same_owner_as_case_study();

alter table public.studio_content_backups enable row level security;
alter table public.studio_section_notes enable row level security;
revoke all on public.studio_content_backups, public.studio_section_notes from anon, authenticated;
grant select, insert, update, delete on public.studio_content_backups, public.studio_section_notes to service_role;
revoke execute on function public.studio_same_owner_as_case_study() from public, anon, authenticated;
