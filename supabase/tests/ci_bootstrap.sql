-- CI Bootstrap for PostgreSQL Service Container in GitHub Actions
-- Mirrors the standard Supabase system extensions, roles, and schemas.

-- 1. Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- 2. Standard Supabase Roles
do $$
begin
  if not exists (select from pg_roles where rolname = 'anon') then
    create role anon;
  end if;
  if not exists (select from pg_roles where rolname = 'authenticated') then
    create role authenticated;
  end if;
  if not exists (select from pg_roles where rolname = 'service_role') then
    create role service_role;
  end if;
end $$;

-- 3. Auth Schema Stub
create schema if not exists auth;
create or replace function auth.jwt()
returns jsonb
language sql
stable
as $$
  select '{}'::jsonb;
$$;

create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select null::uuid;
$$;

-- 4. Storage Schema Stub
create schema if not exists storage;

create table if not exists storage.buckets (
  id text primary key,
  name text not null,
  owner uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  public boolean default false,
  avif_autodetection boolean default false,
  file_size_limit bigint,
  allowed_mime_types text[],
  owner_id text
);

create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets(id),
  name text,
  owner uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  last_accessed_at timestamptz default now(),
  metadata jsonb,
  path_tokens text[]
);
