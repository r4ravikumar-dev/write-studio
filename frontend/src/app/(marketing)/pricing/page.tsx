import type {Metadata} from 'next';
import NextLink from 'next/link';
import {ArrowRight} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Pricing & Plans',
  description:
    'Start creating structured documents in Write Studio. Learn about our launch access and personal private workspaces.',
  alternates: {
    canonical: '/pricing',
  },
};

const FEATURES = [
  'Access to all 9 released vertical templates',
  'Contextual writing prompts & section guidance',
  '38 content blocks (code, terminal, tables, metrics)',
  'Private personal workspace with ownership-based security',
  'Full exports: PDF, Standalone HTML, Markdown & JSON',
];

export default function PricingPage() {
  return (
    <div className="marketing-pricing">
      <section className="m-section-hero">
        <div className="m-container">
          <div className="m-hero-head">
            <span className="m-eyebrow">Simple, Transparent Access</span>
            <h1 className="m-title-display">A clearer way to create your next document.</h1>
            <p className="m-subtitle">
              Find a template, set up your workspace and start writing. Write Studio is currently accessible for all
              registered professionals during our product launch.
            </p>
          </div>

          <article className="m-card m-card--lg m-card--raised m-pricing-plan" aria-labelledby="plan-personal">
            <div className="m-card-meta">
              <h2 id="plan-personal" className="m-title-h3">
                Personal Workspace
              </h2>
              <span className="m-badge-active">Launch Access</span>
            </div>
            <p className="m-text-sm">
              Everything you need to create, structure, visually compose, and export your professional documents.
            </p>

            <ul className="m-checklist m-pricing-features">
              {FEATURES.map((feat) => (
                <li key={feat}>{feat}</li>
              ))}
            </ul>

            <NextLink href="/signup" className="m-btn m-btn-primary m-btn-block">
              <span>Create your account</span>
              <ArrowRight size={16} aria-hidden="true" />
            </NextLink>
          </article>

          <p className="m-caption m-pricing-note">
            Transparent policy: As advanced team and enterprise collaboration features are developed, transparent
            pricing tiers will be announced well in advance. No hidden fees or unexpected charges.
          </p>
        </div>
      </section>
    </div>
  );
}
