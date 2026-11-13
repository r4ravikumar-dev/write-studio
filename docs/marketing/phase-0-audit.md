# Marketing site visual system: Phase 0 audit (2026-11-13)

## Inventory
- **Routes (21):** `/`, `/product`, `/how-it-works`, `/templates`, `/templates/[slug]`, `/use-cases`, `/use-cases/[vertical]`,
  `/resources`, `/resources/guides/[slug]`, `/security`, `/about`, `/faq`, `/contact`, `/pricing`, `/privacy`, `/terms`,
  `/cookies`, `/accessibility` (all in `app/(marketing)/`), plus `/login`, `/signup`, `/forgot-password` (outside the group).
- **Shared components:** `MarketingHeader`, `MarketingFooter`, `HeroShowcase`, `ProductWalkthrough`, `TemplatesCatalog`, `ContactForm`.
- **Styles before:** one file, `theme/marketing.css` (677 lines), on top of DNA tokens + Astryx.
- **Motion deps:** `framer-motion`, `gsap`, `lenis` installed; **none used by the marketing site.** `components/motion/*` (framer) is unused there.
- **Fonts:** Outfit (primary, user's choice over DNA's Inter) + Bricolage Grotesque 600 (display). No new families needed.
- **Assets:** no `public/` folder; there are no product screenshots. Product demos are coded mock-ups.

## Defects found
| # | Severity | Issue |
|---|---|---|
| 1 | Critical | 11 tokens referenced but never defined (`--text-primary/secondary/tertiary`, `--space-04/06/08/40`, `--radius-06/08`, `--border-gray-moderate/strong`) in CSS and ~60 inline styles. Colours, padding and radii silently dropped: **the hero's primary CTA rendered invisible** (no background, grey text). |
| 2 | High | Dark-mode overrides (`prefers-color-scheme: dark`) in a light-only DNA system: purple-on-black eyebrows on dark-mode machines. |
| 3 | High | ~580 inline `style={{}}` with raw px across pages (home 93, product 59, template detail 43). |
| 4 | High | `ContactForm` doesn't send anything: it shows "received" after a `setTimeout`. Needs a real endpoint or honest copy (not a styling fix; flagged). |
| 5 | Medium | `HeroShowcase` Editor/Outline/Preview buttons change only their own styling; the content never changes. |
| 6 | Medium | Accessibility: mobile menu was `role=dialog aria-modal` with no focus handling or Escape; links' `aria-label`s differ from visible text (WCAG 2.5.3); template filters used `role=tab` without tab panels; form errors were one banner, not per field; no skip link; footer column headings were `h4` after `h2`. |
| 7 | Medium | Header breaks at 375px (menu button pushed off-screen). |
| 8 | Low | Page titles doubled: "… — Write Studio · Write Studio" (pages add the suffix and the layout template adds it again). |
| 9 | Low | Breakpoints scattered (600/640/880/960/980/1024) and not `screen`-only (print used phone layout). |
| 10 | Low | Raw durations (`0.15s`, `0.2s`, `all`) and raw shadows (`rgba(...)`). |

## Prioritised refactor list
1. Token layer (`theme/marketing/tokens.css`). Done, Phase 1.
2. Shared components on tokens (`theme/marketing/components.css`, header, footer, forms, cards, chips). Done, Phase 2.
3. Motion system + nav scroll state + sticky storytelling (Phase 3).
4. Remove inline styles page by page onto the new classes (Phase 4).
5. Contact form backend or copy change; make showcase tabs real (needs a product decision).
6. Fix duplicated page titles.
