import type {Metadata} from 'next';
import NextLink from 'next/link';
import {ArrowRight, Clock} from 'lucide-react';
import {RESOURCE_ARTICLES, type ResourceArticle} from '@/lib/marketing/articles';

export const metadata: Metadata = {
  title: 'Document Writing Guides & Resources',
  description:
    'Explore practical guides, writing frameworks and examples that help you explain your work more clearly. Practical guides for developers, PMs, designers and operators.',
  alternates: {
    canonical: '/resources',
  },
};

/** One resource card: the title link stretches over the card; the footer label is decorative. */
function ResourceCard({article, cta}: {article: ResourceArticle; cta: string}) {
  return (
    <li className="m-card">
      <div className="m-card-meta">
        <span className="m-meta m-res-audience">{article.audience}</span>
        <span className="m-caption m-res-time">
          <Clock aria-hidden="true" />
          {article.readTime}
        </span>
      </div>
      <h3 className="m-card-title">
        <NextLink href={`/resources/guides/${article.slug}`} className="m-card-stretch">
          {article.title}
        </NextLink>
      </h3>
      <p className="m-card-desc">{article.summary}</p>
      <span className="m-card-link m-card-footer" aria-hidden="true">
        {cta}
        <ArrowRight size={14} />
      </span>
    </li>
  );
}

export default function ResourcesIndexPage() {
  const guides = RESOURCE_ARTICLES.filter(a => a.category === 'guides');
  const examples = RESOURCE_ARTICLES.filter(a => a.category === 'examples');
  const insights = RESOURCE_ARTICLES.filter(a => a.category === 'insights');

  return (
    <div className="marketing-resources">
      {/* Hero */}
      <section className="m-section-hero">
        <div className="m-container">
          <div className="m-hero-head">
            <span className="m-eyebrow">Knowledge & Writing Hub</span>
            <h1 className="m-title-display">Better documents start with better thinking.</h1>
            <p className="m-subtitle">
              Explore practical guides, writing frameworks and examples that help you explain your work more clearly.
              Practical, field-tested guidance designed around real professional workflows.
            </p>
          </div>
        </div>
      </section>

      {/* Guides */}
      <section id="guides" className="m-section m-section--muted" aria-labelledby="guides-heading">
        <div className="m-container">
          <div className="m-section-head">
            <span className="m-eyebrow">Practical Guides</span>
            <h2 id="guides-heading" className="m-title-h2">
              Learn to create better documents
            </h2>
            <p className="m-subtitle">Frameworks, structures, and tactical instructions for high-stakes documents.</p>
          </div>
          <ul className="m-grid-3 m-plain-list">
            {guides.map(article => (
              <ResourceCard key={article.slug} article={article} cta="Read guide" />
            ))}
          </ul>
        </div>
      </section>

      {/* Examples */}
      <section id="examples" className="m-section" aria-labelledby="examples-heading">
        <div className="m-container">
          <div className="m-section-head">
            <span className="m-eyebrow">Real-World Examples</span>
            <h2 id="examples-heading" className="m-title-h2">
              Understand document structures
            </h2>
            <p className="m-subtitle">Analyse successful case studies and specifications from high-performing teams.</p>
          </div>
          <ul className="m-grid-3 m-plain-list">
            {examples.map(article => (
              <ResourceCard key={article.slug} article={article} cta="Explore example" />
            ))}
          </ul>
        </div>
      </section>

      {/* Insights */}
      <section id="insights" className="m-section m-section--muted" aria-labelledby="insights-heading">
        <div className="m-container">
          <div className="m-section-head">
            <span className="m-eyebrow">Writing Insights</span>
            <h2 id="insights-heading" className="m-title-h2">
              Improve the way you communicate work
            </h2>
            <p className="m-subtitle">Editorial clarity, accessibility standards, and document architecture advice.</p>
          </div>
          <ul className="m-grid-3 m-plain-list">
            {insights.map(article => (
              <ResourceCard key={article.slug} article={article} cta="Read insight" />
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
