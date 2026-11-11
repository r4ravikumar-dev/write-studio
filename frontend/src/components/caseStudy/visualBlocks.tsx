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
} from '@/lib/caseStudies/blocks';
import {EYEBROW_STYLE} from '@/theme/eyebrow';

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
        style={{['--vb-columns' as string]: config.columns}}>
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
const SPACING = {tight: 0.8, normal: 1, loose: 1.2} as const;

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
  selectedId,
  onMoveDevice,
}: {
  config: DeviceMockupConfig;
  edit?: EditHooks;
  selectedId?: string;
  /** Editor only: drag a device on the stage; called once when it's dropped (x, y in %). */
  onMoveDevice?: (id: string, x: number, y: number) => void;
}) {
  const spread = SPACING[config.spacing] ?? 1;
  const stageRef = useRef<HTMLDivElement | null>(null);
  // The device being dragged and where it is now (local until dropped: one change, one undo).
  const [drag, setDrag] = useState<{id: string; x: number; y: number} | null>(null);
  // Set when a press turned into a drag, so the click that ends it doesn't open the picker.
  const dragged = useRef(false);

  const startDrag = (event: React.PointerEvent, id: string) => {
    if (!onMoveDevice || event.button !== 0) return;
    // Keeps the editor from treating the press as text selection or a block drag.
    event.preventDefault();
    event.stopPropagation();
    dragged.current = false;
    const startX = event.clientX;
    const startY = event.clientY;
    const device = config.devices.find(d => d.id === id);
    const stageAtStart = stageRef.current?.getBoundingClientRect();
    if (!device || !stageAtStart) return;
    // Where the pointer is in stage %, so the device keeps the point you grabbed under the pointer.
    const toStage = (clientX: number, clientY: number, stage: DOMRect) => ({
      x: 50 + (((clientX - stage.left) / stage.width) * 100 - 50) / spread,
      y: ((clientY - stage.top) / stage.height) * 100,
    });
    const grab = toStage(startX, startY, stageAtStart);
    const offset = {x: grab.x - device.x, y: grab.y - device.y};
    let last: {x: number; y: number} | null = null;
    const move = (e: PointerEvent) => {
      const stage = stageRef.current?.getBoundingClientRect();
      if (!stage) return;
      if (!dragged.current && Math.hypot(e.clientX - startX, e.clientY - startY) < 4) return;
      dragged.current = true;
      const clamp = (value: number) => Math.round(Math.min(100, Math.max(0, value)));
      const point = toStage(e.clientX, e.clientY, stage);
      last = {x: clamp(point.x - offset.x), y: clamp(point.y - offset.y)};
      setDrag({id, ...last});
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      if (last) onMoveDevice(id, last.x, last.y);
      setDrag(null);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  return (
    <figure className="vb vb-devices" data-surface={config.surface} data-shadow={config.shadow || undefined} data-mobile={config.mobile}>
      <div ref={stageRef} className="vb-stage" style={{aspectRatio: ratioValue(config.stageRatio) ?? '16 / 9'}}>
        {config.devices.map(device => {
          const d = drag?.id === device.id ? {...device, x: drag.x, y: drag.y} : device;
          const canDrag = Boolean(onMoveDevice) && !device.locked;
          return (
          <div
            key={d.id}
            className="vb-device-slot"
            data-selected={selectedId === d.id || undefined}
            data-draggable={canDrag || undefined}
            data-dragging={drag?.id === d.id || undefined}
            onPointerDown={canDrag ? event => startDrag(event, d.id) : undefined}
            onClickCapture={event => {
              if (!dragged.current) return;
              dragged.current = false;
              event.stopPropagation();
              event.preventDefault();
            }}
            style={{
              left: `${50 + (d.x - 50) * spread}%`,
              top: `${d.y}%`,
              width: `${DEVICE_WIDTH[d.type] * d.scale}%`,
              zIndex: d.z,
              transform: `translate(-50%, -50%) rotate(${d.rotate}deg)`,
            }}>
            <DeviceFrame device={d} onPick={edit ? () => edit.pickMedia(`device:${d.id}`, 'any') : undefined} />
          </div>
          );
        })}
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

export function Metrics({config}: {config: MetricsConfig}) {
  return (
    <figure
      className="vb vb-metrics"
      data-style={config.style}
      data-size={config.size === 'large' ? 'large' : undefined}
      data-text-align={config.align === 'center' ? 'center' : undefined}
      {...layoutAttrs(undefined, config.surface)}>
      <dl className="vb-metrics-grid" style={{['--vb-columns' as string]: config.columns}}>
        {config.items.map((item, index) => (
          <div key={index} className="vb-metric">
            <dt className="vb-metric-label">{item.label}</dt>
            <dd className="vb-metric-value">{item.value}</dd>
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
      <ol className="vb-sequence-list" style={{['--vb-columns' as string]: config.columns}}>
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
