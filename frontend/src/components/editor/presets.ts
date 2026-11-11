import {devicePreset, type DeviceMockupConfig, type DevicePreset} from '@/lib/caseStudies/blocks';

/**
 * Layout presets for the visual blocks (Stage 4, "presets → inspector → direct manipulation").
 * A preset is a named bundle of LAYOUT values only: applying one never touches the block's
 * pictures, text, figures or steps. Every value stays adjustable in the inspector afterwards.
 *
 * Each preset has a small schematic: rectangles on a 64×40 canvas.
 *   m = media, t = text line, a = accent (brand), p = panel (tinted background), d = dark panel
 */
export type SketchShape = [kind: 'm' | 't' | 'a' | 'p' | 'd', x: number, y: number, w: number, h: number];

export type BlockPreset = {
  id: string;
  label: string;
  description: string;
  sketch: SketchShape[];
  /** Layout values to set (config fields; for the callout, node attributes). */
  values: Record<string, unknown>;
  /** For presets that rebuild part of the config (device compositions), keeping the media. */
  apply?: (config: Record<string, unknown>) => Record<string, unknown>;
};

const devices = (preset: DevicePreset) => (config: Record<string, unknown>) => ({
  ...config,
  preset,
  devices: devicePreset(preset, (config as DeviceMockupConfig).devices ?? []),
});

export const BLOCK_PRESETS: Record<string, BlockPreset[]> = {
  imageGrid: [
    {id: 'pair', label: 'Pair', description: 'Two pictures, side by side', values: {columns: 2, arrangement: 'even', ratio: '4:3', gap: 'md', width: 'content', surface: 'none'}, sketch: [['m', 4, 8, 27, 24], ['m', 33, 8, 27, 24]]},
    {id: 'row', label: 'Row of three', description: 'Square pictures in a row', values: {columns: 3, arrangement: 'even', ratio: '1:1', gap: 'md', width: 'content', surface: 'none'}, sketch: [['m', 4, 12, 17, 17], ['m', 23, 12, 18, 17], ['m', 43, 12, 17, 17]]},
    {id: 'feature', label: 'Feature + details', description: 'One large picture with smaller ones, wide', values: {columns: 3, arrangement: 'asymmetric', ratio: '4:3', gap: 'md', width: 'wide', surface: 'none'}, sketch: [['m', 2, 6, 38, 28], ['m', 42, 6, 20, 13], ['m', 42, 21, 20, 13]]},
    {id: 'masonry', label: 'Masonry wall', description: 'Pictures at their own heights, wide', values: {columns: 3, arrangement: 'masonry', gap: 'sm', width: 'wide', surface: 'none'}, sketch: [['m', 2, 4, 19, 20], ['m', 2, 26, 19, 10], ['m', 23, 4, 19, 12], ['m', 23, 18, 19, 18], ['m', 44, 4, 18, 32]]},
    {id: 'panel', label: 'On a panel', description: 'Two wide pictures on a tinted background', values: {columns: 2, arrangement: 'even', ratio: '16:9', gap: 'md', width: 'content', surface: 'muted'}, sketch: [['p', 2, 6, 60, 28], ['m', 6, 12, 25, 15], ['m', 33, 12, 25, 15]]},
    {id: 'seamless', label: 'Seamless', description: 'Edge to edge with no gaps, wide', values: {columns: 2, arrangement: 'even', ratio: '1:1', gap: 'none', width: 'wide', surface: 'none'}, sketch: [['m', 2, 6, 30, 28], ['m', 32, 6, 30, 28]]},
  ],
  comparison: [
    {id: 'slider', label: 'Before / after slider', description: 'Drag to reveal the change, wide', values: {display: 'slider', split: '50-50', ratio: '16:9', width: 'wide'}, sketch: [['m', 2, 6, 60, 28], ['a', 31, 4, 2, 32]]},
    {id: 'side', label: 'Side by side', description: 'Two equal columns', values: {display: 'side-by-side', split: '50-50', ratio: 'auto', width: 'content'}, sketch: [['m', 4, 8, 27, 20], ['m', 33, 8, 27, 20], ['t', 4, 31, 14, 2], ['t', 33, 31, 14, 2]]},
    {id: 'after', label: 'Focus on after', description: 'The new version larger, wide', values: {display: 'side-by-side', split: '40-60', ratio: 'auto', width: 'wide'}, sketch: [['m', 2, 10, 22, 16], ['m', 26, 6, 36, 24], ['t', 2, 29, 12, 2], ['t', 26, 33, 16, 2]]},
  ],
  showcase: [
    {id: 'column', label: 'In the column', description: 'At the width of the text', values: {width: 'content', ratio: '16:9', surface: 'none', inset: 'none'}, sketch: [['t', 12, 4, 40, 2], ['m', 12, 9, 40, 22], ['t', 12, 34, 28, 2]]},
    {id: 'hero', label: 'Wide hero', description: 'Cinematic, out to the page edges', values: {width: 'frame', ratio: '21:9', surface: 'none', inset: 'none'}, sketch: [['m', 2, 10, 60, 20]]},
    {id: 'tint', label: 'Framed on tint', description: 'Inset on a brand-tinted panel', values: {width: 'content', ratio: '16:9', surface: 'brand', inset: 'md'}, sketch: [['p', 8, 4, 48, 32], ['m', 14, 9, 36, 22]]},
    {id: 'stage', label: 'Dark stage', description: 'Inset on a dark panel, wide', values: {width: 'frame', ratio: '16:9', surface: 'inverse', inset: 'lg'}, sketch: [['d', 2, 4, 60, 32], ['m', 14, 9, 36, 22]]},
  ],
  deviceMockup: [
    {id: 'single', label: 'Single phone', description: 'One screen, centred', values: {preset: 'single', surface: 'muted'}, apply: devices('single'), sketch: [['p', 2, 2, 60, 36], ['m', 26, 5, 12, 30]]},
    {id: 'dual', label: 'Two phones', description: 'Overlapping, slightly turned', values: {preset: 'dual-overlap', surface: 'brand'}, apply: devices('dual-overlap'), sketch: [['p', 2, 2, 60, 36], ['m', 20, 6, 12, 28], ['m', 32, 4, 12, 28]]},
    {id: 'triple', label: 'Three phones', description: 'A fan of three screens', values: {preset: 'triple-stack', surface: 'muted'}, apply: devices('triple-stack'), sketch: [['p', 2, 2, 60, 36], ['m', 12, 8, 11, 26], ['m', 26, 4, 12, 30], ['m', 41, 8, 11, 26]]},
    {id: 'multi', label: 'Every screen', description: 'Laptop, tablet and phone together', values: {preset: 'multi-device', surface: 'none'}, apply: devices('multi-device'), sketch: [['m', 10, 6, 34, 22], ['m', 44, 16, 14, 18], ['m', 6, 18, 8, 16]]},
  ],
  splitLayout: [
    {id: 'left', label: 'Picture left', description: 'Half picture, half text', values: {order: 'media-text', proportion: '50-50', align: 'center', width: 'content', surface: 'none'}, sketch: [['m', 4, 6, 27, 28], ['t', 35, 12, 24, 2], ['t', 35, 17, 22, 2], ['t', 35, 22, 18, 2]]},
    {id: 'right', label: 'Picture right', description: 'Text first, then the picture', values: {order: 'text-media', proportion: '50-50', align: 'center', width: 'content', surface: 'none'}, sketch: [['t', 4, 12, 24, 2], ['t', 4, 17, 22, 2], ['t', 4, 22, 18, 2], ['m', 33, 6, 27, 28]]},
    {id: 'big', label: 'Big picture', description: 'Two-thirds picture, wide', values: {order: 'media-text', proportion: '67-33', align: 'center', width: 'wide', surface: 'none'}, sketch: [['m', 2, 4, 40, 32], ['t', 45, 14, 16, 2], ['t', 45, 19, 14, 2], ['t', 45, 24, 10, 2]]},
    {id: 'card', label: 'Card', description: 'On a tinted panel', values: {order: 'media-text', proportion: '40-60', align: 'center', width: 'content', surface: 'muted'}, sketch: [['p', 2, 4, 60, 32], ['m', 6, 9, 22, 22], ['t', 32, 14, 24, 2], ['t', 32, 19, 20, 2], ['t', 32, 24, 14, 2]]},
    {id: 'band', label: 'Brand band', description: 'Text and picture on brand tint, wide', values: {order: 'text-media', proportion: '50-50', align: 'center', width: 'wide', surface: 'brand'}, sketch: [['p', 2, 4, 60, 32], ['t', 6, 14, 22, 2], ['t', 6, 19, 18, 2], ['m', 33, 8, 25, 24]]},
  ],
  pullQuote: [
    {id: 'editorial', label: 'Editorial', description: 'Italic accent face', values: {style: 'serif', align: 'start'}, sketch: [['a', 6, 8, 6, 4], ['t', 6, 15, 48, 3], ['t', 6, 21, 36, 3], ['t', 6, 30, 14, 2]]},
    {id: 'statement', label: 'Big statement', description: 'Large and centred', values: {style: 'large', align: 'center'}, sketch: [['t', 6, 10, 52, 5], ['t', 14, 18, 36, 5], ['t', 25, 29, 14, 2]]},
    {id: 'rule', label: 'Side rule', description: 'A brand line beside the quote', values: {style: 'bordered', align: 'start'}, sketch: [['a', 6, 8, 2, 24], ['t', 12, 11, 42, 3], ['t', 12, 17, 32, 3], ['t', 12, 27, 14, 2]]},
    {id: 'centred-rule', label: 'Between rules', description: 'Centred between brand lines', values: {style: 'bordered', align: 'center'}, sketch: [['a', 8, 6, 48, 1.5], ['t', 12, 14, 40, 3], ['t', 18, 20, 28, 3], ['a', 8, 32, 48, 1.5]]},
  ],
  metrics: [
    {id: 'row', label: 'Simple row', description: 'Figures with a line above each', values: {style: 'plain', size: 'regular', align: 'start', surface: 'none'}, sketch: [['t', 4, 12, 16, 1], ['t', 24, 12, 16, 1], ['t', 44, 12, 16, 1], ['a', 4, 16, 12, 5], ['a', 24, 16, 12, 5], ['a', 44, 16, 12, 5], ['t', 4, 25, 10, 2], ['t', 24, 25, 10, 2], ['t', 44, 25, 10, 2]]},
    {id: 'big', label: 'Big numbers', description: 'Large, centred figures', values: {style: 'plain', size: 'large', align: 'center', surface: 'none'}, sketch: [['a', 5, 10, 15, 9], ['a', 25, 10, 15, 9], ['a', 45, 10, 15, 9], ['t', 7, 24, 11, 2], ['t', 27, 24, 11, 2], ['t', 47, 24, 11, 2]]},
    {id: 'cards', label: 'Cards', description: 'Each figure in its own card', values: {style: 'cards', size: 'regular', align: 'start', surface: 'none'}, sketch: [['p', 3, 8, 18, 24], ['p', 23, 8, 18, 24], ['p', 43, 8, 18, 24], ['a', 6, 12, 10, 5], ['a', 26, 12, 10, 5], ['a', 46, 12, 10, 5]]},
    {id: 'dark', label: 'Dark band', description: 'Large figures on a dark panel', values: {style: 'plain', size: 'large', align: 'center', surface: 'inverse'}, sketch: [['d', 2, 6, 60, 28], ['a', 7, 12, 13, 8], ['a', 26, 12, 13, 8], ['a', 45, 12, 13, 8], ['t', 9, 24, 9, 2], ['t', 28, 24, 9, 2], ['t', 47, 24, 9, 2]]},
  ],
  callout: [
    {id: 'insight', label: 'Insight', description: 'Brand tint with a light bulb', values: {tone: 'brand', icon: 'lightbulb'}, sketch: [['p', 2, 8, 60, 24], ['a', 6, 13, 5, 5], ['t', 14, 14, 40, 2], ['t', 14, 20, 30, 2]]},
    {id: 'note', label: 'Note', description: 'Neutral, for context', values: {tone: 'neutral', icon: 'info'}, sketch: [['p', 2, 8, 60, 24], ['t', 6, 13, 5, 5], ['t', 14, 14, 40, 2], ['t', 14, 20, 30, 2]]},
    {id: 'result', label: 'Result', description: 'Positive, for outcomes', values: {tone: 'success', icon: 'check'}, sketch: [['p', 2, 8, 60, 24], ['a', 6, 13, 5, 5], ['t', 14, 14, 40, 2], ['t', 14, 20, 30, 2]]},
    {id: 'caution', label: 'Problem', description: 'The problem, a risk or a constraint', values: {tone: 'warning', icon: 'alert'}, sketch: [['p', 2, 8, 60, 24], ['a', 6, 13, 5, 5], ['t', 14, 14, 40, 2], ['t', 14, 20, 30, 2]]},
    {id: 'takeaway', label: 'Key takeaway', description: 'The one thing to remember', values: {tone: 'brand', icon: 'star'}, sketch: [['p', 2, 8, 60, 24], ['a', 6, 13, 5, 5], ['t', 14, 14, 40, 2], ['t', 14, 20, 30, 2]]},
  ],
  timeline: [
    {id: 'line', label: 'Process line', description: 'Phases along a line', values: {layout: 'horizontal', style: 'line'}, sketch: [['t', 4, 19, 56, 1], ['a', 6, 17, 4, 4], ['a', 22, 17, 4, 4], ['a', 38, 17, 4, 4], ['a', 54, 17, 4, 4], ['t', 4, 25, 10, 2], ['t', 20, 25, 10, 2], ['t', 36, 25, 10, 2], ['t', 52, 25, 8, 2]]},
    {id: 'cards', label: 'Phase cards', description: 'Each phase in a card', values: {layout: 'horizontal', style: 'cards'}, sketch: [['p', 2, 10, 14, 20], ['p', 18, 10, 14, 20], ['p', 34, 10, 14, 20], ['p', 50, 10, 12, 20]]},
    {id: 'down', label: 'Down the page', description: 'A vertical story', values: {layout: 'vertical', style: 'line'}, sketch: [['t', 10, 4, 1, 32], ['a', 8, 6, 5, 4], ['a', 8, 17, 5, 4], ['a', 8, 28, 5, 4], ['t', 16, 7, 30, 2], ['t', 16, 18, 26, 2], ['t', 16, 29, 22, 2]]},
    {id: 'stacked', label: 'Stacked cards', description: 'Vertical cards', values: {layout: 'vertical', style: 'cards'}, sketch: [['p', 10, 3, 44, 10], ['p', 10, 15, 44, 10], ['p', 10, 27, 44, 10]]},
  ],
  screenSequence: [
    {id: 'phone', label: 'Phone flow', description: 'Phone screens with arrows', values: {frame: 'phone', columns: 3, arrows: true, ratio: '9:16'}, sketch: [['m', 6, 4, 12, 30], ['a', 20, 18, 4, 2], ['m', 26, 4, 12, 30], ['a', 40, 18, 4, 2], ['m', 46, 4, 12, 30]]},
    {id: 'web', label: 'Web flow', description: 'Browser screens with arrows', values: {frame: 'browser', columns: 2, arrows: true, ratio: '16:9'}, sketch: [['m', 3, 10, 26, 18], ['a', 30, 18, 4, 2], ['m', 35, 10, 26, 18]]},
    {id: 'grid', label: 'Plain grid', description: 'Screens without frames or arrows', values: {frame: 'none', columns: 3, arrows: false, ratio: '4:3'}, sketch: [['m', 4, 10, 17, 14], ['m', 23, 10, 18, 14], ['m', 43, 10, 17, 14], ['t', 4, 27, 12, 2], ['t', 23, 27, 12, 2], ['t', 43, 27, 12, 2]]},
  ],
  annotatedImage: [
    {id: 'below', label: 'Notes below', description: 'Numbered notes under the picture', values: {notes: 'below', ratio: '16:9'}, sketch: [['m', 8, 2, 48, 24], ['a', 16, 8, 4, 4], ['a', 40, 16, 4, 4], ['t', 8, 30, 30, 2], ['t', 8, 35, 24, 2]]},
    {id: 'side', label: 'Notes beside', description: 'Picture with notes at the side', values: {notes: 'side', ratio: 'auto'}, sketch: [['m', 2, 4, 38, 32], ['a', 10, 10, 4, 4], ['a', 28, 22, 4, 4], ['t', 44, 10, 18, 2], ['t', 44, 16, 14, 2], ['t', 44, 24, 18, 2]]},
  ],
  researchInsights: [
    {id: 'cards', label: 'Insight cards', description: 'Three findings side by side', values: {layout: 'cards', columns: 3, numbered: true}, sketch: [['p', 2, 6, 18, 28], ['p', 23, 6, 18, 28], ['p', 44, 6, 18, 28], ['a', 5, 10, 8, 2], ['a', 26, 10, 8, 2], ['a', 47, 10, 8, 2], ['t', 5, 16, 12, 2], ['t', 26, 16, 12, 2], ['t', 47, 16, 12, 2]]},
    {id: 'pairs', label: 'Two by two', description: 'Findings in two columns', values: {layout: 'cards', columns: 2, numbered: true}, sketch: [['p', 4, 3, 27, 16], ['p', 33, 3, 27, 16], ['p', 4, 21, 27, 16], ['p', 33, 21, 27, 16]]},
    {id: 'list', label: 'Findings list', description: 'One finding after another', values: {layout: 'list', numbered: true}, sketch: [['a', 6, 6, 8, 2], ['t', 6, 10, 46, 2], ['a', 6, 17, 8, 2], ['t', 6, 21, 40, 2], ['a', 6, 28, 8, 2], ['t', 6, 32, 44, 2]]},
  ],
  chart: [
    {id: 'bars', label: 'Bars', description: 'Compare amounts', values: {kind: 'bar'}, sketch: [['t', 4, 8, 10, 2], ['a', 16, 7, 40, 4], ['t', 4, 18, 10, 2], ['a', 16, 17, 28, 4], ['t', 4, 28, 10, 2], ['a', 16, 27, 18, 4]]},
    {id: 'line', label: 'Line', description: 'Change over time', values: {kind: 'line'}, sketch: [['t', 4, 34, 56, 1], ['a', 6, 26, 12, 2], ['a', 18, 20, 14, 2], ['a', 32, 14, 14, 2], ['a', 46, 8, 14, 2]]},
    {id: 'donut', label: 'Donut', description: 'Parts of a whole', values: {kind: 'donut'}, sketch: [['a', 6, 6, 28, 28], ['t', 40, 10, 18, 2], ['t', 40, 18, 14, 2], ['t', 40, 26, 16, 2]]},
    {id: 'progress', label: 'Progress', description: 'How far towards a target', values: {kind: 'progress'}, sketch: [['t', 4, 6, 20, 2], ['p', 4, 11, 56, 4], ['a', 4, 11, 40, 4], ['t', 4, 22, 20, 2], ['p', 4, 27, 56, 4], ['a', 4, 27, 22, 4]]},
  ],
  flowDiagram: [
    {id: 'across', label: 'Left to right', description: 'Steps across the page', values: {direction: 'horizontal'}, sketch: [['p', 2, 14, 12, 10], ['a', 15, 18, 3, 2], ['p', 19, 14, 12, 10], ['a', 32, 18, 3, 2], ['p', 36, 14, 12, 10], ['a', 49, 18, 3, 2], ['p', 53, 14, 9, 10]]},
    {id: 'down', label: 'Top to bottom', description: 'Steps down the page', values: {direction: 'vertical'}, sketch: [['p', 20, 2, 24, 8], ['a', 31, 11, 2, 3], ['p', 20, 15, 24, 8], ['a', 31, 24, 2, 3], ['p', 20, 28, 24, 8]]},
  ],
};

/** Whether a block's current settings are exactly this preset (so it shows as chosen). */
export function isPresetActive(preset: BlockPreset, current: Record<string, unknown>) {
  return Object.entries(preset.values).every(([key, value]) => {
    const now = current[key];
    // Optional Stage 4 fields read as their defaults when missing.
    const fallback = key === 'width' ? 'content' : key === 'surface' ? 'none' : key === 'size' ? 'regular' : key === 'align' ? 'start' : key === 'display' ? 'side-by-side' : undefined;
    return (now ?? fallback) === value;
  });
}

/** The block's settings with a preset applied (layout only). */
export function applyPreset(preset: BlockPreset, current: Record<string, unknown>) {
  const next = {...current, ...preset.values};
  return preset.apply ? preset.apply(next) : next;
}
