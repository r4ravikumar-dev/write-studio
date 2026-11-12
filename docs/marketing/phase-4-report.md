# Marketing site: Phase 4 page refinement (2026-11-13)

## What changed
- **All 18 marketing pages** are on the shared system: inline `style={{}}` went from ~580 to 1 (a data value in HeroShowcase).
- **New shared layers:** `theme/marketing/patterns.css` (hero head, breadcrumbs, check lists, rows, panels, numbered steps, tables, legal doc head, inverse band, split helpers) and `theme/marketing/pages/*.css` (page-only rules, tokens only).
- **New shared component:** `components/marketing/TemplateCard.tsx` (catalogue, template pages, use-case pages).
- **How it works** is now a sticky walkthrough (6 steps, each with a Feature specification state built from its real fields, questions and checks).
- **Template outlines** come from the real templates (`suggestedSections` getter in `packages/shared/src/templates/marketing.ts`, tested).
- **Page titles** no longer repeat the brand ("X · Write Studio").
- **Legal pages** share one structure (`m-legal`, `m-doc-head`, `m-prose`). Guides end with "Related reading".
- **Muted band** darkened to DNA `bg/gray/normal` (it was indistinguishable from white).
- **Accessibility:** ~40 mismatched `aria-label`s removed (WCAG 2.5.3), heading skips fixed, chevrons removed from inside `<ol>`, decorative icons hidden, card lists are real lists, one link per card.
- **Accuracy fix in a mock-up:** the product page toolbar now shows the real selection bubble (B, I, U, Link, Highlight).

## Verification
- `tsc` and ESLint clean; shared tests pass (marketing 5/5).
- 33 routes return 200 (all marketing pages, every template and use case, 12 guides, auth pages, sitemap, robots); every internal link on home, product, SOP template and about returns 200.
- No horizontal overflow at 375px on any of the 18 pages; desktop checked at 1440px.

## Copy that is inaccurate or unverifiable (not changed: needs an owner decision)
**Contradicts the system**
- "Row-level security enforces ownership" (security L73 "Enforced by PostgreSQL Row-Level Security", L8, L69; privacy L41–42; FAQ L49; product L246/260/264; home "Verified Row-Level Security" badge). Reality: RLS is on with zero policies (deny-all); ownership is enforced by the Express API filtering every query by owner.
- Security L85/L89 "storage rules": private bucket with no policies, served through an owner-checked proxy.
- Contact page and links to it promise replies (FAQ L65, privacy L55, accessibility L70–74 "accessibility team"), but the contact form sends nothing.
- Product "roving toolbars that appear only when you select text": the formatting toolbar is always visible.
- Product/home "copy actions" on code blocks: no copy button exists.
- How it works "Context automatically grounds writing prompts": prompts are fixed per section. "One-click restore default sections": not found. "target latency" field: doesn't exist.
- Product "Architecture profile": the presentation profile is "technical". "container diagrams": flow diagrams have start/step/decision/end only.
- Use cases list "Customer Success Story", "Design System Documentation", "Process Playbook": no such templates.
- Cookies "expire on inactivity": refresh cookie lasts 30 days. Privacy/cookies telemetry wording vs Vercel Analytics loaded in `app/layout.tsx` (CLAUDE.md §8 lists it as removed).

**Unverifiable or absolute**
- "TLS 1.3", "strict SameSite" (cookies are Lax), WCAG 2.2 AA conformance, "every link / every screenshot", "Zero Public Leaks", "pixel-perfect", "battle-tested", "no hidden fees", "Join professionals/teams…", "high-resolution / self-contained PDF" (it's browser print), "38+ blocks" (exactly 38), "9 frameworks" (9 document types, 13 templates), sample metrics "+312% pipeline, 99.99% uptime" (make sure they read as examples), template "load with one click" (sign-up first), "verified framework".

Confirmed true: testimonial block has a photo field (headshot claim OK).

## Not done
- No real product screenshots exist (no `public/`); demos are coded mock-ups of real Studio states.
- Reduced motion verified by code review only (the browser pane can't emulate it).

## Claim fixes (2026-11-13, follow-up)
Corrected everywhere it appeared (security, privacy, cookies, FAQ, accessibility, home, product, how it works, pricing, use cases, template data):
- Security model now says what is true: every request is checked on our servers against the signed-in account; the database refuses all direct access; media sits in a private bucket served through an owner-checked route. HTTPS (not "TLS 1.3"); cookies `httpOnly`, `SameSite=Lax`; access token 15 min, refresh 30 days, sign-out revokes.
- Analytics: privacy and cookie pages now name Vercel Web Analytics (cookieless page-view counting). The shared feature-event taxonomy is not sent anywhere, so "feature actions" was removed.
- Features: no copy button, selection toolbar described correctly, prompts don't adapt to project details, no "restore defaults", real detail fields, flow-diagram shapes, presentation profile names, PDF = browser print, exactly 38 blocks, 9 document types, device frames phone/tablet/laptop/browser.
- Templates: removed three non-existent ones from /use-cases; template "supported blocks" lists rewritten against the real block catalogue; "pre-configured" and "one click" wording corrected.
- "Zero Public Leaks" eyebrow → "Private by default"; accessibility "team" → "Contact us".

Contact form: now opens a pre-filled draft in the visitor's own email app (`mailto:`), addressed to `SUPPORT_EMAIL` (server env; the page says "not available yet" when it's unset). It never claims a message was received.

Still open (owner decision): set the real `SUPPORT_EMAIL` in production; unverifiable promises left as written ("100% IP ownership", "don't train public AI models", "no hidden fees", "Join professionals…", WCAG 2.2 AA conformance, "every link / every screenshot"). Legal pages (privacy, cookies) were edited for accuracy and should get a legal review.
