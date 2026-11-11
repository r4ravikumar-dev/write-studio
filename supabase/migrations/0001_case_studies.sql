-- Case studies for ravi.graphikx.in
-- Run once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
--
-- The one email address allowed to write is set in is_cms_owner() below
-- (owner@example.com; must match ADMIN_EMAIL in .env.local and Vercel).

-- ---------------------------------------------------------------------------
-- Who may write: one owner email, checked in every write policy.
-- ---------------------------------------------------------------------------
create or replace function public.is_cms_owner()
returns boolean
language sql
stable
as $$
  select coalesce(lower(auth.jwt() ->> 'email') = lower('owner@example.com'), false);
$$;

-- ---------------------------------------------------------------------------
-- The case studies.
-- ---------------------------------------------------------------------------
create table if not exists public.case_studies (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  status           text not null default 'draft' check (status in ('draft', 'published')),

  -- What the Work page and Home showcase need.
  title            text not null default 'Untitled case study',
  subtitle         text not null default '',
  label            text not null default '',          -- e.g. "Mamily × Visit Health"
  area             text not null default '',          -- e.g. "Women's wellness"
  tags             text[] not null default '{}',      -- e.g. {Mobile app, UX/UI}
  summary          text not null default '',
  focus            text not null default '',          -- "Focus: …" line
  thumbnail_url    text,                              -- a storage path in case-study-media
  thumbnail_alt    text not null default '',
  thumbnail_focus  text not null default 'center',    -- CSS object-position
  cover_url        text,                              -- the opening visual (a storage path)
  layout           text not null default 'split' check (layout in ('wide', 'split', 'split-reverse')),
  is_featured      boolean not null default false,    -- shows on Home
  sort_order       integer not null default 0,
  seo_description  text not null default '',

  -- The body, as a Tiptap (ProseMirror) document. This is the working draft.
  content          jsonb not null default '{"type":"doc","content":[]}'::jsonb,

  -- The live version: a snapshot of every field above (and the body) taken
  -- at publish time. The site reads only this, so editing a published case
  -- study never changes the live page until it is published again.
  published        jsonb,

  published_at     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists case_studies_published_idx
  on public.case_studies (status, sort_order);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists case_studies_touch on public.case_studies;
create trigger case_studies_touch
  before update on public.case_studies
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Row-level security: everyone reads published; only the owner reads drafts
-- and writes.
-- ---------------------------------------------------------------------------
alter table public.case_studies enable row level security;

drop policy if exists "Published case studies are public" on public.case_studies;
create policy "Published case studies are public"
  on public.case_studies for select
  using ((status = 'published' and published is not null) or public.is_cms_owner());

drop policy if exists "Owner inserts case studies" on public.case_studies;
create policy "Owner inserts case studies"
  on public.case_studies for insert
  with check (public.is_cms_owner());

drop policy if exists "Owner updates case studies" on public.case_studies;
create policy "Owner updates case studies"
  on public.case_studies for update
  using (public.is_cms_owner())
  with check (public.is_cms_owner());

drop policy if exists "Owner deletes case studies" on public.case_studies;
create policy "Owner deletes case studies"
  on public.case_studies for delete
  using (public.is_cms_owner());

-- ---------------------------------------------------------------------------
-- Every uploaded file is recorded here (the file itself is in storage), so
-- the studio's media library can list, search and reuse uploads, and blocks
-- reference assets by storage path with their metadata.
-- ---------------------------------------------------------------------------
create table if not exists public.assets (
  id             uuid primary key default gen_random_uuid(),
  path           text not null unique,                 -- path inside case-study-media
  kind           text not null check (kind in ('image', 'video', 'file')),
  mime           text not null default '',
  size           bigint not null default 0,
  width          integer,
  height         integer,
  alt            text not null default '',
  original_name  text not null default '',
  case_study_id  uuid references public.case_studies (id) on delete set null,
  created_at     timestamptz not null default now()
);

create index if not exists assets_created_idx on public.assets (created_at desc);

alter table public.assets enable row level security;

drop policy if exists "Assets are public" on public.assets;
create policy "Assets are public"
  on public.assets for select
  using (true);

drop policy if exists "Owner manages assets" on public.assets;
create policy "Owner manages assets"
  on public.assets for all
  using (public.is_cms_owner())
  with check (public.is_cms_owner());

-- ---------------------------------------------------------------------------
-- Media storage: public to read (the published pages show it), owner-only to
-- write. 50 MB per file (the Supabase free-plan ceiling); images, video, PDF,
-- PowerPoint and Word.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'case-study-media',
  'case-study-media',
  true,
  52428800,
  array[
    'image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif', 'image/svg+xml',
    'video/mp4', 'video/webm', 'video/quicktime',
    'application/pdf',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Case study media is public" on storage.objects;
create policy "Case study media is public"
  on storage.objects for select
  using (bucket_id = 'case-study-media');

drop policy if exists "Owner uploads case study media" on storage.objects;
create policy "Owner uploads case study media"
  on storage.objects for insert
  with check (bucket_id = 'case-study-media' and public.is_cms_owner());

drop policy if exists "Owner updates case study media" on storage.objects;
create policy "Owner updates case study media"
  on storage.objects for update
  using (bucket_id = 'case-study-media' and public.is_cms_owner());

drop policy if exists "Owner deletes case study media" on storage.objects;
create policy "Owner deletes case study media"
  on storage.objects for delete
  using (bucket_id = 'case-study-media' and public.is_cms_owner());
