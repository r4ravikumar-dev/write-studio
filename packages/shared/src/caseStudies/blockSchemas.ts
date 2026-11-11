import type {JSONContent} from './json';
import {parseEmbed} from './embeds';
import {
  defaultAnnotatedImage,
  defaultComparison,
  defaultDeviceMockup,
  defaultFlowDiagram,
  defaultImageGrid,
  defaultMetrics,
  defaultQuote,
  defaultScreenSequence,
  defaultShowcase,
  defaultSplit,
  defaultTimeline,
  defaultResearchInsights,
  defaultChart,
  chartRows,
  type ChartConfig,
} from './blocks';

/**
 * The block registry's data half (editor spec §10, T5): what the server and the editor both need
 * to know about each block type, with no React. The editor's half (inspector, presets, node view,
 * renderer, insert command) is `frontend/src/components/editor/blocks/`.
 *
 * Adding a block = one entry here + one entry in the editor registry. Stored JSON never changes
 * shape without bumping `schemaVersion` and adding a migration.
 */
export type BlockProblemKind = 'empty' | 'alt' | 'embed' | 'figures' | 'evidence' | 'summary';
export type BlockProblem = {kind: BlockProblemKind; count?: number};

export type BlockSchema = {
  type: string;
  schemaVersion: number;
  /** In review messages: "An image grid has…". */
  phrase: string;
  /** Defaults for a block's `config` (visual blocks). */
  defaults?: () => object;
  /** Counts as evidence for the story checklist when it isn't empty. */
  evidence?: boolean;
  /** Review rules: what's missing in this block. */
  problems?: (node: JSONContent) => BlockProblem[];
  /** Layout keys that may differ on tablet and phone (T3, §9.3). */
  responsiveKeys?: string[];
};

type Media = {path?: string; kind?: string; alt?: string} | null | undefined;
const config = (node: JSONContent) => ((node.attrs?.config ?? {}) as Record<string, unknown>);
const textOf = (node: JSONContent): string => node.text ?? (node.content ?? []).map(textOf).join('');
const missingAlt = (media: Media) => Boolean(media?.path && media.kind !== 'video' && !media.alt?.trim());
const altProblems = (media: Media[]): BlockProblem[] => media.filter(missingAlt).map(() => ({kind: 'alt'}));

const schemas: BlockSchema[] = [
  {
    type: 'image',
    schemaVersion: 1,
    phrase: 'An image',
    evidence: true,
    problems: node => (!node.attrs?.decorative && !String(node.attrs?.alt ?? '').trim() ? [{kind: 'alt'}] : []),
  },
  {
    type: 'imageGrid',
    schemaVersion: 1,
    phrase: 'An image grid',
    defaults: defaultImageGrid,
    evidence: true,
    responsiveKeys: ['columns'],
    problems: node => {
      const items = (config(node).items as Media[]) ?? [];
      const without = items.filter(missingAlt).length;
      return [...(items.length ? [] : [{kind: 'empty' as const}]), ...(without ? [{kind: 'alt' as const, count: without}] : [])];
    },
  },
  {
    type: 'comparison',
    schemaVersion: 1,
    phrase: 'A comparison',
    defaults: defaultComparison,
    evidence: true,
    problems: node => {
      const sides = [config(node).left, config(node).right] as {media?: Media}[];
      return [...(sides.some(side => !side?.media) ? [{kind: 'empty' as const}] : []), ...altProblems(sides.map(side => side?.media))];
    },
  },
  {type: 'showcase', schemaVersion: 1, phrase: 'A showcase', defaults: defaultShowcase, evidence: true, problems: node => mediaBlock(node)},
  {type: 'splitLayout', schemaVersion: 1, phrase: 'A split layout', defaults: defaultSplit, evidence: true, problems: node => mediaBlock(node)},
  {type: 'annotatedImage', schemaVersion: 1, phrase: 'An annotated screenshot', defaults: defaultAnnotatedImage, evidence: true, problems: node => mediaBlock(node)},
  {
    type: 'deviceMockup',
    schemaVersion: 1,
    phrase: 'A device mockup',
    defaults: defaultDeviceMockup,
    evidence: true,
    problems: node => {
      const devices = (config(node).devices as {media?: Media}[]) ?? [];
      return [...(!devices.length || devices.some(device => !device.media) ? [{kind: 'empty' as const}] : []), ...altProblems(devices.map(device => device.media))];
    },
  },
  {
    type: 'screenSequence',
    schemaVersion: 1,
    phrase: 'A screen sequence',
    defaults: defaultScreenSequence,
    evidence: true,
    responsiveKeys: ['columns'],
    problems: node => {
      const steps = (config(node).steps as {media?: Media}[]) ?? [];
      return [...(steps.some(step => step.media) ? [] : [{kind: 'empty' as const}]), ...altProblems(steps.map(step => step.media))];
    },
  },
  {
    type: 'metrics',
    schemaVersion: 1,
    phrase: 'A metrics block',
    defaults: defaultMetrics,
    evidence: true,
    responsiveKeys: ['columns'],
    problems: node => {
      const items = (config(node).items as {value?: string; label?: string}[]) ?? [];
      return !items.length || items.some(item => !item.value?.trim() || !item.label?.trim()) ? [{kind: 'figures'}] : [];
    },
  },
  {type: 'pullQuote', schemaVersion: 1, phrase: 'A quote', defaults: defaultQuote, evidence: true, problems: node => (textOf(node).trim() ? [] : [{kind: 'empty'}])},
  {type: 'timeline', schemaVersion: 1, phrase: 'A timeline', defaults: defaultTimeline},
  {type: 'flowDiagram', schemaVersion: 1, phrase: 'A flow diagram', defaults: defaultFlowDiagram},
  {type: 'callout', schemaVersion: 1, phrase: 'A callout'},
  {
    type: 'researchInsights',
    schemaVersion: 1,
    phrase: 'A research insights block',
    defaults: defaultResearchInsights,
    evidence: true,
    problems: node => {
      const insights = (config(node).insights as {finding?: string; evidence?: string}[]) ?? [];
      const written = insights.filter(insight => insight.finding?.trim());
      return [...(written.length ? [] : [{kind: 'empty' as const}]), ...(written.some(insight => !insight.evidence?.trim()) ? [{kind: 'evidence' as const}] : [])];
    },
  },
  {
    type: 'chart',
    schemaVersion: 1,
    phrase: 'A chart',
    defaults: defaultChart,
    evidence: true,
    problems: node => {
      const chart = {...defaultChart(), ...config(node)} as ChartConfig;
      return [...(chartRows(chart).length ? [] : [{kind: 'figures' as const}]), ...(chartRows(chart).length && !chart.summary.trim() ? [{kind: 'summary' as const}] : [])];
    },
  },
  {type: 'embed', schemaVersion: 1, phrase: 'An embedded video or design', evidence: true, problems: node => (parseEmbed(String(node.attrs?.src ?? '')) ? [] : [{kind: 'embed'}])},
  {type: 'videoFile', schemaVersion: 1, phrase: 'A video', evidence: true, problems: node => (node.attrs?.src ? [] : [{kind: 'empty'}])},
  {type: 'fileAttachment', schemaVersion: 1, phrase: 'A file', evidence: true},
];

function mediaBlock(node: JSONContent): BlockProblem[] {
  const media = config(node).media as Media;
  return [...(media ? [] : [{kind: 'empty' as const}]), ...altProblems([media])];
}

export const BLOCK_SCHEMAS: Readonly<Record<string, BlockSchema>> = Object.fromEntries(schemas.map(schema => [schema.type, schema]));

/** Problems in one block, from its schema (none for blocks without rules). */
export function blockProblems(node: JSONContent): BlockProblem[] {
  return BLOCK_SCHEMAS[node.type ?? '']?.problems?.(node) ?? [];
}

/** Whether a block counts as evidence: an evidence type with nothing essential missing. */
export function isEvidenceBlock(node: JSONContent): boolean {
  if (!BLOCK_SCHEMAS[node.type ?? '']?.evidence) return false;
  return !blockProblems(node).some(problem => problem.kind === 'empty' || problem.kind === 'figures');
}
