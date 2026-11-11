'use client';

import type {Editor} from '@tiptap/react';
import type {JSONContent} from '@tiptap/core';
import {Icon} from '@astryxdesign/core/Icon';
import {caseStudySectionNodes, caseStudySections, frameworkSection, type Framework} from '@studio/shared';
import {
  defaultComparison,
  defaultDeviceMockup,
  defaultImageGrid,
  defaultMetrics,
  defaultQuote,
  defaultShowcase,
  defaultSplit,
  defaultTimeline,
  defaultScreenSequence,
  defaultAnnotatedImage,
  defaultFlowDiagram,
  defaultResearchInsights,
  defaultChart,
} from '@/lib/caseStudies/blocks';
import {
  BarChart3,
  Columns2,
  Frame,
  GalleryHorizontalEnd,
  LayoutGrid,
  MessageSquareQuote,
  PanelsLeftRight,
  Smartphone,
  FileText,
  Heading2,
  Image as ImageIcon,
  Milestone,
  GalleryVerticalEnd,
  MessageSquareDot,
  Workflow,
  ListChecks,
  Table2,
  SquareCode,
  ListCollapse,
  MoveVertical,
  Lightbulb,
  List,
  ListOrdered,
  Minus,
  Quote,
  Video,
  MonitorPlay,
  Pilcrow,
  Heading3,
  TextQuote,
  TriangleAlert,
  Sparkles,
  Trophy,
  ScanSearch,
  ChartColumnBig,
  type LucideIcon,
} from 'lucide-react';
import {frequentInserts, recentInserts, recordInsert} from './insertUsage';
import {activeSectionIndex, outlineOf} from './sections';
import {insertIdFor} from './blocks/registry';

/** Insert and "/" menu categories, in menu order (editor spec §8.1; D2 adds Embeds, Advanced retired). */
export const INSERT_GROUPS = ['Text', 'Media', 'Visual', 'Data', 'Structure', 'Embeds'] as const;
export type InsertGroup = (typeof INSERT_GROUPS)[number];

/** One thing that can be added to a case study, from the Insert menu or by typing "/". */
export type InsertCommand = {
  id: string;
  /** Category in the Insert and "/" menus. */
  group: InsertGroup;
  label: string;
  description: string;
  icon: LucideIcon;
  /** Extra words the "/" menu matches on. */
  keywords: string;
  run: () => void;
};

export type InsertHandlers = {
  /** Upload an image, a video file or a document, then insert it. */
  upload: (kind: 'image' | 'video' | 'file') => void;
  /** Ask for a URL (Figma, YouTube, Vimeo, Loom), then insert the embed. */
  askEmbed: (kind: 'figma' | 'video') => void;
  /** The case study's framework version: recommendations come from its sections. */
  framework?: Framework;
};

/** The framework each command list was built for (read by Smart Insert and the section guide). */
const FRAMEWORKS = new WeakMap<InsertCommand[], Framework>();
export const frameworkOf = (commands: InsertCommand[]) => FRAMEWORKS.get(commands);

export function buildInsertCommands(editor: Editor, handlers: InsertHandlers): InsertCommand[] {
  const chain = () => editor.chain().focus();
  const block = (type: string, config: unknown, content?: JSONContent[]) => () =>
    chain()
      .insertContent(content ? {type, attrs: {config}, content} : {type, attrs: {config}})
      .run();
  const text = (value: string): JSONContent[] => [{type: 'paragraph', content: [{type: 'text', text: value}]}];
  const commands: InsertCommand[] = [
    {
      id: 'paragraph',
      group: 'Text',
      label: 'Paragraph',
      description: 'Body text',
      icon: Pilcrow,
      keywords: 'text body plain normal',
      run: () => chain().insertContent({type: 'paragraph'}).run(),
    },
    {
      id: 'heading',
      group: 'Text',
      label: 'Heading',
      description: 'A heading inside a section',
      icon: Heading3,
      keywords: 'heading subheading h3 title',
      run: () => chain().insertContent({type: 'heading', attrs: {level: 3}}).run(),
    },
    {
      id: 'lead',
      group: 'Text',
      label: 'Lead paragraph',
      description: 'A larger opening paragraph',
      icon: TextQuote,
      keywords: 'lead intro introduction large standfirst',
      run: () => chain().insertContent({type: 'paragraph', attrs: {textRole: 'lead'}}).run(),
    },
    {
      id: 'image-grid',
      group: 'Visual',
      label: 'Image grid',
      description: '2, 3 or 4 columns, asymmetric or masonry',
      icon: LayoutGrid,
      keywords: 'gallery images grid masonry columns',
      run: block('imageGrid', defaultImageGrid()),
    },
    {
      id: 'comparison',
      group: 'Visual',
      label: 'Comparison',
      description: 'Before / after, old flow / new flow',
      icon: Columns2,
      keywords: 'before after compare old new side by side',
      run: block('comparison', defaultComparison()),
    },
    {
      id: 'showcase',
      group: 'Visual',
      label: 'Showcase',
      description: 'A large image or video, at content or page-frame width',
      icon: GalleryHorizontalEnd,
      keywords: 'hero full bleed wide showcase banner',
      run: block('showcase', defaultShowcase()),
    },
    {
      id: 'devices',
      group: 'Visual',
      label: 'Device mockups',
      description: 'Phones, tablets, laptops and browsers',
      icon: Smartphone,
      keywords: 'mockup device phone iphone tablet laptop browser frame screens',
      run: block('deviceMockup', defaultDeviceMockup()),
    },
    {
      id: 'split',
      group: 'Visual',
      label: 'Split layout',
      description: 'A picture beside text',
      icon: PanelsLeftRight,
      keywords: 'split side text image editorial two column',
      run: block('splitLayout', defaultSplit(), [
        {type: 'heading', attrs: {level: 3}, content: [{type: 'text', text: 'A short heading'}]},
        ...text('Explain what the picture shows and why it matters.'),
      ]),
    },
    {
      id: 'metrics',
      group: 'Data',
      label: 'Metrics',
      description: 'Key results as large figures',
      icon: BarChart3,
      keywords: 'numbers results stats kpi outcome figures',
      run: block('metrics', defaultMetrics()),
    },
    // Content cards (editor spec §8.5): story-shaped starting points built on existing blocks.
    {
      id: 'results-highlights',
      group: 'Data',
      label: 'Results highlights',
      description: 'Your key results as big numbers',
      icon: Trophy,
      keywords: 'results outcome impact numbers kpi big figures highlights card',
      run: block('metrics', {
        ...defaultMetrics(),
        items: [0, 1, 2].map(() => ({value: '', label: '', detail: ''})),
        style: 'plain',
        size: 'large',
        align: 'center',
        surface: 'none',
      }),
    },
    {
      id: 'research-insights',
      group: 'Data',
      label: 'Research insights',
      description: 'Findings with their evidence and source',
      icon: ScanSearch,
      keywords: 'research findings insights evidence interviews study user research card',
      run: block('researchInsights', defaultResearchInsights()),
    },
    {
      id: 'chart',
      group: 'Data',
      label: 'Chart',
      description: 'Bars, a line, a donut or progress, from your figures',
      icon: ChartColumnBig,
      keywords: 'chart graph bar line donut pie progress data numbers',
      run: block('chart', defaultChart()),
    },
    {
      id: 'pull-quote',
      group: 'Text',
      label: 'Pull quote',
      description: 'A standout quote with attribution',
      icon: MessageSquareQuote,
      keywords: 'quote testimonial pull statement',
      run: () =>
        chain()
          .insertContent({type: 'pullQuote', attrs: {config: defaultQuote()}, content: [{type: 'text', text: 'What someone said that changed the direction.'}]})
          .run(),
    },
    {
      id: 'image',
      group: 'Media',
      label: 'Image',
      description: 'Upload an image (PNG, JPG, WebP, GIF or SVG)',
      icon: ImageIcon,
      keywords: 'picture photo screenshot upload',
      run: () => handlers.upload('image'),
    },
    {
      id: 'video-file',
      group: 'Media',
      label: 'Video file',
      description: 'Upload a video (MP4, WebM or MOV, up to 50 MB)',
      icon: Video,
      keywords: 'movie clip mp4 upload recording',
      run: () => handlers.upload('video'),
    },
    {
      id: 'video-link',
      group: 'Embeds',
      label: 'Video link',
      description: 'Embed from YouTube, Vimeo or Loom',
      icon: MonitorPlay,
      keywords: 'youtube vimeo loom embed',
      run: () => handlers.askEmbed('video'),
    },
    {
      id: 'figma',
      group: 'Embeds',
      label: 'Figma',
      description: 'Embed a Figma file, prototype or board',
      icon: Frame,
      keywords: 'design prototype canvas board embed',
      run: () => handlers.askEmbed('figma'),
    },
    {
      id: 'file',
      group: 'Media',
      label: 'File',
      description: 'Attach a document (PDF, PowerPoint or Word)',
      icon: FileText,
      keywords: 'pdf ppt pptx doc docx word powerpoint slides document attachment',
      run: () => handlers.upload('file'),
    },
    {
      id: 'section',
      group: 'Structure',
      label: 'New section',
      description: 'Start a new section of the story',
      icon: Heading2,
      keywords: 'heading h2 title section',
      run: () => chain().setHeading({level: 2}).run(),
    },
    {
      id: 'callout',
      group: 'Text',
      label: 'Callout',
      description: 'A highlighted note or key insight',
      icon: Lightbulb,
      keywords: 'note insight highlight tip',
      run: () =>
        chain()
          .insertContent({type: 'callout', attrs: {tone: 'brand', icon: 'lightbulb'}, content: [{type: 'paragraph'}]})
          .run(),
    },
    {
      id: 'problem-callout',
      group: 'Text',
      label: 'Problem callout',
      description: 'The problem in one sentence',
      icon: TriangleAlert,
      keywords: 'problem challenge pain point issue callout card',
      run: () =>
        chain()
          .insertContent({type: 'callout', attrs: {tone: 'warning', icon: 'alert'}, content: [{type: 'paragraph'}]})
          .run(),
    },
    {
      id: 'key-takeaway',
      group: 'Text',
      label: 'Key takeaway',
      description: 'The one thing to remember',
      icon: Sparkles,
      keywords: 'takeaway lesson learning insight reflection summary callout card',
      run: () =>
        chain()
          .insertContent({type: 'callout', attrs: {tone: 'brand', icon: 'star'}, content: [{type: 'paragraph'}]})
          .run(),
    },
    {
      id: 'quote',
      group: 'Text',
      label: 'Quote',
      description: 'A quote from research or a stakeholder',
      icon: Quote,
      keywords: 'blockquote citation',
      run: () => chain().setParagraph().toggleBlockquote().run(),
    },
    {
      id: 'bullets',
      group: 'Text',
      label: 'Bulleted list',
      description: 'A simple list',
      icon: List,
      keywords: 'list ul bullets',
      run: () => chain().toggleBulletList().run(),
    },
    {
      id: 'numbers',
      group: 'Text',
      label: 'Numbered list',
      description: 'Steps in order',
      icon: ListOrdered,
      keywords: 'list ol numbers steps',
      run: () => chain().toggleOrderedList().run(),
    },
    {
      id: 'divider',
      group: 'Text',
      label: 'Divider',
      description: 'A line between parts of the story',
      icon: Minus,
      keywords: 'hr rule separator line',
      run: () => chain().setHorizontalRule().run(),
    },
    {
      id: 'checklist',
      group: 'Text',
      label: 'Checklist',
      description: 'A list with tick boxes',
      icon: ListChecks,
      keywords: 'todo task checkbox list',
      run: () => chain().toggleTaskList().run(),
    },
    {
      id: 'table',
      group: 'Text',
      label: 'Table',
      description: 'A 3 × 3 table with a header row',
      icon: Table2,
      keywords: 'grid rows columns data',
      run: () => chain().insertTable({rows: 3, cols: 3, withHeaderRow: true}).run(),
    },
    {
      id: 'code-block',
      group: 'Text',
      label: 'Code block',
      description: 'Code shown in a fixed-width font',
      icon: SquareCode,
      keywords: 'code snippet pre monospace',
      run: () => chain().toggleCodeBlock().run(),
    },
    {
      id: 'collapsible',
      group: 'Text',
      label: 'Collapsible section',
      description: 'Content readers can open and close',
      icon: ListCollapse,
      keywords: 'details accordion toggle expand',
      run: () => chain().setDetails().run(),
    },
    {
      id: 'space',
      group: 'Structure',
      label: 'Space',
      description: 'Extra space between parts',
      icon: MoveVertical,
      keywords: 'spacer gap padding blank',
      run: () => chain().insertSpacer('md').run(),
    },
    {
      id: 'screen-sequence',
      group: 'Visual',
      label: 'Screen sequence',
      description: 'Screens in order, step by step',
      icon: GalleryVerticalEnd,
      keywords: 'flow steps screens walkthrough journey storyboard',
      run: block('screenSequence', defaultScreenSequence()),
    },
    {
      id: 'annotated-image',
      group: 'Visual',
      label: 'Annotated screenshot',
      description: 'Numbered notes on parts of a screen',
      icon: MessageSquareDot,
      keywords: 'annotation markers callouts hotspots explain screenshot',
      run: block('annotatedImage', defaultAnnotatedImage()),
    },
    {
      id: 'timeline',
      group: 'Structure',
      label: 'Process timeline',
      description: 'Project phases and how it evolved',
      icon: Milestone,
      keywords: 'phases process roadmap milestones schedule',
      run: block('timeline', defaultTimeline()),
    },
    {
      id: 'flow-diagram',
      group: 'Structure',
      label: 'Flow diagram',
      description: 'A user or system flow with decisions',
      icon: Workflow,
      keywords: 'flowchart user flow diagram decision logic',
      run: block('flowDiagram', defaultFlowDiagram()),
    },
  ];
  // Every insert is counted for Recently / Frequently used (ids only, this browser only).
  const recorded = commands.map(command => ({...command, run: () => (recordInsert(command.id), command.run())}));
  if (handlers.framework) FRAMEWORKS.set(recorded, handlers.framework);
  return recorded;
}

/** A titled group of insert commands (the top sections, then the categories). */
export type InsertSection = {title: string; commands: InsertCommand[]};

/**
 * Smart Insert's top sections (editor spec §8.2): recommended for the section the cursor is in
 * (from the framework's suggested visuals), recently used, and frequently used. Suggestions only:
 * everything stays in its category below.
 */
export function smartSections(commands: InsertCommand[], editor: Editor): InsertSection[] {
  const byId = new Map(commands.map(command => [command.id, command]));
  const pick = (ids: (string | undefined)[]) => ids.map(id => (id ? byId.get(id) : undefined)).filter((command): command is InsertCommand => Boolean(command));
  const sections: InsertSection[] = [];
  const outline = outlineOf(editor.state.doc);
  const current = outline[activeSectionIndex(outline, editor.state.selection.from)];
  const framework = current ? frameworkSection(current.key, frameworkOf(commands)) : undefined;
  const recommended = framework ? pick(framework.suggestedVisuals.map(insertIdFor)).slice(0, 4) : [];
  if (recommended.length) sections.push({title: `Recommended for “${current!.name}”`, commands: recommended});
  const recent = pick(recentInserts(5));
  if (recent.length) sections.push({title: 'Recently used', commands: recent});
  const frequent = pick(frequentInserts(5, [...recent, ...recommended].map(command => command.id)));
  if (frequent.length) sections.push({title: 'Frequently used', commands: frequent});
  return sections;
}

/**
 * The Insert menu's sections (desktop Insert button and the phone floating button): the top
 * sections, then the six categories in order, then the framework's template sections.
 */
export function insertMenuItems(commands: InsertCommand[], editor: Editor) {
  const toItem = (command: InsertCommand) => ({
    label: command.label,
    description: command.description,
    icon: <Icon icon={command.icon} size="sm" color="inherit" />,
    onClick: () => command.run(),
  });
  const top = smartSections(commands, editor).map(section => ({type: 'section' as const, title: section.title, items: section.commands.map(toItem)}));
  const sections = INSERT_GROUPS.map(group => ({
    type: 'section' as const,
    title: group,
    items: commands
      .filter(command => command.group === group)
      .map(command => ({
        label: command.label,
        description: command.description,
        icon: <Icon icon={command.icon} size="sm" color="inherit" />,
        onClick: () => command.run(),
      })),
  })).filter(section => section.items.length);
  return [
    ...top,
    ...sections,
    {
      type: 'section' as const,
      title: 'Template sections',
      items: caseStudySections.map(section => ({
        label: section.title,
        description: section.hint,
        onClick: () => editor.chain().focus().insertContent(caseStudySectionNodes(section)).run(),
      })),
    },
  ];
}
