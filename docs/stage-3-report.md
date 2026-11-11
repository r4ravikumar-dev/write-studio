# Stage 3: hybrid editor (completion report)

> Exit criterion: "Write, structure and compose without leaving the editor."
> Done on staging, 2026-11-11. Production untouched. Scope agreed: title on the page, a Media mode in
> the side panel, the bubble menu not covering blocks, and keyboard and screen-reader testing.

## What was built

| Area | Delivered |
|---|---|
| Title on the page | The title and subtitle are plain text fields at the top of the sheet (`TitleFields.tsx`), in the display face and lead size. Enter (or ↓ at the end) moves from the title to the subtitle, then into the story; ↑ at the start of the story goes back up. They save with the rest (autosave) and a draft still on its generated short name follows the title. The browser tab follows the title (`Edit: <name>`). The side panel's Headline fields were removed (one place to edit); its first group is now Summary. |
| Media mode | A fourth side-panel tab, **Media** (tabs: Guide · Block · Media · Details). Your images, videos and files with a kind switch and search; **Insert** puts one at the cursor; dragging one onto the page drops it where it lands; **Upload** adds a file to this case study and inserts it. Images without alt text say so. Private files only (`/studio/files`); the server still refuses any path that isn't the user's own on save. |
| Bubble menu | Inside a visual block with text (split layout, quote, callout) the block's bar sits above the text, so the bubble now opens **below** the selection there (two bubble menus with different placements; `flip` and `shift` keep them on screen). Fixed: the bubble and the table bar didn't move when the story column scrolled (they only listened to the window); the editor now asks them to reposition on column scroll (one transaction per frame, no document change). |
| Toolbar | The text style picker keeps a minimum width, so "Heading 1" isn't cut to "Headi…" when the outline and side panel are both open. |

## Keyboard and screen-reader audit (findings → fixes)

Tested in the browser with the accessibility tree, keyboard only (Tab, Enter, Escape, arrows).

| # | Finding | Fix |
|---|---|---|
| A-1 | No landmarks on the editor page | Top bar `banner`, outline `navigation` ("Story outline"), canvas `main` ("Story"), side panel `complementary` ("Side panel") |
| A-2 | No `<h1>` | A visually hidden `<h1>` "Edit: <title>", kept in step with the title |
| A-3 | 41 tab stops before the story | Skip links, first in the tab order: "Skip to the story", "Skip to the outline" (visible on focus) |
| A-4 | Block bar buttons read "Move up", "Delete block" with no target | Named per block: "Move image grid up", "Delete callout", "Properties of comparison"… |
| A-5 | Empty section headings read as a blank heading (the title is only a CSS placeholder) | `SectionLabels` decoration: `aria-label` with the section title on empty framework headings (never stored) |
| A-6 | The save status was a live region announcing on every pause in typing | No longer live; save failures still appear as an alert |
| A-7 | Drawers (outline below 1280px, side panel below 1024px) didn't take focus or close with Escape | Opening the outline drawer focuses the current section; Escape closes either drawer and returns focus to its button; the scrims are out of the tab order |
| A-8 | Side panel toggle said "settings panel" though it holds four modes | Renamed "Show/Hide side panel" |
| A-9 | Focus was lost after renaming a section, and after choosing one in the outline | Returns to the row / moves into the story (Stage 2 follow-up) |

Checked and fine: the story is `role="textbox"` labelled "Case study text"; title fields are labelled; outline rows announce their state ("Opening, Not started") and the current one is `aria-current`; menus, dialogs and the segmented controls come from Astryx with proper roles.

## Verification

- `scripts/security-suite.sh <log>`: all passing (33 / 23 / 30 / 55 / 35 / 30 / 27). One run hit a network time-out to the Sydney project and passed on re-run.
- Browser: title typing, Enter flow, autosave and reload; Media tab, kind switch and empty state; bubble below the selection inside a callout and following the column scroll (+100 px / −150 px); Tab → skip link → Enter into the story; landmarks, `<h1>`, heading labels and block button names in the accessibility tree; outline drawer focus and Escape at tablet width.
- Not exercised with a real file: Insert / drag / upload in the Media tab (the test account's library is empty after the earlier clean-up). They reuse the same insert path as the existing media picker; worth a quick try with a real image.

## Not done / follow-ups

- **Screen-reader passes with real assistive technology** (VoiceOver, NVDA): this audit used the accessibility tree and keyboard only.
- **Toolbar roving focus** (one tab stop with arrow keys, per the ARIA toolbar pattern): each button is still its own tab stop; the skip links cover getting past it.
- **Automated browser tests** (Playwright, with axe) remain the main testing gap.
