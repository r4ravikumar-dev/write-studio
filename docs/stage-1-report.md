# Stage 1: guided project creation (completion report)

> Exit criterion: "A new user can create a meaningful structure without understanding the editor."
> Done on staging, 2026-11-11. Production untouched.

## What was built

| Area | Delivered |
|---|---|
| Database | `0010_studio_projects.sql` (additive): `project_type`, `role`, `team`, `timeline`, `platform`, `objective`, `challenge`, `framework_id` + `framework_version` (both or neither), `setup_state` (unfinished setup, ≤64 KB). Access unchanged: deny-all RLS, Express owner scoping. |
| Frameworks | `packages/shared/src/frameworks`: versioned and immutable. **Product and UX design v1** (10 sections, each with key, title, hint, purpose, act, required, prompts, suggested evidence, suggested visuals) and **Blank v1**. Five project types; Product and UX design is recommended for all of them until the P1 frameworks exist. |
| API | `POST /api/app/case-studies` with `{setup, finish}`; `PUT /:id/setup` (only while unfinished; refuses to re-run on a created case study); `POST /:id/duplicate`; autosave refuses unfinished setups. Everything is validated server-side (`cleanSetup`): framework and version must exist, outline keys must belong to it, 40 sections at most, text capped, cover must be the user's own upload. |
| Wizard | `/studio/case-studies/new`: how to start (framework / blank / copy) → project type → details (only the working title is required) → framework with a preview of the story flow and each section's purpose → optional cover from the library → outline review (rename, reorder, add, remove, reset) → Create. Back to any visited step, **Save and finish later** (resume from the card at `/studio/case-studies/[id]/setup`), and **Skip the rest and start writing** on every step. |
| Document | Built from the outline. An unchanged framework section is an empty heading tagged with its key, so the editor shows its title and hint as placeholders. A renamed one keeps the user's title as text and its key (the hint still shows). The user's own sections are plain headings. No guidance is stored in the document. |
| Workspace | Cards show the project type and "Setup not finished"; the empty state explains the process with one action, "Start your first case study"; accounts without a name (code sign-up) are asked once ("What should we call you?"). Project details are editable in the editor's settings panel. |

## Verification

- `scripts/security-suite.sh <log>`: everything passes, including the new `test_studio_setup_live.py` (35 checks: document from outline, validation, foreign cover refused, resume, wrong-state 409s, duplicate, cross-user 404s, GET never creates).
- Browser walkthrough (desktop and 375 px): every step, the title error (focus moves to the field), Save and finish later → card → resume at the same step, outline edits → Create → editor shows the expected placeholders, project details in the settings panel, autosave of the new fields.
- Accessibility: native radio inputs as cards (arrow keys), visible focus, focus moves to each step's heading, live announcements for outline moves/removals, named icon buttons ("Move Overview up").

## Not done / follow-ups

- **Analytics events** (`project_wizard_started`, `framework_selected`, `project_created`): no analytics tool chosen yet (owner task).
- **P1 frameworks** (Product redesign, UX research, Feature development) are not written; the type is stored and the recommendation hook is in place.
- **Browser end-to-end test** (Playwright) for autosave is still a gap; this stage was verified by hand plus API tests.
- Prompts, evidence and suggested visuals are stored in the framework but shown only from Stage 2 (guidance panel).
- The preview doesn't show role/team/timeline yet (Stage 5 restyles the preview).
