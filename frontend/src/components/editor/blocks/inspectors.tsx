'use client';

import {useState, type ComponentType} from 'react';
import type {Editor} from '@tiptap/react';
import type {Node as PMNode} from '@tiptap/pm/model';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {Grid} from '@astryxdesign/core/Grid';
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
import {Icon} from '@astryxdesign/core/Icon';
import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignHorizontalDistributeCenter,
  AlignStartHorizontal,
  AlignStartVertical,
  AlignVerticalDistributeCenter,
  ArrowLeft,
  ArrowRight,
  BringToFront,
  ChevronDown,
  ChevronUp,
  Copy,
  Group as GroupIcon,
  ImageUp,
  Lock,
  LockOpen,
  Plus,
  SendToBack,
  Trash2,
  Ungroup,
  type LucideIcon,
} from 'lucide-react';
import {measureDevices, stageOfDevice} from '@/components/caseStudy/deviceGeometry';
import {setSelectedDevices, setSnap, useDeviceSelection} from '../devices/selection';
import {
  alignDevices,
  distributeDevices,
  duplicateDevices,
  groupDevices,
  isGrouped,
  lockDevices,
  removeDevices,
  reorderDevices,
  ungroupDevices,
  withGroups,
  type AlignEdge,
} from '../devices/arrange';
import {
  COMPARISON_LABELS,
  DEVICE_LABELS,
  FLOW_KINDS,
  FOCUS_POINTS,
  GAPS,
  SURFACES,
  devicePreset,
  newDevice,
  newFlowNode,
  newPhase,
  newStep,
  type AnnotatedImageConfig,
  type ComparisonConfig,
  type Device,
  type DeviceMockupConfig,
  type DevicePreset,
  type DeviceType,
  type FlowDiagramConfig,
  type FlowNodeKind,
  type ImageGridConfig,
  type MetricsConfig,
  type QuoteConfig,
  type ScreenSequenceConfig,
  type ShowcaseConfig,
  type SplitConfig,
  type TimelineConfig,
  type ResearchInsightsConfig,
  type ChartConfig,
  type ChartKind,
  CHART_KINDS,
  DONUT_MAX,
  INSIGHTS_MAX,
  INSIGHTS_MIN,
  newChartPoint,
  newInsight,
} from '@/lib/caseStudies/blocks';
import {studioMediaUrl} from '@studio/shared';
import {mediaFromAsset, setBlockAttrs} from '../blockOps';
import {useMedia} from '../MediaLibrary';
import {
  BackgroundControl,
  BreakpointSwitch,
  ColumnsControl,
  Group,
  Groups,
  ItemActions,
  MediaField,
  ResponsiveColumnsControl,
  WidthControl,
  moved,
  ratioSelector,
  type Props,
} from './inspectorKit';

/**
 * The block inspectors (editor spec §9, T3). Each one lists its properties in the standard groups;
 * `<Groups>` puts them in order: Content, Layout, Size, Spacing, Alignment, Appearance, Tablet and
 * phone. `INSPECTORS` (end of file) is the registry the side panel reads.
 */

const caption = <T extends {caption: string}>({config, onChange}: Props<T>) => (
  <TextInput label="Caption" value={config.caption} onChange={next => onChange({...config, caption: next})} size="sm" width="100%" />
);

// ---- Image grid -------------------------------------------------------------------------------
function ImageGridInspector({config, onChange}: Props<ImageGridConfig>) {
  const picker = useMedia();
  const move = (index: number, by: -1 | 1) => onChange({...config, items: moved(config.items, index, by)});
  return (
    <Groups>
      <Group name="content" title={`Images (${config.items.length})`}>
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
        {caption({config, onChange})}
      </Group>
      <Group name="layout">
        <ColumnsControl value={config.columns} onChange={columns => onChange({...config, columns: columns as ImageGridConfig['columns']})} />
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
      </Group>
      <Group name="dimensions">
        <WidthControl config={config} onChange={onChange} />
        {config.arrangement !== 'masonry' && ratioSelector(config.ratio, value => onChange({...config, ratio: value as ImageGridConfig['ratio']}))}
      </Group>
      <Group name="spacing">
        <Selector label="Gap" options={GAPS} value={config.gap} onChange={value => onChange({...config, gap: value as ImageGridConfig['gap']})} size="sm" />
      </Group>
      <Group name="appearance">
        <BackgroundControl config={config} onChange={onChange} />
      </Group>
      <Group name="responsive">
        <BreakpointSwitch>
          {breakpoint =>
            breakpoint === 'tablet' ? (
              <ResponsiveColumnsControl config={config} onChange={onChange} breakpoint="tablet" fallback={config.columns} />
            ) : (
              <ColumnsControl label="Columns on phones" value={config.mobileColumns ?? 2} options={[1, 2]} onChange={columns => onChange({...config, mobileColumns: columns as 1 | 2})} />
            )
          }
        </BreakpointSwitch>
      </Group>
    </Groups>
  );
}

// ---- Comparison -------------------------------------------------------------------------------
function ComparisonInspector({config, onChange}: Props<ComparisonConfig>) {
  const side = (key: 'left' | 'right', title: string) => (
    <VStack gap={4} className="inspector-item">
      <Text type="supporting">{title}</Text>
      <MediaField label="Picture" media={config[key].media} kinds={['image', 'video']} onChange={media => onChange({...config, [key]: {...config[key], media}})} />
      <TextInput label="Label" value={config[key].label} onChange={label => onChange({...config, [key]: {...config[key], label}})} size="sm" width="100%" />
      <TextArea label="Explanation" value={config[key].text} onChange={text => onChange({...config, [key]: {...config[key], text}})} rows={3} width="100%" />
    </VStack>
  );
  return (
    <Groups>
      <Group name="content">
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
        {side('left', 'Left side')}
        {side('right', 'Right side')}
        {caption({config, onChange})}
      </Group>
      <Group name="layout">
        <SegmentedControl label="Display" value={config.display ?? 'side-by-side'} onChange={display => onChange({...config, display: display as ComparisonConfig['display']})} size="sm" layout="fill">
          <SegmentedControlItem value="side-by-side" label="Side by side" />
          <SegmentedControlItem value="slider" label="Slider" />
        </SegmentedControl>
        {config.display === 'slider' && (!config.left.media || !config.right.media) && (
          <Text type="supporting" color="secondary">
            Choose both pictures to use the slider. Until then it shows side by side.
          </Text>
        )}
        <SegmentedControl label="Proportion" value={config.split} onChange={value => onChange({...config, split: value as ComparisonConfig['split']})} size="sm" layout="fill">
          <SegmentedControlItem value="50-50" label="50 / 50" />
          <SegmentedControlItem value="60-40" label="60 / 40" />
          <SegmentedControlItem value="40-60" label="40 / 60" />
        </SegmentedControl>
      </Group>
      <Group name="dimensions">
        <WidthControl config={config} onChange={onChange} />
        {ratioSelector(config.ratio, value => onChange({...config, ratio: value as ComparisonConfig['ratio']}))}
      </Group>
      <Group name="responsive">
        <Text type="supporting" color="secondary">
          On phones the two sides stack, one above the other.
        </Text>
      </Group>
    </Groups>
  );
}

// ---- Showcase ---------------------------------------------------------------------------------
function ShowcaseInspector({config, onChange}: Props<ShowcaseConfig>) {
  return (
    <Groups>
      <Group name="content">
        <MediaField label="Image or video" media={config.media} kinds={['image', 'video']} onChange={media => onChange({...config, media})} />
        {caption({config, onChange})}
      </Group>
      <Group name="dimensions">
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
      </Group>
      {config.surface !== 'none' && (
        <Group name="spacing">
          <Selector label="Space around" options={GAPS} value={config.inset} onChange={value => onChange({...config, inset: value as ShowcaseConfig['inset']})} size="sm" />
        </Group>
      )}
      <Group name="alignment">
        <Selector label="Keep in view" options={FOCUS_POINTS} value={config.focus} onChange={focus => onChange({...config, focus})} size="sm" />
      </Group>
      <Group name="appearance">
        <Selector label="Background" options={SURFACES} value={config.surface} onChange={value => onChange({...config, surface: value as ShowcaseConfig['surface']})} size="sm" />
      </Group>
    </Groups>
  );
}

// ---- Device mockups ---------------------------------------------------------------------------
function DeviceInspector({config, onChange}: Props<DeviceMockupConfig>) {
  const {ids, snap} = useDeviceSelection();
  const selected = ids.filter(id => config.devices.some(device => device.id === id));
  const chosen = config.devices.filter(device => selected.includes(device.id));
  const single = chosen.length === 1 ? chosen[0] : null;
  const update = (patch: Partial<Device>) =>
    onChange({...config, preset: 'custom', devices: config.devices.map(d => (d.id === single?.id ? {...d, ...patch} : d))});
  const maxZ = Math.max(0, ...config.devices.map(d => d.z));
  const select = (id: string, additive: boolean) => {
    const group = withGroups(config, [id]);
    setSelectedDevices(additive ? (selected.includes(id) ? selected.filter(item => !group.includes(item)) : [...selected, ...group]) : group);
  };
  const boxes = () => measureDevices(stageOfDevice(config.devices[0]?.id));
  const unlocked = chosen.filter(device => !device.locked).length;
  const allLocked = chosen.length > 0 && chosen.every(device => device.locked);

  return (
    <Groups>
      <Group name="content" title={`Devices (${config.devices.length})`}>
        <Text type="supporting" color="secondary">
          Click a device here or on the page to select it; Shift-click to select more.
        </Text>
        <HStack gap={2} wrap="wrap">
          {config.devices.map((d, index) => (
            <Button
              key={d.id}
              label={`${index + 1}. ${DEVICE_LABELS[d.type]}${d.locked ? ' (locked)' : ''}`}
              size="sm"
              variant={selected.includes(d.id) ? 'secondary' : 'ghost'}
              aria-pressed={selected.includes(d.id)}
              onClick={event => select(d.id, event.shiftKey)}
            />
          ))}
          <DropdownMenu
            button={{label: 'Add device', size: 'sm', variant: 'ghost', icon: <Icon icon={Plus} size="sm" color="inherit" />}}
            items={(Object.keys(DEVICE_LABELS) as DeviceType[]).map(type => ({
              label: DEVICE_LABELS[type],
              onClick: () => {
                const added = newDevice(type, maxZ + 1);
                setSelectedDevices([added.id]);
                onChange({...config, preset: 'custom', devices: [...config.devices, added]});
              },
            }))}
          />
        </HStack>
        {chosen.length > 1 && (
          <Text type="supporting" color="secondary">
            {chosen.length} devices selected. Use Arrange below, or drag them together on the page.
          </Text>
        )}
        {single && (
          <VStack gap={4} className="inspector-item">
            <Selector
              label="Device"
              options={(Object.keys(DEVICE_LABELS) as DeviceType[]).map(type => ({value: type, label: DEVICE_LABELS[type]}))}
              value={single.type}
              onChange={value => update({type: value as DeviceType})}
              size="sm"
            />
            <MediaField label="Screen" media={single.media} kinds={['image', 'video']} onChange={media => update({media})} />
            <Slider label="Left to right" min={0} max={100} value={single.x} onChange={(x: number) => update({x})} formatValue={v => `${Math.round(v)}%`} />
            <Slider label="Top to bottom" min={0} max={100} value={single.y} onChange={(y: number) => update({y})} formatValue={v => `${Math.round(v)}%`} />
            <Slider label="Size" min={40} max={160} value={Math.round(single.scale * 100)} onChange={(v: number) => update({scale: v / 100})} formatValue={v => `${v}%`} />
            <Slider label="Rotation" description="Or drag the round handle above the device; hold Shift for 15° steps." min={-30} max={30} value={single.rotate} onChange={(rotate: number) => update({rotate})} formatValue={v => `${v}°`} />
          </VStack>
        )}
        {caption({config, onChange})}
      </Group>
      <Group name="arrange">
        {!chosen.length ? (
          <Text type="supporting" color="secondary">
            Select one or more devices to align, order, group or lock them.
          </Text>
        ) : (
          <>
            <VStack gap={2}>
              <Text type="supporting" color="secondary">
                {chosen.length === 1 ? 'Align to the stage' : 'Align'}
              </Text>
              <HStack gap={1} wrap="wrap">
                {ALIGN_TOOLS.map(tool => (
                  <IconButton
                    key={tool.edge}
                    label={chosen.length === 1 ? `${tool.label} on the stage` : tool.label}
                    tooltip={tool.label}
                    size="sm"
                    variant="ghost"
                    isDisabled={!unlocked}
                    onClick={() => onChange(alignDevices(config, selected, boxes(), tool.edge))}
                    icon={<Icon icon={tool.icon} size="sm" color="inherit" />}
                  />
                ))}
              </HStack>
            </VStack>
            <VStack gap={2}>
              <Text type="supporting" color="secondary">
                Distribute (3 or more)
              </Text>
              <HStack gap={1}>
                <IconButton label="Distribute horizontally" tooltip="Distribute horizontally" size="sm" variant="ghost" isDisabled={unlocked < 3} onClick={() => onChange(distributeDevices(config, selected, boxes(), 'x'))} icon={<Icon icon={AlignHorizontalDistributeCenter} size="sm" color="inherit" />} />
                <IconButton label="Distribute vertically" tooltip="Distribute vertically" size="sm" variant="ghost" isDisabled={unlocked < 3} onClick={() => onChange(distributeDevices(config, selected, boxes(), 'y'))} icon={<Icon icon={AlignVerticalDistributeCenter} size="sm" color="inherit" />} />
              </HStack>
            </VStack>
            <VStack gap={2}>
              <Text type="supporting" color="secondary">
                Layer order
              </Text>
              <HStack gap={1} wrap="wrap">
                <IconButton label="Bring to front" tooltip={`Bring to front (${keys('⌥⌘]')})`} size="sm" variant="ghost" onClick={() => onChange(reorderDevices(config, selected, 'front'))} icon={<Icon icon={BringToFront} size="sm" color="inherit" />} />
                <IconButton label="Bring forward" tooltip={`Bring forward (${keys('⌘]')})`} size="sm" variant="ghost" onClick={() => onChange(reorderDevices(config, selected, 'forward'))} icon={<Icon icon={ChevronUp} size="sm" color="inherit" />} />
                <IconButton label="Send backward" tooltip={`Send backward (${keys('⌘[')})`} size="sm" variant="ghost" onClick={() => onChange(reorderDevices(config, selected, 'backward'))} icon={<Icon icon={ChevronDown} size="sm" color="inherit" />} />
                <IconButton label="Send to back" tooltip={`Send to back (${keys('⌥⌘[')})`} size="sm" variant="ghost" onClick={() => onChange(reorderDevices(config, selected, 'back'))} icon={<Icon icon={SendToBack} size="sm" color="inherit" />} />
              </HStack>
            </VStack>
            <HStack gap={2} wrap="wrap">
              {isGrouped(config, selected) ? (
                <Button label="Ungroup" size="sm" variant="ghost" onClick={() => onChange(ungroupDevices(config, selected))} icon={<Icon icon={Ungroup} size="sm" color="inherit" />} />
              ) : (
                <Button label="Group" size="sm" variant="ghost" isDisabled={chosen.length < 2} onClick={() => onChange(groupDevices(config, selected))} icon={<Icon icon={GroupIcon} size="sm" color="inherit" />} />
              )}
              <Button
                label={allLocked ? 'Unlock' : 'Lock'}
                size="sm"
                variant="ghost"
                onClick={() => onChange(lockDevices(config, selected, !allLocked))}
                icon={<Icon icon={allLocked ? LockOpen : Lock} size="sm" color="inherit" />}
              />
              <Button
                label="Duplicate"
                size="sm"
                variant="ghost"
                onClick={() => {
                  const copy = duplicateDevices(config, selected);
                  onChange(copy.config);
                  setSelectedDevices(copy.ids);
                }}
                icon={<Icon icon={Copy} size="sm" color="inherit" />}
              />
              <Button
                label={chosen.length > 1 ? 'Remove devices' : 'Remove device'}
                size="sm"
                variant="destructive"
                isDisabled={chosen.length >= config.devices.length}
                onClick={() => {
                  onChange(removeDevices(config, selected));
                  setSelectedDevices([]);
                }}
                icon={<Icon icon={Trash2} size="sm" color="inherit" />}
              />
            </HStack>
          </>
        )}
        <Switch label="Snap to guides" description="While dragging on the page. Hold Alt (⌥) to drag freely." value={snap} onChange={setSnap} size="sm" />
        <Text type="supporting" color="secondary">
          Keys on the page: arrows move (Shift: further), {keys('⌘G')} groups, {keys('⇧⌘L')} locks, {keys('⌘D')} duplicates, Esc deselects.
        </Text>
      </Group>
      <Group name="layout">
        <Selector
          label="Arrangement"
          options={[
            {value: 'single', label: 'Single device'},
            {value: 'dual-overlap', label: 'Dual overlap'},
            {value: 'triple-stack', label: 'Triple stack'},
            {value: 'multi-device', label: 'Laptop, tablet and phone'},
            {value: 'custom', label: 'Custom', description: 'Your own arrangement'},
          ]}
          value={config.preset}
          onChange={value => {
            const devices = devicePreset(value as DevicePreset, config.devices);
            setSelectedDevices([]);
            onChange({...config, preset: value as DevicePreset, devices});
          }}
          size="sm"
        />
      </Group>
      <Group name="dimensions">{ratioSelector(config.stageRatio, value => onChange({...config, stageRatio: value as DeviceMockupConfig['stageRatio']}), 'Stage shape')}</Group>
      <Group name="spacing">
        <SegmentedControl label="Space between devices" value={config.spacing} onChange={value => onChange({...config, spacing: value as DeviceMockupConfig['spacing']})} size="sm" layout="fill">
          <SegmentedControlItem value="tight" label="Tight" />
          <SegmentedControlItem value="normal" label="Normal" />
          <SegmentedControlItem value="loose" label="Loose" />
        </SegmentedControl>
      </Group>
      <Group name="appearance">
        <Selector label="Background" options={SURFACES} value={config.surface} onChange={value => onChange({...config, surface: value as DeviceMockupConfig['surface']})} size="sm" />
        <Switch label="Shadows" value={config.shadow} onChange={shadow => onChange({...config, shadow})} size="sm" />
      </Group>
      <Group name="responsive">
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
      </Group>
    </Groups>
  );
}

const ALIGN_TOOLS: {edge: AlignEdge; label: string; icon: LucideIcon}[] = [
  {edge: 'left', label: 'Align left', icon: AlignStartVertical},
  {edge: 'hcenter', label: 'Align centres', icon: AlignCenterVertical},
  {edge: 'right', label: 'Align right', icon: AlignEndVertical},
  {edge: 'top', label: 'Align top', icon: AlignStartHorizontal},
  {edge: 'vcenter', label: 'Align middles', icon: AlignCenterHorizontal},
  {edge: 'bottom', label: 'Align bottom', icon: AlignEndHorizontal},
];
const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
/** Shortcut text with the right modifier names. */
const keys = (text: string) => (isMac ? text : text.replace('⌥', 'Alt+').replace('⇧', 'Shift+').replace('⌘', 'Ctrl+'));

// ---- Split layout -----------------------------------------------------------------------------
function SplitInspector({config, onChange}: Props<SplitConfig>) {
  return (
    <Groups>
      <Group name="content">
        <MediaField label="Image or video" media={config.media} kinds={['image', 'video']} onChange={media => onChange({...config, media})} />
        <Text type="supporting" color="secondary">
          Write the text in the block on the page.
        </Text>
      </Group>
      <Group name="layout">
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
      </Group>
      <Group name="dimensions">
        <WidthControl config={config} onChange={onChange} />
        {ratioSelector(config.ratio, value => onChange({...config, ratio: value as SplitConfig['ratio']}))}
      </Group>
      <Group name="alignment">
        <SegmentedControl label="Text position" value={config.align} onChange={value => onChange({...config, align: value as SplitConfig['align']})} size="sm" layout="fill">
          <SegmentedControlItem value="start" label="Top" />
          <SegmentedControlItem value="center" label="Middle" />
          <SegmentedControlItem value="end" label="Bottom" />
        </SegmentedControl>
      </Group>
      <Group name="appearance">
        <BackgroundControl config={config} onChange={onChange} />
      </Group>
      <Group name="responsive">
        <Text type="supporting" color="secondary">
          On phones the picture always comes first, then the text.
        </Text>
      </Group>
    </Groups>
  );
}

// ---- Pull quote -------------------------------------------------------------------------------
function QuoteInspector({config, onChange}: Props<QuoteConfig>) {
  return (
    <Groups>
      <Group name="content">
        <TextInput label="Who said it" value={config.attribution} onChange={attribution => onChange({...config, attribution})} size="sm" width="100%" />
        <TextInput label="Their role" value={config.role} onChange={role => onChange({...config, role})} size="sm" width="100%" />
      </Group>
      <Group name="alignment">
        <SegmentedControl label="Alignment" value={config.align ?? 'start'} onChange={value => onChange({...config, align: value as QuoteConfig['align']})} size="sm" layout="fill">
          <SegmentedControlItem value="start" label="Left" />
          <SegmentedControlItem value="center" label="Centre" />
        </SegmentedControl>
      </Group>
      <Group name="appearance">
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
      </Group>
    </Groups>
  );
}

// ---- Metrics ----------------------------------------------------------------------------------
function MetricsInspector({config, onChange}: Props<MetricsConfig>) {
  const setItem = (index: number, patch: Partial<MetricsConfig['items'][number]>) =>
    onChange({...config, items: config.items.map((item, i) => (i === index ? {...item, ...patch} : item))});
  return (
    <Groups>
      <Group name="content" title={`Figures (${config.items.length})`}>
        {config.items.map((item, index) => (
          <VStack key={index} gap={2} className="inspector-item">
            <Grid columns={2} gap={2}>
              <TextInput label="Figure" value={item.value} onChange={value => setItem(index, {value})} size="sm" width="100%" />
              <TextInput label="Label" value={item.label} onChange={label => setItem(index, {label})} size="sm" width="100%" />
            </Grid>
            <TextInput label="Detail (optional)" value={item.detail} onChange={detail => setItem(index, {detail})} size="sm" width="100%" />
            <ItemActions name="figure" index={index} count={config.items.length} onMove={direction => onChange({...config, items: moved(config.items, index, direction)})} onRemove={() => onChange({...config, items: config.items.filter((_, i) => i !== index)})} />
          </VStack>
        ))}
        <Button label="Add figure" size="sm" variant="secondary" icon={<Icon icon={Plus} size="sm" color="inherit" />} onClick={() => onChange({...config, items: [...config.items, {value: '', label: '', detail: ''}]})} />
        {caption({config, onChange})}
      </Group>
      <Group name="layout">
        <ColumnsControl value={config.columns} onChange={columns => onChange({...config, columns: columns as MetricsConfig['columns']})} />
      </Group>
      <Group name="dimensions">
        <SegmentedControl label="Number size" value={config.size ?? 'regular'} onChange={value => onChange({...config, size: value as MetricsConfig['size']})} size="sm" layout="fill">
          <SegmentedControlItem value="regular" label="Regular" />
          <SegmentedControlItem value="large" label="Large" />
        </SegmentedControl>
      </Group>
      <Group name="alignment">
        <SegmentedControl label="Alignment" value={config.align ?? 'start'} onChange={value => onChange({...config, align: value as MetricsConfig['align']})} size="sm" layout="fill">
          <SegmentedControlItem value="start" label="Left" />
          <SegmentedControlItem value="center" label="Centre" />
        </SegmentedControl>
      </Group>
      <Group name="appearance">
        <Selector
          label="Style"
          options={[
            {value: 'plain', label: 'Plain figures'},
            {value: 'cards', label: 'Cards'},
            {value: 'brand', label: 'Brand purple'},
          ]}
          value={config.style}
          onChange={value => onChange({...config, style: value as MetricsConfig['style']})}
          size="sm"
        />
        <BackgroundControl config={config} onChange={onChange} />
      </Group>
      <Group name="responsive">
        <BreakpointSwitch>
          {breakpoint => (
            <ResponsiveColumnsControl
              config={config}
              onChange={onChange}
              breakpoint={breakpoint}
              fallback={breakpoint === 'tablet' ? config.columns : 2}
              options={breakpoint === 'tablet' ? [1, 2, 3, 4] : [1, 2]}
            />
          )}
        </BreakpointSwitch>
      </Group>
    </Groups>
  );
}

// ---- Timeline ---------------------------------------------------------------------------------
function TimelineInspector({config, onChange}: Props<TimelineConfig>) {
  const setPhase = (index: number, patch: Partial<TimelineConfig['phases'][number]>) =>
    onChange({...config, phases: config.phases.map((phase, i) => (i === index ? {...phase, ...patch} : phase))});
  return (
    <Groups>
      <Group name="content" title={`Phases (${config.phases.length})`}>
        {config.phases.map((phase, index) => (
          <VStack key={phase.id} gap={2} className="inspector-item">
            <Grid columns={2} gap={2}>
              <TextInput label="Phase" value={phase.title} onChange={title => setPhase(index, {title})} size="sm" width="100%" />
              <TextInput label="When" description="For example: Weeks 1–2" value={phase.when} onChange={when => setPhase(index, {when})} size="sm" width="100%" />
            </Grid>
            <TextArea label="What happened" value={phase.text} onChange={text => setPhase(index, {text})} rows={2} width="100%" />
            <ItemActions name="phase" index={index} count={config.phases.length} onMove={direction => onChange({...config, phases: moved(config.phases, index, direction)})} onRemove={() => onChange({...config, phases: config.phases.filter((_, i) => i !== index)})} />
          </VStack>
        ))}
        <Button label="Add phase" size="sm" variant="secondary" icon={<Icon icon={Plus} size="sm" color="inherit" />} onClick={() => onChange({...config, phases: [...config.phases, newPhase()]})} />
        {caption({config, onChange})}
      </Group>
      <Group name="layout">
        <SegmentedControl label="Direction" value={config.layout} onChange={value => onChange({...config, layout: value as TimelineConfig['layout']})} size="sm" layout="fill">
          <SegmentedControlItem value="horizontal" label="Across" />
          <SegmentedControlItem value="vertical" label="Down" />
        </SegmentedControl>
      </Group>
      <Group name="appearance">
        <SegmentedControl label="Style" value={config.style} onChange={value => onChange({...config, style: value as TimelineConfig['style']})} size="sm" layout="fill">
          <SegmentedControlItem value="line" label="Line" />
          <SegmentedControlItem value="cards" label="Cards" />
        </SegmentedControl>
      </Group>
      {config.layout === 'horizontal' && (
        <Group name="responsive">
          <Text type="supporting" color="secondary">
            On phones the phases run down the page.
          </Text>
        </Group>
      )}
    </Groups>
  );
}

// ---- Screen sequence --------------------------------------------------------------------------
function SequenceInspector({config, onChange}: Props<ScreenSequenceConfig>) {
  const setStep = (index: number, patch: Partial<ScreenSequenceConfig['steps'][number]>) =>
    onChange({...config, steps: config.steps.map((step, i) => (i === index ? {...step, ...patch} : step))});
  return (
    <Groups>
      <Group name="content" title={`Screens (${config.steps.length})`}>
        {config.steps.map((step, index) => (
          <VStack key={step.id} gap={2} className="inspector-item">
            <MediaField label={`Screen ${index + 1}`} media={step.media} kinds={['image', 'video']} onChange={media => setStep(index, {media})} />
            <TextInput label="Step title" value={step.title} onChange={title => setStep(index, {title})} size="sm" width="100%" />
            <TextArea label="What happens here" value={step.text} onChange={text => setStep(index, {text})} rows={2} width="100%" />
            <ItemActions name="screen" index={index} count={config.steps.length} onMove={direction => onChange({...config, steps: moved(config.steps, index, direction)})} onRemove={() => onChange({...config, steps: config.steps.filter((_, i) => i !== index)})} />
          </VStack>
        ))}
        <Button label="Add screen" size="sm" variant="secondary" icon={<Icon icon={Plus} size="sm" color="inherit" />} onClick={() => onChange({...config, steps: [...config.steps, newStep()]})} />
        {caption({config, onChange})}
      </Group>
      <Group name="layout">
        <ColumnsControl value={config.columns} onChange={columns => onChange({...config, columns: columns as ScreenSequenceConfig['columns']})} />
        <Switch label="Arrows between screens" value={config.arrows} onChange={arrows => onChange({...config, arrows})} size="sm" />
      </Group>
      <Group name="dimensions">{ratioSelector(config.ratio, value => onChange({...config, ratio: value as ScreenSequenceConfig['ratio']}), 'Screen shape')}</Group>
      <Group name="appearance">
        <Selector
          label="Frame"
          options={[
            {value: 'phone', label: 'Phone'},
            {value: 'browser', label: 'Browser window'},
            {value: 'none', label: 'No frame'},
          ]}
          value={config.frame}
          onChange={value => onChange({...config, frame: value as ScreenSequenceConfig['frame']})}
          size="sm"
        />
      </Group>
      <Group name="responsive">
        <BreakpointSwitch>
          {breakpoint => (
            <ResponsiveColumnsControl
              config={config}
              onChange={onChange}
              breakpoint={breakpoint}
              fallback={breakpoint === 'tablet' ? config.columns : 2}
              options={breakpoint === 'tablet' ? [1, 2, 3, 4] : [1, 2]}
            />
          )}
        </BreakpointSwitch>
      </Group>
    </Groups>
  );
}

// ---- Annotated screenshot ---------------------------------------------------------------------
function AnnotatedInspector({config, onChange}: Props<AnnotatedImageConfig>) {
  const setNote = (index: number, patch: Partial<AnnotatedImageConfig['annotations'][number]>) =>
    onChange({...config, annotations: config.annotations.map((note, i) => (i === index ? {...note, ...patch} : note))});
  return (
    <Groups>
      <Group name="content" title={`Screenshot and notes (${config.annotations.length})`}>
        <MediaField label="Screenshot" media={config.media} onChange={media => onChange({...config, media})} />
        <Text type="supporting" color="secondary">
          Click the screenshot in the document to add a numbered marker there, then describe it here.
        </Text>
        {config.annotations.map((note, index) => (
          <VStack key={note.id} gap={2} className="inspector-item">
            <TextInput label={`Note ${index + 1} title`} value={note.title} onChange={title => setNote(index, {title})} size="sm" width="100%" />
            <TextArea label="What it shows" value={note.text} onChange={text => setNote(index, {text})} rows={2} width="100%" />
            <Slider label="Left to right" min={0} max={100} value={note.x} onChange={(x: number) => setNote(index, {x})} formatValue={v => `${v}%`} />
            <Slider label="Top to bottom" min={0} max={100} value={note.y} onChange={(y: number) => setNote(index, {y})} formatValue={v => `${v}%`} />
            <ItemActions name="note" index={index} count={config.annotations.length} onMove={direction => onChange({...config, annotations: moved(config.annotations, index, direction)})} onRemove={() => onChange({...config, annotations: config.annotations.filter((_, i) => i !== index)})} />
          </VStack>
        ))}
        {caption({config, onChange})}
      </Group>
      <Group name="layout">
        <SegmentedControl label="Notes" value={config.notes} onChange={value => onChange({...config, notes: value as AnnotatedImageConfig['notes']})} size="sm" layout="fill">
          <SegmentedControlItem value="below" label="Below" />
          <SegmentedControlItem value="side" label="Beside" />
        </SegmentedControl>
      </Group>
      <Group name="dimensions">{ratioSelector(config.ratio, value => onChange({...config, ratio: value as AnnotatedImageConfig['ratio']}), 'Shape')}</Group>
    </Groups>
  );
}

// ---- Flow diagram -----------------------------------------------------------------------------
function FlowInspector({config, onChange}: Props<FlowDiagramConfig>) {
  const setNode = (index: number, patch: Partial<FlowDiagramConfig['nodes'][number]>) =>
    onChange({...config, nodes: config.nodes.map((node, i) => (i === index ? {...node, ...patch} : node))});
  return (
    <Groups>
      <Group name="content" title={`Steps (${config.nodes.length})`}>
        {config.nodes.map((node, index) => (
          <VStack key={node.id} gap={2} className="inspector-item">
            <Grid columns={2} gap={2}>
              <TextInput label={`Step ${index + 1}`} value={node.label} onChange={label => setNode(index, {label})} size="sm" width="100%" />
              <Selector label="Shape" options={FLOW_KINDS} value={node.kind} onChange={kind => setNode(index, {kind: kind as FlowNodeKind})} size="sm" />
            </Grid>
            {index < config.nodes.length - 1 && (
              <TextInput label="Arrow label (optional)" description="For example: Yes, or Taps Pay" value={node.next} onChange={next => setNode(index, {next})} size="sm" width="100%" />
            )}
            <ItemActions name="step" index={index} count={config.nodes.length} onMove={direction => onChange({...config, nodes: moved(config.nodes, index, direction)})} onRemove={() => onChange({...config, nodes: config.nodes.filter((_, i) => i !== index)})} />
          </VStack>
        ))}
        <Button label="Add step" size="sm" variant="secondary" icon={<Icon icon={Plus} size="sm" color="inherit" />} onClick={() => onChange({...config, nodes: [...config.nodes, newFlowNode()]})} />
        {caption({config, onChange})}
      </Group>
      <Group name="layout">
        <SegmentedControl label="Direction" value={config.direction} onChange={value => onChange({...config, direction: value as FlowDiagramConfig['direction']})} size="sm" layout="fill">
          <SegmentedControlItem value="horizontal" label="Across" />
          <SegmentedControlItem value="vertical" label="Down" />
        </SegmentedControl>
      </Group>
      {config.direction === 'horizontal' && (
        <Group name="responsive">
          <Text type="supporting" color="secondary">
            On phones the steps run down the page.
          </Text>
        </Group>
      )}
    </Groups>
  );
}

// ---- Research insights (T4) --------------------------------------------------------------------
function ResearchInsightsInspector({config, onChange}: Props<ResearchInsightsConfig>) {
  const setInsight = (index: number, patch: Partial<ResearchInsightsConfig['insights'][number]>) =>
    onChange({...config, insights: config.insights.map((insight, i) => (i === index ? {...insight, ...patch} : insight))});
  return (
    <Groups>
      <Group name="content" title={`Findings (${config.insights.length})`}>
        {config.insights.map((insight, index) => (
          <VStack key={insight.id} gap={2} className="inspector-item">
            <TextArea label={`Finding ${index + 1}`} description="What you learned, in one sentence." value={insight.finding} onChange={finding => setInsight(index, {finding})} rows={2} width="100%" />
            <TextArea label="Evidence" description="What it’s based on: a quote, a number or an observation." value={insight.evidence} onChange={evidence => setInsight(index, {evidence})} rows={2} width="100%" />
            <TextInput label="Source (optional)" description="For example: 8 interviews, March 2026" value={insight.source} onChange={source => setInsight(index, {source})} size="sm" width="100%" />
            <ItemActions
              name="finding"
              index={index}
              count={config.insights.length}
              onMove={direction => onChange({...config, insights: moved(config.insights, index, direction)})}
              onRemove={() => onChange({...config, insights: config.insights.filter((_, i) => i !== index)})}
            />
          </VStack>
        ))}
        {config.insights.length < INSIGHTS_MAX ? (
          <Button label="Add finding" size="sm" variant="secondary" icon={<Icon icon={Plus} size="sm" color="inherit" />} onClick={() => onChange({...config, insights: [...config.insights, newInsight()]})} />
        ) : (
          <Text type="supporting" color="secondary">
            Up to {INSIGHTS_MAX} findings fit well. For more, add a second block.
          </Text>
        )}
        {config.insights.length < INSIGHTS_MIN && (
          <Text type="supporting" color="secondary">
            Insights read best in groups of {INSIGHTS_MIN} to {INSIGHTS_MAX}.
          </Text>
        )}
        {caption({config, onChange})}
      </Group>
      <Group name="layout">
        <SegmentedControl label="Layout" value={config.layout} onChange={value => onChange({...config, layout: value as ResearchInsightsConfig['layout']})} size="sm" layout="fill">
          <SegmentedControlItem value="cards" label="Cards" />
          <SegmentedControlItem value="list" label="List" />
        </SegmentedControl>
        {config.layout === 'cards' && <ColumnsControl value={config.columns} options={[2, 3]} onChange={columns => onChange({...config, columns: columns as 2 | 3})} />}
      </Group>
      <Group name="appearance">
        <Switch label="Number the findings" value={config.numbered} onChange={numbered => onChange({...config, numbered})} size="sm" />
      </Group>
      <Group name="responsive">
        <Text type="supporting" color="secondary">
          On phones the findings run down the page, one after another.
        </Text>
      </Group>
    </Groups>
  );
}

// ---- Chart (T4) -------------------------------------------------------------------------------
function ChartInspector({config, onChange}: Props<ChartConfig>) {
  const setPoint = (index: number, patch: Partial<ChartConfig['points'][number]>) =>
    onChange({...config, points: config.points.map((point, i) => (i === index ? {...point, ...patch} : point))});
  const parseValue = (text: string) => {
    const cleaned = text.replace(/[,\s]/g, '');
    if (!cleaned) return null;
    const value = Number(cleaned);
    return Number.isFinite(value) ? value : null;
  };
  const counted = config.points.filter(point => point.label.trim() && point.value !== null).length;
  return (
    <Groups>
      <Group name="content" title={`Values (${config.points.length})`}>
        <TextInput label="Title (optional)" description="What the chart measures. For example: Weekly bookings" value={config.title} onChange={title => onChange({...config, title})} size="sm" width="100%" />
        <Text type="supporting" color="secondary">
          Use real, verified figures. The chart shows only rows with a label and a number.
        </Text>
        {config.points.map((point, index) => (
          <VStack key={point.id} gap={2} className="inspector-item">
            <Grid columns={2} gap={2}>
              <TextInput label={`Label ${index + 1}`} value={point.label} onChange={label => setPoint(index, {label})} size="sm" width="100%" />
              <ValueInput label={`Value ${index + 1}`} value={point.value} onChange={value => setPoint(index, {value})} parse={parseValue} />
            </Grid>
            <ItemActions
              name="row"
              index={index}
              count={config.points.length}
              onMove={direction => onChange({...config, points: moved(config.points, index, direction)})}
              onRemove={() => onChange({...config, points: config.points.filter((_, i) => i !== index)})}
            />
          </VStack>
        ))}
        <Button label="Add row" size="sm" variant="secondary" icon={<Icon icon={Plus} size="sm" color="inherit" />} onClick={() => onChange({...config, points: [...config.points, newChartPoint()]})} />
        <TextInput label="Unit (optional)" description="Shown after each value. For example: %, or  ms with a space first" value={config.unit} onChange={unit => onChange({...config, unit: unit.slice(0, 12)})} size="sm" width="100%" />
        <TextArea
          label="Summary"
          description="One sentence for people who can’t see the chart: what it shows. For example: Bookings doubled in the six weeks after launch."
          value={config.summary}
          onChange={summary => onChange({...config, summary})}
          rows={2}
          width="100%"
        />
        <TextInput label="Source (optional)" description="Where the figures come from. For example: Analytics, March 2026" value={config.source} onChange={source => onChange({...config, source})} size="sm" width="100%" />
        {caption({config, onChange})}
      </Group>
      <Group name="layout">
        <Selector label="Chart type" options={CHART_KINDS} value={config.kind} onChange={kind => onChange({...config, kind: kind as ChartKind})} size="sm" />
        {config.kind === 'donut' && counted > DONUT_MAX && (
          <Text type="supporting" color="secondary">
            A donut shows up to {DONUT_MAX} parts. Rows from part {DONUT_MAX} on are grouped as Other.
          </Text>
        )}
        {config.kind === 'donut' && (
          <Text type="supporting" color="secondary">
            Parts with a value of 0 or less aren’t shown.
          </Text>
        )}
        {config.kind === 'line' && (
          <Text type="supporting" color="secondary">
            The line follows the rows in order, so put them in time order.
          </Text>
        )}
      </Group>
      {config.kind === 'progress' && (
        <Group name="dimensions">
          <TextInput
            label="Target"
            description="The value that counts as complete. 100 for percentages."
            value={String(config.target)}
            onChange={text => {
              const target = parseValue(text);
              onChange({...config, target: target && target > 0 ? target : 100});
            }}
            size="sm"
            width="100%"
          />
        </Group>
      )}
    </Groups>
  );
}

/** A number field that keeps what's being typed ("1.", "-") until it's a number. */
function ValueInput({label, value, onChange, parse}: {label: string; value: number | null; onChange: (value: number | null) => void; parse: (text: string) => number | null}) {
  const [text, setText] = useState(value === null ? '' : String(value));
  const parsed = parse(text);
  const isInvalid = text.trim() !== '' && parsed === null;
  return (
    <TextInput
      label={label}
      value={text}
      inputMode="decimal"
      onChange={next => {
        setText(next);
        const number = parse(next);
        if (number !== null || !next.trim()) onChange(number);
      }}
      status={isInvalid ? {type: 'error', message: 'Enter a number, for example 42 or 3.5.'} : undefined}
      size="sm"
      width="100%"
    />
  );
}

// ---- Node-attribute inspectors (callout, table, image) -----------------------------------------
type NodeProps = {editor: Editor; pos: number; node: PMNode};

function CalloutInspector({editor, pos, node}: NodeProps) {
  return (
    <Groups>
      <Group name="appearance">
        <Selector
          label="Tone"
          options={[
            {value: 'brand', label: 'Brand purple'},
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
      </Group>
    </Groups>
  );
}

/** Table properties: headers, rows and columns, cell alignment, look, phones. */
function TableInspector({editor, pos, node}: NodeProps) {
  const attrs = node.attrs as {tableStyle: string; striped: boolean; density: string; mobile: string};
  const set = (next: Record<string, unknown>) => setBlockAttrs(editor, pos, next);
  const chain = () => editor.chain().focus();
  const firstRow = node.firstChild;
  const hasHeaderRow = Boolean(firstRow && firstRow.childCount && [...Array(firstRow.childCount).keys()].every(i => firstRow.child(i).type.name === 'tableHeader'));
  const hasHeaderColumn = node.childCount > 0 && [...Array(node.childCount).keys()].every(i => node.child(i).firstChild?.type.name === 'tableHeader');
  const columns = firstRow?.childCount ?? 0;
  return (
    <Groups>
      <Group name="content">
        <Text type="supporting" color="secondary">
          {node.childCount} rows × {columns} columns. Changes to rows, columns and alignment apply where the cursor is in the table.
        </Text>
        <Switch label="Header row" description="The first row labels the columns for screen readers." value={hasHeaderRow} onChange={() => chain().toggleHeaderRow().run()} size="sm" />
        <Switch label="Header column" description="The first column labels the rows." value={hasHeaderColumn} onChange={() => chain().toggleHeaderColumn().run()} size="sm" />
      </Group>
      <Group name="layout" title="Rows and columns">
        <HStack gap={2} wrap="wrap">
          <Button label="Add row" size="sm" variant="secondary" icon={<Icon icon={Plus} size="sm" color="inherit" />} onClick={() => chain().addRowAfter().run()} />
          <Button label="Add column" size="sm" variant="secondary" icon={<Icon icon={Plus} size="sm" color="inherit" />} onClick={() => chain().addColumnAfter().run()} />
        </HStack>
        <HStack gap={2} wrap="wrap">
          <Button label="Delete row" size="sm" variant="destructive" onClick={() => chain().deleteRow().run()} />
          <Button label="Delete column" size="sm" variant="destructive" onClick={() => chain().deleteColumn().run()} />
        </HStack>
      </Group>
      <Group name="spacing">
        <SegmentedControl label="Density" value={attrs.density} onChange={density => set({density})} size="sm" layout="fill">
          <SegmentedControlItem value="comfortable" label="Comfortable" />
          <SegmentedControlItem value="compact" label="Compact" />
        </SegmentedControl>
      </Group>
      <Group name="alignment">
        <SegmentedControl
          label="Text alignment in this cell"
          value={(['center', 'right'] as const).find(a => editor.isActive({textAlign: a})) ?? 'left'}
          onChange={align => chain().setTextAlign(align).run()}
          size="sm"
          layout="fill">
          <SegmentedControlItem value="left" label="Left" />
          <SegmentedControlItem value="center" label="Centre" />
          <SegmentedControlItem value="right" label="Right" />
        </SegmentedControl>
      </Group>
      <Group name="appearance">
        <Selector
          label="Borders"
          options={[
            {value: 'grid', label: 'Grid (every cell)'},
            {value: 'rows', label: 'Rows only'},
            {value: 'minimal', label: 'Minimal (header line only)'},
          ]}
          value={attrs.tableStyle}
          onChange={tableStyle => set({tableStyle})}
          size="sm"
        />
        <Switch label="Striped rows" value={Boolean(attrs.striped)} onChange={striped => set({striped})} size="sm" />
      </Group>
      <Group name="responsive">
        <SegmentedControl label="Wide tables on phones" value={attrs.mobile} onChange={mobile => set({mobile})} size="sm" layout="fill">
          <SegmentedControlItem value="scroll" label="Scroll sideways" />
          <SegmentedControlItem value="fit" label="Fit to screen" />
        </SegmentedControl>
      </Group>
    </Groups>
  );
}

const IMAGE_SIZES = [
  {value: 'full', label: 'Full width'},
  {value: 'large', label: 'Large (75%)'},
  {value: 'medium', label: 'Medium (50%)'},
  {value: 'small', label: 'Small (33%)'},
];
const IMAGE_RATIOS = [
  {value: 'original', label: 'Original shape'},
  {value: '16/9', label: 'Wide (16:9)'},
  {value: '4/3', label: 'Standard (4:3)'},
  {value: '1/1', label: 'Square (1:1)'},
  {value: '3/4', label: 'Portrait (3:4)'},
];

/** Image properties: replace, decorative, alt text, caption, credit, size, alignment, shape, corners. */
function ImageInspector({editor, pos, node}: NodeProps) {
  const picker = useMedia();
  const attrs = node.attrs as {src: string; alt?: string; title?: string; decorative?: boolean; size?: string | null; align?: string | null; ratio?: string | null; focus?: string | null; credit?: string | null; radius?: string | null};
  const set = (next: Record<string, unknown>) => setBlockAttrs(editor, pos, next);
  const size = attrs.size ?? 'full';
  return (
    <Groups>
      <Group name="content">
        <div className="write-image-frame">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={studioMediaUrl(attrs.src)} alt="" className="inspector-thumb" />
          <HStack gap={2} className="write-image-actions">
            <Button
              label="Replace image"
              variant="secondary"
              size="sm"
              icon={<Icon icon={ImageUp} size="sm" color="inherit" />}
              onClick={async () => {
                const asset = await picker.pick('image');
                if (asset) set({src: asset.path, width: asset.width, height: asset.height, alt: attrs.decorative ? '' : asset.alt || attrs.alt || ''});
              }}
            />
          </HStack>
        </div>
        <Switch
          label="Decorative image"
          description="Turn this on if the image adds nothing to the text. Screen readers will skip it."
          value={Boolean(attrs.decorative)}
          onChange={decorative => set(decorative ? {decorative, alt: ''} : {decorative})}
        />
        {!attrs.decorative && (
          <TextInput label="Alt text" description="Describe what the image shows, for people who can’t see it." value={attrs.alt ?? ''} onChange={alt => set({alt})} size="sm" width="100%" />
        )}
        <TextInput label="Caption" value={attrs.title ?? ''} onChange={title => set({title})} size="sm" width="100%" />
        <TextInput label="Credit" description="Who made it or where it's from. For example: Photo: Jane Doe" value={attrs.credit ?? ''} onChange={credit => set({credit: credit || null})} size="sm" width="100%" />
      </Group>
      <Group name="dimensions">
        <Selector label="Size" options={IMAGE_SIZES} value={size} onChange={value => set({size: value === 'full' ? null : value, align: value === 'full' ? null : attrs.align ?? 'center'})} size="sm" />
        <Selector label="Shape" description="Crops the image to this shape." options={IMAGE_RATIOS} value={attrs.ratio ?? 'original'} onChange={value => set({ratio: value === 'original' ? null : value})} size="sm" />
      </Group>
      {(size !== 'full' || attrs.ratio) && (
        <Group name="alignment">
          {size !== 'full' && (
            <SegmentedControl label="Alignment" value={attrs.align ?? 'center'} onChange={align => set({align})} size="sm" layout="fill">
              <SegmentedControlItem value="left" label="Left" />
              <SegmentedControlItem value="center" label="Centre" />
              <SegmentedControlItem value="right" label="Right" />
            </SegmentedControl>
          )}
          {attrs.ratio && <Selector label="Keep in view when cropped" options={FOCUS_POINTS} value={attrs.focus ?? 'center'} onChange={focus => set({focus})} size="sm" />}
        </Group>
      )}
      <Group name="appearance">
        <SegmentedControl label="Corners" value={attrs.radius ?? 'none'} onChange={radius => set({radius: radius === 'none' ? null : radius})} size="sm" layout="fill">
          <SegmentedControlItem value="none" label="Square" />
          <SegmentedControlItem value="sm" label="Small" />
          <SegmentedControlItem value="md" label="Medium" />
          <SegmentedControlItem value="lg" label="Large" />
        </SegmentedControl>
      </Group>
    </Groups>
  );
}

// ---- Registry ---------------------------------------------------------------------------------
/* eslint-disable @typescript-eslint/no-explicit-any */
export type InspectorEntry =
  | {kind: 'config'; Inspector: ComponentType<Props<any>>; /** Reset local state when another block of this type is selected. */ keyed?: boolean}
  | {kind: 'node'; Inspector: ComponentType<NodeProps>};
/* eslint-enable @typescript-eslint/no-explicit-any */

/** Which inspector each block type uses (editor spec §10, T5). Blocks without one have none. */
export const INSPECTORS: Record<string, InspectorEntry> = {
  imageGrid: {kind: 'config', Inspector: ImageGridInspector},
  comparison: {kind: 'config', Inspector: ComparisonInspector},
  showcase: {kind: 'config', Inspector: ShowcaseInspector},
  deviceMockup: {kind: 'config', Inspector: DeviceInspector},
  splitLayout: {kind: 'config', Inspector: SplitInspector},
  pullQuote: {kind: 'config', Inspector: QuoteInspector},
  metrics: {kind: 'config', Inspector: MetricsInspector},
  timeline: {kind: 'config', Inspector: TimelineInspector},
  screenSequence: {kind: 'config', Inspector: SequenceInspector},
  annotatedImage: {kind: 'config', Inspector: AnnotatedInspector},
  flowDiagram: {kind: 'config', Inspector: FlowInspector},
  researchInsights: {kind: 'config', Inspector: ResearchInsightsInspector},
  chart: {kind: 'config', Inspector: ChartInspector, keyed: true},
  callout: {kind: 'node', Inspector: CalloutInspector},
  table: {kind: 'node', Inspector: TableInspector},
  image: {kind: 'node', Inspector: ImageInspector},
};
