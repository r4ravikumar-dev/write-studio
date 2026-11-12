import type {JSONContent} from '@tiptap/core';
import type {Node as PMNode} from '@tiptap/pm/model';
import {
  Columns2,

  GalleryHorizontalEnd,
  GalleryVerticalEnd,
  Heading2,
  Heading3,
  Heading4,
  Image as ImageIcon,
  LayoutGrid,
  Lightbulb,
  List,
  ListChecks,
  ListCollapse,
  ListOrdered,
  MessageSquareDot,
  MessageSquareQuote,
  Milestone,
  Minus,
  MonitorPlay,
  MoveVertical,
  PanelsLeftRight,
  Pilcrow,
  Quote,
  Smartphone,
  SquareCode,
  Table2,
  Video,
  Workflow,
  BarChart3,
  ChartColumnBig,
  FileText,
  ScanSearch,
  SquareTerminal,
  TableProperties,
  ClipboardList,
  UserRound,
  BadgeCheck,
  MessageSquareHeart,
  Footprints,
  Library,
  type LucideIcon,
} from 'lucide-react';
import {
  BLOCK_CATALOG,
  BLOCK_NAMES,
  CONTENT_CARDS,
  SECTION_LEVEL,
  VISUAL_BLOCKS,
  defaultImageGrid,
  defaultShowcase,
  type BlockFamily,
  type BlockName,
  type ContentCardName,
  type MediaRef,
  type SuggestedBlock,
} from '@studio/shared';

/**
 * The editor's half of the block registry (editor spec §10; multi-vertical Phase 3). What a block
 * IS (id, version, family, name, description, search terms, document types) lives once in the
 * shared catalogue, `packages/shared/src/blocks/catalog.ts`; this adds what only the editor
 * knows: its icon, whether it has an inspector, and the Insert command that adds it. The block
 * handle, Turn into, the inspector's name and Smart Insert's recommendations all read this.
 *
 * `EDITOR` must have an entry for every catalogue block (typecheck fails otherwise), so a block
 * can't be catalogued without an editor experience.
 */
export type {BlockFamily};

export type BlockDefinition = {
  /** The ProseMirror node name. */
  type: BlockName;
  label: string;
  description: string;
  icon: LucideIcon;
  family: BlockFamily;
  /** Extra words the "/" menu matches on. */
  searchTerms: readonly string[];
  /** Has an inspector (Properties). */
  configurable: boolean;
  /** The Insert command that adds it, for recommendations. */
  insertId: string;
};

const EDITOR: Record<BlockName, {icon: LucideIcon; insertId: string; configurable?: boolean}> = {
  paragraph: {icon: Pilcrow, insertId: 'paragraph'},
  heading: {icon: Heading3, insertId: 'heading'},
  codeBlock: {icon: SquareCode, insertId: 'code-block', configurable: true},
  blockquote: {icon: Quote, insertId: 'quote'},
  callout: {icon: Lightbulb, insertId: 'callout', configurable: true},
  pullQuote: {icon: MessageSquareQuote, insertId: 'pull-quote', configurable: true},
  bulletList: {icon: List, insertId: 'bullets'},
  orderedList: {icon: ListOrdered, insertId: 'numbers'},
  taskList: {icon: ListChecks, insertId: 'checklist'},
  details: {icon: ListCollapse, insertId: 'collapsible'},
  table: {icon: Table2, insertId: 'table', configurable: true},
  horizontalRule: {icon: Minus, insertId: 'divider'},
  spacer: {icon: MoveVertical, insertId: 'space'},
  image: {icon: ImageIcon, insertId: 'image', configurable: true},
  videoFile: {icon: Video, insertId: 'video-file'},
  fileAttachment: {icon: FileText, insertId: 'file'},
  embed: {icon: MonitorPlay, insertId: 'video-link'},
  imageGrid: {icon: LayoutGrid, insertId: 'image-grid', configurable: true},
  comparison: {icon: Columns2, insertId: 'comparison', configurable: true},
  showcase: {icon: GalleryHorizontalEnd, insertId: 'showcase', configurable: true},
  deviceMockup: {icon: Smartphone, insertId: 'devices', configurable: true},
  splitLayout: {icon: PanelsLeftRight, insertId: 'split', configurable: true},
  metrics: {icon: BarChart3, insertId: 'metrics', configurable: true},
  timeline: {icon: Milestone, insertId: 'timeline', configurable: true},
  screenSequence: {icon: GalleryVerticalEnd, insertId: 'screen-sequence', configurable: true},
  annotatedImage: {icon: MessageSquareDot, insertId: 'annotated-image', configurable: true},
  flowDiagram: {icon: Workflow, insertId: 'flow-diagram', configurable: true},
  researchInsights: {icon: ScanSearch, insertId: 'research-insights', configurable: true},
  chart: {icon: ChartColumnBig, insertId: 'chart', configurable: true},
  // Phase 3 blocks: their Insert commands are generated from the catalogue (insertCommands.tsx).
  terminal: {icon: SquareTerminal, insertId: 'terminal', configurable: true},
  parameterTable: {icon: TableProperties, insertId: 'parameter-table', configurable: true},
  requirementList: {icon: ClipboardList, insertId: 'requirement-list'},
  userStory: {icon: UserRound, insertId: 'user-story'},
  acceptanceCriteria: {icon: BadgeCheck, insertId: 'acceptance-criteria'},
  testimonial: {icon: MessageSquareHeart, insertId: 'testimonial', configurable: true},
  procedureSteps: {icon: Footprints, insertId: 'procedure-steps'},
  referenceList: {icon: Library, insertId: 'reference-list'},
};

export const BLOCKS: Record<string, BlockDefinition> = Object.fromEntries(
  BLOCK_NAMES.map(type => {
    const {label, description, family, searchTerms} = BLOCK_CATALOG[type];
    const {icon, insertId, configurable = false} = EDITOR[type];
    return [type, {type, label, description, family, searchTerms, icon, insertId, configurable}];
  }),
);

/** A block's name as people read it ("Section heading", "Heading", "Image grid"). */
export function blockName(node: PMNode | {type: {name: string}; attrs: Record<string, unknown>}): string {
  const type = node.type.name;
  if (type === 'heading') {
    const level = Number(node.attrs.level);
    return level <= SECTION_LEVEL ? (level === 1 ? 'Title' : 'Section heading') : level === 3 ? 'Heading' : 'Small heading';
  }
  return BLOCKS[type]?.label ?? 'Block';
}

/** Content cards (editor spec §8.5): presets of existing blocks, with their Insert commands. */
const CARD_INSERT_IDS: Record<ContentCardName, string> = {
  problemCallout: 'problem-callout',
  keyTakeaway: 'key-takeaway',
  resultsHighlights: 'results-highlights',
};

/** Which Insert command adds a recommended block or card (framework recommendations use names). */
export function insertIdFor(name: SuggestedBlock): string | undefined {
  return BLOCKS[name]?.insertId ?? CARD_INSERT_IDS[name as ContentCardName];
}

/** A recommended block's or card's name, as people read it. */
export function suggestionLabel(name: SuggestedBlock): string {
  return (VISUAL_BLOCKS as Record<string, string>)[name] ?? (CONTENT_CARDS as Record<string, string>)[name] ?? BLOCKS[name]?.label ?? name;
}

// ---- Turn into (editor spec §7.3: compatible conversions only) --------------------------------

export type TurnIntoTarget = {id: string; label: string; icon: LucideIcon};

const TEXT_TARGETS: TurnIntoTarget[] = [
  {id: 'paragraph', label: 'Paragraph', icon: Pilcrow},
  {id: 'section', label: 'Section heading', icon: Heading2},
  {id: 'heading', label: 'Heading', icon: Heading3},
  {id: 'small-heading', label: 'Small heading', icon: Heading4},
  {id: 'quote', label: 'Quote', icon: Quote},
  {id: 'callout', label: 'Callout', icon: Lightbulb},
  {id: 'pull-quote', label: 'Pull quote', icon: MessageSquareQuote},
  {id: 'bullets', label: 'Bulleted list', icon: List},
  {id: 'numbers', label: 'Numbered list', icon: ListOrdered},
  {id: 'checklist', label: 'Checklist', icon: ListChecks},
  {id: 'code', label: 'Code block', icon: SquareCode},
];

/** Which target a block already is (so it isn't offered). */
function currentTarget(node: PMNode): string | null {
  switch (node.type.name) {
    case 'paragraph':
      return 'paragraph';
    case 'heading': {
      const level = Number(node.attrs.level);
      return level <= SECTION_LEVEL ? 'section' : level === 3 ? 'heading' : 'small-heading';
    }
    case 'blockquote':
      return 'quote';
    case 'callout':
      return 'callout';
    case 'pullQuote':
      return 'pull-quote';
    case 'bulletList':
      return 'bullets';
    case 'orderedList':
      return 'numbers';
    case 'taskList':
      return 'checklist';
    case 'codeBlock':
      return 'code';
    default:
      return null;
  }
}

const TEXT_TYPES = new Set(['paragraph', 'heading', 'codeBlock', 'blockquote', 'callout', 'pullQuote', 'bulletList', 'orderedList', 'taskList']);

/** What a block can be turned into ([] = it can't). */
export function turnIntoTargets(node: PMNode): TurnIntoTarget[] {
  const type = node.type.name;
  if (TEXT_TYPES.has(type)) {
    const now = currentTarget(node);
    return TEXT_TARGETS.filter(target => target.id !== now);
  }
  if (type === 'image') return [{id: 'showcase', label: 'Showcase', icon: GalleryHorizontalEnd}, {id: 'image-grid', label: 'Image grid', icon: LayoutGrid}];
  if (type === 'imageGrid' && (node.attrs.config?.items?.length ?? 0) === 1) {
    return [{id: 'image', label: 'Image', icon: ImageIcon}, {id: 'showcase', label: 'Showcase', icon: GalleryHorizontalEnd}];
  }
  return [];
}

/** The inline content of each line of a text block (paragraphs, headings, list items, quotes). */
function linesOf(node: PMNode): JSONContent[][] {
  if (node.type.name === 'codeBlock') return node.textContent.split('\n').map(line => (line ? [{type: 'text', text: line}] : []));
  if (node.isTextblock || node.type.name === 'pullQuote') return [(node.content.toJSON() as JSONContent[] | null) ?? []];
  const lines: JSONContent[][] = [];
  node.descendants(child => {
    if (child.isTextblock) {
      lines.push((child.content.toJSON() as JSONContent[] | null) ?? []);
      return false;
    }
    return true;
  });
  return lines.length ? lines : [[]];
}

const paragraph = (inline: JSONContent[]): JSONContent => (inline.length ? {type: 'paragraph', content: inline} : {type: 'paragraph'});
const plain = (inline: JSONContent[]) => inline.map(part => part.text ?? '').join('');

/** The block(s) a text block becomes. Marks are kept, except in code. */
export function convertText(node: PMNode, target: string): JSONContent[] | null {
  const lines = linesOf(node);
  const [first, ...rest] = lines;
  const paragraphs = lines.map(paragraph);
  switch (target) {
    case 'paragraph':
      return paragraphs;
    case 'section':
    case 'heading':
    case 'small-heading': {
      const level = target === 'section' ? SECTION_LEVEL : target === 'heading' ? 3 : 4;
      const heading: JSONContent = {type: 'heading', attrs: {level}, ...(first.length ? {content: first} : {})};
      return [heading, ...rest.map(paragraph)];
    }
    case 'quote':
      return [{type: 'blockquote', content: paragraphs}];
    case 'callout':
      return [{type: 'callout', attrs: {tone: 'brand', icon: 'lightbulb'}, content: paragraphs}];
    case 'pull-quote': {
      const inline = lines.flatMap((line, index) => (index ? [{type: 'text', text: ' '}, ...line] : line)).filter(part => part.text !== '' || part.type !== 'text');
      return [{type: 'pullQuote', attrs: {config: {style: 'serif', attribution: '', role: ''}}, ...(inline.length ? {content: inline} : {})}];
    }
    case 'bullets':
    case 'numbers':
      return [{type: target === 'bullets' ? 'bulletList' : 'orderedList', content: lines.map(line => ({type: 'listItem', content: [paragraph(line)]}))}];
    case 'checklist':
      return [{type: 'taskList', content: lines.map(line => ({type: 'taskItem', attrs: {checked: false}, content: [paragraph(line)]}))}];
    case 'code': {
      const text = lines.map(plain).join('\n');
      return [{type: 'codeBlock', ...(text ? {content: [{type: 'text', text}]} : {})}];
    }
    default:
      return null;
  }
}

/** The block a picture block becomes (image ↔ showcase / one-picture grid). */
export function convertMedia(node: PMNode, target: string): JSONContent | null {
  const fromImage = (): MediaRef | null =>
    node.attrs.src ? {path: node.attrs.src, kind: 'image', alt: node.attrs.alt ?? '', width: node.attrs.width ?? null, height: node.attrs.height ?? null, caption: node.attrs.caption ?? ''} : null;
  if (node.type.name === 'image') {
    const media = fromImage();
    if (target === 'showcase') return {type: 'showcase', attrs: {config: {...defaultShowcase(), media}}};
    if (target === 'image-grid') return {type: 'imageGrid', attrs: {config: {...defaultImageGrid(), items: media ? [media] : []}}};
  }
  if (node.type.name === 'imageGrid') {
    const media = node.attrs.config?.items?.[0] as MediaRef | undefined;
    if (!media) return null;
    if (target === 'image') return {type: 'image', attrs: {src: media.path, alt: media.alt, width: media.width ?? null, height: media.height ?? null}};
    if (target === 'showcase') return {type: 'showcase', attrs: {config: {...defaultShowcase(), media}}};
  }
  return null;
}

