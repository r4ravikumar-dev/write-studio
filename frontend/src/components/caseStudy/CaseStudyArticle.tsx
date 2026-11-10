import type {JSONContent} from '@tiptap/core';
import {renderToReactElement} from '@tiptap/static-renderer';
import {VStack} from '@astryxdesign/core/Layout';
import {Heading} from '@astryxdesign/core/Heading';
import {Text} from '@astryxdesign/core/Text';
import {caseStudyExtensions} from './schema';
import {EmbedBlock, FileBlock, VideoBlock} from './blocks';
import {
  Callout,
  Comparison,
  DeviceMockup,
  ImageGrid,
  Metrics,
  PullQuote,
  Showcase,
  SplitLayout,
} from './visualBlocks';
import {studioMediaUrl} from '@studio/shared';
import {
  defaultComparison,
  defaultDeviceMockup,
  defaultImageGrid,
  defaultMetrics,
  defaultQuote,
  defaultShowcase,
  defaultSplit,
  type CalloutIcon,
  type CalloutTone,
} from '@/lib/caseStudies/blocks';
import {typeRole} from '@/theme/typeScale';

type Attrs = Record<string, unknown>;
type RenderProps = {node: {attrs?: Attrs; type?: {name: string}}; children?: React.ReactNode};

const align = (attrs?: Attrs) =>
  typeof attrs?.textAlign === 'string' && attrs.textAlign !== 'left'
    ? {textAlign: attrs.textAlign as React.CSSProperties['textAlign']}
    : undefined;

/** Only web, mail and in-site links survive; anything else renders as plain text. */
const safeHref = (href: unknown) =>
  typeof href === 'string' && /^(https?:|mailto:|\/|#)/i.test(href) ? href : undefined;

/** Stored uploads (by path) and older https URLs; anything else shows nothing. */
const safeSrc = (src: unknown) => (typeof src === 'string' ? studioMediaUrl(src) : '');

/** A block's configuration merged over its defaults, so older documents still render. */
function configOf<T extends object>(attrs: Attrs | undefined, defaults: () => T): T {
  const config = attrs?.config;
  return {...defaults(), ...(config && typeof config === 'object' ? (config as Partial<T>) : {})};
}

/**
 * A case study's body, rendered on the server from its saved document into
 * the site's own type and blocks: section headings at the shared section
 * size, body text, images, files, video, Figma and callouts. No raw HTML is
 * ever injected.
 */
export function CaseStudyArticle({content}: {content: JSONContent}) {
  const body = renderToReactElement({
    content,
    extensions: caseStudyExtensions,
    options: {
      nodeMapping: {
        // Tables scroll sideways inside the column when they're wider than it.
        table: ({children}: RenderProps) => (
          <figure className="tableWrapper cs-table-wrap">
            <table className="cs-table">
              <tbody>{children}</tbody>
            </table>
          </figure>
        ),
        // A checklist on the live page is a record of what was done, not a form.
        taskItem: ({node, children}: RenderProps) => {
          const checked = Boolean(node.attrs?.checked);
          return (
            <li data-type="taskItem" data-checked={String(checked)}>
              <label>
                <input
                  type="checkbox"
                  checked={checked}
                  readOnly
                  disabled
                  aria-label={checked ? 'Done' : 'Not done'}
                />
              </label>
              <div>{children}</div>
            </li>
          );
        },
        heading: ({node, children}: RenderProps) => {
          const level = Number(node.attrs?.level ?? 2);
          const role = level <= 2 ? 'section-title' : level === 3 ? 'headline-l' : 'headline-s';
          return (
            <Heading
              level={(level <= 2 ? 2 : level) as 2 | 3 | 4}
              textWrap="balance"
              className={level <= 2 ? 'cs-section-heading' : 'cs-heading'}
              style={{
                ...typeRole(role),
                ...align(node.attrs),
              }}>
              {children}
            </Heading>
          );
        },
        paragraph: ({node, children}: RenderProps) => (
          <Text
            as="p"
            type="large"
            display="block"
            className="cs-paragraph"
            style={align(node.attrs)}>
            {children}
          </Text>
        ),
        image: ({node}: RenderProps) => {
          const src = safeSrc(node.attrs?.src);
          if (!src) return null;
          const caption = typeof node.attrs?.title === 'string' ? node.attrs.title : '';
          return (
            <figure className="cs-media">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="cs-image"
                src={src}
                alt={String(node.attrs?.alt ?? '')}
                width={Number(node.attrs?.width) || undefined}
                height={Number(node.attrs?.height) || undefined}
                loading="lazy"
                decoding="async"
              />
              {caption && <figcaption className="cs-caption">{caption}</figcaption>}
            </figure>
          );
        },
        fileAttachment: ({node}: RenderProps) => {
          const src = safeSrc(node.attrs?.src);
          if (!src) return null;
          return (
            <FileBlock
              src={src}
              name={String(node.attrs?.name ?? 'File')}
              size={Number(node.attrs?.size ?? 0)}
              mime={String(node.attrs?.mime ?? '')}
              preview={Boolean(node.attrs?.preview)}
            />
          );
        },
        videoFile: ({node}: RenderProps) => {
          const src = safeSrc(node.attrs?.src);
          return src ? <VideoBlock src={src} caption={String(node.attrs?.caption ?? '')} /> : null;
        },
        embed: ({node}: RenderProps) => (
          <EmbedBlock
            src={String(node.attrs?.src ?? '')}
            caption={String(node.attrs?.caption ?? '')}
          />
        ),
        callout: ({node, children}: RenderProps) => (
          <Callout
            tone={(node.attrs?.tone as CalloutTone) ?? 'brand'}
            icon={(node.attrs?.icon as CalloutIcon) ?? 'lightbulb'}>
            {children}
          </Callout>
        ),
        imageGrid: ({node}: RenderProps) => (
          <ImageGrid config={configOf(node.attrs, defaultImageGrid)} />
        ),
        comparison: ({node}: RenderProps) => (
          <Comparison config={configOf(node.attrs, defaultComparison)} />
        ),
        showcase: ({node}: RenderProps) => (
          <Showcase config={configOf(node.attrs, defaultShowcase)} />
        ),
        deviceMockup: ({node}: RenderProps) => (
          <DeviceMockup config={configOf(node.attrs, defaultDeviceMockup)} />
        ),
        metrics: ({node}: RenderProps) => <Metrics config={configOf(node.attrs, defaultMetrics)} />,
        splitLayout: ({node, children}: RenderProps) => (
          <SplitLayout config={configOf(node.attrs, defaultSplit)}>{children}</SplitLayout>
        ),
        pullQuote: ({node, children}: RenderProps) => (
          <PullQuote config={configOf(node.attrs, defaultQuote)}>{children}</PullQuote>
        ),
      },
      markMapping: {
        link: ({mark, children}: {mark: {attrs?: Attrs}; children?: React.ReactNode}) => {
          const href = safeHref(mark.attrs?.href);
          if (!href) return <>{children}</>;
          const isExternal = /^https?:/i.test(href);
          return (
            <a
              href={href}
              className="cs-link"
              target={isExternal ? '_blank' : undefined}
              rel={isExternal ? 'noopener noreferrer' : undefined}>
              {children}
            </a>
          );
        },
      },
    },
  });

  return (
    <VStack gap={0} className="cs-prose cs-article">
      {body}
    </VStack>
  );
}
