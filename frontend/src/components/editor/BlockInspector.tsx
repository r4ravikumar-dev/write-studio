'use client';

import {useState} from 'react';
import type {Editor} from '@tiptap/react';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {Grid} from '@astryxdesign/core/Grid';
import {Heading} from '@astryxdesign/core/Heading';
import {Text} from '@astryxdesign/core/Text';
import {TextInput} from '@astryxdesign/core/TextInput';
import {TextArea} from '@astryxdesign/core/TextArea';
import {Selector} from '@astryxdesign/core/Selector';
import {Switch} from '@astryxdesign/core/Switch';
import {Slider} from '@astryxdesign/core/Slider';
import {SegmentedControl, SegmentedControlItem} from '@astryxdesign/core/SegmentedControl';
import {Button} from '@astryxdesign/core/Button';
import {IconButton} from '@astryxdesign/core/IconButton';
import {DropdownMenu} from '@astryxdesign/core/DropdownMenu';
import {Divider} from '@astryxdesign/core/Divider';
import {Icon} from '@astryxdesign/core/Icon';
import {ArrowLeft, ArrowRight, BringToFront, Copy, ImageUp, Plus, SendToBack, Trash2} from 'lucide-react';
import type {Node as PMNode} from '@tiptap/pm/model';
import {
  COMPARISON_LABELS,
  DEVICE_LABELS,
  FOCUS_POINTS,
  GAPS,
  RATIOS,
  SURFACES,
  devicePreset,
  newDevice,
  type ComparisonConfig,
  type Device,
  type DeviceMockupConfig,
  type DevicePreset,
  type DeviceType,
  type ImageGridConfig,
  type MetricsConfig,
  type QuoteConfig,
  type ShowcaseConfig,
  type SplitConfig,
} from '@/lib/caseStudies/blocks';
import type {MediaRef} from '@studio/shared';
import {studioMediaUrl} from '@studio/shared';
import {blockLabel, deleteBlock, duplicateBlock, mediaFromAsset, setBlockAttrs} from './blockOps';
import {useMedia} from './MediaLibrary';
import type {MediaKind} from './upload';
import {EYEBROW_STYLE} from '@/theme/eyebrow';

type Props<T> = {config: T; onChange: (next: T) => void};

function Section({title, children}: {title: string; children: React.ReactNode}) {
  return (
    <VStack gap={4}>
      <Text type="supporting" style={EYEBROW_STYLE}>
        {title}
      </Text>
      {children}
    </VStack>
  );
}

/** A media field: thumbnail, choose/replace, and alt text for images. */
function MediaField({
  label,
  media,
  kinds = ['image'],
  onChange,
}: {
  label: string;
  media: MediaRef | null;
  kinds?: MediaKind[];
  onChange: (media: MediaRef | null) => void;
}) {
  const picker = useMedia();
  const choose = async () => {
    const asset = await picker.pick(kinds);
    if (asset) onChange(mediaFromAsset(asset, media));
  };
  return (
    <VStack gap={2}>
      <Text type="supporting" color="secondary">
        {label}
      </Text>
      {media && media.kind === 'image' && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={studioMediaUrl(media.path)} alt="" className="inspector-thumb" />
      )}
      <HStack gap={2}>
        <Button
          label={media ? 'Replace' : 'Choose'}
          size="sm"
          variant="secondary"
          onClick={choose}
          icon={<Icon icon={ImageUp} size="sm" color="inherit" />}
        />
        {media && <Button label="Remove" size="sm" variant="destructive" onClick={() => onChange(null)} />}
      </HStack>
      {media && (
        <TextInput
          label="Alt text"
          description={media.kind === 'image' ? 'Describe what the image shows, for people who can’t see it.' : 'Describe what happens in the video, for people who can’t see it.'}
          value={media.alt}
          onChange={alt => onChange({...media, alt})}
          size="sm"
          width="100%"
        />
      )}
    </VStack>
  );
}

const ratioSelector = (value: string, onChange: (value: string) => void, label = 'Aspect ratio') => (
  <Selector label={label} options={RATIOS} value={value} onChange={onChange} size="sm" />
);

// ----------------------------------------------------------------------------
function ImageGridInspector({config, onChange}: Props<ImageGridConfig>) {
  const picker = useMedia();
  const move = (index: number, by: number) => {
    const items = [...config.items];
    const [item] = items.splice(index, 1);
    items.splice(index + by, 0, item);
    onChange({...config, items});
  };
  return (
    <VStack gap={6}>
      <Section title="Layout">
        <SegmentedControl label="Columns" value={String(config.columns)} onChange={value => onChange({...config, columns: Number(value) as 2 | 3 | 4})} size="sm" layout="fill">
          <SegmentedControlItem value="2" label="2 columns" />
          <SegmentedControlItem value="3" label="3" />
          <SegmentedControlItem value="4" label="4" />
        </SegmentedControl>
        <Selector
          label="Arrangement"
          options={[
            {value: 'even', label: 'Even', description: 'Equal cells'},
            {value: 'asymmetric', label: 'Asymmetric', description: 'The first image takes a double cell'},
            {value: 'masonry', label: 'Masonry', description: 'Natural heights, staggered'},
          ]}
          value={config.arrangement}
          onChange={value => onChange({...config, arrangement: value as ImageGridConfig['arrangement']})}
          size="sm"
        />
        {config.arrangement !== 'masonry' && ratioSelector(config.ratio, value => onChange({...config, ratio: value as ImageGridConfig['ratio']}))}
        <Selector label="Gap" options={GAPS} value={config.gap} onChange={value => onChange({...config, gap: value as ImageGridConfig['gap']})} size="sm" />
      </Section>
      <Divider />
      <Section title={`Images (${config.items.length})`}>
        {config.items.map((item, index) => (
          <VStack key={`${item.path}-${index}`} gap={2} className="inspector-item">
            <HStack gap={2} vAlign="center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={studioMediaUrl(item.path)} alt="" className="inspector-thumb-sm" />
              <Text type="supporting" style={{flex: 1}}>
                Image {index + 1}
              </Text>
              <IconButton label={`Move image ${index + 1} earlier`} size="sm" variant="ghost" isDisabled={index === 0} onClick={() => move(index, -1)} icon={<Icon icon={ArrowLeft} size="sm" color="inherit" />} />
              <IconButton label={`Move image ${index + 1} later`} size="sm" variant="ghost" isDisabled={index === config.items.length - 1} onClick={() => move(index, 1)} icon={<Icon icon={ArrowRight} size="sm" color="inherit" />} />
              <IconButton label={`Remove image ${index + 1}`} size="sm" variant="destructive" onClick={() => onChange({...config, items: config.items.filter((_, i) => i !== index)})} icon={<Icon icon={Trash2} size="sm" color="inherit" />} />
            </HStack>
            <TextInput
              label={`Alt text for image ${index + 1}`}
              isLabelHidden
              description="Describe what the image shows, for people who can’t see it."
              value={item.alt}
              onChange={alt => onChange({...config, items: config.items.map((it, i) => (i === index ? {...it, alt} : it))})}
              size="sm"
              width="100%"
            />
          </VStack>
        ))}
        <Button
          label="Add image"
          size="sm"
          variant="secondary"
          icon={<Icon icon={Plus} size="sm" color="inherit" />}
          onClick={async () => {
            const asset = await picker.pick('image');
            if (asset) onChange({...config, items: [...config.items, mediaFromAsset(asset)]});
          }}
        />
      </Section>
      <TextInput label="Caption" value={config.caption} onChange={caption => onChange({...config, caption})} size="sm" width="100%" />
    </VStack>
  );
}

// ----------------------------------------------------------------------------
function ComparisonInspector({config, onChange}: Props<ComparisonConfig>) {
  const side = (key: 'left' | 'right', title: string) => (
    <Section title={title}>
      <MediaField label="Picture" media={config[key].media} kinds={['image', 'video']} onChange={media => onChange({...config, [key]: {...config[key], media}})} />
      <TextInput label="Label" value={config[key].label} onChange={label => onChange({...config, [key]: {...config[key], label}})} size="sm" width="100%" />
      <TextArea label="Explanation" value={config[key].text} onChange={text => onChange({...config, [key]: {...config[key], text}})} rows={3} width="100%" />
    </Section>
  );
  return (
    <VStack gap={6}>
      <Section title="Layout">
        <Selector
          label="Kind"
          options={[
            {value: 'before-after', label: 'Before / After'},
            {value: 'old-new', label: 'Old flow / New flow'},
            {value: 'custom', label: 'Custom labels'},
          ]}
          value={config.mode}
          onChange={value => {
            const mode = value as ComparisonConfig['mode'];
            const [left, right] = COMPARISON_LABELS[mode];
            onChange({
              ...config,
              mode,
              left: {...config.left, label: mode === 'custom' ? config.left.label : left},
              right: {...config.right, label: mode === 'custom' ? config.right.label : right},
            });
          }}
          size="sm"
        />
        <SegmentedControl label="Proportion" value={config.split} onChange={value => onChange({...config, split: value as ComparisonConfig['split']})} size="sm" layout="fill">
          <SegmentedControlItem value="50-50" label="50 / 50" />
          <SegmentedControlItem value="60-40" label="60 / 40" />
          <SegmentedControlItem value="40-60" label="40 / 60" />
        </SegmentedControl>
        {ratioSelector(config.ratio, value => onChange({...config, ratio: value as ComparisonConfig['ratio']}))}
      </Section>
      <Divider />
      {side('left', 'Left side')}
      <Divider />
      {side('right', 'Right side')}
      <TextInput label="Caption" value={config.caption} onChange={caption => onChange({...config, caption})} size="sm" width="100%" />
    </VStack>
  );
}

// ----------------------------------------------------------------------------
function ShowcaseInspector({config, onChange}: Props<ShowcaseConfig>) {
  return (
    <VStack gap={6}>
      <MediaField label="Image or video" media={config.media} kinds={['image', 'video']} onChange={media => onChange({...config, media})} />
      <Section title="Presentation">
        <SegmentedControl
          label="Width"
          value={config.width === 'frame' || config.width === 'wide' ? 'frame' : 'content'}
          onChange={value => onChange({...config, width: value as ShowcaseConfig['width']})}
          size="sm"
          layout="fill">
          <SegmentedControlItem value="content" label="Content width" />
          <SegmentedControlItem value="frame" label="Page frame" />
        </SegmentedControl>
        {ratioSelector(config.ratio, value => onChange({...config, ratio: value as ShowcaseConfig['ratio']}))}
        <Selector label="Keep in view" options={FOCUS_POINTS} value={config.focus} onChange={focus => onChange({...config, focus})} size="sm" />
        <Selector label="Background surface" options={SURFACES} value={config.surface} onChange={value => onChange({...config, surface: value as ShowcaseConfig['surface']})} size="sm" />
        {config.surface !== 'none' && (
          <Selector label="Space around" options={GAPS} value={config.inset} onChange={value => onChange({...config, inset: value as ShowcaseConfig['inset']})} size="sm" />
        )}
      </Section>
      <TextInput label="Caption" value={config.caption} onChange={caption => onChange({...config, caption})} size="sm" width="100%" />
    </VStack>
  );
}

// ----------------------------------------------------------------------------
function DeviceInspector({config, onChange}: Props<DeviceMockupConfig>) {
  const [selectedId, setSelectedId] = useState(config.devices[0]?.id ?? '');
  const selected = config.devices.find(d => d.id === selectedId) ?? config.devices[0];
  const update = (patch: Partial<Device>) =>
    onChange({
      ...config,
      preset: 'custom',
      devices: config.devices.map(d => (d.id === selected?.id ? {...d, ...patch} : d)),
    });
  const maxZ = Math.max(0, ...config.devices.map(d => d.z));
  const minZ = Math.min(0, ...config.devices.map(d => d.z));

  return (
    <VStack gap={6}>
      <Section title="Composition">
        <Selector
          label="Preset"
          options={[
            {value: 'single', label: 'Single device'},
            {value: 'dual-overlap', label: 'Dual overlap'},
            {value: 'triple-stack', label: 'Triple stack'},
            {value: 'multi-device', label: 'Laptop, tablet and phone'},
            {value: 'custom', label: 'Custom', description: 'Your own arrangement'},
          ]}
          value={config.preset}
          onChange={value => {
            const preset = value as DevicePreset;
            const devices = devicePreset(preset, config.devices);
            setSelectedId(devices[0]?.id ?? '');
            onChange({...config, preset, devices});
          }}
          size="sm"
        />
        {ratioSelector(config.stageRatio, value => onChange({...config, stageRatio: value as DeviceMockupConfig['stageRatio']}), 'Stage shape')}
        <SegmentedControl label="Spacing" value={config.spacing} onChange={value => onChange({...config, spacing: value as DeviceMockupConfig['spacing']})} size="sm" layout="fill">
          <SegmentedControlItem value="tight" label="Tight" />
          <SegmentedControlItem value="normal" label="Normal" />
          <SegmentedControlItem value="loose" label="Loose" />
        </SegmentedControl>
        <Selector label="Background surface" options={SURFACES} value={config.surface} onChange={value => onChange({...config, surface: value as DeviceMockupConfig['surface']})} size="sm" />
        <Switch label="Shadows" value={config.shadow} onChange={shadow => onChange({...config, shadow})} size="sm" />
        <Selector
          label="On phones"
          options={[
            {value: 'composition', label: 'Keep the composition', description: 'Scaled down as arranged'},
            {value: 'stack', label: 'One after another', description: 'Devices stack vertically'},
            {value: 'first', label: 'First device only'},
          ]}
          value={config.mobile}
          onChange={value => onChange({...config, mobile: value as DeviceMockupConfig['mobile']})}
          size="sm"
        />
      </Section>
      <Divider />
      <Section title="Devices">
        <HStack gap={2} wrap="wrap">
          {config.devices.map((d, index) => (
            <Button
              key={d.id}
              label={`${index + 1}. ${DEVICE_LABELS[d.type]}`}
              size="sm"
              variant={d.id === selected?.id ? 'secondary' : 'ghost'}
              onClick={() => setSelectedId(d.id)}
            />
          ))}
          <DropdownMenu
            button={{label: 'Add device', size: 'sm', variant: 'ghost', icon: <Icon icon={Plus} size="sm" color="inherit" />}}
            items={(Object.keys(DEVICE_LABELS) as DeviceType[]).map(type => ({
              label: DEVICE_LABELS[type],
              onClick: () => {
                const added = newDevice(type, maxZ + 1);
                setSelectedId(added.id);
                onChange({...config, preset: 'custom', devices: [...config.devices, added]});
              },
            }))}
          />
        </HStack>
        {selected && (
          <VStack gap={4} className="inspector-item">
            <Selector
              label="Device"
              options={(Object.keys(DEVICE_LABELS) as DeviceType[]).map(type => ({value: type, label: DEVICE_LABELS[type]}))}
              value={selected.type}
              onChange={value => update({type: value as DeviceType})}
              size="sm"
            />
            <MediaField label="Screen" media={selected.media} kinds={['image', 'video']} onChange={media => update({media})} />
            <Slider label="Left to right" min={0} max={100} value={selected.x} onChange={(x: number) => update({x})} formatValue={v => `${v}%`} />
            <Slider label="Top to bottom" min={0} max={100} value={selected.y} onChange={(y: number) => update({y})} formatValue={v => `${v}%`} />
            <Slider label="Size" min={40} max={160} value={Math.round(selected.scale * 100)} onChange={(v: number) => update({scale: v / 100})} formatValue={v => `${v}%`} />
            <Slider label="Rotation" min={-30} max={30} value={selected.rotate} onChange={(rotate: number) => update({rotate})} formatValue={v => `${v}°`} />
            <HStack gap={2} wrap="wrap">
              <Button label="Bring to front" size="sm" variant="ghost" onClick={() => update({z: maxZ + 1})} icon={<Icon icon={BringToFront} size="sm" color="inherit" />} />
              <Button label="Send to back" size="sm" variant="ghost" onClick={() => update({z: minZ - 1})} icon={<Icon icon={SendToBack} size="sm" color="inherit" />} />
              <Button
                label="Remove device"
                size="sm"
                variant="destructive"
                isDisabled={config.devices.length === 1}
                onClick={() => {
                  const devices = config.devices.filter(d => d.id !== selected.id);
                  setSelectedId(devices[0]?.id ?? '');
                  onChange({...config, preset: 'custom', devices});
                }}
                icon={<Icon icon={Trash2} size="sm" color="inherit" />}
              />
            </HStack>
          </VStack>
        )}
      </Section>
      <TextInput label="Caption" value={config.caption} onChange={caption => onChange({...config, caption})} size="sm" width="100%" />
    </VStack>
  );
}

// ----------------------------------------------------------------------------
function SplitInspector({config, onChange}: Props<SplitConfig>) {
  return (
    <VStack gap={6}>
      <MediaField label="Image or video" media={config.media} kinds={['image', 'video']} onChange={media => onChange({...config, media})} />
      <Section title="Layout">
        <SegmentedControl label="Order" value={config.order} onChange={value => onChange({...config, order: value as SplitConfig['order']})} size="sm" layout="fill">
          <SegmentedControlItem value="media-text" label="Picture, text" />
          <SegmentedControlItem value="text-media" label="Text, picture" />
        </SegmentedControl>
        <Selector
          label="Proportion"
          options={[
            {value: '50-50', label: 'Half and half'},
            {value: '60-40', label: 'Picture larger (60 / 40)'},
            {value: '40-60', label: 'Text larger (40 / 60)'},
            {value: '67-33', label: 'Picture two-thirds'},
            {value: '33-67', label: 'Text two-thirds'},
          ]}
          value={config.proportion}
          onChange={value => onChange({...config, proportion: value as SplitConfig['proportion']})}
          size="sm"
        />
        <SegmentedControl label="Text alignment" value={config.align} onChange={value => onChange({...config, align: value as SplitConfig['align']})} size="sm" layout="fill">
          <SegmentedControlItem value="start" label="Top" />
          <SegmentedControlItem value="center" label="Middle" />
          <SegmentedControlItem value="end" label="Bottom" />
        </SegmentedControl>
        {ratioSelector(config.ratio, value => onChange({...config, ratio: value as SplitConfig['ratio']}))}
        <Text type="supporting" color="secondary">
          On phones the picture always comes first, then the text.
        </Text>
      </Section>
    </VStack>
  );
}

function QuoteInspector({config, onChange}: Props<QuoteConfig>) {
  return (
    <VStack gap={4}>
      <Selector
        label="Style"
        options={[
          {value: 'serif', label: 'Serif, italic', description: 'The accent face'},
          {value: 'large', label: 'Large statement'},
          {value: 'bordered', label: 'With a brand rule'},
        ]}
        value={config.style}
        onChange={value => onChange({...config, style: value as QuoteConfig['style']})}
        size="sm"
      />
      <TextInput label="Who said it" value={config.attribution} onChange={attribution => onChange({...config, attribution})} size="sm" width="100%" />
      <TextInput label="Their role" value={config.role} onChange={role => onChange({...config, role})} size="sm" width="100%" />
    </VStack>
  );
}

function MetricsInspector({config, onChange}: Props<MetricsConfig>) {
  const setItem = (index: number, patch: Partial<MetricsConfig['items'][number]>) =>
    onChange({...config, items: config.items.map((item, i) => (i === index ? {...item, ...patch} : item))});
  return (
    <VStack gap={6}>
      <Section title="Presentation">
        <Selector
          label="Style"
          options={[
            {value: 'plain', label: 'Plain figures'},
            {value: 'cards', label: 'Cards'},
            {value: 'brand', label: 'Brand blue'},
          ]}
          value={config.style}
          onChange={value => onChange({...config, style: value as MetricsConfig['style']})}
          size="sm"
        />
        <SegmentedControl label="Columns" value={String(config.columns)} onChange={value => onChange({...config, columns: Number(value) as 2 | 3 | 4})} size="sm" layout="fill">
          <SegmentedControlItem value="2" label="2 columns" />
          <SegmentedControlItem value="3" label="3" />
          <SegmentedControlItem value="4" label="4" />
        </SegmentedControl>
      </Section>
      <Divider />
      <Section title="Figures">
        {config.items.map((item, index) => (
          <VStack key={index} gap={2} className="inspector-item">
            <Grid columns={2} gap={2}>
              <TextInput label="Figure" value={item.value} onChange={value => setItem(index, {value})} size="sm" width="100%" />
              <TextInput label="Label" value={item.label} onChange={label => setItem(index, {label})} size="sm" width="100%" />
            </Grid>
            <TextInput label="Detail (optional)" value={item.detail} onChange={detail => setItem(index, {detail})} size="sm" width="100%" />
            <HStack hAlign="end">
              <Button label="Remove" size="sm" variant="destructive" onClick={() => onChange({...config, items: config.items.filter((_, i) => i !== index)})} />
            </HStack>
          </VStack>
        ))}
        <Button
          label="Add figure"
          size="sm"
          variant="secondary"
          icon={<Icon icon={Plus} size="sm" color="inherit" />}
          onClick={() => onChange({...config, items: [...config.items, {value: '', label: '', detail: ''}]})}
        />
      </Section>
      <TextInput label="Caption" value={config.caption} onChange={caption => onChange({...config, caption})} size="sm" width="100%" />
    </VStack>
  );
}

// ----------------------------------------------------------------------------
/**
 * The side panel's Block tab: the selected block's name, its actions, and
 * its properties. Every change writes straight into the document.
 */
export function BlockInspector({editor, block}: {editor: Editor; block: {name: string; pos: number; node: PMNode}}) {
  const {name, pos, node} = block;
  const setConfig = (config: unknown) => setBlockAttrs(editor, pos, {config});
  const config = node.attrs.config;

  let body: React.ReactNode = null;
  switch (name) {
    case 'imageGrid':
      body = <ImageGridInspector config={config} onChange={setConfig} />;
      break;
    case 'comparison':
      body = <ComparisonInspector config={config} onChange={setConfig} />;
      break;
    case 'showcase':
      body = <ShowcaseInspector config={config} onChange={setConfig} />;
      break;
    case 'deviceMockup':
      body = <DeviceInspector key={pos} config={config} onChange={setConfig} />;
      break;
    case 'splitLayout':
      body = <SplitInspector config={config} onChange={setConfig} />;
      break;
    case 'pullQuote':
      body = <QuoteInspector config={config} onChange={setConfig} />;
      break;
    case 'metrics':
      body = <MetricsInspector config={config} onChange={setConfig} />;
      break;
    case 'callout':
      body = (
        <VStack gap={4}>
          <Selector
            label="Tone"
            options={[
              {value: 'brand', label: 'Brand blue'},
              {value: 'neutral', label: 'Neutral'},
              {value: 'success', label: 'Positive'},
              {value: 'warning', label: 'Caution'},
            ]}
            value={node.attrs.tone}
            onChange={tone => setBlockAttrs(editor, pos, {tone})}
            size="sm"
          />
          <Selector
            label="Icon"
            options={[
              {value: 'lightbulb', label: 'Insight'},
              {value: 'info', label: 'Information'},
              {value: 'alert', label: 'Warning'},
              {value: 'check', label: 'Done'},
              {value: 'star', label: 'Highlight'},
              {value: 'none', label: 'No icon'},
            ]}
            value={node.attrs.icon}
            onChange={icon => setBlockAttrs(editor, pos, {icon})}
            size="sm"
          />
        </VStack>
      );
      break;
    case 'image':
      body = (
        <VStack gap={4}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={studioMediaUrl(node.attrs.src)} alt="" className="inspector-thumb" />
          <TextInput
            label="Alt text"
            description="Describe it for screen readers. Recommended for accessibility."
            value={node.attrs.alt ?? ''}
            onChange={alt => setBlockAttrs(editor, pos, {alt})}
            size="sm"
            width="100%"
          />
          <TextInput
            label="Caption"
            value={node.attrs.title ?? ''}
            onChange={title => setBlockAttrs(editor, pos, {title})}
            size="sm"
            width="100%"
          />
        </VStack>
      );
      break;
  }

  return (
    <VStack gap={6}>
      <HStack justify="between" vAlign="center" gap={2}>
        <Heading level={2} style={{fontSize: 'var(--type-headline-s-size)'}}>
          {blockLabel(name)}
        </Heading>
        <HStack gap={1}>
          <IconButton label="Duplicate block" tooltip="Duplicate" size="sm" variant="ghost" onClick={() => duplicateBlock(editor, pos)} icon={<Icon icon={Copy} size="sm" color="inherit" />} />
          <IconButton label="Delete block" tooltip="Delete" size="sm" variant="destructive" onClick={() => deleteBlock(editor, pos)} icon={<Icon icon={Trash2} size="sm" color="inherit" />} />
        </HStack>
      </HStack>
      {body}
      <Text type="supporting" color="secondary">
        Drag a block by its handle, or use the arrows on its bar, to reorder it.
      </Text>
    </VStack>
  );
}
