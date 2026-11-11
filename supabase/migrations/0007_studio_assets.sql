-- Studio: private media library metadata (the files themselves go in the
-- private studio-private-media bucket, added with its policies in Phase 3).
-- See 0005 for the access model.

create table if not exists public.studio_assets (
  id             uuid primary key default gen_random_uuid(),
  workspace_id   uuid not null,
  owner_id       uuid not null references django.accounts_user (id) on delete cascade,
  -- Optional: the case study it was uploaded for. Deleting that case study
  -- keeps the asset in the library (only case_study_id is cleared).
  case_study_id  uuid,

  -- {owner_id}/{workspace_id}/{case-study-id or "library"}/{uuid}.{ext}
  path           text not null unique,
  kind           text not null check (kind in ('image', 'video', 'file')),
  mime           text not null default '' check (char_length(mime) <= 120),
  size           bigint not null default 0 check (size >= 0 and size <= 52428800),
  width          integer check (width is null or width > 0),
  height         integer check (height is null or height > 0),
  alt            text not null default '' check (char_length(alt) <= 500),
  original_name  text not null default '' check (char_length(original_name) <= 300),
  created_at     timestamptz not null default now(),

  constraint studio_assets_workspace_owner_fk
    foreign key (workspace_id, owner_id) references public.studio_workspaces (id, owner_id) on delete cascade,
  -- The case study must be in the same workspace (and so belong to the same owner).
  constraint studio_assets_case_study_fk
    foreign key (case_study_id, workspace_id) references public.studio_case_studies (id, workspace_id)
    on delete set null (case_study_id),
  -- Files live under the owner's and workspace's own folder, with a generated name.
  constraint studio_assets_path_scoped check (
    path like owner_id::text || '/' || workspace_id::text || '/%'
    and path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/([0-9a-f-]{36}|library)/[0-9a-f-]{36}\.[a-z0-9]{1,8}$'
  )
);

comment on table public.studio_assets is
  'Private Studio uploads (metadata). Files in the private studio-private-media bucket. Access only through the Express API.';

create index if not exists studio_assets_owner_idx on public.studio_assets (owner_id);
create index if not exists studio_assets_workspace_created_idx on public.studio_assets (workspace_id, created_at desc);
create index if not exists studio_assets_case_study_idx on public.studio_assets (case_study_id);

-- No updated_at here; only alt text is meant to change.
drop trigger if exists studio_assets_keep_owner on public.studio_assets;
create trigger studio_assets_keep_owner
  before update on public.studio_assets
  for each row execute function public.studio_keep_owner();

alter table public.studio_assets enable row level security;
revoke all on public.studio_assets from anon, authenticated;
grant select, insert, update, delete on public.studio_assets to service_role;

notify pgrst, 'reload schema';
