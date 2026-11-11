'use client';

import {useRef, useState, type CSSProperties, type ReactNode} from 'react';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {Text} from '@astryxdesign/core/Text';
import {Button} from '@astryxdesign/core/Button';
import {Icon} from '@astryxdesign/core/Icon';
import {AlertTriangle, CheckCircle2, ImagePlus, Info, Lightbulb, Star} from 'lucide-react';
import type {MediaRef} from '@studio/shared';
import {studioMediaUrl} from '@studio/shared';
import {
  DEVICE_WIDTH,
  ratioValue,
  type CalloutIcon,
  type CalloutTone,
  type ComparisonConfig,
  type ComparisonSide,
  type Device,
  type DeviceMockupConfig,
  type ImageGridConfig,
  type MetricsConfig,
  type QuoteConfig,
  type Ratio,
  type ShowcaseConfig,
  type SplitConfig,
  type TimelineConfig,
  type ScreenSequenceConfig,
  type AnnotatedImageConfig,
  type BlockWidth,
  type Surface,
  type FlowDiagramConfig,
  type ResponsiveColumns,
  type ResearchInsightsConfig,
  type ChartConfig,
  DONUT_MAX,
  chartRows,
} from '@/lib/caseStudies/blocks';
import {EYEBROW_STYLE} from '@/theme/eyebrow';
import {displayX, measureDevices, roundPosition, snapAxis, spreadOf, storedX} from './deviceGeometry';

/**
 * The visual blocks, drawn once and used twice: as the live preview inside
 * the editor (with `edit`, empty slots become "Choose image" buttons and
 * pictures can be clicked to replace) and in the private preview. Layout and
 * responsive behaviour live in globals.css (.vb-*).
 */

/** In the editor: open the media library for a slot of the block. */
export type EditHooks = {pickMedia: (slot: string, kind?: 'image' | 'video' | 'any') => void};

function EmptySlot({label, onPick, ratio}: {label: string; onPick?: () => void; ratio?: Ratio}) {
  if (!onPick) return null;
  return (
    <VStack className="vb-empty" hAlign="center" vAlign="center" style={{aspectRatio: ratioValue(ratio) ?? '4 / 3'}}>
      <Button label={label} variant="secondary" size="sm" onClick={onPick} icon={<Icon icon={ImagePlus} size="sm" color="inherit" />} />
    </VStack>
  );
}

/** An image or a looping muted video from a media reference. */
export function MediaView({
  media,
  ratio,
  focus,
  fit = 'cover',
  className,
  onPick,
  emptyLabel = 'Choose image',
  sizes,
}: {
  media: MediaRef | null;
  ratio?: Ratio;
  focus?: string;
  fit?: 'cover' | 'contain';
  className?: string;
  onPick?: () => void;
  emptyLabel?: string;
  sizes?: string;
}) {
  const src = media ? studioMediaUrl(media.path) : '';
  if (!media || !src) return <EmptySlot label={emptyLabel} onPick={onPick} ratio={ratio} />;
  const style: CSSProperties = {
    aspectRatio: ratioValue(ratio) ?? (media.width && media.height ? `${media.width} / ${media.height}` : undefined),
    objectFit: ratio && ratio !== 'auto' ? fit : undefined,
    objectPosition: focus ?? media.focus ?? 'center',
  };
  const element =
    media.kind === 'video' ? (
      <video className={['vb-media', className].filter(Boolean).join(' ')} src={src} style={style} autoPlay muted loop playsInline aria-label={media.alt || undefined} />
    ) : (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        className={['vb-media', className].filter(Boolean).join(' ')}
        src={src}
        alt={media.alt}
        width={media.width ?? undefined}
        height={media.height ?? undefined}
        sizes={sizes}
        loading="lazy"
        decoding="async"
        style={style}
      />
    );
  if (!onPick) return element;
  return (
    <button type="button" className="vb-replace" onClick={onPick} aria-label="Replace this picture">
      {element}
    </button>
  );
}

function Caption({children}: {children?: string}) {
  return children?.trim() ? <figcaption className="cs-caption">{children}</figcaption> : null;
}

/**
 * Stage 4 layout options shared by several blocks: `data-block-width="wide"` widens the block to
 * the page's frame lines (like a wide showcase) and `data-block-surface` puts it on a background.
 * Nothing is added for the defaults, so older documents render exactly as before.
 */
/**
 * Columns, with the tablet and phone overrides (editor spec §9.3, T3) as CSS variables plus data
 * flags that switch them on in globals.css (tablet 768–1023px, phone below 768px).
 */
function columnAttrs(columns: number, responsive?: ResponsiveColumns) {
  const tablet = responsive?.tablet?.columns;
  const phone = responsive?.phone?.columns;
  return {
    'data-columns-tablet': tablet ? '' : undefined,
    'data-columns-phone': phone ? '' : undefined,
    style: {
      ['--vb-columns' as string]: columns,
      ...(tablet ? {['--vb-columns-tablet' as string]: tablet} : {}),
      ...(phone ? {['--vb-columns-phone' as string]: phone} : {}),
    } as CSSProperties,
  };
}

function layoutAttrs(width?: BlockWidth, surface?: Surface) {
  return {
    'data-block-width': width === 'wide' ? 'wide' : undefined,
    'data-block-surface': surface && surface !== 'none' ? surface : undefined,
  };
}

// ----------------------------------------------------------------------------
// 1. Image grid
// ----------------------------------------------------------------------------
export function ImageGrid({config, edit}: {config: ImageGridConfig; edit?: EditHooks}) {
  return (
    <figure className="vb vb-grid-block" {...layoutAttrs(config.width, config.surface)}>
      <div
        className="vb-grid"
        data-arrangement={config.arrangement}
        data-gap={config.gap}
        data-mobile-columns={config.mobileColumns ?? 2}
        {...columnAttrs(config.columns, config.responsive?.tablet ? {tablet: config.responsive.tablet} : undefined)}>
        {config.items.map((item, index) => (
          <MediaView
            key={`${item.path}-${index}`}
            media={item}
            ratio={config.arrangement === 'masonry' ? 'auto' : config.ratio}
            className="vb-grid-item"
            onPick={edit ? () => edit.pickMedia(`item:${index}`, 'image') : undefined}
            sizes={`(min-width: 1024px) ${Math.round(100 / config.columns)}vw, 100vw`}
          />
        ))}
        {edit && <EmptySlot label="Add image" ratio={config.arrangement === 'masonry' ? '4:3' : config.ratio} onPick={() => edit.pickMedia('add', 'image')} />}
      </div>
      <Caption>{config.caption}</Caption>
    </figure>
  );
}

// ----------------------------------------------------------------------------
// 2. Comparison
// ----------------------------------------------------------------------------
function Side({side, ratio, onPick, tone}: {side: ComparisonSide; ratio: Ratio; onPick?: () => void; tone: 'before' | 'after'}) {
  return (
    <VStack gap={3} className="vb-compare-side" data-tone={tone}>
      {side.label && (
        <Text type="supporting" style={{...EYEBROW_STYLE, color: tone === 'after' ? 'var(--color-brand-text)' : 'var(--color-text-secondary)'}}>
          {side.label}
        </Text>
      )}
      <MediaView media={side.media} ratio={ratio} fit="contain" onPick={onPick} />
      {side.text && (
        <Text color="secondary" textWrap="pretty">
          {side.text}
        </Text>
      )}
    </VStack>
  );
}

/**
 * Before/after slider: the "after" picture with the "before" picture over it, clipped at the
 * divider. A real range input drives it, so it works with a keyboard and screen readers.
 */
function ComparisonSlider({config}: {config: ComparisonConfig}) {
  const [reveal, setReveal] = useState(50);
  const before = config.left.label || 'Before';
  const after = config.right.label || 'After';
  const media = config.left.media ?? config.right.media;
  const ratio = ratioValue(config.ratio) ?? (media?.width && media?.height ? `${media.width} / ${media.height}` : '16 / 10');
  return (
    <figure className="vb vb-compare vb-compare--slider">
      <div className="vb-slider" style={{aspectRatio: ratio, ['--vb-reveal' as string]: `${reveal}%`}}>
        <MediaView media={config.right.media} ratio={config.ratio === 'auto' ? undefined : config.ratio} className="vb-slider-media" />
        <div className="vb-slider-before">
          <MediaView media={config.left.media} ratio={config.ratio === 'auto' ? undefined : config.ratio} className="vb-slider-media" />
        </div>
        <span className="vb-slider-label" data-side="before" aria-hidden="true">
          {before}
        </span>
        <span className="vb-slider-label" data-side="after" aria-hidden="true">
          {after}
        </span>
        <span className="vb-slider-handle" aria-hidden="true" />
        <input
          type="range"
          className="vb-slider-input"
          min={0}
          max={100}
          value={reveal}
          onChange={event => setReveal(Number(event.target.value))}
          aria-label={`Compare ${before} and ${after}: ${before} is shown on the left of the divider`}
          aria-valuetext={`${reveal}% ${before}`}
        />
      </div>
      {(config.left.text || config.right.text) && (
        <div className="vb-compare-grid">
          {[config.left, config.right].map((side, index) => (
            <VStack key={index} gap={2}>
              <Text type="supporting" style={{...EYEBROW_STYLE, color: index ? 'var(--color-brand-text)' : 'var(--color-text-secondary)'}}>
                {side.label}
              </Text>
              {side.text && (
                <Text color="secondary" textWrap="pretty">
                  {side.text}
                </Text>
              )}
            </VStack>
          ))}
        </div>
      )}
      <Caption>{config.caption}</Caption>
    </figure>
  );
}

export function Comparison({config, edit}: {config: ComparisonConfig; edit?: EditHooks}) {
  // The slider needs both pictures; until then (or when editing them) it shows side by side.
  if (config.display === 'slider' && config.left.media && config.right.media) return <ComparisonSlider config={config} />;
  return (
    <figure className="vb vb-compare" data-split={config.split} {...layoutAttrs(config.width)}>
      <div className="vb-compare-grid">
        <Side side={config.left} ratio={config.ratio} tone="before" onPick={edit ? () => edit.pickMedia('left', 'any') : undefined} />
        <Side side={config.right} ratio={config.ratio} tone="after" onPick={edit ? () => edit.pickMedia('right', 'any') : undefined} />
      </div>
      <Caption>{config.caption}</Caption>
    </figure>
  );
}

// ----------------------------------------------------------------------------
// 3. Full-bleed showcase
// ----------------------------------------------------------------------------
export function Showcase({config, edit}: {config: ShowcaseConfig; edit?: EditHooks}) {
  return (
    <figure
      className="vb vb-showcase"
      data-width={config.width === 'frame' || config.width === 'wide' ? 'frame' : 'content'}
      data-surface={config.surface}
      data-inset={config.inset}>
      <MediaView
        media={config.media}
        ratio={config.ratio}
        focus={config.focus}
        emptyLabel="Choose image or video"
        onPick={edit ? () => edit.pickMedia('media', 'any') : undefined}
        sizes="100vw"
      />
      <Caption>{config.caption}</Caption>
    </figure>
  );
}

// ----------------------------------------------------------------------------
// 4. Device mockups
// ----------------------------------------------------------------------------

function DeviceFrame({device, onPick}: {device: Device; onPick?: () => void}) {
  return (
    <div className="vb-device" data-type={device.type}>
      {device.type === 'browser' && (
        <div className="vb-device-chrome" aria-hidden>
          <i />
          <i />
          <i />
        </div>
      )}
      <div className="vb-device-screen">
        <MediaView media={device.media} ratio="auto" emptyLabel="Choose screen" onPick={onPick} />
      </div>
      {device.type === 'laptop' && <div className="vb-device-base" aria-hidden />}
    </div>
  );
}

export function DeviceMockup({
  config,
  edit,
  selectedIds,
  snap = true,
  onSelectDevice,
  onMoveDevices,
  onRotateDevice,
}: {
  config: DeviceMockupConfig;
  edit?: EditHooks;
  /** Editor only (T6): the selected devices, outlined, with a rotate handle when there's one. */
  selectedIds?: readonly string[];
  /** Editor only: snap to guides while dragging (hold Alt to drag freely). */
  snap?: boolean;
  /** Editor only: a press on a device selects it (Shift: adds or removes); returns the new selection. */
  onSelectDevice?: (id: string, additive: boolean) => readonly string[];
  /** Editor only: devices dragged on the stage; called once when they're dropped (stored x, y in %). */
  onMoveDevices?: (moves: Record<string, {x: number; y: number}>) => void;
  /** Editor only: the rotate handle was dragged (degrees, −30 to 30). */
  onRotateDevice?: (id: string, rotate: number) => void;
}) {
  const spread = spreadOf(config);
  const stageRef = useRef<HTMLDivElement | null>(null);
  // Devices being dragged and where they are now (local until dropped: one change, one undo).
  const [drag, setDrag] = useState<{moves: Record<string, {x: number; y: number}>; guides: {x: number | null; y: number | null}} | null>(null);
  const [turning, setTurning] = useState<{id: string; rotate: number} | null>(null);
  // Set when a press turned into a drag or selected a device, so its click doesn't open the picker.
  const swallowClick = useRef(false);
  const isEditor = Boolean(onSelectDevice);
  const selected = selectedIds ?? [];

  const startDrag = (event: React.PointerEvent, id: string) => {
    if (!onSelectDevice || event.button !== 0) return;
    // Keeps the editor from treating the press as text selection or a block drag.
    event.preventDefault();
    event.stopPropagation();
    const wasSelected = selected.includes(id);
    const ids = onSelectDevice(id, event.shiftKey);
    // First press selects; pressing a selected device again (and not dragging) opens its picker.
    swallowClick.current = !wasSelected || event.shiftKey;
    const stage = stageRef.current;
    const moving = config.devices.filter(device => ids.includes(device.id) && !device.locked);
    if (!stage || !onMoveDevices || !moving.length) return;
    const frame = stage.getBoundingClientRect();
    const toStage = (clientX: number, clientY: number) => ({x: ((clientX - frame.left) / frame.width) * 100, y: ((clientY - frame.top) / frame.height) * 100});
    const start = toStage(event.clientX, event.clientY);
    const startX = event.clientX;
    const startY = event.clientY;
    // Guides (§11.3): the stage's 0 / 50 / 100 % lines and the other devices' edges and centres.
    const boxes = measureDevices(stage);
    const movingIds = moving.map(device => device.id);
    const own = movingIds.map(movingId => boxes[movingId]).filter(Boolean);
    const union = own.length
      ? {left: Math.min(...own.map(b => b.left)), right: Math.max(...own.map(b => b.right)), top: Math.min(...own.map(b => b.top)), bottom: Math.max(...own.map(b => b.bottom))}
      : null;
    const others = Object.entries(boxes).filter(([boxId]) => !movingIds.includes(boxId)).map(([, box]) => box);
    const targetsX = [0, 50, 100, ...others.flatMap(box => [box.left, box.cx, box.right])];
    const targetsY = [0, 50, 100, ...others.flatMap(box => [box.top, box.cy, box.bottom])];
    let last: Record<string, {x: number; y: number}> | null = null;
    let moved = false;
    const move = (e: PointerEvent) => {
      if (!moved && Math.hypot(e.clientX - startX, e.clientY - startY) < 4) return;
      moved = true;
      swallowClick.current = true;
      const point = toStage(e.clientX, e.clientY);
      let dx = point.x - start.x;
      let dy = point.y - start.y;
      const guides = {x: null as number | null, y: null as number | null};
      if (snap && !e.altKey && union) {
        const sx = snapAxis([union.left, (union.left + union.right) / 2, union.right], targetsX, dx);
        const sy = snapAxis([union.top, (union.top + union.bottom) / 2, union.bottom], targetsY, dy);
        dx = sx.delta;
        dy = sy.delta;
        guides.x = sx.guide;
        guides.y = sy.guide;
      }
      last = Object.fromEntries(moving.map(device => [device.id, {x: roundPosition(storedX(displayX(device.x, spread) + dx, spread)), y: roundPosition(device.y + dy)}]));
      setDrag({moves: last, guides});
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      if (last) onMoveDevices(last);
      setDrag(null);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  /** The rotate handle: turn around the device's centre; Shift snaps to 15°. */
  const startTurn = (event: React.PointerEvent, id: string) => {
    if (!onRotateDevice || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const slot = (event.currentTarget as HTMLElement).closest('[data-device-id]');
    if (!slot) return;
    const rect = slot.getBoundingClientRect();
    const centre = {x: rect.left + rect.width / 2, y: rect.top + rect.height / 2};
    let last: number | null = null;
    const move = (e: PointerEvent) => {
      const degrees = (Math.atan2(e.clientY - centre.y, e.clientX - centre.x) * 180) / Math.PI + 90;
      const snapped = e.shiftKey ? Math.round(degrees / 15) * 15 : Math.round(degrees);
      last = Math.max(-30, Math.min(30, snapped));
      setTurning({id, rotate: last});
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      if (last !== null) onRotateDevice(id, last);
      setTurning(null);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  return (
    <figure className="vb vb-devices" data-surface={config.surface} data-shadow={config.shadow || undefined} data-mobile={config.mobile}>
      <div ref={stageRef} className="vb-stage" style={{aspectRatio: ratioValue(config.stageRatio) ?? '16 / 9'}}>
        {config.devices.map(device => {
          const at = drag?.moves[device.id];
          const d = {...device, ...(at ?? {}), ...(turning?.id === device.id ? {rotate: turning.rotate} : {})};
          const isSelected = selected.includes(d.id);
          const canDrag = isEditor && !device.locked;
          return (
            <div
              key={d.id}
              className="vb-device-slot"
              data-device-id={isEditor ? d.id : undefined}
              data-selected={isSelected || undefined}
              data-locked={(isEditor && device.locked) || undefined}
              data-grouped={(isEditor && isSelected && device.groupId) || undefined}
              data-draggable={canDrag || undefined}
              data-dragging={at ? '' : undefined}
              onPointerDown={isEditor ? event => startDrag(event, d.id) : undefined}
              onClickCapture={event => {
                // An empty screen's "Choose screen" button always works.
                if (!swallowClick.current || (event.target as HTMLElement).closest('.vb-empty')) return;
                swallowClick.current = false;
                event.stopPropagation();
                event.preventDefault();
              }}
              style={{
                left: `${displayX(d.x, spread)}%`,
                top: `${d.y}%`,
                width: `${DEVICE_WIDTH[d.type] * d.scale}%`,
                zIndex: d.z,
                transform: `translate(-50%, -50%) rotate(${d.rotate}deg)`,
              }}>
              <DeviceFrame device={d} onPick={edit ? () => edit.pickMedia(`device:${d.id}`, 'any') : undefined} />
              {isEditor && isSelected && selected.length === 1 && !device.locked && onRotateDevice && (
                <span className="vb-rotate-handle" title="Drag to rotate (Shift: 15° steps)" aria-hidden="true" onPointerDown={event => startTurn(event, d.id)} />
              )}
              {isEditor && device.locked && <span className="vb-lock-badge" aria-hidden="true" />}
            </div>
          );
        })}
        {drag?.guides.x !== null && drag?.guides.x !== undefined && <span className="vb-guide" data-axis="x" style={{left: `${drag.guides.x}%`}} aria-hidden="true" />}
        {drag?.guides.y !== null && drag?.guides.y !== undefined && <span className="vb-guide" data-axis="y" style={{top: `${drag.guides.y}%`}} aria-hidden="true" />}
      </div>
      <Caption>{config.caption}</Caption>
    </figure>
  );
}

// ----------------------------------------------------------------------------
// 5. Split editorial layout (text is the node's content)
// ----------------------------------------------------------------------------
export function SplitLayout({config, edit, children}: {config: SplitConfig; edit?: EditHooks; children: ReactNode}) {
  return (
    <div className="vb vb-split" data-order={config.order} data-proportion={config.proportion} data-align={config.align} {...layoutAttrs(config.width, config.surface)}>
      <div className="vb-split-media">
        <MediaView media={config.media} ratio={config.ratio} emptyLabel="Choose image or video" onPick={edit ? () => edit.pickMedia('media', 'any') : undefined} />
      </div>
      <div className="vb-split-text">{children}</div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// 6. Quote, callout, metrics
// ----------------------------------------------------------------------------
export function PullQuote({config, children}: {config: QuoteConfig; children: ReactNode}) {
  return (
    <figure className="vb vb-quote" data-style={config.style} data-text-align={config.align === 'center' ? 'center' : undefined}>
      <blockquote className="vb-quote-text">{children}</blockquote>
      {(config.attribution || config.role) && (
        <figcaption className="vb-quote-by">
          <Text weight="semibold">{config.attribution}</Text>
          {config.role && (
            <Text type="supporting" color="secondary">
              {config.role}
            </Text>
          )}
        </figcaption>
      )}
    </figure>
  );
}

const CALLOUT_ICONS = {lightbulb: Lightbulb, info: Info, alert: AlertTriangle, check: CheckCircle2, star: Star} as const;

export function Callout({tone, icon, children}: {tone: CalloutTone; icon: CalloutIcon; children: ReactNode}) {
  return (
    <HStack gap={3} vAlign="start" className="cs-callout" data-tone={tone}>
      {icon !== 'none' && <Icon icon={CALLOUT_ICONS[icon] ?? Lightbulb} size="md" color="inherit" />}
      <VStack gap={2} style={{flex: 1, minInlineSize: 0}}>
        {children}
      </VStack>
    </HStack>
  );
}

export function Metrics({config, isEditing}: {config: MetricsConfig; isEditing?: boolean}) {
  // In the preview, empty figures are left out (Results highlights start empty: no invented numbers).
  const items = config.items.filter(item => isEditing || item.value.trim() || item.label.trim());
  if (!items.length && !isEditing) return null;
  return (
    <figure
      className="vb vb-metrics"
      data-style={config.style}
      data-size={config.size === 'large' ? 'large' : undefined}
      data-text-align={config.align === 'center' ? 'center' : undefined}
      {...layoutAttrs(undefined, config.surface)}>
      <dl className="vb-metrics-grid" {...columnAttrs(config.columns, config.responsive)}>
        {items.map((item, index) => (
          <div key={index} className="vb-metric">
            <dt className="vb-metric-label" data-placeholder={(isEditing && !item.label.trim()) || undefined}>
              {item.label || (isEditing ? 'What it measures' : '')}
            </dt>
            <dd className="vb-metric-value" data-placeholder={(isEditing && !item.value.trim()) || undefined}>
              {item.value || (isEditing ? 'Figure' : '')}
            </dd>
            {item.detail && <dd className="vb-metric-detail">{item.detail}</dd>}
          </div>
        ))}
      </dl>
      <Caption>{config.caption}</Caption>
    </figure>
  );
}

// ----------------------------------------------------------------------------
// 7. Process timeline (Insert 2.0)
// ----------------------------------------------------------------------------
/** Project phases in order. Horizontal timelines stack vertically on phones. */
export function Timeline({config, isEditing}: {config: TimelineConfig; isEditing?: boolean}) {
  return (
    <figure className="vb vb-timeline" data-layout={config.layout} data-style={config.style}>
      <ol className="vb-timeline-list" style={{['--vb-count' as string]: Math.max(config.phases.length, 1)}}>
        {config.phases.map((phase, index) => (
          <li key={phase.id} className="vb-phase">
            <span className="vb-phase-marker" aria-hidden="true">
              {index + 1}
            </span>
            <div className="vb-phase-body">
              {phase.when && <p className="vb-phase-when">{phase.when}</p>}
              {(phase.title || isEditing) && <p className="vb-phase-title">{phase.title || 'Phase name'}</p>}
              {phase.text && <p className="vb-phase-text">{phase.text}</p>}
            </div>
          </li>
        ))}
      </ol>
      <Caption>{config.caption}</Caption>
    </figure>
  );
}

// ----------------------------------------------------------------------------
// 8. Screen sequence (Insert 2.0)
// ----------------------------------------------------------------------------
/** Screens in the order a person moves through them, numbered, with optional arrows. */
export function ScreenSequence({config, edit}: {config: ScreenSequenceConfig; edit?: EditHooks}) {
  return (
    <figure className="vb vb-sequence" data-frame={config.frame} data-arrows={config.arrows || undefined}>
      <ol className="vb-sequence-list" {...columnAttrs(config.columns, config.responsive)}>
        {/* In the preview, steps with nothing in them are left out (no empty frames). */}
        {config.steps.filter(step => edit || step.media || step.title || step.text).map((step, index) => (
          <li key={step.id} className="vb-step">
            {(edit || step.media) && (
            <div className="vb-step-screen" data-frame={config.frame}>
              <MediaView
                media={step.media}
                ratio={config.ratio}
                emptyLabel="Choose screen"
                onPick={edit ? () => edit.pickMedia(`step:${step.id}`, 'any') : undefined}
                sizes={`(min-width: 1024px) ${Math.round(100 / config.columns)}vw, 50vw`}
              />
            </div>
            )}
            <p className="vb-step-title">
              <span className="vb-step-number" aria-hidden="true">
                {index + 1}
              </span>
              {step.title}
            </p>
            {step.text && <p className="vb-step-text">{step.text}</p>}
          </li>
        ))}
      </ol>
      <Caption>{config.caption}</Caption>
    </figure>
  );
}

// ----------------------------------------------------------------------------
// 9. Annotated screenshot (Insert 2.0)
// ----------------------------------------------------------------------------
/**
 * An image with numbered markers and the matching numbered notes. The notes carry the meaning
 * (markers are decorative), so screen readers get the full explanation in order.
 */
export function AnnotatedImage({
  config,
  edit,
  onAddAnnotation,
  selectedId,
}: {
  config: AnnotatedImageConfig;
  edit?: EditHooks;
  /** Editor only: clicking the image adds a marker there (x, y in %). */
  onAddAnnotation?: (x: number, y: number) => void;
  selectedId?: string;
}) {
  const hasMedia = Boolean(config.media);
  return (
    <figure className="vb vb-annotated" data-notes={config.notes}>
      <div className="vb-annotated-stage">
        <MediaView
          media={config.media}
          ratio={config.ratio}
          emptyLabel="Choose screenshot"
          onPick={edit && !hasMedia ? () => edit.pickMedia('image', 'image') : undefined}
        />
        {hasMedia &&
          config.annotations.map((annotation, index) => (
            <span
              key={annotation.id}
              className="vb-marker"
              data-selected={annotation.id === selectedId || undefined}
              style={{insetInlineStart: `${annotation.x}%`, insetBlockStart: `${annotation.y}%`}}
              aria-hidden="true">
              {index + 1}
            </span>
          ))}
        {hasMedia && onAddAnnotation && (
          <button
            type="button"
            className="vb-annotated-hit"
            aria-label="Add a note at this point of the screenshot"
            onClick={event => {
              const box = event.currentTarget.getBoundingClientRect();
              const clamp = (value: number) => Math.round(Math.min(97, Math.max(3, value)));
              onAddAnnotation(clamp(((event.clientX - box.left) / box.width) * 100), clamp(((event.clientY - box.top) / box.height) * 100));
            }}
          />
        )}
      </div>
      {config.annotations.length > 0 && (
        <ol className="vb-annotations">
          {config.annotations.map((annotation, index) => (
            <li key={annotation.id} className="vb-annotation">
              <span className="vb-marker vb-marker--static" aria-hidden="true">
                {index + 1}
              </span>
              <div>
                {annotation.title && <p className="vb-annotation-title">{annotation.title}</p>}
                {annotation.text && <p className="vb-annotation-text">{annotation.text}</p>}
              </div>
            </li>
          ))}
        </ol>
      )}
      <Caption>{config.caption}</Caption>
    </figure>
  );
}

// ----------------------------------------------------------------------------
// 10. Flow diagram (Insert 2.0)
// ----------------------------------------------------------------------------
/** A user or system flow: start, steps, decisions and end, joined by labelled arrows. */
export function FlowDiagram({config}: {config: FlowDiagramConfig}) {
  return (
    <figure className="vb vb-flow" data-direction={config.direction}>
      <ol className="vb-flow-list">
        {config.nodes.map((node, index) => (
          <li key={node.id} className="vb-flow-item">
            <span className="vb-flow-node" data-kind={node.kind}>
              <span className="vb-flow-label">{node.label || '…'}</span>
            </span>
            {index < config.nodes.length - 1 && (
              <span className="vb-flow-arrow">
                {node.next ? <span className="vb-flow-arrow-label">{node.next}</span> : <span className="vb-visually-hidden">then</span>}
              </span>
            )}
          </li>
        ))}
      </ol>
      <Caption>{config.caption}</Caption>
    </figure>
  );
}

// ----------------------------------------------------------------------------
// 10. Research insights (T4)
// ----------------------------------------------------------------------------
/** Findings as a list of cards: the finding, what it's based on, and where it came from. */
export function ResearchInsights({config, isEditing}: {config: ResearchInsightsConfig; isEditing?: boolean}) {
  // In the preview, insights without a finding are left out.
  const insights = config.insights.filter(insight => isEditing || insight.finding.trim());
  if (!insights.length) return null;
  return (
    <figure className="vb vb-insights" data-layout={config.layout}>
      <ul className="vb-insights-list" style={{['--vb-columns' as string]: config.layout === 'list' ? 1 : config.columns}}>
        {insights.map((insight, index) => (
          <li key={insight.id} className="vb-insight">
            {config.numbered && <p className="vb-insight-number">Insight {index + 1}</p>}
            <p className="vb-insight-finding" data-placeholder={!insight.finding.trim() || undefined}>
              {insight.finding.trim() || 'What you found'}
            </p>
            {(insight.evidence.trim() || isEditing) && (
              <p className="vb-insight-evidence" data-placeholder={!insight.evidence.trim() || undefined}>
                {insight.evidence.trim() || 'What it’s based on: a quote, a number or an observation'}
              </p>
            )}
            {insight.source.trim() && <p className="vb-insight-source">Source: {insight.source}</p>}
          </li>
        ))}
      </ul>
      <Caption>{config.caption}</Caption>
    </figure>
  );
}

// ----------------------------------------------------------------------------
// 11. Chart (T4): bars, a line, a donut or progress bars, from the author's own figures.
//     Follows the data-viz method: thin marks with rounded ends from the baseline, one series in
//     brand purple, a validated five-colour order for donut parts (purple, mint, orange, slate,
//     pink; parts beyond five are grouped as Other), text in text colours, a legend for parts,
//     a hover layer, and the figures as a table for screen readers and anyone who wants them.
// ----------------------------------------------------------------------------
type Row = {label: string; value: number};
const NUMBER = new Intl.NumberFormat('en-GB', {maximumFractionDigits: 2});
const formatValue = (value: number, unit: string) => `${NUMBER.format(value)}${unit}`;
/** A round number at or above `max` for the axis (1, 2, 2.5, 5 × 10ⁿ). */
function niceMax(max: number) {
  if (max <= 0) return 1;
  const power = 10 ** Math.floor(Math.log10(max));
  const step = [1, 2, 2.5, 5, 10].find(candidate => candidate * power >= max) ?? 10;
  return step * power;
}

export function Chart({config, isEditing}: {config: ChartConfig; isEditing?: boolean}) {
  const rows: Row[] = chartRows(config);
  if (!rows.length) {
    return isEditing ? (
      <figure className="vb vb-chart" data-empty="">
        <p className="vb-chart-empty">Add each label and its value in the Block panel. A chart shows only the figures you enter.</p>
      </figure>
    ) : null;
  }
  const label = config.summary.trim() || config.title.trim() || 'Chart';
  return (
    <figure className="vb vb-chart" data-kind={config.kind}>
      {config.title.trim() && <p className="vb-chart-title">{config.title}</p>}
      <div className="vb-chart-plot" role="img" aria-label={label}>
        {config.kind === 'bar' && <BarChart rows={rows} unit={config.unit} />}
        {config.kind === 'progress' && <ProgressChart rows={rows} unit={config.unit} target={config.target} />}
        {config.kind === 'line' && <LineChart rows={rows} unit={config.unit} />}
        {config.kind === 'donut' && <DonutChart rows={rows} unit={config.unit} />}
      </div>
      <details className="vb-chart-table">
        <summary>Show the figures as a table</summary>
        <table className="cs-table">
          <thead>
            <tr>
              <th scope="col">Label</th>
              <th scope="col">Value</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index}>
                <th scope="row">{row.label}</th>
                <td>{formatValue(row.value, config.unit)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
      {config.source.trim() && <p className="vb-chart-source">Source: {config.source}</p>}
      <Caption>{config.caption}</Caption>
    </figure>
  );
}

/** Horizontal bars from a zero baseline, with each value at the end of its bar. */
function BarChart({rows, unit}: {rows: Row[]; unit: string}) {
  const max = Math.max(...rows.map(row => row.value), 0) || 1;
  return (
    <div className="vb-bars" aria-hidden="true">
      {rows.map((row, index) => (
        <div key={index} className="vb-bar-row" title={`${row.label}: ${formatValue(row.value, unit)}`}>
          <span className="vb-bar-label">{row.label}</span>
          <span className="vb-bar-track">
            <span className="vb-bar" style={{inlineSize: `${(Math.max(row.value, 0) / max) * 100}%`}} />
          </span>
          <span className="vb-bar-value">{formatValue(row.value, unit)}</span>
        </div>
      ))}
    </div>
  );
}

/** Progress towards a target: a track for the whole, a fill for the value. */
function ProgressChart({rows, unit, target}: {rows: Row[]; unit: string; target: number}) {
  const whole = target > 0 ? target : 100;
  return (
    <div className="vb-progress" aria-hidden="true">
      {rows.map((row, index) => (
        <div key={index} className="vb-progress-row" title={`${row.label}: ${formatValue(row.value, unit)} of ${formatValue(whole, unit)}`}>
          <span className="vb-progress-label">{row.label}</span>
          <span className="vb-progress-value">{formatValue(row.value, unit)}</span>
          <span className="vb-progress-track">
            <span className="vb-progress-fill" style={{inlineSize: `${Math.min(Math.max(row.value / whole, 0), 1) * 100}%`}} />
          </span>
        </div>
      ))}
    </div>
  );
}

/** One line over the labels in order, a 2px line with 8px markers; hover shows each point. */
function LineChart({rows, unit}: {rows: Row[]; unit: string}) {
  const [active, setActive] = useState<number | null>(null);
  const width = 640;
  const height = 260;
  const pad = {top: 16, right: 24, bottom: 32, left: 56};
  const low = Math.min(0, ...rows.map(row => row.value));
  const high = niceMax(Math.max(...rows.map(row => row.value), 0));
  const x = (index: number) => pad.left + (rows.length === 1 ? (width - pad.left - pad.right) / 2 : (index / (rows.length - 1)) * (width - pad.left - pad.right));
  const y = (value: number) => pad.top + (1 - (value - low) / (high - low || 1)) * (height - pad.top - pad.bottom);
  const ticks = [0, 0.5, 1].map(step => low + (high - low) * step);
  const every = Math.ceil(rows.length / 8);
  const last = rows.length - 1;
  const step = rows.length > 1 ? (width - pad.left - pad.right) / (rows.length - 1) : width;
  return (
    <div className="vb-line" onPointerLeave={() => setActive(null)}>
      <svg viewBox={`0 0 ${width} ${height}`} className="vb-line-svg" aria-hidden="true">
        {ticks.map(tick => (
          <g key={tick}>
            <line className="vb-chart-grid" x1={pad.left} x2={width - pad.right} y1={y(tick)} y2={y(tick)} />
            <text className="vb-chart-axis" x={pad.left - 8} y={y(tick)} textAnchor="end" dominantBaseline="middle">
              {formatValue(tick, unit)}
            </text>
          </g>
        ))}
        {rows.map((row, index) =>
          index % every === 0 || index === last ? (
            <text key={`x${index}`} className="vb-chart-axis" x={x(index)} y={height - 8} textAnchor={index === 0 && rows.length > 1 ? 'start' : index === last && rows.length > 1 ? 'end' : 'middle'}>
              {row.label}
            </text>
          ) : null,
        )}
        {active !== null && <line className="vb-chart-crosshair" x1={x(active)} x2={x(active)} y1={pad.top} y2={height - pad.bottom} />}
        <polyline className="vb-line-path" points={rows.map((row, index) => `${x(index)},${y(row.value)}`).join(' ')} />
        {rows.map((row, index) => (
          <circle key={`p${index}`} className="vb-line-point" data-active={active === index || undefined} cx={x(index)} cy={y(row.value)} r={active === index ? 6 : 4} />
        ))}
        {/* The latest value, labelled directly (one label, not one per point). */}
        <text className="vb-chart-value" x={x(last)} y={y(rows[last].value) - 12} textAnchor={rows.length > 1 ? 'end' : 'middle'}>
          {formatValue(rows[last].value, unit)}
        </text>
        {/* Hit targets wider than the marks. */}
        {rows.map((_, index) => (
          <rect key={`h${index}`} className="vb-chart-hit" x={x(index) - step / 2} y={pad.top} width={step} height={height - pad.top - pad.bottom} onPointerEnter={() => setActive(index)} />
        ))}
      </svg>
      {active !== null && (
        <div className="vb-chart-tip" style={{insetInlineStart: `${(x(active) / width) * 100}%`, insetBlockStart: `${(y(rows[active].value) / height) * 100}%`}}>
          <span className="vb-chart-tip-label">{rows[active].label}</span>
          <span className="vb-chart-tip-value">{formatValue(rows[active].value, unit)}</span>
        </div>
      )}
    </div>
  );
}

/** Parts of a whole: up to five coloured parts (the rest grouped as Other) and a legend. */
function DonutChart({rows, unit}: {rows: Row[]; unit: string}) {
  const [active, setActive] = useState<number | null>(null);
  const positive = rows.filter(row => row.value > 0);
  const parts = positive.length > DONUT_MAX ? [...positive.slice(0, DONUT_MAX - 1), {label: 'Other', value: positive.slice(DONUT_MAX - 1).reduce((sum, row) => sum + row.value, 0)}] : positive;
  const total = parts.reduce((sum, row) => sum + row.value, 0) || 1;
  const radius = 80;
  const thickness = 28;
  const centre = 100;
  // Each part starts where the parts before it end, from 12 o'clock, clockwise.
  const arcs = parts.map((part, index) => {
    const before = parts.slice(0, index).reduce((sum, row) => sum + row.value, 0);
    const start = -Math.PI / 2 + (before / total) * Math.PI * 2;
    return {part, start, end: start + (part.value / total) * Math.PI * 2};
  });
  const point = (theta: number) => [centre + radius * Math.cos(theta), centre + radius * Math.sin(theta)];
  const percent = (value: number) => `${NUMBER.format(Math.round((value / total) * 1000) / 10)}%`;
  return (
    <div className="vb-donut" onPointerLeave={() => setActive(null)}>
      <svg viewBox="0 0 200 200" className="vb-donut-svg" aria-hidden="true">
        {arcs.length === 1 ? (
          <circle cx={centre} cy={centre} r={radius} className="vb-donut-part" data-slot={1} style={{strokeWidth: thickness}} />
        ) : (
          arcs.map(({part, start, end}, index) => {
            // A 2px gap between parts: trim each arc by about 1px at either end.
            const trim = 1 / radius;
            const [x1, y1] = point(start + trim);
            const [x2, y2] = point(end - trim);
            const large = end - start > Math.PI ? 1 : 0;
            return (
              <path
                key={index}
                d={`M ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2}`}
                className="vb-donut-part"
                data-slot={part.label === 'Other' && index === DONUT_MAX - 1 && positive.length > DONUT_MAX ? 'other' : index + 1}
                data-dim={active !== null && active !== index ? '' : undefined}
                style={{strokeWidth: active === index ? thickness + 4 : thickness}}
                onPointerEnter={() => setActive(index)}
              />
            );
          })
        )}
        {active !== null && (
          <text x={centre} y={centre} textAnchor="middle" dominantBaseline="middle" className="vb-donut-centre">
            {percent(parts[active].value)}
          </text>
        )}
      </svg>
      <ul className="vb-legend">
        {parts.map((part, index) => (
          <li key={index} className="vb-legend-item" data-active={active === index || undefined} onPointerEnter={() => setActive(index)}>
            <span className="vb-legend-swatch" data-slot={part.label === 'Other' && index === DONUT_MAX - 1 && positive.length > DONUT_MAX ? 'other' : index + 1} />
            <span className="vb-legend-label">{part.label}</span>
            <span className="vb-legend-value">
              {/* Values already in per cent don't need their share repeated. */}
              {unit.trim() === '%' ? formatValue(part.value, unit) : `${formatValue(part.value, unit)} · ${percent(part.value)}`}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
