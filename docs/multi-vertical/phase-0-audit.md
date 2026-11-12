# Multi-vertical expansion — Phase 0: repository, product and data audit

Contract: `docs/multi-vertical-master-plan.json` (v1.0.1, a copy of
`/Users/visit/Downloads/ME/write-studio-multi-vertical-master-plan.json`).
Audited: branch `feature/template` at `5144d57`, staging Supabase `psfjngzdldqhvmabgvos`, 2026-11-12.
Nothing in the schema or UI was changed in this phase.

## 1. Architecture as it is (confirmed against the code)

| Layer | What exists |
|---|---|
| Frontend | Next.js 16 + React 19 (`frontend/`), Astryx UI + DNA tokens. Talks only to the two backends, server side. |
| Identity | Django 4.2 (`backend/django`), not Supabase Auth: email + password (confirmed by link) and email code. JWT in httpOnly cookies. |
| Data API | Express 5 (`backend/express`), the only holder of the Supabase service-role key. Every route behind `requireUser`; every query `.eq('owner_id', req.user.id)`; owner and workspace are set server side. |
| Shared | `packages/shared` (types, validation, frameworks, review engine), TypeScript source used by both. |
| Database | Postgres 17 on Supabase; one private bucket `studio-private-media`. |

**The plan assumes Supabase Auth and owner-scoped RLS policies. The live model is different and stricter**, and stays:
RLS is on with **zero policies**, `anon`/`authenticated` have no grants, there are **no storage policies**, and
only Express (service role) reads or writes, scoped to the id in the verified token. Where the plan says "RLS allows
only the owner" the equivalent here is "deny-all RLS + owner-scoped API + ownership triggers", and the tests for
A15–A17 are the existing two-account live tests. `owner_id` references `django.accounts_user`, not `auth.users`.

## 2. Routes and screens

| Route | Purpose | Auth | Plan's route |
|---|---|---|---|
| `/` | redirects to `/studio` | – | – |
| `/studio/{login,signup,forgot-password,update-password,confirm}` | account | public | unchanged |
| `/studio` | drafts dashboard (card grid) | signed in | `/studio/dashboard` ("My Documents") |
| `/studio/case-studies?status=archived` | archived list | signed in | dashboard filter |
| `/studio/case-studies/new` | setup wizard (6 steps) | signed in | `/studio/documents/new` |
| `/studio/case-studies/[id]/setup` | resume an unfinished setup | owner | part of `/documents/new` |
| `/studio/case-studies/[id]` | the editor | owner | `/studio/documents/[id]/edit` |
| `/studio/case-studies/[id]/preview` (`?embed=1`) | private preview | owner | `/studio/documents/[id]/preview` |
| – (Review is a dialog in the editor) | review | owner | `/studio/documents/[id]/review` |
| – (Export is a menu in editor and preview) | export | owner | `/studio/documents/[id]/export` |
| – | template library | – | `/studio/templates` (missing) |
| `/studio/media` | media library | owner | unchanged |
| `/studio/settings` | account | signed in | unchanged |
| `/studio/files/[...path]` | owner-only file proxy (404 when signed out) | owner | unchanged |

`src/proxy.ts` guards `/studio/*` (JWT verify, refresh, safe `next`), and sets `private, no-store`.

Express: `/api/app/workspace`, `/api/app/case-studies` (list, create, setup, duplicate, get, save, archive,
restore, delete, notes, revisions), `/api/app/assets`, `/api/app/media`, `/api/app/account/storage`.

## 3. Data: current → target

Staging holds: 1 document (schema v2, no framework reference, 10 headings + 10 paragraphs), 0 assets,
0 notes, 0 revisions, 1 content backup, 0 policies, 1 private bucket. (Account and workspace counts move
while the live tests run.)

| Plan (logical target) | Live today | Gap |
|---|---|---|
| `studio_documents` | `studio_case_studies` | rename; add `document_type`, `metadata` |
| `title`, `description` | `title`, `subtitle`, `summary` | `summary` is the description; no change |
| `template_id`, `template_version` | `framework_id`, `framework_version` | rename |
| `document_schema_version` | `content_schema_version` (2) | same thing; keep the name |
| `status` draft / in_progress / ready_for_review / archived | draft / archived | widen + transition rules |
| `metadata jsonb` | typed columns `project_type, role, team, timeline, platform, objective, challenge` | add `metadata` for new templates; keep the columns |
| indexes on owner, workspace, type, template, updated | owner, workspace+updated, workspace+status | add type and template |
| `studio_document_versions` | `studio_case_study_revisions` (auto / named / before_restore) — **already built** (T7) | rename only |
| `studio_assets.document_id` | `studio_assets.case_study_id` | rename; storage paths unchanged |
| asset `decorative, caption, credit` columns | held per use in the document (image attrs), `alt` on the asset | keep per-use (a picture can be decorative in one place and not another); no column |
| `system_template_definitions` | `packages/shared/src/frameworks` (code, versioned, immutable) | generalise in code |
| `user_templates` | none | out of scope (plan: do not build) |
| – | `studio_section_notes`, `studio_content_backups` | `case_study_id` → `document_id` |

Objects that name the old table inside their body and must be recreated, not just renamed:
function `studio_same_owner_as_case_study()` (3 triggers use it). `studio_keep_owner()` and
`studio_provision_workspace()` don't name it. Generated columns `sections_total/complete`, FKs, checks
and indexes follow a rename by themselves.

## 4. Editor and blocks

One editor (`components/editor/Editor.tsx`), already universal in structure: toolbar, selection bubble,
block handle, Smart Insert (toolbar, `/` menu, FAB — one command list from `insertCommands.tsx`),
inspector registry, story outline, section guide, review dialog, version history, media panel.
Renderer: `components/caseStudy/` (shared Tiptap schema + static renderer used by preview and exports).

Existing blocks, by the plan's block id (stored node names never change):

| Plan id | Node (stored) | Insert | Inspector | Preview | PDF / HTML export | Review rules |
|---|---|---|---|---|---|---|
| paragraph, heading | `paragraph`, `heading` | yes | text styles | yes | yes | – |
| lead_paragraph | `paragraph` + `textRole: lead` | yes | text style | yes | yes | – |
| quote | `blockquote` | yes | – | yes | yes | – |
| pull_quote | `pullQuote` | yes | yes | yes | yes | empty |
| callout / technical_callout | `callout` (tone, icon) | yes | yes | yes | yes | – |
| bullet_list, ordered_list, checklist | `bulletList`, `orderedList`, `taskList` | yes | – | yes | yes | – |
| divider | `horizontalRule` (+ `spacer`) | yes | – | yes | yes | – |
| collapsible_content | `details` | yes | – | yes | yes | – |
| table | `table` | yes | yes | yes | yes | – |
| code_block | `codeBlock` (plain: no language, title, line numbers or copy) | yes | **no** | yes | yes | – |
| image | `image` | yes | yes | yes | yes | alt |
| image_grid | `imageGrid` | yes | yes | yes | yes | empty, alt |
| video | `videoFile` | yes | – | yes | note in print | empty |
| approved_embed | `embed` (allowlist: YouTube, Vimeo, Loom, Figma) | yes | – | yes | yes | bad link |
| pdf_attachment | `fileAttachment` | yes | – | yes | yes | – |
| comparison, showcase, split_layout | `comparison`, `showcase`, `splitLayout` | yes | yes | yes | yes | empty, alt |
| device_composition | `deviceMockup` | yes | yes | yes | yes | empty, alt |
| annotated_screenshot, screen_sequence | `annotatedImage`, `screenSequence` | yes | yes | yes | yes | empty, alt |
| metrics | `metrics` (value, label; no unit / period / baseline / source yet) | yes | yes | yes | yes | figures |
| chart | `chart` | yes | yes | yes | yes | figures, summary |
| research_insight | `researchInsights` | yes | yes | yes | yes | empty, evidence |
| process_timeline, flow_diagram | `timeline`, `flowDiagram` | yes | yes | yes | yes | – |
| section | a top-level level-2 heading with `section`, `sectionId`, `sectionStatus` | yes | guide | yes | yes | empty, status |

That is 31 of the plan's 87 block ids. **56 are missing**: footnote, reference_list, definition_list,
link_list, bookmark, journey_map, statistics, kpi_comparison, code_tabs, terminal_block, api_endpoint,
request_response, parameter_table, version_notice, architecture_diagram, sequence_diagram, error_reference,
troubleshooting_item, component_diagram, data_model, security_matrix, failure_matrix, user_story,
requirement_list, acceptance_criteria, decision_record, dependency_card, edge_case, risk_register,
priority_badge, client_profile, project_summary, testimonial, campaign_gallery, cta, source_reference,
document_metadata, responsibility_matrix, procedure_steps, decision_tree, escalation_path, sla_table,
revision_history, subsection, table_of_contents, release_header, version_badge, feature_update,
improvement_item, bug_fix_list, breaking_change, deprecation_notice, known_issue, compatibility_table,
persona_card, team_roles. No block may be marked delivered without schema, editor, inspector, preview,
export, validation and accessibility (the plan's block rule), so these arrive with the template that needs
them (Phases 3–5), not as stubs.

Block metadata is split today: names/icons/families in `editor/blocks/registry.ts`, defaults and review
rules in shared `caseStudies/blockSchemas.ts`, renderers in `caseStudy/blockRenderers.tsx`, inspectors in
`editor/blocks/inspectors.tsx`, commands in `insertCommands.tsx`. There is no single catalogue with search
terms and document types, and no export renderer other than HTML.

## 5. Templates

`packages/shared/src/frameworks`: Product and UX design v1 and v2 (10 sections), UX research v1,
Product redesign v1, Feature development v1, Blank v1. Each is immutable and versioned; a document stores the
id and version; a section heading stores only its section key, so **a key means one section across every
template** (tested). Sections already have purpose, prompts, suggested evidence, suggested visuals, required,
and `covers` (which review-checklist line the section counts for).

Against the template contract: missing `category_id`, `document_type`, `purpose`, `metadata_fields`,
`recommended_blocks`, `validation_rules`, `export_profiles`, and per section `writing guidance` and
`completion_criteria`. The plan's UX template (9 sections, one template) is narrower than what is live
(four UX templates, 10 sections, an Opening section); **the live ones are kept as they are**, as the
Design and research pack.

The plan reuses section keys across templates (`overview`, `context`, `problem` …). That conflicts with
"a key means one section" above, which the outline, guide, review and preview rely on. New templates will
use prefixed keys (`dev-overview`, `spec-problem`), which still satisfies the contract's "unique within a
template version" and keeps every existing document valid.

## 6. Capability map

| Capability in the plan | State | Notes |
|---|---|---|
| Private multi-user foundation, two sign-in methods, one workspace each | existing | unchanged throughout |
| Generic document entity | missing | Phase 1 |
| Status lifecycle (in progress, ready for review) | partial | per-section status exists; document-level missing |
| Version history | existing | plan lists it as future; it's done (T7) |
| Versioned template engine | partial | frameworks; contract fields missing |
| Template library, categories, search, preview | missing | wizard has a framework step only |
| Creation wizard (skip optional, back keeps values, outline editing, cover) | existing | UX-specific copy and fields |
| Blank document, duplicate own document | existing | |
| Dashboard "My Documents", type filter, list view | partial | grid of case studies; no type/category, no list view |
| Universal editor, toolbar, bubble, block handle, inspector | existing | |
| Shared insertion registry across Insert, `/`, recommendations | existing | no document-type ranking, search has no synonyms list per block |
| Block catalogue with versions, search terms, document types | partial | split across four files |
| Guidance separate from content, private notes never exported | existing | hints are placeholders; notes in their own table |
| Template-aware review, no score | partial | deterministic, no score, links to section/block; checklist is UX-shaped |
| Private preview | existing | one editorial presentation |
| PDF export | existing | browser print, desktop layout; one profile |
| Standalone HTML export | partial | one self-contained `.html` (data URLs), not a ZIP |
| Markdown export, JSON + asset manifest backup | missing | Phase 6 |
| Domain blocks (engineering, product, release, marketing, operations) | missing | 56 blocks |
| Analytics events | missing | none in the product (removed with the portfolio); Phase 7 |
| Accessibility (skip links, landmarks, roving toolbars, named controls) | existing | to re-verify for new UI |
| Unsafe findings | none | no public path, no service key in the browser, embeds allowlisted, no raw HTML nodes |

## 7. Risks

| Risk | Mitigation |
|---|---|
| Renaming the table breaks a function body or the API cache | recreate `studio_same_owner_as_*`; `notify pgrst`; run up **and** down inside a rolled-back transaction on staging before applying |
| A running Express (no watch) keeps old table names after the migration | restart it at cutover; the migration and the code ship together |
| Section-key clashes between templates | prefixed keys; registry validation fails the build on a clash |
| 56 new blocks done shallowly | each block ships only with its full lifecycle; registry test fails for a catalogue entry without editor support |
| Stored documents altered by a rename | the migration touches no row content; verified by count + md5 of `content` before and after |
| Staging pooler allows 15 clients | run live suites one at a time |
| Phase 4/5/7 gates need practitioners (domain review, beta cohort) | cannot be produced by the coding agent: recorded as open, needs people |

## 8. Baseline

See "Baseline results" at the end of this file (offline and staging suites, run before any change).

## 9. Order of work

Phase 1 document model → Phase 2 template engine, library, creation flow → Phase 3 block catalogue and
shared primitives → Phase 4 Release 1 templates with their blocks → Phase 5 Release 2 → Phase 6 review and
export profiles → Phase 7 QA, analytics, beta. Each phase gets `docs/multi-vertical/phase-N-report.md` with
plan, files, outcomes, test evidence and a score against its criteria.

## Baseline results (2026-11-12, before any change, commit `5144d57`)

Offline (`scripts/security-suite.sh`): no single-owner/portfolio code, TypeScript (shared, Express,
frontend), ESLint, review engine 15/15, Express build, Django check, Django auth tests 26/26 — all pass.

Staging (`scripts/security-suite.sh <django log>`), 308 checks, all pass:

| Suite | Result |
|---|---|
| Schema: ownership, constraints, lockdown | 33/33 |
| Auth: both methods, one identity, sessions | 23/23 |
| Storage: private files, isolation | 30/30 |
| Documents: editor data, isolation, no publishing | 55/55 |
| Project setup: frameworks, resume, duplicate | 35/35 |
| Sections: v2 migration, ids, private notes | 30/30 |
| Review: card progress, preview | 16/16 |
| History: versions, restore, isolation | 23/23 |
| Editor in a real browser: save, reload, PDF and HTML export | 36/36 |
| Lifecycle and caching | 27/27 |

No known failures. The UX case-study flow (create from the wizard, write, save, reload, preview, export to
PDF and HTML, archive, restore, delete) is covered by the browser suite and reproduces.

## Exit criteria

| Criterion | Result |
|---|---|
| Current repository version and architecture are confirmed | met (§1–§5, from the code and the staging catalogue) |
| Existing UX case-study workflow can be reproduced | met (browser suite 36/36) |
| No unresolved critical uncertainty about ownership or storage | met (deny-all RLS, zero policies, private bucket, owner triggers; §1, §3) |
