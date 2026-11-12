# Write Studio marketing website: visual design implementation report

Final QA, 2026-11-13. Branch `marketing`, nothing committed. Detail per phase: `phase-0-audit.md`, `design-system.md`,
`phase-4-report.md`, `phase-5-report.md`.

## 1. Repository audit
21 public routes (18 in `app/(marketing)`, plus `/login`, `/signup`, `/forgot-password`), 6 shared marketing components, one
677-line `marketing.css` on top of DNA v2.0 + Astryx. Motion libraries (framer-motion, GSAP, Lenis) were installed but unused by
marketing. No product screenshots exist (`public/` is absent). See `phase-0-audit.md`.

## 2. Issues found
Critical: 11 undefined tokens silently dropped colours and spacing; the hero's primary CTA rendered invisible. High: dark-mode rules
in a light-only system; ~580 inline styles; a contact form that faked delivery; demo tabs that did nothing. Medium: a11y defects
(modal menu without focus handling, label/name mismatches, misused tab roles, heading skips); header overflow at 375px; doubled page
titles; template outlines that didn't match the real templates; ~25 claims in the copy contradicting the product.

## 3. Design tokens
`theme/marketing/tokens.css`: 237 `--m-*` tokens layered on DNA semantic tokens (no hex). Families: surfaces, text, borders,
brand/interactive, status, type (DNA font-size steps per breakpoint, DNA line heights), spacing (DNA scale + section/component
roles), sizing (containers, controls, icons), borders/radius roles, elevation roles, Liquid Glass (light/elevated/dark), motion
(durations, easings, distances, stagger). Breakpoints 640/1024/1280, screen-only. Light only (DNA).

## 4. Components modified
MarketingHeader (floating glass bar, scroll state, disclosure menu, skip link), MarketingFooter (data-driven, correct headings),
HeroShowcase (real Editor/Outline/Preview views from the real Developer documentation sections), ProductWalkthrough (sticky story),
TemplatesCatalog (toggle chips, live count, server-built data), ContactForm (opens an email draft to `SUPPORT_EMAIL`; never claims
delivery).

## 5. New shared components
`BrandMark`, `TemplateCard`, `motion/RevealObserver`, `motion/StickyStory`, `motion/FloatingCta`; CSS: `components.css`
(buttons, cards, badges, chips, forms, FAQ, CTA band, glass, header/footer, demo UI kit), `patterns.css` (hero head, breadcrumbs,
check lists, rows, panels, steps, tables, legal doc head), `pages/*.css`, `motion.css`; `lib/marketing/templateCards.ts`, `site.ts`,
`supportEmail.ts`.

## 6. Liquid Glass
Three variants (`.m-glass`, `--elevated`, `--dark`) with opaque fallbacks for no backdrop-filter, Reduce Transparency and Increase
Contrast; lighter blur on phones. Used only on floating layers: nav bar (glass once scrolled), phone menu, floating template CTA,
showcase selection toolbar. Measured: one active glass surface per screen.

## 7. Motion and scroll
CSS-only (opacity/transform), no motion library on marketing pages. Section reveal (below-the-fold only, staggered, nothing hidden
without JS or in print), nav surface on scroll, sticky storytelling on Home and How it works (≥1024px; plain list below), showcase
view cross-fade and rise-in (scroll timeline where supported), floating CTA, reading progress on guides. Reduced motion verified by
emulation.

## 8. Page-by-page
All 18 pages rebuilt on shared classes (~580 inline styles → 1 data value). Home and How it works: sticky walkthroughs with honest
product states. Product: consistent alternating splits. Templates: search + chips + shared cards; detail pages show the real outline
and a floating CTA. Use cases: shared cards, non-existent templates removed. Resources/guides: editorial reading layout, related
reading, progress bar. Security/privacy/legal: one reading structure; claims corrected to match the system. FAQ: native accordion.
Contact: email draft.

## 9. Responsive
Checked at 375, 768, 1024 and 1440: no horizontal overflow on any page; nav switches to the menu below 1024; sticky stories become
inline lists below 1024; showcase code wraps on phones; touch targets ≥40px on coarse pointers.

## 10. Accessibility (automated, executed)
`scripts/e2e/marketing-a11y.mjs`: **65/65 pass** on dev and production. That's axe-core (WCAG 2.0/2.1/2.2 A+AA) on 28 routes × 2
widths, structure (one h1, no skips, one main, unique titles), keyboard (skip link first, visible focus, never into hidden panels)
on 6 pages, reduced motion on 3. Not done: manual screen-reader testing.

## 11. Performance (production build, throttled phone: 4× CPU, 1.6 Mbps, 150 ms)
`scripts/e2e/marketing-perf.mjs`, all pages: **LCP 0.57–0.78 s, CLS 0, TBT ≤ 5 ms**. CSS per marketing page 91 → **22 KB gz** after
the per-area split (Studio 91 → 71 KB). JS: ~179 KB gz (React/Next runtime; marketing's own ~6 KB); `/templates` cut from 243 KB.
All marketing pages static.

## 12. Routes and CTAs
`scripts/e2e/marketing-qa.mjs`: **pass**. 40 pages crawled (incl. sitemap), 53 distinct internal links and their anchors resolve;
metadata (title, description, canonical, one h1) on every page; no placeholder text; no links to private media. Every "Use this
template" CTA carries its template through sign-up and sign-in to `/studio/documents/new?template=<id>` (9/9); signed-out `/studio`
redirects to sign-in, signed-out files 404, off-site `next` rejected. Client-side navigation between sections: no reloads, correct
active item, reveal re-runs, phone menu closes.

## 13. Automated tests executed
marketing-a11y 65/65 · marketing-qa all pass · marketing-perf 9/9 within budget · style-snapshot (CSS refactor): identical on 12
routes × 2 widths · `scripts/security-suite.sh` offline: pass (static checks, types, lint, builds, Django 26/26) · shared package tests
all pass (marketing 5/5, incl. new outline test) · `next build` pass. Live/staging suites not run (the Supabase project is shared with
production).

## 14. Remaining issues
1. **Production config:** set `SUPPORT_EMAIL=contact@graphikx.in` in the Vercel `write-studio` project and redeploy; the contact page
   says "not available yet" until then. `SITE_URL` must stay set in production (canonical links, sitemap, robots).
2. **Owner decisions:** unverifiable promises still in the copy ("100% IP ownership", "don't train public AI models", "no hidden
   fees", "Join professionals…", WCAG 2.2 AA conformance). Privacy and cookie pages were edited for accuracy: legal review needed.
3. **No approved designs or product screenshots** to compare against; demos are coded mock-ups of real Studio states.
4. **Social image:** `twitter:card` is `summary_large_image` but there's no `og:image`.
5. **Unused dependencies:** framer-motion, gsap, @gsap/react, lenis.
6. **Pre-existing Studio bug:** dialogs reference an undefined `--glass-highlight`, so their drop shadow never renders.
7. **Not tested:** screen readers; signed-in Studio screens visually (covered by CSS order + probes, not snapshots).

## 15. Evaluation

| Category | Weight | Score | Basis |
|---|---:|---:|---|
| Visual consistency | 15 | 14 | One token/component system on every page; no real screenshots |
| Typography and readability | 10 | 9 | DNA steps, measures, balanced headings |
| Spacing and layout | 10 | 9 | Token-driven sections/containers; 640–767 checked via 375/768 only |
| Colour and contrast | 10 | 10 | axe contrast clean everywhere |
| Component quality | 10 | 9 | States, focus, disabled/busy; no shared dropdown needed yet |
| Motion and interaction | 15 | 13 | Purposeful, reduced-motion safe; showcase is mock-up based |
| Responsive behaviour | 10 | 9 | 4 widths verified, no overflow |
| Accessibility | 10 | 9 | Automated + keyboard pass; no screen-reader run |
| Performance | 5 | 5 | LCP < 0.8 s throttled, CLS 0 |
| Code maintainability | 5 | 5 | Layered CSS, shared components, repeatable test scripts |
| **Total** | **100** | **92** | |

**92/100, no critical defects open.** Ready for final review once items 1 and 2 above are done (production config, owner and legal
review of the remaining copy).
