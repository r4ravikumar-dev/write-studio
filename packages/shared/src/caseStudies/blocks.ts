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
} as const;
export type VisualBlockName = keyof typeof VISUAL_BLOCKS;
