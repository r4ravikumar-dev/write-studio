-- Write Studio 2.0, Stage 1 (guided project creation): project details from setup, the
-- storytelling framework a case study was made with, and unfinished-setup state.
-- Additive and nullable/defaulted only: existing rows are untouched. Access is unchanged
-- (RLS on with no policies, no anon/authenticated grants; only the Express API reads or writes).

alter table public.studio_case_studies
  add column if not exists project_type text
    check (project_type is null or project_type in ('product-ux', 'redesign', 'research', 'feature', 'custom')),
  add column if not exists role text not null default '' check (char_length(role) <= 200),
  add column if not exists team text not null default '' check (char_length(team) <= 500),
  add column if not exists timeline text not null default '' check (char_length(timeline) <= 200),
  add column if not exists platform text not null default '' check (char_length(platform) <= 200),
  add column if not exists objective text not null default '' check (char_length(objective) <= 1000),
  add column if not exists challenge text not null default '' check (char_length(challenge) <= 1000),
  -- Framework definitions live in code (packages/shared/src/frameworks), versioned and immutable.
  add column if not exists framework_id text
    check (framework_id is null or (framework_id ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(framework_id) <= 60)),
  add column if not exists framework_version integer check (framework_version is null or framework_version >= 1),
  -- Unfinished setup ("Save and finish later"): the wizard's step and outline. Null once created.
  add column if not exists setup_state jsonb
    check (setup_state is null or (jsonb_typeof(setup_state) = 'object' and pg_column_size(setup_state) <= 65536));

alter table public.studio_case_studies
  drop constraint if exists studio_case_studies_framework_pair;
alter table public.studio_case_studies
  add constraint studio_case_studies_framework_pair
    check ((framework_id is null) = (framework_version is null));

comment on column public.studio_case_studies.setup_state is
  'Unfinished project setup (wizard step + outline). Null once the case study is created.';
