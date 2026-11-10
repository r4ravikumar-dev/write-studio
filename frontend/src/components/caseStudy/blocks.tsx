'use client';


import {VStack, HStack} from '@astryxdesign/core/Layout';
import {Text} from '@astryxdesign/core/Text';
import {Icon} from '@astryxdesign/core/Icon';
import {Download, FileText, Lightbulb, Presentation, File} from 'lucide-react';
import {
  EMBED_LABELS,
  fileKind,
  formatBytes,
  parseEmbed,
} from '@/lib/caseStudies/embeds';
import {EYEBROW_STYLE} from '@/theme/eyebrow';

/**
 * The case study's rich blocks, drawn the same way in the editor (as node
 * views) and on the private preview (static renderer), so what you write is
 * what visitors see.
 */

const KIND_ICON = {pdf: FileText, slides: Presentation, doc: FileText, other: File} as const;
const KIND_LABEL = {pdf: 'PDF', slides: 'Slides', doc: 'Document', other: 'File'} as const;

/**
 * A file (PDF, PowerPoint, Word). PDFs can preview inline; Office files can't,
 * because online viewers would need a public link and Studio files are private.
 */
export function FileBlock({
  src,
  name,
  size,
  mime,
  preview,
}: {
  src: string;
  name: string;
  size: number;
  mime: string;
  preview: boolean;
}) {
  const kind = fileKind(mime, name);
  const previewSrc = kind === 'pdf' ? src : '';
  return (
    <VStack gap={0} className="cs-file">
      {preview && previewSrc && (
        <iframe
          className="cs-file-preview"
          src={previewSrc}
          title={`Preview of ${name}`}
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      )}
      <HStack gap={3} vAlign="center" className="cs-file-bar">
        <Icon icon={KIND_ICON[kind]} size="md" color="inherit" />
        <VStack gap={0} style={{flex: 1, minInlineSize: 0}}>
          <Text weight="semibold" maxLines={1}>
            {name}
          </Text>
          <Text type="supporting" style={{...EYEBROW_STYLE, color: 'var(--color-text-secondary)'}}>
            {[KIND_LABEL[kind], formatBytes(size)].filter(Boolean).join(' · ')}
          </Text>
        </VStack>
        <a className="cs-file-download" href={src} download={name} target="_blank" rel="noopener noreferrer">
          <Icon icon={Download} size="sm" color="inherit" />
          <span>Download</span>
        </a>
      </HStack>
    </VStack>
  );
}

/** An uploaded video file, with the browser's controls. */
export function VideoBlock({src, caption}: {src: string; caption?: string}) {
  return (
    <figure className="cs-media">
      <video className="cs-video" src={src} controls playsInline preload="metadata" />
      {caption && <figcaption className="cs-caption">{caption}</figcaption>}
    </figure>
  );
}

/** A Figma file or prototype, or a YouTube, Vimeo or Loom video, from its URL. */
export function EmbedBlock({src, caption}: {src: string; caption?: string}) {
  const embed = parseEmbed(src);
  if (!embed) return null;
  return (
    <figure className="cs-media">
      <iframe
        className="cs-embed"
        data-provider={embed.provider}
        src={embed.embedUrl}
        title={caption || `${EMBED_LABELS[embed.provider]} embed`}
        loading="lazy"
        allow="autoplay; fullscreen; picture-in-picture; clipboard-write"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
      {caption && <figcaption className="cs-caption">{caption}</figcaption>}
    </figure>
  );
}

/** A highlighted note: a key insight, a quote from research, a constraint. */
export function CalloutBlock({children}: {children: React.ReactNode}) {
  return (
    <HStack gap={3} vAlign="start" className="cs-callout">
      <Icon icon={Lightbulb} size="md" color="inherit" />
      <VStack gap={2} style={{flex: 1, minInlineSize: 0}}>
        {children}
      </VStack>
    </HStack>
  );
}
