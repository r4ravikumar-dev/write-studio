# Multi-vertical expansion — Phase 3: the block contract (draft for approval)

Contract: `docs/multi-vertical-master-plan.json`, `phase_3_universal_block_registry`.
Gate: *"Block contract and renderer compatibility must be agreed before adding many new blocks."*
Status: **approved by the owner on 2026-11-12, decisions B1–B6 as recommended.** It is the
rule every block in Phases 3–5 is built and tested against.

## 1. Why a contract, and what it fixes

Today a block is described in five places that nothing ties together:

| What | Where | Enforced? |
|---|---|---|
| Name, family, search words, document types, version | shared `blocks/catalog.ts` | typecheck: the editor registry must cover it |
| Defaults, review rules, evidence | shared `caseStudies/blockSchemas.ts` | no |
| Node (schema) | `caseStudy/schema.ts` | no |
| Insert command | `editor/insertCommands.tsx` (hand-written list) | no |
| Inspector | `editor/blocks/inspectors.tsx` | no |
| Preview / HTML renderer | `caseStudy/blockRenderers.tsx`, `CaseStudyArticle.tsx` | no |
| Markdown, plain text | — | doesn't exist |
| Server validation of a block's settings | — | doesn't exist |

That is how a block can ship half-done, which the plan forbids. The contract makes every part a
required entry, checked by typecheck where possible and by an offline test everywhere else.

Three things found while drafting this, which the contract has to fix whatever else is decided:

1. **A document containing a block type the editor doesn't know opens as an empty page.** Tiptap 3.33
   (`@tiptap/core`, `createNodeFromContent`) catches the "Unknown node type" error, logs a console warning and
   returns an empty document. Any edit then autosaves the empty page over the real one. Version history
   keeps a copy at most every 10 minutes, so work can be lost. Today this can only happen if a frontend is
   rolled back after documents use a newer block. Phases 4–5 add about 50 block types, so it becomes a real
   risk at every deploy. (Confirmed from the source and a Node reproduction of the error. Not yet
   reproduced end to end in a browser: that becomes a test.)
2. **The preview has the same weakness, but loud:** `@tiptap/static-renderer` throws on an unknown type,
   so the preview page fails with a server error.
3. **The server stores block settings without checking them.** `PUT /api/app/documents/:id` checks media
   paths, the 2 MB cap and section ids. A block's `config` is otherwise stored as the browser sent it: any
   keys, any lengths, any URLs. The renderers are written defensively (React escapes text; embeds and links go
   through allowlists at render time), so this isn't an exploit today. But the plan's "no unsafe arbitrary
   markup" should be enforced where data is stored, not only where it is drawn.

## 2. Decisions to approve

| # | Decision | Recommendation | Why |
|---|---|---|---|
| B1 | **How blocks store what people write** | **Prose is document content; facts are attributes.** Text a reader reads (a requirement's statement, a user story, a step's instruction, a scenario's Given/When/Then) is ProseMirror content inside the block. Settings and short facts (priority, requirement id, HTTP method, language, version) are attributes. Visual blocks stay as they are (one `config` attribute). | Prose inside the document gets Find and replace, spellcheck, bold, links and inline code, undo per keystroke, cursor flow with Enter/Tab, and is counted by word count and review. Text hidden in a JSON attribute gets none of that. |
| B2 | **Unknown block types** | Never load or save a document the editor can't fully read. (a) Before loading, an unknown block is wrapped in a locked `unknownBlock` placeholder that keeps its original JSON and is unwrapped again on save, byte for byte. (b) The editor turns on Tiptap's content check: any other parse failure makes the editor read-only with an error, and autosave never runs. (c) The preview renders a short "This block needs a newer version of the app" notice instead of failing. (d) The API refuses to save block types that aren't in the catalogue. | Fixes findings 1 and 2. Rolling back the frontend can then never empty a document, and nobody can store made-up node types. |
| B3 | **Server-side cleaning** | Every block has a `clean` function in shared code: keep only known attributes, cap text, check enum values, safe URLs (`https`, `http`, `mailto`, `tel`, `/`, `#`), media paths through the existing ownership rule, and item limits. The API runs it on every save. For **new** blocks it is enforced from day one. For the **existing 29** it runs in report-only mode on staging documents and test fixtures first; it is enforced only once the fixtures show it changes nothing. | Fixes finding 3 without risking that a cleaner which forgot an attribute silently strips data from existing documents. |
| B4 | **Versioning and migration** | A block's `version` says which stored shape is current. Changing a shape bumps the document `CONTENT_SCHEMA_VERSION` and adds a step to the existing `migrateContent`. That path already copies the original to `studio_content_backups` before migrating on read, and is tested. Each block keeps a fixture per version, and the migrated fixture must equal the current-version one. | One migration path, already proven in Stage 2, instead of a second per-node mechanism. |
| B5 | **Syntax highlighting for code** | Add `lowlight` (highlight.js grammars, the engine behind Tiptap's own code-block extension) with a fixed list of about 20 languages. Highlighting only adds `<span>` classes to text that stays escaped. Colours come from DNA tokens. Code is never run. | The plan requires highlighting and language selection. Writing a highlighter by hand isn't sensible. It is one new dependency; no `dangerouslySetInnerHTML`. |
| B6 | **Editing structured blocks** | On the page, not in the side panel: a block's text fields are edited where they appear (B1). The inspector holds settings only (layout, numbering, which fields to show). | Typing a requirement in a side panel is slow and breaks the writing flow, which the plan calls primary. |

## 3. The contract

Two halves, because shared code has no React. Both are keyed by the stored node name (`BlockName`), so
TypeScript refuses a block that is missing from either half.

### 3.1 Shared half — `packages/shared/src/blocks/` (server and browser)

```ts
type BlockContract<Name extends BlockName> = {
  // Identity (exists today in catalog.ts)
  id: string;                        // the plan's id, snake_case ("api_endpoint")
  version: number;                   // current stored shape (B4)
  family: BlockFamily;
  label: string;
  description: string;
  searchTerms: readonly string[];
  documentTypes: 'any' | readonly DocumentType[];   // ranks suggestions; never restricts

  // Shape
  storage: 'content' | 'atom';       // B1: prose inside the block, or one config attribute
  attributes: AttributeSpec;         // every attribute it may store: type, default, enum, max length, url?, media?
  content?: string;                  // for 'content' blocks: the ProseMirror content expression
  limits?: {items?: number; text?: number};

  // Server side (B3)
  clean(node: JSONContent): {node: JSONContent; dropped: string[]};   // idempotent

  // Meaning
  isEmpty(node: JSONContent): boolean;      // for section progress and review (today every block counts as content)
  toText(node: JSONContent): string;        // plain text: word count, review, text alternative
  toMarkdown(node: JSONContent, ctx: MarkdownContext): string;        // export (wired in Phase 6)
  problems?(node: JSONContent): BlockProblem[];   // review rules (exists today in blockSchemas.ts)
  evidence?: boolean;

  // History (B4)
  fixtures: Record<number, JSONContent>;    // one realistic stored node per version
};
```

### 3.2 Editor half — `frontend/src/components/editor/blocks/` (React)

```ts
type BlockUI<Name extends BlockName> = {
  icon: LucideIcon;
  node: TiptapNode;                         // the ProseMirror node (schema.ts today)
  view?: NodeViewComponent;                 // editor rendering; required for 'atom' blocks (B6)
  insert: {id: string; group: InsertGroup; create(): JSONContent};   // ONE command used by Insert, "/", the FAB and recommendations
  actions?: BlockAction[];                  // extra items in the block handle menu ("Copy code", "Add step")
  inspector?: InspectorEntry;               // settings only (B6); omitted when there are none
  render: Renderer;                         // preview and HTML export: the same component (exists for visual blocks)
  turnInto?: TurnIntoTarget[];              // compatible conversions only
  a11y: {role?: string; label(node): string};   // how a screen reader names the block in the editor
};
```

What every block gets without asking, from the universal handle (built in T2): drag, move up/down,
insert before/after, duplicate, copy, cut, delete, Properties, ⌘/ menu, undo for all of them.

### 3.3 What "done" means for one block

A block is delivered only when all of these pass. Each is an automated check unless marked:

| # | Check | How |
|---|---|---|
| 1 | Both halves exist and agree on name, version and attributes | typecheck + offline `blockContractProblems()` |
| 2 | `clean` is idempotent and keeps every attribute of every fixture | offline |
| 3 | The fixture for each older version migrates to the current fixture | offline |
| 4 | `toText`, `toMarkdown` and `isEmpty` give the expected output for each fixture, and an empty block | offline |
| 5 | Inserted from Insert, "/" and a section recommendation, the result is the same JSON | browser (extends `editor.mjs`) |
| 6 | Typing in it, saving, reloading: the stored JSON equals the editor's | browser |
| 7 | The preview renders it, and the HTML export contains it | browser + live |
| 8 | It renders in the print (PDF) layout without overflowing an A4 page | browser |
| 9 | Keyboard only: reach, edit, leave; every control named | browser + manual note |
| 10 | Usable at 375px (stacks or scrolls, no page-wide overflow) | browser |
| 11 | Another account can't read it, and its media stays owner-only | existing live suites, plus its fixture |
| 12 | Stored unsafe input is cleaned: oversized text, bad enums, `javascript:` links, someone else's media | live |

## 4. The existing 29 blocks

Registered against the contract **without changing what they store** (the plan's
`existing_block_migration`). For each: an `attributes` spec describing today's shape, `clean` in
report-only mode (B3), `isEmpty`, `toText`, `toMarkdown`, and a fixture taken from the browser suite's real
document. The fixtures from `scripts/e2e/editor.mjs` already cover 10 of them (heading, lead paragraph, image, callout, image grid, device mockups, chart, research insights, video, table) with their trickiest attributes.

## 5. The first new blocks (Phase 3's "common new blocks")

The plan names twelve. Three exist (process timeline, flow diagram, checklist). The other nine, under B1:

| Block (plan id) | Node | Storage | Facts (attributes) | Prose (content) |
|---|---|---|---|---|
| Code block (`code_block`, upgraded) | `codeBlock` (existing) | content | `language`, `title`, `lineNumbers`, `wrap` | the code (plain text, never run) |
| Terminal (`terminal_block`) | `terminal` | content | `shell` (bash, PowerShell, …), `prompt` | alternating `terminalCommand` / `terminalOutput` lines: input and output stay distinguishable by construction |
| Parameter table (`parameter_table`) | `parameterTable` | content | `showDefault`, `showRequired` | rows of `parameter` (`name`, `type`, `required`, `default` as attributes; description as content) |
| Requirement list (`requirement_list`) | `requirementList` → `requirement` | content | per requirement: `reqId` (e.g. `FR-3`, unique in the document, checked on save), `priority` (Must / Should / Could / Won’t, optional) | the requirement's statement |
| User story (`user_story`) | `userStory` | content | – | three fields: As a … / I want … / so that … |
| Acceptance criteria (`acceptance_criteria`) | `acceptanceCriteria` → `scenario` | content | per scenario: `title`, `requirementRef` (optional link to a `reqId`) | Given / When / Then (one or more each) |
| Testimonial (`testimonial`) | `testimonial` | content | `person`, `role`, `organisation`, `consent` (`approved` / `pending` / `none`), `photo` (own media) | the quote |
| Procedure steps (`procedure_steps`) | `procedureSteps` → `procedureStep` | content | per step: `owner`, `expected` (short) | the instruction (may contain lists, code, images) |
| Reference list (`reference_list`) | `referenceList` → `reference` | content | `url` (safe schemes only), `kind` (doc, standard, issue, …) | title and note |

Each has a Markdown form agreed now, so the export in Phase 6 is mechanical. Examples:
terminal → fenced block with `$ ` before commands and output unprefixed; requirement → `- **FR-3** (Must) statement`;
acceptance criteria → `**Scenario:** …` then `Given/When/Then` lines; parameter table → a GFM table.

These nine also cover most of what Release 1 needs. Phase 4 adds the domain blocks the four templates
reference on top (API endpoint, request/response, version notice, release header, breaking change,
deprecation notice, known issue, feature update, client profile, KPI comparison, CTA, source reference …).

## 6. Order of work once approved

1. Safety first (B2): unknown-block placeholder, content check, preview fallback, server refusal of
   unknown types. A browser test proves a document with a block from "the future" opens, is read-only
   around that block, and saves back unchanged.
2. Contract types, `blockContractProblems()`, and the existing 31 blocks registered (report-only cleaners,
   fixtures, `isEmpty`/`toText`/`toMarkdown`).
3. Insert, "/" and recommendations generated from the registry (one command per block).
4. The nine blocks, two or three at a time, each to the "done" list in §3.3.
5. Phase 3 report, with the plan's evaluation.

## 7. Not decided here

- **Which domain blocks each template gets**: Phase 4, per template.
- **The Markdown and HTML ZIP export screens**: Phase 6. This contract only requires each block's Markdown form.
- **Collaboration-friendly structures** (comments on blocks, suggestions): out of scope in the plan.
