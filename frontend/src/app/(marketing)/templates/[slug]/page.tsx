import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import NextLink from 'next/link';
import {TemplateCard} from '@/components/marketing/TemplateCard';
import {cardTemplate} from '@/lib/marketing/templateCards';
import {FloatingCta} from '@/components/marketing/motion/FloatingCta';
import {ArrowRight, CheckCircle2, Sparkles} from 'lucide-react';
import {
  MARKETING_TEMPLATES,
  getMarketingTemplate,
} from '@studio/shared';

type TemplatePageProps = {
  params: Promise<{slug: string}>;
};

export async function generateStaticParams() {
  return MARKETING_TEMPLATES.map(template => ({
    slug: template.slug,
  }));
}

export async function generateMetadata({params}: TemplatePageProps): Promise<Metadata> {
  const {slug} = await params;
  const template = getMarketingTemplate(slug);
  if (!template) return {title: 'Template Not Found'};

  return {
    title: {absolute: template.marketingTitle},
    description: template.marketingDescription,
    alternates: {
      canonical: `/templates/${slug}`,
    },
    openGraph: {
      title: template.marketingTitle,
      description: template.marketingDescription,
      type: 'article',
    },
  };
}

/** Same card as the template catalogue: one stretched link per card. */
export default async function IndividualTemplatePage({params}: TemplatePageProps) {
  const {slug} = await params;
  const template = getMarketingTemplate(slug);
  if (!template) notFound();

  const related = template.relatedSlugs
    .map(relSlug => getMarketingTemplate(relSlug))
    .filter((t): t is NonNullable<typeof t> => Boolean(t));
  const sections = template.suggestedSections;

  return (
    <div className="marketing-template-detail">
      <div className="m-container">
        <nav className="m-breadcrumbs" aria-label="Breadcrumb">
          <ol>
            <li>
              <NextLink href="/">Home</NextLink>
            </li>
            <li>
              <NextLink href="/templates">Templates</NextLink>
            </li>
            <li aria-current="page">{template.name}</li>
          </ol>
        </nav>
      </div>

      <FloatingCta
        watchId="template-hero-actions"
        label={template.name}
        cta="Use this template"
        href={`/signup?template=${template.slug}`}
      />

      {/* Hero */}
      <section className="m-section-hero m-tpl-hero">
        <div className="m-container">
          <div className="m-hero-head">
            <div className="m-cluster m-tpl-tags">
              <span className="m-eyebrow">{template.categoryLabel}</span>
              <span className="m-badge m-badge--success">
                <CheckCircle2 aria-hidden="true" />
                Available in Studio
              </span>
            </div>
            <h1 className="m-title-display">{template.heroHeadline}</h1>
            <p className="m-subtitle">{template.heroCopy}</p>
            <div id="template-hero-actions" className="m-actions">
              <NextLink href={`/signup?template=${template.slug}`} className="m-btn m-btn-primary m-btn-lg">
                <span>Use this template</span>
                <ArrowRight size={18} aria-hidden="true" />
              </NextLink>
              <NextLink href="#outline" className="m-btn m-btn-secondary m-btn-lg">
                <span>View document outline</span>
              </NextLink>
            </div>
          </div>
        </div>
      </section>

      {/* Audience and purpose */}
      <section className="m-section m-section--muted">
        <div className="m-container">
          <div className="m-split m-tpl-split">
            <div className="m-split-copy">
              <span className="m-eyebrow">Audience & Purpose</span>
              <h2 className="m-title-h2">Built for {template.categoryLabel.toLowerCase()}</h2>
              <p className="m-subtitle">{template.whatItHelpsCreate}</p>

              <div className="m-stack-sm">
                <h3 className="m-meta">Intended Audience</h3>
                <ul className="m-cluster m-plain-list m-tpl-audience">
                  {template.audience.map(aud => (
                    <li key={aud} className="m-badge">
                      {aud}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="m-stack-sm">
                <h3 className="m-meta">Sample Realistic Highlights</h3>
                <ul className="m-bullets">
                  {template.sampleHighlights.map(hl => (
                    <li key={hl}>{hl}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="m-panel m-panel--card">
              <h3 className="m-title-h4 m-tpl-panel-title">
                <Sparkles aria-hidden="true" />
                Supported Visual & Data Blocks
              </h3>
              <p className="m-text-sm">This template recommends these content blocks:</p>
              <ul className="m-checklist">
                {template.supportedBlocks.map(block => (
                  <li key={block}>{block}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Suggested document outline: the real template's sections */}
      <section id="outline" className="m-section">
        <div className="m-container-narrow">
          <div className="m-section-head m-section-head--center">
            <span className="m-eyebrow">Document Architecture</span>
            <h2 className="m-title-h2">Suggested Document Outline</h2>
            <p className="m-subtitle">
              Start with these {sections.length} core sections. Reorder, customise or add your own sections anytime.
            </p>
          </div>

          <ol className="m-rows m-tpl-outline">
            {sections.map((sec, idx) => (
              <li key={sec}>
                <span className="m-row-index" aria-hidden="true">
                  {(idx + 1).toString().padStart(2, '0')}
                </span>
                <span className="m-row-title">{sec}</span>
                <span className="m-badge m-badge--brand">Suggested Guidance</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Related templates */}
      {related.length > 0 && (
        <section className="m-section m-section--muted">
          <div className="m-container">
            <div className="m-section-head">
              <h2 className="m-title-h2">Related document templates</h2>
            </div>
            <ul className="m-grid-3 m-plain-list">
              {related.map(rel => (
                <TemplateCard key={rel.slug} template={cardTemplate(rel)} />
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Conversion banner */}
      <section className="m-section">
        <div className="m-container">
          <div className="m-banner-cta">
            <h2>Ready to create your {template.name.toLowerCase()}?</h2>
            <p>Create your account, start from this template, and follow guided section prompts.</p>
            <NextLink href={`/signup?template=${template.slug}`} className="m-btn m-btn-inverse m-btn-lg">
              <span>Start creating now</span>
              <ArrowRight size={18} aria-hidden="true" />
            </NextLink>
          </div>
        </div>
      </section>
    </div>
  );
}
