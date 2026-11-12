# Multi-vertical expansion — Phase 3: universal block registry

Contract: `docs/multi-vertical-master-plan.json`, `phase_3_universal_block_registry`, and the block
contract approved on 2026-11-12 (`phase-3-block-contract.md`, decisions B1–B6 as recommended).
Done 2026-11-12 on branch `feature/template`. No database migration; content schema v2 → v3 (additive).

## 1. Plan (the contract's order of work)

1. Safety first (B2): blocks this version can't read, documents written by a newer version, documents that
   can't be read at all, and the server refusing unknown types.
2. The contract in code, and the 29 existing blocks registered against it without changing what they store.
3. Insert commands generated from the registry for the new blocks.
4. The nine blocks of §5, each to the "done" list (§3.3).
5. Evidence and this report.

## 2. What was built

### The contract (shared, `packages/shared/src/blocks/`)

| File | What it is |
|---|---|
| `catalog.ts` | identity: plan id, version, family, name, description, search terms, document types (now 37 blocks) |
| `spec.ts` | small attribute-rule library: text with a maximum, patterns, enums, numbers in a range, lists, objects, safe links, private media paths |
| `document.ts` | every node type and mark the editor can write, with its attribute rules (`NODE_ATTRIBUTES`, `MARK_ATTRIBUTES`); `cleanDocument()`; `wrapUnknownBlocks()` / `unwrapUnknownBlocks()` |
| `markdown.ts` | Markdown and plain text for text structure (headings, lists, tables, code, marks, safe links, escaping) |
| `contract.ts` | per block: storage (content or atom), enforced or report-only, `isEmpty`, `toText`, `toMarkdown`; `documentMarkdown()`, `isEmptyBlock()`, `isEnforcedType()`, `blockContractProblems()` |
| `fixtures.ts` | one realistic stored node per block and version (codeBlock has v1 and v2) |

Review rules stay in `caseStudies/blockSchemas.ts` (now with the new blocks). Section progress uses each
block's own `isEmpty` (an empty image grid or divider no longer makes a section "in progress").

### The editor half (`frontend/src/components/`)

| File | What it is |
|---|---|
| `caseStudy/structuredBlocks.ts` | the 9 blocks as document nodes (17 node types), with semantic `renderHTML` for preview and HTML export |
| `caseStudy/highlight.ts` | lowlight with 23 languages; React output for the preview, ProseMirror decorations for the editor (B5) |
| `caseStudy/documentCheck.ts` | `checkDocument()`: wraps unknown blocks, refuses unreadable documents (B2) |
| `editor/structuredViews.tsx` | on-page editing views (B6), keyboard behaviour, `RequirementIds`, insert JSON, empty-part hints |
| `editor/blocks/registry.ts` | built from the catalogue; a missing editor entry fails typecheck |
| `editor/blocks/inspectors.tsx` | settings for code block, terminal, parameter table, testimonial |
| `editor/insertCommands.tsx` | the new blocks' commands generated from the catalogue (one command for Insert, "/" and recommendations); a "Specialised" group |
| `editor/DocumentUnreadable.tsx`, `editor/Editor.tsx` | the locked / read-only / unreadable states |
| `theme/structured.css` | styles, phone layout, print rules (DNA semantic tokens only) |

### Server (`backend/express/src/routes/appDocuments.ts`)

Every save and restore is cleaned: unknown node or mark types (and the editor-only placeholder) are refused
(422, naming the type, "Nothing was saved."); the new blocks and their parts are cleaned and the cleaned
form stored; the existing blocks are cleaned in report-only mode, logging type, position and rule only.

### Safety (B2), as built

- **A block this version doesn't know** opens as a locked placeholder holding the original; the rest of the
  document is editable; on save the original is put back exactly. If the server doesn't know the type
  either, the save is refused with a message and nothing changes.
- **A document from a newer content schema** opens read-only, says why, and never saves.
- **A document that can't be read** isn't opened; a page says it is safe and unchanged.
- **Preview**: a notice in place of each unknown block, or of an unreadable document, instead of an error page.

### The nine blocks (B1: prose is content, facts are attributes)

| Block | Editing on the page | Settings (inspector) | Keyboard | Preview / HTML | Markdown | Review |
|---|---|---|---|---|---|---|
| Code block v2 | title, code | language, line numbers, wrap | as before | highlighted, line numbers, copy in editor | fenced with language, title | no language → consider |
| Terminal | commands, output | shell, prompt | ⌘/Ctrl+Enter: next line of the other kind | dark panel, prompt drawn (never copied) | ```console with `$ ` | no command |
| Parameter table | name, type, required, default, description | which columns show | Enter: next row | `<table>` with column and row headers; rows on phones | GFM table | unnamed row |
| Requirements | id, priority, statement | – | Enter: next requirement (gets the next id) | numbered list with ids and priority | `- **FR-1** (Must) …` | missing id or text; duplicate ids |
| User story | As / I want / so that | – | Enter: next part, then out | one sentence | `As **…**, I want **…**, so that **…**.` | unfinished |
| Acceptance criteria | title, requirement it checks, Given/When/Then/And/But steps | – | Enter: an "And" step; empty last step: leave | scenarios with keywords | `**Scenario: …** (FR-1)` + steps | no Given, When or Then |
| Testimonial | quote, name, role, organisation | permission to quote, photo | – | `<figure><blockquote><figcaption>` | quote with attribution | no name; not approved |
| Procedure steps | instructions, who, expected result | – | Enter: next step; Shift+Tab: out | numbered steps | numbered, with Who / Expected result | empty step |
| References | title, link, kind | – | Enter: next reference | list, safe links only | `- [title](url)` | no title or link |

## 3. Evidence

**One uninterrupted run of the complete suite** (`scripts/security-suite.sh <django log>`, 2026-11-12), all pass:

| Check | Phase 2 | Phase 3 |
|---|---|---|
| TypeScript (shared, Express, frontend), ESLint, Express build, Django check | pass | pass |
| Django auth tests (offline) | 26/26 | 26/26 |
| Review engine (offline) | 15/15 | 15/15 |
| Documents, templates, catalogue (offline) | 24/24 | 24/24 |
| **Block contract (offline, new)**: completeness, cleaning, emptiness, text, Markdown, enforcement, review of new blocks | – | 15/15 → 16/16 |
| **Editor and server schemas agree (offline, new)**: every node, attribute, mark; fixtures load; B2 wrap round trip | – | 9/9 |
| Schema · Auth · Storage | 33 · 23 · 30 | 33 · 23 · 30 |
| Documents · Document model · Templates | 55 · 64 · 56 | 55 · 64 · 56 |
| Setup · Sections · Review · History | 35 · 30 · 16 · 23 | 35 · 30 · 16 · 23 |
| **Blocks (live + browser, new)** | – | 54/54 → 55/55 |
| Editor in a real browser | 40/40 | 41/41 (new: the saved document passes report-only cleaning with zero changes) |
| Lifecycle and caching | 27/27 | 27/27 |
| **Staging total** | **432** | **487 → 488** |

The arrows are the testimonial-photo fix made after that run (§6): one offline and one live check added, run on
their own afterwards (see the end of this section).

What the new live suite proves, by contract check (§3.3):

| # | Check | How it was shown |
|---|---|---|
| 1 | Both halves exist and agree | typecheck; `blockContractProblems()` empty; `schema.test.ts` compares every node, attribute and mark |
| 2 | Cleaning idempotent, keeps fixtures | offline: all 38 fixtures clean with zero issues, twice |
| 3 | Old fixture migrates to current | codeBlock v1 is valid under v2 rules (additive); content schema v2 → v3 identity, sections suite (v1 → v3) |
| 4 | Text, Markdown, emptiness | offline, exact expected output for every new block and the main existing ones |
| 5 | Same JSON from every insert route | one generated command per block; browser inserts from the Insert menu and "/" |
| 6 | Type, save, reload: stored = editor | browser: stored JSON equals the editor's, before and after reload |
| 7 | Preview and HTML | browser: semantic HTML per block (lists, `<table>` with headers, `<figure>`/`<blockquote>`), highlighting, prompt drawn not stored |
| 8 | Print (A4) | browser, print media at A4 width: no element wider than the page |
| 9 | Keyboard and names | browser: zero unnamed controls in the new blocks; Enter / ⌘Enter behaviours exercised by real key events |
| 10 | Phone (375px) | browser: no page-wide overflow; parameter table becomes rows |
| 11 | Privacy | B gets 404 on the preview; photo from another account's folder refused (422) |
| 12 | Unsafe input cleaned | `javascript:` link, markup in an id or prompt, unknown enums, oversized names, foreign photo, unknown attributes |

B2 in the browser: a document with an unknown block and an unknown mark opens with both locked in place and the
rest editable; an edit's save is refused with the message, and the stored document is unchanged byte for byte
(md5 and `updated_at`); a newer-schema document opens read-only and sends nothing when typed into; an
unreadable document isn't opened; previews show notices instead of failing.

**By hand in the browser** (this session, a throwaway account, then removed): each block inserted from "/" and typed
into; requirement ids filled in (R-1, R-2); Given/When/Then/And; story parts with Enter; code highlighted with line
numbers and its inspector; preview checked by eye. Three problems were found this way and fixed before the automated
runs: the cursor stayed below a newly inserted block; the terminal used `--bg-gray-inverse`, which in DNA is white; and
in the preview, labels ran into text for screen readers ("Asa parent", "R-1Patients") and the requirement list picked up
the article's list indent. The tests then found three more: cleaning wasn't enforced on the new blocks' inner parts, a
Markdown bug (`**Booking took **` isn't valid bold), and the testimonial photo missing from the ownership check.

Not shown: a pixel comparison of the existing blocks before and after; screen-reader use by a person; the HTML export
file for the new blocks (it is built from the same preview DOM, which is tested). One run of the B2 browser check
missed the save-refused message once, then passed in the next three runs (including the full suite); the cause wasn't
found, so treat that check as possibly flaky.

After the photo fix: blocks suite 55/55 and block contract 16/16, run on their own; typecheck clean. (The other
suites don't touch the changed code path, `documentMediaPaths`, except the storage and documents suites, which use
image `src`/`path` attributes only and passed in the full run before the fix.)

## 4. Evaluation against the plan

Scale: 0 not implemented, 1 partial, 2 minor gaps, 3 meets the criteria with test evidence.

| Action | Evaluate | Score | Evidence and gaps |
|---|---|---|---|
| block_contract | every block has editor and output behaviour; schemas versioned; unsupported types handled safely | 3 | contract check, schema parity, B2 suite. The plan's per-block `toolbar_actions` and `accessibility_notes` are not separate fields: the universal handle supplies the actions and the browser suite checks names |
| shared_insert_registry | consistent across insert surfaces; search with synonyms; recents don't bypass rules | 2 | the new blocks' commands are generated from the catalogue (search terms included); the 29 older commands are still hand-written, mapped to the registry by id |
| block_actions | keyboard equivalents; stable selection; undo | 2 | universal handle (T2) applies to the new blocks; Enter, ⌘Enter, Shift+Tab per block; add/remove buttons named. Selection stability after menus isn't separately tested |
| existing_block_migration | old documents render the same; no data lost on save/reopen/export | 2 | stored attributes unchanged; fixtures and the browser document clean with zero changes; staging scan zero changes (2 documents). No pixel comparison |
| common_new_blocks | keyboard, responsive and export behaviour; no unsafe markup | 2 | all twelve named in the plan exist (9 built, 3 already existed); browser and print and phone checks; enforced cleaning. Markdown export button is Phase 6; no domain review yet |

Exit criteria:

| Criterion | Result |
|---|---|
| A new block can be registered once and used by multiple templates | met for registration (one catalogue entry ranks it for several document types); no template uses the new blocks yet (Phase 4) |
| All blocks round-trip through save and reload | met: browser suites for the old document and the new blocks |
| Private asset references remain owner-scoped | met after the photo fix: every media attribute is in the ownership check; live refusal of another account's path |

Deliverables: block registry contract ✔, shared insertion service ✔ (new blocks; older ones mapped),
contextual block actions ✔ (universal handle + per-block buttons), registered existing blocks ✔, reusable new
blocks ✔, renderer compatibility tests ✔ (schema parity, preview, print, phone).

## 5. Decisions taken while building (within the approved contract)

- **Content schema v3** (B4): adding the code block's attributes and the new node types is additive, so v2
  documents are valid v3 documents and the migration step changes nothing. The bump exists so that an older
  version of the app opens v3 documents read-only instead of silently dropping attributes it doesn't know.
  Every document is migrated on first read, which writes one backup row per document.
- **`@tiptap/extension-code-block`** is now a direct dependency. It was already installed (StarterKit
  depends on it), same version; it had to be imported to add the code block's new attributes.
- **Requirement ids** are filled in when a requirement is created and never changed afterwards; a duplicate
  (from a paste or a duplicated list) is flagged by the review rather than renumbered, so tickets and tests
  that refer to an id stay right.
- **The "/" menu still closes at a space** (existing behaviour): `/story` works, `/user story` doesn't.

## 6. Limits and what is next

- Markdown exists for every block and is tested offline, but there is no Markdown export button yet: Phase 6.
- The 29 existing blocks are cleaned in report-only mode; switching them to enforced is the next step once
  staging documents and fixtures keep showing zero changes (staging held only 2 documents to check).
- No pixel-level visual regression for the existing blocks; the browser suite compares stored JSON and
  checks the preview, print and phone layouts structurally.
- Domain review of the new blocks by engineers, product managers and operations people has not happened (Phase 7).
- The editor's highlight decorations are recomputed on every change; fine for normal documents, not measured
  with very long code.
