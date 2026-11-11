-- Write Studio 2.0, Stage 5: section progress for the dashboard cards ("4 of 10 sections complete").
-- Stored generated columns, worked out by Postgres from the document on every write, so they can
-- never disagree with it and need no application code. A section is a top-level level-2 heading;
-- complete = its sectionStatus is "complete" (see packages/shared/src/caseStudies/sections.ts).
-- Adding them rewrites the table but doesn't fire UPDATE triggers, so updated_at is unchanged.

alter table public.studio_case_studies
  add column if not exists sections_total integer generated always as (
    jsonb_array_length(jsonb_path_query_array(content, '$.content[*] ? (@.type == "heading" && @.attrs.level == 2)'))
  ) stored,
  add column if not exists sections_complete integer generated always as (
    jsonb_array_length(jsonb_path_query_array(content, '$.content[*] ? (@.type == "heading" && @.attrs.level == 2 && @.attrs.sectionStatus == "complete")'))
  ) stored;
