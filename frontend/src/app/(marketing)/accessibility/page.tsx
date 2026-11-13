import type {Metadata} from 'next';
import NextLink from 'next/link';
import {ArrowRight} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Accessibility Statement & W3C WAI Standards',
  description:
    'Our commitment to digital accessibility, semantic heading hierarchy, descriptive links, meaningful text alternatives, and keyboard navigation.',
  alternates: {
    canonical: '/accessibility',
  },
};

export default function AccessibilityPage() {
  return (
    <div className="m-legal">
      <section className="m-section-hero">
        <div className="m-container-reading">
          <header className="m-doc-head">
            <span className="m-eyebrow">Accessibility Standards</span>
            <h1 className="m-title-h1">Accessibility at Write Studio</h1>
            <p className="m-subtitle">
              Write Studio is designed to be accessible to all people, regardless of ability, technology, or context. We
              follow the Web Content Accessibility Guidelines (WCAG 2.2 AA) and the W3C Web Accessibility Initiative
              principles.
            </p>
          </header>

          <div className="m-prose">
            <h2>1. Meaningful Heading Structure</h2>
            <p>
              Our pages follow a strict semantic hierarchy: a single descriptive <code>H1</code> per page, followed by
              logical <code>H2</code> and <code>H3</code> subsections. We never skip heading ranks purely for visual sizing.
              This allows visitors using screen readers to navigate section by section efficiently.
            </p>

            <h2>2. Descriptive & Meaningful Links</h2>
            <p>
              We reject ambiguous link labels such as &ldquo;Click here&rdquo; or isolated &ldquo;Learn more&rdquo;. Every link across Write
              Studio describes its specific destination (e.g. &ldquo;Explore developer documentation template&rdquo;, &ldquo;Read our
              privacy policy&rdquo;).
            </p>

            <h2>3. High Contrast & Visible States</h2>
            <p>
              Color is never the sole vehicle used to convey state, availability, or errors. Status tags combine
              accessible text labels alongside high-contrast iconography. All interactive elements have high-visibility
              focus indicators for keyboard navigation.
            </p>

            <h2>4. Meaningful Alternative Text</h2>
            <p>
              Every informative screenshot and product illustration carries descriptive alternative text explaining
              what is represented. Purely decorative elements carry empty <code>alt=&quot;&quot;</code> attributes so assistive
              software can skip them.
            </p>

            <h2>5. Motion Reduction</h2>
            <p>
              We respect your system&apos;s <code>prefers-reduced-motion</code> setting. When enabled, non-essential smooth
              scroll transitions and interface animations are disabled or reduced to instant changes.
            </p>
          </div>

          <aside className="m-panel m-legal-aside" aria-labelledby="accessibility-feedback">
            <h2 id="accessibility-feedback" className="m-title-h4">
              Feedback & Assistance
            </h2>
            <p className="m-text">
              If you encounter any accessibility barriers on Write Studio, please tell us through the Contact page.
            </p>
            <NextLink href="/contact" className="m-card-link">
              <span>Contact us</span>
              <ArrowRight size={14} aria-hidden="true" />
            </NextLink>
          </aside>
        </div>
      </section>
    </div>
  );
}
