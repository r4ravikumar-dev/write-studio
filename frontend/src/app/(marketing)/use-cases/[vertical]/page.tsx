import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import NextLink from 'next/link';
import {TemplateCard} from '@/components/marketing/TemplateCard';
import {cardTemplate} from '@/lib/marketing/templateCards';
import {ArrowRight, Code2, BarChart3, Layers, ListTodo} from 'lucide-react';
import {
  getMarketingTemplatesByCategory,
  type TemplateCategory,
} from '@studio/shared';

type VerticalPageProps = {
  params: Promise<{vertical: string}>;
};

const VERTICAL_CONFIGS: Record<
  string,
  {
    category: TemplateCategory;
    name: string;
    h1: string;
    subtitle: string;
    icon: typeof Code2;
    ctaText: string;
  }
> = {
  'product-engineering': {
    category: 'product_engineering',
    name: 'Product & Engineering',
    h1: 'Make technical work easier to explain.',
    subtitle:
      'Create developer guides, feature specifications, release documentation and architecture records with structures designed around engineering workflows.',
    icon: Code2,
    ctaText: 'Explore product and engineering templates',
  },
  'marketing-growth': {
    category: 'marketing_growth',
    name: 'Marketing & Growth',
    h1: 'Turn campaigns and customer outcomes into clear stories.',
    subtitle:
      'Document strategies, customer challenges, campaign execution and measurable results in structured marketing documents.',
    icon: BarChart3,
    ctaText: 'Explore marketing templates',
  },
  'design-research': {
    category: 'design_research',
    name: 'Design & Research',
    h1: 'Give your creative and research work a clear story.',
    subtitle:
      'Explain the problem, show your process and present the decisions behind your work through structured case studies and research documents.',
    icon: Layers,
    ctaText: 'Explore design templates',
  },
  operations: {
    category: 'operations_knowledge',
    name: 'Operations & Knowledge',
    h1: 'Make important processes easier to follow.',
    subtitle:
      'Turn operational knowledge, repeatable tasks and team procedures into organised, practical documents.',
    icon: ListTodo,
    ctaText: 'Explore operations templates',
  },
};

export async function generateStaticParams() {
  return Object.keys(VERTICAL_CONFIGS).map(vertical => ({vertical}));
}

export async function generateMetadata({params}: VerticalPageProps): Promise<Metadata> {
  const {vertical} = await params;
  const config = VERTICAL_CONFIGS[vertical];
  if (!config) return {title: 'Vertical Not Found'};

  return {
    title: `${config.name} Document Creation`,
    description: config.subtitle,
    alternates: {
      canonical: `/use-cases/${vertical}`,
    },
  };
}

/** Same card as the template catalogue: one stretched link per card. */
export default async function VerticalDetailPage({params}: VerticalPageProps) {
  const {vertical} = await params;
  const config = VERTICAL_CONFIGS[vertical];
  if (!config) notFound();

  const templates = getMarketingTemplatesByCategory(config.category);
  const IconComp = config.icon;

  return (
    <div className="marketing-vertical-detail">
      <div className="m-container">
        <nav className="m-breadcrumbs" aria-label="Breadcrumb">
          <ol>
            <li>
              <NextLink href="/">Home</NextLink>
            </li>
            <li>
              <NextLink href="/use-cases">Use Cases</NextLink>
            </li>
            <li aria-current="page">{config.name}</li>
          </ol>
        </nav>
      </div>

      {/* Hero */}
      <section className="m-section-hero m-tpl-hero">
        <div className="m-container">
          <div className="m-hero-head">
            <span className="m-eyebrow">
              <IconComp size={16} aria-hidden="true" />
              {config.name} Vertical
            </span>
            <h1 className="m-title-display">{config.h1}</h1>
            <p className="m-subtitle">{config.subtitle}</p>
            <div className="m-actions">
              <NextLink href="/signup" className="m-btn m-btn-primary m-btn-lg">
                <span>Start creating</span>
                <ArrowRight size={18} aria-hidden="true" />
              </NextLink>
            </div>
          </div>
        </div>
      </section>

      {/* Templates for this vertical */}
      <section className="m-section m-section--muted">
        <div className="m-container">
          <div className="m-section-head">
            <h2 className="m-title-h2">Purpose-built templates for {config.name.toLowerCase()}</h2>
            <p className="m-subtitle">
              Choose a starting point designed around the exact requirements of your discipline.
            </p>
          </div>

          <ul className="m-grid-3 m-plain-list">
            {templates.map(template => (
              <TemplateCard key={template.slug} template={cardTemplate(template)} />
            ))}
          </ul>
        </div>
      </section>

      {/* Conversion banner */}
      <section className="m-section">
        <div className="m-container">
          <div className="m-banner-cta">
            <h2>Give your {config.name.toLowerCase()} work the structure it deserves.</h2>
            <p>Create clear, high-impact documents in your personal private workspace.</p>
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
