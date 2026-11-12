-- Undoes 0014_studio_documents.sql: documents become case studies again, in place (same rows).
--
-- Use only inside the rollback window, together with the previous Express API. What it cannot
-- keep, because the old schema has nowhere to put it:
--   * document_type and metadata are dropped. It REFUSES to run while any document is not a
--     'ux_case_study' or has metadata, so no other kind of document is ever silently relabelled.
--   * status in_progress and ready_for_review become draft.
-- Everything else (ids, owners, workspaces, content, timestamps, assets, notes, versions) is untouched.

do $$
declare
  other integer;
begin
  if to_regclass('public.studio_documents') is null then
    raise exception '0014 is not applied (public.studio_documents does not exist).';
  end if;
  select count(*) into other from public.studio_documents where document_type <> 'ux_case_study' or metadata <> '{}'::jsonb;
  if other > 0 then
    raise exception 'Refusing to roll back: % document(s) are not UX case studies or carry template metadata. Export or remove them first.', other;
  end if;
end $$;

-- 3. Owner function and triggers
create function public.studio_same_owner_as_case_study()
returns trigger language plpgsql as $$
begin
  if not exists (select 1 from public.studio_case_studies s where s.id = new.case_study_id and s.owner_id = new.owner_id) then
    raise exception 'owner_id must match the case study owner';
  end if;
  return new;
end $$;
revoke execute on function public.studio_same_owner_as_case_study() from public, anon, authenticated;

drop trigger studio_section_notes_owner on public.studio_section_notes;
drop trigger studio_content_backups_owner on public.studio_content_backups;
drop trigger studio_revisions_owner on public.studio_document_revisions;

-- 2. Tables that point at a document
alter index public.studio_revisions_document_idx rename to studio_revisions_case_study_idx;
alter table public.studio_document_revisions rename column document_id to case_study_id;
alter table public.studio_document_revisions rename to studio_case_study_revisions;
comment on table public.studio_case_study_revisions is
  'Private version history of a case study document. Access only through the Express API.';

alter index public.studio_content_backups_document_idx rename to studio_content_backups_case_study_idx;
alter table public.studio_content_backups rename column document_id to case_study_id;
alter table public.studio_section_notes rename column document_id to case_study_id;

alter index public.studio_assets_document_idx rename to studio_assets_case_study_idx;
alter table public.studio_assets rename constraint studio_assets_document_fk to studio_assets_case_study_fk;
alter table public.studio_assets rename column document_id to case_study_id;

create trigger studio_section_notes_owner
  before insert or update on public.studio_section_notes
  for each row execute function public.studio_same_owner_as_case_study();
create trigger studio_content_backups_owner
  before insert or update on public.studio_content_backups
  for each row execute function public.studio_same_owner_as_case_study();
create trigger studio_revisions_owner
  before insert or update on public.studio_case_study_revisions
  for each row execute function public.studio_same_owner_as_case_study();

drop function public.studio_same_owner_as_document();

-- 1. The document table
drop index public.studio_documents_owner_type_idx;
drop index public.studio_documents_template_idx;

-- updated_at must not move: this is a schema rollback, not an edit.
alter table public.studio_documents disable trigger user;
update public.studio_documents set status = 'draft' where status in ('in_progress', 'ready_for_review');
alter table public.studio_documents enable trigger user;

alter table public.studio_documents drop constraint studio_documents_status_check;
alter table public.studio_documents add constraint studio_case_studies_status_check check (status in ('draft', 'archived'));
alter table public.studio_documents alter column title set default 'Untitled case study';
alter table public.studio_documents drop column document_type, drop column metadata;

do $$
declare
  item record;
begin
  for item in
    select tgname from pg_trigger
    where tgrelid = 'public.studio_documents'::regclass and not tgisinternal and tgname like 'studio\_documents\_%'
  loop
    execute format('alter trigger %I on public.studio_documents rename to %I', item.tgname, replace(item.tgname, 'studio_documents_', 'studio_case_studies_'));
  end loop;
  for item in
    select indexname from pg_indexes i
    where schemaname = 'public' and tablename = 'studio_documents' and indexname like 'studio\_documents\_%'
      and not exists (select 1 from pg_constraint k where k.conindid = (quote_ident(i.schemaname) || '.' || quote_ident(i.indexname))::regclass)
  loop
    execute format('alter index public.%I rename to %I', item.indexname, replace(item.indexname, 'studio_documents_', 'studio_case_studies_'));
  end loop;
end $$;

alter table public.studio_documents rename column template_version to framework_version;
alter table public.studio_documents rename column template_id to framework_id;
alter table public.studio_documents rename to studio_case_studies;

-- Constraint names go back with the table and column names.
do $$
declare
  item record;
  renamed text;
begin
  for item in
    select c.relname, k.conname from pg_constraint k
    join pg_class c on c.oid = k.conrelid join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in ('studio_case_studies', 'studio_case_study_revisions', 'studio_assets', 'studio_section_notes', 'studio_content_backups')
  loop
    renamed := replace(replace(replace(replace(item.conname,
      'studio_documents_', 'studio_case_studies_'),
      'studio_document_revisions_', 'studio_case_study_revisions_'),
      'document_id', 'case_study_id'),
      '_template_', '_framework_');
    if renamed <> item.conname then
      execute format('alter table public.%I rename constraint %I to %I', item.relname, item.conname, renamed);
    end if;
  end loop;
end $$;

comment on column public.studio_case_studies.framework_id is null;
comment on table public.studio_case_studies is
  'Private Studio case studies. Status draft|archived only; never public. Access only through the Express API.';
comment on column public.studio_case_studies.setup_state is
  'Unfinished project setup (wizard step + outline). Null once the case study is created.';

notify pgrst, 'reload schema';
