# Stage 4: advanced visual composition (completion report)

> Exit criterion: "Polished, varied layouts without a separate design tool."
> Done on staging, 2026-11-11. Production untouched. Scope: better presets and layouts for the visual blocks
> (blueprint control levels: presets → inspector → direct manipulation; direct manipulation of devices was
> built in Release 3).

## What was built

| Area | Delivered |
|---|---|
| Preset galleries | Every visual block's inspector opens with **Presets**: named layouts with a small drawn schematic, two per row. One click sets the layout; pictures, text, figures and steps are never touched. The preset that matches the block's current settings is marked (`aria-pressed`); changing any setting afterwards simply unmarks it. 45 presets across 12 blocks (image grid 6, comparison 3, showcase 4, device mockups 4, split layout 5, quote 4, metrics 4, callout 4, timeline 4, screen sequence 3, annotated screenshot 2, flow diagram 2; device presets keep each device's picture). Data in `components/editor/presets.ts`; gallery in `PresetGallery.tsx`. |
| New layout options | **Width** (text width / wide) for image grid, split layout and comparison; **Background** (none / muted / brand / dark) for image grid, split layout and metrics; **Number size** (regular / large) and **Alignment** for metrics; **Alignment** for quotes (centred, including a centred version between brand rules). All optional fields, so older documents render exactly as before. |
| Wide in the preview | The preview's text column is `--content-max` (720px), so the old "frame" width of the showcase never widened anything. Wide blocks now use `--block-wide-max` (64rem), centred on the column and capped by the window's gutters (no sideways scroll). In the editor, wide blocks reach into the sheet's margins (container units), so the difference is visible while writing. |
| Consistency | "Background surface" is now "Background" everywhere. Dark backgrounds switch text to the inverse colour. |

## Verification

- `scripts/security-suite.sh <log>`: all passing (33 / 23 / 30 / 55 / 35 / 30 / 27).
- Browser: metrics "Simple row" marked on insert → "Dark band" applied (dark panel, large centred figures, inspector reflects it); split layout "Brand band" and quote "Big statement"; preview carries the settings (`data-block-surface`, `data-size`, `data-text-align`, `data-block-width`); wide split = 1,024 px against a 728 px column with no horizontal overflow; deleting a block (from its bar and from the inspector, with real clicks, with and without a preset) is clean.
- Found and not caused by Stage 4: the test case study had stray paragraphs with the block bar's old button labels and the Opening heading turned into a list, apparently from earlier manual editing. Restored to the clean template. Grip dragging doesn't reproduce it.

## Not done / follow-ups

- **Presets at insert time** (choosing a preset from the Insert menu): blocks still start from their default and the gallery is one click away in the inspector.
- **Saving your own presets**: not built (would need storage; the blueprint lists custom frameworks/presets as P2).
- **Image grid captions per picture** and **corner radius for grids**: not built.
- **Automated visual tests** of each preset in the preview.
