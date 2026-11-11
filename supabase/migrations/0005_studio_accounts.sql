-- Studio (public registration, private workspaces): accounts and workspaces.
--
-- Who a user is lives in the Django auth service (django.accounts_user, UUID
-- ids; see backend/django/accounts/models.py). Run `python manage.py migrate`
-- in backend/django BEFORE this file, so that table exists.
--
-- Every account gets exactly one personal workspace, created by a trigger
-- when the account row is inserted; nothing in the app creates workspaces.
--
-- Access model (applies to every studio_* table):
--   * Only the Express API touches these tables, with the service role, and it
--     scopes every query to the user id in the verified Django JWT.
--   * Row-level security is ON with NO policies, and anon/authenticated have
--     no grants: Supabase's public REST API can never read or write them.
--   * Constraints and triggers below keep ownership consistent even if the
--     API has a bug: a row can't point at another user's workspace, and
--     owner/workspace can never be changed after insert.
--
-- Forward-only. Legacy portfolio tables (case_studies, assets, side_work) and
-- the case-study-media bucket are not touched.

create table if not exists public.studio_workspaces (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null unique references django.accounts_user (id) on delete cascade,
  name        text not null default 'My Workspace' check (char_length(btrim(name)) between 1 and 80),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  -- Lets child rows reference (workspace, owner) together.
  unique (id, owner_id)
);

comment on table public.studio_workspaces is
  'One personal workspace per Studio account (owner_id unique). Created by trigger on django.accounts_user.';

drop trigger if exists studio_workspaces_touch on public.studio_workspaces;
create trigger studio_workspaces_touch
  before update on public.studio_workspaces
  for each row execute function public.touch_updated_at();

-- Owner and id are fixed for life (no ownership transfer).
create or replace function public.studio_keep_owner()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.owner_id is distinct from old.owner_id then
    raise exception 'owner_id cannot be changed' using errcode = 'check_violation';
  end if;
  -- Nested (not "and"): studio_workspaces has no workspace_id column.
  if tg_table_name <> 'studio_workspaces' then
    if new.workspace_id is distinct from old.workspace_id then
      raise exception 'workspace_id cannot be changed' using errcode = 'check_violation';
    end if;
  end if;
  if new.id is distinct from old.id then
    raise exception 'id cannot be changed' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists studio_workspaces_keep_owner on public.studio_workspaces;
create trigger studio_workspaces_keep_owner
  before update on public.studio_workspaces
  for each row execute function public.studio_keep_owner();

-- Provisioning: a new account gets its workspace. Idempotent (owner_id is
-- unique), reads nothing from user-editable data, and fully schema-qualified.
create or replace function public.studio_provision_workspace()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  insert into public.studio_workspaces (owner_id) values (new.id)
  on conflict (owner_id) do nothing;
  return new;
end;
$$;

drop trigger if exists studio_provision_workspace on django.accounts_user;
create trigger studio_provision_workspace
  after insert on django.accounts_user
  for each row execute function public.studio_provision_workspace();

-- Accounts created before this migration get theirs now.
insert into public.studio_workspaces (owner_id)
select id from django.accounts_user
on conflict (owner_id) do nothing;

alter table public.studio_workspaces enable row level security;
revoke all on public.studio_workspaces from anon, authenticated;
grant select, insert, update, delete on public.studio_workspaces to service_role;
