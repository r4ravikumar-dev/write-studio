# Stage 5: review, preview and output (completion report)

> Exit criterion: "Users review and take a complete case study outside the app."
> Done on staging, 2026-11-11. Production untouched.

## What was built

| Area | Delivered |
|---|---|
| Review engine | `packages/shared/src/caseStudies/review.ts`: `reviewCaseStudy()` is pure and deterministic (no AI, no score). It returns the **story checklist** (context, problem, contribution, decisions, evidence, outcome), **warnings** grouped as Structure / Content / Visuals / Technical with *Fix* or *Consider*, and **section progress**. Every warning points at its section and, for block problems, the block. Checks: no title; no sections; empty sections (required = fix, optional or your own = consider); sections marked for review; pictures without alt text (decorative excluded), including inside grids, comparisons, devices and sequences; visual blocks missing their media; figures without value or label; embeds that can't be shown; cover without alt text; no thumbnail. |
| Review dashboard | **Review** in the editor's top bar opens a dialog: a segmented progress bar (complete / for review / in progress / not started, with a text legend), the story checklist (*Go to section*, or *Add section* when the story has none for it), then the warnings with direct actions: **Go to section**, **Go to block** (selects the block, scrolls to it, opens its settings) or **Open details** (cover alt text, thumbnail). Worked out from the document when it opens. |
| Section progress on cards | Migration `0012`: `sections_total` and `sections_complete` are **stored generated columns** computed by Postgres from the document (top-level level-2 headings; complete = `sectionStatus` "complete"), so they never disagree with it, can't be written directly, and adding them didn't change any `updated_at`. Cards show "4 of 10 sections complete" with a thin bar (not for unfinished setups). |
| Restyled preview | A calm reading page in the 720px column instead of the old portfolio hero: eyebrow (project type · label · area), title (one `<h1>`), subtitle, project **facts** (role, team, timeline, platform; only filled ones), a wide cover, the summary, **"In this case study"** contents (when there are 3+ written sections) linking to anchored section headings, then the story. Sections written under a placeholder title now read under the framework's title (they used to lose their heading); fully empty sections are left out. |
| PDF | **Export → Save as PDF** opens the browser's print dialog ("Save as PDF"), with a print stylesheet: A4 with margins, no app chrome, wide blocks fit the page, figures/blocks/tables/table rows never split, headings never left at the foot of a page, interactive bits (slider handle, embedded players) left out, backgrounds kept. |
| HTML | **Export → Download HTML**: one self-contained file built in the owner's browser from their private preview: the page's styles, the two fonts and every picture embedded (files over 20 MB are left out and the user is told how many), links to attached files embedded, a tiny script so the before/after slider still works. No private paths remain; nothing is uploaded or made public. |

## Verification

- `packages/shared/test/review.test.ts`: 8/8. `test_studio_review_live.py`: 16/16 (progress columns, generated columns can't be written, the preview's h1/facts/sections/anchors/no metadata, cross-user 404).
- Browser: Review dialog (progress, checklist, grouped warnings), *Go to section* lands on the section with the guide switched to it, *Go to block* selects the metrics block and opens its settings; the card shows "2 of 10 sections complete"; the preview's contents links resolve; HTML export captured in the page: fonts and styles embedded, no private paths, rendered in a sandboxed frame with the right fonts (first attempt fell back to system fonts because font URLs in the stylesheet were relative, fixed); *Save as PDF* calls print and the print rules load.
- Not verified by hand here: the printed PDF itself (the print dialog can't be driven from the test browser), and HTML export with real pictures and video (the test account's library is empty). Worth one manual try of each.

## Not done / follow-ups

- **Server-side PDF** (a real file without the print dialog) would need a headless browser on the server; the blueprint's "standalone HTML ZIP" is delivered as a single HTML file instead.
- **Markdown / JSON export** (P2).
- **Ready for review filter** on the dashboard (P1 filters).
- The live tests make network calls with no timeout; a slow Sydney round trip can hang a run (seen twice today). Adding timeouts to the shared test helper is a small follow-up.
