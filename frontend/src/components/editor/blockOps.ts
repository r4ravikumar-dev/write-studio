'use client';

import type {Editor} from '@tiptap/react';
import type {Node as PMNode} from '@tiptap/pm/model';
import {NodeSelection} from '@tiptap/pm/state';
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
    if (name in VISUAL_BLOCKS || name === 'image') return {name, pos: selection.from, node: selection.node};
  }
  const {$from} = selection;
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const node = $from.node(depth);
    // Visual blocks, and tables (the Table inspector), when the cursor is inside them.
    if (node.type.name in VISUAL_BLOCKS || node.type.name === 'table') return {name: node.type.name, pos: $from.before(depth), node};
  }
  return null;
}

export const blockLabel = (name: string) => (VISUAL_BLOCKS as Record<string, string>)[name] ?? ({image: 'Image', table: 'Table'} as Record<string, string>)[name] ?? name;

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
