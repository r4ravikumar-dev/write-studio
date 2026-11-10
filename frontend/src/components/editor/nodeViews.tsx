'use client';

import {NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps} from '@tiptap/react';
import {HStack} from '@astryxdesign/core/Layout';
import {Text} from '@astryxdesign/core/Text';
import {Switch} from '@astryxdesign/core/Switch';
import {TextInput} from '@astryxdesign/core/TextInput';
import {IconButton} from '@astryxdesign/core/IconButton';
import {Icon} from '@astryxdesign/core/Icon';
import {ArrowDown, ArrowUp, Copy, GripVertical, SlidersHorizontal, Trash2} from 'lucide-react';
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
  type EditHooks,
} from '@/components/caseStudy/visualBlocks';
import type {
  ComparisonConfig,
  DeviceMockupConfig,
  ImageGridConfig,
  ShowcaseConfig,
  SplitConfig,
} from '@/lib/caseStudies/blocks';
import {fileKind} from '@/lib/caseStudies/embeds';
import type {StudioAsset as Asset} from '@studio/shared';
import {studioMediaUrl} from '@studio/shared';
import {blockLabel, deleteBlock, duplicateBlock, mediaFromAsset, moveBlock, selectBlock} from './blockOps';
import {useMedia} from './MediaLibrary';
import {EYEBROW_STYLE} from '@/theme/eyebrow';

/**
 * Each block in the editor: its live preview (the same component the site
 * renders), framed by a bar with a drag handle, its name, move up / down,
 * duplicate, delete and "Properties" (which opens its settings in the side
 * panel). Pictures in a preview can be clicked to choose or replace them.
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
  const {editor, getPos, node, selected} = props;
  const at = (run: (pos: number) => void) => () => {
    const pos = getPos();
    if (typeof pos === 'number') run(pos);
  };
  return (
    <NodeViewWrapper className="write-block" data-selected={selected || undefined} data-content={isContent || undefined}>
      <HStack gap={1} vAlign="center" className="write-block-bar">
        <span className="write-block-grip" draggable data-drag-handle aria-hidden>
          <Icon icon={GripVertical} size="sm" color="inherit" />
        </span>
        <Text type="supporting" style={{...EYEBROW_STYLE, color: 'var(--color-text-secondary)', flex: 1}}>
          {blockLabel(node.type.name)}
        </Text>
        <IconButton label="Properties" tooltip="Properties" size="sm" variant="ghost" onClick={at(pos => selectBlock(editor, pos))} icon={<Icon icon={SlidersHorizontal} size="sm" color="inherit" />} />
        <IconButton label="Move up" tooltip="Move up" size="sm" variant="ghost" onClick={at(pos => moveBlock(editor, pos, -1))} icon={<Icon icon={ArrowUp} size="sm" color="inherit" />} />
        <IconButton label="Move down" tooltip="Move down" size="sm" variant="ghost" onClick={at(pos => moveBlock(editor, pos, 1))} icon={<Icon icon={ArrowDown} size="sm" color="inherit" />} />
        <IconButton label="Duplicate" tooltip="Duplicate" size="sm" variant="ghost" onClick={at(pos => duplicateBlock(editor, pos))} icon={<Icon icon={Copy} size="sm" color="inherit" />} />
        <IconButton label="Delete block" tooltip="Delete" size="sm" variant="destructive" onClick={at(pos => deleteBlock(editor, pos))} icon={<Icon icon={Trash2} size="sm" color="inherit" />} />
      </HStack>
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
  return (
    <BlockFrame props={props}>
      <DeviceMockup config={config} edit={edit} />
    </BlockFrame>
  );
}

function MetricsView(props: ReactNodeViewProps) {
  return (
    <BlockFrame props={props}>
      <Metrics config={props.node.attrs.config} />
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
];
