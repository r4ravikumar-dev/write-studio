import type {Metadata} from 'next';
import {MARKETING_TEMPLATES} from '@studio/shared';
import {TemplatesCatalog} from '@/components/marketing/TemplatesCatalog';
import {cardTemplate} from '@/lib/marketing/templateCards';

export const metadata: Metadata = {
  title: 'Professional Document Templates',
  description:
    'Find templates for developer documentation, feature specifications, case studies, PRDs, technical designs and SOPs. Choose a template. Make it yours.',
  alternates: {
    canonical: '/templates',
  },
};

export default function TemplatesPage() {
  return (
    <div className="marketing-templates">
      <section className="m-section-hero">
        <div className="m-container">
          <div className="m-hero-head m-tpl-head">
            <span className="m-eyebrow">Template Library</span>
            <h1 className="m-title-display">Find the right starting point for your next document.</h1>
            <p className="m-subtitle">
              Explore purpose-built templates for product, engineering, design, marketing and operations. Each template
              gives you a suggested structure and guidance on what to include.
            </p>
          </div>

          <h2 className="sr-only">All templates</h2>
          <TemplatesCatalog templates={MARKETING_TEMPLATES.map(cardTemplate)} />
        </div>
      </section>
    </div>
  );
}
