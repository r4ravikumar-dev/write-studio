# Multi-vertical expansion — Phase 2: template engine and library

Contract: `docs/multi-vertical-master-plan.json`, `phase_2_template_engine_and_catalog`.
Done 2026-11-12 on branch `feature/template`. No database change in this phase. Gate: the template
contract was approved by the owner on 2026-11-12 before this work started.

## 1. Plan

Make the document's structure entirely a matter of template data, and give people a way to find a
template, see what it contains and start from it:

1. finish the template contract and registry (validation, search, library grouping, version comparison);
2. make released versions immutable in practice: a document stays on its version until its owner updates
   it, after seeing what would change;
3. a template library (categories, search, preview);
4. a Create Document flow built on the library, with its questions coming from the template;
5. the screens around it: My documents (status filters, grid and list, kind and template on every card),
   a status control, and the pages moved under `/studio/documents`.

## 2. What was built

### Template contract (`packages/shared/src/templates/types.ts`)

`DocumentTemplate`: `id`, `version`, `name`, `description`, `purpose`, `documentType` (its category
comes from the type), `audience`, `acts` (groups of sections), `sections`, `metadataFields`,
`recommendedBlocks`, `validationRules`, `exportProfiles`.
`TemplateSection`: `key`, `title`, `hint`, `purpose`, `act`, `required`, `prompts`, `writingGuidance`,
`suggestedEvidence`, `suggestedBlocks`, `completionCriteria`, `covers`.

Agreed differences from the plan's wording: export profiles are a format plus the document type's
presentation; section keys are unique across all templates (prefixed); blocks are named by their stored
node name; the four live UX templates stay as they are.

### Registry (`packages/shared/src/templates/index.ts`)

| Function | Used by |
|---|---|
| `getTemplate(id, version)`, `templateSection(key, template)` | editor guide, outline, review, preview, API |
| `templatesFor(type)`, `defaultTemplate(type)`, `documentTypeOf(template)` | creation, API |
| `templateLibrary()`, `universalTemplates()`, `templateMatches(template, query)` | library and Create Document |
| `newerTemplate(template)`, `templateChanges(from, to)` | template update (dialog and API) |
| `recommendBlocks(context)` | Insert |
| `cleanMetadata(template, input)` | API |
| `templateProblems()` | build-time validation (offline test) |

Every surface resolves a template through these, so they always agree on the version. A reference to a
template that isn't registered resolves to `undefined` and each surface copes: the editor falls back to the
default guidance, the Details panel says the document predates template versions, the API refuses to
create with it (422).

### Version policy

- A released version is never edited; a change is a new version (`templateProblems` refuses a key that
  changes its title, a reused key, a duplicate version).
- A document stores the id and version it was made with. Nothing moves it: not saving, not a new
  release.
- Updating is the owner's explicit act. Details panel → Template → "See what changes" shows the sections
  before and after, and lists what is added, no longer suggested, newly expected or optional, and where
  recommendations or guidance differ. `POST /api/app/documents/:id/template {version}` applies it only if
  `version` is the newest released version of the document's own template, the document isn't archived or
  unfinished, and the version hasn't changed since it was read.
- An update changes the reference only. The content column is not read or written; new sections are
  offered by the guide, never inserted; sections no longer suggested stay in the document.

### Template library (`/studio/templates`, `components/studio/creation/TemplateGallery.tsx`)

Search (name, description, purpose, audience, document type, section titles; every word must match),
category chips, templates as radio cards grouped by category, document types without a template listed as
"Coming later" (not selectable), and a preview of the chosen template: purpose, who it is for, recommended
blocks, the export formats that work today, its sections in order with what each is for. "Use this
template" opens Create Document with it chosen. The page shows product content only, no user data, and
still requires a session.

### Create Document (`/studio/documents/new`, `components/studio/creation/ProjectSetup.tsx`)

Four steps: Template (the library, Blank, or a copy of one of your own documents) → Details → Cover
picture → Outline. The Details questions are the template's `metadataFields`, so a new template needs no
change to the flow. Only the working title is required; Back keeps everything; "Save and finish later" and
"Skip the rest and start writing" remain. The old `type` and `framework` steps are gone (choosing the
template answers both; the project type is derived from it), and a setup saved on one of them resumes at
the first step. Nothing is created on a GET.

### Around it

- **My documents** (`/studio`, also `/studio/documents`): filters All / In progress / Ready for review /
  Archived, grid or list, and on every card the kind of document, the template, the status, when it was
  edited and section progress. A first-visit empty state explains the workflow and offers Create document
  and Browse templates. Card menu: Edit, Preview, mark as another working status, Delete.
- **Status control** in the editor header (wide screens): the current private status and the others to
  move to. It saves first, and the next autosave expects the new timestamp.
- **Addresses**: `/studio/documents/new`, `/studio/documents/[id]/edit`, `/preview`, `/setup`,
  `/studio/documents?status=…`, `/studio/templates`. Old `/studio/case-studies/…` links, `/studio/documents/[id]`
  and `/studio/dashboard` redirect; every target still checks the session and the owner.
- **Wording**: screens that aren't about a case study specifically say "document", or the document's own
  noun ("This case study is archived"); the review, preview and exports use the noun too.

## 3. Files

| Area | Files |
|---|---|
| Shared | `templates/index.ts`, `templates/types.ts`, `frameworks/index.ts` (field descriptions, `projectTypeFor`), `caseStudies/setup.ts` (four steps), `test/documents.test.ts` |
| API | `backend/express/src/routes/appDocuments.ts` (`POST /:id/template`) |
| Pages | `app/studio/(workspace)/page.tsx`, `documents/page.tsx`, `documents/new/page.tsx`, `documents/[id]/setup/page.tsx`, `templates/page.tsx`, `(editor)/documents/[id]/edit`, `(editor)/documents/[id]/preview` (moved from `case-studies/`), `next.config.ts` (redirects), `app/studio/document-actions.ts` (was `case-study-actions.ts`) |
| Components | new `studio/creation/TemplateGallery.tsx`, `studio/DocumentsDashboard.tsx`, `editor/TemplateVersion.tsx`; changed `studio/creation/ProjectSetup.tsx`, `studio/StudioCaseStudyList.tsx`, `studio/NewCaseStudyButton.tsx`, `studio/StudioPreview.tsx`, `editor/Editor.tsx`, `editor/SettingsPanel.tsx`, `editor/SectionGuide.tsx`, `editor/TitleFields.tsx`, `editor/HistoryDialog.tsx`, `caseStudy/blocks.tsx` |
| Styles | `theme/surfaces.css` (library, filters, list view, status, template update; DNA tokens only) |
| Tests | new `supabase/tests/test_studio_templates_live.py`, `scripts/e2e/create.mjs`; URLs updated in the other suites; `scripts/security-suite.sh` |

## 4. Evidence

**In the browser, by hand** (this session, a throwaway account on localhost): first-visit My documents;
the Templates page at desktop and phone width (no horizontal overflow at 375px); choosing a template and
its preview; "Use this template" → Create Document with it chosen; the Details step generated from the
template's fields; creating the document and landing in the editor at `/studio/documents/<id>/edit`; the
template update panel and dialog on a version-1 document, then version 2 after updating; the status menu
(Draft → Ready for review); the Ready for review filter in list view; an old `/studio/case-studies/new`
link redirecting. Screenshots from the automated browser run are in `docs/multi-vertical/evidence/`
(`phase-2-template-library.png`, `phase-2-create-document-outline.png`).

**Automated**, all passing on the Phase 2 code:

| Check | Phase 1 | Phase 2 |
|---|---|---|
| TypeScript, ESLint, Express build, Django check | pass | pass |
| Django auth tests (offline) | 26/26 | 26/26 |
| Review engine (offline) | 15/15 | 15/15 |
| Documents, templates, block catalogue (offline) | 18/18 | 24/24 |
| Schema | 33/33 | 33/33 |
| Auth | 23/23 | 23/23 |
| Storage | 30/30 | 30/30 |
| Documents | 55/55 | 55/55 |
| Document model | 64/64 | 64/64 |
| **Templates (new)**: library and Create Document in a real browser, template updates, addresses, My documents | – | 56/56 |
| Project setup | 35/35 | 35/35 |
| Sections, notes | 30/30 | 30/30 |
| Review, preview | 16/16 | 16/16 |
| History | 23/23 | 23/23 |
| Editor in a real browser (save, reload, PDF and HTML export, "/" menu) | 40/40 | 40/40 |
| Lifecycle and caching | 27/27 | 27/27 |
| **Staging total** | **376** | **432** |

How these were obtained, exactly: the suites did **not** pass in one uninterrupted run this time.

- One clean run passed everything up to and including Templates, then found a real regression in Project
  setup (34/35): an unknown project type sent by the browser was being replaced with the template's implied
  type instead of being dropped. Fixed (the type is derived only when no answer is given), covered by an
  offline test, and Project setup re-run: 35/35.
- The five suites after it were then run one by one: sections, review, history, browser editor and
  lifecycle all pass.
- Several earlier attempts were lost to the staging pooler's 15-client limit (Django answering 500 "max
  clients reached", once a 60-second timeout) and to two runs I started overlapping by mistake. The tests'
  sign-in helper now retries both of its steps on a server error. None of those failures was in product
  code, but a single green run of the whole suite after the last fix has not been recorded.

Not checked in a browser: the Details panel's note for a document with no template reference (only the one
pre-framework staging document has that); the status menu and template dialog at tablet width.

## 5. Evaluation against the plan

Scale: 0 not implemented, 1 partial, 2 minor gaps, 3 meets the criteria with test evidence.

| Action | Evaluate | Score | Evidence |
|---|---|---|---|
| template_contract | invalid definitions fail validation; section keys unique; required and optional explicit | 3 | `templateProblems()` in the offline suite: a deliberately broken template yields 8 distinct problems; a reused or retitled key is refused; `required` on every section |
| template_registry | all surfaces resolve the same version; a missing reference fails gracefully | 3 | one registry behind editor, review, preview, library, creation and API; unknown template → 422 on create (tested); a neutral note in the Details panel and default guidance in the editor (in code, not checked in a browser) |
| template_immutability | existing documents keep their version; an explicit update previews the changes first | 3 | live: a v1 document stays v1 after saves; update refused for a wrong, missing or current version, for another account (404), signed out (401), archived (409); after the update the content is identical. Browser: dialog shows both outlines and the differences, then version 2 |
| template_gallery | a template can be found by category or search; the preview matches the generated outline | 3 | browser suite: categories, search by name and by section title, no-match message, category filter, preview facts; the outline step and the created document have exactly the previewed sections |
| template_creation_flow | optional fields can be skipped; Back/Continue keep values; the document uses the chosen template version and is private | 3 | browser suite: only the title is required, Back keeps template and title, cover skipped; database row has template `feature` v1, type, owner A, status draft; another account gets 404 |

Exit criteria:

| Criterion | Result |
|---|---|
| A new template can be added through configuration without creating a new editor | **met in design, proven in Phase 4.** Library, creation, Details questions, outline, guide, review checklist, Insert recommendations and the API all read the registry, and there is no per-template code. But no template of a new document type has been added yet, so the claim is untested end to end until the first Phase 4 template lands as data only. |
| Blank documents are supported | met — Blank is in the library under "Start from scratch"; live: a blank document is created and valid (Phase 1 suite, A03) |
| Existing UX template remains selectable and compatible | met — all four UX templates are cards in the library; existing-document suites pass unchanged |

Deliverables: template schema ✔, registry ✔, catalogue ✔ (the five live templates; the eight new ones are
Phases 4–5), template preview ✔, creation wizard ✔, version policy ✔ (§2).

Plan acceptance tests touched: A01 (browser suite + screenshots in `docs/multi-vertical/evidence/`),
A02 and A03 for the existing type, A04 (offline + live).

## 6. Not done, on purpose or still open

- **The product is still called "Case Study Studio"** in page titles, the sign-in card and emails. With
  several document types that name no longer fits; the plan calls the product Write Studio. It is a brand
  decision, so it was left for the owner.
- **Status control on phones**: the editor header has no room at 375px; on a phone the status is changed
  from the document's card menu in My documents.
- **Type and category filters on the dashboard**: there is one creatable document type today, so a filter
  would have a single option. It arrives with the first new template (Phase 4); the API already has `?type=`.
- **Review and export stay a dialog and a menu** in the editor and preview rather than separate routes
  (`/review`, `/export`); they are owner-only either way. Revisit in Phase 6.
- **`metadata` fields**: the mechanism is built and tested (Details renders and stores them, the API cleans
  them), but no shipped template has a `metadata` field yet; UX details use their existing columns.
- **Template search is local**: nothing typed in the search box leaves the browser.
