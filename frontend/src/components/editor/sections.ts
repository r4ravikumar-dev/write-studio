import {Extension, type Editor} from '@tiptap/core';
import {Fragment, type Node as PMNode} from '@tiptap/pm/model';
import {Plugin, PluginKey, TextSelection} from '@tiptap/pm/state';
import {
  SECTION_LEVEL,
  frameworkSection,
  isSectionId,
  isSectionStatus,
  newSectionId,
  sectionOf,
  type SectionState,
  type SectionStatus,
} from '@studio/shared';

/**
 * Sections in the editor (Stage 2). A section is a top-level level-2 heading and everything up to
 * the next one; its id, framework key and status live on the heading. The outline is worked out
 * from the document on every change, so there's only ever one source of truth.
 */
export type OutlineSection = {
  id: string;
  key: string | null;
  /** The user's title, or '' when the heading is empty. */
  title: string;
  /** What the outline shows: the title, the framework title, or "Untitled section". */
  name: string;
  status: SectionStatus | null;
  state: SectionState;
  /** Position of the heading, and of the end of the section's content. */
  pos: number;
  end: number;
  index: number;
};

const isSection = (node: PMNode) => node.type.name === 'heading' && node.attrs.level === SECTION_LEVEL;

/** Whether a top-level block holds anything (text, or any block that isn't an empty paragraph). */
function blockHasContent(node: PMNode): boolean {
  if (node.isTextblock) {
    let found = false;
    node.descendants(child => {
      if (found) return false;
      if ((child.isText && child.text?.trim()) || (child.isInline && child.isAtom && child.type.name !== 'hardBreak')) found = true;
      return !found;
    });
    return found;
  }
  return true;
}

/** The document's sections, in order. */
export function outlineOf(doc: PMNode): OutlineSection[] {
  const sections: OutlineSection[] = [];
  const filled: boolean[] = [];
  doc.forEach((node, offset) => {
    if (isSection(node)) {
      const previous = sections.at(-1);
      if (previous) previous.end = offset;
      const key = typeof node.attrs.section === 'string' ? node.attrs.section : null;
      const title = node.textContent.trim();
      sections.push({
        id: String(node.attrs.sectionId ?? ''),
        key,
        title,
        name: title || sectionOf(node)?.title || 'Untitled section',
        status: isSectionStatus(node.attrs.sectionStatus) ? node.attrs.sectionStatus : null,
        state: 'empty',
        pos: offset,
        end: doc.content.size,
        index: sections.length,
      });
      filled.push(false);
    } else if (sections.length && blockHasContent(node)) {
      filled[filled.length - 1] = true;
    }
  });
  sections.forEach((section, index) => {
    section.state = section.status ?? (filled[index] ? 'in_progress' : 'empty');
  });
  return sections;
}

/** The section the cursor is in (null before the first section). */
export function activeSectionIndex(sections: OutlineSection[], from: number): number {
  let active = -1;
  for (const section of sections) if (section.pos <= from) active = section.index;
  return active;
}

/** Scrolls a section's heading into view and puts the cursor at the end of its title. */
export function goToSection(editor: Editor, section: OutlineSection) {
  const heading = editor.state.doc.nodeAt(section.pos);
  if (!heading) return;
  editor.chain().focus().setTextSelection(section.pos + 1 + heading.content.size).run();
  // After the click that called this has finished, so the outline button doesn't keep the focus.
  requestAnimationFrame(() => editor.view.focus());
  const dom = editor.view.nodeDOM(section.pos);
  if (dom instanceof HTMLElement) dom.scrollIntoView({block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'});
}

/** Moves the section at `from` to sit at position `to` in the outline (one undo step). */
export function moveSection(editor: Editor, sections: OutlineSection[], from: number, to: number) {
  if (from === to || !sections[from] || !sections[to]) return;
  const source = sections[from];
  const target = to < from ? sections[to].pos : sections[to].end;
  const {state} = editor;
  const content = state.doc.slice(source.pos, source.end).content;
  const tr = state.tr.delete(source.pos, source.end);
  const at = tr.mapping.map(target, to < from ? -1 : 1);
  tr.insert(at, content);
  tr.setSelection(TextSelection.near(tr.doc.resolve(at + 1)));
  editor.view.dispatch(tr.scrollIntoView());
}

/** Copies a section (title, content, status cleared) right after it. The copy gets a new id. */
export function duplicateSection(editor: Editor, section: OutlineSection) {
  const {state} = editor;
  const content: PMNode[] = [];
  state.doc.slice(section.pos, section.end).content.forEach((node, _offset, index) => {
    content.push(index === 0 ? node.type.create({...node.attrs, sectionId: newSectionId(), sectionStatus: null}, node.content, node.marks) : node);
  });
  const tr = state.tr.insert(section.end, Fragment.from(content));
  tr.setSelection(TextSelection.near(tr.doc.resolve(section.end + 1)));
  editor.view.dispatch(tr.scrollIntoView());
}

export function deleteSection(editor: Editor, section: OutlineSection) {
  editor.view.dispatch(editor.state.tr.delete(section.pos, section.end).scrollIntoView());
}

/** Renames a section: the heading's text. An empty name brings back the framework title as a placeholder. */
export function renameSection(editor: Editor, section: OutlineSection, title: string) {
  const heading = editor.state.doc.nodeAt(section.pos);
  if (!heading) return;
  const text = title.trim();
  const {tr, schema} = editor.state;
  tr.replaceWith(section.pos + 1, section.pos + 1 + heading.content.size, text ? schema.text(text) : Fragment.empty);
  editor.view.dispatch(tr);
}

export function setSectionStatus(editor: Editor, section: OutlineSection, status: SectionStatus | null) {
  const heading = editor.state.doc.nodeAt(section.pos);
  if (!heading) return;
  editor.view.dispatch(editor.state.tr.setNodeMarkup(section.pos, undefined, {...heading.attrs, sectionStatus: status}));
}

/**
 * Adds a section after `after` (or at the end): a framework section by key (its title shows as a
 * placeholder) or one of the user's own. The cursor goes into its heading, ready to type.
 */
export function addSection(editor: Editor, after: OutlineSection | null, key: string | null = null) {
  const {state} = editor;
  const at = after ? after.end : state.doc.content.size;
  const {heading, paragraph} = state.schema.nodes;
  const nodes = [heading.create({level: SECTION_LEVEL, section: key && frameworkSection(key) ? key : null, sectionId: newSectionId(), sectionStatus: null}), paragraph.create()];
  const tr = state.tr.insert(at, Fragment.from(nodes));
  tr.setSelection(TextSelection.create(tr.doc, at + 1));
  editor.view.dispatch(tr.scrollIntoView());
  editor.commands.focus();
}

/**
 * Keeps section metadata valid as the document changes: every section heading gets a unique id
 * (pasting or duplicating can repeat one), and headings that stop being sections (another level,
 * or moved inside a block) lose their id and status.
 */
export const SectionIds = Extension.create({
  name: 'sectionIds',
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('sectionIds'),
        appendTransaction(transactions, _old, state) {
          if (!transactions.some(transaction => transaction.docChanged)) return null;
          const tr = state.tr;
          const seen = new Set<string>();
          state.doc.forEach((node, offset) => {
            if (!isSection(node)) return;
            const id = node.attrs.sectionId;
            if (!isSectionId(id) || seen.has(id)) {
              const fresh = newSectionId();
              seen.add(fresh);
              tr.setNodeMarkup(offset, undefined, {...node.attrs, sectionId: fresh});
            } else {
              seen.add(id);
            }
          });
          state.doc.descendants((node, pos, parent) => {
            if (node.type.name !== 'heading') return true;
            const isTopSection = parent === state.doc && node.attrs.level === SECTION_LEVEL;
            if (!isTopSection && (node.attrs.sectionId || node.attrs.sectionStatus)) {
              tr.setNodeMarkup(pos, undefined, {...node.attrs, sectionId: null, sectionStatus: null});
            }
            return false;
          });
          return tr.docChanged ? tr : null;
        },
      }),
    ];
  },
});

/**
 * The document of the transaction being applied. Placeholder callbacks only get the editor, whose
 * `state` is still the previous one while a transaction is applied, so looking up the heading
 * before a paragraph there can miss (or go out of range). This runs first and records the new doc.
 */
export const LatestDoc = Extension.create<object, {doc: PMNode | null}>({
  name: 'latestDoc',
  priority: 1000,
  addStorage() {
    return {doc: null};
  },
  addProseMirrorPlugins() {
    const storage = this.storage;
    return [
      new Plugin({
        key: new PluginKey('latestDoc'),
        state: {
          init: (_config, state) => {
            storage.doc = state.doc;
            return null;
          },
          apply: tr => {
            storage.doc = tr.doc;
            return null;
          },
        },
      }),
    ];
  },
});
