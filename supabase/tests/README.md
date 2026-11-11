# Studio tests

Run everything with `scripts/security-suite.sh` (offline) or `scripts/security-suite.sh <django-log>`
(adds the staging checks; see the script header). **Staging only**: the live tests create and delete
throwaway `@example.test` accounts.

| File | Needs | What it proves |
|---|---|---|
| `backend/django/accounts/tests.py` | nothing (in-memory SQLite) | 26 auth tests: sign-up + confirm, password and code sign-in, one identity, add/change password, reset, pre-hijack defence, rate limits, sessions, no special accounts, account deletion |
| `test_studio_schema.py` | staging DB | 33 checks, rolled back: provisioning trigger, ownership constraints and triggers, slug/status/content/path rules, anon/authenticated lockdown, cascade |
| `test_studio_auth_live.py` | all services | 23 checks: two accounts end to end through Django, Express and Next |
| `test_studio_storage_live.py` | all services | 30 checks: private bucket, owner-only file route, cross-user denial, upload safety, Range, delete |
| `test_studio_documents_live.py` | all services | 55 checks: every block round-trips, foreign paths refused, cross-user 404s, archive, no publish, old portfolio routes/APIs/tables/bucket gone |
| `test_studio_setup_live.py` | all services | 35 checks (Stage 1): document from the outline (placeholders, renamed and own sections, no guidance stored), framework/version/outline/cover validation, save and finish later + resume, no autosave or re-setup in the wrong state, duplicate, cross-user 404s, GET never creates |
| `test_studio_sections_live.py` | all services | 30 checks (Stage 2): new documents are schema v2 with unique section ids; a v1 document is migrated on read with a backup (once); saves normalise section ids/status; private notes (owner-only, not in the document or preview, not copied, deleted with the case study); lockdown of the new tables |
| `packages/shared/test/review.test.ts` | nothing | 8 checks: the story review engine (progress, checklist, alt text, empty blocks, figures, embeds, cover, actions point at their block/section) |
| `test_studio_review_live.py` | all services | 16 checks (Stage 5): card progress from database-generated columns (can't be written directly), the restyled preview (one h1, facts, framework titles for written sections, empty sections omitted, anchored `<section>`s, no metadata), owner-only |
| `test_studio_history_live.py` | all services | 23 checks (T7): automatic version at most every 10 minutes, named versions, restore keeps a "before a restore" version, archived refuses restore, B can't list/open/restore/delete A's versions, deny-all on `studio_case_study_revisions`, owner trigger, UX research framework through setup, cascade on account deletion |
| `test_studio_lifecycle_live.py` | all services | 27 checks: account deletion incl. orphan files, B unaffected, dead tokens, no-store caching |

## Acceptance matrix (from the master plan) → where it's tested

| ID | Test | Where | Notes |
|---|---|---|---|
| SEC-001 | Register with password, verify email, enter /studio; one workspace | Django `test_signup_confirm_and_login`; auth live; schema "one workspace per account" | |
| SEC-002 | Register / sign in by email code | Django `test_otp_creates_account_on_first_use`; auth live | |
| SEC-003 | Same email, both methods, one identity | Django `test_password_account_can_also_use_otp`, `test_otp_account_can_add_a_password`; auth live | Django is the identity provider (not Supabase Auth) |
| SEC-004 | Signed-out visitor on /studio/case-studies/[id] | documents live | redirect to /studio/login, nothing rendered |
| SEC-005 | B reads A's document by UUID (UI + direct API) | documents live; schema (anon/authenticated can't read studio_* via Supabase REST) | |
| SEC-006 | B updates/deletes A's doc, or inserts with A's ids | documents live (API); schema (composite FK) | |
| SEC-007 | Move doc/asset to B's workspace | schema (owner/workspace immutable triggers) | |
| SEC-008 | B reads/lists/overwrites/deletes A's file | storage live | |
| SEC-009 | Anonymous raw Storage / media route | storage live | no public URL, no policies |
| SEC-010 | A loads own file; B and anonymous denied | storage live | same-origin, session-checked, no signed read links |
| SEC-011 | Every block saves and reloads, raw paths kept | documents live | |
| SEC-012 | Editor and private preview, no publish controls | documents live; manual browser walkthrough | |
| SEC-013 | No Studio publish action/route | documents live | |
| SEC-014 | Old portfolio routes, APIs and data are gone | documents live (/work, /write, /api/public, /api/studio → 404; old tables and public bucket gone) | |
| SEC-015 | No account has elevated access; no owner code remains | Django `test_every_account_is_an_ordinary_user`, `test_former_owner_address_can_delete_like_anyone`; suite static check (no ADMIN_EMAIL, owner role, `/write` …) | |
| SEC-016 | Deleting a case study keeps reusable media | documents live; schema | |
| SEC-017 | Account deletion removes their data and files only | lifecycle live; Django `AccountDeletionTests` | |
| SEC-018 | A signs out, B signs in, no A content | lifecycle live | signed-in responses `private, no-store` (checked in dev and `next start`) |
