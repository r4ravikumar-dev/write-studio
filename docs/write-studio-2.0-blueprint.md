# Write Studio 2.0: UX architecture and product blueprint

> Condensed record of the blueprint the product owner provided on 2026-11-10. It is the contract for
> the next development cycle, which runs **one stage at a time with an acceptance gate after each**.
> It sits **on top of** the completed six-phase multi-user build (`docs/master-plan.v2.json`); that
> build's privacy architecture must not change.

## Direction (locked)

- **Editor:** hybrid. Structured document writing plus visual composition, with Tiptap kept as the engine.
- **Priority:** guided case-study creation and storytelling.
- **Audience:** UX/UI and product designers.
- **Objective:** make it easier to turn project work into well-structured, visually compelling case studies.
- **Central idea:** nobody should have to work out *how* to make a case study before they can start making one.

## Principles

1. **Guided, not restrictive.** The product suggests structure and asks questions; the user owns the narrative.
2. **Document-first, visually expressive.** Writing is primary. Visual blocks are composable but never an unrestricted canvas.
3. **Content before decoration.** Help users explain their thinking before polishing layouts.
4. **Contextual assistance.** Guidance appears where it's relevant, never as an intrusive chatbot.
5. **User-owned content.** Documents stay private, editable and portable.

The product should feel like an editorial workspace crossed with a visual storytelling tool. It should not feel like a Notion clone, a Word document or a Figma canvas.

## Five environments (one project, one document model)

1. **Workspace.** The dashboard: projects, drafts, frameworks, media.
2. **Project Setup.** A guided wizard for project context and framework.
3. **Story Builder.** Sections, writing and contextual guidance.
4. **Composition Studio.** Visual blocks inside the document.
5. **Review & Output.** Checklist, private preview, export.

## Workspace (dashboard)

- **Welcome area:** a greeting, a quick-create action, a one-line explanation, and "continue latest".
- **Project cards:** thumbnail, title, project type, last updated, progress (sections complete), status (draft/archived).
- **Views and filters:** grid and list views; filters All / In progress / Ready for review (derived from the checklist, not a publish state) / Archived.
- **Navigation:** Overview, My Projects, Frameworks, Media Library, Settings.
- **Tone:** not an analytics-heavy SaaS dashboard. The emphasis is projects, progress and the next action.
- **Empty state:** explains the process and offers one action, "Start your first case study".

## Project Setup wizard (first feature to build)

Steps:
1. Choose how to start: recommended framework, blank, or duplicate an existing case study.
2. Choose the project type: Product/UX design, Product redesign, UX research, Feature development, or Custom.
3. Add context (all optional except the title): title, overview, role, team, timeline, platform, objective, primary challenge.
4. Choose a storytelling framework, with a visual preview of its sections, their purpose and the narrative flow. The user can customise it.
5. Add initial assets (optional): a cover upload or existing media. Skippable.
6. Review the outline: rename, reorder, add or remove sections.
7. Create the case study: a private draft, opened in the editor.

The wizard must support skip for now, save and continue later, going back to edit, starting blank, and changing the framework before entering the editor. It must never block writing.

## Framework system

- **What a framework holds:** a narrative purpose and its sections. Each section has a stable `key`, a title, a purpose, `required`, prompts, suggested evidence, suggested visuals and a completion checklist.
- **Library:**
  - **Product / UX Design:** P0, the first to be fully developed.
  - **Product Redesign, UX Research, Feature Development:** P1.
  - **Blank:** always available.
- **Rules:**
  - Frameworks are data-driven and **versioned**, and each version is immutable.
  - A framework change never alters existing projects.
  - Users can add custom sections, rename, remove and reorder them, and repeat a section type.
  - Recommendations are optional.

Illustrative schema:
```json
{"id":"product-ux","version":1,"name":"Product / UX Design","description":"…","audience":["ux-designer","product-designer"],
 "sections":[{"key":"context","title":"Project Context","purpose":"…","required":true,
   "prompts":["…"],"suggestedEvidence":["…"],"suggestedVisuals":["showcase","metrics"]}]}
```

## Story Builder: three-region hybrid editor

- **A. Story Outline (left):**
  - Manage the section list: add, rename, duplicate, delete, drag to reorder, navigate, collapse groups.
  - Each section shows an understated state: Empty / In progress / Review / Complete. Word count is never treated as quality.
- **B. Writing Canvas (centre):**
  - Tiptap: rich text, lists, quotes, tables, links, inline media, slash commands, visual block insertion, inline composition editing, undo/redo, autosave.
  - It stays document-oriented, and the outline stays reachable while scrolling.
- **C. Contextual right panel, one mode at a time:**
  - **Guidance**, for the active section: purpose, questions, evidence, recommended visuals, examples.
  - **Properties**, for the selected block: layout, size, alignment, spacing, focal point, appearance.
  - **Media**: search, upload, reuse, filter.
- **Hybrid flow:** write a paragraph, insert a grid below, select it, configure it on the right, replace images on the canvas, reorder, keep writing.

## Contextual guidance engine (deterministic, not AI)

- **Per section:** objective, guiding questions, suggested evidence, recommended visuals and a completion checklist.
- **Interactions:** expand or collapse guidance, hide it entirely, mark a section complete, mark it for review, add a private note, jump to the next section, and insert a recommended visual.
- **Separation:** guidance and private notes never go into the document or exports.
- **Story completeness review:** a checklist (context, problem, contribution, decisions, evidence, outcome), not an AI score.

## Visual composition

- **Blocks:** improve the existing ones (ImageGrid, Comparison, Showcase, DeviceMockup, SplitLayout, PullQuote, Callout, Metrics) rather than duplicating them.
- **Control levels:** presets, then inspector controls, then direct manipulation where appropriate. Device positions use normalised coordinates with responsive constraints.
- **Later, after usage is validated:** annotated screenshots, journey, timeline, flow diagrams, comparison slider, stacked screens.

## Review, preview, export

- **Review dashboard:**
  - Structure: empty sections, review flags, order.
  - Content: context, contribution, decisions, evidence for outcomes.
  - Visual: readability, alt text, consistency, empty blocks.
  - Technical: missing media, broken embeds, responsive overflow.
  - Every warning has a direct action, such as "Go to section".
- **Private preview:** desktop, tablet and mobile; the reading experience, not the editor. Authenticated and owner-only, with no public links.
- **Export:**
  - PDF (P1), standalone HTML ZIP (P1), Markdown and JSON + media backup (P2), DOCX later.
  - Reuse the preview renderer.
  - Export generation and download are owner-only.

## Technical architecture

- **Kept:** Next.js + React, Tiptap (JSON is the source of truth), custom nodes and NodeViews, Astryx, the shared renderer, and Supabase Postgres plus private Storage.
- **Auth and access, as built:** the current repository's Django auth, Express owner scoping and deny-all RLS are authoritative (see Conflicts).
- **Routes:** adapt to the existing `/studio/...` routes instead of duplicating them.
- **Section structure:** a custom `caseStudySection` node `{id, frameworkKey?, title, status: not_started|in_progress|review|complete}` holding normal content and blocks. It renders to `<section>`. Migrate heading-based documents through a **versioned, tested, recoverable** migration (`content_schema_version`), never silently on first render.
- **State:**
  - Project metadata, the document, the framework id and version, and media references are persisted.
  - Section state lives in document metadata or the database.
  - Editor interaction and preview settings are client-only.
  - Guidance comes from framework definitions.
  - Transient UI state never goes into the document.
- **Autosave:**
  - Debounced, validated server-side for ownership.
  - Updates `updated_at` and the revision, and shows a visible state.
  - A failure produces an actionable retry.
  - An older save never overwrites a newer one.
  - It recovers after network loss and detects concurrent edits.
  - It never discards work silently, and copes with large payloads.

## Privacy (non-negotiable, unchanged)

- **Access:**
  - Every private route needs a session, and every project has one owner.
  - Owner checks apply to every create, reorder, update, autosave, archive, review and export.
  - Media and preview stay private; exports are owner-only.
- **Frameworks:** global system frameworks can be read by anyone; personal frameworks are private.
- **Analytics:**
  - Never include content, notes, media, filenames or URLs.
  - Nothing is sent to third parties without consent.
  - No publishing in this release.
  - No shared caching of authenticated responses.
  - Never put public URLs into Tiptap JSON.

## Responsive

- **Desktop:** full three-panel authoring.
- **Tablet:** full writing, with collapsible panels.
- **Mobile:** reading, light editing and project management, with drawers. No complex device composition on mobile in the first release.

## Priorities

- **P0:**
  - Dashboard.
  - Wizard, framework selection and preview, project metadata.
  - Product/UX framework, Blank framework.
  - Section add, delete, reorder, duplicate and rename.
  - Guidance (objectives, prompts, evidence, visuals), completion and review states.
  - The three-panel editor with a context-aware right panel.
- **P1:**
  - Grid/list and filters.
  - The other frameworks.
  - Keyboard and slash commands, undo and recovery.
  - Block improvements and device direct manipulation.
  - Review checklist, responsive preview, PDF and HTML export.
- **P2:**
  - Markdown/JSON export.
  - Story Coach and AI writing.
  - Version history, custom frameworks.
- **P3:** integrations.
- **Future:** publishing.

## Stages (one at a time, acceptance gate after each)

| Stage | Name | Exit criterion |
|---|---|---|
| 0 | Product discovery & UX audit | We understand why users struggle to complete a case study |
| 1 | Guided project creation (P0) | A new user can create a meaningful structure without understanding the editor |
| 2 | Story structure & guidance (P0) | Users organise and write a complete narrative without a fixed template |
| 3 | Hybrid editor (P0) | Write, structure and compose without leaving the editor |
| 4 | Advanced visual composition (P1) | Polished, varied layouts without a separate design tool |
| 5 | Review, preview, output (P1) | Users review and take a complete case study outside the app |
| 6 | Closed beta & iteration | Users complete case studies and have a reason to return |

**First sprint, from blank page to structured story:**
1. Project creation: entry point, type, optional info, framework.
2. Framework engine: Product/UX and Blank, versioned, with questions and visuals.
3. Section builder: add, delete, rename, duplicate, reorder, completion state.
4. Contextual guidance: purpose, questions, evidence, visuals, collapse or hide.
5. Editor integration: Tiptap compatible, visual blocks intact, autosave, private ownership.

## Non-negotiable constraints

- Never weaken ownership checks, or expose private documents or media.
- Never store guidance as document content, overwrite content when frameworks change, or run destructive document migrations without a backup and tests.
- Never invent metrics or findings with AI.
- Never add an unrestricted canvas, or duplicate the Tiptap editor or document engine.
- No AI before the guidance is useful on its own.
- The outline is never a separate source of truth from the document.

**Per stage, deliver:** a UX flow and interaction spec, the technical architecture, a file-by-file plan, database changes, the working implementation, unit and integration tests, privacy verification, responsive and accessibility QA, and a completion report.

**Analytics events (no content ever):**
- Setup: `project_wizard_started`, `framework_selected`, `project_created`.
- Structure: `section_added`, `section_reordered`.
- Editing: `guidance_opened`, `visual_block_added`.
- Output: `project_previewed`, `project_reviewed`, `export_completed`.
- Outcome: `project_completed`, `returning_creator`.
- Primary metric: completed case studies per active creator.

**Product filter:** does this help someone create a better case study, make the process easier, or make the finished result more useful?

## Conflicts with the current build (recorded at Stage 0)

| Blueprint says | Current build (authoritative, per the brief's source-of-truth note) |
|---|---|
| Authentication: Supabase Auth | Django auth service (user decision, 2026-11-10) |
| "RLS on all user-owned records", "private bucket with independent storage RLS" | Deny-all RLS (no policies, no grants) plus Express owner scoping plus DB constraints; private bucket with **no** policies, reached only via Express |
| Routes `/studio/dashboard`, `/studio/projects/[id]/edit` … | Existing `/studio`, `/studio/case-studies/[id]`, `…/preview`; extend these, don't duplicate |
| Template at `src/content/caseStudyTemplate.ts` | Now `packages/shared/src/caseStudies/template.ts` |
| Guidance is "UI-only", but private notes are persisted | Notes need owner-scoped storage outside the document JSON (a new table or column) |
