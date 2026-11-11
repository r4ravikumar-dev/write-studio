'use client';

import {useEffect} from 'react';
import {NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps} from '@tiptap/react';
import {Switch} from '@astryxdesign/core/Switch';
import {TextInput} from '@astryxdesign/core/TextInput';
import {
  Callout,
  ComparisonNode,
  DeviceMockupNode,
  Embed,
  FileAttachment,
  ImageGridNode,
  MetricsNode,
  PullQuoteNode,
  ShowcaseNode,
  SplitLayoutNode,
  VideoFile,
  TimelineNode,
  ScreenSequenceNode,
  AnnotatedImageNode,
  FlowDiagramNode,
  ResearchInsightsNode,
  ChartNode,
} from '@/components/caseStudy/schema';
import {EmbedBlock, FileBlock, VideoBlock} from '@/components/caseStudy/blocks';
import {
  Callout as CalloutBlock,
  Comparison,
  DeviceMockup,
  ImageGrid,
  Metrics,
  PullQuote,
  Showcase,
  SplitLayout,
  Timeline,
  ScreenSequence,
  AnnotatedImage,
  FlowDiagram,
  ResearchInsights,
  Chart,
  type EditHooks,
} from '@/components/caseStudy/visualBlocks';
import type {
  ComparisonConfig,
  DeviceMockupConfig,
  ImageGridConfig,
  ShowcaseConfig,
  SplitConfig,
  ScreenSequenceConfig,
  AnnotatedImageConfig,
} from '@/lib/caseStudies/blocks';
import {newAnnotation} from '@/lib/caseStudies/blocks';
import {fileKind} from '@/lib/caseStudies/embeds';
import type {StudioAsset as Asset} from '@studio/shared';
import {studioMediaUrl} from '@studio/shared';
import {mediaFromAsset, selectBlock} from './blockOps';
import {setSelectedDevices, useDeviceSelection} from './devices/selection';
import {duplicateDevices, groupDevices, lockDevices, nudgeDevices, removeDevices, reorderDevices, ungroupDevices, withGroups} from './devices/arrange';
import {useMedia} from './MediaLibrary';

/**
 * Each block in the editor: its live preview (the same component the site renders). Moving,
 * duplicating, deleting and Properties are on the universal block handle (editor spec §7, D5).
 * Pictures in a preview can be clicked to choose or replace them.
 */
function BlockFrame({
  props,
  children,
  isContent = false,
}: {
  props: ReactNodeViewProps;
  children: React.ReactNode;
  /** Blocks with editable text inside (split layout, quote, callout). */
  isContent?: boolean;
}) {
  const {selected} = props;
  return (
    <NodeViewWrapper className="write-block" data-selected={selected || undefined} data-content={isContent || undefined}>
      {children}
    </NodeViewWrapper>
  );
}

/** Edit hooks for a block: picking media for a slot updates the block's config. */
function useEditHooks<T>(props: ReactNodeViewProps, apply: (config: T, slot: string, asset: Asset) => T): EditHooks {
  const media = useMedia();
  return {
    pickMedia: async (slot, kind = 'image') => {
      const asset = await media.pick(kind === 'any' ? ['image', 'video'] : kind);
      if (!asset) return;
      const config = props.node.attrs.config as T;
      props.updateAttributes({config: apply(config, slot, asset)});
    },
  };
}

function ImageGridView(props: ReactNodeViewProps) {
  const config = props.node.attrs.config as ImageGridConfig;
  const edit = useEditHooks<ImageGridConfig>(props, (current, slot, asset) => {
    const items = [...current.items];
    if (slot === 'add') items.push(mediaFromAsset(asset));
    else {
      const index = Number(slot.split(':')[1]);
      items[index] = mediaFromAsset(asset, items[index]);
    }
    return {...current, items};
  });
  return (
    <BlockFrame props={props}>
      <ImageGrid config={config} edit={edit} />
    </BlockFrame>
  );
}

function ComparisonView(props: ReactNodeViewProps) {
  const config = props.node.attrs.config as ComparisonConfig;
  const edit = useEditHooks<ComparisonConfig>(props, (current, slot, asset) => {
    const side = slot === 'left' ? 'left' : 'right';
    return {...current, [side]: {...current[side], media: mediaFromAsset(asset, current[side].media)}};
  });
  return (
    <BlockFrame props={props}>
      <Comparison config={config} edit={edit} />
    </BlockFrame>
  );
}

function ShowcaseView(props: ReactNodeViewProps) {
  const config = props.node.attrs.config as ShowcaseConfig;
  const edit = useEditHooks<ShowcaseConfig>(props, (current, _slot, asset) => ({
    ...current,
    media: mediaFromAsset(asset, current.media),
  }));
  return (
    <BlockFrame props={props}>
      <Showcase config={config} edit={edit} />
    </BlockFrame>
  );
}

function DeviceMockupView(props: ReactNodeViewProps) {
  const config = props.node.attrs.config as DeviceMockupConfig;
  const edit = useEditHooks<DeviceMockupConfig>(props, (current, slot, asset) => {
    const id = slot.split(':')[1];
    return {
      ...current,
      devices: current.devices.map(d => (d.id === id ? {...d, media: mediaFromAsset(asset, d.media)} : d)),
    };
  });
  const {ids: allSelected, snap} = useDeviceSelection();
  const selected = allSelected.filter(id => config.devices.some(device => device.id === id));
  useDeviceKeys(props, config, selected);
  return (
    <BlockFrame props={props}>
      <DeviceMockup
        config={config}
        edit={edit}
        selectedIds={selected}
        snap={snap}
        onSelectDevice={(id, additive) => {
          const group = withGroups(config, [id]);
          const next = additive
            ? selected.includes(id)
              ? selected.filter(item => !group.includes(item))
              : [...selected, ...group.filter(item => !selected.includes(item))]
            : selected.includes(id)
              ? selected
              : group;
          setSelectedDevices(next);
          // Selecting a device selects the block, so its properties show in the side panel.
          const pos = props.getPos();
          if (typeof pos === 'number' && (!props.selected || !props.editor.view.hasFocus())) selectBlock(props.editor, pos);
          return next;
        }}
        onMoveDevices={moves =>
          props.updateAttributes({config: {...config, preset: 'custom', devices: config.devices.map(d => (moves[d.id] ? {...d, ...moves[d.id]} : d))}})
        }
        onRotateDevice={(id, rotate) => props.updateAttributes({config: {...config, preset: 'custom', devices: config.devices.map(d => (d.id === id ? {...d, rotate} : d))}})}
      />
    </BlockFrame>
  );
}

/**
 * Composition shortcuts (editor spec §11.2, §13) while this block is selected and has devices
 * selected: arrows nudge (Shift: 5 %), ⌘] / ⌘[ forward / backward, ⌥⌘] / ⌥⌘[ front / back,
 * ⌘G / ⇧⌘G group / ungroup, ⇧⌘L lock, ⌘D duplicate, Delete removes, Esc deselects.
 */
function useDeviceKeys(props: ReactNodeViewProps, config: DeviceMockupConfig, selected: readonly string[]) {
  const {selected: isBlockSelected, updateAttributes, editor} = props;
  useEffect(() => {
    if (!isBlockSelected || !selected.length || !editor.isEditable) return;
    const onKey = (event: KeyboardEvent) => {
      // Only when the document has focus (not a field in the side panel).
      if (!editor.view.hasFocus()) return;
      const mod = event.metaKey || event.ctrlKey;
      const key = event.key;
      const step = event.shiftKey ? 5 : 1;
      let next: DeviceMockupConfig | null = null;
      let selection: readonly string[] = selected;
      if (!mod && key === 'ArrowLeft') next = nudgeDevices(config, selected, -step, 0);
      else if (!mod && key === 'ArrowRight') next = nudgeDevices(config, selected, step, 0);
      else if (!mod && key === 'ArrowUp') next = nudgeDevices(config, selected, 0, -step);
      else if (!mod && key === 'ArrowDown') next = nudgeDevices(config, selected, 0, step);
      else if (mod && (event.code === 'BracketRight' || key === ']')) next = reorderDevices(config, selected, event.altKey ? 'front' : 'forward');
      else if (mod && (event.code === 'BracketLeft' || key === '[')) next = reorderDevices(config, selected, event.altKey ? 'back' : 'backward');
      else if (mod && event.code === 'KeyG') next = event.shiftKey ? ungroupDevices(config, selected) : groupDevices(config, selected);
      else if (mod && event.shiftKey && event.code === 'KeyL') next = lockDevices(config, selected, !config.devices.filter(d => selected.includes(d.id)).every(d => d.locked));
      else if (mod && event.code === 'KeyD') {
        const copy = duplicateDevices(config, selected);
        next = copy.config;
        selection = copy.ids;
      } else if (!mod && (key === 'Delete' || key === 'Backspace') && selected.length < config.devices.length) {
        next = removeDevices(config, selected);
        selection = [];
      } else if (key === 'Escape') selection = [];
      else return;
      event.preventDefault();
      event.stopPropagation();
      if (next && next !== config) updateAttributes({config: next});
      setSelectedDevices(selection);
    };
    // Capture: before the editor's own shortcuts (⌘D duplicates the block, arrows move the cursor).
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [isBlockSelected, selected, config, updateAttributes, editor]);
}

function MetricsView(props: ReactNodeViewProps) {
  return (
    <BlockFrame props={props}>
      <Metrics config={props.node.attrs.config} isEditing />
    </BlockFrame>
  );
}

function SplitLayoutView(props: ReactNodeViewProps) {
  const config = props.node.attrs.config as SplitConfig;
  const edit = useEditHooks<SplitConfig>(props, (current, _slot, asset) => ({
    ...current,
    media: mediaFromAsset(asset, current.media),
  }));
  return (
    <BlockFrame props={props} isContent>
      <SplitLayout config={config} edit={edit}>
        <NodeViewContent className="write-block-content" />
      </SplitLayout>
    </BlockFrame>
  );
}

function PullQuoteView(props: ReactNodeViewProps) {
  return (
    <BlockFrame props={props} isContent>
      <PullQuote config={props.node.attrs.config}>
        <NodeViewContent className="write-block-content" />
      </PullQuote>
    </BlockFrame>
  );
}

function CalloutView(props: ReactNodeViewProps) {
  return (
    <BlockFrame props={props} isContent>
      <CalloutBlock tone={props.node.attrs.tone} icon={props.node.attrs.icon}>
        <NodeViewContent className="write-block-content" />
      </CalloutBlock>
    </BlockFrame>
  );
}

// ----------------------------------------------------------------------------
// Insert 2.0 blocks
// ----------------------------------------------------------------------------
function TimelineView(props: ReactNodeViewProps) {
  return (
    <BlockFrame props={props}>
      <Timeline config={props.node.attrs.config} isEditing />
    </BlockFrame>
  );
}

function ScreenSequenceView(props: ReactNodeViewProps) {
  const config = props.node.attrs.config as ScreenSequenceConfig;
  const edit = useEditHooks<ScreenSequenceConfig>(props, (current, slot, asset) => {
    const id = slot.split(':')[1];
    return {...current, steps: current.steps.map(step => (step.id === id ? {...step, media: mediaFromAsset(asset, step.media)} : step))};
  });
  return (
    <BlockFrame props={props}>
      <ScreenSequence config={config} edit={edit} />
    </BlockFrame>
  );
}

function AnnotatedImageView(props: ReactNodeViewProps) {
  const config = props.node.attrs.config as AnnotatedImageConfig;
  const edit = useEditHooks<AnnotatedImageConfig>(props, (current, _slot, asset) => ({...current, media: mediaFromAsset(asset, current.media)}));
  return (
    <BlockFrame props={props}>
      <AnnotatedImage
        config={config}
        edit={edit}
        onAddAnnotation={(x, y) => {
          props.updateAttributes({config: {...config, annotations: [...config.annotations, newAnnotation(x, y)]}});
          // Open its properties so the note can be written straight away.
          const pos = props.getPos();
          if (typeof pos === 'number') selectBlock(props.editor, pos);
        }}
      />
    </BlockFrame>
  );
}

function FlowDiagramView(props: ReactNodeViewProps) {
  return (
    <BlockFrame props={props}>
      <FlowDiagram config={props.node.attrs.config} />
    </BlockFrame>
  );
}

function ResearchInsightsView(props: ReactNodeViewProps) {
  return (
    <BlockFrame props={props}>
      <ResearchInsights config={props.node.attrs.config} isEditing />
    </BlockFrame>
  );
}

function ChartView(props: ReactNodeViewProps) {
  return (
    <BlockFrame props={props}>
      <Chart config={props.node.attrs.config} isEditing />
    </BlockFrame>
  );
}

// ----------------------------------------------------------------------------
// Files, uploaded video and embeds
// ----------------------------------------------------------------------------
function CaptionInput({value, onChange}: {value: string; onChange: (value: string) => void}) {
  return <TextInput label="Caption" isLabelHidden placeholder="Caption (optional)" value={value} onChange={onChange} size="sm" width="100%" />;
}

function FileView(props: ReactNodeViewProps) {
  const {src, name, size, mime, preview} = props.node.attrs as {src: string; name: string; size: number; mime: string; preview: boolean};
  return (
    <BlockFrame props={props}>
      <FileBlock src={studioMediaUrl(src)} name={name} size={size} mime={mime} preview={preview} />
      {/* Only PDFs preview inline: Office viewers would need a public link, and these files are private. */}
      {fileKind(mime, name) === 'pdf' && (
        <Switch label="Show a preview on the page" size="sm" value={preview} onChange={checked => props.updateAttributes({preview: checked})} />
      )}
    </BlockFrame>
  );
}

function VideoView(props: ReactNodeViewProps) {
  const {src, caption} = props.node.attrs as {src: string; caption: string};
  return (
    <BlockFrame props={props}>
      <VideoBlock src={studioMediaUrl(src)} />
      <CaptionInput value={caption} onChange={value => props.updateAttributes({caption: value})} />
    </BlockFrame>
  );
}

function EmbedView(props: ReactNodeViewProps) {
  const {src, caption} = props.node.attrs as {src: string; caption: string};
  return (
    <BlockFrame props={props}>
      <EmbedBlock src={src} />
      <CaptionInput value={caption} onChange={value => props.updateAttributes({caption: value})} />
    </BlockFrame>
  );
}

/** The schema's rich nodes, with their editing views. */
export const editorNodes = [
  FileAttachment.extend({addNodeView: () => ReactNodeViewRenderer(FileView)}),
  VideoFile.extend({addNodeView: () => ReactNodeViewRenderer(VideoView)}),
  Embed.extend({addNodeView: () => ReactNodeViewRenderer(EmbedView)}),
  Callout.extend({addNodeView: () => ReactNodeViewRenderer(CalloutView)}),
  ImageGridNode.extend({addNodeView: () => ReactNodeViewRenderer(ImageGridView)}),
  ComparisonNode.extend({addNodeView: () => ReactNodeViewRenderer(ComparisonView)}),
  ShowcaseNode.extend({addNodeView: () => ReactNodeViewRenderer(ShowcaseView)}),
  DeviceMockupNode.extend({addNodeView: () => ReactNodeViewRenderer(DeviceMockupView)}),
  MetricsNode.extend({addNodeView: () => ReactNodeViewRenderer(MetricsView)}),
  SplitLayoutNode.extend({addNodeView: () => ReactNodeViewRenderer(SplitLayoutView)}),
  PullQuoteNode.extend({addNodeView: () => ReactNodeViewRenderer(PullQuoteView)}),
  TimelineNode.extend({addNodeView: () => ReactNodeViewRenderer(TimelineView)}),
  ScreenSequenceNode.extend({addNodeView: () => ReactNodeViewRenderer(ScreenSequenceView)}),
  AnnotatedImageNode.extend({addNodeView: () => ReactNodeViewRenderer(AnnotatedImageView)}),
  FlowDiagramNode.extend({addNodeView: () => ReactNodeViewRenderer(FlowDiagramView)}),
  ResearchInsightsNode.extend({addNodeView: () => ReactNodeViewRenderer(ResearchInsightsView)}),
  ChartNode.extend({addNodeView: () => ReactNodeViewRenderer(ChartView)}),
];
