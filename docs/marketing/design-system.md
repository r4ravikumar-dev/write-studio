# Marketing design system (tokens + components)

`theme/marketing/tokens.css` → `theme/marketing/components.css`, imported by `app/globals.css`.
Three layers: **DNA primitives** (`--color-*`, `--size-*`, `--font-size-*`) → **DNA semantic** (`--bg-*`, `--text-*`, `--border-*`)
→ **marketing** (`--m-*`). Components read only `--m-*`. No hex outside `dna-tokens.css`. Light only (DNA has no dark mode).

## Token families
| Family | Tokens | Notes |
|---|---|---|
| Surfaces | `--m-bg-page` white · `--m-bg-muted` · `--m-bg-sunken` · `--m-surface-card/raised/floating` · `--m-bg-inverse` · `--m-overlay-scrim` | Hierarchy by surface + border + elevation |
| Text | `--m-text-primary/secondary/muted/subtle/inverse/link/brand/disabled` | `secondary` (5.3:1) is the smallest text allowed; `subtle` (3.6:1) only ≥18px |
| Borders | `--m-border-subtle/default/strong/interactive/focus/brand-soft/inverse` | |
| Brand & interactive | `--m-brand(-hover/-active/-soft/-softer)`, `--m-on-brand`, `--m-btn-*`, `--m-focus-ring`, `--m-selection-bg` | Primary = DNA brand purple (white text 4.9:1) |
| Status | `--m-success/warning/danger/info-fg/bg` | Meaning only |
| Type | `--m-display-1..3`, `--m-h1..h6`, `--m-body-lg/body/body-sm`, `--m-caption`, `--m-label`, `--m-eyebrow`, `--m-button-*`, `--m-nav`, `--m-code`; leadings, tracking, `--m-measure*` | DNA font-size steps only; each token steps down at tablet and phone. DNA line heights (display 1.25, heading 1.3) |
| Spacing | DNA `--space-N` is the scale; `--m-gap-*`, `--m-card-padding(-lg)`, `--m-grid-gap`, `--m-section-hero/section/compact`, `--m-section-head-*` | Section values responsive |
| Sizing | `--m-container` 1240 · `-wide` 1400 · `-narrow` 880 · `-reading` 720 · `--m-gutter` 24/20/16 · `--m-control-sm/md/lg` 36/44/52 (40 floor on touch) · `--m-icon-*` | |
| Borders/radius | `--m-border-thin/thick`, `--m-radius-xs..3xl/full`; roles `-control` (capsule) `-input` (8) `-card` (16) `-menu` `-showcase` (24) `-band` (32) | |
| Elevation | `--m-shadow-xs..xl`; roles `-card` (200) `-card-hover` (300) `-menu` (400) `-floating` (500) `-showcase` (600); `--m-z-*` | DNA elevation usage |
| Glass | `--m-glass-light/elevated/dark-bg/blur`, `-border(-dark)`, `-highlight`, `-tint`, `-fallback(-dark)` | Extends Studio `--glass-*`; lighter blur on phones |
| Motion | `--m-duration-instant..showcase`, `--m-ease-standard/enter/exit/emphasized`, `--m-distance-sm/md/lg`, `--m-stagger` | Reduced motion zeroes distances and long durations |

Breakpoints (constants, `screen`-only): phone <640, tablet 640–1023, desktop ≥1024, large ≥1280.

## Components (classes)
- **Layout:** `.m-container(-narrow/-wide/-reading)`, `.m-section(-hero/-tight)` + `--muted/--brand`, `.m-section-head(--center)`, `.m-stack(-sm/-lg)`, `.m-cluster`, `.m-actions`, `.m-grid-2/3/4`, `.m-split`.
- **Type:** `.m-title-display/h1/h2/h3/h4`, `.m-subtitle`, `.m-text(-sm/-strong)`, `.m-caption`, `.m-meta`, `.m-eyebrow`, `.m-link`, `.m-prose`.
- **Buttons:** `.m-btn` + `-primary/-secondary/-outline/-ghost/-link/-icon/-inverse/-inverse-ghost`, sizes `-sm/-lg`, `-block`; disabled and `aria-busy` states.
- **Cards:** `.m-card` + `--raised/--lg/--muted/--interactive`; parts `-icon/-title/-desc/-meta/-facts/-footer/-link`; `.m-card-stretch` makes one link cover the card (hover + focus ring on the card).
- **Badges/chips:** `.m-badge` + `--success/--brand/--warning/--info`; `.m-chip[aria-pressed]`; `.m-segmented`.
- **Forms:** `.m-form`, `.m-field`, `.m-label(-optional)`, `.m-input/.m-select/.m-textarea` (`aria-invalid` styling), `.m-help`, `.m-error-text`, `.m-search`, `.m-alert--error/success/info`.
- **Other:** `.m-faq-*` (native `<details>`), `.m-banner-cta` (DNA primary gradient), `.m-glass/--elevated/--dark`, header/footer, `.m-skip-link`, `.m-empty`.

## Glass rules
Glass only on floating layers: the nav bar, the mobile menu, future floating CTA and showcase controls.
Never behind paragraphs or on cards. Falls back to opaque white under Reduce Transparency, Increase Contrast or no `backdrop-filter`.

## Motion (Phase 3, `theme/marketing/motion.css` + `components/marketing/motion/`)
No motion library on marketing pages: CSS animates opacity and transform only; three small client helpers toggle data attributes.
| Pattern | Where | How |
|---|---|---|
| Section reveal | Every marketing page, automatically: `.m-section-head`, items of `.m-grid-*`/`.m-split`, FAQ items, CTA band, `[data-reveal-item]`; opt out with `data-no-reveal` | `RevealObserver` (in the marketing layout) marks only below-the-fold elements `pending`, reveals on entry with a 70 ms stagger (max 5), then sets `done` so hover transitions return. Nothing is hidden without JS; print shows everything. |
| Nav surface | Header | Transparent at the top, glass once `scrollY > 8` (`data-scrolled`, rAF-throttled, no re-render). Fixed height: no layout shift. Solid while the phone menu is open. |
| Sticky story | `StickyStory` (home walkthrough now) | ≥1024 px: text steps scroll, the visual is pinned and cross-fades; the step crossing the screen's middle is active; progress segments jump to a step. Below 1024 px: plain list, visual inline under each step. Normal scrolling throughout. |
| Showcase | `HeroShowcase` | Editor / Outline / Preview are real views (cross-fade); glass selection toolbar floats over the draft; the frame rises slightly as it enters (CSS `view()` timeline where supported). |
| Floating CTA | Template pages (`FloatingCta`) | Glass bar appears after the hero's buttons leave the screen and hides near the footer; `inert` while hidden. |
| Reading progress | Guides | CSS `scroll()` timeline, no JS; absent where unsupported. |

Reduced motion: no reveal offsets, no showcase/parallax/toolbar animation, story panels swap with a short fade, smooth scrolling off. State changes still happen.
Anchors land below the floating header (`scroll-padding-top` on pages with `.marketing-page`).
