import type {JSONContent} from '../caseStudies/json';
import {BLOCK_SCHEMAS} from '../caseStudies/blockSchemas';
import {chartRows, defaultChart, type ChartConfig} from '../caseStudies/blocks';
import {parseEmbed} from '../caseStudies/embeds';
import {BLOCK_CATALOG, BLOCK_NAMES, type BlockName} from './catalog';
import {cleanDocument, NODE_ATTRIBUTES} from './document';
import {isSafeHref} from './spec';
import {BLOCK_FIXTURES} from './fixtures';
import {
  blocksMarkdown,
  captionMarkdown,
  escapeMarkdown,
  imageMarkdown,
  inlineMarkdown,
  joinBlocks,
  plainText,
  textNodeMarkdown,
  type MarkdownContext,
} from './markdown';

/**
 * The block contract, shared half (docs/multi-vertical/phase-3-block-contract.md §3.1). One entry
 * per catalogue block, keyed by the stored node name, so a block can't exist without all of it.
 * Identity (id, version, family, name, search terms, document types) is the catalogue's; review
 * rules and defaults are in `caseStudies/blockSchemas.ts`; what is stored is `document.ts`.
 */
export type BlockContract = {
  /** B1: prose inside the block (ProseMirror content), or one `config` attribute (atom). */
  storage: 'content' | 'atom';
  /** B3: whether the server keeps the cleaned form. New blocks: true. Existing: after evidence. */
  enforced: boolean;
  /** Nothing a reader would see yet (section progress, review, preview). */
  isEmpty(node: JSONContent): boolean;
  /** Plain text: word count, search, review, and the text alternative of visual blocks. */
  toText(node: JSONContent): string;
  /** Markdown (exported in Phase 6). Text structure is handled by `documentMarkdown`. */
  toMarkdown(node: JSONContent, ctx: MarkdownContext): string;
};

type Config = Record<string, unknown>;
type Media = {path?: string; alt?: string} | null | undefined;
const config = (node: JSONContent) => (node.attrs?.config ?? {}) as Config;
const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
const items = <T>(value: unknown) => (Array.isArray(value) ? (value as T[]) : []);
const lines = (...parts: unknown[]) => parts.map(text).filter(Boolean).join('\n');
const hasText = (node: JSONContent) => Boolean(plainText(node).trim());
const media = (value: unknown) => value as Media;
const altOf = (value: Media) => text(value?.alt);

/** Blocks made of text: empty when there is no text; text and Markdown from the structure. */
const textBlock = (storage: 'content' | 'atom' = 'content'): BlockContract => ({
  storage,
  enforced: true,
  isEmpty: node => !hasText(node),
  toText: node => plainText(node),
  toMarkdown: (node, ctx) => textNodeMarkdown(node, ctx) ?? '',
});

/** Decorative blocks: never content. */
const decoration = (markdown = ''): BlockContract => ({storage: 'atom', enforced: true, isEmpty: () => true, toText: () => '', toMarkdown: () => markdown});

type Phase3Block = 'terminal' | 'apiEndpoint' | 'parameterTable' | 'requirementList' | 'userStory' | 'acceptanceCriteria' | 'testimonial' | 'procedureSteps' | 'referenceList';

/** The 29 blocks that existed before the contract: cleaning is enforced in Phase 6. */
const EXISTING: Record<Exclude<BlockName, Phase3Block>, BlockContract> = {
  // ---- Writing ----------------------------------------------------------------------------------
  paragraph: textBlock(),
  heading: textBlock(),
  blockquote: textBlock(),
  bulletList: textBlock(),
  orderedList: textBlock(),
  taskList: textBlock(),
  details: textBlock(),
  codeBlock: {
    storage: 'content',
    enforced: true,
    isEmpty: node => !hasText(node),
    toText: node => lines(node.attrs?.title, plainText(node)),
    toMarkdown: (node, ctx) => joinBlocks(text(node.attrs?.title) ? `**${escapeMarkdown(text(node.attrs?.title))}**` : '', textNodeMarkdown(node, ctx)),
  },
  horizontalRule: decoration('---'),
  spacer: decoration(),
  table: textBlock(),
  callout: {
    storage: 'content',
    enforced: true,
    isEmpty: node => !hasText(node),
    toText: node => plainText(node),
    toMarkdown: (node, ctx) => {
      const tone = String(node.attrs?.tone ?? 'brand');
      const alert = tone === 'warning' ? 'WARNING' : tone === 'success' ? 'TIP' : 'NOTE';
      return [`> [!${alert}]`, ...blocksMarkdown(node.content, ctx).split('\n').map(line => (line ? `> ${line}` : '>'))].join('\n');
    },
  },
  pullQuote: {
    storage: 'content',
    enforced: true,
    isEmpty: node => !hasText(node),
    toText: node => lines(plainText(node), config(node).attribution, config(node).role),
    toMarkdown: node => {
      const by = [text(config(node).attribution), text(config(node).role)].filter(Boolean).join(', ');
      return [`> ${inlineMarkdown(node.content)}`, by ? `>\n> — ${escapeMarkdown(by)}` : ''].filter(Boolean).join('\n');
    },
  },

  // ---- Media ------------------------------------------------------------------------------------
  image: {
    storage: 'atom',
    enforced: true,
    isEmpty: node => !node.attrs?.src,
    toText: node => lines(node.attrs?.decorative ? '' : node.attrs?.alt, node.attrs?.credit),
    toMarkdown: (node, ctx) => joinBlocks(imageMarkdown(node.attrs?.src as string, node.attrs?.decorative ? '' : (node.attrs?.alt as string), ctx), node.attrs?.credit ? `_${escapeMarkdown(String(node.attrs.credit))}_` : ''),
  },
  videoFile: {
    storage: 'atom',
    enforced: true,
    isEmpty: node => !node.attrs?.src,
    toText: node => lines(node.attrs?.caption),
    toMarkdown: (node, ctx) => (node.attrs?.src ? `[Video${node.attrs.caption ? `: ${escapeMarkdown(String(node.attrs.caption))}` : ''}](${ctx.media(String(node.attrs.src))})` : ''),
  },
  fileAttachment: {
    storage: 'atom',
    enforced: true,
    isEmpty: node => !node.attrs?.src,
    toText: node => lines(node.attrs?.name),
    toMarkdown: (node, ctx) => (node.attrs?.src ? `[${escapeMarkdown(String(node.attrs.name || 'File'))}](${ctx.media(String(node.attrs.src))})` : ''),
  },
  embed: {
    storage: 'atom',
    enforced: true,
    isEmpty: node => !parseEmbed(String(node.attrs?.src ?? '')),
    toText: node => lines(node.attrs?.caption),
    toMarkdown: node => {
      const src = String(node.attrs?.src ?? '');
      const parsed = parseEmbed(src);
      if (!parsed) return '';
      const label = text(node.attrs?.caption) || `${parsed.provider[0].toUpperCase()}${parsed.provider.slice(1)} embed`;
      return `[${escapeMarkdown(label)}](${src})`;
    },
  },
  imageGrid: {
    storage: 'atom',
    enforced: true,
    isEmpty: node => !items<Media>(config(node).items).some(item => item?.path),
    toText: node => lines(...items<Media>(config(node).items).map(altOf), config(node).caption),
    toMarkdown: (node, ctx) => joinBlocks(items<Media>(config(node).items).map(item => imageMarkdown(item?.path, item?.alt, ctx)).filter(Boolean).join('\n'), captionMarkdown(config(node).caption)),
  },

  // ---- Visual -----------------------------------------------------------------------------------
  comparison: {
    storage: 'atom',
    enforced: true,
    isEmpty: node => (['left', 'right'] as const).every(side => {
      const value = (config(node)[side] ?? {}) as {media?: Media; text?: string};
      return !value.media?.path && !text(value.text);
    }),
    toText: node => lines(...(['left', 'right'] as const).flatMap(side => {
      const value = (config(node)[side] ?? {}) as {media?: Media; label?: string; text?: string};
      return [value.label, altOf(value.media), value.text];
    }), config(node).caption),
    toMarkdown: (node, ctx) =>
      joinBlocks(
        ...(['left', 'right'] as const).map(side => {
          const value = (config(node)[side] ?? {}) as {media?: Media; label?: string; text?: string};
          return joinBlocks(text(value.label) ? `**${escapeMarkdown(text(value.label))}**` : '', imageMarkdown(value.media?.path, value.media?.alt, ctx), escapeMarkdown(text(value.text)));
        }),
        captionMarkdown(config(node).caption),
      ),
  },
  showcase: {
    storage: 'atom',
    enforced: true,
    isEmpty: node => !media(config(node).media)?.path,
    toText: node => lines(altOf(media(config(node).media)), config(node).caption),
    toMarkdown: (node, ctx) => joinBlocks(imageMarkdown(media(config(node).media)?.path, altOf(media(config(node).media)), ctx), captionMarkdown(config(node).caption)),
  },
  deviceMockup: {
    storage: 'atom',
    enforced: true,
    isEmpty: node => !items<{media?: Media}>(config(node).devices).some(device => device.media?.path),
    toText: node => lines(...items<{media?: Media}>(config(node).devices).map(device => altOf(device.media)), config(node).caption),
    toMarkdown: (node, ctx) =>
      joinBlocks(
        items<{media?: Media}>(config(node).devices).map(device => imageMarkdown(device.media?.path, device.media?.alt, ctx)).filter(Boolean).join('\n'),
        captionMarkdown(config(node).caption),
      ),
  },
  splitLayout: {
    storage: 'content',
    enforced: true,
    isEmpty: node => !media(config(node).media)?.path && !hasText(node),
    toText: node => lines(altOf(media(config(node).media)), plainText(node)),
    toMarkdown: (node, ctx) => joinBlocks(imageMarkdown(media(config(node).media)?.path, altOf(media(config(node).media)), ctx), blocksMarkdown(node.content, ctx)),
  },
  annotatedImage: {
    storage: 'atom',
    enforced: true,
    isEmpty: node => !media(config(node).media)?.path,
    toText: node => lines(altOf(media(config(node).media)), ...items<{title?: string; text?: string}>(config(node).annotations).map(note => lines(note.title, note.text)), config(node).caption),
    toMarkdown: (node, ctx) =>
      joinBlocks(
        imageMarkdown(media(config(node).media)?.path, altOf(media(config(node).media)), ctx),
        items<{title?: string; text?: string}>(config(node).annotations)
          .map((note, index) => `${index + 1}. ${[text(note.title) && `**${escapeMarkdown(text(note.title))}**`, escapeMarkdown(text(note.text))].filter(Boolean).join(' ')}`)
          .join('\n'),
        captionMarkdown(config(node).caption),
      ),
  },
  screenSequence: {
    storage: 'atom',
    enforced: true,
    isEmpty: node => !items<{media?: Media; title?: string; text?: string}>(config(node).steps).some(step => step.media?.path || text(step.title) || text(step.text)),
    toText: node => lines(...items<{media?: Media; title?: string; text?: string}>(config(node).steps).map(step => lines(step.title, step.text, altOf(step.media))), config(node).caption),
    toMarkdown: (node, ctx) =>
      joinBlocks(
        items<{media?: Media; title?: string; text?: string}>(config(node).steps)
          .filter(step => step.media?.path || text(step.title) || text(step.text))
          .map((step, index) => `${index + 1}. ${[text(step.title) && `**${escapeMarkdown(text(step.title))}**`, escapeMarkdown(text(step.text)), imageMarkdown(step.media?.path, step.media?.alt, ctx)].filter(Boolean).join(' ')}`)
          .join('\n'),
        captionMarkdown(config(node).caption),
      ),
  },

  // ---- Data -------------------------------------------------------------------------------------
  metrics: {
    storage: 'atom',
    enforced: true,
    isEmpty: node => !items<{value?: string}>(config(node).items).some(item => text(item.value)),
    toText: node => lines(...items<{value?: string; label?: string; detail?: string}>(config(node).items).map(item => [item.value, item.label, item.detail].map(text).filter(Boolean).join(' ')), config(node).caption),
    toMarkdown: node =>
      joinBlocks(
        items<{value?: string; label?: string; detail?: string}>(config(node).items)
          .filter(item => text(item.value) || text(item.label))
          .map(item => `- **${escapeMarkdown(text(item.value))}** ${escapeMarkdown(text(item.label))}${text(item.detail) ? ` — ${escapeMarkdown(text(item.detail))}` : ''}`)
          .join('\n'),
        captionMarkdown(config(node).caption),
      ),
  },
  chart: {
    storage: 'atom',
    enforced: true,
    isEmpty: node => !chartRows({...defaultChart(), ...config(node)} as ChartConfig).length,
    toText: node => {
      const chart = {...defaultChart(), ...config(node)} as ChartConfig;
      return lines(chart.title, chart.summary, ...chartRows(chart).map(row => `${row.label}: ${row.value}${chart.unit}`), chart.source);
    },
    toMarkdown: node => {
      const chart = {...defaultChart(), ...config(node)} as ChartConfig;
      const rows = chartRows(chart);
      if (!rows.length) return '';
      return joinBlocks(
        text(chart.title) ? `**${escapeMarkdown(chart.title)}**` : '',
        escapeMarkdown(text(chart.summary)),
        ['| Label | Value |', '| --- | --- |', ...rows.map(row => `| ${escapeMarkdown(row.label)} | ${row.value}${escapeMarkdown(chart.unit)} |`)].join('\n'),
        text(chart.source) ? `Source: ${escapeMarkdown(chart.source)}` : '',
        captionMarkdown(chart.caption),
      );
    },
  },
  researchInsights: {
    storage: 'atom',
    enforced: true,
    isEmpty: node => !items<{finding?: string}>(config(node).insights).some(item => text(item.finding)),
    toText: node => lines(...items<{finding?: string; evidence?: string; source?: string}>(config(node).insights).map(item => lines(item.finding, item.evidence, item.source)), config(node).caption),
    toMarkdown: node =>
      joinBlocks(
        items<{finding?: string; evidence?: string; source?: string}>(config(node).insights)
          .filter(item => text(item.finding))
          .map(item => [`- **${escapeMarkdown(text(item.finding))}**`, text(item.evidence) && `  Evidence: ${escapeMarkdown(text(item.evidence))}`, text(item.source) && `  Source: ${escapeMarkdown(text(item.source))}`].filter(Boolean).join('\n'))
          .join('\n'),
        captionMarkdown(config(node).caption),
      ),
  },

  // ---- Structure --------------------------------------------------------------------------------
  timeline: {
    storage: 'atom',
    enforced: true,
    isEmpty: node => !items<{when?: string; title?: string; text?: string}>(config(node).phases).some(phase => text(phase.when) || text(phase.title) || text(phase.text)),
    toText: node => lines(...items<{when?: string; title?: string; text?: string}>(config(node).phases).map(phase => lines(phase.when, phase.title, phase.text)), config(node).caption),
    toMarkdown: node =>
      joinBlocks(
        items<{when?: string; title?: string; text?: string}>(config(node).phases)
          .filter(phase => text(phase.when) || text(phase.title) || text(phase.text))
          .map((phase, index) => `${index + 1}. ${[[text(phase.when), text(phase.title)].filter(Boolean).map(escapeMarkdown).join(' — ') && `**${[text(phase.when), text(phase.title)].filter(Boolean).map(escapeMarkdown).join(' — ')}**`, escapeMarkdown(text(phase.text))].filter(Boolean).join(': ')}`)
          .join('\n'),
        captionMarkdown(config(node).caption),
      ),
  },
  flowDiagram: {
    storage: 'atom',
    enforced: true,
    isEmpty: node => !items<{label?: string}>(config(node).nodes).some(item => text(item.label)),
    toText: node => lines(...items<{label?: string; next?: string}>(config(node).nodes).map(item => [text(item.label), text(item.next) && `(${text(item.next)})`].filter(Boolean).join(' ')), config(node).caption),
    toMarkdown: node => {
      const nodes = items<{kind?: string; label?: string; next?: string}>(config(node).nodes).filter(item => text(item.label));
      const kinds: Record<string, string> = {start: 'Start', step: 'Step', decision: 'Decision', end: 'End'};
      return joinBlocks(
        nodes.map((item, index) => `${index + 1}. ${kinds[item.kind ?? 'step'] ?? 'Step'}: ${escapeMarkdown(text(item.label))}${index < nodes.length - 1 && text(item.next) ? ` → _${escapeMarkdown(text(item.next))}_` : ''}`).join('\n'),
        captionMarkdown(config(node).caption),
      );
    },
  },
};

/** The Phase 3 blocks (block contract §5): cleaning enforced from the start (B3). */
const children = (node: JSONContent) => node.content ?? [];
const attr = (node: JSONContent, key: string) => text(node.attrs?.[key]);
const PRIORITY: Record<string, string> = {must: 'Must', should: 'Should', could: 'Could', wont: 'Won’t'};
const KEYWORD: Record<string, string> = {given: 'Given', when: 'When', then: 'Then', and: 'And', but: 'But'};
const STORY: Record<string, string> = {role: 'As', goal: 'I want', benefit: 'so that'};
const fenceFor = (code: string) => (code.includes('```') ? '````' : '```');
const proseBlock = (extra: Pick<BlockContract, 'toText' | 'toMarkdown'> & {isEmpty?: BlockContract['isEmpty']}): BlockContract => ({
  storage: 'content',
  enforced: true,
  isEmpty: extra.isEmpty ?? (node => !hasText(node)),
  toText: extra.toText,
  toMarkdown: extra.toMarkdown,
});

const PHASE_3: Record<Phase3Block, BlockContract> = {
  terminal: proseBlock({
    isEmpty: node => !children(node).some(line => line.type === 'terminalCommand' && hasText(line)),
    toText: node => children(node).map(plainText).join('\n'),
    toMarkdown: node => {
      const prompt = attr(node, 'prompt') || '$';
      const body = children(node)
        .map(line => (line.type === 'terminalCommand' ? plainText(line).split('\n').map(command => `${prompt} ${command}`).join('\n') : plainText(line)))
        .join('\n');
      const fence = fenceFor(body);
      return `${fence}${node.attrs?.shell === 'powershell' || node.attrs?.shell === 'cmd' ? 'powershell' : 'console'}\n${body}\n${fence}`;
    },
  }),
  apiEndpoint: proseBlock({
    isEmpty: node => !attr(node, 'path') && !attr(node, 'summary') && !hasText(node),
    toText: node =>
      lines(
        `${attr(node, 'method') || 'GET'} ${attr(node, 'path')}`,
        attr(node, 'summary'),
        plainText(node),
        attr(node, 'requestBody'),
        attr(node, 'responseBody'),
      ),
    toMarkdown: (node, ctx) => {
      const method = attr(node, 'method') || 'GET';
      const path = attr(node, 'path') || '/';
      const summary = attr(node, 'summary');
      const auth = attr(node, 'auth') || 'bearer';
      const authLabel = auth === 'none' ? 'None (Public)' : auth === 'apiKey' ? 'API Key' : auth === 'basic' ? 'Basic Auth' : auth === 'oauth2' ? 'OAuth 2.0' : 'Bearer Token';
      const desc = blocksMarkdown(node.content, ctx);
      const reqType = attr(node, 'requestType') || 'application/json';
      const reqBody = attr(node, 'requestBody');
      const resStatus = attr(node, 'responseStatus') || '200 OK';
      const resBody = attr(node, 'responseBody');

      const parts = [
        `### \`${method}\` ${escapeMarkdown(path)}`,
        `> **Authentication**: ${authLabel}${summary ? `  \n> **Summary**: ${escapeMarkdown(summary)}` : ''}`,
      ];
      if (desc) parts.push(desc);
      if (reqBody) {
        parts.push(`#### Request (\`${reqType}\`)\n\`\`\`json\n${reqBody}\n\`\`\``);
      }
      if (resBody) {
        parts.push(`#### Response (\`${resStatus}\`)\n\`\`\`json\n${resBody}\n\`\`\``);
      }
      return parts.join('\n\n');
    },
  }),
  parameterTable: proseBlock({
    isEmpty: node => !children(node).some(row => attr(row, 'name') || hasText(row)),
    toText: node => children(node).map(row => lines([attr(row, 'name'), attr(row, 'type')].filter(Boolean).join(' '), plainText(row))).join('\n'),
    toMarkdown: node => {
      const showRequired = node.attrs?.showRequired !== false;
      const showDefault = node.attrs?.showDefault !== false;
      const head = ['Name', 'Type', ...(showRequired ? ['Required'] : []), ...(showDefault ? ['Default'] : []), 'Description'];
      const cell = (value: string) => escapeMarkdown(value).replace(/\n+/g, ' ');
      const code = (value: string) => (value ? `\`${value.replace(/[`|]/g, '')}\`` : '');
      const rows = children(node).map(row => [
        code(attr(row, 'name')),
        cell(attr(row, 'type')),
        ...(showRequired ? [row.attrs?.required ? 'Yes' : 'No'] : []),
        ...(showDefault ? [code(attr(row, 'default'))] : []),
        cell(plainText(row)),
      ]);
      return [`| ${head.join(' | ')} |`, `| ${head.map(() => '---').join(' | ')} |`, ...rows.map(row => `| ${row.join(' | ')} |`)].join('\n');
    },
  }),
  requirementList: proseBlock({
    toText: node => children(node).map(item => lines(attr(item, 'reqId'), plainText(item))).join('\n'),
    toMarkdown: (node, ctx) =>
      children(node)
        .map(item => {
          const priority = PRIORITY[String(item.attrs?.priority)];
          const label = [attr(item, 'reqId') && `**${escapeMarkdown(attr(item, 'reqId'))}**`, priority && `(${priority})`].filter(Boolean).join(' ');
          const body = blocksMarkdown(item.content, ctx);
          return `- ${label ? `${label} ` : ''}${body.split('\n').join('\n  ')}`;
        })
        .join('\n'),
  }),
  userStory: proseBlock({
    isEmpty: node => !children(node).some(hasText),
    toText: node => children(node).map(part => `${STORY[String(part.attrs?.part)] ?? ''} ${plainText(part)}`.trim()).join(', '),
    toMarkdown: node => {
      const part = (key: string) => inlineMarkdown(children(node).find(item => item.attrs?.part === key)?.content);
      return `As **${part('role')}**, I want **${part('goal')}**, so that **${part('benefit')}**.`;
    },
  }),
  acceptanceCriteria: proseBlock({
    toText: node => children(node).map(scenario => lines(attr(scenario, 'title'), ...children(scenario).map(step => `${KEYWORD[String(step.attrs?.keyword)] ?? ''} ${plainText(step)}`.trim()))).join('\n'),
    toMarkdown: node =>
      children(node)
        .map(scenario => {
          const title = attr(scenario, 'title');
          const ref = attr(scenario, 'requirementRef');
          const heading = `**Scenario${title ? `: ${escapeMarkdown(title)}` : ''}**${ref ? ` (${escapeMarkdown(ref)})` : ''}`;
          return [heading, ...children(scenario).map(step => `- **${KEYWORD[String(step.attrs?.keyword)] ?? 'And'}** ${inlineMarkdown(step.content)}`)].join('\n');
        })
        .join('\n\n'),
  }),
  testimonial: proseBlock({
    toText: node => lines(plainText(node), [attr(node, 'person'), attr(node, 'role'), attr(node, 'organisation')].filter(Boolean).join(', ')),
    toMarkdown: (node, ctx) => {
      const by = [attr(node, 'person'), attr(node, 'role'), attr(node, 'organisation')].filter(Boolean).map(escapeMarkdown).join(', ');
      return [...blocksMarkdown(node.content, ctx).split('\n').map(line => (line ? `> ${line}` : '>')), ...(by ? ['>', `> — ${by}`] : [])].join('\n');
    },
  }),
  procedureSteps: proseBlock({
    toText: node => children(node).map(step => lines(plainText(step), attr(step, 'owner'), attr(step, 'expected'))).join('\n'),
    toMarkdown: (node, ctx) =>
      children(node)
        .map((step, index) => {
          const prefix = `${index + 1}. `;
          const pad = ' '.repeat(prefix.length);
          const body = blocksMarkdown(step.content, ctx).split('\n').join(`\n${pad}`);
          const facts = [attr(step, 'owner') && `${pad}Who: ${escapeMarkdown(attr(step, 'owner'))}`, attr(step, 'expected') && `${pad}Expected result: ${escapeMarkdown(attr(step, 'expected'))}`].filter(Boolean);
          return [`${prefix}${body}`, ...facts].join('  \n');
        })
        .join('\n'),
  }),
  referenceList: proseBlock({
    toText: node => children(node).map(item => lines(plainText(item), attr(item, 'url'))).join('\n'),
    toMarkdown: node =>
      children(node)
        .map(item => {
          const url = attr(item, 'url');
          const title = inlineMarkdown(item.content) || escapeMarkdown(url);
          return `- ${url && isSafeHref(url) ? `[${title}](${url.replace(/[()]/g, encodeURIComponent)})` : title}`;
        })
        .join('\n'),
  }),
};

export const BLOCK_CONTRACTS: Record<BlockName, BlockContract> = {...EXISTING, ...PHASE_3};

/** The node types that only exist inside a block (cleaned with the block they belong to). */
export const BLOCK_PARTS: Partial<Record<BlockName, readonly string[]>> = {
  bulletList: ['listItem'],
  orderedList: ['listItem'],
  taskList: ['taskItem'],
  details: ['detailsSummary', 'detailsContent'],
  table: ['tableRow', 'tableCell', 'tableHeader'],
  terminal: ['terminalCommand', 'terminalOutput'],
  parameterTable: ['parameter'],
  requirementList: ['requirement'],
  userStory: ['storyPart'],
  acceptanceCriteria: ['scenario', 'scenarioStep'],
  procedureSteps: ['procedureStep'],
  referenceList: ['reference'],
};
const ENFORCED = new Set<string>([
  'doc',
  'text',
  'hardBreak',
  ...(Object.keys(BLOCK_CONTRACTS) as BlockName[]).filter(name => BLOCK_CONTRACTS[name].enforced).flatMap(name => [name, ...(BLOCK_PARTS[name] ?? [])]),
]);

/** B3: whether the server keeps the cleaned form of a node type (a block and its parts), or only reports. */
export function isEnforcedType(type: string): boolean {
  return ENFORCED.has(type);
}

// ---- Whole documents ----------------------------------------------------------------------------------

const defaultMedia = (path: string) => path;

/** Markdown for a whole stored document. */
export function documentMarkdown(doc: JSONContent, media: (path: string) => string = defaultMedia): string {
  const ctx: MarkdownContext = {
    media,
    block: node => {
      const contract = BLOCK_CONTRACTS[node.type as BlockName];
      if (contract) return contract.toMarkdown(node, ctx);
      // Not a block of its own (list items, table rows): handled by its parent; anything else is named.
      return textNodeMarkdown(node, ctx) ?? `_(${escapeMarkdown(node.type ?? 'unknown')} block not available in Markdown)_`;
    },
  };
  return `${blocksMarkdown(doc.content, ctx)}\n`;
}

/**
 * Renders a full Studio document as portable GitHub-flavoured Markdown,
 * including document title, subtitle, summary, metadata facts table, and body content.
 */
export function exportStudyMarkdown(
  study: {
    title: string;
    subtitle?: string | null;
    summary?: string | null;
    document_type?: string | null;
    metadata?: Record<string, unknown> | null;
    content: JSONContent;
    role?: string | null;
    team?: string | null;
    timeline?: string | null;
    platform?: string | null;
  },
  media: (path: string) => string = defaultMedia,
): string {
  const parts: string[] = [];
  const title = study.title.replace(/\*/g, '').trim() || 'Untitled Document';
  parts.push(`# ${escapeMarkdown(title)}`);

  if (study.subtitle?.trim()) {
    parts.push(`_${escapeMarkdown(study.subtitle.trim())}_`);
  }

  // Facts / Metadata table
  const facts: [string, string][] = [];
  if (study.metadata && Object.keys(study.metadata).length > 0) {
    for (const [key, val] of Object.entries(study.metadata)) {
      if (val !== undefined && val !== null && String(val).trim()) {
        const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        facts.push([label, String(val).trim()]);
      }
    }
  } else {
    if (study.role?.trim()) facts.push(['Role', study.role.trim()]);
    if (study.team?.trim()) facts.push(['Team', study.team.trim()]);
    if (study.timeline?.trim()) facts.push(['Timeline', study.timeline.trim()]);
    if (study.platform?.trim()) facts.push(['Platform', study.platform.trim()]);
  }

  if (facts.length > 0) {
    const tableHeader = '| Attribute | Details |\n| :--- | :--- |';
    const rows = facts.map(([label, val]) => `| **${escapeMarkdown(label)}** | ${escapeMarkdown(val).replace(/\n+/g, ' ')} |`).join('\n');
    parts.push(`${tableHeader}\n${rows}`);
  }

  if (study.summary?.trim()) {
    parts.push(`> **Summary**  \n> ${study.summary.trim().split('\n').join('\n> ')}`);
  }

  const body = documentMarkdown(study.content, media).trim();
  if (body) {
    parts.push(body);
  }

  return parts.join('\n\n') + '\n';
}

/** Whether a node shows anything to a reader (unknown types count, to be safe). */
export function isEmptyBlock(node: JSONContent): boolean {
  const contract = BLOCK_CONTRACTS[node.type as BlockName];
  if (contract) return contract.isEmpty(node);
  if (node.type === 'text') return !node.text?.trim();
  if (node.type === 'hardBreak') return true;
  return false;
}

// ---- Checks (offline test) ------------------------------------------------------------------------------

/**
 * Everything wrong with the contract (none, in a healthy one): a catalogue block without a contract
 * or attribute rules, a version without a fixture, a fixture that cleaning would change, or that
 * reads as empty, has no text or no Markdown.
 */
export function blockContractProblems(): string[] {
  const problems: string[] = [];
  for (const name of BLOCK_NAMES) {
    const contract = BLOCK_CONTRACTS[name];
    const catalog = BLOCK_CATALOG[name];
    if (!contract) problems.push(`${name}: no contract.`);
    if (!NODE_ATTRIBUTES[name]) problems.push(`${name}: no attribute rules in document.ts.`);
    const schema = BLOCK_SCHEMAS[name];
    if (schema && schema.schemaVersion !== catalog.version) problems.push(`${name}: review rules are for version ${schema.schemaVersion}, the catalogue says ${catalog.version}.`);
    const fixtures = BLOCK_FIXTURES[name];
    for (let version = 1; version <= catalog.version; version += 1) {
      const fixture = fixtures?.[version];
      if (!fixture) {
        problems.push(`${name}: no fixture for version ${version}.`);
        continue;
      }
      const report = cleanDocument({type: 'doc', content: [fixture]}, () => true);
      if (report.unknown.length) problems.push(`${name} v${version} fixture: unknown types ${report.unknown.join(', ')}.`);
      report.issues.forEach(issue => problems.push(`${name} v${version} fixture: ${issue.type} ${issue.path} ${issue.rule}.`));
      if (version !== catalog.version || !contract) continue;
      if (contract.isEmpty(fixture) && !['horizontalRule', 'spacer'].includes(name)) problems.push(`${name}: its fixture reads as empty (a fixture must be a realistic, filled-in block).`);
      if (contract.storage === 'content' && !fixture.content?.length) problems.push(`${name}: stores content, but its fixture has none.`);
      if (contract.storage === 'atom' && fixture.content?.length) problems.push(`${name}: is an atom, but its fixture has content.`);
      const markdown = documentMarkdown({type: 'doc', content: [fixture]});
      if (!markdown.trim() && name !== 'spacer') problems.push(`${name}: the fixture has no Markdown.`);
    }
  }
  return problems;
}

