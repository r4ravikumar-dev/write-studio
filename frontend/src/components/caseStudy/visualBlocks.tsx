'use client';

import type {CSSProperties, ReactNode} from 'react';
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

// ----------------------------------------------------------------------------
// 1. Image grid
// ----------------------------------------------------------------------------
export function ImageGrid({config, edit}: {config: ImageGridConfig; edit?: EditHooks}) {
  return (
    <figure className="vb vb-grid-block">
      <div
        className="vb-grid"
        data-arrangement={config.arrangement}
        data-gap={config.gap}
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

export function Comparison({config, edit}: {config: ComparisonConfig; edit?: EditHooks}) {
  return (
    <figure className="vb vb-compare" data-split={config.split}>
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

export function DeviceMockup({config, edit, selectedId}: {config: DeviceMockupConfig; edit?: EditHooks; selectedId?: string}) {
  const spread = SPACING[config.spacing] ?? 1;
  return (
    <figure className="vb vb-devices" data-surface={config.surface} data-shadow={config.shadow || undefined} data-mobile={config.mobile}>
      <div className="vb-stage" style={{aspectRatio: ratioValue(config.stageRatio) ?? '16 / 9'}}>
        {config.devices.map(d => (
          <div
            key={d.id}
            className="vb-device-slot"
            data-selected={selectedId === d.id || undefined}
            style={{
              left: `${50 + (d.x - 50) * spread}%`,
              top: `${d.y}%`,
              width: `${DEVICE_WIDTH[d.type] * d.scale}%`,
              zIndex: d.z,
              transform: `translate(-50%, -50%) rotate(${d.rotate}deg)`,
            }}>
            <DeviceFrame device={d} onPick={edit ? () => edit.pickMedia(`device:${d.id}`, 'any') : undefined} />
          </div>
        ))}
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
    <div className="vb vb-split" data-order={config.order} data-proportion={config.proportion} data-align={config.align}>
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
    <figure className="vb vb-quote" data-style={config.style}>
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
    <figure className="vb vb-metrics" data-style={config.style}>
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
