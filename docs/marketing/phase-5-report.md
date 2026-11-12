# Marketing site: Phase 5 accessibility & performance (2026-11-13)

## New repeatable checks (no new dependencies)
- `node scripts/e2e/marketing-a11y.mjs [baseUrl]`: headless Chrome (scripts/e2e/chrome.mjs) + the locally installed axe-core 4.14.
  - 28 routes × desktop 1440 and phone 375: axe WCAG 2.0/2.1/2.2 A+AA; exactly one h1; no heading skips; one `main`; no horizontal overflow; titles unique and not repeating the brand.
  - Keyboard on 6 pages: Tab through 60 stops; first stop is the skip link; every stop visible, with a focus indicator, never inside an inert/hidden panel.
  - Reduced motion (emulated `prefers-reduced-motion: reduce`) on 3 pages: nothing hidden for reveal; no transform or animation on story panels, showcase, floating toolbar.
- `node scripts/e2e/marketing-perf.mjs [baseUrl]` (against `next start`): phone 375, 4× CPU, 1.6 Mbps/150 ms; LCP, CLS (after scrolling the whole page), TBT, active backdrop filters. Budgets LCP ≤ 2.5 s, CLS ≤ 0.1, TBT ≤ 300 ms.

## Results
- Accessibility: **65/65 pass** on dev and on the production build.
- Performance (production, throttled phone):

| Route | LCP | CLS | TBT | Glass |
|---|---|---|---|---|
| / | 1.44 s | 0 | 27 ms | 1 |
| /product | 1.34 s | 0 | 0 | 1 |
| /how-it-works | 1.34 s | 0 | 0 | 1 |
| /templates | 1.22 s | 0 | 0 | 1 |
| /templates/sop | 1.26 s | 0 | 0 | 1 |
| /use-cases/operations | 1.32 s | 0 | 0 | 1 |
| /resources | 1.36 s | 0 | 0 | 1 |
| /privacy | 1.45 s | 0 | 0 | 1 |
| /contact | 1.23 s | 0 | 0 | 1 |

- All marketing pages are static (○ / ● SSG). No framer-motion, GSAP or Lenis in any marketing bundle; marketing's own JS is ~6 KB gz.

## Defects found and fixed
1. **Contrast (serious):** inactive sticky-story steps were dimmed with opacity 0.5 (2:1). They now recede by colour (secondary title, grey ticks), all AA.
2. **Heading skip:** the hero showcase's mock document used h3 directly under the page h1; mock titles are now paragraphs inside the labelled figure.
3. **Keyboard (serious, phone):** the showcase code sample scrolled sideways with no focusable content; code now wraps on phones.
4. **Bundle:** `/templates` shipped the whole shared template package to the browser (+63 KB gz). Card data is now built on the server (`lib/marketing/templateCards.ts`); 243 → 179 KB gz.

## Not fixed (recommendation)
- **CSS weight:** every page loads ~83 KB gz of CSS from the single root `globals.css`; marketing's share is ~16 KB. The rest is Studio CSS plus dead portfolio CSS in `globals.css` (~35 KB gz, CLAUDE.md §9). Splitting CSS per area (marketing layout vs studio layouts) and deleting the dead portfolio rules would roughly halve it, but changes Studio cascade order and needs the editor e2e suite with the backend running. Proposed as a separate task.
- JS baseline (~170 KB gz) is the React 19 + Next 16 runtime, Vercel Analytics (~5 KB) included.
- Screen-reader testing with VoiceOver/NVDA was not done (automated checks and semantics only).

## Follow-up: CSS split per area (2026-11-13)
- Removed ~3,200 lines of dead portfolio CSS from `globals.css` plus leftovers (side work, PDF downloads, old block bars, three `studio-*` rules) and the orphaned components that used them. Two live rules hidden in the dead range were caught and kept: the "∙ Required" field marker colour and the Astryx dialog/backdrop styles.
- Root `globals.css` is now just the reset; `app/studio.css` loads the Studio in the original order; `theme/marketing/index.css` loads only what the public site uses (no Astryx component CSS).
- **CSS per page (gzip):** marketing 91 → **22 KB** (−76%); Studio and sign-in 91 → **71 KB** (−22%).
- **Marketing LCP** (throttled phone, production): ~1.3 s → **~0.75 s**. Accessibility still 65/65.
- **Proof of no visual change:** `scripts/e2e/style-snapshot.mjs` captured 45 computed properties of every element on 12 routes (8 Studio/auth, 4 marketing) at 1440 and 375, on a build with the original CSS and on the new one: identical apart from one mid-animation frame value. Signed-in Studio screens can't be reached without creating an account in the shared Supabase project, so they're covered by the order argument (same files, same order) and a dialog probe, not by a snapshot.
- Now-unused dependencies: `framer-motion`, `gsap`, `@gsap/react`, `lenis` (no imports left).
