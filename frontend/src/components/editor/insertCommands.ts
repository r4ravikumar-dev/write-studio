'use client';

import type {Editor} from '@tiptap/react';
import type {JSONContent} from '@tiptap/core';
import {
  defaultComparison,
  defaultDeviceMockup,
  defaultImageGrid,
  defaultMetrics,
  defaultQuote,
  defaultShowcase,
  defaultSplit,
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
  Lightbulb,
  List,
  ListOrdered,
  Minus,
  Quote,
  Video,
  MonitorPlay,
  type LucideIcon,
} from 'lucide-react';

/** One thing that can be added to a case study, from the Insert menu or by typing "/". */
export type InsertCommand = {
  id: string;
  /** Groups in the Insert menu. */
  group: 'Visual' | 'Media' | 'Text';
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
};

export function buildInsertCommands(editor: Editor, handlers: InsertHandlers): InsertCommand[] {
  const chain = () => editor.chain().focus();
  const block = (type: string, config: unknown, content?: JSONContent[]) => () =>
    chain()
      .insertContent(content ? {type, attrs: {config}, content} : {type, attrs: {config}})
      .run();
  const text = (value: string): JSONContent[] => [{type: 'paragraph', content: [{type: 'text', text: value}]}];
  return [
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
      group: 'Visual',
      label: 'Metrics',
      description: 'Key results as large figures',
      icon: BarChart3,
      keywords: 'numbers results stats kpi outcome figures',
      run: block('metrics', defaultMetrics()),
    },
    {
      id: 'pull-quote',
      group: 'Visual',
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
      group: 'Media',
      label: 'Video link',
      description: 'Embed from YouTube, Vimeo or Loom',
      icon: MonitorPlay,
      keywords: 'youtube vimeo loom embed',
      run: () => handlers.askEmbed('video'),
    },
    {
      id: 'figma',
      group: 'Media',
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
      group: 'Text',
      label: 'Section heading',
      description: 'Start a new section of the story',
      icon: Heading2,
      keywords: 'heading h2 title section',
      run: () => chain().setHeading({level: 2}).run(),
    },
    {
      id: 'callout',
      group: 'Visual',
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
  ];
}
