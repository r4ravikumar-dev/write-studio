# Multi-vertical expansion — Phase 1: the generic document model

Contract: `docs/multi-vertical-master-plan.json`, `phase_1_generic_document_foundation`.
Done 2026-11-12 on branch `feature/template`, applied on **staging only** (production untouched).

## 1. Plan

Turn the case-study table into a document table **in place**, so nothing has to be copied or re-pointed,
and make the API, shared types and tests speak "document". Keep every privacy rule exactly as it is.

Why a rename and not a new table plus backfill: a copy would need new ids or a second set of foreign
keys for four child tables (assets, notes, backups, versions) and a window where two tables disagree. A
rename keeps every id, owner, workspace, timestamp and reference by construction, is transactional, and
is undone by the reverse rename. The plan's "do not drop old tables until cutover and QA are complete"
is met by the tested rollback script rather than by a second copy of the data.

## 2. Data model

```
django.accounts_user ──1:1── studio_workspaces (owner_id unique)
                                   │ (id, owner_id)
                                   ▼
                             studio_documents ───────────────┬──────────────┬───────────────┐
   id, workspace_id, owner_id  (immutable, trigger)          │              │               │
   document_type      text   'ux_case_study' | …             ▼              ▼               ▼
   template_id        text   ┐ the immutable version   studio_document_  studio_section_  studio_content_
   template_version   int    ┘ it was made with        revisions         notes            backups
   metadata           jsonb  template details          (document_id,     (document_id,    (document_id,
   title, subtitle, summary, …  (unchanged columns)     owner_id)         owner_id)        owner_id)
   content            jsonb  Tiptap doc, ≤ 2 MB              owner must equal the document's owner (trigger)
   content_schema_version  int  (2)
   status   draft | in_progress | ready_for_review | archived
   sections_total, sections_complete  (generated from content)
                                   ▲
                             studio_assets.document_id (nullable; on delete set null)
```

| Plan field | Here | Note |
|---|---|---|
| `description` | `summary` | already existed |
| `document_schema_version` | `content_schema_version` | already existed; name kept |
| `owner_id → auth.users` | `owner_id → django.accounts_user` | Django is the identity provider |
| `studio_document_versions` | `studio_document_revisions` | already built (auto / named / before_restore), renamed |
| owner-only RLS policies | RLS on, **no** policies, service role only | stricter; unchanged |

TypeScript contract (`packages/shared/src/studio.ts`): `StudioDocument`, `StudioDocumentCard`,
`StudioDocumentDraft`, `StudioStatus`, `STUDIO_STATUSES`, `canChangeStatus`, `isStudioStatus`. The old
names (`StudioCaseStudy…`) remain as aliases so the editor compiles unchanged.

### Status model

All four states are private. There is no published or public state, in the type, the API or the
database check.

| From | To | Allowed |
|---|---|---|
| draft, in_progress, ready_for_review | any other of those three | yes (`POST /:id/status`) |
| draft, in_progress, ready_for_review | archived | yes (`POST /:id/archive`) |
| archived | draft | yes (`POST /:id/restore`) |
| archived | in_progress, ready_for_review | no (409) |
| any | published, public, anything else | no (422; the database check refuses it too) |
| unfinished setup | in_progress, ready_for_review | no (409) |

A save never changes the status, and an archived document can't be saved. The status update is
conditional on the status it was checked against, so two tabs can't race past a rule.

### Template reference

`template_id` + `template_version` (was `framework_*`). Definitions stay in version-controlled code.
The one existing staging document has no template reference (it predates frameworks): it stays `null` and is
treated as a UX case study on the default framework, exactly as before. The server derives
`document_type` from the template; a type sent by the browser that disagrees is refused.

## 3. What changed

| File | Change |
|---|---|
| `supabase/migrations/0014_studio_documents.sql` | the migration (rename table, columns, child FKs, revisions table; add `document_type`, `metadata`, statuses, two indexes; replace the owner function; rename constraints, indexes, triggers) |
| `supabase/rollback/0014_studio_documents_down.sql` | the rollback; refuses while a non-UX document or template metadata exists |
| `supabase/tests/migration_0014_dry_run.py` | up → checks → down → checks → up, in one rolled-back transaction |
| `supabase/tests/test_studio_document_model_live.py` | new live two-account suite |
| `supabase/tests/test_studio_*.py` | API path, response keys and column names |
| `backend/express/src/routes/appDocuments.ts` (was `appCaseStudies.ts`) | `/api/app/documents`; type, metadata, template reference; status route and transition rule; `?status=active`, `?type=`; messages name the document by its type |
| `backend/express/src/routes/appAssets.ts`, `app.ts` | `document_id`; mount |
| `packages/shared/src/studio.ts`, `auth.ts`, `caseStudies/setup.ts`, `caseStudies/review.ts` | document types, statuses, template reference in setup, review wording by type |
| `packages/shared/src/templates/`, `blocks/catalog.ts`, `frameworks/index.ts` | the minimum of Phases 2–3 that Phase 1 needs to name a document type and resolve a template (finished and evaluated in those phases) |
| `packages/shared/test/documents.test.ts` | offline tests |
| `frontend/src/lib/studio/queries.ts`, `app/studio/*-actions.ts`, setup page, `ProjectSetup.tsx`, `Editor.tsx` | new API paths and field names; the dashboard lists every working status |
| `frontend/src/components/editor/blocks/registry.ts`, `insertCommands.tsx`, `SectionGuide.tsx` | read the shared catalogue (Phase 3 groundwork) |
| `scripts/security-suite.sh`, `supabase/README.md`, `supabase/tests/README.md` | wiring and docs |

Removed, not aliased: `/api/app/case-studies` (one way in, not two).
Not changed in this phase: page URLs (`/studio/case-studies/…`) and UI wording — they move with the
dashboard and creation flow in Phase 2. Storage paths are unchanged.

## 4. Evidence

**Migration dry run** (`supabase/tests/migration_0014_dry_run.py`, staging, one transaction, rolled back) —
50/50. With fixtures added to the real data (two owners, a framework document, an unfinished setup, an
archived document, an asset, a note, a backup, a named version):

- up applies; documents, assets, notes, backups and versions are identical row for row (ids, owners,
  workspaces, md5 of content, timestamps, generated progress columns);
- no constraint, index, trigger or column keeps an old name;
- on the new schema: other document types and template metadata store; the four statuses are accepted and
  `published` is refused; cross-owner documents, notes, versions, backups and assets are refused; owner and
  workspace can't change; deleting a document detaches its asset and removes its notes, backups and versions;
  `anon` and `authenticated` can read no studio table; RLS on everywhere; zero policies;
- the rollback refuses while a non-UX document exists; then applies; data identical; the catalogue (columns,
  constraints, indexes, triggers, functions, grants, RLS, comments) equals the original exactly; refuses to
  run twice; the migration applies again afterwards.

The first dry run failed 2 of 50 (auto-named constraints on the versions table kept their old names; the
rollback left one column comment). Both scripts were fixed before anything was applied.

**Applying it** (staging, 2026-11-12): JSON backup of the six studio tables taken first; rows compared inside
the transaction before commit — all five tables identical; the one existing document is `ux_case_study`,
`draft`. Afterwards: no table or column with an old name, RLS on for every studio table, 0 policies. The two
throwaway accounts left by the interrupted runs (they owned nothing) were removed; four older test accounts
from earlier sessions were left alone.

**Full suite after the cutover** (`scripts/security-suite.sh <django log>`), all pass:

| Check | Before (baseline) | After |
|---|---|---|
| TypeScript (shared, Express, frontend), ESLint, Express build, Django check | pass | pass |
| Django auth tests (offline) | 26/26 | 26/26 |
| Review engine (offline) | 15/15 | 15/15 |
| Documents, templates, block catalogue (offline, new) | – | 18/18 |
| Schema: ownership, constraints, lockdown | 33/33 | 33/33 |
| Auth: both methods, sessions | 23/23 | 23/23 |
| Storage: private files, isolation | 30/30 | 30/30 |
| Documents: editor data, isolation, no publishing | 55/55 | 55/55 |
| **Document model (new)**: types, templates, statuses, filters, isolation | – | 64/64 |
| Project setup | 35/35 | 35/35 |
| Sections, notes | 30/30 | 30/30 |
| Review, preview | 16/16 | 16/16 |
| History | 23/23 | 23/23 |
| Editor in a real browser: save, reload, PDF and HTML export | 36/36 | 40/40 (4 new: document-aware "/" menu) |
| Lifecycle and caching | 27/27 | 27/27 |
| **Staging total** | **308** | **376** |

What the new document-model suite proves with two accounts (A, B) and no session: type and template
version are stored and decided by the server; a blank document is valid; six kinds of bad type/template are
refused (422); an owner or workspace sent by the browser is ignored; a copy keeps type and template; a save
can't change type, template, owner or status; every allowed status move works and every disallowed one is
refused (API 409/422 and the database check); list filters; B gets 404 and a signed-out caller 401 on read,
save, status, archive, copy, versions, notes, setup and delete; A's document is untouched afterwards; the old
API path is gone.

Existing UX behaviour in a real browser after the migration (headless Chrome, `scripts/e2e/editor.mjs`):
the editor opens the document, typing and every block type autosave, the stored document equals the editor's
exactly, it reloads identically, the preview renders, PDF and standalone HTML export work, no page errors.

Two runs were interrupted by the staging pooler's 15-client limit (Django `request-code` answered 500
"max clients reached"). It is an existing staging limit, unrelated to this change; the tests' sign-in helper
now waits and retries on it. The final run above was clean from start to finish.

Not verified by eye in this phase: screenshots. No screen changed (the UI work is Phase 2); the browser suite
is the evidence that existing screens still work.

## 5. Evaluation against the plan

Scale: 0 not implemented, 1 partial, 2 minor gaps, 3 meets the criteria with test evidence.

| Action | Deliverable | Evaluate | Score | Evidence |
|---|---|---|---|---|
| design_document_entity | ERD + TypeScript contract | stable ownership and workspace references; explicit type and template; content JSON is the source of truth | 3 | §2; document-model suite; dry run |
| document_status | status model + transitions | no public/published status; invalid moves rejected | 3 | §2 table; offline `canChangeStatus` test; live 409/422 checks; database check |
| migration_strategy | migration SQL, verification, rollback | counts match; owner/workspace unchanged; content hashes equal; rollback tested in staging | 3 | dry run 50/50 (up, down, up again); apply-time comparison. "Backfill script": none needed — a rename has nothing to backfill |
| template_reference | template reference model | existing documents can point at the legacy UX template; updating a template never alters a document | 2 | versions resolve independently (offline A04 test). Gap: the one pre-framework document keeps a null reference by design, and there is no "upgrade template" UI yet (Phase 2 policy) |
| query_layer | document repository | all CRUD authenticated and owner-scoped; no client owner trusted | 3 | `routes/appDocuments.ts`; 18 cross-account + 9 signed-out checks; forged-owner check |

Exit criteria:

| Criterion | Result |
|---|---|
| Existing UX documents are preserved | met — row-for-row identity at apply time; browser suite 40/40 |
| RLS remains effective on the generic document entity | met — RLS on, zero policies, `anon`/`authenticated` blocked (schema 33/33, dry run) |
| All CRUD operations work for two separate test accounts | met — documents 55/55, document model 64/64 |
| No unauthorised public read path exists | met — no publish route (404), no public status, signed-out 401 everywhere, old API path removed |

Deliverables: generic document schema ✔, ERD ✔ (§2), migration and rollback scripts ✔, data integrity
report ✔ (§4), document repository ✔, updated TypeScript types ✔.

Phase gate ("data model and migration design must be reviewed before applying production migrations"):
reviewed for staging on 2026-11-12 (the owner approved the staging cutover); **production is not migrated**
and needs its own review plus the release blockers.

## 6. Deploying this to another environment

1. Back up the studio tables (or the database).
2. Run `backend/django/.venv/bin/python supabase/tests/migration_0014_dry_run.py` against a copy or staging
   (it rolls itself back).
3. Stop the Express API, run `supabase/migrations/0014_studio_documents.sql`, deploy and start the new
   API and frontend together (the old API can't read the new table names, and the reverse).
4. Run `scripts/security-suite.sh <django log>` (staging) and check a real document opens.
5. To undo inside the rollback window: stop the API, run
   `supabase/rollback/0014_studio_documents_down.sql`, start the previous API and frontend.

Production still needs the release blockers in `docs/RELEASE.md` first.

## 7. Limits and what is next

- The rollback drops `document_type` and `metadata` and folds the two new statuses into draft, so it
  refuses to run once a non-UX document exists. After that point the way back is a restore from backup.
- The staging backup taken before the migration is a JSON file in a temporary folder, not a managed
  backup; staging held one document.
- The UI still says "case study" everywhere and has no control for the new statuses: Phase 2.
- `metadata` has no fields yet for UX templates (their details have columns); the first templates that
  use it arrive in Phase 4.
