import type {ComponentType, ReactNode} from 'react';
import {BLOCK_SCHEMAS} from '@studio/shared';
import {AnnotatedImage, Chart, Comparison, ResearchInsights, DeviceMockup, FlowDiagram, ImageGrid, Metrics, PullQuote, ScreenSequence, Showcase, SplitLayout, Timeline} from './visualBlocks';

/**
 * The visual blocks' renderers (editor spec §10, T5): one per block type, with its configuration
 * merged over the defaults in the shared block schema (so older documents still render). The
 * static preview spreads `visualNodeMapping()` into its node mapping; adding a visual block means
 * a schema entry, a renderer here and an inspector.
 */
type Attrs = Record<string, unknown>;
type RenderProps = {node: {attrs?: Attrs}; children?: ReactNode};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Renderer = ComponentType<{config: any; children: ReactNode}>;

export const VISUAL_RENDERERS: Record<string, Renderer> = {
  imageGrid: ImageGrid,
  comparison: Comparison,
  showcase: Showcase,
  deviceMockup: DeviceMockup,
  metrics: Metrics,
  timeline: Timeline,
  screenSequence: ScreenSequence,
  annotatedImage: AnnotatedImage,
  flowDiagram: FlowDiagram,
  splitLayout: SplitLayout,
  pullQuote: PullQuote,
  researchInsights: ResearchInsights,
  chart: Chart,
};

/** A block's configuration merged over its schema defaults. */
export function configFor(type: string, attrs: Attrs | undefined): object {
  const config = attrs?.config;
  return {...(BLOCK_SCHEMAS[type]?.defaults?.() ?? {}), ...(config && typeof config === 'object' ? config : {})};
}

/** Node mapping entries for every visual block, for the static renderer. */
export function visualNodeMapping() {
  return Object.fromEntries(
    Object.entries(VISUAL_RENDERERS).map(([type, Render]) => {
      const render = ({node, children}: RenderProps) => <Render config={configFor(type, node.attrs)}>{children}</Render>;
      render.displayName = `Render(${type})`;
      return [type, render];
    }),
  );
}
