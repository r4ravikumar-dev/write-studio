import type {Metadata} from 'next';
import NextLink from 'next/link';
import {
  ArrowRight,
  Code2,
  Layers,
  ShieldCheck,
  Sparkles,
  Lock,
  CheckCircle2,
  BarChart3,
  ListTodo,
  Quote,
  Layout,
} from 'lucide-react';
import {MARKETING_TEMPLATES} from '@studio/shared';
import {HeroShowcase} from '@/components/marketing/HeroShowcase';
import {ProductWalkthrough} from '@/components/marketing/ProductWalkthrough';

export const metadata: Metadata = {
  title: {absolute: 'Write Studio — Guided Document Creation Studio'},
  description:
    'Start with a structure. Finish with clarity. Create professional documents with purpose-built templates, guided writing prompts and flexible visual blocks.',
  alternates: {
    canonical: '/',
  },
};

export default function MarketingHomePage() {
  const releasedTemplates = MARKETING_TEMPLATES.slice(0, 8);

  return (
    <div className="marketing-home">
      {/* ──────────────────────────────────────────────────────────
          SECTION 1 — HERO
          ────────────────────────────────────────────────────────── */}
      <section className="m-section-hero" aria-labelledby="hero-heading">
        <div className="m-container">
          <div className="m-hero-head">
            <span className="m-eyebrow">The workspace for better documents</span>
            <h1 id="hero-heading" className="m-title-display">
              Start with a structure. <br />
              Finish with clarity.
            </h1>
            <p className="m-subtitle">
              Create professional documents with purpose-built templates, guided writing prompts and flexible visual
              blocks. From developer documentation and feature specifications to marketing case studies and UX stories,
              bring your work together in one focused workspace.
            </p>
            <div className="m-actions">
              <NextLink href="/signup" className="m-btn m-btn-primary m-btn-lg">
                <span>Create your first document</span>
                <ArrowRight size={18} aria-hidden="true" />
              </NextLink>
              <NextLink href="/templates" className="m-btn m-btn-secondary m-btn-lg">
                <span>Explore templates</span>
              </NextLink>
            </div>
            <p className="m-hero-note">No blank-page guesswork. Just a clearer way to get started.</p>
          </div>

          {/* Interactive Hero Showcase */}
          <HeroShowcase />
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────
          SECTION 2 — IDENTIFY WHAT PEOPLE CREATE
          ────────────────────────────────────────────────────────── */}
      <section className="m-section m-section--muted" aria-labelledby="categories-heading">
        <div className="m-container">
          <div className="m-section-head">
            <span className="m-eyebrow">Multi-Vertical Solutions</span>
            <h2 id="categories-heading" className="m-title-h2">
              One workspace. Different kinds of work.
            </h2>
            <p className="m-subtitle">
              Start with a document type that fits your work. Write Studio provides a structure suited to what you&apos;re
              creating.
            </p>
          </div>

          <div className="m-grid-4">
            <div className="m-card">
              <div className="m-card-icon" aria-hidden="true">
                <Code2 size={22} />
              </div>
              <h3 className="m-card-title">Product & Engineering</h3>
              <p className="m-card-desc">
                Developer guides, feature specifications, release notes, PRDs, technical designs and ADRs.
              </p>
              <NextLink href="/use-cases/product-engineering" className="m-card-link">
                <span>Explore technical templates</span>
                <ArrowRight size={14} aria-hidden="true" />
              </NextLink>
            </div>

            <div className="m-card">
              <div className="m-card-icon" aria-hidden="true">
                <BarChart3 size={22} />
              </div>
              <h3 className="m-card-title">Marketing & Growth</h3>
              <p className="m-card-desc">
                Customer success stories, evidence-backed marketing case studies and campaign performance reports.
              </p>
              <NextLink href="/use-cases/marketing-growth" className="m-card-link">
                <span>Explore marketing templates</span>
                <ArrowRight size={14} aria-hidden="true" />
              </NextLink>
            </div>

            <div className="m-card">
              <div className="m-card-icon" aria-hidden="true">
                <Layers size={22} />
              </div>
              <h3 className="m-card-title">Design & Research</h3>
              <p className="m-card-desc">
                UX case studies, research reports, user journey explorations and design documentation.
              </p>
              <NextLink href="/use-cases/design-research" className="m-card-link">
                <span>Explore design templates</span>
                <ArrowRight size={14} aria-hidden="true" />
              </NextLink>
            </div>

            <div className="m-card">
              <div className="m-card-icon" aria-hidden="true">
                <ListTodo size={22} />
              </div>
              <h3 className="m-card-title">Operations & Knowledge</h3>
              <p className="m-card-desc">
                Standard operating procedures, repeatable process playbooks and internal operational guides.
              </p>
              <NextLink href="/use-cases/operations" className="m-card-link">
                <span>Explore operations templates</span>
                <ArrowRight size={14} aria-hidden="true" />
              </NextLink>
            </div>
          </div>

          <div className="m-section-foot">
            <NextLink href="/templates" className="m-btn m-btn-secondary">
              <span>Browse all document templates</span>
              <ArrowRight size={16} aria-hidden="true" />
            </NextLink>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────
          SECTION 3 — THE PROBLEM
          ────────────────────────────────────────────────────────── */}
      <section className="m-section" aria-labelledby="problem-heading">
        <div className="m-container">
          <div className="m-section-head">
            <span className="m-eyebrow">The Core Problem</span>
            <h2 id="problem-heading" className="m-title-h2">
              The hardest part isn&apos;t always writing. It&apos;s knowing how to put everything together.
            </h2>
            <p className="m-subtitle">
              Most teams struggle not with ideas, but with the lack of structure and consistency across disparate
              tools.
            </p>
          </div>

          <div className="m-grid-3">
            <div className="m-card">
              <h3 className="m-card-title">Starting from a blank page</h3>
              <p className="m-card-desc">
                You know what you want to explain, but don&apos;t know which sections belong in the document or how to order
                them logically.
              </p>
            </div>

            <div className="m-card">
              <h3 className="m-card-title">Switching between tools</h3>
              <p className="m-card-desc">
                You write prose in one tool, organise architecture in another and fiddle with mockup layouts somewhere
                else entirely.
              </p>
            </div>

            <div className="m-card">
              <h3 className="m-card-title">Keeping everything consistent</h3>
              <p className="m-card-desc">
                Every team member starts differently, making it impossible to maintain a recognisable structure and
                professional presentation.
              </p>
            </div>
          </div>

          <div className="m-home-statement" data-reveal-item>
            <Sparkles size={24} aria-hidden="true" />
            <p className="m-text m-text-strong">
              Write Studio brings structure, writing and visual composition into one focused workflow.
            </p>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────
          SECTION 4 — HOW WRITE STUDIO WORKS
          ────────────────────────────────────────────────────────── */}
      <section className="m-section m-section--muted" aria-labelledby="how-it-works-heading">
        <div className="m-container">
          <div className="m-section-head">
            <span className="m-eyebrow">Creation Workflow</span>
            <h2 id="how-it-works-heading" className="m-title-h2">
              From your first idea to a complete document.
            </h2>
            <p className="m-subtitle">
              A guided, four-step journey designed to eliminate blank-page paralysis and produce polished documents.
            </p>
          </div>

          <ol className="m-grid-4 m-plain-list">
            <li className="m-card">
              <span className="m-number" aria-hidden="true">
                1
              </span>
              <h3 className="m-card-title">Choose a template</h3>
              <p className="m-card-desc">
                Start with a battle-tested structure engineered specifically for your document type.
              </p>
            </li>

            <li className="m-card">
              <span className="m-number" aria-hidden="true">
                2
              </span>
              <h3 className="m-card-title">Add your context</h3>
              <p className="m-card-desc">
                Provide project details and constraints that automatically shape your section guidance.
              </p>
            </li>

            <li className="m-card">
              <span className="m-number" aria-hidden="true">
                3
              </span>
              <h3 className="m-card-title">Write and compose</h3>
              <p className="m-card-desc">
                Follow section prompts and enrich explanations with native code, parameters and diagrams.
              </p>
            </li>

            <li className="m-card">
              <span className="m-number" aria-hidden="true">
                4
              </span>
              <h3 className="m-card-title">Review your work</h3>
              <p className="m-card-desc">
                Verify structural completeness and preview responsive output before private export.
              </p>
            </li>
          </ol>

          <div className="m-section-foot">
            <NextLink href="/how-it-works" className="m-btn m-btn-secondary">
              <span>See how Write Studio works</span>
              <ArrowRight size={16} aria-hidden="true" />
            </NextLink>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────
          SECTION 5 — TEMPLATE SHOWCASE
          ────────────────────────────────────────────────────────── */}
      <section className="m-section" aria-labelledby="templates-showcase-heading">
        <div className="m-container">
          <div className="m-section-head">
            <span className="m-eyebrow">Template Library</span>
            <h2 id="templates-showcase-heading" className="m-title-h2">
              A better starting point for every document.
            </h2>
            <p className="m-subtitle">
              Each template comes with a purpose, a suggested structure and guidance on what to include.
            </p>
          </div>

          <div className="m-grid-4">
            {releasedTemplates.map(template => (
              <div key={template.slug} className="m-card">
                <div className="m-card-meta">
                  <span className="m-meta">{template.categoryLabel}</span>
                  <span className="m-badge m-badge--success">Available</span>
                </div>
                <h3 className="m-card-title">{template.name}</h3>
                <p className="m-card-desc">{template.description}</p>
                <p className="m-caption">{template.suggestedSections.length} structured sections</p>
                <NextLink href={`/templates/${template.slug}`} className="m-card-link">
                  <span>
                    Explore template<span className="sr-only">: {template.name}</span>
                  </span>
                  <ArrowRight size={14} aria-hidden="true" />
                </NextLink>
              </div>
            ))}
          </div>

          <div className="m-section-foot">
            <NextLink href="/templates" className="m-btn m-btn-primary">
              <span>Explore all templates</span>
              <ArrowRight size={16} aria-hidden="true" />
            </NextLink>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────
          SECTION 6 — GUIDED CREATION
          ────────────────────────────────────────────────────────── */}
      <section className="m-section m-section--muted" aria-labelledby="guided-creation-heading">
        <div className="m-container">
          <div className="m-split">
            <div className="m-split-copy">
              <div className="m-section-head" data-no-reveal>
                <span className="m-eyebrow">Contextual Writing Guidance</span>
                <h2 id="guided-creation-heading" className="m-title-h2">
                  Know what belongs in every section.
                </h2>
                <p className="m-subtitle">
                  Good documents need more than headings. Each section can guide you with questions, writing
                  instructions and suggestions for useful content.
                </p>
              </div>

              <ul className="m-checklist">
                <li>Understand what each section is meant to explain before you start writing.</li>
                <li>Use targeted prompts to organise your thoughts and eliminate ambiguity.</li>
                <li>Start with suggested sections and adjust or rename them to suit your project.</li>
                <li>Keep your own custom structure intact even as the document evolves.</li>
              </ul>

              <NextLink href="/product" className="m-btn m-btn-secondary">
                <span>Explore guided writing</span>
                <ArrowRight size={16} aria-hidden="true" />
              </NextLink>
            </div>

            {/* Visual Guide Card */}
            <div className="m-panel m-panel--card">
              <div className="m-demo-titlebar">
                <span className="m-badge m-badge--brand">
                  <ShieldCheck aria-hidden="true" />
                  Live Section Guidance Example
                </span>
              </div>
              <h3 className="m-title-h4">Section 8 · Acceptance Criteria</h3>
              <p className="m-text-sm">
                Define the verifiable scenarios that must pass before this feature is marked ready for production.
              </p>
              <ul className="m-demo-list">
                <li className="m-demo-row m-demo-row--text">
                  <span>
                    <strong>SCENARIO:</strong> Valid Member Invite
                  </span>
                </li>
                <li className="m-demo-row m-demo-row--text">
                  <span>
                    <strong>GIVEN:</strong> A signed-in workspace owner
                  </span>
                </li>
                <li className="m-demo-row m-demo-row--text">
                  <span>
                    <strong>WHEN:</strong> Sending invite to &ldquo;colleague@acme.com&rdquo; with role &ldquo;Editor&rdquo;
                  </span>
                </li>
                <li className="m-demo-row m-demo-row--text">
                  <span>
                    <strong>THEN:</strong> Issue email token with 7-day expiration
                  </span>
                </li>
              </ul>
              <p className="m-caption m-demo-check">
                <CheckCircle2 size={16} aria-hidden="true" />
                3 of 3 review rules satisfied for this section
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────
          SECTION 7 — VISUAL COMPOSITION
          ────────────────────────────────────────────────────────── */}
      <section className="m-section" aria-labelledby="composition-heading">
        <div className="m-container">
          <div className="m-section-head">
            <span className="m-eyebrow">Visual Content & Layouts</span>
            <h2 id="composition-heading" className="m-title-h2">
              Go beyond paragraphs and plain text.
            </h2>
            <p className="m-subtitle">
              Bring technical explanations, product screenshots, comparisons, metrics and structured content together
              in one document.
            </p>
          </div>

          <div className="m-grid-3">
            <div className="m-card">
              <div className="m-card-icon" aria-hidden="true">
                <Code2 size={22} />
              </div>
              <h3 className="m-card-title">Code block v2 & Terminal</h3>
              <p className="m-card-desc">
                23 highlighted languages with line numbers, line wrapping, shell prompts and command-output separation.
              </p>
            </div>

            <div className="m-card">
              <div className="m-card-icon" aria-hidden="true">
                <Layers size={22} />
              </div>
              <h3 className="m-card-title">Parameter & API tables</h3>
              <p className="m-card-desc">
                Structured fields for parameter names, types, default values, required flags and endpoint method badges.
              </p>
            </div>

            <div className="m-card">
              <div className="m-card-icon" aria-hidden="true">
                <ListTodo size={22} />
              </div>
              <h3 className="m-card-title">Requirements & User stories</h3>
              <p className="m-card-desc">
                Numbered requirement items (FR-1), priority chips and Given/When/Then acceptance scenarios.
              </p>
            </div>

            <div className="m-card">
              <div className="m-card-icon" aria-hidden="true">
                <BarChart3 size={22} />
              </div>
              <h3 className="m-card-title">Metric cards & Impact</h3>
              <p className="m-card-desc">
                High-contrast metric highlights (for example, “+312% pipeline”) with context and their source.
              </p>
            </div>

            <div className="m-card">
              <div className="m-card-icon" aria-hidden="true">
                <Quote size={22} />
              </div>
              <h3 className="m-card-title">Testimonials & Quotes</h3>
              <p className="m-card-desc">
                Attributed customer quotes with author headshot, role, organization and permission badges.
              </p>
            </div>

            <div className="m-card">
              <div className="m-card-icon" aria-hidden="true">
                <Layout size={22} />
              </div>
              <h3 className="m-card-title">Device mockups & Visuals</h3>
              <p className="m-card-desc">
                Phone, tablet, laptop and browser device frames with before-and-after sliders.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────
          SECTION 8 — PRIVATE BY DEFAULT
          ────────────────────────────────────────────────────────── */}
      <section className="m-section m-section--muted" aria-labelledby="privacy-heading">
        <div className="m-container">
          <div className="m-split m-split--reverse">
            <div className="m-split-copy">
              <div className="m-section-head" data-no-reveal>
                <span className="m-eyebrow">Private by default</span>
                <h2 id="privacy-heading" className="m-title-h2">
                  Your documents belong to you.
                </h2>
                <p className="m-subtitle">
                  Your workspace is private. Your drafts and uploaded files belong to your account and are protected by
                  ownership-based access controls.
                </p>
              </div>

              <ul className="m-checklist">
                <li>
                  <span>
                    <strong>Private personal workspace:</strong> Other users cannot browse or discover your documents.
                  </span>
                </li>
                <li>
                  <span>
                    <strong>Owner-only access:</strong> Every database query and media asset is bound to authenticated
                    account ownership.
                  </span>
                </li>
                <li>
                  <span>
                    <strong>Private media storage:</strong> Uploaded images and assets live in a private bucket, never at public URLs.
                  </span>
                </li>
                <li>
                  <span>
                    <strong>No automatic publishing:</strong> Your drafts are never shared or published to a public
                    index.
                  </span>
                </li>
              </ul>

              <NextLink href="/security" className="m-btn m-btn-secondary">
                <span>Learn how privacy works</span>
                <ArrowRight size={16} aria-hidden="true" />
              </NextLink>
            </div>

            <div className="m-panel m-panel--card m-home-guarantee">
              <div className="m-card-icon" aria-hidden="true">
                <Lock />
              </div>
              <h3 className="m-title-h4">Private Workspace Guarantee</h3>
              <p className="m-text-sm">
                We don&apos;t sell your content, train public AI models on your private documents, or make your drafts
                crawlable. When you create in Write Studio, you retain 100% intellectual property ownership.
              </p>
              <span className="m-badge m-badge--success">
                <CheckCircle2 aria-hidden="true" />
                Owner checks on every request
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────
          SECTION 9 — PRODUCT DEMONSTRATION
          ────────────────────────────────────────────────────────── */}
      <section className="m-section" aria-labelledby="walkthrough-heading">
        <div className="m-container">
          <div className="m-section-head">
            <span className="m-eyebrow">Product Demonstration</span>
            <h2 id="walkthrough-heading" className="m-title-h2">
              See how everything comes together.
            </h2>
            <p className="m-subtitle">
              Inspect the real workflow: structured outline, contextual section guidance, native blocks, and instant
              export.
            </p>
          </div>

          <ProductWalkthrough />
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────
          SECTION 10 — FAQ
          ────────────────────────────────────────────────────────── */}
      <section className="m-section m-section--muted" aria-labelledby="faq-heading">
        <div className="m-container-narrow">
          <div className="m-section-head m-section-head--center">
            <span className="m-eyebrow">Questions & Answers</span>
            <h2 id="faq-heading" className="m-title-h2">
              Frequently asked questions.
            </h2>
            <p className="m-subtitle">
              Find answers about creating documents, using templates and managing your workspace.
            </p>
          </div>

          <div className="m-faq-list">
            <details className="m-faq-item" open>
              <summary className="m-faq-summary">
                <span>What can I create with Write Studio?</span>
              </summary>
              <div className="m-faq-content">
                Depending on your profession, you can create Developer Documentation, Feature Specifications, Release
                Notes, Marketing Case Studies, Product Requirements Documents (PRDs), Technical Design Documents,
                Architecture Decision Records (ADRs), SOPs, and UX Case Studies.
              </div>
            </details>

            <details className="m-faq-item">
              <summary className="m-faq-summary">
                <span>How do templates work?</span>
              </summary>
              <div className="m-faq-content">
                Templates provide a suggested document structure, writing guidance and relevant content suggestions. You
                can adapt, rename, reorder or delete sections to fit your exact project requirements.
              </div>
            </details>

            <details className="m-faq-item">
              <summary className="m-faq-summary">
                <span>Can I customise the document structure?</span>
              </summary>
              <div className="m-faq-content">
                Yes. The outline controls allow you to add custom sections, rearrange existing ones, or start from a
                blank canvas whenever you prefer your own structure.
              </div>
            </details>

            <details className="m-faq-item">
              <summary className="m-faq-summary">
                <span>Can I add images, diagrams and code?</span>
              </summary>
              <div className="m-faq-content">
                Write Studio supports 38 content blocks including highlighted code blocks with 23 languages, terminal
                commands, parameter tables, architecture diagrams, user stories, acceptance criteria, device mockups, and
                metric cards.
              </div>
            </details>

            <details className="m-faq-item">
              <summary className="m-faq-summary">
                <span>Are my documents private?</span>
              </summary>
              <div className="m-faq-content">
                Yes. Every registered user receives a personal private workspace. Your documents, drafts and uploaded
                media are protected by authenticated ownership controls and are never indexed or published publicly.
              </div>
            </details>

            <details className="m-faq-item">
              <summary className="m-faq-summary">
                <span>Can I edit my documents later?</span>
              </summary>
              <div className="m-faq-content">
                Yes. Your documents are saved securely to your personal workspace with version histories, so you can
                return to continue writing or updating at any time.
              </div>
            </details>
          </div>

          <div className="m-section-foot">
            <NextLink href="/faq" className="m-card-link">
              <span>View the complete FAQ page</span>
              <ArrowRight size={14} aria-hidden="true" />
            </NextLink>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────
          SECTION 11 — FINAL CONVERSION CTA
          ────────────────────────────────────────────────────────── */}
      <section className="m-section" aria-labelledby="final-cta-heading">
        <div className="m-container">
          <div className="m-banner-cta">
            <h2 id="final-cta-heading">Your next document starts here.</h2>
            <p>
              Choose a structure, gather your ideas and start writing with a clearer process. Join professionals
              crafting documents worth sharing.
            </p>
            <div className="m-actions m-actions--center">
              <NextLink href="/signup" className="m-btn m-btn-inverse m-btn-lg">
                <span>Create your first document</span>
                <ArrowRight size={18} aria-hidden="true" />
              </NextLink>
              <NextLink href="/templates" className="m-btn m-btn-inverse-ghost m-btn-lg">
                <span>Explore templates</span>
              </NextLink>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
