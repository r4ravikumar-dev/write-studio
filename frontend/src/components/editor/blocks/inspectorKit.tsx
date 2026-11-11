'use client';

import {Children, isValidElement, useState, type ReactElement, type ReactNode} from 'react';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {Text} from '@astryxdesign/core/Text';
import {TextInput} from '@astryxdesign/core/TextInput';
import {Selector} from '@astryxdesign/core/Selector';
import {SegmentedControl, SegmentedControlItem} from '@astryxdesign/core/SegmentedControl';
import {Button} from '@astryxdesign/core/Button';
import {IconButton} from '@astryxdesign/core/IconButton';
import {Divider} from '@astryxdesign/core/Divider';
import {Icon} from '@astryxdesign/core/Icon';
import {ArrowDown, ArrowUp, ImageUp, RotateCcw, Trash2} from 'lucide-react';
import {BLOCK_WIDTHS, RATIOS, SURFACES, type BlockWidth, type Breakpoint, type ColumnCount, type ResponsiveColumns, type Surface} from '@/lib/caseStudies/blocks';
import {studioMediaUrl, type MediaRef} from '@studio/shared';
import {mediaFromAsset} from '../blockOps';
import {useMedia} from '../MediaLibrary';
import type {MediaKind} from '../upload';
import {EYEBROW_STYLE} from '@/theme/eyebrow';

/**
 * Building blocks for the block inspectors (editor spec §9, T3). Every inspector is a list of
 * `<Group>`s; `<Groups>` always shows them in the same order, with dividers between them:
 * Content, Layout, Size, Spacing, Alignment, Appearance, Tablet and phone.
 */
export type Props<T> = {config: T; onChange: (next: T) => void};

export const GROUP_ORDER = ['content', 'layout', 'dimensions', 'spacing', 'alignment', 'arrange', 'appearance', 'responsive'] as const;
export type GroupName = (typeof GROUP_ORDER)[number];
const GROUP_TITLES: Record<GroupName, string> = {
  content: 'Content',
  layout: 'Layout',
  dimensions: 'Size',
  spacing: 'Spacing',
  alignment: 'Alignment',
  arrange: 'Arrange',
  appearance: 'Appearance',
  responsive: 'Tablet and phone',
};

/** One property group. `title` overrides the standard name (e.g. "Images (4)"). */
export function Group({name, title, children}: {name: GroupName; title?: string; children: ReactNode}) {
  return (
    <VStack gap={4} data-group={name}>
      <Text type="supporting" style={EYEBROW_STYLE}>
        {title ?? GROUP_TITLES[name]}
      </Text>
      {children}
    </VStack>
  );
}

/** Groups in the standard order, whatever order they're written in, with dividers between. */
export function Groups({children}: {children: ReactNode}) {
  const groups = Children.toArray(children).filter((child): child is ReactElement<{name: GroupName}> => isValidElement(child));
  groups.sort((a, b) => GROUP_ORDER.indexOf(a.props.name) - GROUP_ORDER.indexOf(b.props.name));
  return (
    <VStack gap={6}>
      {groups.flatMap((group, index) => (index ? [<Divider key={`d${index}`} />, group] : [group]))}
    </VStack>
  );
}

/** A media field: thumbnail, choose/replace, and alt text for images. */
export function MediaField({label, media, kinds = ['image'], onChange}: {label: string; media: MediaRef | null; kinds?: MediaKind[]; onChange: (media: MediaRef | null) => void}) {
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
        <Button label={media ? 'Replace' : 'Choose'} size="sm" variant="secondary" onClick={choose} icon={<Icon icon={ImageUp} size="sm" color="inherit" />} />
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

export const ratioSelector = (value: string, onChange: (value: string) => void, label = 'Aspect ratio') => (
  <Selector label={label} options={RATIOS} value={value} onChange={onChange} size="sm" />
);

export function WidthControl<T extends {width?: BlockWidth}>({config, onChange}: Props<T>) {
  return (
    <SegmentedControl label="Width" value={config.width ?? 'content'} onChange={value => onChange({...config, width: value as BlockWidth})} size="sm" layout="fill">
      {BLOCK_WIDTHS.map(option => (
        <SegmentedControlItem key={option.value} value={option.value} label={option.label} />
      ))}
    </SegmentedControl>
  );
}

export function BackgroundControl<T extends {surface?: Surface}>({config, onChange}: Props<T>) {
  return <Selector label="Background" options={SURFACES} value={config.surface ?? 'none'} onChange={value => onChange({...config, surface: value as Surface})} size="sm" />;
}

export function ColumnsControl({label = 'Columns', value, options = [2, 3, 4], onChange}: {label?: string; value: number; options?: ColumnCount[]; onChange: (columns: ColumnCount) => void}) {
  return (
    <SegmentedControl label={label} value={String(value)} onChange={next => onChange(Number(next) as ColumnCount)} size="sm" layout="fill">
      {options.map((option, index) => (
        <SegmentedControlItem key={option} value={String(option)} label={index === 0 ? `${option} column${option === 1 ? '' : 's'}` : String(option)} />
      ))}
    </SegmentedControl>
  );
}

/** Moves item `index` by `direction` in a list (returns a new list). */
export function moved<T>(items: T[], index: number, direction: -1 | 1) {
  const next = [...items];
  const target = index + direction;
  if (target < 0 || target >= next.length) return items;
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

/** Move earlier / later / remove buttons for one list item, named for screen readers. */
export function ItemActions({name, index, count, onMove, onRemove}: {name: string; index: number; count: number; onMove: (direction: -1 | 1) => void; onRemove: () => void}) {
  return (
    <HStack gap={1} hAlign="end">
      <IconButton label={`Move ${name} ${index + 1} earlier`} tooltip="Move earlier" size="sm" variant="ghost" isDisabled={index === 0} onClick={() => onMove(-1)} icon={<Icon icon={ArrowUp} size="sm" color="inherit" />} />
      <IconButton label={`Move ${name} ${index + 1} later`} tooltip="Move later" size="sm" variant="ghost" isDisabled={index === count - 1} onClick={() => onMove(1)} icon={<Icon icon={ArrowDown} size="sm" color="inherit" />} />
      <IconButton label={`Remove ${name} ${index + 1}`} tooltip="Remove" size="sm" variant="destructive" onClick={onRemove} icon={<Icon icon={Trash2} size="sm" color="inherit" />} />
    </HStack>
  );
}

/**
 * Tablet and phone (editor spec §9.3): a Desktop · Tablet · Phone switch. Desktop uses the
 * settings above; Tablet and Phone show the properties that can differ there, with a reset.
 */
export function BreakpointSwitch({children}: {children: (breakpoint: Breakpoint) => ReactNode}) {
  const [breakpoint, setBreakpoint] = useState<'desktop' | Breakpoint>('desktop');
  return (
    <VStack gap={4}>
      <SegmentedControl label="Screen size" value={breakpoint} onChange={value => setBreakpoint(value as 'desktop' | Breakpoint)} size="sm" layout="fill">
        <SegmentedControlItem value="desktop" label="Desktop" />
        <SegmentedControlItem value="tablet" label="Tablet" />
        <SegmentedControlItem value="phone" label="Phone" />
      </SegmentedControl>
      {breakpoint === 'desktop' ? (
        <Text type="supporting" color="secondary">
          Desktop uses the settings above. Choose Tablet or Phone to change them for smaller screens.
        </Text>
      ) : (
        children(breakpoint)
      )}
    </VStack>
  );
}

/** Columns for one breakpoint, stored in `responsive`, with "Same as desktop" reset. */
export function ResponsiveColumnsControl<T extends {columns: number; responsive?: ResponsiveColumns}>({
  config,
  onChange,
  breakpoint,
  fallback,
  options = [1, 2, 3, 4],
}: Props<T> & {breakpoint: Breakpoint; fallback: number; options?: ColumnCount[]}) {
  const override = config.responsive?.[breakpoint]?.columns;
  const set = (columns: ColumnCount | undefined) => {
    const responsive: ResponsiveColumns = {...config.responsive, [breakpoint]: columns ? {columns} : undefined};
    if (!columns) delete responsive[breakpoint];
    onChange({...config, responsive: Object.keys(responsive).length ? responsive : undefined});
  };
  return (
    <VStack gap={2}>
      <ColumnsControl label={`Columns on ${breakpoint === 'tablet' ? 'tablets' : 'phones'}`} value={override ?? fallback} options={options} onChange={set} />
      <HStack gap={2} vAlign="center" justify="between">
        <Text type="supporting" color="secondary">
          {override ? 'Changed for this screen size.' : breakpoint === 'tablet' ? 'Same as desktop.' : 'Automatic.'}
        </Text>
        {override !== undefined && <Button label="Reset" size="sm" variant="ghost" onClick={() => set(undefined)} icon={<Icon icon={RotateCcw} size="sm" color="inherit" />} />}
      </HStack>
    </VStack>
  );
}
