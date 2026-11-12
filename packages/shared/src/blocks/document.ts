import type {JSONContent} from '../caseStudies/json';
import {
  bool,
  cleanFields,
  cssValue,
  href,
  itemId,
  list,
  mediaPath,
  mediaRef,
  nullable,
  num,
  oneOf,
  optional,
  pattern,
  shape,
  str,
  type Issue,
  type Rule,
  type Shape,
} from './spec';

/**
 * The stored document's schema, as the server knows it (block contract B2 and B3): every node type
 * and mark the editor can write, with the attributes each may hold. The editor's own schema
 * (`frontend/src/components/caseStudy/schema.ts`) must match this exactly: an offline test in the
 * frontend compares the two, so a node or attribute can't be added to one and not the other.
 */

const ALIGN = ['left', 'center', 'right', 'justify'] as const;
const RATIOS = ['auto', '1:1', '4:3', '3:2', '16:9', '21:9', '3:4', '9:16'] as const;
const GAPS = ['none', 'sm', 'md', 'lg'] as const;
const SURFACES = ['none', 'muted', 'brand', 'inverse'] as const;
const WIDTHS = ['content', 'wide'] as const;
const FOCUS = pattern(/^[a-z %0-9.]{1,30}$/, 30, 'center');
const columns = (values: readonly number[], fallback: number) => oneOf(values as readonly number[], fallback);
const responsive = shape({
  tablet: optional(shape({columns: optional(columns([1, 2, 3, 4], 2))})),
  phone: optional(shape({columns: optional(columns([1, 2, 3, 4], 1))})),
});
const TEXT = 5000;
const SHORT = 300;

/** Visual blocks keep their whole configuration in one `config` attribute. */
const config = (fields: Shape): Shape => ({config: shape(fields)});

const CELL: Shape = {
  colspan: num(1, 50, 1, {integer: true}),
  rowspan: num(1, 500, 1, {integer: true}),
  colwidth: nullable(list(num(0, 5000, 0) as Rule, 50)),
  align: nullable(oneOf(['left', 'center', 'right'] as const, 'left')),
};

/** Attributes of every node type, by name. `{}` = a node with no attributes. */
export const NODE_ATTRIBUTES: Record<string, Shape> = {
  // Structure and text
  doc: {},
  text: {},
  hardBreak: {},
  paragraph: {
    textRole: nullable(oneOf(['display', 'lead', 'small', 'caption', 'label'] as const, 'lead')),
    textAlign: nullable(oneOf(ALIGN, 'left')),
  },
  heading: {
    level: oneOf([1, 2, 3, 4] as const, 2),
    textAlign: nullable(oneOf(ALIGN, 'left')),
    section: nullable(pattern(/^[a-z0-9]+(-[a-z0-9]+)*$/, 60, '')),
    sectionId: nullable(pattern(/^s[a-z0-9]{6,24}$/, 25, '')),
    sectionStatus: nullable(oneOf(['review', 'complete'] as const, 'review')),
  },
  blockquote: {},
  bulletList: {},
  orderedList: {start: num(0, 100000, 1, {integer: true}), type: nullable(oneOf(['1', 'a', 'A', 'i', 'I'] as const, '1'))},
  listItem: {},
  taskList: {},
  taskItem: {checked: bool()},
  codeBlock: {
    language: nullable(pattern(/^[a-z0-9+#.-]{1,30}$/, 30, '')),
    // Code block v2 (Phase 3): a title above it, line numbers, long lines wrapped instead of scrolled.
    title: str(SHORT),
    lineNumbers: bool(),
    wrap: bool(),
  },
  // Phase 3 blocks (block contract §5). Prose is content; short facts are attributes (B1).
  terminal: {shell: oneOf(['bash', 'zsh', 'powershell', 'cmd', 'sh'] as const, 'bash'), prompt: pattern(/^[^\n<>]{0,12}$/, 12, '$')},
  terminalCommand: {},
  terminalOutput: {},
  parameterTable: {showRequired: bool(true), showDefault: bool(true)},
  parameter: {name: str(120), type: str(120), required: bool(), default: str(SHORT)},
  requirementList: {},
  requirement: {reqId: pattern(/^[A-Za-z0-9][A-Za-z0-9._-]{0,19}$/, 20, ''), priority: nullable(oneOf(['must', 'should', 'could', 'wont'] as const, 'should'))},
  userStory: {},
  storyPart: {part: oneOf(['role', 'goal', 'benefit'] as const, 'role')},
  acceptanceCriteria: {},
  scenario: {title: str(SHORT), requirementRef: pattern(/^([A-Za-z0-9][A-Za-z0-9._-]{0,19})?$/, 20, '')},
  scenarioStep: {keyword: oneOf(['given', 'when', 'then', 'and', 'but'] as const, 'and')},
  testimonial: {
    person: str(SHORT),
    role: str(SHORT),
    organisation: str(SHORT),
    consent: oneOf(['approved', 'pending', 'none'] as const, 'none'),
    photo: mediaPath(null),
  },
  procedureSteps: {},
  procedureStep: {owner: str(SHORT), expected: str(1000)},
  referenceList: {},
  reference: {url: href(''), kind: oneOf(['document', 'standard', 'issue', 'website', 'other'] as const, 'document')},
  horizontalRule: {},
  spacer: {size: oneOf(['sm', 'md', 'lg', 'xl'] as const, 'md')},
  details: {open: bool()},
  detailsSummary: {},
  detailsContent: {},
  table: {
    tableStyle: oneOf(['grid', 'rows', 'minimal'] as const, 'grid'),
    striped: bool(),
    density: oneOf(['comfortable', 'compact'] as const, 'comfortable'),
    mobile: oneOf(['scroll', 'fit'] as const, 'scroll'),
  },
  tableRow: {},
  tableCell: CELL,
  tableHeader: CELL,
  // Media
  image: {
    src: mediaPath(null),
    alt: nullable(str(500)),
    title: nullable(str(SHORT)),
    width: nullable(num(0, 100000, 0)),
    height: nullable(num(0, 100000, 0)),
    decorative: bool(),
    size: nullable(oneOf(['full', 'large', 'medium', 'small'] as const, 'full')),
    align: nullable(oneOf(['left', 'center', 'right'] as const, 'center')),
    ratio: nullable(oneOf(['16/9', '4/3', '1/1', '3/4'] as const, '16/9')),
    focus: nullable(FOCUS),
    credit: nullable(str(SHORT)),
    radius: nullable(oneOf(['none', 'sm', 'md', 'lg'] as const, 'none')),
  },
  fileAttachment: {src: mediaPath(''), name: str(SHORT, 'File'), size: num(0, 1e10, 0), mime: str(120), preview: bool()},
  videoFile: {src: mediaPath(''), caption: str(500)},
  // An embed holds the pasted provider URL; it is re-parsed against the allowlist whenever it is drawn.
  embed: {src: str(2000), caption: str(500)},
  // Writing blocks
  callout: {
    tone: oneOf(['brand', 'neutral', 'success', 'warning'] as const, 'brand'),
    icon: oneOf(['lightbulb', 'info', 'alert', 'check', 'star', 'none'] as const, 'lightbulb'),
  },
  pullQuote: config({
    style: oneOf(['serif', 'large', 'bordered'] as const, 'serif'),
    attribution: str(SHORT),
    role: str(SHORT),
    align: optional(oneOf(['start', 'center'] as const, 'start')),
  }),
  // Visual blocks
  imageGrid: config({
    columns: columns([2, 3, 4], 2),
    arrangement: oneOf(['even', 'asymmetric', 'masonry'] as const, 'even'),
    ratio: oneOf(RATIOS, '4:3'),
    gap: oneOf(GAPS, 'md'),
    items: list(mediaRef, 24),
    caption: str(500),
    mobileColumns: optional(columns([1, 2], 2)),
    width: optional(oneOf(WIDTHS, 'content')),
    surface: optional(oneOf(SURFACES, 'none')),
    responsive: optional(responsive),
  }),
  comparison: config({
    mode: oneOf(['before-after', 'old-new', 'custom'] as const, 'before-after'),
    display: optional(oneOf(['side-by-side', 'slider'] as const, 'side-by-side')),
    width: optional(oneOf(WIDTHS, 'content')),
    split: oneOf(['50-50', '60-40', '40-60'] as const, '50-50'),
    ratio: oneOf(RATIOS, 'auto'),
    left: shape({media: nullable(mediaRef), label: str(120), text: str(TEXT)}),
    right: shape({media: nullable(mediaRef), label: str(120), text: str(TEXT)}),
    caption: str(500),
  }),
  showcase: config({
    media: nullable(mediaRef),
    ratio: oneOf(RATIOS, '16:9'),
    focus: FOCUS,
    width: oneOf(['content', 'frame', 'full', 'wide'] as const, 'content'),
    surface: oneOf(SURFACES, 'none'),
    inset: oneOf(GAPS, 'none'),
    caption: str(500),
  }),
  deviceMockup: config({
    preset: oneOf(['single', 'dual-overlap', 'triple-stack', 'multi-device', 'custom'] as const, 'custom'),
    devices: list(
      shape({
        id: itemId,
        type: oneOf(['phone', 'tablet', 'laptop', 'browser'] as const, 'phone'),
        media: nullable(mediaRef),
        x: num(-50, 150, 50),
        y: num(-50, 150, 50),
        scale: num(0.1, 4, 1),
        rotate: num(-180, 180, 0),
        z: num(-1000, 1000, 1),
        locked: optional(bool()),
        groupId: optional(itemId),
      }),
      12,
    ),
    stageRatio: oneOf(RATIOS, '16:9'),
    shadow: bool(true),
    spacing: oneOf(['tight', 'normal', 'loose'] as const, 'normal'),
    surface: oneOf(SURFACES, 'muted'),
    mobile: oneOf(['composition', 'stack', 'first'] as const, 'composition'),
    caption: str(500),
  }),
  splitLayout: config({
    media: nullable(mediaRef),
    order: oneOf(['media-text', 'text-media'] as const, 'media-text'),
    proportion: oneOf(['50-50', '40-60', '60-40', '33-67', '67-33'] as const, '50-50'),
    align: oneOf(['start', 'center', 'end'] as const, 'center'),
    ratio: oneOf(RATIOS, 'auto'),
    width: optional(oneOf(WIDTHS, 'content')),
    surface: optional(oneOf(SURFACES, 'none')),
  }),
  metrics: config({
    items: list(shape({value: str(60), label: str(SHORT), detail: str(500)}), 12),
    style: oneOf(['plain', 'cards', 'brand'] as const, 'plain'),
    columns: columns([2, 3, 4], 3),
    caption: str(500),
    size: optional(oneOf(['regular', 'large'] as const, 'regular')),
    align: optional(oneOf(['start', 'center'] as const, 'start')),
    surface: optional(oneOf(SURFACES, 'none')),
    responsive: optional(responsive),
  }),
  timeline: config({
    layout: oneOf(['horizontal', 'vertical'] as const, 'horizontal'),
    style: oneOf(['line', 'cards'] as const, 'line'),
    phases: list(shape({id: itemId, when: str(120), title: str(SHORT), text: str(TEXT)}), 20),
    caption: str(500),
  }),
  screenSequence: config({
    steps: list(shape({id: itemId, media: nullable(mediaRef), title: str(SHORT), text: str(TEXT)}), 20),
    frame: oneOf(['none', 'phone', 'browser'] as const, 'phone'),
    columns: columns([2, 3, 4], 3),
    arrows: bool(true),
    ratio: oneOf(RATIOS, '9:16'),
    caption: str(500),
    responsive: optional(responsive),
  }),
  annotatedImage: config({
    media: nullable(mediaRef),
    annotations: list(shape({id: itemId, x: num(0, 100, 50), y: num(0, 100, 50), title: str(SHORT), text: str(TEXT)}), 30),
    ratio: oneOf(RATIOS, 'auto'),
    notes: oneOf(['below', 'side'] as const, 'below'),
    caption: str(500),
  }),
  flowDiagram: config({
    direction: oneOf(['horizontal', 'vertical'] as const, 'horizontal'),
    nodes: list(shape({id: itemId, kind: oneOf(['start', 'step', 'decision', 'end'] as const, 'step'), label: str(SHORT), next: str(120)}), 30),
    caption: str(500),
  }),
  researchInsights: config({
    insights: list(shape({id: itemId, finding: str(TEXT), evidence: str(TEXT), source: str(SHORT)}), 6),
    layout: oneOf(['cards', 'list'] as const, 'cards'),
    columns: columns([2, 3], 3),
    numbered: bool(true),
    caption: str(500),
  }),
  chart: config({
    kind: oneOf(['bar', 'line', 'donut', 'progress'] as const, 'bar'),
    title: str(SHORT),
    unit: str(30),
    points: list(shape({id: itemId, label: str(120), value: nullable(num(-1e15, 1e15, 0))}), 50),
    target: num(-1e15, 1e15, 100),
    summary: str(1000),
    caption: str(500),
    source: str(SHORT),
  }),
};

/** Attributes of every mark, by name. */
export const MARK_ATTRIBUTES: Record<string, Shape> = {
  bold: {},
  italic: {},
  underline: {},
  strike: {},
  code: {},
  subscript: {},
  superscript: {},
  link: {
    href: href(''),
    target: nullable(oneOf(['_blank'] as const, '_blank')),
    rel: nullable(str(60)),
    class: nullable(str(60)),
    title: nullable(str(SHORT)),
  },
  highlight: {color: nullable(cssValue)},
  textStyle: {
    color: nullable(cssValue),
    backgroundColor: nullable(cssValue),
    fontFamily: nullable(cssValue),
    fontSize: nullable(cssValue),
    lineHeight: nullable(cssValue),
    fontWeight: nullable(cssValue),
    letterSpacing: nullable(cssValue),
    textTransform: nullable(oneOf(['uppercase', 'lowercase', 'capitalize'] as const, 'uppercase')),
  },
};

export const DOCUMENT_NODE_TYPES: ReadonlySet<string> = new Set(Object.keys(NODE_ATTRIBUTES));
export const DOCUMENT_MARK_TYPES: ReadonlySet<string> = new Set(Object.keys(MARK_ATTRIBUTES));

export type CleanReport = {
  /** The cleaned document. Only nodes whose type is enforced are replaced by their cleaned form. */
  doc: JSONContent;
  /** Everything that wasn't valid, where, and which rule. Never the values. */
  issues: (Issue & {type: string; enforced: boolean})[];
  /** Node or mark types this version doesn't know (a document containing them must not be saved). */
  unknown: string[];
};

/**
 * Cleans a stored document against the schema. `enforce(type)` says, per node type, whether the
 * cleaned form is kept (B3: new blocks from the start; existing ones once fixtures show cleaning
 * changes nothing) or only reported. Marks are enforced with the node that holds the text.
 * Pure: the input is never changed.
 */
export function cleanDocument(doc: JSONContent, enforce: (type: string) => boolean): CleanReport {
  const issues: CleanReport['issues'] = [];
  const unknown = new Set<string>();

  const visit = (node: JSONContent, path: string): JSONContent => {
    const type = node.type ?? '';
    const rules = NODE_ATTRIBUTES[type];
    if (!rules) {
      unknown.add(type || '(no type)');
      return node;
    }
    const enforced = enforce(type);
    const found: Issue[] = [];
    const attrs = node.attrs ? cleanFields(node.attrs, rules, '', found) : undefined;
    let marks = node.marks;
    if (node.marks) {
      marks = [];
      node.marks.forEach((mark, index) => {
        const markRules = MARK_ATTRIBUTES[mark.type ?? ''];
        if (!markRules) {
          unknown.add(`mark:${mark.type ?? '(no type)'}`);
          marks!.push(mark);
          return;
        }
        const markIssues: Issue[] = [];
        const markAttrs = mark.attrs ? cleanFields(mark.attrs, markRules, '', markIssues) : undefined;
        markIssues.forEach(item => found.push({path: `marks[${index}].${mark.type}.${item.path}`, rule: item.rule}));
        // A link whose address isn't safe is removed; its text stays.
        if (mark.type === 'link' && markIssues.some(item => item.path === 'href')) return;
        marks!.push(markAttrs ? {...mark, attrs: markAttrs} : {type: mark.type});
      });
    }
    found.forEach(item => issues.push({type, enforced, path: `${path}${item.path ? `.${item.path}` : ''}`, rule: item.rule}));
    const content = node.content?.map((child, index) => visit(child, `${path}/${index}`));
    if (!enforced && !content) return node;
    const next: JSONContent = {...node};
    if (enforced) {
      if (attrs) next.attrs = attrs;
      if (marks) next.marks = marks;
    }
    if (content) next.content = content;
    return next;
  };

  const cleaned = visit(doc, '');
  return {doc: cleaned, issues, unknown: [...unknown]};
}

// ---- Blocks this version can't read (contract B2) ----------------------------------------------------

export const UNKNOWN_BLOCK = 'unknownBlock';

/** Whether a node, or anything inside it, uses a type outside `nodes` / `marks`. */
function usesUnknown(node: JSONContent, nodes: ReadonlySet<string>, marks: ReadonlySet<string>): boolean {
  if (!nodes.has(node.type ?? '')) return true;
  if (node.marks?.some(mark => !marks.has(mark.type ?? ''))) return true;
  return Boolean(node.content?.some(child => usesUnknown(child, nodes, marks)));
}

/**
 * Wraps every top-level block that this version can't read (its type, or a node or mark inside
 * it, isn't in `nodes` / `marks`) in an `unknownBlock` placeholder holding the original, untouched.
 * The editor shows the placeholder locked, and `unwrapUnknownBlocks` restores the original exactly
 * on save, so a version of the app that is older than the document never loses any of it.
 */
export function wrapUnknownBlocks(doc: JSONContent, nodes: ReadonlySet<string>, marks: ReadonlySet<string>): {doc: JSONContent; wrapped: number} {
  let wrapped = 0;
  const content = (doc.content ?? []).map(node => {
    if (!usesUnknown(node, nodes, marks)) return node;
    wrapped += 1;
    return {type: UNKNOWN_BLOCK, attrs: {original: node}};
  });
  return wrapped ? {doc: {...doc, content}, wrapped} : {doc, wrapped};
}

/** Puts every wrapped original back where its placeholder is. */
export function unwrapUnknownBlocks(doc: JSONContent): JSONContent {
  if (!doc.content?.some(node => node.type === UNKNOWN_BLOCK)) return doc;
  return {...doc, content: doc.content.map(node => (node.type === UNKNOWN_BLOCK && node.attrs?.original ? (node.attrs.original as JSONContent) : node))};
}
