# Stage 0: Product discovery and UX audit

**Date:** 2026-11-10 · **Against:** `docs/write-studio-2.0-blueprint.md` · **Environment:** staging (local
services + Supabase `psfjngzdldqhvmabgvos`).

## 1. Scope and method

What was done:
- **New-user walkthrough in the browser:**
  - Steps: email-code sign-in, empty dashboard, "New case study", editor, inserting and configuring a visual block from the media library, autosave and reload, preview at desktop and mobile widths, archive, settings, media page.
  - Account: a throwaway designer account with sample media.
- **Code inventory:** mapped against the blueprint's five environments and its P0 list.
- **Measurements:** computed styles, saved document JSON, route timings.

Not possible in this stage, so it's owner work (see §8):
- Usability sessions with 5–8 target designers.
- Baseline analytics: no analytics exist yet.

## 2. Fixed during the audit (blocking defects)

| # | Defect | Impact | Fix | Verified |
|---|---|---|---|---|
| A-1 | **Every editor save lost all node attributes.** ProseMirror attributes are null-prototype objects, and React's server-action serializer can't send them, so it dropped them silently. | Heading levels, every visual-block setting and every image path were lost on save. Pictures vanished from the preview, and documents degraded on each reload. The status still said "Saved". | `Editor.tsx`: `plainDocument()` sends a JSON round-trip copy. | A new case study with a comparison block saved `level: 2` and both image paths; the preview showed both images. |
| A-2 | **No design foundation applied.** The Astryx theme attribute was never set; the type, spacing and brand tokens were undefined (58 references); the fonts were never loaded. | The whole app rendered in browser-default Times at 16 px. Headings looked like body text, the brand colour was empty, and the mode was dark or light depending on the OS. | DNA Design System v2.0 adopted (below). | Computed styles match DNA on desktop and at 375 px. |

**DNA adoption (A-2), files:**
- **`theme/dna-tokens.css`:** a scripted copy of DNA's `references/tokens.css`. The one change renames `--spacing-N` to `--space-N`, because Astryx already uses `--spacing-N` for its own 4 px-step scale.
- **`theme/dna-bridge.css`:** points Astryx's colour, radius and border names at DNA semantic tokens. It pins light mode (DNA has no dark mode), sets 8 px buttons with `brand/intense` hover and a brand focus outline, and sets the font families.
- **`theme/typography.css`:** the DNA web/mobile scale as variables for Astryx text tokens and the case-study prose. UI text uses DNA's `.t-web-*` / `.t-mobile-*` classes.
- **`theme/foundation.css`:** the DNA layout defaults (card padding, section gap, stacks, radii).
- **`app/fonts.ts`:** Outfit (primary, by product decision; DNA v2.0 says Inter) and Bricolage Grotesque (display), self-hosted via `next/font`.
- **Removed:** the portfolio's "liquid glass" button and header layer (290 lines of raw `rgb()` values and pill radii).

**Test gap A-1 exposed.** The live tests call Express directly and bypass the server action, so this class of bug was invisible to them. Stage 3 needs a browser end-to-end test: edit in the real editor, then assert on the saved JSON.

### Liquid Glass (added on request during Stage 0)

`theme/liquid-glass.css`, Apple-style (rim light only, on every control; bars edge to edge), on DNA tokens only.

- **Where glass goes (three-tier rule):**
  - Glass only on top-layer floating navigation and controls: the workspace header, the editor top bar, the floating formatting toolbar (concentric 24 px panel) and the text bubble menu (capsule).
  - Content stays opaque DNA: cards, tables, the document, dialogs and the inspector panel. No glass-on-glass.
- **Optics:** blur(24) + saturate(180%) + contrast(105%); a Fresnel rim (top specular, bottom reflection, continuous rim); DNA `Elevation/none` + `Elevation/400`; a pointer-following specular highlight (`.interactive()`).
- **Variants:** `.regular` (default, a dense tint so text stays at 4.5:1), `.clear` (rich media only), `.tint` (brand).
- **Grouping:** related actions share one capsule (`.glass-group` = glassEffectUnion).
- **Scroll edge:** content fades under the floating bars instead of clipping.
- **Degradation:** opaque DNA fills and solid borders under Reduce Transparency, Increase Contrast or no `backdrop-filter`; no motion under Reduce Motion (all four rules verified as registered).
- **Web limits:** SDF refraction and metaball merging can't run on a live backdrop blur in browsers. Rim lighting and shared capsules stand in for them. The one-way pointer highlight replaces device-tilt lighting.

## 3. New-user journey (as experienced)

| Step | What happens | Friction |
|---|---|---|
| Sign up / in | Password + confirmation link, or email code | Code sign-up never asks for a name, so the dashboard greets "Welcome, audit-designer" (the email prefix). Each sign-in takes ~10 s (round trips to Sydney). |
| Dashboard (empty) | Greeting, one-line note, "New case study" top-right | No explanation of how creation works. The primary action sits away from the empty state. No project types, frameworks or progress. |
| New case study | Straight into the editor, titled "Untitled case study" | **No guided start.** No type, context, framework choice or outline review. |
| Editor (first view) | 10 template headings, each with an italic hint *inside the document* | The hints are document content: they get saved, previewed and exported, and the user must delete them. The title isn't on the canvas; it's a "Headline" field in the right panel. The panel opens on a metadata form with Thumbnail first (decoration before content). No outline or section navigation. |
| Insert visual | "/" menu → Comparison → "Choose image" → media picker | Works well. The picker lists only this user's files; the right panel switches to the block's properties automatically; alt text is pre-filled. Friction: the bubble menu (B/I/U/link) overlaps the block's own toolbar. |
| Writing near blocks | — | Inserting under a heading puts the block between the heading and its hint line, so the structure reads wrong. |
| Autosave | "Saved · time" in the top bar | Silently lost attributes until A-1. It now works, with conflict detection between tabs. No offline/retry queue. |
| Preview | Desktop / tablet / mobile in a dialog, or a separate tab | Hints show as body text. Preview was unstyled until A-2. Blocks render the same as in the editor. |
| Archive / restore | Top-bar button | Works; read-only banner. |

## 4. Findings, ranked

Severity: **S1** blocks the guided-creation goal · **S2** significant friction · **S3** polish.

| ID | Sev | Finding | Blueprint link | Proposed stage |
|---|---|---|---|---|
| F-01 | S1 | No guided start: no wizard, project type, context, framework or outline review | §2.2, Stage 1 | 1 |
| F-02 | S1 | Writing hints are document content, so they're exported and interleave with blocks | §5 "guidance never in the document" | 2 |
| F-03 | S1 | Sections are plain headings: no stable IDs, status or per-section guidance; reordering means cut and paste | §8.3 `caseStudySection` | 2 |
| F-04 | S1 | No story outline / section navigation | §4.1 Region A | 2–3 |
| F-05 | S2 | The right panel defaults to a metadata form (Thumbnail first) instead of guidance | §4.1 Region C, principle 3 | 3 |
| F-06 | S2 | The title lives in the side panel, not on the canvas | Story Builder | 3 |
| F-07 | S2 | The dashboard is a plain table: no thumbnails, type, progress, filters or empty-state guidance; "Private draft" wraps in a narrow column | §2.1 | 1 (empty state, cards), P1 (filters) |
| F-08 | S2 | Code sign-up doesn't capture a display name | Workspace greeting | 1 |
| F-09 | S2 | The toolbar is split into 4 tabs (Text / Format / Paragraph / Structure), hiding common actions | Editor | 3 |
| F-10 | S2 | 2–10 s per action (staging calls Sydney from here) would distort usability sessions | Stage 6 | Before sessions: co-locate backends |
| F-11 | S3 | The bubble menu overlaps block toolbars | Composition | 3/4 |
| F-12 | S3 | The editorial preview components were built for the old portfolio hero (very tall hero, decorative behaviour) | §7.2 | 5 |
| F-13 | S3 | ~2,500 lines of dead portfolio CSS remain in `globals.css` (unused selectors, raw values) | DNA rule: semantic tokens only | Ongoing cleanup |
| F-14 | S3 | Untested in depth: editor at tablet/mobile widths, keyboard-only use, screen readers | §10, §14 | 3 |

## 5. Code inventory against the blueprint

| Blueprint need | Exists today | Reuse plan |
|---|---|---|
| Workspace dashboard | `(workspace)/page.tsx`, `StudioCaseStudyList` (table), `NewCaseStudyButton` | Replace the table with project cards; keep the actions and queries |
| Wizard | — (`/case-studies/new` is a one-field title form) | New `components/studio/creation/*`; keep the POST-only creation rule |
| Framework engine | `packages/shared/src/caseStudies/template.ts` (10 sections, title + hint) | Evolve into versioned framework JSON in `packages/shared` (read-only, global); hints become guidance |
| Section node | — (plain `heading`) | New `caseStudySection` Tiptap node in `components/caseStudy/schema.ts`; migration from `content_schema_version` 1 to 2 |
| Story outline | — | New, derived from the document (not a second source of truth) |
| Guidance panel | Right panel has Block / Case study tabs (`Editor.tsx`, `BlockInspector`, `SettingsPanel`) | Add a Guidance mode; the panel already switches context on selection |
| Properties mode | `BlockInspector` | Reuse as-is |
| Media mode | `MediaLibrary` modal picker, `/studio/media` page | Reuse; later dock it in the panel |
| Visual blocks | 8 blocks: ImageGrid, Comparison, Showcase, DeviceMockup, SplitLayout, PullQuote, Callout, Metrics | Reuse (Stage 4 improves them) |
| Autosave | Debounced, version-checked (409 on conflict), plain-JSON fix | Add retry/offline queue and a revision counter |
| Private preview | `/studio/case-studies/[id]/preview`, owner-only | Restyle (Stage 5) |
| Review / export | — | Stage 5 |
| Project metadata | Title, subtitle, label, area, tags, summary, focus, thumbnail, cover | Add project type, role, team, timeline, platform, objective, challenge, framework id/version |
| Private notes | — | Owner-scoped storage outside the document |
| Analytics | None | Privacy-safe event pipeline (no content) before beta |
| Design system | DNA v2.0 tokens applied (§2); Liquid Glass on top-layer controls | All new UI uses DNA semantic tokens and `.t-*` styles; floating controls use `.glass` |

## 6. Technical dependencies for Stage 1 (and 2)

1. **Migration `0010_studio_projects.sql`.** Add nullable `project_type`, `role`, `team`, `timeline`, `platform`, `objective`, `challenge`, `framework_id`, `framework_version` and `setup_state` (for "save and continue later") to `studio_case_studies`, with length checks. Owner-only access stays as it is (deny-all RLS plus Express scoping).
2. **Framework definitions as versioned, immutable data** in `packages/shared/src/frameworks/` (Product/UX v1, Blank v1). Express validates `framework_id`/`version` on create.
3. **Express:** extend `POST /api/app/case-studies` with setup fields and a generated outline; `POST /:id/duplicate`; validate everything server-side.
4. **Stage 2:** `caseStudySection` node, schema v2 and a migration. The v1-to-v2 converter must be tested, versioned and recoverable, never silent on render.
5. **Private notes:** a new owner-scoped table (`studio_section_notes`, keyed by case study and section ID), never stored in the document.

## 7. Conflicts with the blueprint (decided)

| Blueprint | Decision |
|---|---|
| Supabase Auth, "RLS on user records", "storage RLS" | Keep the built architecture: Django auth, deny-all RLS plus Express owner scoping plus DB constraints, a private bucket reached only via Express |
| Routes `/studio/dashboard`, `/studio/projects/[id]/edit` … | Extend the existing `/studio`, `/studio/case-studies/[id]` routes |
| DNA `fontFamily/primary` = Inter | **Outfit**, by the product owner's instruction (one-line switch in `src/app/fonts.ts`) |
| DNA `--spacing-N` | `--space-N`, since Astryx owns `--spacing-N` |

## 8. Owner tasks before Stage 6 (cannot be done by the agent)

- **Usability sessions:** recruit 5–8 UX/product designers. Script: "turn a recent project into a case study". Observe time to first meaningful content, framework understanding and where people stall.
- **Analytics:** choose a privacy-respecting tool. The blueprint's event list carries no content, filenames or URLs.
- **Confirm the primary font:** Outfit (current) or Inter (DNA canonical).
- **Beta infrastructure:** co-locate the backends with Supabase (Sydney) so sessions aren't distorted by latency.

## 9. Baseline

| Metric | Value |
|---|---|
| Steps from sign-in to first written sentence | 3 (New case study → click a heading → type) |
| Guidance available while writing | Hint lines only, embedded in the document |
| Time per server round trip (local → Sydney) | ~2–10 s |
| Analytics baseline | None (no instrumentation) |
| Automated checks | 26 Django, 33 schema, 23 auth, 30 storage, 55 documents, 27 lifecycle (all passing); 0 browser end-to-end |

## 10. Exit criterion

> "We understand the main reasons a user struggles to complete a case study."

From the walkthrough, the main reasons are F-01 to F-04: no guided start, guidance mixed into the document, no section structure, and no outline. The data-loss bug (A-1) would have made any session fail. **This is met for the product walkthrough; it should be confirmed with real designers (§8).**

## 11. Recommended Stage 1 scope (for approval)

1. Migration `0010` (project metadata, framework id/version, setup state).
2. Versioned frameworks: Product/UX v1 and Blank v1 in `packages/shared`.
3. Project wizard: start mode (framework / blank / duplicate), type, optional context, framework preview, optional cover, outline review, then a private draft. Skip and resume supported throughout.
4. Dashboard: project cards (thumbnail, type, updated, status), an empty state with "Start your first case study", and the name captured at code sign-up.
5. Tests: framework validation, ownership on create and duplicate, wizard resume, and a first browser end-to-end save test (closing the A-1 gap).
