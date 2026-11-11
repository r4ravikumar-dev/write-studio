'use client';

import {useCallback, useEffect, useLayoutEffect, useRef, useState} from 'react';
import type {Editor} from '@tiptap/react';
import {IconButton} from '@astryxdesign/core/IconButton';
import {DropdownMenu} from '@astryxdesign/core/DropdownMenu';
import {Icon} from '@astryxdesign/core/Icon';
import {ArrowDown, ArrowDownToLine, ArrowUp, ArrowUpToLine, ClipboardCopy, Copy, GripVertical, MoreHorizontal, Plus, Scissors, SlidersHorizontal, Trash2} from 'lucide-react';
import {sectionOf} from '@studio/shared';
import {BLOCKS, blockName, turnIntoTargets} from './blocks/registry';
import {copyBlock, deleteBlock, duplicateBlock, endBlockDrag, insertAroundBlock, moveTopLevelBlock, selectBlock, startBlockDrag, topLevelBlockAt, turnBlockInto} from './blockOps';

type Target = {pos: number; index: number};

/** Space the wide handle needs left of the text (+ and the grip); it may reach into the desk. */
const GUTTER = 42;

/**
 * The universal block handle (editor spec §7, T2), one for every top-level block: paragraphs,
 * headings, lists, quotes, tables, images and visual blocks alike. It replaces the visual blocks'
 * own bars (decision D5).
 *
 * Wide screens: in the left margin of the hovered block (or the block with the cursor): `+` adds a
 * block after it (⌥-click: before) through the Smart Insert menu, the grip drags it, ⋯ opens the
 * block menu. Narrow screens and touch: one ⋯ button on the block with the cursor; Move up / down
 * in its menu replace dragging. ⌘/ opens the menu from the keyboard.
 */
export function BlockHandle({
  editor,
  container,
  isEditable,
  onProperties,
}: {
  editor: Editor;
  /** The sheet (.write-document) the handle is positioned in. */
  container: HTMLElement | null;
  isEditable: boolean;
  onProperties: () => void;
}) {
  const [target, setTarget] = useState<Target | null>(null);
  const [position, setPosition] = useState<{top: number; left: number; compact: boolean} | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuOpen = useRef(false);
  const lastPointer = useRef(0);
  const menuButton = useRef<HTMLDivElement | null>(null);
  const isCoarse = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;

  /** The top-level block under a vertical position on screen. */
  const blockAtY = useCallback(
    (y: number): Target | null => {
      const {doc} = editor.state;
      let offset = 0;
      for (let index = 0; index < doc.childCount; index += 1) {
        const dom = editor.view.nodeDOM(offset);
        if (dom instanceof HTMLElement) {
          const rect = dom.getBoundingClientRect();
          if (y >= rect.top - 6 && y <= rect.bottom + 6) return {pos: offset, index};
        }
        offset += doc.child(index).nodeSize;
      }
      return null;
    },
    [editor],
  );

  // Hover (mouse) picks the block; the cursor picks it when typing or on touch screens.
  useEffect(() => {
    if (!container) return;
    let frame = 0;
    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse' || menuOpen.current) return;
      lastPointer.current = Date.now();
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const next = blockAtY(event.clientY);
        if (next) setTarget(current => (current?.pos === next.pos ? current : next));
      });
    };
    const onSelection = () => {
      if (menuOpen.current || Date.now() - lastPointer.current < 400) return;
      const block = topLevelBlockAt(editor, editor.state.selection.from);
      setTarget(block ? {pos: block.pos, index: block.index} : null);
    };
    container.addEventListener('pointermove', onMove);
    editor.on('selectionUpdate', onSelection);
    editor.on('focus', onSelection);
    return () => {
      container.removeEventListener('pointermove', onMove);
      editor.off('selectionUpdate', onSelection);
      editor.off('focus', onSelection);
      cancelAnimationFrame(frame);
    };
  }, [container, editor, blockAtY]);

  // Keep the target valid as the document changes (positions shift when typing above it).
  useEffect(() => {
    const onUpdate = () =>
      setTarget(current => {
        if (!current) return current;
        const block = topLevelBlockAt(editor, Math.min(current.pos, editor.state.doc.content.size));
        return block ? {pos: block.pos, index: block.index} : null;
      });
    editor.on('update', onUpdate);
    return () => {
      editor.off('update', onUpdate);
    };
  }, [editor]);

  // Place the handle beside the block's first line.
  useLayoutEffect(() => {
    if (!container || !target) return;
    const measure = () => {
      const dom = editor.view.nodeDOM(target.pos);
      if (!(dom instanceof HTMLElement)) return setPosition(null);
      const box = container.getBoundingClientRect();
      const rect = dom.getBoundingClientRect();
      const prose = editor.view.dom.getBoundingClientRect();
      // Room left of the text inside the scrolling column: the sheet's margin plus the desk beside it.
      const column = (container.closest('.write-scroll') ?? container).getBoundingClientRect();
      const gutter = prose.left - column.left;
      const compact = isCoarse || gutter < GUTTER;
      const line = Math.min(rect.height / 2, 18);
      setPosition({
        top: rect.top - box.top + line - 18,
        left: compact ? prose.right - box.left - 36 : prose.left - box.left - 44,
        compact,
      });
    };
    measure();
    editor.on('transaction', measure);
    window.addEventListener('resize', measure);
    return () => {
      editor.off('transaction', measure);
      window.removeEventListener('resize', measure);
    };
  }, [container, editor, target, isCoarse]);

  // ⌘/ (Ctrl+/): open the menu for the block with the cursor.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || (event.key !== '/' && event.code !== 'Slash') || !editor.view.hasFocus()) return;
      event.preventDefault();
      const block = topLevelBlockAt(editor, editor.state.selection.from);
      if (!block) return;
      setTarget({pos: block.pos, index: block.index});
      requestAnimationFrame(() => menuButton.current?.querySelector('button')?.click());
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editor]);

  if (!isEditable || !target || !position) return null;
  const node = editor.state.doc.nodeAt(target.pos);
  if (!node) return null;
  const name = blockName(node);
  // Screen readers hear which block: its own words when it has some ("Actions for “Overview”").
  const words = (node.textContent.trim() || (node.type.name === 'heading' ? sectionOf(node)?.title ?? '' : '')).slice(0, 40);
  const lower = words ? `“${words}”` : name.toLowerCase();
  const isFirst = target.index === 0;
  const isLast = target.index === editor.state.doc.childCount - 1;
  const conversions = turnIntoTargets(node);
  const configurable = BLOCKS[node.type.name]?.configurable;
  const pos = target.pos;

  const items = [
    ...(conversions.length
      ? [
          {
            type: 'section' as const,
            title: 'Turn into',
            items: conversions.map(option => ({
              label: option.label,
              icon: <Icon icon={option.icon} size="sm" color="inherit" />,
              onClick: () => turnBlockInto(editor, pos, option.id),
            })),
          },
        ]
      : []),
    {
      type: 'section' as const,
      title: name,
      items: [
        {label: 'Insert before', icon: <Icon icon={ArrowUpToLine} size="sm" color="inherit" />, onClick: () => insertAroundBlock(editor, pos, 'before')},
        {label: 'Insert after', icon: <Icon icon={ArrowDownToLine} size="sm" color="inherit" />, onClick: () => insertAroundBlock(editor, pos, 'after')},
        {label: 'Duplicate', description: shortcut('⌘D'), icon: <Icon icon={Copy} size="sm" color="inherit" />, onClick: () => duplicateBlock(editor, pos)},
        {label: 'Copy', description: shortcut('⌘C'), icon: <Icon icon={ClipboardCopy} size="sm" color="inherit" />, onClick: () => copyBlock(editor, pos)},
        {label: 'Cut', description: shortcut('⌘X'), icon: <Icon icon={Scissors} size="sm" color="inherit" />, onClick: () => copyBlock(editor, pos, true)},
        {label: 'Move up', description: shortcut('⌥⇧↑'), isDisabled: isFirst, icon: <Icon icon={ArrowUp} size="sm" color="inherit" />, onClick: () => moveTopLevelBlock(editor, pos, -1)},
        {label: 'Move down', description: shortcut('⌥⇧↓'), isDisabled: isLast, icon: <Icon icon={ArrowDown} size="sm" color="inherit" />, onClick: () => moveTopLevelBlock(editor, pos, 1)},
        ...(configurable
          ? [
              {
                label: 'Properties',
                icon: <Icon icon={SlidersHorizontal} size="sm" color="inherit" />,
                onClick: () => {
                  selectBlock(editor, pos);
                  onProperties();
                },
              },
            ]
          : []),
        {label: 'Delete', variant: 'destructive' as const, icon: <Icon icon={Trash2} size="sm" color="inherit" />, onClick: () => deleteBlock(editor, pos)},
      ],
    },
  ];

  const menu = (
    <div ref={menuButton} className={position.compact ? 'block-handle-menu' : 'block-handle-menu sr-only'}>
      <DropdownMenu
        renderTrigger={props => (
          <IconButton {...props} label={`Actions for ${lower}`} tooltip={position.compact ? `${name}: actions` : 'Actions (⌘/)'} size="sm" variant="ghost" icon={<Icon icon={MoreHorizontal} size="sm" color="inherit" />} />
        )}
        items={items}
        menuWidth={240}
        menuMaxHeight={480}
        hasChevron={false}
        onOpenChange={open => {
          menuOpen.current = open;
          setIsMenuOpen(open);
        }}
      />
    </div>
  );

  return (
    <div className="block-handle" data-compact={position.compact || undefined} data-open={isMenuOpen || undefined} style={{top: position.top, left: position.left}}>
      {!position.compact && (
        <>
          {/* A compact native button: the Liquid Glass icon-button minimum (36px) doesn't fit the margin. */}
          <button
            type="button"
            className="block-handle-add"
            aria-label={`Add a block after ${lower}`}
            title="Add a block (⌥-click: before)"
            onClick={event => insertAroundBlock(editor, pos, event.altKey ? 'before' : 'after')}>
            <Icon icon={Plus} size="sm" color="inherit" />
          </button>
          {/* The grip drags, and a click opens the menu. It's a plain element (a draggable button
              swallows its own clicks); keyboard and screen-reader users have the ⋯ button
              (visually hidden here, opened with ⌘/) and ⌥⇧↑ / ⌥⇧↓. */}
          <span
            className="block-handle-grip"
            draggable
            aria-hidden="true"
            title="Drag to move, or click for actions"
            onClick={() => menuButton.current?.querySelector('button')?.click()}
            onDragStart={event => startBlockDrag(editor, pos, event.nativeEvent)}
            onDragEnd={() => endBlockDrag(editor)}>
            <Icon icon={GripVertical} size="sm" color="inherit" />
          </span>
        </>
      )}
      {menu}
    </div>
  );
}

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
/** Shortcut text for menu descriptions, with the right modifier names. */
function shortcut(keys: string) {
  return isMac ? keys : keys.replace('⌘', 'Ctrl+').replace('⌥', 'Alt+').replace('⇧', 'Shift+');
}
