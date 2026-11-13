import NextLink from 'next/link';
import {ArrowRight, CheckCircle2} from 'lucide-react';
import type {CardTemplate} from '@/lib/marketing/templateCards';

/** The template card used by the catalogue, template pages and use-case pages: one stretched link per card. */
export function TemplateCard({template}: {template: CardTemplate}) {
  return (
    <li className="m-card">
      <div className="m-card-meta">
        <span className="m-meta">{template.categoryLabel}</span>
        <span className="m-badge m-badge--success">
          <CheckCircle2 aria-hidden="true" />
          Available
        </span>
      </div>
      <h3 className="m-card-title">
        <NextLink href={`/templates/${template.slug}`} className="m-card-stretch">
          {template.name}
        </NextLink>
      </h3>
      <p className="m-card-desc">{template.description}</p>
      <dl className="m-card-facts">
        <div>
          <dt>For</dt>
          <dd>{template.audience.join(', ')}</dd>
        </div>
        <div>
          <dt>Sections</dt>
          <dd>{template.sections.length}</dd>
        </div>
      </dl>
      <span className="m-card-link m-card-footer" aria-hidden="true">
        Explore template
        <ArrowRight size={14} />
      </span>
    </li>
  );
}
