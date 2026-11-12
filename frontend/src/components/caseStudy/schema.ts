import {Extension, Node, mergeAttributes, type Extensions} from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import {TextStyleKit} from '@tiptap/extension-text-style';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import Image from '@tiptap/extension-image';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import {TableKit} from '@tiptap/extension-table';
import {TaskItem, TaskList} from '@tiptap/extension-list';
import {Details, DetailsContent, DetailsSummary} from '@tiptap/extension-details';
import {studioMediaUrl} from '@studio/shared';
import {StudioCodeBlock, structuredNodes} from './structuredBlocks';
import {
  defaultComparison,
  defaultDeviceMockup,
  defaultImageGrid,
  defaultMetrics,
  defaultResearchInsights,
  defaultChart,
  defaultQuote,
  defaultShowcase,
  defaultSplit,
  defaultTimeline,
  defaultScreenSequence,
  defaultAnnotatedImage,
  defaultFlowDiagram,
} from '@/lib/caseStudies/blocks';

/**
 * The case-study document schema, shared by the editor (with React node views
 * added on top) and the private preview (static renderer), so a document always
 * renders the way it was written.
 */

/** A downloadable file: PDF, PowerPoint or Word, optionally previewed inline. */
export const FileAttachment = Node.create({
  name: 'fileAttachment',
  group: 'block',
  atom: true,
  draggable: true,
  addAttributes() {
    return {
      src: {default: ''},
      name: {default: 'File'},
      size: {default: 0},
      mime: {default: ''},
      preview: {default: false},
    };
  },
  parseHTML() {
    return [{tag: 'div[data-file-attachment]'}];
  },
  renderHTML({HTMLAttributes}) {
    return ['div', mergeAttributes({'data-file-attachment': ''}, HTMLAttributes)];
  },
});

/** An uploaded video file. */
export const VideoFile = Node.create({
  name: 'videoFile',
  group: 'block',
  atom: true,
  draggable: true,
  addAttributes() {
    return {src: {default: ''}, caption: {default: ''}};
  },
  parseHTML() {
    return [{tag: 'div[data-video-file]'}];
  },
  renderHTML({HTMLAttributes}) {
    return ['div', mergeAttributes({'data-video-file': ''}, HTMLAttributes)];
  },
});

/** A Figma file or prototype, or a YouTube, Vimeo or Loom video, by URL. */
export const Embed = Node.create({
  name: 'embed',
  group: 'block',
  atom: true,
  draggable: true,
  addAttributes() {
    return {src: {default: ''}, caption: {default: ''}};
  },
  parseHTML() {
    return [{tag: 'div[data-embed]'}];
  },
  renderHTML({HTMLAttributes}) {
    return ['div', mergeAttributes({'data-embed': ''}, HTMLAttributes)];
  },
});

/** A highlighted note that holds paragraphs, with a tone and an icon. */
export const Callout = Node.create({
  name: 'callout',
  group: 'block',
  content: 'paragraph+',
  defining: true,
  addAttributes() {
    return {tone: {default: 'brand'}, icon: {default: 'lightbulb'}};
  },
  parseHTML() {
    return [{tag: 'aside[data-callout]'}];
  },
  renderHTML({HTMLAttributes}) {
    return ['aside', mergeAttributes({'data-callout': ''}, HTMLAttributes), 0];
  },
});

/** A JSON attribute: a block's whole configuration, stored as one object. */
function configAttribute<T>(defaults: () => T) {
  return {
    config: {
      default: defaults(),
      parseHTML: (element: HTMLElement) => {
        try {
          return {...defaults(), ...JSON.parse(element.getAttribute('data-config') ?? '{}')};
        } catch {
          return defaults();
        }
      },
      renderHTML: (attributes: {config: T}) => ({'data-config': JSON.stringify(attributes.config)}),
    },
  };
}

/** An atom block whose layout is all in its config (grid, comparison, showcase, devices, metrics). */
function visualAtom<T>(name: string, defaults: () => T) {
  return Node.create({
    name,
    group: 'block',
    atom: true,
    draggable: true,
    selectable: true,
    addAttributes: () => configAttribute(defaults),
    parseHTML: () => [{tag: `div[data-block="${name}"]`}],
    renderHTML: ({HTMLAttributes}) => [
      'div',
      mergeAttributes({'data-block': name}, HTMLAttributes),
    ],
  });
}

export const ImageGridNode = visualAtom('imageGrid', defaultImageGrid);
export const ComparisonNode = visualAtom('comparison', defaultComparison);
export const ShowcaseNode = visualAtom('showcase', defaultShowcase);
export const DeviceMockupNode = visualAtom('deviceMockup', defaultDeviceMockup);
export const MetricsNode = visualAtom('metrics', defaultMetrics);
// Insert 2.0 blocks
export const TimelineNode = visualAtom('timeline', defaultTimeline);
export const ScreenSequenceNode = visualAtom('screenSequence', defaultScreenSequence);
export const AnnotatedImageNode = visualAtom('annotatedImage', defaultAnnotatedImage);
export const FlowDiagramNode = visualAtom('flowDiagram', defaultFlowDiagram);
// T4 blocks
export const ResearchInsightsNode = visualAtom('researchInsights', defaultResearchInsights);
export const ChartNode = visualAtom('chart', defaultChart);

/**
 * A block made with a newer version of the app than this one (block contract B2). It holds the
 * original, untouched, in `original`: shown locked, never edited, and put back exactly as it was on
 * save (`unwrapUnknownBlocks`). Never stored itself: the server refuses the type.
 */
export const UnknownBlockNode = Node.create({
  name: 'unknownBlock',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: false,
  addAttributes: () => ({original: {default: null, rendered: false}}),
  parseHTML: () => [],
  renderHTML: () => ['div', {'data-unknown-block': '', class: 'cs-unknown-block'}, 'This block needs a newer version of Case Study Studio. It is kept as it was.'],
});

/** Media beside editable text: the text is ordinary content inside the block. */
export const SplitLayoutNode = Node.create({
  name: 'splitLayout',
  group: 'block',
  content: '(paragraph | heading | bulletList | orderedList | blockquote)+',
  defining: true,
  isolating: true,
  draggable: true,
  addAttributes: () => configAttribute(defaultSplit),
  parseHTML: () => [{tag: 'section[data-block="splitLayout"]'}],
  renderHTML: ({HTMLAttributes}) => [
    'section',
    mergeAttributes({'data-block': 'splitLayout'}, HTMLAttributes),
    0,
  ],
});

/** A pull quote: the quote is editable inline text; attribution is in its config. */
export const PullQuoteNode = Node.create({
  name: 'pullQuote',
  group: 'block',
  content: 'inline*',
  defining: true,
  draggable: true,
  addAttributes: () => configAttribute(defaultQuote),
  parseHTML: () => [{tag: 'figure[data-block="pullQuote"]'}],
  renderHTML: ({HTMLAttributes}) => [
    'figure',
    mergeAttributes({'data-block': 'pullQuote'}, HTMLAttributes),
    0,
  ],
});

/** Images hold a storage path; shown through its public URL, with their pixel size. */
/** An image's layout, as data attributes the stylesheet reads (typography.css). */
const dataAttr = (name: string) => ({
  default: null,
  parseHTML: (element: HTMLElement) => element.getAttribute(`data-${name}`),
  renderHTML: (attributes: Record<string, unknown>) =>
    attributes[name] ? {[`data-${name}`]: String(attributes[name])} : {},
});

const StoredImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      src: {
        default: null,
        renderHTML: (attributes: {src?: string}) => ({src: studioMediaUrl(attributes.src)}),
      },
      width: {default: null},
      height: {default: null},
      /** Decorative images get alt="" so screen readers skip them (W3C: text alternatives). */
      decorative: {
        default: false,
        parseHTML: element => element.getAttribute('data-decorative') === 'true',
        renderHTML: attributes => (attributes.decorative ? {'data-decorative': 'true', alt: ''} : {}),
      },
      /** full | large | medium | small (100, 75, 50, 33% of the text column). */
      size: dataAttr('size'),
      /** left | center | right (only matters below full width). */
      align: dataAttr('align'),
      /** 16/9 | 4/3 | 1/1 | 3/4, or null for the original shape. */
      ratio: {
        default: null,
        parseHTML: element => element.getAttribute('data-ratio'),
        renderHTML: attributes => (attributes.ratio ? {'data-ratio': attributes.ratio, style: `aspect-ratio: ${attributes.ratio}; object-position: ${attributes.focus ?? 'center'}`} : {}),
      },
      /** What stays in view when cropped to a ratio (CSS object-position). */
      focus: {default: null, rendered: false},
      /** Shown after the caption in the preview ("Photo: …"); not stored in the image itself. */
      credit: {default: null, rendered: false},
      /** none | sm | md | lg corner rounding. */
      radius: dataAttr('radius'),
    };
  },
});

/**
 * Paragraph text roles from the design system (Display, Lead, Small, Caption, Label), stored as
 * an attribute and rendered as a class, so restyling the type scale restyles every document.
 */
export const TEXT_ROLES = ['display', 'lead', 'small', 'caption', 'label'] as const;
export type TextRole = (typeof TEXT_ROLES)[number];
const TextRoleAttribute = Extension.create({
  name: 'textRole',
  addGlobalAttributes() {
    return [
      {
        types: ['paragraph'],
        attributes: {
          textRole: {
            default: null,
            parseHTML: element => {
              const role = [...element.classList].find(name => name.startsWith('cs-text-'))?.slice(8);
              return (TEXT_ROLES as readonly string[]).includes(role ?? '') ? role : null;
            },
            renderHTML: attributes => (attributes.textRole ? {class: `cs-text-${attributes.textRole}`} : {}),
          },
        },
      },
    ];
  },
});

/** The extensions every case study is written and rendered with. */
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    fontWeight: {
      /** Sets the weight of the selected text ("400", "600"…). */
      setFontWeight: (fontWeight: string) => ReturnType;
      unsetFontWeight: () => ReturnType;
    };
    textTransform: {
      /** Sets the case of the selected text ("uppercase", "lowercase", "capitalize"). */
      setTextTransform: (textTransform: 'uppercase' | 'lowercase' | 'capitalize') => ReturnType;
      unsetTextTransform: () => ReturnType;
    };
    spacer: {
      /** Inserts a block of empty space ("sm" to "xl"). */
      insertSpacer: (size?: SpacerSize) => ReturnType;
    };
    letterSpacing: {
      /** Sets the letter spacing of the selected text ("-0.02em"…). */
      setLetterSpacing: (letterSpacing: string) => ReturnType;
      unsetLetterSpacing: () => ReturnType;
    };
  }
}

/** A plain CSS value, nothing that could break out of the style attribute. */
const SAFE_CSS_VALUE = /^[-\w.%() ]+$/;

/** Font weight on selected text, stored on the textStyle mark like font size. */
export const FontWeight = Extension.create({
  name: 'fontWeight',
  addGlobalAttributes() {
    return [
      {
        types: ['textStyle'],
        attributes: {
          fontWeight: {
            default: null,
            parseHTML: element => element.style.fontWeight || null,
            renderHTML: attributes =>
              attributes.fontWeight && SAFE_CSS_VALUE.test(attributes.fontWeight)
                ? {style: `font-weight: ${attributes.fontWeight}`}
                : {},
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontWeight:
        fontWeight =>
        ({chain}) =>
          chain().setMark('textStyle', {fontWeight}).run(),
      unsetFontWeight:
        () =>
        ({chain}) =>
          chain().setMark('textStyle', {fontWeight: null}).removeEmptyTextStyle().run(),
    };
  },
});

const TEXT_CASES = ['uppercase', 'lowercase', 'capitalize'];

/** Text case (UPPERCASE, lowercase, Title Case) on selected text, as a style, not by retyping it. */
export const TextTransform = Extension.create({
  name: 'textTransform',
  addGlobalAttributes() {
    return [
      {
        types: ['textStyle'],
        attributes: {
          textTransform: {
            default: null,
            parseHTML: element => element.style.textTransform || null,
            renderHTML: attributes =>
              TEXT_CASES.includes(attributes.textTransform)
                ? {style: `text-transform: ${attributes.textTransform}`}
                : {},
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setTextTransform:
        textTransform =>
        ({chain}) =>
          chain().setMark('textStyle', {textTransform}).run(),
      unsetTextTransform:
        () =>
        ({chain}) =>
          chain().setMark('textStyle', {textTransform: null}).removeEmptyTextStyle().run(),
    };
  },
});

export type SpacerSize = 'sm' | 'md' | 'lg' | 'xl';
const SPACER_SIZES: SpacerSize[] = ['sm', 'md', 'lg', 'xl'];

/** Empty space between blocks, for when a page needs more air than the rhythm gives. */
export const Spacer = Node.create({
  name: 'spacer',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,
  addAttributes() {
    return {
      size: {
        default: 'md',
        parseHTML: element => {
          const size = element.getAttribute('data-size') as SpacerSize | null;
          return size && SPACER_SIZES.includes(size) ? size : 'md';
        },
        renderHTML: attributes => ({
          'data-size': SPACER_SIZES.includes(attributes.size) ? attributes.size : 'md',
        }),
      },
    };
  },
  parseHTML() {
    return [{tag: 'div[data-spacer]'}];
  },
  renderHTML({HTMLAttributes}) {
    return [
      'div',
      mergeAttributes(
        {'data-spacer': '', 'aria-hidden': 'true', class: 'cs-spacer'},
        HTMLAttributes,
      ),
    ];
  },
  addCommands() {
    return {
      insertSpacer:
        (size = 'md') =>
        ({commands}) =>
          commands.insertContent({type: this.name, attrs: {size}}),
    };
  },
});

/** Letter spacing on selected text, stored on the textStyle mark. */
export const LetterSpacing = Extension.create({
  name: 'letterSpacing',
  addGlobalAttributes() {
    return [
      {
        types: ['textStyle'],
        attributes: {
          letterSpacing: {
            default: null,
            parseHTML: element => element.style.letterSpacing || null,
            renderHTML: attributes =>
              attributes.letterSpacing && SAFE_CSS_VALUE.test(attributes.letterSpacing)
                ? {style: `letter-spacing: ${attributes.letterSpacing}`}
                : {},
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setLetterSpacing:
        letterSpacing =>
        ({chain}) =>
          chain().setMark('textStyle', {letterSpacing}).run(),
      unsetLetterSpacing:
        () =>
        ({chain}) =>
          chain().setMark('textStyle', {letterSpacing: null}).removeEmptyTextStyle().run(),
    };
  },
});

/**
 * Headings remember which framework section they are (`section`: 'opening', 'overview'…), so an
 * empty section heading can show its title as a placeholder. Metadata only: never shown.
 */
const SectionKey = Extension.create({
  name: 'sectionKey',
  addGlobalAttributes() {
    return [
      {
        types: ['heading'],
        attributes: {
          section: {
            default: null,
            parseHTML: element => element.getAttribute('data-section'),
            renderHTML: attributes => (attributes.section ? {'data-section': attributes.section} : {}),
          },
          // Stage 2 section metadata (on top-level level-2 headings only; see editor/sections.ts).
          // Private working state: never rendered into HTML.
          sectionId: {default: null, rendered: false},
          sectionStatus: {default: null, rendered: false},
        },
      },
    ];
  },
});

/**
 * Table presentation (Table inspector): border style, striped rows, density and phone
 * behaviour, as data attributes on <table> that the stylesheet reads.
 */
export const TABLE_DEFAULTS = {tableStyle: 'grid', striped: false, density: 'comfortable', mobile: 'scroll'} as const;
const TableAttributes = Extension.create({
  name: 'tableAttributes',
  addGlobalAttributes() {
    const attr = (name: keyof typeof TABLE_DEFAULTS) => ({
      default: TABLE_DEFAULTS[name],
      parseHTML: (element: HTMLElement) => {
        const value = element.getAttribute(`data-${name.toLowerCase()}`);
        return name === 'striped' ? value === 'true' : value ?? TABLE_DEFAULTS[name];
      },
      renderHTML: (attributes: Record<string, unknown>) => ({[`data-${name.toLowerCase()}`]: String(attributes[name])}),
    });
    return [{types: ['table'], attributes: {tableStyle: attr('tableStyle'), striped: attr('striped'), density: attr('density'), mobile: attr('mobile')}}];
  },
});

export const caseStudyExtensions: Extensions = [
  SectionKey,
  TextRoleAttribute,
  TableAttributes,
  StarterKit.configure({
    heading: {levels: [1, 2, 3, 4]},
    // Code block v2 (title, line numbers, wrapping) is StudioCodeBlock below.
    codeBlock: false,
    link: {
      openOnClick: false,
      autolink: true,
      defaultProtocol: 'https',
      // Each link stores its own target (new tab or not); the link editor sets it.
      HTMLAttributes: {rel: 'noopener noreferrer', target: null},
    },
  }),
  TextStyleKit,
  FontWeight,
  LetterSpacing,
  TextTransform,
  Spacer,
  Details.configure({persist: true, HTMLAttributes: {class: 'cs-details'}}),
  DetailsSummary,
  DetailsContent,
  Highlight.configure({multicolor: true}),
  TextAlign.configure({types: ['heading', 'paragraph']}),
  Subscript,
  Superscript,
  TaskList,
  TaskItem.configure({nested: true}),
  TableKit.configure({table: {resizable: false, HTMLAttributes: {class: 'cs-table'}}}),
  StoredImage.configure({allowBase64: false}),
  FileAttachment,
  VideoFile,
  Embed,
  Callout,
  ImageGridNode,
  ComparisonNode,
  ShowcaseNode,
  DeviceMockupNode,
  MetricsNode,
  SplitLayoutNode,
  PullQuoteNode,
  TimelineNode,
  ScreenSequenceNode,
  AnnotatedImageNode,
  FlowDiagramNode,
  ResearchInsightsNode,
  ChartNode,
  StudioCodeBlock,
  ...structuredNodes,
  UnknownBlockNode,
];
