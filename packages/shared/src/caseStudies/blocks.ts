import type {MediaRef} from './media';

/**
 * The visual blocks of a case study: preset layouts with adjustable
 * properties (not a free-form canvas), so every composition stays responsive
 * and on-brand. Each atom block keeps its whole configuration in one `config`
 * attribute of its node in case_studies.content; blocks with editable text
 * (split layout, quote, callout) hold that text as node content.
 *
 * Shared by the editor (previews and inspectors), the private preview and
 * the Express API.
 */

export type Ratio = 'auto' | '1:1' | '4:3' | '3:2' | '16:9' | '21:9' | '3:4' | '9:16';
export type Gap = 'none' | 'sm' | 'md' | 'lg';
export type Surface = 'none' | 'muted' | 'brand' | 'inverse';

export const RATIOS: {value: Ratio; label: string}[] = [
  {value: 'auto', label: 'Original'},
  {value: '1:1', label: 'Square 1:1'},
  {value: '4:3', label: 'Standard 4:3'},
  {value: '3:2', label: 'Photo 3:2'},
  {value: '16:9', label: 'Wide 16:9'},
  {value: '21:9', label: 'Cinema 21:9'},
  {value: '3:4', label: 'Portrait 3:4'},
  {value: '9:16', label: 'Phone 9:16'},
];
export const GAPS: {value: Gap; label: string}[] = [
  {value: 'none', label: 'None'},
  {value: 'sm', label: 'Small'},
  {value: 'md', label: 'Medium'},
  {value: 'lg', label: 'Large'},
];
export const SURFACES: {value: Surface; label: string}[] = [
  {value: 'none', label: 'None'},
  {value: 'muted', label: 'Muted'},
  {value: 'brand', label: 'Brand tint'},
  {value: 'inverse', label: 'Dark'},
];
export const FOCUS_POINTS = [
  {value: 'center', label: 'Centre'},
  {value: 'top', label: 'Top'},
  {value: 'bottom', label: 'Bottom'},
  {value: 'left center', label: 'Left'},
  {value: 'right center', label: 'Right'},
];

export const ratioValue = (ratio: Ratio | undefined) => (ratio && ratio !== 'auto' ? ratio.replace(':', ' / ') : undefined);

// ----------------------------------------------------------------------------
// 1. Image grid
// ----------------------------------------------------------------------------
export type ImageGridConfig = {
  columns: 2 | 3 | 4;
  /** even: equal cells; asymmetric: the first image takes a double cell; masonry: natural heights. */
  arrangement: 'even' | 'asymmetric' | 'masonry';
  ratio: Ratio;
  gap: Gap;
  items: MediaRef[];
  caption: string;
  /** Columns on phones (below 768px): 2 (default; 1 below 480px) or always 1. */
  mobileColumns?: 1 | 2;
};
export const defaultImageGrid = (): ImageGridConfig => ({
  columns: 2,
  arrangement: 'even',
  ratio: '4:3',
  gap: 'md',
  items: [],
  caption: '',
});

// ----------------------------------------------------------------------------
// 2. Side-by-side comparison
// ----------------------------------------------------------------------------
export type ComparisonSide = {media: MediaRef | null; label: string; text: string};
export type ComparisonConfig = {
  mode: 'before-after' | 'old-new' | 'custom';
  /** side-by-side (default) or slider: one picture over the other with a draggable divider. */
  display?: 'side-by-side' | 'slider';
  split: '50-50' | '60-40' | '40-60';
  ratio: Ratio;
  left: ComparisonSide;
  right: ComparisonSide;
  caption: string;
};
export const COMPARISON_LABELS = {
  'before-after': ['Before', 'After'],
  'old-new': ['Old flow', 'New flow'],
  custom: ['', ''],
} as const;
export const defaultComparison = (): ComparisonConfig => ({
  mode: 'before-after',
  display: 'side-by-side',
  split: '50-50',
  ratio: 'auto',
  left: {media: null, label: 'Before', text: ''},
  right: {media: null, label: 'After', text: ''},
  caption: '',
});

// ----------------------------------------------------------------------------
// 3. Showcase
// ----------------------------------------------------------------------------
export type ShowcaseConfig = {
  media: MediaRef | null;
  ratio: Ratio;
  focus: string;
  /**
   * content: the article's width, like the text and every other block
   * (the default); frame: wider, up to the page's frame lines. Never edge
   * to edge. Older documents may hold 'full' (shown at content width) or
   * 'wide' (shown at the frame's width).
   */
  width: 'content' | 'frame' | 'full' | 'wide';
  surface: Surface;
  /** Breathing room around the media on its surface. */
  inset: Gap;
  caption: string;
};
export const defaultShowcase = (): ShowcaseConfig => ({
  media: null,
  ratio: '16:9',
  focus: 'center',
  width: 'content',
  surface: 'none',
  inset: 'none',
  caption: '',
});

// ----------------------------------------------------------------------------
// 4. Device mockup composition
// ----------------------------------------------------------------------------
export type DeviceType = 'phone' | 'tablet' | 'laptop' | 'browser';
export type Device = {
  id: string;
  type: DeviceType;
  media: MediaRef | null;
  /** Centre position on the stage, in % of its width and height. */
  x: number;
  y: number;
  /** Width relative to the device's natural size on the stage (0.4–1.6). */
  scale: number;
  /** Degrees, −30 to 30. */
  rotate: number;
  /** Layer order: higher sits on top. */
  z: number;
  /** Locked devices can't be dragged on the canvas (Inspector 2.0). */
  locked?: boolean;
};
export type DevicePreset = 'single' | 'dual-overlap' | 'triple-stack' | 'multi-device' | 'custom';
export type DeviceMockupConfig = {
  preset: DevicePreset;
  devices: Device[];
  stageRatio: Ratio;
  shadow: boolean;
  spacing: 'tight' | 'normal' | 'loose';
  surface: Surface;
  /** On phones: keep the composition, show the devices one after another, or show the first only. */
  mobile: 'composition' | 'stack' | 'first';
  caption: string;
};

export const DEVICE_LABELS: Record<DeviceType, string> = {
  phone: 'Smartphone',
  tablet: 'Tablet',
  laptop: 'Laptop',
  browser: 'Browser window',
};

/** A device's natural width on the stage, in % of the stage width, at scale 1. */
export const DEVICE_WIDTH: Record<DeviceType, number> = {phone: 22, tablet: 40, laptop: 62, browser: 64};

let deviceCounter = 0;
const device = (type: DeviceType, x: number, y: number, scale = 1, rotate = 0, z = 1): Device => ({
  id: `d${Date.now().toString(36)}${(deviceCounter++).toString(36)}`,
  type,
  media: null,
  x,
  y,
  scale,
  rotate,
  z,
});

/** Starting compositions; every value stays adjustable afterwards. */
export function devicePreset(preset: DevicePreset, keep: Device[] = []): Device[] {
  const media = (index: number) => keep[index]?.media ?? null;
  const withMedia = (devices: Device[]) => devices.map((d, i) => ({...d, media: media(i)}));
  switch (preset) {
    case 'single':
      return withMedia([device('phone', 50, 50, 1.25)]);
    case 'dual-overlap':
      return withMedia([device('phone', 40, 52, 1.15, -4, 1), device('phone', 60, 48, 1.15, 4, 2)]);
    case 'triple-stack':
      return withMedia([
        device('phone', 30, 54, 1, -6, 1),
        device('phone', 50, 48, 1.15, 0, 3),
        device('phone', 70, 54, 1, 6, 2),
      ]);
    case 'multi-device':
      return withMedia([device('laptop', 44, 46, 1, 0, 1), device('tablet', 76, 58, 0.6, 0, 2), device('phone', 22, 62, 0.75, 0, 3)]);
    default:
      return keep.length ? keep : withMedia([device('phone', 50, 50, 1.25)]);
  }
}

export const defaultDeviceMockup = (): DeviceMockupConfig => ({
  preset: 'dual-overlap',
  devices: devicePreset('dual-overlap'),
  stageRatio: '16:9',
  shadow: true,
  spacing: 'normal',
  surface: 'muted',
  mobile: 'composition',
  caption: '',
});

export const newDevice = (type: DeviceType, z: number) => device(type, 50, 50, 1, 0, z);

/** A copy of a device, nudged down and right so both stay visible, on top of the others. */
export const duplicateDevice = (source: Device, z: number): Device => ({
  ...device(source.type, Math.min(source.x + 6, 95), Math.min(source.y + 6, 95), source.scale, source.rotate, z),
  media: source.media,
});

// ----------------------------------------------------------------------------
// 5. Split editorial layout (its text is the node's content)
// ----------------------------------------------------------------------------
export type SplitConfig = {
  media: MediaRef | null;
  order: 'media-text' | 'text-media';
  proportion: '50-50' | '40-60' | '60-40' | '33-67' | '67-33';
  align: 'start' | 'center' | 'end';
  ratio: Ratio;
};
export const defaultSplit = (): SplitConfig => ({
  media: null,
  order: 'media-text',
  proportion: '50-50',
  align: 'center',
  ratio: 'auto',
});

// ----------------------------------------------------------------------------
// 6. Quote, callout and metrics
// ----------------------------------------------------------------------------
export type QuoteConfig = {
  style: 'serif' | 'large' | 'bordered';
  attribution: string;
  role: string;
};
export const defaultQuote = (): QuoteConfig => ({style: 'serif', attribution: '', role: ''});

export type CalloutTone = 'brand' | 'neutral' | 'success' | 'warning';
export type CalloutIcon = 'lightbulb' | 'info' | 'alert' | 'check' | 'star' | 'none';

export type Metric = {value: string; label: string; detail: string};
export type MetricsConfig = {
  items: Metric[];
  style: 'plain' | 'cards' | 'brand';
  columns: 2 | 3 | 4;
  caption: string;
};
export const defaultMetrics = (): MetricsConfig => ({
  items: [
    {value: '32%', label: 'Faster booking', detail: ''},
    {value: '4.6★', label: 'App store rating', detail: ''},
    {value: '2×', label: 'Repeat visits', detail: ''},
  ],
  style: 'plain',
  columns: 3,
  caption: '',
});

// ----------------------------------------------------------------------------
// 7. Process timeline (Insert 2.0)
// ----------------------------------------------------------------------------
export type TimelinePhase = {id: string; when: string; title: string; text: string};
export type TimelineConfig = {
  /** horizontal: phases side by side (vertical on phones); vertical: one under another. */
  layout: 'horizontal' | 'vertical';
  style: 'line' | 'cards';
  phases: TimelinePhase[];
  caption: string;
};

let idCounter = 0;
/** A short unique id for list items inside a block's config. */
export const blockItemId = (prefix: string) => `${prefix}${Date.now().toString(36)}${(idCounter++).toString(36)}`;

export const newPhase = (title = ''): TimelinePhase => ({id: blockItemId('p'), when: '', title, text: ''});
export const defaultTimeline = (): TimelineConfig => ({
  layout: 'horizontal',
  style: 'line',
  phases: ['Discover', 'Define', 'Design', 'Deliver'].map(newPhase),
  caption: '',
});

// ----------------------------------------------------------------------------
// 8. Screen sequence (Insert 2.0)
// ----------------------------------------------------------------------------
export type SequenceStep = {id: string; media: MediaRef | null; title: string; text: string};
export type ScreenSequenceConfig = {
  steps: SequenceStep[];
  /** How each screen is framed. */
  frame: 'none' | 'phone' | 'browser';
  columns: 2 | 3 | 4;
  /** Arrows between steps. */
  arrows: boolean;
  ratio: Ratio;
  caption: string;
};
export const newStep = (): SequenceStep => ({id: blockItemId('s'), media: null, title: '', text: ''});
export const defaultScreenSequence = (): ScreenSequenceConfig => ({
  steps: [newStep(), newStep(), newStep()],
  frame: 'phone',
  columns: 3,
  arrows: true,
  ratio: '9:16',
  caption: '',
});

// ----------------------------------------------------------------------------
// 9. Annotated screenshot (Insert 2.0)
// ----------------------------------------------------------------------------
export type Annotation = {
  id: string;
  /** Marker position on the image, in % of its width and height. */
  x: number;
  y: number;
  title: string;
  text: string;
};
export type AnnotatedImageConfig = {
  media: MediaRef | null;
  annotations: Annotation[];
  ratio: Ratio;
  /** Notes beside the image (wide screens) or under it. Always under it on phones. */
  notes: 'below' | 'side';
  caption: string;
};
export const newAnnotation = (x = 50, y = 50): Annotation => ({id: blockItemId('a'), x, y, title: '', text: ''});
export const defaultAnnotatedImage = (): AnnotatedImageConfig => ({
  media: null,
  annotations: [],
  ratio: 'auto',
  notes: 'below',
  caption: '',
});

// ----------------------------------------------------------------------------
// 10. Flow diagram (Insert 2.0)
// ----------------------------------------------------------------------------
export type FlowNodeKind = 'start' | 'step' | 'decision' | 'end';
export type FlowNode = {
  id: string;
  kind: FlowNodeKind;
  label: string;
  /** Text on the arrow that leaves this node ("Yes", "Taps Pay"). */
  next: string;
};
export type FlowDiagramConfig = {
  /** horizontal: left to right (top to bottom on phones); vertical: top to bottom. */
  direction: 'horizontal' | 'vertical';
  nodes: FlowNode[];
  caption: string;
};
export const FLOW_KINDS: {value: FlowNodeKind; label: string}[] = [
  {value: 'start', label: 'Start'},
  {value: 'step', label: 'Step'},
  {value: 'decision', label: 'Decision'},
  {value: 'end', label: 'End'},
];
export const newFlowNode = (kind: FlowNodeKind = 'step', label = ''): FlowNode => ({id: blockItemId('n'), kind, label, next: ''});
export const defaultFlowDiagram = (): FlowDiagramConfig => ({
  direction: 'horizontal',
  nodes: [newFlowNode('start', 'Start'), newFlowNode('step', 'Step'), newFlowNode('decision', 'Decision?'), newFlowNode('end', 'Done')],
  caption: '',
});

// ----------------------------------------------------------------------------
// Node names and validation
// ----------------------------------------------------------------------------
export const VISUAL_BLOCKS = {
  imageGrid: 'Image grid',
  comparison: 'Comparison',
  showcase: 'Showcase',
  deviceMockup: 'Device mockups',
  splitLayout: 'Split layout',
  pullQuote: 'Quote',
  callout: 'Callout',
  metrics: 'Metrics',
  timeline: 'Process timeline',
  screenSequence: 'Screen sequence',
  annotatedImage: 'Annotated screenshot',
  flowDiagram: 'Flow diagram',
} as const;
export type VisualBlockName = keyof typeof VISUAL_BLOCKS;
