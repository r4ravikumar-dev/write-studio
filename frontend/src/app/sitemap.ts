import type {MetadataRoute} from 'next';
import {MARKETING_TEMPLATES} from '@studio/shared';
import {RESOURCE_ARTICLES} from '@/lib/marketing/articles';
import {SITE_URL} from '@/lib/marketing/site';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    {url: `${SITE_URL}/`, lastModified: now, changeFrequency: 'weekly', priority: 1.0},
    {url: `${SITE_URL}/product`, lastModified: now, changeFrequency: 'weekly', priority: 0.9},
    {url: `${SITE_URL}/templates`, lastModified: now, changeFrequency: 'daily', priority: 0.9},
    {url: `${SITE_URL}/how-it-works`, lastModified: now, changeFrequency: 'monthly', priority: 0.8},
    {url: `${SITE_URL}/use-cases`, lastModified: now, changeFrequency: 'weekly', priority: 0.8},
    {url: `${SITE_URL}/use-cases/product-engineering`, lastModified: now, changeFrequency: 'monthly', priority: 0.8},
    {url: `${SITE_URL}/use-cases/marketing-growth`, lastModified: now, changeFrequency: 'monthly', priority: 0.8},
    {url: `${SITE_URL}/use-cases/design-research`, lastModified: now, changeFrequency: 'monthly', priority: 0.8},
    {url: `${SITE_URL}/use-cases/operations`, lastModified: now, changeFrequency: 'monthly', priority: 0.8},
    {url: `${SITE_URL}/resources`, lastModified: now, changeFrequency: 'weekly', priority: 0.8},
    {url: `${SITE_URL}/security`, lastModified: now, changeFrequency: 'monthly', priority: 0.7},
    {url: `${SITE_URL}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.7},
    {url: `${SITE_URL}/faq`, lastModified: now, changeFrequency: 'monthly', priority: 0.7},
    {url: `${SITE_URL}/pricing`, lastModified: now, changeFrequency: 'monthly', priority: 0.7},
    {url: `${SITE_URL}/contact`, lastModified: now, changeFrequency: 'monthly', priority: 0.6},
    {url: `${SITE_URL}/accessibility`, lastModified: now, changeFrequency: 'monthly', priority: 0.5},
    {url: `${SITE_URL}/privacy`, lastModified: now, changeFrequency: 'monthly', priority: 0.5},
    {url: `${SITE_URL}/terms`, lastModified: now, changeFrequency: 'monthly', priority: 0.5},
    {url: `${SITE_URL}/cookies`, lastModified: now, changeFrequency: 'monthly', priority: 0.5},
  ];

  const templateRoutes: MetadataRoute.Sitemap = MARKETING_TEMPLATES.map(template => ({
    url: `${SITE_URL}/templates/${template.slug}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.85,
  }));

  const guideRoutes: MetadataRoute.Sitemap = RESOURCE_ARTICLES.map(article => ({
    url: `${SITE_URL}/resources/guides/${article.slug}`,
    lastModified: now,
    changeFrequency: 'monthly',
    priority: 0.6,
  }));

  return [...staticRoutes, ...templateRoutes, ...guideRoutes];
}
