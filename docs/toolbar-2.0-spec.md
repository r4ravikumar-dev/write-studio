# Write Studio: editor toolbar specification (Toolbar 2.0)

> Status: **Release 1 (A1–A10) implemented on 2026-11-11**, using the recommended answers to the open decisions (text style names as in A2, new tab by default for links, replace included). **Release 2 (Insert 2.0) implemented on 2026-11-11:** process timeline, screen sequence, annotated screenshot and flow diagram. Inventory 3's other items are still future work.
> It turns the product owner's "Editor Toolbar Architecture & Feature Specification" into three
> inventories (Keep and reorganise, Add, Future-ready), checked against the code as it is today.
> It sits under `docs/write-studio-2.0-blueprint.md` and must respect its constraints, the design
> rules in `CLAUDE.md` §5b (DNA v2.0, Liquid Glass, touch targets, phone layout) and the W3C
> writing rules (§9).

**Guiding principle:** every tool appears where the user needs it, not necessarily in the main toolbar.

## Four editing surfaces

| Surface | Holds | Code today |
|---|---|---|
| **1. Main toolbar** | Frequent writing and formatting | `Toolbar.tsx`: four tabs (Text, Format, Paragraph, Structure) + Insert |
| **2. Insert menu and `/` menu** | Everything that can be added | `insertCommands.ts`: one registry, 19 commands (Visual 9, Media 5, Text 5), used by Insert **and** `SlashMenu.tsx` |
| **3. Contextual inspector** | Properties of the selected block, image or table | `BlockInspector.tsx`: 9 block types; **no table or text inspector** |
| **4. Document actions** | Save state, preview, archive, later history and export | `Editor.tsx` top bar: back, status, save state, Preview, Archive, panel toggle |

A fifth, already-built surface is the **selection bubble menu** (`Editor.tsx`): Bold, Italic, Underline, Link on a glass capsule.

## Audit corrections (what the code actually does)

- **Selection toolbar exists.** The work is to extend it (Highlight, More), not create it.
- **One command registry already powers Insert and `/`.** Insert 2.0 adds categories and commands; no new plumbing.
- **Links:** the dialog has a single address field.
  - Addresses not starting `https:`, `mailto:`, `/` or `#` get `https://` prefixed, so `javascript:` is neutralised by accident, not rejected.
  - Every link opens in a new tab (schema default), with no per-link choice.
  - There is no "displayed text" field.
- **Typography:** the paragraph-style picker offers Paragraph, Title (H1), Section heading (H2), Subheading (H3), Small heading (H4), Quote and Code.
  - Font choices are already restricted to Outfit (body) and Bricolage Grotesque (display).
  - Size, weight, line height and letter spacing are inline marks (manual overrides).
- **Tables:** insertion and row/column/cell commands live in a toolbar dropdown (Structure tab), including header row, merge and split. There is no table inspector and no in-table contextual bar.
- **Image inspector:** replace, alt text and caption only. No crop, focal point (except Showcase), width, alignment, credit or decorative toggle.
- **Not present anywhere:** find and replace, word count, reading time, version history, footnotes, comments, charts.

## Inventory 1: Keep and reorganise

Existing functionality, moved to the right surface. Nothing here is removed from the product.

### Main toolbar (one row, no tabs)

Order, left to right, in Liquid Glass groups:

1. **History:** Undo, Redo
2. **Find:** Search (opens find and replace; see Inventory 2)
3. **Text style:** one picker of semantic styles (see Inventory 2)
4. **Inline:** Bold, Italic, Underline, Link, Colour (text colour + highlight in one popover)
5. **Paragraph:** Alignment (one menu: left, centre, right; justify inside "More"), Lists (one menu: bulleted, numbered, checklist; indent and outdent appear only inside a list)
6. **Insert** (primary)
7. **More (⋯):** everything below

| Existing control | Today | Moves to |
|---|---|---|
| Undo, Redo | Toolbar, always | Main toolbar (unchanged) |
| Paragraph-style picker | Text tab | Main toolbar → **Text style** |
| Font, size, weight, line height, letter spacing | Text tab | More → **Typography** (manual overrides) |
| Increase/decrease size | Format tab | More → Typography (shortcuts stay) |
| Bold, Italic, Underline | Format tab | Main toolbar + bubble menu |
| Strikethrough | Format tab | More → **Decoration**, bubble "More" |
| Subscript, superscript, inline code | Format tab | More → Decoration |
| Text case | Format tab | More → Typography |
| Text colour, highlight | Format tab | Main toolbar → **Colour** |
| Link, remove link | Format tab + bubble | Main toolbar + bubble |
| Format painter | Format tab | More → **Editing** |
| Clear formatting | Format tab | More → Editing (and bubble "More") |
| Align left / centre / right | Paragraph tab | Main toolbar → **Alignment** menu |
| Justify | Paragraph tab | Alignment menu, under "More options" |
| Bulleted, numbered, checklist | Paragraph tab | Main toolbar → **Lists** menu |
| Indent, outdent | Paragraph tab | Lists menu; shown only when the cursor is in a list |
| New section, template section | Structure tab | **Insert → Structure** (and Story Outline once Stage 2 lands) |
| Quote, pull quote, callout | Structure tab | Insert → Text |
| Collapsible section, code block | Structure tab | Insert → Advanced |
| Split layout, metrics | Structure tab | Insert → Visual / Data |
| Divider, space, line break | Structure tab | Insert → Text (line break stays Shift+Enter) |
| Table and its row/column/cell commands | Structure tab dropdown | Insert → Advanced (insert) + **table contextual bar** (edit) |

### Selection bubble menu

Keep **Bold, Italic, Underline, Link**. Add **Highlight** and **More** (strikethrough, inline code, clear formatting). See Inventory 2.

### Insert menu and `/` (same registry, six categories)

| Category | Existing commands that move here |
|---|---|
| **Text** | Section heading, quote, callout, bulleted list, numbered list, divider |
| **Media** | Image, video file, video link (YouTube/Vimeo/Loom), Figma, file (PDF/PowerPoint/Word) |
| **Visual** | Image grid, comparison, showcase, device mockups, split layout, pull quote |
| **Data** | Metrics |
| **Structure** | New section, template section |
| **Advanced** | Table, code block, collapsible section, space |

### Contextual inspector

Keep all nine existing block inspectors as they are. Inventory 2 adds image, table and text properties.

### Document actions (top bar)

Keep: back, status, save state, Preview, Archive/Restore, settings-panel toggle. History and Export join here later (Inventory 3).

### Phone (must survive the reorganisation)

The current phone pattern is a user decision (`CLAUDE.md` §5b) and stays:
- **Bottom bar:** pinned to the bottom of the screen.
- **⌃ sheet:** opens with a tab picker, undo/redo and tools.
- **Insert:** a floating action button.
- **Upward menus:** pickers and menus open upward.

With tabs gone on desktop, the phone sheet's picker switches between the same groups as desktop's More menu: Text style, Inline, Paragraph and More.

## Inventory 2: Add (Release 1, Toolbar 2.0, P0)

| # | Capability | Detail | Touches |
|---|---|---|---|
| A1 | **One-row compact toolbar** | Replace the four tabs with the main-toolbar order above; More (⋯) holds Typography, Decoration, Editing. On narrower desktop widths, groups collapse into More from the right, never a horizontal scroll. | `Toolbar.tsx`, `globals.css` |
| A2 | **Semantic text styles** | One picker: Display, Title, Heading 1–3, Lead, Body, Small, Caption, Label, Code. Headings stay real `h1`–`h4`. Display, Lead, Small, Caption and Label are paragraphs with a `textStyle` attribute that maps to DNA text styles (`.t-web-*` / `.t-mobile-*`), so changing the design system restyles every document. Manual size/weight/spacing marks stay as overrides under More → Typography. | `caseStudy/schema.ts` (new global attribute), `typography.css`, static renderer, `Toolbar.tsx` |
| A3 | **Find and replace** | Ctrl/⌘+F opens a glass popover: find field, match count, previous/next, case toggle, replace / replace all (replace is P1 but built together). Highlights via a ProseMirror decoration plugin (never stored). Replace is one undo step. | new `components/editor/FindReplace.tsx` + plugin |
| A4 | **Selection toolbar 2.0** | Bubble menu adds Highlight and **More** (Strikethrough, Inline code, Clear formatting). Hidden while a visual block or table cell range is selected. | `Editor.tsx` |
| A5 | **Link editor** | Fields: web address, displayed text, "Open in a new tab" (default off for `#` and `/` links, on for external), Remove link. Edits an existing link in place. **Rejects** any scheme other than `https:`, `http:`, `mailto:`, `tel:`, `/`, `#`, with the error "Enter a web address that starts with https://". The schema keeps `rel="noopener noreferrer"` on new-tab links; the new-tab choice is stored per link. | `Editor.tsx`, `caseStudy/schema.ts` link config |
| A6 | **Table contextual bar** | When the cursor is in a table, a small glass bar above it: Add row, Add column, Header, Merge, Split, Alignment, More (delete row/column/table, header column). Removed from the main toolbar. | new `TableBar.tsx` (Tiptap `BubbleMenu` with a table `shouldShow`) |
| A7 | **Image inspector 2.0 (P0 parts)** | Replace, alt text, **Decorative** toggle (clears and disables alt text; W3C tip 4), caption, focal point (reuse Showcase's), width (content / wide / page frame), alignment. | `BlockInspector.tsx`, image node attributes |
| A8 | **Insert menu 2.0 categories** | Text, Media, Visual, Data, Structure, Advanced, in the same registry (`group` becomes one of six); the `/` menu shows the same categories as section labels while unfiltered. | `insertCommands.ts`, `SlashMenu.tsx`, `Toolbar.tsx` Insert |
| A9 | **Context-aware availability** | Every control computes its enabled state from the selection (e.g. indent only in lists, merge only for a multi-cell selection). Disabled controls carry a tooltip explaining why ("Select two or more cells to merge"). | `Toolbar.tsx` state selector |
| A10 | **Shortcuts in tooltips** | Platform-correct (⌘ on Mac, Ctrl elsewhere), e.g. "Bold (⌘B)". | `Toolbar.tsx` `tool()` |

**Release 1 acceptance criteria**
- **Fewer actions:** a writer can do every action available today in the same number of clicks or fewer, and the common ones (B/I/U, link, lists, style, insert) are one click with no tab switching.
- **No stray table controls:** none appear outside a table, and no device controls appear while editing text.
- **Selection kept:** clicking any toolbar control keeps the text selection.
- **Undo:** every change is one undo step, including Replace all and style changes.
- **Accessibility:**
  - Icon-only controls have accessible names and the toolbar uses `role="toolbar"` with arrow-key navigation.
  - Focus is visible.
  - Text follows the W3C rules in `CLAUDE.md` §9.
- **Phone:** the bottom bar, ⌃ sheet and FAB keep working, and no menu opens off-screen.
- **Design rules:** everything uses DNA tokens and Liquid Glass rules, with no new hard-coded values.
- **Tests:** `scripts/security-suite.sh` passes; browser checks at 375, 768 and 1280 px.

## Inventory 3: Future-ready (design for it now, build later)

The architecture must leave room for these without a rewrite. "Prepare now" is what Release 1 should do so they slot in later.

| Capability | Priority | Prepare now | Constraint |
|---|---|---|---|
| Process timeline, screen sequence, annotated screenshot, flow diagram | P1 (Insert 2.0) | Visual / Structure categories exist (A8); inspector switch is open to new block types | Native responsive blocks, not static images (blueprint) |
| Before/after slider for Comparison | P1 | Comparison config gets a `mode` field reserved | Responsive stacking on phones |
| Charts (bar, line, donut, progress) and Data category growth | P1 | Data category exists (A8) | Narrative-sized, editable data, no spreadsheet UI; follow the `dataviz` skill and DNA tokens; no invented numbers |
| Device composition: drag on canvas, duplicate, lock, multi-select, guides, snap | P1–P2 | Device positions already use normalised x/y; keep them the single source of truth | No unrestricted canvas (blueprint) |
| Table inspector (widths, cell alignment, borders, responsive behaviour, accessible headers) | P1 | Table bar (A6) has a "More" that can open the inspector | Wide tables scroll horizontally on phones |
| Image credit, border radius, link image, responsive behaviour | P1–P2 | Image node attributes added in A7 leave room | |
| Video poster frame, captions and transcript | P1 | Video node gets `captions`/`transcript` slots | W3C tip 5 (captions and transcripts) |
| Word count, reading time | P1 | Computed from the doc on idle; shown in the top bar | Never a quality score (blueprint) |
| Version history | P1–P2 | Save path already has `expected_updated_at`; add a revisions table later | **Database migration + Express routes**, owner-scoped like everything else |
| Footnotes, citations, source manager | P2 | Reserve a `footnote` node name and a `sources` list in document metadata | Proper references, not plain links |
| Private notes / self-review comments | P2 | Nothing stored in the document | Blueprint: **notes never go into the document or exports**; needs an owner-scoped table |
| Reusable block presets | P2 | Block configs are already plain JSON | Presets are private to the owner |
| Lists: start number, continue numbering, a/A/i/I styles, paragraph spacing, keep-with-next | P2 | Lists menu (A1) has room for "List options" | Mostly matters for PDF export (blueprint P1 export) |
| Export (PDF, HTML) in the top bar | P1 (Stage 5) | Top bar keeps a slot after Preview | Reuse the preview renderer; owner-only |
| Spelling and grammar, AI rewrite and summarise | P2 | None | Blueprint: **no AI before guidance is useful on its own**; never invent metrics |
| Keyboard shortcut manager | P3 | Shortcuts defined in one table used by tooltips (A10) | |

## Dependencies on the Write Studio 2.0 stages

- **Section operations** move into the Story Outline (rename, duplicate, move, mark complete or for review, add subsection, delete, collapse). That is **Stage 2**. Until then, New section and Template section stay in Insert → Structure.
- **Template section insertion** leaves the toolbar once the framework engine (Stage 1–2) offers sections from the outline.
- **Export and History** belong to Stage 5 and the version-history work above.

## Recommended order

1. **Toolbar 2.0 (P0):** A1–A10 above.
2. **Insertion 2.0 (P1):** ✅ done: process timeline, screen sequence, annotated screenshot, flow diagram.
3. **Inspector 2.0 (P1):** ✅ done (2026-11-11): table inspector, device drag/duplicate/lock, image credit and corners, comparison slider, image grid columns on phones. Reusable presets moved to P2 (need private storage).
4. **Advanced authoring (P2):** sources and footnotes, charts, version history, private notes, AI (only after guidance).

## Open decisions for the product owner

1. **Text style names:** use the list in A2, or the DNA names (Display, Heading, Body, Label, Caption, Overline)?
2. **Link default:** should external links open in a new tab by default (current behaviour), or the same tab?
3. **Find and replace:** ship replace in Release 1 (recommended, small extra cost), or find only?
4. **Release 1 vs Stage 1:** do Toolbar 2.0 before or after Stage 1 (guided project creation), which is still awaiting approval?
