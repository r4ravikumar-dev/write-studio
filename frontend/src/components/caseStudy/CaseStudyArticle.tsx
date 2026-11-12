import {Fragment} from 'react';
import type {JSONContent} from '@tiptap/core';
import {renderToReactElement} from '@tiptap/static-renderer';
import {checkDocument} from './documentCheck';
import {highlightToReact, languageLabel} from './highlight';
import {SHELL_PROMPTS} from './structuredBlocks';
import {VStack} from '@astryxdesign/core/Layout';
import {Heading} from '@astryxdesign/core/Heading';
import {Text} from '@astryxdesign/core/Text';
import {caseStudyExtensions} from './schema';
import {EmbedBlock, FileBlock, VideoBlock} from './blocks';
import {Callout} from './visualBlocks';
import {visualNodeMapping} from './blockRenderers';
import {BLOCK_CONTRACTS, frameworkSection, hasContent, isSectionHeading, studioMediaUrl, type BlockName} from '@studio/shared';
import {
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


/**
 * A case study's body, rendered on the server from its saved document into
 * the site's own type and blocks: section headings at the shared section
 * size, body text, images, files, video, Figma and callouts. No raw HTML is
 * ever injected.
 */
export function CaseStudyArticle({content: stored}: {content: JSONContent}) {
  // Block contract B2: blocks this version can't draw become a short notice instead of an error page.
  const check = checkDocument(stored);
  if (!check.ok) {
    return (
      <p className="cs-unknown-block" role="note">
        This document can’t be shown by this version of Case Study Studio. It is safe and unchanged; reload the page in a little while.
      </p>
    );
  }
  const content = check.content;
  // Each story section (a top-level section heading and what follows it) becomes a <section>;
  // anything before the first one is rendered on its own. Section metadata isn't rendered.
  const chunks: {key: string; isSection: boolean; nodes: JSONContent[]}[] = [];
  // Callouts with no text (an unfilled Problem callout or Key takeaway card) and Phase 3 blocks
  // left empty (a terminal with no command, a requirement list with no requirement) are left out.
  const nodes = (content.content ?? []).filter(node => !(node.type === 'callout' || BLOCK_CONTRACTS[node.type as BlockName]?.enforced) || hasContent(node));
  for (const node of nodes) {
    if (isSectionHeading(node)) chunks.push({key: String(node.attrs?.sectionId ?? chunks.length), isSection: true, nodes: [node]});
    else if (chunks.length) chunks[chunks.length - 1].nodes.push(node);
    else chunks.push({key: 'intro', isSection: false, nodes: [node]});
  }
  // A framework section left on its placeholder title but written in reads under that title;
  // a section with nothing in it at all is left out.
  const shown = chunks
    .map(chunk => {
      if (!chunk.isSection) return chunk;
      const [heading, ...body] = chunk.nodes;
      if (hasContent(heading)) return chunk;
      if (!body.some(hasContent)) return null;
      const title = frameworkSection(heading.attrs?.section)?.title;
      return title ? {...chunk, nodes: [{...heading, content: [{type: 'text', text: title}]}, ...body]} : chunk;
    })
    .filter((chunk): chunk is (typeof chunks)[number] => chunk !== null);
  return (
    <VStack gap={0} className="cs-prose cs-article">
      {shown.map(chunk =>
        chunk.isSection ? (
          <section key={chunk.key} className="cs-section">
            {renderNodes({type: 'doc', content: chunk.nodes})}
          </section>
        ) : (
          <Fragment key={chunk.key}>{renderNodes({type: 'doc', content: chunk.nodes})}</Fragment>
        ),
      )}
    </VStack>
  );
}

function renderNodes(content: JSONContent) {
  return renderToReactElement({
    content,
    extensions: caseStudyExtensions,
    options: {
      nodeMapping: {
        // Phase 3 blocks: code highlighted (text stays React text, so escaped), the terminal's
        // prompt drawn but never part of the text, parameters as a real table with headers.
        codeBlock: ({node}: RenderProps) => {
          const attrs = node.attrs ?? {};
          const code = (node as {textContent?: string}).textContent ?? '';
          const lines = code.split('\n').length;
          return (
            <figure className="cs-code" data-language={String(attrs.language ?? '') || undefined}>
              <figcaption className="cs-code-head">{String(attrs.title || '') || languageLabel(attrs.language)}</figcaption>
              <pre data-line-numbers={String(Boolean(attrs.lineNumbers))} data-wrap={String(Boolean(attrs.wrap))}>
                {attrs.lineNumbers ? (
                  <span className="cs-code-lines" aria-hidden="true">
                    {Array.from({length: lines}, (_, index) => `${index + 1}\n`).join('')}
                  </span>
                ) : null}
                <code className={attrs.language ? `language-${String(attrs.language)}` : undefined}>{highlightToReact(code, attrs.language)}</code>
              </pre>
            </figure>
          );
        },
        terminal: ({node, children}: RenderProps) => {
          const shell = String(node.attrs?.shell ?? 'bash');
          const prompt = String(node.attrs?.prompt || SHELL_PROMPTS[shell] || '$');
          return (
            <div className="cs-terminal" data-shell={shell} style={{'--cs-prompt': JSON.stringify(`${prompt} `)} as React.CSSProperties}>
              <p className="cs-terminal-head">{shell === 'powershell' ? 'PowerShell' : shell === 'cmd' ? 'Command Prompt' : 'Terminal'}</p>
              {children}
            </div>
          );
        },
        parameterTable: ({node, children}: RenderProps) => (
          <figure className="cs-params-wrap">
            <table className="cs-params-table" data-show-required={String(node.attrs?.showRequired !== false)} data-show-default={String(node.attrs?.showDefault !== false)}>
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Type</th>
                  <th scope="col" className="cs-param-required">Required</th>
                  <th scope="col" className="cs-param-default">Default</th>
                  <th scope="col">Description</th>
                </tr>
              </thead>
              <tbody>{children}</tbody>
            </table>
          </figure>
        ),
        parameter: ({node, children}: RenderProps) => {
          const attrs = node.attrs ?? {};
          return (
            <tr>
              <th scope="row">
                <code>{String(attrs.name || '—')}</code>
              </th>
              <td>{String(attrs.type ?? '')}</td>
              <td className="cs-param-required">{attrs.required ? 'Required' : 'Optional'}</td>
              <td className="cs-param-default">{attrs.default ? <code>{String(attrs.default)}</code> : '—'}</td>
              <td>{children}</td>
            </tr>
          );
        },
        unknownBlock: () => (
          <p className="cs-unknown-block" role="note">
            This block needs a newer version of Case Study Studio. It is kept as it was.
          </p>
        ),
        // Tables scroll sideways inside the column when they're wider than it.
        table: ({node, children}: RenderProps) => (
          <figure className="tableWrapper cs-table-wrap">
            <table
              className="cs-table"
              data-tablestyle={String(node.attrs?.tableStyle ?? 'grid')}
              data-striped={String(Boolean(node.attrs?.striped))}
              data-density={String(node.attrs?.density ?? 'comfortable')}
              data-mobile={String(node.attrs?.mobile ?? 'scroll')}>
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
              id={typeof node.attrs?.sectionId === 'string' ? `section-${node.attrs.sectionId}` : undefined}
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
          const attrs = node.attrs ?? {};
          const caption = typeof attrs.title === 'string' ? attrs.title : '';
          const credit = typeof attrs.credit === 'string' ? attrs.credit.trim() : '';
          const ratio = typeof attrs.ratio === 'string' ? attrs.ratio : '';
          const text = (value: unknown) => (typeof value === 'string' && value ? value : undefined);
          return (
            <figure className="cs-media">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="cs-image"
                src={src}
                // Decorative images get an empty alt, so screen readers skip them.
                alt={attrs.decorative ? '' : String(attrs.alt ?? '')}
                width={Number(attrs.width) || undefined}
                height={Number(attrs.height) || undefined}
                data-size={text(attrs.size)}
                data-align={text(attrs.align)}
                data-ratio={ratio || undefined}
                data-radius={text(attrs.radius)}
                style={ratio ? {aspectRatio: ratio, objectPosition: text(attrs.focus) ?? 'center'} : undefined}
                loading="lazy"
                decoding="async"
              />
              {(caption || credit) && (
                <figcaption className="cs-caption">
                  {caption}
                  {credit && <span className="cs-credit">{caption ? ' · ' : ''}{credit}</span>}
                </figcaption>
              )}
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
        ...visualNodeMapping(),
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
}
