import type {Metadata} from 'next';
import NextLink from 'next/link';
import {
  ArrowRight,
  Code2,
  Layers,
  Terminal,
  FileCheck2,
  FolderLock,
  Columns,
  Eye,
  CheckCircle2,
  Link2,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Write Studio Features — Templates, Writing & Visuals',
  description:
    'Explore guided writing, document structures and visual composition in Write Studio. Everything you need to create a clearer document.',
  alternates: {
    canonical: '/product',
  },
};

export default function ProductPage() {
  return (
    <div className="marketing-product">
      {/* Hero */}
      <section className="m-section-hero">
        <div className="m-container">
          <div className="m-hero-head">
            <span className="m-eyebrow">Product Overview</span>
            <h1 className="m-title-display">Everything you need to create a clearer document.</h1>
            <p className="m-subtitle">
              Write, structure and visually compose professional documents in one focused workspace. Start with a
              purpose-built template, follow contextual guidance and build a document that communicates your work clearly.
            </p>
            <div className="m-actions">
              <NextLink href="/templates" className="m-btn m-btn-primary m-btn-lg">
                <span>Explore the template library</span>
                <ArrowRight size={18} aria-hidden="true" />
              </NextLink>
              <NextLink href="/how-it-works" className="m-btn m-btn-secondary m-btn-lg">
                <span>See how it works</span>
              </NextLink>
            </div>
          </div>
        </div>
      </section>

      {/* Feature 1: Purpose-Built Templates */}
      <section className="m-section m-section--muted">
        <div className="m-container">
          <div className="m-split">
            <div className="m-split-copy">
              <span className="m-eyebrow">Structure First</span>
              <h2 className="m-title-h2">A structure that fits what you&apos;re creating.</h2>
              <p className="m-subtitle">
                Different documents need different structures. Choose a template designed around your document type
                instead of adapting a generic page.
              </p>
              <ul className="m-checklist">
                <li>9 purpose-built document types across engineering, marketing, design and operations.</li>
                <li>Battle-tested section sequences that lead the reader naturally through your work.</li>
                <li>Flexible outline controls to reorder, rename or add custom sections without losing structure.</li>
              </ul>
              <NextLink href="/templates" className="m-btn m-btn-secondary">
                <span>Browse all templates</span>
                <ArrowRight size={16} aria-hidden="true" />
              </NextLink>
            </div>
            <div className="m-panel m-panel--card">
              <div className="m-demo">
                <p className="m-demo-heading">Template Foundation Matrix</p>
                <ul className="m-demo-list">
                  {[
                    {name: 'Developer Documentation', acts: '4 Acts · 12 Sections · Technical profile'},
                    {name: 'Feature Specification', acts: '4 Acts · 14 Sections · Product profile'},
                    {name: 'Technical Design Document', acts: '4 Acts · 16 Sections · Technical profile'},
                    {name: 'Standard Operating Procedure', acts: '4 Acts · 13 Sections · Procedure profile'},
                  ].map(t => (
                    <li key={t.name} className="m-demo-row">
                      <span>
                        <span className="m-row-title">{t.name}</span>
                        <span className="m-row-sub">{t.acts}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature 2: Guided Writing */}
      <section className="m-section">
        <div className="m-container">
          <div className="m-split m-split--reverse">
            <div className="m-split-copy">
              <span className="m-eyebrow">Contextual Writing Guidance</span>
              <h2 className="m-title-h2">Know what to write, one section at a time.</h2>
              <p className="m-subtitle">
                Every section gives you context, useful questions and guidance to help you organise your ideas without
                the anxiety of a blank cursor.
              </p>
              <ul className="m-checklist">
                <li>Section-specific prompts tailored to the document&apos;s objectives.</li>
                <li>Dynamic writing tips that remind you to attach data, code snippets or customer quotes.</li>
                <li>Pre-flight checklist rules ensuring you don&apos;t forget essential sections before sharing.</li>
              </ul>
              <NextLink href="/signup" className="m-btn m-btn-primary">
                <span>Try guided writing</span>
                <ArrowRight size={16} aria-hidden="true" />
              </NextLink>
            </div>
            <div className="m-panel">
              <div className="m-demo">
                <p className="m-demo-heading m-demo-heading--brand">Contextual Section Guide</p>
                <p className="m-title-h4">System Architecture &amp; Data Flows</p>
                <p className="m-text-sm">Address the following architectural requirements:</p>
                <ol className="m-demo-list">
                  <li className="m-demo-row m-demo-row--text">
                    1. How are write transactions isolated across multi-tenant shards?
                  </li>
                  <li className="m-demo-row m-demo-row--text">
                    2. What is the failover strategy if the primary cache node becomes unreachable?
                  </li>
                  <li className="m-demo-row m-demo-row--text">
                    3. Are API rate limits enforced at the edge or within the application middleware?
                  </li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature 3: Rich Content Blocks */}
      <section className="m-section m-section--muted">
        <div className="m-container">
          <div className="m-section-head">
            <span className="m-eyebrow">Universal Content Library</span>
            <h2 className="m-title-h2">Bring more than text into your documents.</h2>
            <p className="m-subtitle">
              Use visual and structured content to explain your work, support your ideas and make important information
              easier to understand.
            </p>
          </div>

          <div className="m-grid-3">
            <div className="m-card">
              <div className="m-card-icon" aria-hidden="true"><Code2 size={22} /></div>
              <h3 className="m-card-title">Code Block v2</h3>
              <p className="m-card-desc">Syntax highlighting for 23 languages, with line numbers and line wrapping.</p>
            </div>
            <div className="m-card">
              <div className="m-card-icon" aria-hidden="true"><Terminal size={22} /></div>
              <h3 className="m-card-title">Terminal Shells</h3>
              <p className="m-card-desc">Present terminal commands, prompts ($), and separate command outputs clearly.</p>
            </div>
            <div className="m-card">
              <div className="m-card-icon" aria-hidden="true"><Columns size={22} /></div>
              <h3 className="m-card-title">Parameter Tables</h3>
              <p className="m-card-desc">Type specifications, required flags, defaults, and concise parameter descriptions.</p>
            </div>
            <div className="m-card">
              <div className="m-card-icon" aria-hidden="true"><FileCheck2 size={22} /></div>
              <h3 className="m-card-title">Acceptance Criteria</h3>
              <p className="m-card-desc">Gherkin BDD scenario steps (Given, When, Then) mapped directly to requirement IDs.</p>
            </div>
            <div className="m-card">
              <div className="m-card-icon" aria-hidden="true"><Layers size={22} /></div>
              <h3 className="m-card-title">Architecture Diagrams</h3>
              <p className="m-card-desc">Flow diagrams with start, step, decision and end shapes and labelled arrows.</p>
            </div>
            <div className="m-card">
              <div className="m-card-icon" aria-hidden="true"><Eye size={22} /></div>
              <h3 className="m-card-title">Device Mockups</h3>
              <p className="m-card-desc">Accurate mobile, tablet and desktop frames with interactive before/after sliders.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature 4: Hybrid Editor */}
      <section className="m-section">
        <div className="m-container">
          <div className="m-split">
            <div className="m-split-copy">
              <span className="m-eyebrow">Hybrid Editor Experience</span>
              <h2 className="m-title-h2">Write naturally. Adjust the details when you need to.</h2>
              <p className="m-subtitle">
                Keep the writing experience simple, with contextual tools for formatting, visual blocks and document
                structure.
              </p>
              <ul className="m-checklist">
                <li>Distraction-free canvas, with formatting tools above the page and a selection toolbar that appears when you select text.</li>
                <li>
                  <span>Quick-insert slash command menu (<code>/</code>) to add blocks without breaking typing flow.</span>
                </li>
                <li>Keyboard accessible shortcuts for formatting, headings, code, and lists.</li>
              </ul>
              <NextLink href="/signup" className="m-btn m-btn-primary">
                <span>Start writing today</span>
                <ArrowRight size={16} aria-hidden="true" />
              </NextLink>
            </div>
            <div className="m-panel">
              <div className="m-demo">
                <p className="m-demo-heading">Focused Editor Canvas</p>
                <div className="m-product-canvas">
                  <p className="m-demo-heading">Selection toolbar</p>
                  <p className="sr-only">Selection toolbar: bold, italic, underline, link and highlight.</p>
                  <div className="m-product-toolbar" aria-hidden="true">
                    <span className="m-product-tool"><strong>B</strong></span>
                    <span className="m-product-tool"><em>I</em></span>
                    <span className="m-product-tool"><u>U</u></span>
                    <span className="m-product-tool"><Link2 size={14} /> Link</span>
                    <span className="m-product-tool"><mark className="m-product-mark">Highlight</mark></span>
                  </div>
                </div>
                <p className="m-text-sm">
                  Type naturally with markdown shortcuts, or hit <code>/</code> anywhere on a blank line to insert rich
                  technical, product, or visual components.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature 5: Private Workspace */}
      <section className="m-section m-section--muted">
        <div className="m-container">
          <div className="m-split m-split--reverse">
            <div className="m-split-copy">
              <span className="m-eyebrow">Strict Privacy Model</span>
              <h2 className="m-title-h2">Your work stays in your workspace.</h2>
              <p className="m-subtitle">
                Documents and uploaded media are private to your account. You control your drafts and when to export
                your work.
              </p>
              <ul className="m-checklist">
                <li>No public profiles, no search engine scraping, and no unauthenticated previews.</li>
                <li>Every request is checked against your account on our servers, and the database refuses direct access.</li>
                <li>Export to PDF (through your browser’s print dialog), Markdown, standalone HTML or a JSON backup whenever you choose.</li>
              </ul>
              <NextLink href="/security" className="m-btn m-btn-secondary">
                <span>Read our security architecture</span>
                <ArrowRight size={16} aria-hidden="true" />
              </NextLink>
            </div>
            <div className="m-panel m-panel--card m-product-privacy">
              <div className="m-product-lock" aria-hidden="true">
                <FolderLock size={28} />
              </div>
              <p className="m-title-h4">Authenticated Ownership</p>
              <p className="m-text-sm">
                Every document belongs to your account. Nobody else can open or read your writing.
              </p>
              <span className="m-badge m-badge--success">
                <CheckCircle2 aria-hidden="true" />
                Checked on every request
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="m-section">
        <div className="m-container">
          <div className="m-banner-cta">
            <h2>Ready to experience Write Studio?</h2>
            <p>
              Choose a structure, gather your thoughts and create documents that explain your work with total clarity.
            </p>
            <NextLink href="/signup" className="m-btn m-btn-inverse m-btn-lg">
              <span>Create your first document</span>
              <ArrowRight size={18} aria-hidden="true" />
            </NextLink>
          </div>
        </div>
      </section>
    </div>
  );
}
