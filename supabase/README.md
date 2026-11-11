# Supabase setup

The Studio stores everything in one Supabase project: Postgres for workspaces, case studies and file
records, and one private Storage bucket for the files. Supabase Auth isn't used (accounts live in the
Django auth service). **Use a staging project first; never migrate production without a backup.**

## Migrations, in this order

| Step | What | Why |
|---|---|---|
| SQL `0001`–`0003` | The original single-owner tables | History: forward-only, so a fresh project still runs them; `0009` removes what they created except `touch_updated_at()` |
| SQL `0004_split_backends.sql` | Service-role-only writes; creates the private `django` schema | |
| `cd backend/django && python manage.py migrate` | Django's tables (`django.accounts_user`, codes, tokens, rate limits) | `0005`–`0007` reference `django.accounts_user` |
| SQL `0005_studio_accounts.sql` | `studio_workspaces` + the trigger that gives each new account one workspace | |
| SQL `0006_studio_case_studies.sql` | Private case studies | |
| SQL `0007_studio_assets.sql` | Private file records | |
| SQL `0008_studio_private_storage.sql` | The private `studio-private-media` bucket (no policies) | |
| SQL `0009_remove_portfolio.sql` | Drops the old portfolio tables, `is_cms_owner()` and the public bucket's policies; refuses if any still hold data | Then delete the empty `case-study-media` bucket (Storage → bucket → Delete, or `DELETE /storage/v1/bucket/case-study-media`) |
| SQL `0010_studio_projects.sql` | Project details from setup, framework id + version, unfinished-setup state (additive) | Stage 1, guided project creation |
| SQL `0011_studio_sections.sql` | `studio_content_backups` (documents before a schema migration) and `studio_section_notes` (private notes per section) | Stage 2, story structure & guidance |
| SQL `0012_studio_section_progress.sql` | Generated columns `sections_total`, `sections_complete` (from the document) for the dashboard cards | Stage 5; doesn't change `updated_at` |
| SQL `0013_studio_revisions.sql` | `studio_case_study_revisions`: private version history (automatic, named, before a restore) | Editor T7; additive |

Run SQL files in Supabase → SQL Editor → New query → paste → Run. Afterwards check with:

```bash
backend/django/.venv/bin/python supabase/tests/test_studio_schema.py
```
(It runs in one transaction and rolls itself back. Staging only.)

## What's in the database

- **`studio_workspaces`**: one per account (`owner_id` unique), made by the trigger; the owner can't change.
- **`studio_case_studies`**: private documents. Status `draft` or `archived`; slug unique per workspace;
  document capped at 2 MB; can only point at a workspace its owner owns.
- **`studio_assets`**: file records. Paths must be `{owner}/{workspace}/{case-study-id|library}/{uuid}.{ext}`.
  Deleting a case study keeps its files in the library.
- **`studio-private-media`** bucket: private, 50 MB per file, no SVG, **no storage policies**.

Access: only the Express API (service role) reads or writes any of it, always scoped to the signed-in
user. Row-level security is on with no policies and `anon`/`authenticated` have no grants, so
Supabase's public REST and Storage APIs can't reach any of it. Deleting an account removes its files
through the Storage API first, then the database cascades from `django.accounts_user`.
