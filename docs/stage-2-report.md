# Stage 2: story structure & guidance (completion report)

> Exit criterion: "Users organise and write a complete narrative without a fixed template."
> Done on staging, 2026-11-11. Production untouched.

## Decision

**Heading-based sections** (chosen by the product owner over the blueprint's `caseStudySection` wrapper node):
a section is a top-level level-2 heading and everything after it up to the next one. The heading carries the
section's id, framework key and status. Typing, Enter/Backspace, paste, the slash menu, find and every visual
block work exactly as before, and the outline is always derived from the document (one source of truth).

## What was built

| Area | Delivered |
|---|---|
| Document schema v2 | Section headings carry `sectionId` (unique per document), `section` (framework key) and `sectionStatus` (`review` / `complete`, or none). "Not started" and "In progress" are worked out from the content, never stored, so they can't go stale; word count is never used. |
| Migration (v1 → v2) | Pure and tested (`migrateContent`): untouched template hints become placeholders, section headings get ids. The API runs it **when a v1 document is read**, after copying the original to `studio_content_backups` (recoverable), and only if nothing was saved meanwhile. Never done silently in the browser. Every save is normalised (unique ids, valid status, no section metadata on non-sections) and stored as v2. |
| Story outline (left) | Every section with its state (icon + screen-reader text), "N of M sections complete". Select to go to it. Per-section menu: Mark complete / ready for review (or clear), Rename (inline; Enter saves, Escape cancels), Duplicate, Move up/down, Delete (confirmation; undoable). Drag by the grip to reorder. Add section: a new one after the current section, or a framework section that isn't in the document yet. Docked from 1280 px; a drawer below (top-bar Outline button). |
| Guidance (right, "Guide" tab, the default) | For the section the cursor is in: position, purpose, status control (Writing / Review / Complete), Questions to answer, Evidence to include, Visuals that work here (one click adds that block at the end of the section), a private note, Previous / Next section. Groups collapse and stay collapsed (per browser). The user's own sections get general guidance. All guidance comes from the framework data; nothing is AI and nothing goes into the document. |
| Private notes | `studio_section_notes` (migration `0011`): one per case study + section id, up to 5,000 characters, autosaved; empty deletes it. Owner-only (API scoping, a DB trigger checking the owner, deny-all RLS); not in the document, preview or copies; deleted with the case study. |
| Preview | Each section renders as `<section class="cs-section">` (`display: contents`, so the layout is unchanged). Section metadata is never rendered. |

## Verification

- `scripts/security-suite.sh <log>`: all passing, including the new `test_studio_sections_live.py` (30 checks). The documents and setup tests were updated for the section ids the server now adds.
- Browser (desktop 1463 px and tablet 768 px): outline navigation, typing changes the state to In progress, Mark complete, Move up (content moves with it), Rename (and back to the framework title = placeholder again), Duplicate (new id, hint shows), Delete with confirmation and announcement, Add comparison from the guide (lands at the end of the section), private note autosave and reload, the migration of the existing test case study (backup written), preview sections, the outline drawer.
- Fixed during testing: (1) a draggable outline row swallowed clicks on its menu button, so only the grip is draggable now; (2) the placeholder callback read the previous document during a transaction ("Position out of range" when adding at the end), so a `LatestDoc` plugin now gives it the document being applied; (3) focus returns to the row after renaming, and to the editor after choosing a section.

## Not done / follow-ups

- **Story completeness review** (the checklist across context, problem, contribution, decisions, evidence, outcome) and section progress on dashboard cards: Stage 5 (Review).
- **Analytics** (`section_added`, `section_reordered`, `guidance_opened`): waiting for the owner's choice of tool.
- **Collapse section groups** in the outline (blueprint "collapse groups") isn't built; sections aren't grouped yet.
- **Browser end-to-end tests** (Playwright) are still a gap; this stage is covered by API tests and a manual walkthrough.
