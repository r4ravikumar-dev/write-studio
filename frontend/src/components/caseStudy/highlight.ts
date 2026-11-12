import {createElement, type ReactNode} from 'react';
import {createLowlight, common} from 'lowlight';
import {Extension} from '@tiptap/core';
import {Plugin, PluginKey} from '@tiptap/pm/state';
import {Decoration, DecorationSet} from '@tiptap/pm/view';
import type {Node as PMNode} from '@tiptap/pm/model';

/**
 * Code highlighting (block contract B5): lowlight (highlight.js grammars) with a fixed list of
 * languages. Highlighting only wraps the code's own text in `<span class="hljs-…">`: the text stays
 * escaped (React text in the preview, ProseMirror decorations in the editor), nothing is stored,
 * and code is never run. Colours come from DNA tokens in theme/structured.css.
 */
export const CODE_LANGUAGES = [
  {value: 'bash', label: 'Bash / shell'},
  {value: 'json', label: 'JSON'},
  {value: 'javascript', label: 'JavaScript'},
  {value: 'typescript', label: 'TypeScript'},
  {value: 'python', label: 'Python'},
  {value: 'java', label: 'Java'},
  {value: 'kotlin', label: 'Kotlin'},
  {value: 'swift', label: 'Swift'},
  {value: 'go', label: 'Go'},
  {value: 'rust', label: 'Rust'},
  {value: 'csharp', label: 'C#'},
  {value: 'cpp', label: 'C++'},
  {value: 'c', label: 'C'},
  {value: 'ruby', label: 'Ruby'},
  {value: 'php', label: 'PHP'},
  {value: 'sql', label: 'SQL'},
  {value: 'yaml', label: 'YAML'},
  {value: 'xml', label: 'HTML / XML'},
  {value: 'css', label: 'CSS'},
  {value: 'graphql', label: 'GraphQL'},
  {value: 'diff', label: 'Diff'},
  {value: 'markdown', label: 'Markdown'},
  {value: 'plaintext', label: 'Plain text'},
] as const;

const lowlight = createLowlight(Object.fromEntries(CODE_LANGUAGES.filter(language => language.value in common).map(language => [language.value, common[language.value as keyof typeof common]])));

export const languageLabel = (value: unknown) => CODE_LANGUAGES.find(language => language.value === value)?.label ?? (typeof value === 'string' && value ? value : 'Code');

type HastNode = {type: string; value?: string; tagName?: string; properties?: {className?: string[]}; children?: HastNode[]};

/** The highlighted tree, or null for an unknown language or plain text. */
function tree(code: string, language: unknown): HastNode | null {
  if (typeof language !== 'string' || language === 'plaintext' || !lowlight.registered(language)) return null;
  try {
    return lowlight.highlight(language, code) as unknown as HastNode;
  } catch {
    return null;
  }
}

/** Highlighted code as React nodes (preview and HTML export). Text is React text: always escaped. */
export function highlightToReact(code: string, language: unknown): ReactNode {
  const root = tree(code, language);
  if (!root) return code;
  let key = 0;
  const walk = (node: HastNode): ReactNode => {
    if (node.type === 'text') return node.value ?? '';
    const children = (node.children ?? []).map(walk);
    if (node.type === 'element') return createElement('span', {key: key++, className: (node.properties?.className ?? []).join(' ')}, ...children);
    return children;
  };
  return walk(root);
}

/** Spans of highlighted text, as offsets into the code. */
function ranges(code: string, language: unknown): {from: number; to: number; className: string}[] {
  const root = tree(code, language);
  if (!root) return [];
  const out: {from: number; to: number; className: string}[] = [];
  let offset = 0;
  const walk = (node: HastNode, classes: string[]) => {
    if (node.type === 'text') {
      const length = (node.value ?? '').length;
      if (classes.length && length) out.push({from: offset, to: offset + length, className: classes.join(' ')});
      offset += length;
      return;
    }
    const own = node.type === 'element' ? (node.properties?.className ?? []) : [];
    (node.children ?? []).forEach(child => walk(child, [...classes, ...own]));
  };
  walk(root, []);
  return out;
}

function decorations(doc: PMNode): DecorationSet {
  const found: Decoration[] = [];
  doc.descendants((node, pos) => {
    if (node.type.name !== 'codeBlock') return true;
    for (const range of ranges(node.textContent, node.attrs.language)) found.push(Decoration.inline(pos + 1 + range.from, pos + 1 + range.to, {class: range.className}));
    return false;
  });
  return DecorationSet.create(doc, found);
}

const key = new PluginKey<DecorationSet>('studioCodeHighlight');

/** Editor only: highlights code blocks as decorations, recomputed when the document changes. */
export const CodeHighlight = Extension.create({
  name: 'studioCodeHighlight',
  addProseMirrorPlugins() {
    return [
      new Plugin<DecorationSet>({
        key,
        state: {
          init: (_, state) => decorations(state.doc),
          apply: (tr, previous) => (tr.docChanged ? decorations(tr.doc) : previous.map(tr.mapping, tr.doc)),
        },
        props: {decorations: state => key.getState(state)},
      }),
    ];
  },
});
