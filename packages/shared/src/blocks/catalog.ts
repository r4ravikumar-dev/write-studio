import type {DocumentType} from '../templates/types';

/**
 * The block catalogue (multi-vertical Phase 3): every block the editor can hold, described once,
 * with no React. A block has ONE canonical schema however many templates use it.
 *
 *   here                                  id, version, family, name, description, search terms, document types
 *   ../caseStudies/blockSchemas.ts        config defaults, validation (review rules), evidence
 *   frontend …/editor/blocks/registry.ts  icon, inspector, insert command (must cover every entry here)
 *   frontend …/caseStudy                  node schema, editor view, preview and export renderers
 *
 * The key is the node name stored in documents and never changes; `id` is the block's id in
 * docs/multi-vertical-master-plan.json. `documentTypes` only ranks suggestions. It never restricts
 * insertion: a marketer can add a code block and an engineer an image grid.
 *
 * A block is listed here only when its whole lifecycle exists (schema, insert command, editor view,
 * inspector where it has settings, preview, exports, validation, accessible output). Typecheck
 * fails if the editor registry and this catalogue disagree.
 */
export type BlockFamily = 'writing' | 'media' | 'visual' | 'data' | 'structure' | 'engineering' | 'product' | 'release' | 'marketing' | 'operations';

export const BLOCK_FAMILIES: Record<BlockFamily, string> = {
  writing: 'Writing',
  media: 'Media',
  visual: 'Visual',
  data: 'Data',
  structure: 'Structure',
  engineering: 'Engineering',
  product: 'Product',
  release: 'Release',
  marketing: 'Marketing',
  operations: 'Operations',
};

type CatalogEntry = {
  /** The block's id in the master plan (snake_case). */
  id: string;
  /** Bumped with a migration whenever the stored shape changes. */
  version: number;
  family: BlockFamily;
  label: string;
  description: string;
  /** Extra words Insert and the "/" menu match on. */
  searchTerms: readonly string[];
  /** The document types this block is made for (`any` = universal). */
  documentTypes: 'any' | readonly DocumentType[];
};

const STORIES = ['ux_case_study', 'marketing_case_study'] as const;
const TECHNICAL = ['developer_documentation', 'technical_design_document', 'architecture_decision_record', 'release_notes'] as const;
const PRODUCT = ['feature_specification', 'product_requirements_document'] as const;

const entry = <const T extends CatalogEntry>(value: T) => value;

export const BLOCK_CATALOG = {
  paragraph: entry({id: 'paragraph', version: 1, family: 'writing', label: 'Paragraph', description: 'Normal text.', searchTerms: ['text', 'body'], documentTypes: 'any'}),
  heading: entry({id: 'heading', version: 1, family: 'writing', label: 'Heading', description: 'A heading inside a section.', searchTerms: ['title', 'subheading'], documentTypes: 'any'}),
  blockquote: entry({id: 'quote', version: 1, family: 'writing', label: 'Quote', description: 'Quoted text.', searchTerms: ['quotation', 'cite'], documentTypes: 'any'}),
  pullQuote: entry({id: 'pull_quote', version: 1, family: 'writing', label: 'Pull quote', description: 'A quote set large, with who said it.', searchTerms: ['testimonial', 'quote', 'customer'], documentTypes: 'any'}),
  callout: entry({id: 'callout', version: 1, family: 'writing', label: 'Callout', description: 'A note, tip, warning or key point that stands out.', searchTerms: ['note', 'tip', 'warning', 'important', 'danger'], documentTypes: 'any'}),
  bulletList: entry({id: 'bullet_list', version: 1, family: 'writing', label: 'Bulleted list', description: 'A list without an order.', searchTerms: ['bullets', 'list'], documentTypes: 'any'}),
  orderedList: entry({id: 'ordered_list', version: 1, family: 'writing', label: 'Numbered list', description: 'Steps or items in order.', searchTerms: ['steps', 'procedure', 'list'], documentTypes: 'any'}),
  taskList: entry({id: 'checklist', version: 1, family: 'writing', label: 'Checklist', description: 'Items to tick off.', searchTerms: ['tasks', 'to do', 'checks', 'prerequisites'], documentTypes: 'any'}),
  details: entry({id: 'collapsible_content', version: 1, family: 'writing', label: 'Collapsible section', description: 'Detail the reader can open.', searchTerms: ['toggle', 'expand', 'hide', 'accordion'], documentTypes: 'any'}),
  horizontalRule: entry({id: 'divider', version: 1, family: 'writing', label: 'Divider', description: 'A line between parts.', searchTerms: ['line', 'rule', 'separator'], documentTypes: 'any'}),
  spacer: entry({id: 'spacer', version: 1, family: 'writing', label: 'Space', description: 'Extra room between blocks.', searchTerms: ['gap', 'spacing'], documentTypes: 'any'}),
  table: entry({id: 'table', version: 1, family: 'writing', label: 'Table', description: 'Rows and columns.', searchTerms: ['rows', 'columns', 'grid', 'matrix'], documentTypes: 'any'}),
  image: entry({id: 'image', version: 1, family: 'media', label: 'Image', description: 'One picture, with alt text and a caption.', searchTerms: ['picture', 'photo', 'screenshot'], documentTypes: 'any'}),
  imageGrid: entry({id: 'image_grid', version: 1, family: 'media', label: 'Image grid', description: 'Several pictures in a grid.', searchTerms: ['gallery', 'pictures', 'campaign'], documentTypes: 'any'}),
  videoFile: entry({id: 'video', version: 1, family: 'media', label: 'Video', description: 'An uploaded video.', searchTerms: ['recording', 'clip'], documentTypes: 'any'}),
  embed: entry({id: 'approved_embed', version: 1, family: 'media', label: 'Embed', description: 'A YouTube, Vimeo, Loom or Figma link, shown in place.', searchTerms: ['youtube', 'vimeo', 'loom', 'figma'], documentTypes: 'any'}),
  fileAttachment: entry({id: 'pdf_attachment', version: 1, family: 'media', label: 'File', description: 'A document to download; PDFs preview in place.', searchTerms: ['attachment', 'download', 'pdf'], documentTypes: 'any'}),
  comparison: entry({id: 'comparison', version: 1, family: 'visual', label: 'Comparison', description: 'Two pictures side by side or behind a slider.', searchTerms: ['before and after', 'versus', 'options'], documentTypes: 'any'}),
  showcase: entry({id: 'showcase', version: 1, family: 'visual', label: 'Showcase', description: 'One large picture on a backdrop.', searchTerms: ['hero', 'feature picture'], documentTypes: STORIES}),
  deviceMockup: entry({id: 'device_composition', version: 1, family: 'visual', label: 'Device mockups', description: 'Screens in phone, tablet or laptop frames.', searchTerms: ['phone', 'laptop', 'frame', 'mockup'], documentTypes: STORIES}),
  splitLayout: entry({id: 'split_layout', version: 1, family: 'visual', label: 'Split layout', description: 'Text beside a picture.', searchTerms: ['text and picture', 'two columns'], documentTypes: 'any'}),
  annotatedImage: entry({id: 'annotated_screenshot', version: 1, family: 'visual', label: 'Annotated screenshot', description: 'A picture with numbered markers and notes.', searchTerms: ['markers', 'notes', 'labels'], documentTypes: 'any'}),
  screenSequence: entry({id: 'screen_sequence', version: 1, family: 'visual', label: 'Screen sequence', description: 'Numbered screens, step by step.', searchTerms: ['flow', 'journey', 'screens', 'steps'], documentTypes: ['ux_case_study', 'feature_specification', 'marketing_case_study']}),
  metrics: entry({id: 'metrics', version: 1, family: 'data', label: 'Metrics', description: 'Key figures with their labels.', searchTerms: ['numbers', 'results', 'figures', 'kpi', 'statistics'], documentTypes: 'any'}),
  chart: entry({id: 'chart', version: 1, family: 'data', label: 'Chart', description: 'A bar or line chart from your own figures.', searchTerms: ['graph', 'bar', 'line', 'results'], documentTypes: 'any'}),
  researchInsights: entry({id: 'research_insight', version: 1, family: 'data', label: 'Research insights', description: 'Findings, each with its evidence.', searchTerms: ['findings', 'evidence', 'study'], documentTypes: ['ux_case_study', 'product_requirements_document', 'feature_specification']}),
  timeline: entry({id: 'process_timeline', version: 1, family: 'structure', label: 'Process timeline', description: 'Phases or milestones in order.', searchTerms: ['phases', 'milestones', 'schedule', 'rollout'], documentTypes: 'any'}),
  flowDiagram: entry({id: 'flow_diagram', version: 1, family: 'structure', label: 'Flow diagram', description: 'Steps and decisions joined by arrows.', searchTerms: ['flowchart', 'steps', 'decision', 'process', 'architecture'], documentTypes: 'any'}),
  codeBlock: entry({id: 'code_block', version: 2, family: 'engineering', label: 'Code block', description: 'Code with its language, highlighted and shown exactly as typed. Never run.', searchTerms: ['code', 'snippet', 'sample', 'syntax'], documentTypes: TECHNICAL}),
  terminal: entry({id: 'terminal_block', version: 1, family: 'engineering', label: 'Terminal', description: 'Commands and their output, kept apart.', searchTerms: ['command line', 'shell', 'cli', 'console', 'bash', 'install'], documentTypes: TECHNICAL}),
  parameterTable: entry({id: 'parameter_table', version: 1, family: 'engineering', label: 'Parameter table', description: 'Names, types, whether required, defaults and descriptions.', searchTerms: ['parameters', 'arguments', 'options', 'environment variables', 'config', 'fields'], documentTypes: [...TECHNICAL, 'feature_specification']}),
  requirementList: entry({id: 'requirement_list', version: 1, family: 'product', label: 'Requirements', description: 'Numbered requirements, each with a priority.', searchTerms: ['requirements', 'must', 'should', 'functional', 'moscow'], documentTypes: PRODUCT}),
  userStory: entry({id: 'user_story', version: 1, family: 'product', label: 'User story', description: 'As a …, I want …, so that ….', searchTerms: ['story', 'as a', 'job to be done'], documentTypes: PRODUCT}),
  acceptanceCriteria: entry({id: 'acceptance_criteria', version: 1, family: 'product', label: 'Acceptance criteria', description: 'Scenarios as Given, When, Then.', searchTerms: ['given when then', 'scenario', 'gherkin', 'test', 'qa'], documentTypes: PRODUCT}),
  testimonial: entry({id: 'testimonial', version: 1, family: 'marketing', label: 'Testimonial', description: 'A customer’s words, who said them, and whether they agreed to be quoted.', searchTerms: ['quote', 'customer', 'review', 'feedback'], documentTypes: ['marketing_case_study', 'ux_case_study']}),
  procedureSteps: entry({id: 'procedure_steps', version: 1, family: 'operations', label: 'Procedure steps', description: 'Numbered steps, each with who does it and what should happen.', searchTerms: ['steps', 'how to', 'instructions', 'procedure', 'runbook'], documentTypes: ['standard_operating_procedure', 'developer_documentation', 'release_notes', 'technical_design_document']}),
  referenceList: entry({id: 'reference_list', version: 1, family: 'writing', label: 'References', description: 'Related documents, standards and links, each with a note.', searchTerms: ['links', 'resources', 'further reading', 'sources', 'bibliography'], documentTypes: 'any'}),
} as const satisfies Record<string, CatalogEntry>;

/** A block's type: the ProseMirror node name, as stored in documents. */
export type BlockName = keyof typeof BLOCK_CATALOG;

export const BLOCK_NAMES = Object.keys(BLOCK_CATALOG) as BlockName[];

export function isBlockName(value: unknown): value is BlockName {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(BLOCK_CATALOG, value);
}

/** Content cards (editor spec §8.5): starting points built on an existing block, never a new schema. */
export const CONTENT_CARDS = {
  problemCallout: 'Problem callout',
  keyTakeaway: 'Key takeaway',
  resultsHighlights: 'Results highlights',
} as const;
export type ContentCardName = keyof typeof CONTENT_CARDS;

/** The block each card inserts. */
export const CONTENT_CARD_BLOCKS: Record<ContentCardName, BlockName> = {
  problemCallout: 'callout',
  keyTakeaway: 'callout',
  resultsHighlights: 'metrics',
};

/** What a template can recommend: a block, or a content card. */
export type SuggestedBlock = BlockName | ContentCardName;

export function isSuggestedBlock(value: unknown): value is SuggestedBlock {
  return isBlockName(value) || (typeof value === 'string' && Object.prototype.hasOwnProperty.call(CONTENT_CARDS, value));
}

/** The blocks made for a document type, in catalogue order (universal blocks aren't listed). */
export function blocksFor(documentType: DocumentType): BlockName[] {
  return BLOCK_NAMES.filter(name => {
    const types: 'any' | readonly DocumentType[] = BLOCK_CATALOG[name].documentTypes;
    return types !== 'any' && types.includes(documentType);
  });
}

/** Everything wrong with the catalogue (none, in a healthy one). Run by the offline tests. */
export function catalogProblems(): string[] {
  const problems: string[] = [];
  const ids = new Set<string>();
  for (const name of BLOCK_NAMES) {
    const block: CatalogEntry = BLOCK_CATALOG[name];
    if (ids.has(block.id)) problems.push(`${name}: the id ${block.id} is used twice.`);
    ids.add(block.id);
    if (!/^[a-z]+(_[a-z]+)*$/.test(block.id)) problems.push(`${name}: the id must be lowercase words joined by underscores.`);
    if (!Number.isInteger(block.version) || block.version < 1) problems.push(`${name}: the version must be a whole number from 1.`);
    if (!block.label.trim() || !block.description.trim()) problems.push(`${name}: needs a label and a description.`);
  }
  return problems;
}
