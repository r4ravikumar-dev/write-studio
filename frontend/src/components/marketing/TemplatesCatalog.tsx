'use client';

import {useState, useMemo} from 'react';
import {Search} from 'lucide-react';
import type {CardTemplate} from '@/lib/marketing/templateCards';
import {TemplateCard} from './TemplateCard';

const CATEGORIES = [
  {id: 'all', label: 'All Templates'},
  {id: 'product_engineering', label: 'Product & Engineering'},
  {id: 'marketing_growth', label: 'Marketing & Growth'},
  {id: 'design_research', label: 'Design & Research'},
  {id: 'operations_knowledge', label: 'Operations & Knowledge'},
] as const;

export function TemplatesCatalog({templates}: {templates: CardTemplate[]}) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredTemplates = useMemo(() => {
    return templates.filter(template => {
      const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        template.name.toLowerCase().includes(q) ||
        template.description.toLowerCase().includes(q) ||
        template.audience.some(a => a.toLowerCase().includes(q)) ||
        template.sections.some(s => s.toLowerCase().includes(q));

      return matchesCategory && matchesSearch;
    });
  }, [templates, selectedCategory, searchQuery]);

  return (
    <div>
      <div className="m-catalog-controls">
        <div className="m-search m-catalog-search">
          <label htmlFor="template-search" className="sr-only">
            Search templates
          </label>
          <Search size={16} aria-hidden="true" />
          <input
            id="template-search"
            className="m-input"
            type="search"
            placeholder="Search by name, section or audience"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="m-cluster m-catalog-chips" role="group" aria-label="Filter by category">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              type="button"
              className="m-chip"
              aria-pressed={selectedCategory === cat.id}
              onClick={() => setSelectedCategory(cat.id)}>
              {cat.label}
            </button>
          ))}
        </div>
        <p className="sr-only" role="status">
          {filteredTemplates.length} {filteredTemplates.length === 1 ? 'template' : 'templates'} shown
        </p>
      </div>

      <ul className="m-grid-3 m-plain-list">
        {filteredTemplates.map(template => (
          <TemplateCard key={template.slug} template={template} />
        ))}
      </ul>

      {filteredTemplates.length === 0 && (
        <div className="m-empty">
          <p className="m-text">No templates match. Try another word, or show every category.</p>
          <button
            type="button"
            className="m-btn m-btn-secondary m-btn-sm"
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('all');
            }}>
            Reset filters
          </button>
        </div>
      )}
    </div>
  );
}
