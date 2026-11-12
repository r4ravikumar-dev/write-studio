import type {JSONContent} from '../caseStudies/json';
import {isSafeHref} from './spec';

/**
 * Markdown and plain text for documents (block contract §3.1: `toMarkdown`, `toText`). The text
 * structure (headings, lists, quotes, tables, code, marks) is handled here; each block's own form
 * comes from its contract entry, through `ctx.block`. Output is GitHub-flavoured Markdown.
 *
 * Nothing here is HTML: text is escaped, links are kept only when they are safe, and blocks that
 * can't be expressed in Markdown say what they were instead of disappearing.
 */
export type MarkdownContext = {
  /** How a private media file is referred to (Phase 6 maps paths to files inside the export). */
  media(path: string): string;
  /** Renders a node, via its block's own `toMarkdown` when it has one. */
  block(node: JSONContent): string;
};

/** Escapes characters Markdown would read as formatting. */
export function escapeMarkdown(text: string): string {
  return text.replace(/([\\`*_[\]<>|])/g, '\\$1').replace(/^(\s*)([#>+-]|\d+\.)(\s)/gm, '$1\\$2$3');
}

/** Inline content (text with marks, hard breaks) as Markdown. */
export function inlineMarkdown(nodes: JSONContent[] | undefined): string {
  return (nodes ?? [])
    .map(node => {
      if (node.type === 'hardBreak') return '  \n';
      if (node.type !== 'text') return '';
      const marks = node.marks ?? [];
      const has = (type: string) => marks.some(mark => mark.type === type);
      const link = marks.find(mark => mark.type === 'link');
      if (has('code')) {
        const raw = node.text ?? '';
        const fence = raw.includes('`') ? '``' : '`';
        return `${fence}${raw}${fence}`;
      }
      const raw = escapeMarkdown(node.text ?? '');
      if (!raw.trim()) return raw;
      // Markdown emphasis can't start or end with a space: keep the spaces outside the markers.
      const [, before, core, after] = /^(\s*)([\s\S]*?)(\s*)$/.exec(raw)!;
      let text = core;
      if (has('bold')) text = `**${text}**`;
      if (has('italic')) text = `_${text}_`;
      if (has('strike')) text = `~~${text}~~`;
      if (link && isSafeHref(link.attrs?.href)) text = `[${text}](${String(link.attrs!.href).replace(/[()]/g, encodeURIComponent)})`;
      return `${before}${text}${after}`;
    })
    .join('');
}

/** Plain text of any node (text, with blocks separated by new lines). */
export function plainText(node: JSONContent | undefined): string {
  if (!node) return '';
  if (node.type === 'text') return node.text ?? '';
  if (node.type === 'hardBreak') return '\n';
  const inline = node.content?.every(child => child.type === 'text' || child.type === 'hardBreak');
  return (node.content ?? []).map(plainText).join(inline ? '' : '\n');
}

const indent = (text: string, prefix: string) => text.split('\n').map((line, index) => (index ? `${' '.repeat(prefix.length)}${line}` : `${prefix}${line}`)).join('\n');
const quote = (text: string) => text.split('\n').map(line => (line ? `> ${line}` : '>')).join('\n');

/** Blocks inside a container, separated by blank lines. */
export function blocksMarkdown(nodes: JSONContent[] | undefined, ctx: MarkdownContext): string {
  return (nodes ?? []).map(node => ctx.block(node)).filter(text => text.trim()).join('\n\n');
}

/** The text-structure nodes. Returns undefined for a type that isn't one of them. */
export function textNodeMarkdown(node: JSONContent, ctx: MarkdownContext): string | undefined {
  switch (node.type) {
    case 'paragraph':
      return inlineMarkdown(node.content);
    case 'heading':
      return `${'#'.repeat(Math.min(6, Number(node.attrs?.level ?? 2)))} ${inlineMarkdown(node.content)}`;
    case 'blockquote':
      return quote(blocksMarkdown(node.content, ctx));
    case 'bulletList':
      return (node.content ?? []).map(item => indent(blocksMarkdown(item.content, ctx), '- ')).join('\n');
    case 'orderedList': {
      const start = Number(node.attrs?.start ?? 1);
      return (node.content ?? []).map((item, index) => indent(blocksMarkdown(item.content, ctx), `${start + index}. `)).join('\n');
    }
    case 'taskList':
      return (node.content ?? []).map(item => indent(blocksMarkdown(item.content, ctx), item.attrs?.checked ? '- [x] ' : '- [ ] ')).join('\n');
    case 'codeBlock': {
      const code = plainText(node);
      const fence = code.includes('```') ? '````' : '```';
      return `${fence}${String(node.attrs?.language ?? '')}\n${code}\n${fence}`;
    }
    case 'horizontalRule':
      return '---';
    case 'details': {
      const [summary, content] = node.content ?? [];
      return `**${inlineMarkdown(summary?.content)}**\n\n${blocksMarkdown(content?.content, ctx)}`;
    }
    case 'table':
      return tableMarkdown(node);
    default:
      return undefined;
  }
}

/** A table as a GitHub table: the first row is the header (Markdown needs one). */
function tableMarkdown(node: JSONContent): string {
  const rows = (node.content ?? []).map(row => (row.content ?? []).map(cell => plainText(cell).replace(/\n+/g, ' ').replace(/\|/g, '\\|').trim()));
  if (!rows.length) return '';
  const width = Math.max(...rows.map(row => row.length));
  const line = (cells: string[]) => `| ${Array.from({length: width}, (_, index) => cells[index] ?? '').join(' | ')} |`;
  return [line(rows[0]), `| ${Array.from({length: width}, () => '---').join(' | ')} |`, ...rows.slice(1).map(line)].join('\n');
}

/** An image line, or a note when the picture has no file. */
export function imageMarkdown(path: string | null | undefined, alt: string | null | undefined, ctx: MarkdownContext): string {
  if (!path) return '';
  return `![${escapeMarkdown(alt ?? '')}](${ctx.media(path)})`;
}

/** The text of a block's caption line, in italics. */
export const captionMarkdown = (caption: unknown) => (typeof caption === 'string' && caption.trim() ? `_${escapeMarkdown(caption.trim())}_` : '');

/** Joins non-empty parts with blank lines. */
export const joinBlocks = (...parts: (string | undefined | false)[]) => parts.filter((part): part is string => Boolean(part && part.trim())).join('\n\n');
