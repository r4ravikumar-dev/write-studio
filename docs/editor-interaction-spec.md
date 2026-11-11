# Write Studio: Editor Toolbar & Interaction Specification

> **The single source of truth for the editor's tools and interactions**, from 2026-11-11. It
> supersedes `docs/toolbar-2.0-spec.md` (kept as the record of Releases 1–3) and is written against
> the code as it is now, so a coding agent can implement any part of it without re-auditing.
>
> **Status tags:** ✅ exists (file named) · ◐ partly exists (what's missing is named) · ✚ new.
> **Priority tags:** the roadmap phase (T1–T7, §12).

---

## 1. Principles

1. **Borrow interaction patterns, not interfaces.** Ten products are our reference library (§2). We take the strongest pattern from each and combine them into an editor built for case studies. Write Studio should never look like any one of them.
2. **The document stays a document.** Writing is primary. Visual freedom lives *inside* blocks (a device composition, a split layout), never as a freeform page canvas.
3. **Six tool surfaces, one job each** (§3). An action has one home surface; it may be mirrored on another only where the table in §3 says so.
4. **Show tools when they're relevant.** Formatting appears on selection, block tools on hover or selection, properties for the selected thing. Nothing permanently visible that most writers don't need.
5. **One registry for every block** (§10). Insert menu, `/` menu, block toolbar, inspector, presets, preview, export and review all read the same definition.
6. **Never break documents.** New attributes are optional with defaults; older documents render unchanged. A content schema change needs a versioned, tested migration with a backup (as `0011` did for v2).
7. **Privacy is unchanged.** Every new store is owner-only (Express scoping + deny-all RLS). Usage data for smart insertion never includes content (§8.3).
8. **Plain, accessible words.** Labels and messages follow the W3C writing tips in `CLAUDE.md` §9 (UK spelling; icon buttons name their target).

---

## 2. Reference library

### 2.1 What we borrow

| Product | Pattern we borrow | Where it lands in Write Studio | Phase |
|---|---|---|---|
| **Medium** | Formatting appears only on selection; minimal permanent chrome | Floating selection toolbar (§6); compact main toolbar (§5) | T1 |
| **Ghost** | Content *cards* from one insertion menu (image, gallery, embed, code) | Smart Insert cards and the `+` on the block handle (§8, §7) | T4 |
| **Notion** | Slash menu, block handle (⋮⋮ + `+`), Turn into, recents | Block toolbar (§7), Smart Insert (§8) | T2 |
| **WordPress (Gutenberg)** | Block toolbar separate from the settings sidebar | Block toolbar (§7) vs contextual inspector (§9) | T2–T3 |
| **Framer** | Clearly labelled properties with sensible defaults, shown only when relevant; breakpoint-aware layout | Inspector property schema and responsive overrides (§9) | T3 |
| **Webflow** | Component instances configured in context | Block presets + inspector per block (§9) | T3 |
| **Google Slides** | Align, distribute, arrange, group, rotate, snap guides for selected objects | Composition tools inside a device composition only (§11) | T6 |
| **UXfolio** | Case-study-aware guidance and example content | Recommendations per narrative section in Smart Insert (§8.4); the existing Guide tab | T2, T4 |
| **Sanity** | Schema-driven custom blocks and annotations | Block registry with stable schemas (§10) | T5 |
| **Tiptap** | Extension and menu architecture | Implementation base for every surface (unchanged engine) | all |

### 2.2 What we don't copy

| Avoid | Why |
|---|---|
| Medium's very limited editing | Case studies need visual composition |
| Notion's unrestricted block universe | Our blocks are chosen for storytelling, and some are recommended per section |
| A full Framer or Webflow website canvas | Would break document flow and responsiveness |
| The full Gutenberg ecosystem | Too much complexity for the core use |
| A Google Slides page canvas | Content must stay a document |
| Generic CMS metadata everywhere | Not useful to most writers |
| Many permanently visible formatting options | Distracts from writing |
| AI actions on every surface | Noisy and unpredictable; the blueprint allows AI only after guidance works on its own |

---

## 3. The six surfaces

| # | Surface | Shows | Inspired by | Today |
|---|---|---|---|---|
| 01 | **Editor header** | Always (top bar) | Medium, Framer, Google Docs | ✅ `Editor.tsx` top bar (`.studio-bar`) |
| 02 | **Main formatting toolbar** | Always, under the header (bottom bar on phones) | Medium, document editors | ✅ `Toolbar.tsx` |
| 03 | **Floating selection toolbar** | When text is selected | Medium, Notion | ✅ two `BubbleMenu`s in `Editor.tsx` |
| 04 | **Block toolbar** | On hover or selection of a block | Notion, Gutenberg | ◐ `nodeViews.tsx` `BlockFrame` bar, visual blocks only |
| 05 | **Contextual inspector** | Side panel, Block tab, for the selected block | Framer, Webflow, Slides | ✅ `BlockInspector.tsx` + `PresetGallery.tsx` |
| 06 | **Smart Insert / `/` menu** | Insert button, `/`, the block handle's `+` | Notion, Ghost, Gutenberg, UXfolio | ◐ `insertCommands.tsx`, `SlashMenu.tsx` (no recents or recommendations) |

Supporting surfaces that stay as they are: story outline (`StoryOutline.tsx`), Guide / Media / Details tabs (`SectionGuide.tsx`, `MediaPanel.tsx`, `SettingsPanel.tsx`), table bar (`TableBar.tsx`), find and replace (`FindReplace.tsx`), Review dialog (`ReviewDialog.tsx`).

### 3.1 Which surface owns which action

| Action | Home | Also on |
|---|---|---|
| Undo / redo | 01 Header (✚ moves from 02) | Phone ⌃ sheet; ⌘Z / ⇧⌘Z |
| Bold, italic, link | 02 Toolbar | 03 Selection toolbar |
| Underline, highlight | 03 Selection toolbar | 02 → Colour / More |
| Text style (heading, lead, body…) | 02 Toolbar | 04 Block toolbar → Turn into |
| Insert a block | 06 Smart Insert | 02 Insert button, 04 `+`, `/` |
| Move, duplicate, delete a block | 04 Block toolbar | 05 Inspector header (duplicate, delete); keyboard |
| Block properties | 05 Inspector | 04 → Properties opens it |
| Table rows, columns, cells | Table bar | 05 Table inspector (look, headers, phones) |
| Device align, distribute, arrange | 05 Inspector → Arrange (✚ T6) | On-canvas selection keyboard shortcuts |
| Preview, export, review, history | 01 Header | Preview page Export menu |

### 3.2 Visibility rules (what wins when several could show)

1. **Find open** → selection toolbars hide (✅ today).
2. **Cursor in a table** → table bar shows; selection toolbar hides (✅).
3. **Text selected inside a visual block** → selection toolbar opens *below* the selection so the block's own bar stays visible (✅ Stage 3).
4. **Block selected (NodeSelection)** → block toolbar and inspector; no selection toolbar (✅).
5. **Device selected inside a composition** → Arrange tools in the inspector; the block toolbar stays for the composition as a whole (✚ T6).
6. **Archived** → only header actions that don't edit (Preview, Export, Restore); everything else hidden or disabled with a reason (✅ for today's controls; every new control must follow).

---

## 4. Surface 01: Editor header

Order, left to right. Height 56 px, edge-to-edge Liquid Glass bar (`CLAUDE.md` §5b).

| Control | Icon (lucide) | Shortcut | State rule | Status |
|---|---|---|---|---|
| Your case studies (back) | `ArrowLeft` | | Always | ✅ |
| Show / hide outline | `ListTree` | | Pressed when open | ✅ |
| Status label ("Private draft" / "Archived") | | | | ✅ |
| Save status ("Saved · 5:24 pm", "Saving…", "Not saved") | | ⌘S saves now | Not a live region; failures show as an alert | ✅ |
| **Undo** | `Undo2` | ⌘Z | Disabled "Nothing to undo" | ✅ T1 (2026-11-11) |
| **Redo** | `Redo2` | ⇧⌘Z | Disabled "Nothing to redo" | ✅ T1 |
| **History** | `History` | | Opens the version list (T7) | ✚ T7 (needs a revisions table) |
| Review | `ClipboardCheck` | | Opens the Review dialog | ✅ Stage 5 |
| Preview | `Eye` | | Saves first, then opens | ✅ |
| **Export** | `Download` | | Menu: Save as PDF, Download HTML. From the editor it saves, opens the preview in a new tab with `?export=pdf|html`, and the export runs there once fonts and images have loaded | ✅ T1 |
| Archive / Restore | `Archive` / `ArchiveRestore` | | Destructive variant for Archive | ✅ |
| Show / hide side panel | `PanelRight` | | Pressed when open | ✅ |

**Responsive.** From 768 to 1023 px, Review, Preview, Export and Archive are icon-only (tooltip = label) so the bar fits; the status and save time never wrap (✅ T1). Below 768 px the phone header keeps Review, Preview and Archive as icons; Undo, Redo and Export aren't in it (undo/redo are in the ⌃ sheet, export is on the preview page).

---

## 5. Surface 02: Main formatting toolbar

One row under the header. Order and grouping (Liquid Glass groups separated by dividers):

| Group | Control | Icon | Shortcut | Status |
|---|---|---|---|---|
| Find | Find and replace | `Search` | ⌘F | ✅ in More → Editing since T1 (and in the phone quick bar) |
| Text style | Picker: Display, Title, Heading 1–3, Lead, Body, Small, Caption, Label, Quote, Code | — (select) | | ✅ min width 8.5rem |
| Inline | Bold | `Bold` | ⌘B | ✅ |
| | Italic | `Italic` | ⌘I | ✅ |
| | Link | `Link2` | ⌘K | ✅ |
| | Colour and highlight (one popover) | `Baseline` / `Highlighter` | | ✅ |
| Paragraph | Alignment menu (left, centre, right; justify) | `AlignLeft`… | ⇧⌘L / E / R / J | ✅ |
| | Lists menu (bulleted, numbered, checklist; indent/outdent only in a list) | `List` | ⇧⌘8 / 7 / 9, Tab / ⇧Tab | ✅ |
| More ⋯ | Typography (font, size, weight, line height, letter spacing, case); Decoration (strikethrough, sub/superscript, inline code; ✚ T1: underline joins here); Editing (format painter, clear formatting, remove link) | `MoreHorizontal` | ⇧⌘S, ⌘, ⌘. ⌘E ⌘\ | ✅ |
| End | **Insert** (primary) | `Plus` | `/` in text | ✅ opens Smart Insert (§8) |

**T1 (✅ 2026-11-11):** Undo/Redo moved to the header (§4); Underline left the row (selection toolbar and More → Decoration); Find moved into More → Editing. The row is now "Text style · Bold · Italic · Link · Colour/Highlight · Alignment · Lists · More · Insert".

**Behaviour.** Clicking a control keeps the text selection (✅). Disabled controls explain why in the tooltip (✅). Below 720 px of column width, Alignment and Lists fold into More (✅ `useIsCompact`).

**Phone (< 768 px).** Bottom bar with quick tools + ⌃; the ⌃ sheet has a group picker (Text style, Format, Paragraph), undo/redo and that group's tools; menus open upward; Insert is a 48 px FAB (✅, user decision; keep).

**Accessibility (✅ T1).** Roving focus on every toolbar (`rovingFocus.ts`, `RovingToolbar.tsx`): one tab stop, ←/→ between controls (wrapping), Home/End to the ends; the control used last is the one Tab returns to. Popovers, menus and dialogs opened from a toolbar keep their own keyboard behaviour. Applies to the formatting toolbar (desktop and phone), the selection toolbars and the table bar.

---

## 6. Surface 03: Floating selection toolbar

Shows for a non-empty text selection outside tables while find is closed (✅).

| Control | Icon | Shortcut | Status |
|---|---|---|---|
| Bold | `Bold` | ⌘B | ✅ |
| Italic | `Italic` | ⌘I | ✅ |
| Underline | `Underline` | ⌘U | ✅ |
| Link | `Link2` | ⌘K | ✅ |
| Highlight | `Highlighter` | | ✅ |
| More: Strikethrough, Inline code, Clear formatting | `MoreHorizontal` | ⇧⌘S, ⌘E, ⌘\ | ✅ |
| More → **Turn into** (heading, quote, callout, list) | `Repeat2` | | ✅ T2 (same conversions as §7.3) |

**Placement.** Above the selection; below it inside visual blocks (✅); flips and shifts to stay on screen; follows the story column's scroll (✅ Stage 3 fix: `tr.setMeta(<key>, 'updatePosition')`).

---

## 7. Surface 04: Block toolbar (universal block handle)

### 7.1 Today and the change

Today only visual blocks (node views) have a bar: grip, block label, Properties, Move up, Move down, Duplicate, Delete (`nodeViews.tsx` `BlockFrame`). Paragraphs, headings, lists, quotes, tables and images have none, so they can't be dragged, duplicated or converted.

**T2 (✅ 2026-11-12) replaced it with one universal handle** for every top-level block (`BlockHandle.tsx`), without a new dependency: it sets ProseMirror's own `view.dragging` from the grip (`startBlockDrag` in `blockOps.ts`), so the drop, drop cursor and undo are ProseMirror's. The in-block bars are gone (D5).

**As built:**
- **Wide** (≥ 42 px left of the text, measured inside the scrolling column, so it may reach into the desk): `+` (a compact 24 px button) and the grip ⋮⋮, which **drags, and opens the block menu on click**. The ⋯ menu button is kept but visually hidden, for keyboard and screen-reader users (⌘/ opens it).
- **Compact** (narrower, or touch): one ⋯ chip at the right of the block with the cursor; no drag (Move up / down in the menu).
- A draggable *button* swallows its own clicks (found in Stage 2's outline), so the grip is a plain element.
- Labels name the block by its words where it has any: "Actions for “Overview”".

### 7.2 Controls

| Control | Icon | Shortcut | Behaviour | Status |
|---|---|---|---|---|
| **Drag** (⋮⋮) | `GripVertical` | | Drag to reorder; drop indicator line; the whole block moves with its content. A click opens the block menu | ✅ T2 |
| **Add** (`+`) | `Plus` | | Adds a "/" line after the block (⌥-click: before), which opens Smart Insert there | ✅ T2 |
| Menu (click the ⋮⋮) | | ⌘/ with the cursor in a block | Opens the block menu below | ✅ T2 |

**Block menu** (dropdown from the handle):

| Item | Icon | Shortcut | Notes | Status |
|---|---|---|---|---|
| Turn into | `Repeat2` | | Only compatible types (§7.3), as a section of the menu | ✅ T2 |
| Insert before / Insert after | `ArrowUpToLine` / `ArrowDownToLine` | | Opens Smart Insert at that position | ✅ T2 |
| Duplicate | `Copy` | ⌘D | New section ids are assigned by `SectionIds` (✅ plugin) | ✅ T2 |
| Copy / Cut | `ClipboardCopy` / `Scissors` | ⌘C / ⌘X | Selects the block and runs the browser's copy/cut, which ProseMirror serialises | ✅ T2 (not exercised in the test browser) |
| Move up / Move down | `ArrowUp` / `ArrowDown` | ⌥⇧↑ / ⌥⇧↓ | Also from the keyboard; a text cursor keeps its place | ✅ T2 |
| Properties | `SlidersHorizontal` | | Selects the block and opens the inspector (configurable blocks only) | ✅ T2 |
| Delete | `Trash2` (destructive) | ⌫ on a selected block | Undoable; no confirmation for one block | ✅ T2 |

Every item's accessible name includes the block: "Move image grid up", "Delete callout" (✅ for today's bar since Stage 3; keep).

### 7.3 Turn into (compatible conversions only)

| From | Can become | Content kept |
|---|---|---|
| Paragraph (any text role) | Heading 1–3, Quote, Callout, Bulleted / Numbered / Checklist, Code block | Text and inline marks (code block keeps text only) |
| Heading | Paragraph, other heading levels | Text; a section heading (level 2) turning into anything else stops being a section, and the outline updates (✅ `SectionIds` strips metadata) |
| Quote ↔ Pull quote ↔ Callout | Each other | Inner paragraphs; pull quote keeps attribution only when converting back |
| Bulleted ↔ Numbered ↔ Checklist | Each other | Items |
| Image | Showcase, Image grid (with that image) | Media, alt text, caption |
| Image grid (1 item) | Image, Showcase | First item |
| Comparison | — (use Display: Side by side / Slider) | |
| Visual blocks otherwise | Not convertible (show the item disabled with "Can't turn a {block} into another block") | |

### 7.4 Responsive and touch

On touch screens (`pointer: coarse`) the handle shows for the block with the cursor, not on hover, at 40 px; drag uses long-press (300 ms). Phones keep Move up/down in the menu as the main way to reorder.

---

## 8. Surface 06: Smart Insert and the `/` menu

One registry feeds the Insert button, the `/` menu and the block handle's `+` (✅ `insertCommands.tsx` + `insertMenuItems()`).

### 8.1 Categories

| Category | Items | Status |
|---|---|---|
| **Text** | Paragraph, Heading, Lead paragraph, Quote, Pull quote, Callout, Bulleted list, Numbered list, Checklist, Code block, Table, Divider, Collapsible section | ✅ T2 |
| **Media** | Image, Video file, File | ✅ |
| **Visual** | Image grid, Comparison, Showcase, Device mockups, Split layout, Screen sequence, Annotated screenshot | ✅ |
| **Data** | Metrics, **Chart** (bar, line, donut, progress), **Results highlights** (metrics preset) | ◐ Metrics ✅; Chart ✚ T4; Results highlights ✚ T4 (preset, §8.5) |
| **Structure** | New section, framework sections, Process timeline, Flow diagram, Space | ✅ |
| **Embeds** | Video link (YouTube, Vimeo, Loom), Figma | ✅ T2 |

"Advanced" is retired: its items move to Text and Structure as above. Search still finds every item by name, keyword and category (✅ name matches rank above keyword matches).

### 8.2 Top sections (shown when the menu opens with no search)

1. **Recommended for "{section}"**: up to 4 items for the section the cursor is in (§8.4). Hidden outside a framework section.
2. **Recently used**: the last 5 distinct items inserted.
3. **Frequently used**: the 5 most inserted in the last 30 days, excluding those already shown above.

Then the categories. Each top-section item is marked with its category in the description (e.g. "Visual · Before and after"). The sections disappear as soon as the user types.

### 8.3 Usage data (recents, frequency)

- Stored **per browser** in `localStorage` key `studio.insert.usage`: `{[itemId]: {count: number, last: ISO date}}`. Item ids only: no content, file names, case study ids or URLs.
- Reading or writing it is wrapped in try/catch; when unavailable, the top sections are simply missing.
- Syncing across devices is not needed for T2. If it's ever wanted, it's an owner-only table, never analytics.

### 8.4 Recommendations per narrative section

Driven by data, not code: each framework section's `suggestedVisuals` (✅ already in `packages/shared/src/frameworks`) becomes the recommendation list, extended to insert-item ids. For Product and UX design v1:

| Section (key) | Recommended (in order) |
|---|---|
| Opening (`opening`) | Showcase, Device mockups |
| Overview (`overview`) | Showcase, Metrics |
| The context (`context`) | Showcase, Callout |
| The challenge (`challenge`) | Problem callout (§8.5), Comparison, Annotated screenshot, Metrics |
| My contribution (`contribution`) | Callout, Process timeline |
| Exploration (`exploration`) | Image grid, Comparison, Flow diagram, Process timeline |
| Key decisions (`decisions`) | Comparison, Annotated screenshot, Split layout |
| The experience (`experience`) | Device mockups, Screen sequence, Flow diagram, Showcase |
| Outcome (`outcome`) | Results highlights, Metrics, Chart, Pull quote |
| Reflection (`reflection`) | Key takeaway (§8.5), Pull quote |
| Research (future UX research framework) | Research insights, Pull quote, Chart |

**As built (T2):** recommendations come straight from each framework section's `suggestedVisuals` in Product and UX design v1 (e.g. Overview recommends Metrics only; The experience: Screen sequence, Device mockups, Showcase). The extra items in this table (Showcase for Overview, Results highlights, Key takeaway…) arrive with the T4 cards and a v2 of the framework.

Recommendations are suggestions: everything stays available everywhere. Changing these lists needs a **new framework version** (frameworks are immutable, `CLAUDE.md` §9).

### 8.5 Content cards (T4)

Named starting points, so writers think in story terms. Most are **presets of existing blocks** (no new schema):

| Card | Built on | Status |
|---|---|---|
| Problem callout | Callout, "Caution" preset, with the hint "The problem in one sentence" | ✚ T4 (preset) |
| Key takeaway | Callout, "Insight" preset | ✚ T4 (preset) |
| Results highlights | Metrics, "Big numbers" preset | ✚ T4 (preset) |
| Research insights | **New block**: 2–6 insight cards (finding, evidence, source), list semantics | ✚ T4 (new block, §10) |
| Chart | **New block**: bar, line, donut, progress; small editable table of values; follows the `dataviz` skill and DNA tokens; never invents numbers | ✚ T4 (new block) |

### 8.6 Keyboard

`/` opens it in an empty or new line (✅); typing filters; ↑/↓ move; Enter inserts; Esc closes. The Insert button and `+` open the same menu with focus in its search field.

---

## 9. Surface 05: Contextual inspector

### 9.1 Structure (every block)

Header: block name, Duplicate, Delete (✅). Then **Presets** (✅ Stage 4, 45 presets, layout only). Then property groups, **always in this order and only when the block has them**:

1. **Content**: media, alt text, captions, items (the things that make it this block).
2. **Layout**: arrangement, columns, order, proportion, ratio.
3. **Dimensions**: width (text width / wide / page frame), size, height where meaningful.
4. **Spacing**: gap, inner space, space around.
5. **Alignment**: text and media alignment, focal point.
6. **Appearance**: background, style, shadow, corners, tone.
7. **Responsive**: tablet and phone behaviour (§9.3).

Property rules (Framer standard): every control has a visible label, a sensible default, and appears only when relevant (e.g. Ratio hides for masonry grids, ✅). Changing a property never touches content.

### 9.2 Property map (current ✅ and new ✚)

| Block | Content | Layout | Dimensions | Spacing | Alignment | Appearance | Responsive |
|---|---|---|---|---|---|---|---|
| Image | Replace, decorative, alt, caption, credit ✅ | | Size ✅ | | Align, focus ✅ | Shape, corners ✅ | ✚ phone size |
| Image grid | Images, order ✅ | Columns, arrangement, ratio ✅ | Width ✅ | Gap ✅ | | Background ✅ | Columns on phones ✅ |
| Comparison | Both sides, labels ✅ | Kind, split, ratio ✅ | Width ✅ | | | Display (side by side / slider) ✅ | ✚ stack order on phones |
| Showcase | Media, caption ✅ | Ratio ✅ | Width ✅ | Space around ✅ | Keep in view ✅ | Background ✅ | |
| Device mockups | Devices + media ✅ | Preset, stage ratio ✅ | Per device size ✅ | Spacing ✅ | ✚ Arrange (§11) | Background, shadows ✅ | On phones ✅; ✚ tablet override |
| Split layout | Media ✅ (text in the block) | Order, proportion, ratio ✅ | Width ✅ | | Text alignment ✅ | Background ✅ | Picture first on phones ✅ (fixed) |
| Quote | Who, role ✅ | | | | Alignment ✅ | Style ✅ | |
| Metrics | Figures ✅ | Columns ✅ | Number size ✅ | | Alignment ✅ | Style, background ✅ | ✚ columns on phones |
| Callout | (text in the block) | | | | | Tone, icon ✅ | |
| Timeline | Phases ✅ | Layout ✅ | | | | Style ✅ | Stacks on phones ✅ (fixed) |
| Screen sequence | Screens ✅ | Columns, frame, ratio, arrows ✅ | | | | | Stacks on phones ✅ |
| Annotated screenshot | Image, notes ✅ | Notes beside / below, ratio ✅ | | | | | Notes below on phones ✅ |
| Flow diagram | Steps, kinds, labels ✅ | Direction ✅ | | | | | Top to bottom on phones ✅ |
| Table | (cells in the block) | Rows, columns ✅ | | Density ✅ | Cell alignment ✅ | Borders, striped ✅ | Scroll / fit on phones ✅ |

### 9.3 Responsive overrides (✚ T3)

Breakpoints match the preview: **desktop** ≥ 1024 px, **tablet** 768–1023 px, **phone** < 768 px.

- Data: an optional `responsive?: {tablet?: Partial<Config>; phone?: Partial<Config>}` inside a block's `config`, limited per block to a whitelist of layout keys (e.g. image grid: `columns`, `gap`; device mockups: `preset`, `mobile`, device `x/y/scale`). Existing fixed fields such as `mobileColumns` and `mobile` stay and keep working; new overrides map onto them where they overlap.
- UI: a **Desktop · Tablet · Phone** segmented switch at the top of the Responsive group. Editing a whitelisted property while Tablet or Phone is chosen stores an override; a dot marks overridden properties, with "Reset to desktop".
- Rendering: overrides become CSS custom properties or `data-*` attributes at the matching media query; no layout is computed in JavaScript.
- Preview: the existing desktop / tablet / phone preview widths show the result.

---

## 10. Unified block architecture (T5)

### 10.1 Where a block's pieces live today

Adding a block today touches up to nine places:

| Concern | File |
|---|---|
| Config type + defaults | `packages/shared/src/caseStudies/blocks.ts` |
| Tiptap node (schema) | `frontend/src/components/caseStudy/schema.ts` (`visualAtom`, content nodes) |
| Editor node view | `components/editor/nodeViews.tsx` |
| Renderer (editor + preview) | `components/caseStudy/visualBlocks.tsx` |
| Preview mapping | `components/caseStudy/CaseStudyArticle.tsx` `nodeMapping` |
| Insert command | `components/editor/insertCommands.tsx` |
| Inspector | `components/editor/BlockInspector.tsx` (a `switch`) |
| Presets | `components/editor/presets.ts` |
| Review rules, media paths | `packages/shared/src/caseStudies/review.ts`, `studio.ts` `documentMediaPaths` |

### 10.2 The registry

Two halves, so the server never imports React:

```ts
// packages/shared/src/blocks/registry.ts: data only (server and client)
export type BlockSchemaDefinition<Config> = {
  id: string;                       // node name, e.g. 'imageGrid'; never renamed
  schemaVersion: number;            // bump with a migration when Config changes shape
  label: string;                    // "Image grid"
  defaults: () => Config;
  normalise?: (config: unknown) => Config;          // older documents → current shape
  mediaPaths?: (config: Config) => string[];        // ownership checks on save
  review?: (config: Config) => ReviewProblem[];     // Stage 5 review rules
  responsiveKeys?: (keyof Config)[];                // §9.3 whitelist
};

// frontend/src/components/editor/blocks/registry.tsx: editor UI
export type EditorBlockDefinition<Config> = BlockSchemaDefinition<Config> & {
  category: 'Text' | 'Media' | 'Visual' | 'Data' | 'Structure' | 'Embeds';
  description: string;
  icon: LucideIcon;
  searchTerms: string[];
  recommendedFor?: string[];        // framework section keys (also from framework data)
  insert: (editor: Editor, at?: number) => void;
  capabilities: {draggable: boolean; duplicable: boolean; convertibleTo: string[]; configurable: boolean; resizable: boolean};
  toolbar?: BlockToolbarAction[];   // extra handle-menu items (e.g. Swap sides)
  inspector?: React.ComponentType<{config: Config; onChange: (next: Config) => void}>;
  presets?: BlockPreset[];
  NodeView: React.ComponentType<ReactNodeViewProps>;
  Render: React.ComponentType<{config: Config; children?: React.ReactNode}>; // editor + preview + export
};
```

Consumers read the registry instead of their own lists: Smart Insert (§8), block handle (§7), inspector (`BlockInspector` becomes a lookup), presets gallery, preview `nodeMapping`, review, `documentMediaPaths`.

### 10.3 Migration (no document changes)

1. Create both registry files and register the 12 visual blocks with their current pieces (pure move, no behaviour change).
2. Point `BlockInspector`, `insertMenuItems`, `presets.ts`, `CaseStudyArticle` and `review.ts` at the registry, one at a time, with the suite passing after each.
3. Then add T4 blocks (Research insights, Chart) **only** through the registry. Acceptance: a new block is added by writing one definition (plus its components), touching no shared switch statements.

Stored JSON doesn't change; `schemaVersion` starts at 1 for every block.

---

## 11. Composition tools (T6): device mockups only

Everything here acts **inside a selected device composition**, never on the page. Positions stay normalised (x, y in %, scale, rotate, z) (✅ today), so compositions keep scaling as one.

### 11.1 Selection model

- Click a device: select it (✅ picker). **⇧-click**: add or remove from the selection (✚). Esc: back to the whole composition.
- Selected devices show a brand outline and handles; locked devices show a lock and can't be dragged (✅ lock).

### 11.2 Tools (inspector → **Arrange** group, and keyboard)

| Tool | Icons | Shortcut | Needs | Status |
|---|---|---|---|---|
| Align left / centre / right | `AlignStartVertical`, `AlignCenterVertical`, `AlignEndVertical` | | 2+ devices (1: aligns to the stage) | ✚ |
| Align top / middle / bottom | `AlignStartHorizontal`, `AlignCenterHorizontal`, `AlignEndHorizontal` | | same | ✚ |
| Distribute horizontally / vertically | `AlignHorizontalDistributeCenter`, `AlignVerticalDistributeCenter` | | 3+ devices | ✚ |
| Bring to front / Send to back | `BringToFront`, `SendToBack` | ⌥⌘] / ⌥⌘[ | 1+ | ✅ (✚ shortcuts) |
| Bring forward / Send backward | `ChevronUp`, `ChevronDown` | ⌘] / ⌘[ | 1+ | ✚ |
| Group / Ungroup | `Group`, `Ungroup` | ⌘G / ⇧⌘G | 2+ / a group | ✚ (data: optional `groupId` on `Device`) |
| Rotate | `RotateCw` | slider; ⇧ while dragging the handle snaps to 15° | 1 | ◐ slider ✅, handle ✚ |
| Duplicate | `Copy` | ⌘D | 1+ | ✅ (one at a time) |
| Lock / Unlock | `Lock` / `LockOpen` | ⇧⌘L | 1+ | ✅ |
| Nudge | | ←↑→↓ 1 %, ⇧ + arrow 5 % | 1+ unlocked | ✚ |
| Snap | `Magnet` toggle | hold ⌥ while dragging to turn it off | | ✚ |

### 11.3 Snapping

Guides at the stage's 0 / 50 / 100 % lines and at other devices' edges and centres; snap distance 1.5 % of the stage; a thin brand guide line shows while snapped. Snapping only changes where a drag lands; the stored value is still a plain percentage.

### 11.4 Breakpoints

The existing phone behaviour (`mobile`: composition / stack / first device) stays (✅). With T3's overrides, a tablet layout can store its own `x/y/scale` per device.

---

## 12. Implementation roadmap

| Phase | Scope | Reference | Status | Acceptance (summary) |
|---|---|---|---|---|
| **T1** | Compact formatting toolbar, selection toolbar; Undo/Redo + Export in the header; toolbar roving focus | Medium | ✅ done 2026-11-11 | Header and toolbar match §4–§5; one tab stop per toolbar; no regressions at 375 / 768 / 1280 px |
| **T2** | Universal block handle (drag, `+`, menu), Turn into, copy/cut, insert before/after, block keyboard moves; Smart Insert top sections (recommended, recent, frequent); category changes (Embeds, Advanced retired) | Notion, Gutenberg | ✅ done 2026-11-12 | Every top-level block can be moved, duplicated, deleted and (where §7.3 allows) converted with mouse, touch and keyboard; recommendations change with the section; usage data holds item ids only |
| **T3** | Inspector groups in the §9.1 order; responsive overrides (§9.3) | Framer, Webflow | ◐ inspectors and presets exist | Every inspector follows the order; overrides save, render at the right breakpoint, and reset |
| **T4** | Content cards: Problem callout, Key takeaway, Results highlights (presets); Research insights and Chart (new blocks) | Ghost, UXfolio | ✚ | Cards appear in Smart Insert and recommendations; new blocks render in editor, preview, PDF and HTML export and pass review rules |
| **T5** | Block registry (§10) | Sanity, Tiptap | ◐ started: `components/editor/blocks/registry.ts` (labels, icons, families, configurable, insert ids, Turn into conversions) feeds the handle, Turn into and recommendations; inspector, presets, renderers and review still to move | All 12 visual blocks registered; no shared switch statements left; T4 blocks added through it only |
| **T6** | Composition tools (§11) | Google Slides | ◐ drag, duplicate, lock, front/back exist | Multi-select, align, distribute, group, nudge, snap work inside a composition with keyboard equivalents |
| **T7** | History (versions), future storytelling blocks, new frameworks (UX research etc.) | UXfolio | ✚ | Owner-only revisions table + restore; recommendations for new framework sections |

**Recommended order:** finish T1 (small), then **T2**, with **T5 started at the same time** (build the block handle and Smart Insert top sections against the registry from day one), then T3, T4, T6, T7.

**Every phase:** reuse the Tiptap document model; keep autosave (debounced, version-checked) and version compatibility; keep owner-only access (Express scoping, deny-all RLS, private bucket); pass `scripts/security-suite.sh`; check in the browser at 375, 768 and 1280 px; follow DNA tokens, Liquid Glass and the W3C copy rules.

---

## 13. Keyboard shortcuts (master list)

⌘ = Ctrl on Windows and Linux (tooltips already show the right key, ✅).

| Action | Shortcut | Status |
|---|---|---|
| Undo / Redo | ⌘Z / ⇧⌘Z | ✅ |
| Save now | ⌘S | ✅ |
| Find and replace | ⌘F | ✅ |
| Bold / Italic / Underline | ⌘B / ⌘I / ⌘U | ✅ |
| Strikethrough | ⇧⌘S | ✅ |
| Link | ⌘K | ✅ |
| Inline code / Clear formatting | ⌘E / ⌘\ | ✅ |
| Subscript / Superscript | ⌘, / ⌘. | ✅ |
| Align left / centre / right / justify | ⇧⌘L / ⇧⌘E / ⇧⌘R / ⇧⌘J | ✅ |
| Bulleted / Numbered / Checklist | ⇧⌘8 / ⇧⌘7 / ⇧⌘9 | ✅ |
| Indent / Outdent (in a list) | Tab / ⇧Tab | ✅ |
| Insert menu | `/` | ✅ |
| Title → subtitle → story | Enter / ↓; ↑ back | ✅ |
| Block menu | ⌘/ | ✅ T2 |
| Move block up / down | ⌥⇧↑ / ⌥⇧↓ | ✅ T2 |
| Duplicate block or device | ⌘D | ✅ T2 (block) / ✚ T6 (device) |
| Group / Ungroup devices | ⌘G / ⇧⌘G | ✚ T6 |
| Forward / Backward, Front / Back | ⌘] / ⌘[, ⌥⌘] / ⌥⌘[ | ✚ T6 |
| Lock device | ⇧⌘L (inside a composition only; elsewhere it stays Align left) | ✚ T6 |

Conflicts: ⌘D (browser bookmark) and ⌘[ / ⌘] (browser back/forward on some systems) are captured **only while the editor or a composition has focus**. ⇧⌘L means Lock only when a device is selected.

---

## 14. Responsive summary

| Width | Header | Toolbar | Outline | Side panel | Block handle |
|---|---|---|---|---|---|
| ≥ 1280 px | Labelled buttons | One row | Docked left | Docked right | Hover, left gutter |
| 1024–1279 px | Labelled | One row (compact below 720 px column) | Drawer | Docked | Hover |
| 768–1023 px | Labelled | Compact row | Drawer | Drawer | Hover / cursor |
| < 768 px | Icon-only | Bottom bar + ⌃ sheet + Insert FAB | Drawer | Drawer | Cursor block only, 40 px |

---

## 15. Decisions (product owner, 2026-11-11: all as proposed)

| # | Question | Decision |
|---|---|---|
| D1 | Undo/Redo location | **Header** (§4). They leave the formatting toolbar; the phone ⌃ sheet keeps them. |
| D2 | Embeds category | **Yes**: Video link and Figma move from Media into their own **Embeds** category (§8.1). |
| D3 | Table's home | **Text**, as in the inventory (§8.1); still found by searching "data" or "table". |
| D4 | Recents and frequency | **Per browser** in `localStorage`, item ids only (§8.3). No account sync. |
| D5 | Universal block handle | **Replaces** the visual blocks' own bars completely in T2 (§7.1); no period with both. |
| D6 | First new blocks (T4) | **Research insights and Chart** first (§8.5). |
