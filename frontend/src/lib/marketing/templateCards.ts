import type {TemplateMarketingMetadata} from '@studio/shared';

/**
 * The plain data a template card (and the catalogue's search) needs. Built on the server and
 * passed to client components as props, so the browser never loads the shared template package.
 */
export type CardTemplate = {
  slug: string;
  name: string;
  category: string;
  categoryLabel: string;
  description: string;
  audience: string[];
  sections: string[];
};

export function cardTemplate(template: TemplateMarketingMetadata): CardTemplate {
  return {
    slug: template.slug,
    name: template.name,
    category: template.category,
    categoryLabel: template.categoryLabel,
    description: template.description,
    audience: [...template.audience],
    sections: [...template.suggestedSections],
  };
}
