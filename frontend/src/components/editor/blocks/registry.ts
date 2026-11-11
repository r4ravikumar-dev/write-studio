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
  type LucideIcon,
} from 'lucide-react';
import {CONTENT_CARDS, SECTION_LEVEL, VISUAL_BLOCKS, defaultImageGrid, defaultShowcase, type ContentCardName, type MediaRef, type SuggestedVisual} from '@studio/shared';

/**
 * The block registry (editor spec §10, T5, started with T2). One description per block type that
 * the block handle, Turn into, the inspector's name, and Smart Insert's recommendations read,
 * instead of each keeping its own list. Stored JSON is unchanged.
 */
export type BlockFamily = 'text' | 'container' | 'media' | 'visual' | 'structure';

export type BlockDefinition = {
  /** The ProseMirror node name. */
  type: string;
  label: string;
  icon: LucideIcon;
  family: BlockFamily;
  /** Has an inspector (Properties). */
  configurable: boolean;
  /** The Insert command that adds it, for recommendations. */
  insertId?: string;
};

const def = (type: string, label: string, icon: LucideIcon, family: BlockFamily, configurable = false, insertId?: string): BlockDefinition => ({
  type,
  label,
  icon,
  family,
  configurable,
  insertId,
});

export const BLOCKS: Record<string, BlockDefinition> = Object.fromEntries(
  [
    def('paragraph', 'Paragraph', Pilcrow, 'text', false, 'paragraph'),
    def('heading', 'Heading', Heading3, 'text', false, 'heading'),
    def('codeBlock', 'Code block', SquareCode, 'text', false, 'code-block'),
    def('blockquote', 'Quote', Quote, 'container', false, 'quote'),
    def('callout', 'Callout', Lightbulb, 'container', true, 'callout'),
    def('pullQuote', 'Pull quote', MessageSquareQuote, 'container', true, 'pull-quote'),
    def('bulletList', 'Bulleted list', List, 'container', false, 'bullets'),
    def('orderedList', 'Numbered list', ListOrdered, 'container', false, 'numbers'),
    def('taskList', 'Checklist', ListChecks, 'container', false, 'checklist'),
    def('details', 'Collapsible section', ListCollapse, 'container', false, 'collapsible'),
    def('table', 'Table', Table2, 'structure', true, 'table'),
    def('horizontalRule', 'Divider', Minus, 'structure', false, 'divider'),
    def('spacer', 'Space', MoveVertical, 'structure', false, 'space'),
    def('image', 'Image', ImageIcon, 'media', true, 'image'),
    def('videoFile', 'Video', Video, 'media', false, 'video-file'),
    def('fileAttachment', 'File', FileText, 'media', false, 'file'),
    def('embed', 'Embed', MonitorPlay, 'media', false, 'video-link'),
    def('imageGrid', 'Image grid', LayoutGrid, 'visual', true, 'image-grid'),
    def('comparison', 'Comparison', Columns2, 'visual', true, 'comparison'),
    def('showcase', 'Showcase', GalleryHorizontalEnd, 'visual', true, 'showcase'),
    def('deviceMockup', 'Device mockups', Smartphone, 'visual', true, 'devices'),
    def('splitLayout', 'Split layout', PanelsLeftRight, 'visual', true, 'split'),
    def('metrics', 'Metrics', BarChart3, 'visual', true, 'metrics'),
    def('timeline', 'Process timeline', Milestone, 'visual', true, 'timeline'),
    def('screenSequence', 'Screen sequence', GalleryVerticalEnd, 'visual', true, 'screen-sequence'),
    def('annotatedImage', 'Annotated screenshot', MessageSquareDot, 'visual', true, 'annotated-image'),
    def('flowDiagram', 'Flow diagram', Workflow, 'visual', true, 'flow-diagram'),
    def('researchInsights', 'Research insights', ScanSearch, 'visual', true, 'research-insights'),
    def('chart', 'Chart', ChartColumnBig, 'visual', true, 'chart'),
  ].map(block => [block.type, block]),
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
export function insertIdFor(name: SuggestedVisual): string | undefined {
  return BLOCKS[name]?.insertId ?? CARD_INSERT_IDS[name as ContentCardName];
}

/** A recommended block's or card's name, as people read it. */
export function suggestionLabel(name: SuggestedVisual): string {
  return (VISUAL_BLOCKS as Record<string, string>)[name] ?? (CONTENT_CARDS as Record<string, string>)[name] ?? name;
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

