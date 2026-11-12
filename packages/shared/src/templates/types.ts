import type {SuggestedBlock} from '../blocks/catalog';

/**
 * The template engine's vocabulary (multi-vertical foundation, 2026-11-12).
 *
 * The editor is universal; a template is data. A document keeps its `document_type` and the
 * template id + version it was made with, and a released template version is immutable: to change
 * one, add a version. Templates only suggest: people rename, reorder, add and remove sections.
 *
 * Template definitions live in code, one pack per discipline (the Design and research pack is
 * `../frameworks`); `./index.ts` is the registry every lookup goes through.
 */
export const TEMPLATE_CATEGORIES = {
  product_engineering: {label: 'Product & Engineering', description: 'Technical and product documents used to define, build, maintain and communicate software.'},
  marketing_growth: {label: 'Marketing & Growth', description: 'Customer stories and evidence-based marketing documents.'},
  design_research: {label: 'Design & Research', description: 'Design storytelling, research and experience documentation.'},
  operations_knowledge: {label: 'Operations & Knowledge', description: 'Repeatable processes, internal guidance and operational playbooks.'},
} as const;
export type TemplateCategory = keyof typeof TEMPLATE_CATEGORIES;

type DocumentTypeInfo = {
  label: string;
  /** In sentences: "This case study is archived." */
  noun: string;
  category: TemplateCategory;
  description: string;
  /** How its preview and exports are presented (Phase 6 output profiles). */
  presentation: Presentation;
  /** The master plan's release: 0 = existing, 1 and 2 = planned releases. */
  release: 0 | 1 | 2;
};

/** How a document type reads: its preview and export conventions. */
export type Presentation = 'editorial' | 'technical' | 'product' | 'changelog' | 'procedure';

/**
 * Every kind of document (ids from docs/multi-vertical-master-plan.json). The id is stored in
 * `studio_documents.document_type`: never rename one. A type can be created once a current
 * template of that type exists (`isAvailableDocumentType`); until then it is only listed.
 */
export const DOCUMENT_TYPES = {
  ux_case_study: {label: 'UX case study', noun: 'case study', category: 'design_research', presentation: 'editorial', release: 0, description: 'The story of a design project: the problem, your decisions and the outcome.'},
  developer_documentation: {label: 'Developer documentation', noun: 'guide', category: 'product_engineering', presentation: 'technical', release: 1, description: 'Guides, setup instructions and implementation documentation.'},
  feature_specification: {label: 'Feature specification', noun: 'specification', category: 'product_engineering', presentation: 'product', release: 1, description: 'A feature’s behaviour, requirements and acceptance criteria.'},
  release_notes: {label: 'Release notes', noun: 'release notes', category: 'product_engineering', presentation: 'changelog', release: 1, description: 'What changed in a release: features, fixes and breaking changes.'},
  marketing_case_study: {label: 'Marketing case study', noun: 'case study', category: 'marketing_growth', presentation: 'editorial', release: 1, description: 'A customer’s challenge, what was done and the measured results.'},
  product_requirements_document: {label: 'Product requirements document', noun: 'requirements document', category: 'product_engineering', presentation: 'product', release: 2, description: 'A product opportunity: goals, user needs and requirements.'},
  technical_design_document: {label: 'Technical design document', noun: 'design document', category: 'product_engineering', presentation: 'technical', release: 2, description: 'An architecture, its trade-offs and how it will be built.'},
  architecture_decision_record: {label: 'Architecture decision record', noun: 'decision record', category: 'product_engineering', presentation: 'technical', release: 2, description: 'One significant technical decision and its consequences.'},
  standard_operating_procedure: {label: 'Procedure or playbook', noun: 'procedure', category: 'operations_knowledge', presentation: 'procedure', release: 2, description: 'A process someone else can follow, step by step.'},
} as const satisfies Record<string, DocumentTypeInfo>;
export type DocumentType = keyof typeof DOCUMENT_TYPES;

/** What existing documents are, and what a document is when nothing says otherwise. */
export const DEFAULT_DOCUMENT_TYPE: DocumentType = 'ux_case_study';

/**
 * Output formats, most suitable first. How each looks comes from the document type's presentation
 * (the plan's editorial_pdf, developer_html, product_spec_pdf … are a format plus a presentation).
 * Exports are private copies made by the owner; none of them publishes anything.
 */
export type ExportProfile = 'pdf' | 'html_zip' | 'markdown' | 'json_backup';

export const EXPORT_LABELS: Record<ExportProfile, string> = {
  pdf: 'PDF',
  html_zip: 'Web page (HTML)',
  markdown: 'Markdown',
  json_backup: 'Backup (JSON)',
};

/**
 * The formats that can be exported today (Phase 6 enables all 4 profiles).
 */
export const EXPORTS_READY: readonly ExportProfile[] = ['pdf', 'html_zip', 'markdown', 'json_backup'];

/**
 * A detail the template asks for (role, version number, client name). `column` fields are the
 * project details that already have their own column; everything new is stored in `metadata`.
 */
export type MetadataField = {
  key: string;
  label: string;
  description?: string;
  kind: 'text' | 'longtext';
  max: number;
  storage: 'column' | 'metadata';
};

/**
 * One line of the review checklist. `section`: done when a section that `covers` this key (or one
 * of the listed section keys) has content. `evidence`: done when the document has an evidence block.
 */
export type ValidationRule = {
  key: string;
  label: string;
  description: string;
  check: 'section' | 'evidence';
  /** Section keys that count for this rule as well as sections whose `covers` is its key. */
  sections?: string[];
};

export type TemplateSection = {
  /** Stable across versions, and unique across templates: documents tag their section headings with it. */
  key: string;
  title: string;
  /** The placeholder under the section heading in the editor (never stored in the document). */
  hint: string;
  /** What the section is for, shown when choosing a template and in the guide. */
  purpose: string;
  /** The part of the template's arc the section belongs to (a key of the template's `acts`). */
  act: string;
  required: boolean;
  /** Questions to answer while writing. */
  prompts: string[];
  /** How to write it (tone, order, level of detail), when the prompts aren't enough. */
  writingGuidance?: string[];
  /** What to show as proof. */
  suggestedEvidence: string[];
  /** Recommended in Smart Insert for this section: blocks, or content cards (presets of blocks). */
  suggestedBlocks: SuggestedBlock[];
  /** What must be true before the section is marked complete (guidance only, never enforced). */
  completionCriteria?: string[];
  /** The review checklist rule this section counts for. */
  covers?: string;
};

export type DocumentTemplate = {
  id: string;
  version: number;
  name: string;
  /** One or two sentences, shown on the template's card. */
  description: string;
  /** What a document made with it achieves, shown in the template preview. */
  purpose: string;
  /** `any`: fits every document type (Blank). Its category is the document type's. */
  documentType: DocumentType | 'any';
  /** Who it is for, in words ("Product designers"). */
  audience: string[];
  /** Groups of sections, in order, for the template preview. */
  acts: Record<string, string>;
  sections: TemplateSection[];
  metadataFields: MetadataField[];
  /** Recommended in Smart Insert anywhere in the document, after the section's own suggestions. */
  recommendedBlocks: SuggestedBlock[];
  /** The review checklist. */
  validationRules: ValidationRule[];
  exportProfiles: ExportProfile[];
};
