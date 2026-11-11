# Case Study Studio — codebase context

> Project memory: read first. Last updated 2026-11-10, after removing the single-owner portfolio.

## 1. What this is

A **public, multi-user Case Study Studio**. Anyone registers (email + password with confirmation link,
or email code; one account per email). Every account gets **one private personal workspace**: private
case studies (a Tiptap editor with visual blocks), a private media library, a private preview.
**Nobody else can access a user's documents or media.** No owner/admin accounts, no public pages of
user content, no publishing, no sharing, no teams.

History: it began as a single-owner portfolio CMS (`/write`, `/work`, side work, publishing,
`ADMIN_EMAIL`). On 2026-11-10 the user had all of that removed (see §8). The implementation contract is
**`docs/master-plan.v2.json`** (v2 of `/Users/visit/Downloads/ME/write-studio-multi-user-master-plan.json`,
which is kept unchanged). All six phases (0 audit · 1 database · 2 auth · 3 storage · 4 editor ·
5 security) are done on staging. **Production has never been touched.**

User decisions: Django is the identity provider (not Supabase Auth); Supabase project
`psfjngzdldqhvmabgvos` (Sydney, ap-southeast-2) is **staging**; work phase by phase and report.

## 2. Architecture (npm workspaces)

```
frontend/          @studio/frontend  Next.js 16 + React 19, Astryx UI. Server-side only talks to backends.
backend/django/    Django 4.2 (Python 3.9 venv .venv) auth service. accounts app.
backend/express/   @studio/express-api  Express 5 + TS. Only holder of the Supabase service-role key.
packages/shared/   @studio/shared  TS source (no build): types, schema helpers, validation, constants.
supabase/          migrations 0001-0009, tests/, README (migration order)
scripts/security-suite.sh   runs every check
docs/              master-plan.v2.json, RELEASE.md
```
Root scripts: `dev:web` (3000), `dev:api` (4000), `dev:auth` (8000), `build`, `typecheck`.

Flow: browser → Next pages/server actions → Django (`X-Service-Key` + `X-Client-IP`) for auth, or
Express (`Authorization: Bearer <access>`) for data. Session = httpOnly cookies `studio_access` /
`studio_refresh`, path `/studio` (`STUDIO_SESSION` in shared). `src/proxy.ts` (matcher `/studio/*`)
verifies the JWT with `jose`, refreshes via Django when expired, redirects signed-out users to
`/studio/login?next=…` (safe-next allowlist), 404s signed-out `/studio/files/*`, sets
`Cache-Control: private, no-store` on signed-in responses. `/` redirects to `/studio`.

## 3. Django auth service (`backend/django`)

- `accounts.User` (AUTH_USER_MODEL): UUID pk (= JWT `sub` = Studio `owner_id`), unique lowercased email,
  display_name, email_verified_at, session_version, is_active. Table `django.accounts_user`
  (DB `search_path=django`, a schema PostgREST doesn't expose). Also LoginCode (HMAC-hashed),
  RevokedToken, ThrottleEvent.
- Endpoints `/api/auth/*` (all need `X-Service-Key` except health): request-code, verify-code (creates
  the account on first use), signup (+single-use confirm link `FRONTEND_URL/studio/confirm?token=`),
  confirm-email, login, forgot-password, reset-password, me, update-profile, set-password (add for
  code-only accounts; change needs current), delete-account/confirm (password or fresh code → 5-min
  token bound to user + session_version) and delete-account, refresh (rotation + `sv` check), logout.
- JWT HS256 (`JWT_SECRET`), iss `studio-auth`, aud `studio`, access 15 min, refresh 30 d, claims
  `sub,email,role='user',type,sv,jti`. **Every account has role `user`; no owner, no ADMIN_EMAIL.**
  The old `purpose` field is ignored.
- Security: generic replies (no account enumeration), DB throttles per email + per IP, password
  validators (min 10), dummy-hash timing, pre-hijack defence (unconfirmed password dropped when the
  email is proven by code), email backend SMTP_* > GMAIL_* > console (dev; prints codes).
- Tests: `.venv/bin/python manage.py test accounts` (26, in-memory SQLite).

## 4. Express API (`backend/express/src`)

All routes behind `requireUser` (jose verify, type access, role user, UUID sub); every query
`.eq('owner_id', req.user.id)`; owner/workspace set server-side. Responses `private, no-store`.
- `routes/app.ts`: `GET/PATCH /api/app/workspace` (+ `workspaceOf()`).
- `routes/appCaseStudies.ts`: list (?status), create (`{setup, finish}` from the wizard, or legacy `{title}` = full
  template), `PUT /:id/setup` (only while `setup_state` is set; finish builds the document), `POST /:id/duplicate`,
  get, PUT save (409 while setup is unfinished) (`studioDraftProblems`:
  every media path must be `{owner}/{workspace}/…`; 2 MB cap; `expected_updated_at` → 409 conflict;
  archived → 409), archive, restore, delete. No publish endpoint.
- `routes/appAssets.ts`: list, `POST /upload-url` (server picks `{owner}/{ws}/{case|library}/{uuid}.{ext}`
  from MIME; one-time signed upload URL), `POST /` record (HEAD the object; trust stored type/size;
  mismatch or insert failure deletes the object), PATCH alt, DELETE; `GET /api/app/media?path=` streams
  the owner's file (Range passthrough, nosniff, CSP sandbox, attachment for Office).
- `routes/appAccount.ts`: `DELETE /api/app/account/storage` purges every object under `{userId}/`.
- Env: PORT, CORS_ORIGIN, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, JWT_SECRET. Build `tsup` (bundles shared).

## 5. Frontend (`frontend/src`)

- Routes: public `studio/{login,signup,forgot-password,update-password,confirm}`; `studio/(workspace)/`
  {page (drafts dashboard), case-studies (?status=archived), case-studies/new (project setup wizard),
  case-studies/[id]/setup (resume an unfinished setup), media, settings}
  with layout (requireStudioUser + workspace header); `studio/(editor)/case-studies/[id]` (Editor) and
  `[id]/preview` (StudioPreview, ?embed=1); `studio/files/[...path]/route.ts` (owner-only file proxy);
  `app/page.tsx` → /studio; `app/layout.tsx` root.
- Actions: `app/studio/{auth-actions,account-actions,case-study-actions,media-actions}.ts`.
- Libs: `lib/api/{env,jwt,django,cookies,session,express}.ts`, `lib/auth/{current-user,safe-next}.ts`,
  `lib/studio/queries.ts`, `lib/storage/studio-storage.ts` (client uploader: signed PUT then record).
- **One Studio-only editor**: `components/editor/` — Editor (props `{study: StudioCaseStudy}`; autosave
  1200 ms with expected-version check; Archive/Restore; read-only when archived; `setEditable(x,false)`),
  Toolbar, SlashMenu, insertCommands, nodeViews, BlockInspector, blockOps, SettingsPanel (Studio fields
  only), MediaLibrary (`MediaProvider({caseStudyId})`), upload.ts (measure/pickFile helpers), NotConfigured.
- `components/caseStudy/`: schema.ts (Tiptap extensions shared by editor + static renderer),
  CaseStudyArticle (server render), blocks.tsx, visualBlocks.tsx. Every media URL =
  `studioMediaUrl(path)` → `/studio/files/<path>`, computed at render, never persisted. Only PDFs preview
  inline (Office viewers would need public links).
- `components/studio/`: StudioAuthForms, WorkspaceHeader, SettingsForms (incl. Delete account),
  MediaManager, StudioCaseStudyList, NewCaseStudyButton/Form, StudioPreview.
- Also used by the preview: components/editorial/{EditorialHero,Chapter,IndexLabel},
  storytelling/Lines, navigation/CtaButton, motion/*, illustrations/RippleGrid, theme/*.
- Theme: `src/theme/theme.css` (Astryx Stone, `npm run theme:build`), imported by `app/globals.css`.
- Env (server-only): API_URL, AUTH_URL, JWT_SECRET, AUTH_SERVICE_KEY. No Supabase keys or URLs.
- ESLint: `eslint.config.mjs` (next core-web-vitals + typescript), clean.

## 5b. Design system (2026-11-10)

- **DNA Design System v2.0** (Visit Health; skill `dna-design-system`, Figma `5DoZOoPtPaIJtfrXDTLYE2`). Rules:
  - Semantic tokens only, never primitives or hex. Component tokens win.
  - Text uses a text style (`.t-web-*` / `.t-mobile-*`); never raw font sizes.
  - Spacing and radius come only from the scale. Light mode only (DNA has no dark mode, so don't invent one).
- **Files (imported in `app/globals.css` after the Astryx theme):**
  - `theme/dna-tokens.css`: a scripted copy of DNA `references/tokens.css`. `--spacing-N` is renamed `--space-N` because Astryx owns `--spacing-N` (4 px steps). Re-copy to update; never hand-edit.
  - `theme/dna-bridge.css`: points Astryx colour, radius and border names at DNA semantic tokens; `color-scheme: light`; buttons radius/8, brand-intense hover, brand focus outline; font families.
  - `theme/foundation.css`: DNA layout defaults (card padding, section gap, stacks, radii) + legacy layout names.
  - `theme/typography.css`: the DNA web/mobile scale as variables (Astryx `--text-*` tokens, `.cs-prose`).
  - `theme/surfaces.css`: three Material-style surface layers on DNA tokens — L0 `--surface-base` (gray/normal: page, editor desk), L1 `--surface-container` (white: cards, settings sections, document sheet, side panel, table, dialogs), L2 `--surface-container-high` (gray/moderate: wells inside containers, table head, empty image frame). A layer only sits on the one below; containers use a hairline (`gray/subtle`) + radius/16. Astryx `--color-background-*` point at these.
  - `theme/liquid-glass.css`: Apple-style Liquid Glass (below).
- **Fonts** (`app/fonts.ts`, next/font, self-hosted): primary **Outfit** (the user's explicit choice; DNA v2.0 says Inter, a one-line switch); display **Bricolage Grotesque** 600. The root `<html data-astryx-theme="stone">` is required, or the theme doesn't apply.
- **Liquid Glass** (`theme/liquid-glass.css`; DNA v2.0 confirmed canonical over the "2025 1.0" skill):
  - Header (`.glass-bar`) and editor formatting toolbar: **edge to edge, square, sticky at the top** (header 56 px, toolbar under it). Never floating capsules.
  - Every control is glass: buttons (capsules; primary = brand-tinted, secondary = clear, ghost = **flat** (no glass, rim or shadow; `bg/gray/moderate` on hover, also inside bars); back buttons use `.back-cta` (tonal brand: `bg/brand/light` fill, brand label, deeper on hover); **destructive = clear glass with error-red text, never filled**), text inputs/selects/text areas are **outlined white fields** (radius/8, gray/intense outline, brand on hover/focus; never capsules, never gray-filled: gray reads as disabled), segmented controls (glass track + lens), tabs (selected = brand-tinted lens, no underline), menus/popovers (glass panels), switch/slider thumbs (lens).
  - **No white bloom / radial specular** (user: looks fake). Light lives only on the rim: crisp 1px top highlight, faint bottom edge. Tints are even, not sheens. No pointer-tracking runtime.
  - Inside a glass surface, controls drop their own blur (no glass-on-glass); ghost buttons sit flat; **secondary = the "on" state of toolbar toggles** (brand-tinted), so don't use secondary for plain actions in bars.
  - Overrides need four `:not(#\#)` to beat Astryx's atomic classes. Degrades for reduced transparency, increased contrast, no backdrop-filter, reduced motion.
  - **Touch targets:** every control (buttons, icon buttons, tabs, segments, selects, inputs, menu items) is `size/28`–`size/48` tall; on touch screens (`pointer: coarse`) the floor is `size/40`. Labelled buttons are at least `size/64` wide; icon-only buttons are circles (width = height), 36 px min (40 on touch), 48 max. Phones (<768px) use `.only-wide`/`.only-narrow` (foundation.css), e.g. the workspace header and editor top bar go icon-only; the editor on phones follows Word/Google Docs mobile: formatting bar pinned to the **bottom** (quick Format tools + ⌃; ⌃ opens a sheet with a tab picker "Format ▾", undo/redo and that tab's tools; pickers/menus open upward via `placement`), Insert is a 48 px **FAB** (menu 75vw), the document is edge to edge with 16 px margins. Below 1024 px the settings panel is a right-hand **drawer** with a scrim (closed by default; block selection doesn't auto-open it). The case-study list is a **project card grid** on every screen (like a design-tool dashboard): 16:10 thumbnail (or the title's initial on a brand-light tile), title, "Edited 3 hours ago", ⋯ menu (Edit/Restore, Preview, Delete); 3 columns ≥1024px, 2 ≥640px, 1 below; 9 cards per page (3×3) with Show more; the title link stretches over the card (one link per card). Styles: `.project-*` in surfaces.css. Rules at the end of liquid-glass.css.
  - All delete/remove/archive actions use `variant="destructive"` (AlertDialog defaults to it); table "Delete …" menu items too.
  - Image fields (thumbnail/cover): the Choose/Replace/Remove actions sit inside the frame.
- **Removed:** the old portfolio "liquid glass" layer on all buttons (290 lines of raw rgb()).

## 6. Database (Supabase staging)

Now contains only: `public.studio_workspaces` (owner_id unique; trigger on `django.accounts_user`
creates it), `public.studio_case_studies` (draft|archived, slug unique per workspace, composite FK
(workspace_id, owner_id), immutable owner/workspace triggers, 2 MB content check),
`0010_studio_projects.sql` adds project_type, role, team, timeline, platform, objective, challenge,
framework_id + framework_version, setup_state (jsonb, unfinished wizard). `0011_studio_sections.sql`:
`studio_content_backups` (document before a schema migration) and `studio_section_notes` (private, unique per
case study + section id); owner must match the case study (trigger); deny-all like the rest. `public.studio_assets` (path pattern check, FK to own case study, `on delete set null (case_study_id)`),
bucket `studio-private-media` (private, 50 MB, no SVG, **no storage policies**), schema `django`.
RLS on + zero policies + no anon/authenticated grants on studio tables. `public.touch_updated_at()`
(from 0001) kept for triggers. Migration order in `supabase/README.md` (Django migrate between 0004 and 0005).
`0009_remove_portfolio.sql` dropped the legacy tables, `is_cms_owner()` and public-bucket policies
(guard refuses if data remains); the empty `case-study-media` bucket was deleted via the Storage API.

## 7. Tests

`scripts/security-suite.sh [django-console-log]`: static "no owner/portfolio code" grep, typecheck, lint,
Express build, Django check + 26 tests; with the log: schema 33, auth-live 23, storage-live 30,
documents-live 55, setup-live 35, sections-live 30, review-live 16, lifecycle-live 27, review engine 8 (offline, tsx) (all passing 2026-11-11). Map of SEC-001..018 in
`supabase/tests/README.md`. Live tests create/delete `@example.test` accounts (staging only).

## 8. Removed on 2026-11-10 (don't reintroduce)

/write CMS and login, /work actions, public case-study pages/queries/renderer (CaseStudyPage, downloads,
PDF request), side work, publishing/snapshots, portfolio content (home/work/site), illustrations scenes,
BigStatement/SequenceRail, the Portfolio/Studio editor adapters (`backend.ts`, PortfolioEditor,
StudioEditor), the public `mediaUrl`/`resolveMediaUrl`, Express `/api/public/*` + `/api/studio/*` +
`requireOwner` + mailer, Django `purpose: portfolio`, owner role, `ADMIN_EMAIL`, `is_owner`; shared legacy
CaseStudy/PublishedSnapshot/downloads/validateBlocks/publicMediaUrl/SideWork types; deps nodemailer,
express-rate-limit, @vercel/analytics, @vercel/speed-insights, lottie-web; env NEXT_PUBLIC_*.
Backup before removal: `/private/tmp/claude-501/-Users-visit--claude-spares-spare-Mh96x0/b2692ae9-7ac8-4116-a1e9-bf2cc04c3b6f/scratchpad/write-studio-before-portfolio-removal.tgz`
(temporary location; no git repo — recommend `git init`).

## 9. Gotchas

- Release blockers (docs/RELEASE.md): rotate the Supabase secret key + DB password that were pasted in
  chat; real SMTP; CAPTCHA on sign-up/code requests; deploy Django/Express in ap-southeast-2 (calls from
  elsewhere take 1–5 s); clear any old portfolio data in prod before 0009.
- PL/pgSQL `and` doesn't short-circuit name resolution: nest IFs or use dynamic SQL (bit 0005 and 0009).
- Tiptap `setEditable()` emits update → guard autosave on `isEditable`.
- Next 16 dev rewrites page Cache-Control to `no-store`; `next start` keeps `private, no-store`.
  RSC requests need a valid `_rsc` hash (307 otherwise).
- Raw SQL inserts into `django.accounts_user` must set `session_version` (no DB default).
- Python 3.9: `from __future__ import annotations` for `X | None`; Django 4.2 LTS.
- zsh doesn't word-split `$var` into arguments; pass file lists explicitly.
- `globals.css` (~4.3k lines) still holds styles for removed portfolio components (dead CSS, harmless; raw values there predate DNA).
- ProseMirror attrs are null-prototype objects: anything sent to a server action must be plain JSON (`plainDocument()` in Editor.tsx). Live tests bypass server actions, so add a browser e2e test (Stage 3).
- Section titles AND hints are **placeholders, never content**: `caseStudyTemplate()` / `caseStudySectionNodes()` emit an empty heading tagged `attrs.section` (key, via the `SectionKey` global attribute in caseStudy/schema.ts) + an empty paragraph. The editor's Placeholder shows `sectionOf(heading).title` in heading style and `.hint` in body style (placeholder grey only); typed text takes those styles. `clearUntouchedHints()` turns completely untouched old sections (title + hint text) into placeholders in the editor and preview. Empty blocks are hidden in the preview.
- Editor scrolling (≥768px): the window doesn't scroll; only `.write-scroll` (the document, below the toolbar) and the settings panel scroll. Phones use window scrolling.
- **Microcopy follows W3C WAI "Writing for Web Accessibility"** (2026-11-11): unique page titles, most specific first (`Edit: <name>`, `Preview: <name>`, `Archived case studies`); icon-only buttons name their target (`Edit <case study>`); errors say what's wrong AND how to fix it (`Enter an email address in the format name@example.com.`); instructions go in field descriptions, not placeholders; no "e.g.", no jargon; alt-text prompts ask what the image shows. Voice: plain, direct, UK spelling, product name "Case Study Studio". Don't repeat privacy reassurances (the user already knows they're signed in).
- **Toolbar 2.0 (Release 1, implemented; spec `docs/toolbar-2.0-spec.md`):** `Toolbar.tsx` is one row on desktop (Undo/Redo · Find · Text style · B/I/U, Link, Colour · Alignment, Lists · More ⋯ · Insert); below ~720px of column width Alignment/Lists fold into More; phones keep the bottom bar + ⌃ sheet (groups Text style / Format / Paragraph) + Insert FAB. Text styles = headings h1–h4 + paragraph `textRole` (display/lead/small/caption/label → `.cs-text-*` in typography.css). Find/replace: `search.ts` (ProseMirror decorations, never stored; replace all = one undo) + `FindReplace.tsx`, ⌘/Ctrl+F. Selection bubble: B/I/U/Link/Highlight/More, hidden in tables and while find is open. `TableBar.tsx`: anchored above the table. Link editor: address + text + new-tab switch; `safeHref()` allows only https/http/mailto/tel, `/`, `#`. Image node attrs: decorative, size, align, ratio, focus (Image inspector 2.0). Insert registry (`insertCommands.tsx`): six groups Text/Media/Visual/Data/Structure/Advanced + template sections via `insertMenuItems()`; `/` menu shows the same headings (name matches rank first).
- **Insert 2.0 blocks (Release 2):** `timeline` (phases; across/down; line/cards), `screenSequence` (numbered screens with phone/browser/no frame, 2–4 columns, arrows), `annotatedImage` (click the screenshot in the editor to add a numbered marker; notes list is the accessible content; markers decorative), `flowDiagram` (start/step/decision/end shapes, labelled arrows). Configs/defaults in `packages/shared/src/caseStudies/blocks.ts`, nodes via `visualAtom` in schema.ts, renderers in `visualBlocks.tsx` (editor + preview), views in nodeViews.tsx, inspectors in BlockInspector.tsx, CSS `.vb-timeline/.vb-sequence/.vb-annotated/.vb-flow` in globals.css (list selectors are `.vb .vb-…-list` to beat `.cs-prose ol`). Horizontal layouts stack on phones; empty sequence steps are omitted in the preview. Media paths are covered by the generic `documentMediaPaths` walk.
- **Inspector 2.0 (Release 3):** `findSelectedBlock` treats the table around the cursor as a block → `TableInspector` (borders grid/rows/minimal, striped, density, header row/column, cell alignment, rows/columns, phones scroll/fit; table attrs `tableStyle/striped/density/mobile` → `data-tablestyle…` via `TableAttributes`). Device mockups: drag on the canvas in the editor (`onMoveDevice`, window pointer listeners, keeps the grab offset, one update on drop; a drag suppresses the picker click), Duplicate device, `locked`. Images: `credit` (shown after the caption in the preview) and `radius`; the preview's image mapping now honours size/align/ratio/focus/decorative/radius. Comparison `display: 'slider'` (range-input divider, needs both pictures). Image grid `mobileColumns`.
- Write Studio 2.0 blueprint: `docs/write-studio-2.0-blueprint.md`; Stage 0 audit done: `docs/stage-0-ux-audit.md`; Stage 1 done (`docs/stage-1-report.md`); Stage 2 done (`docs/stage-2-report.md`); Stage 3 done (`docs/stage-3-report.md`); Stage 4 done (`docs/stage-4-report.md`); Stage 5 done (`docs/stage-5-report.md`); next is Stage 6 (closed beta).
- **Stage 1, guided project creation (done 2026-11-11; report `docs/stage-1-report.md`):** frameworks are versioned,
  immutable data in `packages/shared/src/frameworks` (Product and UX design v1 = the 10 sections with purpose,
  act, prompts, evidence, visuals; Blank v1); never edit a released version, add one. `caseStudySections` now comes
  from it and `sectionOf()` resolves keys across all versions. `caseStudies/setup.ts`: `StudioSetup`, `cleanSetup()`
  (server validation), `outlineDocument()` (unchanged framework section = empty tagged heading; renamed = text + key;
  own section = text, no key). Wizard `components/studio/creation/ProjectSetup.tsx`: 6 steps (start/type/details/
  framework/cover/outline), only the title is required, Back to any visited step, Save and finish later, Skip the
  rest and start writing, Copy a case study. Nothing is created on GET. Cover comes from the library
  (`MediaProvider caseStudyId={null}`) and is also the thumbnail. Dashboard: type + "Setup not finished" on cards,
  empty state "Start your first case study", `AddNameForm` when the account has no name. The editor and preview
  redirect to `/setup` while `setup_state` is set. Express runs `tsx` without watch here: restart it after
  shared/Express changes.
- **Stage 2, story structure & guidance (done 2026-11-11; `docs/stage-2-report.md`):** sections are **heading-based**
  (user decision, not the blueprint's wrapper node): a section = a TOP-LEVEL level-2 heading ("Heading 1" in the
  picker) and what follows until the next one. The heading carries `section` (framework key), `sectionId`
  (`s` + 6–24 [a-z0-9], unique per doc) and `sectionStatus` (null|review|complete; "not started"/"in progress" are
  derived, never stored); both new attrs are `rendered: false`. Shared `caseStudies/sections.ts`:
  `CONTENT_SCHEMA_VERSION = 2`, `normaliseSections`, `migrateContent` (1→2 = clearUntouchedHints + ids),
  `documentSections`. Express `currentCaseStudy()` migrates old docs ON READ (GET, duplicate) after copying the
  original to `studio_content_backups`; every save is normalised and stored as v2. The editor and preview no longer
  call `clearUntouchedHints`. Editor: `sections.ts` (outlineOf, move/duplicate/delete/rename/status/add,
  `SectionIds` plugin keeps ids unique, `LatestDoc` gives the Placeholder callback the doc being applied, since
  `editor.state` is still the old one then), `StoryOutline.tsx` (left; docked ≥1280px, drawer below; only the grip
  is draggable, because a draggable row swallows its menu button's clicks), `SectionGuide.tsx` (side panel "Guide"
  tab, the default: purpose, questions, evidence, "Add <visual>" at the end of the section, status, private note
  autosaved via `saveSectionNote`, previous/next). Preview wraps each section in `<section class="cs-section">`
  (`display: contents`). In dev, browser-pane screenshots can lag behind menus opening; check `aria-expanded`.
- **Stage 3, hybrid editor (done 2026-11-11; `docs/stage-3-report.md`):** title + subtitle are plain text fields on the
  sheet (`TitleFields.tsx`; Enter/↓ flows title → subtitle → story, ↑ back); the side panel's Headline fields are
  gone (Summary group instead); tab title follows the title. Side panel tabs: Guide · Block · Media · Details
  (`MediaPanel.tsx`: insert at cursor, drag onto the page via `ASSET_DRAG_TYPE` handled in `handleDrop`, upload).
  Text bubble: two BubbleMenus (`studioTextBubble` above, `studioTextBubbleBelow` below when the selection is inside a
  custom node, see `isInsideBlock`). BubbleMenu only listens to WINDOW scroll and its React wrapper drops the first
  options update (so `scrollTarget` set after mount never applies): the editor listens to `.write-scroll` and
  dispatches `tr.setMeta(<pluginKey>, 'updatePosition')`. A11y: skip links, landmarks via `role` on the stacks,
  sr-only `<h1>`, `SectionLabels` (aria-label on empty section headings), named block-bar buttons, drawers take
  focus and close on Escape, the save status isn't a live region. `.sr-only` lives in foundation.css.
- **Stage 4, visual composition (done 2026-11-11; `docs/stage-4-report.md`):** `components/editor/presets.ts` holds
  `BLOCK_PRESETS` (layout values only, never content; schematic = rects on 64×40 with kinds m/t/a/p/d; device presets
  rebuild `devices` via `devicePreset(id, keep)` so pictures stay) and `isPresetActive`/`applyPreset`;
  `PresetGallery.tsx` renders them at the top of BlockInspector (callout presets set node attrs tone/icon).
  New optional config fields: `width?: BlockWidth` ('content'|'wide') on image grid, split, comparison;
  `surface?` on image grid, split, metrics; metrics `size?`/`align?`; quote `align?`. Renderers emit
  `data-block-width="wide"` / `data-block-surface` only for non-defaults (`layoutAttrs()` in visualBlocks.tsx).
  The preview column is `--content-max` (720px), so wide uses `--block-wide-max` (64rem); in the editor
  `.write-document` is an inline-size container and wide blocks use `100cqi`. Don't replace the whole doc with
  `setContent` while React node views are mounted (React "removeChild" crash); edit with transactions.
- **Stage 5, review & output (done 2026-11-11; `docs/stage-5-report.md`):** `reviewCaseStudy()` in shared
  `caseStudies/review.ts` (checklist, warnings with `sectionId`/`nodeIndex`/`inDetails`, progress; tested by
  `packages/shared/test/review.test.ts` via tsx). `ReviewDialog.tsx` (top bar "Review"; Go to section / block /
  details). Migration `0012`: stored GENERATED columns `sections_total`/`sections_complete` (jsonpath over the doc);
  never write them. `StudioPreview.tsx` restyled (`.preview-*` in surfaces.css; facts, contents, anchors
  `#section-<sectionId>` set by the heading mapping); `CaseStudyArticle` fills an empty framework heading with its
  title when the section has content and drops empty sections. `ExportMenu.tsx`: PDF = `window.print()` + `@media
  print`/`@page` rules; HTML = client-side standalone file (styles from `document.styleSheets` with relative
  `url()`s resolved against each sheet's href, fonts/images fetched as data URLs, ≤20 MB each).
- **Editor interaction spec (2026-11-11):** `docs/editor-interaction-spec.md` is the single source of truth for the
  editor's six tool surfaces (header, formatting toolbar, selection toolbar, block toolbar/handle, inspector, Smart
  Insert), the block registry (T5), composition tools (T6) and roadmap T1–T7; `toolbar-2.0-spec.md` is history.
  T1 done 2026-11-11 (Undo/Redo + Export in the header; Underline and Find in More; roving focus via
  `rovingFocus.ts` / `RovingToolbar.tsx`, which skips anything inside a popover/menu/dialog and re-applies on resize
  because floating bars mount hidden; header goes icon-only 768–1023px). T2 done 2026-11-12: `BlockHandle.tsx` (universal handle; no new dependency:
  `startBlockDrag` sets `view.dragging = {slice, move, node}` so ProseMirror completes the drop; wide = `+` + grip that
  drags and opens the menu, compact chip on narrow/touch; ⌘/ menu, ⌥⇧↑/↓ move, ⌘D duplicate), `blocks/registry.ts`
  (T5 start: block names, families, conversions, insert ids), `insertUsage.ts` (localStorage ids only),
  `smartSections()` in insertCommands (Recommended for the cursor's section from framework `suggestedVisuals`,
  Recently / Frequently used), categories Text/Media/Visual/Data/Structure/Embeds. Visual blocks' own bars removed.
  Phone header shows "Saved" without the time so it fits 375px. Next: T3, continuing T5. Decisions D1–D6 taken as proposed (spec §15): Undo/Redo in the
  header, an Embeds category, Table under Text, recents per browser, the universal handle replaces block bars,
  Research insights + Chart first.
