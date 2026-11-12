'use client';

import type {Editor} from '@tiptap/react';
import type {Node as PMNode} from '@tiptap/pm/model';
import {NodeSelection, TextSelection} from '@tiptap/pm/state';
import {BLOCKS, convertMedia, convertText} from './blocks/registry';
import type {MediaRef} from '@studio/shared';
import type {StudioAsset as Asset} from '@studio/shared';
import {VISUAL_BLOCKS, type VisualBlockName} from '@/lib/caseStudies/blocks';

/**
 * Moving, duplicating, deleting and updating blocks. Blocks live at the top
 * of the document; positions come from a node view's getPos() or from the
 * current selection.
 */

/** Selects the whole block, so the side panel shows its properties. */
export function selectBlock(editor: Editor, pos: number) {
  editor.chain().focus().setNodeSelection(pos).run();
}

export function duplicateBlock(editor: Editor, pos: number) {
  const node = editor.state.doc.nodeAt(pos);
  if (!node) return;
  const after = pos + node.nodeSize;
  editor.chain().focus().insertContentAt(after, node.toJSON()).setNodeSelection(after).run();
}

export function deleteBlock(editor: Editor, pos: number) {
  const node = editor.state.doc.nodeAt(pos);
  if (!node) return;
  editor.chain().focus().deleteRange({from: pos, to: pos + node.nodeSize}).run();
}

/** Swaps the block with the one above (-1) or below (+1). */
export function moveBlock(editor: Editor, pos: number, direction: -1 | 1) {
  const {state} = editor;
  const node = state.doc.nodeAt(pos);
  if (!node) return;
  const $pos = state.doc.resolve(pos);
  const parent = $pos.parent;
  const index = $pos.index();
  const neighbourIndex = index + direction;
  if (neighbourIndex < 0 || neighbourIndex >= parent.childCount) return;
  const neighbour = parent.child(neighbourIndex);
  const tr = state.tr.delete(pos, pos + node.nodeSize);
  const target = direction === -1 ? pos - neighbour.nodeSize : pos + neighbour.nodeSize;
  tr.insert(target, node);
  tr.setSelection(NodeSelection.create(tr.doc, target));
  editor.view.dispatch(tr.scrollIntoView());
  editor.view.focus();
}

/** Replaces a block's attributes (its config, tone, alt…) by position. */
export function setBlockAttrs(editor: Editor, pos: number, patch: Record<string, unknown>) {
  const node = editor.state.doc.nodeAt(pos);
  if (!node) return;
  const tr = editor.state.tr.setNodeMarkup(pos, undefined, {...node.attrs, ...patch});
  editor.view.dispatch(tr);
}

/** The visual block the cursor or selection is in (or on), with its position. */
export function findSelectedBlock(editor: Editor): {name: string; pos: number; node: PMNode} | null {
  const {selection} = editor.state;
  if (selection instanceof NodeSelection) {
    const name = selection.node.type.name;
    if (name in VISUAL_BLOCKS || name === 'image' || BLOCKS[name]?.configurable) return {name, pos: selection.from, node: selection.node};
  }
  const {$from} = selection;
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const node = $from.node(depth);
    // Visual blocks, and tables (the Table inspector), when the cursor is inside them.
    // …and any other block with settings (code block, terminal, parameter table, testimonial).
    if (node.type.name in VISUAL_BLOCKS || node.type.name === 'table' || BLOCKS[node.type.name]?.configurable) return {name: node.type.name, pos: $from.before(depth), node};
  }
  return null;
}

export const blockLabel = (name: string) => (VISUAL_BLOCKS as Record<string, string>)[name] ?? BLOCKS[name]?.label ?? name;

export const isVisualBlock = (name: string): name is VisualBlockName => name in VISUAL_BLOCKS;

/** An uploaded asset as a block's media reference. */
export function mediaFromAsset(asset: Asset, previous?: MediaRef | null): MediaRef {
  return {
    path: asset.path,
    kind: asset.kind === 'video' ? 'video' : 'image',
    mime: asset.mime,
    width: asset.width,
    height: asset.height,
    alt: previous?.alt || asset.alt,
    caption: previous?.caption,
    focus: previous?.focus,
  };
}

// ---- Universal block handle (editor spec §7, T2) -----------------------------------------------

/** The top-level block at (or containing) a document position. */
export function topLevelBlockAt(editor: Editor, pos: number): {pos: number; node: PMNode; index: number} | null {
  const {doc} = editor.state;
  if (!doc.childCount) return null;
  const clamped = Math.max(0, Math.min(pos, doc.content.size));
  const $pos = doc.resolve(clamped);
  const index = $pos.depth > 0 ? $pos.index(0) : Math.min($pos.index(0), doc.childCount - 1);
  let offset = 0;
  for (let i = 0; i < index; i += 1) offset += doc.child(i).nodeSize;
  const node = doc.maybeChild(index);
  return node ? {pos: offset, node, index} : null;
}

/** The top-level block the cursor is in. */
export const currentTopLevelBlock = (editor: Editor) => topLevelBlockAt(editor, editor.state.selection.from);

/**
 * Moves a top-level block up or down one place. A text cursor stays where it was in the text;
 * a selected block stays selected.
 */
export function moveTopLevelBlock(editor: Editor, pos: number, direction: -1 | 1) {
  const {state} = editor;
  const node = state.doc.nodeAt(pos);
  if (!node) return;
  const index = state.doc.resolve(pos).index(0);
  const neighbour = state.doc.maybeChild(index + direction);
  if (!neighbour) return;
  const {selection} = state;
  const offsetInBlock = selection instanceof TextSelection && selection.from >= pos && selection.to <= pos + node.nodeSize ? [selection.anchor - pos, selection.head - pos] : null;
  const tr = state.tr.delete(pos, pos + node.nodeSize);
  const target = direction === -1 ? pos - neighbour.nodeSize : pos + neighbour.nodeSize;
  tr.insert(target, node);
  tr.setSelection(offsetInBlock ? TextSelection.create(tr.doc, target + offsetInBlock[0], target + offsetInBlock[1]) : NodeSelection.create(tr.doc, target));
  editor.view.dispatch(tr.scrollIntoView());
  editor.view.focus();
}

/** Turns a block into a compatible type (blocks/registry.ts decides what's compatible). */
export function turnBlockInto(editor: Editor, pos: number, target: string) {
  const node = editor.state.doc.nodeAt(pos);
  if (!node) return;
  const media = convertMedia(node, target);
  const content = media ? [media] : convertText(node, target);
  if (!content) return;
  const {schema} = editor.state;
  const nodes = content.map(json => schema.nodeFromJSON(json));
  const tr = editor.state.tr.replaceWith(pos, pos + node.nodeSize, nodes);
  const first = nodes[0];
  tr.setSelection(first.isTextblock || first.inlineContent ? TextSelection.near(tr.doc.resolve(pos + 1)) : NodeSelection.create(tr.doc, pos));
  editor.view.dispatch(tr.scrollIntoView());
  editor.view.focus();
}

/**
 * Inserts a new line with "/" before or after a block, so the Smart Insert menu opens right there.
 * If nothing is chosen, the user is left with an empty line, as in Notion.
 */
export function insertAroundBlock(editor: Editor, pos: number, where: 'before' | 'after') {
  const node = editor.state.doc.nodeAt(pos);
  if (!node) return;
  const at = where === 'before' ? pos : pos + node.nodeSize;
  const {schema} = editor.state;
  const tr = editor.state.tr.insert(at, schema.nodes.paragraph.create(null, schema.text('/')));
  tr.setSelection(TextSelection.create(tr.doc, at + 2));
  editor.view.dispatch(tr.scrollIntoView());
  editor.view.focus();
}

/** Copies (or cuts) a whole block through the clipboard, as ProseMirror serialises it. */
export function copyBlock(editor: Editor, pos: number, cut = false) {
  editor.chain().focus().setNodeSelection(pos).run();
  document.execCommand(cut ? 'cut' : 'copy');
}

/**
 * Starts dragging a whole top-level block from the block handle's grip (outside the editor's own
 * DOM). ProseMirror completes the move on drop from `view.dragging` (see prosemirror-view).
 */
export function startBlockDrag(editor: Editor, pos: number, event: DragEvent) {
  const {state, view} = editor;
  const node = state.doc.nodeAt(pos);
  if (!node || !event.dataTransfer) return;
  const selection = NodeSelection.create(state.doc, pos);
  view.dispatch(state.tr.setSelection(selection));
  (view as unknown as {dragging: unknown}).dragging = {slice: selection.content(), move: true, node: selection};
  event.dataTransfer.effectAllowed = 'copyMove';
  event.dataTransfer.setData('text/plain', node.textContent || node.type.name);
  const dom = view.nodeDOM(pos);
  if (dom instanceof HTMLElement) event.dataTransfer.setDragImage(dom, 0, 12);
}

/** Clears a handle drag that ended without a drop (ProseMirror only clears drags it started). */
export function endBlockDrag(editor: Editor) {
  (editor.view as unknown as {dragging: unknown}).dragging = null;
}
