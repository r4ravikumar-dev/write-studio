-- Studio: private case studies, one workspace each. Private by default and,
-- in this release, private only: no published state, snapshot, public slug
-- route or SEO fields. See 0005 for the access model.

create table if not exists public.studio_case_studies (
  id                      uuid primary key default gen_random_uuid(),
  workspace_id            uuid not null,
  owner_id                uuid not null references django.accounts_user (id) on delete cascade,

  -- Unique within the workspace only: two users may both have "my-app".
  slug                    text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  title                   text not null default 'Untitled case study' check (char_length(title) <= 300),
  subtitle                text not null default '' check (char_length(subtitle) <= 500),
  label                   text not null default '' check (char_length(label) <= 200),
  area                    text not null default '' check (char_length(area) <= 200),
  tags                    text[] not null default '{}' check (cardinality(tags) <= 20),
  summary                 text not null default '' check (char_length(summary) <= 2000),
  focus                   text not null default '' check (char_length(focus) <= 500),

  -- Paths in the private studio-private-media bucket (never URLs).
  thumbnail_path          text check (thumbnail_path is null or thumbnail_path !~ '^[a-z]+:'),
  thumbnail_alt           text not null default '' check (char_length(thumbnail_alt) <= 500),
  thumbnail_focus         text not null default 'center' check (char_length(thumbnail_focus) <= 40),
  cover_path              text check (cover_path is null or cover_path !~ '^[a-z]+:'),
  layout                  text not null default 'split' check (layout in ('wide', 'split', 'split-reverse')),

  -- The Tiptap document (same schema as the portfolio editor), capped at ~2 MB.
  content                 jsonb not null default '{"type":"doc","content":[]}'::jsonb
                            check (jsonb_typeof(content) = 'object' and content ->> 'type' = 'doc'
                                   and pg_column_size(content) <= 2097152),
  content_schema_version  integer not null default 1 check (content_schema_version >= 1),

  status                  text not null default 'draft' check (status in ('draft', 'archived')),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),

  -- A case study can only sit in a workspace its owner owns.
  constraint studio_case_studies_workspace_owner_fk
    foreign key (workspace_id, owner_id) references public.studio_workspaces (id, owner_id) on delete cascade,
  constraint studio_case_studies_workspace_slug_key unique (workspace_id, slug),
  -- Lets assets reference (case study, workspace) together.
  constraint studio_case_studies_id_workspace_key unique (id, workspace_id)
);

comment on table public.studio_case_studies is
  'Private Studio case studies. Status draft|archived only; never public. Access only through the Express API.';

create index if not exists studio_case_studies_owner_idx on public.studio_case_studies (owner_id);
create index if not exists studio_case_studies_workspace_updated_idx on public.studio_case_studies (workspace_id, updated_at desc);
create index if not exists studio_case_studies_workspace_status_idx on public.studio_case_studies (workspace_id, status);

drop trigger if exists studio_case_studies_touch on public.studio_case_studies;
create trigger studio_case_studies_touch
  before update on public.studio_case_studies
  for each row execute function public.touch_updated_at();

drop trigger if exists studio_case_studies_keep_owner on public.studio_case_studies;
create trigger studio_case_studies_keep_owner
  before update on public.studio_case_studies
  for each row execute function public.studio_keep_owner();

alter table public.studio_case_studies enable row level security;
revoke all on public.studio_case_studies from anon, authenticated;
grant select, insert, update, delete on public.studio_case_studies to service_role;
