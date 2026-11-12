'use client';

import {useId, useMemo, useState} from 'react';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {Heading} from '@astryxdesign/core/Heading';
import {Text} from '@astryxdesign/core/Text';
import {TextInput} from '@astryxdesign/core/TextInput';
import {Button} from '@astryxdesign/core/Button';
import {
  BLOCK_CATALOG,
  CONTENT_CARDS,
  DOCUMENT_TYPES,
  EXPORTS_READY,
  EXPORT_LABELS,
  TEMPLATE_CATEGORIES,
  templateLibrary,
  templateMatches,
  universalTemplates,
  type DocumentTemplate,
  type SuggestedBlock,
  type TemplateCategory,
} from '@studio/shared';

const keyOf = (template: DocumentTemplate) => `${template.id}@${template.version}`;
const blockLabel = (name: SuggestedBlock) => (name in BLOCK_CATALOG ? BLOCK_CATALOG[name as keyof typeof BLOCK_CATALOG].label : CONTENT_CARDS[name as keyof typeof CONTENT_CARDS]);

/**
 * The template library (multi-vertical Phase 2): every template the app ships, found by category
 * or by search, each with a preview of what it is for, who it is for, its sections, the blocks it
 * recommends and how it can be exported. Everything shown comes from the template registry in
 * `@studio/shared`: adding a template there adds it here.
 *
 * `onChoose` makes it a picker (radio cards, used by the Create Document flow); without it, each
 * preview has a "Use this template" link (the library page).
 */
export function TemplateGallery({value, onChoose}: {value?: string; onChoose?: (template: DocumentTemplate) => void}) {
  const groupName = useId();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<TemplateCategory | 'all'>('all');
  const [browsed, setBrowsed] = useState<string | undefined>(value);
  const library = useMemo(() => templateLibrary(), []);
  const blank = useMemo(() => universalTemplates(), []);

  const selected = onChoose ? value : browsed;
  const select = (template: DocumentTemplate) => (onChoose ? onChoose(template) : setBrowsed(keyOf(template)));

  const groups = library
    .filter(group => category === 'all' || group.category === category)
    .map(group => ({...group, types: group.types.map(type => ({...type, templates: type.templates.filter(template => templateMatches(template, query))}))}))
    // Categories that have templates today come first; the ones still to come follow.
    .sort((first, second) => Number(second.types.some(type => type.templates.length)) - Number(first.types.some(type => type.templates.length)));
  const blanks = category === 'all' ? blank.filter(template => templateMatches(template, query)) : [];
  const found = groups.reduce((count, group) => count + group.types.reduce((sum, type) => sum + type.templates.length, 0), 0) + blanks.length;
  const all = [...library.flatMap(group => group.types.flatMap(type => type.templates)), ...blank];
  const chosen = all.find(template => keyOf(template) === selected);

  const card = (template: DocumentTemplate, badge?: string) => (
    <label key={keyOf(template)} className="setup-choice">
      <input type="radio" name={groupName} value={keyOf(template)} checked={selected === keyOf(template)} onChange={() => select(template)} className="setup-choice-input" />
      <span className="setup-choice-text">
        <span className="setup-choice-label t-web-heading-sm">
          {template.name}
          {badge && <span className="setup-badge t-web-label-md-medium">{badge}</span>}
        </span>
        <span className="setup-choice-description t-web-body-lg-regular">{template.description}</span>
      </span>
    </label>
  );

  return (
    <div className="template-gallery">
      <VStack gap={5} className="template-gallery-list">
        <HStack gap={3} wrap="wrap" vAlign="end">
          <div className="template-search">
            <TextInput label="Search templates" description="Search by name, kind of document or section." value={query} onChange={setQuery} width="100%" />
          </div>
        </HStack>
        <fieldset className="template-cats">
          <legend className="sr-only">Category</legend>
          {(['all', ...(Object.keys(TEMPLATE_CATEGORIES) as TemplateCategory[])] as const).map(id => (
            <label key={id} className="template-cat t-web-label-lg-medium">
              <input type="radio" name={`${groupName}-category`} value={id} checked={category === id} onChange={() => setCategory(id)} className="sr-only" />
              <span>{id === 'all' ? 'All' : TEMPLATE_CATEGORIES[id].label}</span>
            </label>
          ))}
        </fieldset>

        <span className="sr-only" role="status">
          {query ? `${found} ${found === 1 ? 'template matches' : 'templates match'} “${query}”.` : ''}
        </span>
        {found === 0 && (
          <Text color="secondary">
            No template matches “{query}”. Check the spelling, try a shorter word, or choose All to search every category.
          </Text>
        )}

        {/* One radio group across every category: arrow keys move through all the templates. */}
        <div role="radiogroup" aria-label="Templates" className="template-groups">
          {groups.map(group => {
            const hasTemplates = group.types.some(type => type.templates.length);
            const planned = query ? [] : group.types.filter(type => !type.templates.length);
            if (!hasTemplates && !planned.length) return null;
            return (
              <section key={group.category} className="template-group" aria-label={group.label}>
                <VStack gap={1}>
                  <Heading level={3}>{group.label}</Heading>
                  <Text type="supporting" color="secondary">
                    {group.description}
                  </Text>
                </VStack>
                {hasTemplates && (
                  // The kind of document is named on the card only where a category offers more than one kind.
                  <div className="setup-choices">
                    {group.types.flatMap(type => type.templates.map(template => card(template, group.types.filter(other => other.templates.length).length > 1 ? type.label : undefined)))}
                  </div>
                )}
                {planned.length > 0 && (
                  <ul className="template-planned" aria-label={`Not available yet in ${group.label}`}>
                    {planned.map(type => (
                      <li key={type.type}>
                        <span className="t-web-label-lg-medium">{type.label}</span>
                        <span className="setup-badge template-soon t-web-label-md-medium">Coming later</span>
                        <span className="template-planned-text t-web-body-lg-regular">{type.description}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
          {blanks.length > 0 && (
            <section className="template-group" aria-label="Start from scratch">
              <VStack gap={1}>
                <Heading level={3}>Start from scratch</Heading>
                <Text type="supporting" color="secondary">
                  No suggested structure. Every block is available.
                </Text>
              </VStack>
              <div className="setup-choices">{blanks.map(template => card(template))}</div>
            </section>
          )}
        </div>
      </VStack>

      <TemplatePreview template={chosen} useHref={onChoose || !chosen ? undefined : `/studio/documents/new?template=${encodeURIComponent(chosen.id)}`} />
    </div>
  );
}

/** What a template is: purpose, audience, its sections in order, recommended blocks and exports. */
export function TemplatePreview({template, useHref}: {template: DocumentTemplate | undefined; useHref?: string}) {
  if (!template) {
    return (
      <aside className="setup-preview template-preview" aria-label="Template preview">
        <Text color="secondary">Choose a template to see what it is for, its sections and the blocks it recommends.</Text>
      </aside>
    );
  }
  const type = template.documentType === 'any' ? null : DOCUMENT_TYPES[template.documentType];
  const acts = Object.keys(template.acts).filter(act => template.sections.some(section => section.act === act));
  const exports = template.exportProfiles.filter(profile => EXPORTS_READY.includes(profile));
  return (
    <aside className="setup-preview template-preview" aria-label={`About ${template.name}`} aria-live="polite">
      <VStack gap={5}>
        <VStack gap={2}>
          <Heading level={3}>{template.name}</Heading>
          {type && (
            <Text type="supporting" color="secondary">
              {type.label} · {TEMPLATE_CATEGORIES[type.category].label}
            </Text>
          )}
          <Text>{template.purpose}</Text>
        </VStack>
        {useHref && <Button label="Use this template" variant="primary" href={useHref} />}
        <dl className="template-facts">
          {template.audience.length > 0 && (
            <div>
              <dt className="t-web-label-lg-medium">Made for</dt>
              <dd className="t-web-body-lg-regular">{template.audience.join(', ')}</dd>
            </div>
          )}
          {template.recommendedBlocks.length > 0 && (
            <div>
              <dt className="t-web-label-lg-medium">Recommended blocks</dt>
              <dd className="t-web-body-lg-regular">{template.recommendedBlocks.map(blockLabel).join(', ')}</dd>
            </div>
          )}
          <div>
            <dt className="t-web-label-lg-medium">Export as</dt>
            <dd className="t-web-body-lg-regular">{exports.map(profile => EXPORT_LABELS[profile]).join(', ')}</dd>
          </div>
        </dl>
        <VStack gap={3}>
          <Heading level={4}>{template.sections.length ? `${template.sections.length} sections` : 'Sections'}</Heading>
          {template.sections.length ? (
            <>
              {acts.length > 1 && (
                <ol className="setup-flow t-web-label-lg-medium" aria-label="How the document flows">
                  {acts.map(act => (
                    <li key={act}>{template.acts[act]}</li>
                  ))}
                </ol>
              )}
              <ol className="setup-preview-sections">
                {template.sections.map(section => (
                  <li key={section.key}>
                    <span className="setup-preview-title t-web-heading-sm">
                      {section.title}
                      {!section.required && <span className="setup-preview-optional t-web-body-lg-regular"> (optional)</span>}
                    </span>
                    <span className="setup-preview-purpose t-web-body-lg-regular">{section.purpose}</span>
                  </li>
                ))}
              </ol>
              <Text type="supporting" color="secondary">
                Sections are suggestions. You can rename, reorder, add and remove them before you start and while you write.
              </Text>
            </>
          ) : (
            <Text color="secondary">You start with an empty page. Add your own sections in the outline step, or as you write.</Text>
          )}
        </VStack>
      </VStack>
    </aside>
  );
}
