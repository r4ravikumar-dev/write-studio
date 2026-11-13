import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import NextLink from 'next/link';
import {ArrowRight, Clock, Sparkles} from 'lucide-react';
import {RESOURCE_ARTICLES, getResourceArticle, type ResourceArticle} from '@/lib/marketing/articles';

type GuidePageProps = {
  params: Promise<{slug: string}>;
};

export async function generateStaticParams() {
  return RESOURCE_ARTICLES.map(a => ({slug: a.slug}));
}

export async function generateMetadata({params}: GuidePageProps): Promise<Metadata> {
  const {slug} = await params;
  const article = getResourceArticle(slug);
  if (!article) return {title: 'Article Not Found'};

  return {
    title: `${article.title}`,
    description: article.summary,
    alternates: {
      canonical: `/resources/guides/${slug}`,
    },
    openGraph: {
      title: article.title,
      description: article.summary,
      type: 'article',
    },
  };
}

/** Up to three other articles: same category first, then the rest in catalogue order. */
function relatedArticles(article: ResourceArticle): ResourceArticle[] {
  const others = RESOURCE_ARTICLES.filter(a => a.slug !== article.slug);
  return [...others.filter(a => a.category === article.category), ...others.filter(a => a.category !== article.category)].slice(
    0,
    3,
  );
}

export default async function GuideDetailPage({params}: GuidePageProps) {
  const {slug} = await params;
  const article = getResourceArticle(slug);
  if (!article) notFound();
  const related = relatedArticles(article);

  return (
    <article className="marketing-article">
      <div className="m-reading-progress" aria-hidden="true" />

      <nav aria-label="Breadcrumb" className="m-container-reading m-breadcrumbs">
        <ol>
          <li>
            <NextLink href="/">Home</NextLink>
          </li>
          <li>
            <NextLink href="/resources">Resources</NextLink>
          </li>
          <li aria-current="page">{article.title}</li>
        </ol>
      </nav>

      <div className="m-section-tight">
        <div className="m-container-reading">
          <header className="m-doc-head">
            <p className="m-meta m-guide-meta">
              <span>{article.audience}</span>
              <span className="m-guide-meta-time">
                <Clock aria-hidden="true" />
                {article.readTime}
              </span>
            </p>
            <h1 className="m-title-display">{article.title}</h1>
            <p className="m-subtitle">{article.summary}</p>
          </header>

          <div className="m-prose">
            {article.content.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>

          {article.templateSlug && (
            <aside className="m-panel m-panel--card m-guide-cta" aria-labelledby="guide-template-heading">
              <span className="m-eyebrow">
                <Sparkles size={14} aria-hidden="true" />
                Ready to put this into practice?
              </span>
              <h2 id="guide-template-heading" className="m-title-h4">
                Start with the {article.templateName} template
              </h2>
              <p className="m-text">
                Don&apos;t waste time formatting from a blank screen. Load the verified {article.templateName} framework into
                your private workspace with guided prompts for every section.
              </p>
              <div className="m-actions">
                <NextLink href={`/templates/${article.templateSlug}`} className="m-btn m-btn-primary">
                  <span>Explore the {article.templateName} template</span>
                  <ArrowRight size={16} aria-hidden="true" />
                </NextLink>
              </div>
            </aside>
          )}

          {related.length > 0 && (
            <nav className="m-guide-related" aria-labelledby="guide-related-heading">
              <h2 id="guide-related-heading" className="m-title-h4">
                Related reading
              </h2>
              <ul className="m-rows">
                {related.map(item => (
                  <li key={item.slug}>
                    <div>
                      <NextLink href={`/resources/guides/${item.slug}`} className="m-row-title m-guide-related-link">
                        {item.title}
                      </NextLink>
                      <span className="m-row-sub">
                        {item.audience} · {item.readTime}
                      </span>
                    </div>
                    <ArrowRight size={16} aria-hidden="true" className="m-guide-related-arrow" />
                  </li>
                ))}
              </ul>
              <div className="m-actions">
                <NextLink href="/resources" className="m-btn m-btn-secondary m-btn-sm">
                  All resources
                </NextLink>
              </div>
            </nav>
          )}
        </div>
      </div>
    </article>
  );
}
