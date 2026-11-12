import {blocksFor, isSuggestedBlock, type SuggestedBlock} from '../blocks/catalog';
import {CURRENT_FRAMEWORKS, DEFAULT_FRAMEWORK, FRAMEWORKS} from '../frameworks';
import {DEFAULT_DOCUMENT_TYPE, DOCUMENT_TYPES, TEMPLATE_CATEGORIES, type DocumentTemplate, type DocumentType, type TemplateCategory, type TemplateSection} from './types';

export * from './types';

/**
 * The template registry: every template version ever released, from every pack. Add a pack's
 * templates here; never edit or remove a released version (documents keep the id and version they
 * were made with). `templateProblems()` checks the rules and runs in the offline tests.
 */
export const TEMPLATES: readonly DocumentTemplate[] = [...FRAMEWORKS];

/** The newest version of each template: what new documents are offered. */
export const CURRENT_TEMPLATES: readonly DocumentTemplate[] = [...CURRENT_FRAMEWORKS];

export function getTemplate(id: unknown, version: unknown): DocumentTemplate | undefined {
  return TEMPLATES.find(template => template.id === id && template.version === version);
}

/**
 * A section of any template version, by its key (a key means one section across every template).
 * Pass the document's own template to get that version's section (its recommendations may differ).
 */
export function templateSection(key: unknown, preferred?: DocumentTemplate): TemplateSection | undefined {
  if (typeof key !== 'string') return undefined;
  const own = preferred?.sections.find(candidate => candidate.key === key);
  if (own) return own;
  for (const template of TEMPLATES) {
    const section = template.sections.find(candidate => candidate.key === key);
    if (section) return section;
  }
  return undefined;
}

export function isDocumentType(value: unknown): value is DocumentType {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(DOCUMENT_TYPES, value);
}

/** A document type people can create today: it has at least one current template of its own. */
export function isAvailableDocumentType(value: unknown): value is DocumentType {
  return isDocumentType(value) && CURRENT_TEMPLATES.some(template => template.documentType === value);
}

/** The templates a new document of this type can start from (its own, then the ones that fit any type). */
export function templatesFor(documentType: DocumentType): DocumentTemplate[] {
  return [...CURRENT_TEMPLATES.filter(template => template.documentType === documentType), ...CURRENT_TEMPLATES.filter(template => template.documentType === 'any')];
}

/** The template a new document of this type starts from unless the user chooses another. */
export function defaultTemplate(documentType: DocumentType = DEFAULT_DOCUMENT_TYPE): DocumentTemplate | undefined {
  if (documentType === DEFAULT_FRAMEWORK.documentType) return DEFAULT_FRAMEWORK;
  return templatesFor(documentType)[0];
}

/** The type of a document made with this template (`fallback` for templates that fit any type). */
export function documentTypeOf(template: DocumentTemplate | undefined, fallback?: unknown): DocumentType {
  if (template && template.documentType !== 'any') return template.documentType;
  return isAvailableDocumentType(fallback) ? fallback : DEFAULT_DOCUMENT_TYPE;
}

/** "case study", "guide": the document in a sentence. */
export function documentNoun(documentType: unknown): string {
  return isDocumentType(documentType) ? DOCUMENT_TYPES[documentType].noun : 'document';
}

/** Whether a title is only the placeholder a new document gets ("Untitled case study", "Untitled guide"). */
export function isUntitledTitle(title: unknown): boolean {
  if (typeof title !== 'string') return false;
  const text = title.trim();
  return text === 'Untitled document' || Object.values(DOCUMENT_TYPES).some(type => text === `Untitled ${type.noun}`);
}

/** A new document's title until it has one. */
export function untitledTitle(documentType: unknown): string {
  return `Untitled ${documentNoun(documentType)}`;
}

export type BlockRecommendationContext = {
  /** The document's own template version. */
  template?: DocumentTemplate;
  documentType?: DocumentType;
  /** The template section the cursor is in, if any. */
  sectionKey?: string | null;
};

/**
 * What to suggest inserting here, best first: the section's own suggestions, then the template's,
 * then the blocks made for the document type. Suggestions only; nothing is ever hidden.
 */
export function recommendBlocks(context: BlockRecommendationContext): SuggestedBlock[] {
  const section = context.sectionKey ? templateSection(context.sectionKey, context.template) : undefined;
  const type = context.documentType ?? (context.template && context.template.documentType !== 'any' ? context.template.documentType : undefined);
  return [...new Set<SuggestedBlock>([...(section?.suggestedBlocks ?? []), ...(context.template?.recommendedBlocks ?? []), ...(type ? blocksFor(type) : [])])];
}

/**
 * The template's own details from the browser, cleaned: only its `metadata` fields, as trimmed,
 * capped text. Unknown keys and empty values are dropped.
 */
export function cleanMetadata(template: DocumentTemplate | undefined, input: unknown): Record<string, string> {
  const raw = (input && typeof input === 'object' && !Array.isArray(input) ? input : {}) as Record<string, unknown>;
  const clean: Record<string, string> = {};
  for (const field of template?.metadataFields ?? []) {
    if (field.storage !== 'metadata') continue;
    const value = typeof raw[field.key] === 'string' ? (raw[field.key] as string).trim().slice(0, field.max) : '';
    if (value) clean[field.key] = value;
  }
  return clean;
}

export type TemplateLibraryGroup = {
  category: TemplateCategory;
  label: string;
  description: string;
  /** The category's document types, each with the templates a new document can start from ([] = not available yet). */
  types: {type: DocumentType; label: string; description: string; templates: DocumentTemplate[]}[];
};

/** The template library: categories in order, their document types, and each type's current templates. */
export function templateLibrary(): TemplateLibraryGroup[] {
  return (Object.keys(TEMPLATE_CATEGORIES) as TemplateCategory[]).map(category => ({
    category,
    ...TEMPLATE_CATEGORIES[category],
    types: (Object.keys(DOCUMENT_TYPES) as DocumentType[])
      .filter(type => DOCUMENT_TYPES[type].category === category)
      .map(type => ({type, label: DOCUMENT_TYPES[type].label, description: DOCUMENT_TYPES[type].description, templates: CURRENT_TEMPLATES.filter(template => template.documentType === type)})),
  }));
}

/** The templates that fit any kind of document (Blank). */
export function universalTemplates(): DocumentTemplate[] {
  return CURRENT_TEMPLATES.filter(template => template.documentType === 'any');
}

/**
 * Whether a template matches what someone typed in the library's search: every word must appear in
 * its name, description, purpose, audience, document type or a section title. Category names are
 * left out on purpose (the category filter does that): "research" should find the research
 * template, not everything under Design & Research.
 */
export function templateMatches(template: DocumentTemplate, query: string): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const type = template.documentType === 'any' ? null : DOCUMENT_TYPES[template.documentType];
  const haystack = [template.name, template.description, template.purpose, ...template.audience, type?.label, type?.description, type ? '' : 'blank empty', ...template.sections.map(section => section.title)]
    .join(' ')
    .toLowerCase();
  return words.every(word => haystack.includes(word));
}

/** The newest released version of a template, when the given one is older (else undefined). */
export function newerTemplate(template: DocumentTemplate | undefined): DocumentTemplate | undefined {
  if (!template) return undefined;
  const newest = CURRENT_TEMPLATES.find(candidate => candidate.id === template.id);
  return newest && newest.version > template.version ? newest : undefined;
}

export type TemplateChanges = {
  /** Sections the newer version has and the older one doesn't. Never added to a document automatically. */
  added: TemplateSection[];
  /** Sections the newer version no longer suggests. A document's own copies of them are never removed. */
  removed: TemplateSection[];
  /** Sections whose guidance (purpose, questions, evidence, criteria) reads differently. */
  guidanceChanged: TemplateSection[];
  /** Sections that recommend different blocks. */
  recommendationsChanged: TemplateSection[];
  /** Sections that became required or optional. */
  requiredChanged: TemplateSection[];
};

/**
 * What moving a document from one version of its template to another would change. Templates only
 * guide: a document's content is never touched by an upgrade, only what the guide, the review and
 * Insert suggest. This is the "before and after" the upgrade dialog shows.
 */
export function templateChanges(from: DocumentTemplate, to: DocumentTemplate): TemplateChanges {
  const before = new Map(from.sections.map(section => [section.key, section]));
  const after = new Set(to.sections.map(section => section.key));
  const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
  const kept = to.sections.filter(section => before.has(section.key));
  const guidance = (section: TemplateSection) => [section.purpose, section.hint, section.prompts, section.writingGuidance, section.suggestedEvidence, section.completionCriteria];
  return {
    added: to.sections.filter(section => !before.has(section.key)),
    removed: from.sections.filter(section => !after.has(section.key)),
    guidanceChanged: kept.filter(section => !same(guidance(section), guidance(before.get(section.key)!))),
    recommendationsChanged: kept.filter(section => !same(section.suggestedBlocks, before.get(section.key)!.suggestedBlocks)),
    requiredChanged: kept.filter(section => section.required !== before.get(section.key)!.required),
  };
}

/** Everything wrong with the registry (none, in a healthy one). Run by the offline tests. */
export function templateProblems(templates: readonly DocumentTemplate[] = TEMPLATES): string[] {
  const problems: string[] = [];
  const versions = new Set<string>();
  const keyOwner = new Map<string, {template: string; title: string}>();
  for (const template of templates) {
    const name = `${template.id} v${template.version}`;
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(template.id) || template.id.length > 60) problems.push(`${name}: the id must be lowercase words joined by hyphens.`);
    if (!Number.isInteger(template.version) || template.version < 1) problems.push(`${name}: the version must be a whole number from 1.`);
    if (versions.has(name)) problems.push(`${name}: released twice.`);
    versions.add(name);
    if (template.documentType !== 'any' && !isDocumentType(template.documentType)) problems.push(`${name}: unknown document type.`);
    if (!template.exportProfiles.length) problems.push(`${name}: needs at least one export profile.`);
    if (!template.description.trim() || !template.purpose.trim()) problems.push(`${name}: needs a description and a purpose.`);
    if (template.documentType !== 'any' && !template.sections.length) problems.push(`${name}: needs at least one section.`);
    const rules = new Set(template.validationRules.map(rule => rule.key));
    if (rules.size !== template.validationRules.length) problems.push(`${name}: two validation rules share a key.`);
    const fields = new Set(template.metadataFields.map(field => field.key));
    if (fields.size !== template.metadataFields.length) problems.push(`${name}: two metadata fields share a key.`);
    for (const block of template.recommendedBlocks) if (!isSuggestedBlock(block)) problems.push(`${name}: recommends an unknown block, ${block}.`);
    const own = new Set<string>();
    for (const section of template.sections) {
      const at = `${name}, section ${section.key}`;
      if (own.has(section.key)) problems.push(`${at}: the key is used twice in this template.`);
      own.add(section.key);
      // The same key in another template (or version) must be the same section: headings carry only the key.
      const owner = keyOwner.get(section.key);
      if (owner && owner.template !== template.id) problems.push(`${at}: the key already belongs to ${owner.template}.`);
      if (owner && owner.title !== section.title) problems.push(`${at}: a section key can’t change its title between versions.`);
      keyOwner.set(section.key, {template: template.id, title: section.title});
      if (!(section.act in template.acts)) problems.push(`${at}: unknown act, ${section.act}.`);
      if (section.covers && !rules.has(section.covers)) problems.push(`${at}: covers an unknown validation rule, ${section.covers}.`);
      for (const block of section.suggestedBlocks) if (!isSuggestedBlock(block)) problems.push(`${at}: suggests an unknown block, ${block}.`);
    }
  }
  return problems;
}

/** Earlier names (frameworks were the first templates). */
export const getFramework = getTemplate;
export const frameworkSection = templateSection;
