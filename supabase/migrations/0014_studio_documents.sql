-- Multi-vertical foundation, Phase 1: case studies become documents.
--
-- The same rows, in place: studio_case_studies is RENAMED to studio_documents, so every id,
-- owner_id, workspace_id, timestamp, document and asset reference is exactly what it was. No row's
-- content is read or rewritten (adding a column with a constant default doesn't rewrite the table
-- or fire UPDATE triggers, so updated_at is unchanged).
--
--   studio_case_studies              -> studio_documents
--     framework_id, framework_version -> template_id, template_version
--     + document_type  (what kind of document; existing rows are 'ux_case_study')
--     + metadata       (details a template asks for that have no column of their own)
--     status           draft | archived  ->  draft | in_progress | ready_for_review | archived
--   studio_case_study_revisions      -> studio_document_revisions
--   case_study_id                    -> document_id   (assets, section notes, content backups, revisions)
--   studio_same_owner_as_case_study() -> studio_same_owner_as_document()
--
-- Access is unchanged: RLS on with no policies, no anon/authenticated grants, service role only.
-- Still private only: there is no published or public status.
--
-- Deploy together with the Express API that reads studio_documents (restart it after running this).
-- Undo: supabase/rollback/0014_studio_documents_down.sql. Both directions are exercised by
-- supabase/tests/migration_0014_dry_run.py inside a transaction that is rolled back.

do $$
begin
  if to_regclass('public.studio_documents') is not null then
    raise exception '0014 has already been applied (public.studio_documents exists).';
  end if;
  if to_regclass('public.studio_case_studies') is null then
    raise exception '0014 needs public.studio_case_studies (run 0006-0013 first).';
  end if;
end $$;

-- 1. The document table ---------------------------------------------------------------------------
alter table public.studio_case_studies rename to studio_documents;
alter table public.studio_documents rename column framework_id to template_id;
alter table public.studio_documents rename column framework_version to template_version;

alter table public.studio_documents
  add column document_type text not null default 'ux_case_study'
    check (document_type ~ '^[a-z][a-z0-9_]{1,59}$'),
  add column metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object' and pg_column_size(metadata) <= 65536);

alter table public.studio_documents alter column title set default 'Untitled document';

-- Private lifecycle. Which moves are allowed is the API's rule; the set of states is the database's.
alter table public.studio_documents drop constraint studio_case_studies_status_check;
alter table public.studio_documents
  add constraint studio_documents_status_check
    check (status in ('draft', 'in_progress', 'ready_for_review', 'archived'));

-- Names follow the table: indexes and triggers here; constraints on every table in section 4.
do $$
declare
  item record;
begin
  for item in
    select indexname from pg_indexes i
    where schemaname = 'public' and tablename = 'studio_documents' and indexname like 'studio\_case\_studies\_%'
      and not exists (select 1 from pg_constraint k where k.conindid = (quote_ident(i.schemaname) || '.' || quote_ident(i.indexname))::regclass)
  loop
    execute format('alter index public.%I rename to %I', item.indexname, replace(item.indexname, 'studio_case_studies_', 'studio_documents_'));
  end loop;
  for item in
    select tgname from pg_trigger
    where tgrelid = 'public.studio_documents'::regclass and not tgisinternal and tgname like 'studio\_case\_studies\_%'
  loop
    execute format('alter trigger %I on public.studio_documents rename to %I', item.tgname, replace(item.tgname, 'studio_case_studies_', 'studio_documents_'));
  end loop;
end $$;

create index studio_documents_owner_type_idx on public.studio_documents (owner_id, document_type);
create index studio_documents_template_idx on public.studio_documents (template_id, template_version);

comment on table public.studio_documents is
  'Private Studio documents of every type. Status draft|in_progress|ready_for_review|archived; never public. Access only through the Express API.';
comment on column public.studio_documents.document_type is
  'The kind of document (packages/shared/src/templates DOCUMENT_TYPES). Never renamed once used.';
comment on column public.studio_documents.template_id is
  'The template (and template_version, immutable) the document was made with. Null for documents older than templates.';
comment on column public.studio_documents.metadata is
  'Details the template asks for that have no column of their own (cleaned by the API against the template).';
comment on column public.studio_documents.setup_state is
  'Unfinished setup (wizard step + outline). Null once the document is created.';

-- 2. Tables that point at a document --------------------------------------------------------------
alter table public.studio_assets rename column case_study_id to document_id;
alter table public.studio_assets rename constraint studio_assets_case_study_fk to studio_assets_document_fk;
alter index public.studio_assets_case_study_idx rename to studio_assets_document_idx;

alter table public.studio_section_notes rename column case_study_id to document_id;

alter table public.studio_content_backups rename column case_study_id to document_id;
alter index public.studio_content_backups_case_study_idx rename to studio_content_backups_document_idx;

alter table public.studio_case_study_revisions rename to studio_document_revisions;
alter table public.studio_document_revisions rename column case_study_id to document_id;
alter index public.studio_revisions_case_study_idx rename to studio_revisions_document_idx;
comment on table public.studio_document_revisions is
  'Private version history of a document. Access only through the Express API.';

-- 3. A note's, backup's or version's owner must be the document's owner ---------------------------
-- The old function names the old table and column in its body, so it is replaced, not renamed.
create function public.studio_same_owner_as_document()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (select 1 from public.studio_documents d where d.id = new.document_id and d.owner_id = new.owner_id) then
    raise exception 'owner_id must match the document owner' using errcode = 'check_violation';
  end if;
  return new;
end $$;
revoke execute on function public.studio_same_owner_as_document() from public, anon, authenticated;

drop trigger studio_section_notes_owner on public.studio_section_notes;
create trigger studio_section_notes_owner
  before insert or update on public.studio_section_notes
  for each row execute function public.studio_same_owner_as_document();
drop trigger studio_content_backups_owner on public.studio_content_backups;
create trigger studio_content_backups_owner
  before insert or update on public.studio_content_backups
  for each row execute function public.studio_same_owner_as_document();
drop trigger studio_revisions_owner on public.studio_document_revisions;
create trigger studio_revisions_owner
  before insert or update on public.studio_document_revisions
  for each row execute function public.studio_same_owner_as_document();

drop function public.studio_same_owner_as_case_study();

-- 4. Constraint names follow the new table and column names -----------------------------------------
-- (Renaming a primary-key or unique constraint renames the index behind it.)
do $$
declare
  item record;
  renamed text;
begin
  for item in
    select c.relname, k.conname from pg_constraint k
    join pg_class c on c.oid = k.conrelid join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in ('studio_documents', 'studio_document_revisions', 'studio_assets', 'studio_section_notes', 'studio_content_backups')
  loop
    renamed := replace(replace(replace(replace(item.conname,
      'studio_case_studies_', 'studio_documents_'),
      'studio_case_study_revisions_', 'studio_document_revisions_'),
      'case_study_id', 'document_id'),
      '_framework_', '_template_');
    if renamed <> item.conname then
      execute format('alter table public.%I rename constraint %I to %I', item.relname, item.conname, renamed);
    end if;
  end loop;
end $$;

notify pgrst, 'reload schema';
