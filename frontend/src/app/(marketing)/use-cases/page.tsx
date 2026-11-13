import type {Metadata} from 'next';
import NextLink from 'next/link';
import {ArrowRight, Code2, BarChart3, Layers, ListTodo} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Use Cases & Audience Overview',
  description:
    'Explore how product managers, software engineers, UX designers, marketing leads, and operations teams use Write Studio to create structured documents.',
  alternates: {
    canonical: '/use-cases',
  },
};

const VERTICALS = [
  {
    slug: 'product-engineering',
    name: 'Product & Engineering',
    headline: 'Make technical work easier to explain.',
    description:
      'Create developer guides, feature specifications, release documentation, architecture decision records and technical designs with structures designed around engineering workflows.',
    icon: Code2,
    templates: ['Developer Documentation', 'Feature Specification', 'Release Notes', 'PRD', 'Technical Design', 'ADR'],
  },
  {
    slug: 'marketing-growth',
    name: 'Marketing & Growth',
    headline: 'Turn campaigns and customer outcomes into clear stories.',
    description:
      'Document strategies, customer challenges, campaign execution and measurable results in structured marketing case studies that prove business value.',
    icon: BarChart3,
    templates: ['Marketing Case Study'],
  },
  {
    slug: 'design-research',
    name: 'Design & Research',
    headline: 'Give your creative and research work a clear story.',
    description:
      'Explain the problem, show your process and present the decisions behind your work through structured UX case studies and research documentation.',
    icon: Layers,
    templates: ['UX Case Study'],
  },
  {
    slug: 'operations-knowledge',
    name: 'Operations & Knowledge',
    headline: 'Make important processes easier to follow.',
    description:
      'Turn operational knowledge, repeatable tasks and team procedures into organised, practical standard operating procedures and process playbooks.',
    icon: ListTodo,
    templates: ['Standard Operating Procedure (SOP)'],
  },
];

export default function UseCasesIndexPage() {
  return (
    <div className="marketing-use-cases">
      <section className="m-section-hero">
        <div className="m-container">
          <div className="m-hero-head m-tpl-head">
            <span className="m-eyebrow">Tailored Verticals</span>
            <h1 className="m-title-display">Built for how your team explains work.</h1>
            <p className="m-subtitle">
              A user may not always know the formal document name, but they know what problem they need to solve.
              Discover how Write Studio adapts to your professional domain.
            </p>
          </div>

          <ul className="m-grid-2 m-plain-list">
            {VERTICALS.map(v => {
              const IconComp = v.icon;
              return (
                <li key={v.slug} className="m-card m-card--lg">
                  <div className="m-card-icon" aria-hidden="true">
                    <IconComp />
                  </div>
                  <h2 className="m-card-title m-uc-card-title">
                    <NextLink
                      href={`/use-cases/${v.slug.replace('operations-knowledge', 'operations')}`}
                      className="m-card-stretch">
                      {v.name}
                    </NextLink>
                  </h2>
                  <p className="m-card-desc">{v.description}</p>
                  <div className="m-stack-sm">
                    <h3 className="m-meta">Included Document Types</h3>
                    <ul className="m-cluster m-plain-list m-uc-types">
                      {v.templates.map(t => (
                        <li key={t} className="m-badge">
                          {t}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <span className="m-card-link m-card-footer" aria-hidden="true">
                    Explore vertical overview
                    <ArrowRight size={14} />
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </section>
    </div>
  );
}
