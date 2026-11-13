import type {Metadata} from 'next';
import NextLink from 'next/link';
import {ArrowRight} from 'lucide-react';

export const metadata: Metadata = {
  title: 'About Write Studio — Making Complex Work Easier to Explain',
  description:
    'Learn why Write Studio exists: to help professionals spend less time organising document layouts and more time explaining what matters.',
  alternates: {
    canonical: '/about',
  },
};

export default function AboutPage() {
  return (
    <div className="marketing-about">
      {/* Hero */}
      <section className="m-section-hero">
        <div className="m-container">
          <div className="m-hero-head">
            <span className="m-eyebrow">Our Purpose</span>
            <h1 className="m-title-display">Make important work easier to explain.</h1>
            <p className="m-subtitle">
              Write Studio started with a simple idea: creating a good document should not require figuring out the
              entire structure from scratch.
            </p>
            <p className="m-text m-about-lede">
              Different work needs different ways of communicating. A developer guide, a feature specification, a
              research report and a customer story each need their own structure. Write Studio brings those structures,
              guided writing and visual content into one focused workspace.
            </p>
            <div className="m-actions">
              <NextLink href="/signup" className="m-btn m-btn-primary m-btn-lg">
                <span>Create your first document</span>
                <ArrowRight size={18} aria-hidden="true" />
              </NextLink>
            </div>
          </div>
        </div>
      </section>

      {/* Story */}
      <section className="m-section m-section--muted">
        <div className="m-container-reading">
          <div className="m-prose m-about-story">
            <h2>Why Write Studio exists</h2>
            <p>
              Professionals spend hours formatting documents, debating section headings, and copying boilerplate
              structures between tools. Our goal is to help people spend less time organising the document and more
              time explaining what matters.
            </p>

            <h2>The problem with starting from a blank page</h2>
            <p>
              When you face a blank cursor, the hardest part is rarely writing the words — it is knowing which sections
              belong in the document, what questions to answer, and how to structure the story so busy colleagues can
              digest it quickly.
            </p>

            <h2>Why different documents need different structures</h2>
            <p>
              A software architecture design requires data models, API contracts, and failure trade-offs. A marketing
              case study requires client context, strategic objectives, and verifiable metric cards. One generic text
              editor cannot serve both without forcing manual configuration every single time.
            </p>

            <h2>Our approach to guided creation & visual communication</h2>
            <p>
              We pair domain-specific templates with contextual section guidance and native visual blocks. Instead of
              jumping between note apps, code tools, and graphics software, you draft, compose, and review your work in
              one calm, dedicated environment.
            </p>

            <h2>Our commitment to private user workspaces</h2>
            <p>
              Your workspace is strictly private. Your drafts, internal architectures, and confidential project notes
              remain private to your account. We do not operate public user directories or feed your drafts into public
              models.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="m-section" aria-labelledby="about-cta-heading">
        <div className="m-container">
          <div className="m-banner-cta">
            <h2 id="about-cta-heading">Start with a structure. Finish with clarity.</h2>
            <p>
              Join teams and professionals crafting documents that explain decisions, ideas, and work with total clarity.
            </p>
            <NextLink href="/signup" className="m-btn m-btn-inverse m-btn-lg">
              <span>Create your account</span>
              <ArrowRight size={18} aria-hidden="true" />
            </NextLink>
          </div>
        </div>
      </section>
    </div>
  );
}
