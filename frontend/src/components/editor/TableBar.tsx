'use client';

import {useEditorState, type Editor} from '@tiptap/react';
import {BubbleMenu} from '@tiptap/react/menus';
import {HStack} from '@astryxdesign/core/Layout';
import {IconButton} from '@astryxdesign/core/IconButton';
import {DropdownMenu} from '@astryxdesign/core/DropdownMenu';
import {Divider} from '@astryxdesign/core/Divider';
import {Icon} from '@astryxdesign/core/Icon';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  BetweenHorizontalEnd,
  BetweenHorizontalStart,
  BetweenVerticalEnd,
  BetweenVerticalStart,
  MoreHorizontal,
  PanelLeft,
  PanelTop,
  TableCellsMerge,
  TableCellsSplit,
  Trash2,
} from 'lucide-react';

/** The DOM element of the table around the cursor, for anchoring the bar above it. */
function tableElement(editor: Editor): HTMLElement | null {
  const {$from} = editor.state.selection;
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    if ($from.node(depth).type.name === 'table') {
      const dom = editor.view.nodeDOM($from.before(depth)) as HTMLElement | null;
      return dom?.querySelector('table') ?? dom;
    }
  }
  return null;
}

/**
 * Table tools (docs/toolbar-2.0-spec.md, A6): a small glass bar above the table, shown only
 * while the cursor is in a table. Add row, Add column, Header row, Merge, Split, cell
 * alignment, and More (rows/columns above/left, header column, deletions).
 */
export function TableBar({editor}: {editor: Editor}) {
  const state = useEditorState({
    editor,
    selector: ({editor: e}) => ({
      canMerge: e.can().mergeCells(),
      canSplit: e.can().splitCell(),
      align: (['center', 'right'] as const).find(a => e.isActive({textAlign: a})) ?? 'left',
    }),
  });
  const chain = () => editor.chain().focus();
  const button = (label: string, icon: typeof PanelTop, run: () => void, options: {isDisabled?: boolean; why?: string; isActive?: boolean} = {}) => (
    <IconButton
      label={label}
      tooltip={options.isDisabled && options.why ? options.why : label}
      size="sm"
      variant={options.isActive ? 'secondary' : 'ghost'}
      isDisabled={options.isDisabled}
      onClick={run}
      icon={<Icon icon={icon} size="sm" color="inherit" />}
    />
  );
  const AlignIcon = state.align === 'center' ? AlignCenter : state.align === 'right' ? AlignRight : AlignLeft;

  return (
    <BubbleMenu
      editor={editor}
      pluginKey="studioTableBar"
      className="write-table-bar glass glass-group"
      shouldShow={({editor: e}) => e.isEditable && e.isActive('table')}
      getReferencedVirtualElement={() => {
        const table = tableElement(editor);
        return table ? {getBoundingClientRect: () => table.getBoundingClientRect()} : null;
      }}
      options={{placement: 'top-start', offset: 8}}>
      <HStack gap={1} vAlign="center" role="toolbar" aria-label="Table">
        {button('Add row below', BetweenHorizontalEnd, () => chain().addRowAfter().run())}
        {button('Add column right', BetweenVerticalEnd, () => chain().addColumnAfter().run())}
        {button('Header row on or off', PanelTop, () => chain().toggleHeaderRow().run())}
        <Divider orientation="vertical" className="write-tool-separator" />
        {button('Merge cells', TableCellsMerge, () => chain().mergeCells().run(), {isDisabled: !state.canMerge, why: 'Select two or more cells to merge them'})}
        {button('Split cell', TableCellsSplit, () => chain().splitCell().run(), {isDisabled: !state.canSplit, why: 'Put the cursor in a merged cell to split it'})}
        <DropdownMenu
          renderTrigger={props => <IconButton {...props} label="Cell alignment" tooltip="Cell alignment" size="sm" variant="ghost" icon={<Icon icon={AlignIcon} size="sm" color="inherit" />} />}
          items={[
            {label: 'Align left', icon: <Icon icon={AlignLeft} size="sm" color="inherit" />, onClick: () => chain().setTextAlign('left').run()},
            {label: 'Align centre', icon: <Icon icon={AlignCenter} size="sm" color="inherit" />, onClick: () => chain().setTextAlign('center').run()},
            {label: 'Align right', icon: <Icon icon={AlignRight} size="sm" color="inherit" />, onClick: () => chain().setTextAlign('right').run()},
          ]}
          menuWidth={180}
          hasChevron={false}
        />
        <DropdownMenu
          renderTrigger={props => <IconButton {...props} label="More table options" tooltip="More table options" size="sm" variant="ghost" icon={<Icon icon={MoreHorizontal} size="sm" color="inherit" />} />}
          items={[
            {
              type: 'section' as const,
              title: 'Add',
              items: [
                {label: 'Add row above', icon: <Icon icon={BetweenHorizontalStart} size="sm" color="inherit" />, onClick: () => chain().addRowBefore().run()},
                {label: 'Add column left', icon: <Icon icon={BetweenVerticalStart} size="sm" color="inherit" />, onClick: () => chain().addColumnBefore().run()},
                {label: 'Header column on or off', icon: <Icon icon={PanelLeft} size="sm" color="inherit" />, onClick: () => chain().toggleHeaderColumn().run()},
              ],
            },
            {
              type: 'section' as const,
              title: 'Delete',
              items: [
                {label: 'Delete row', variant: 'destructive' as const, icon: <Icon icon={Trash2} size="sm" color="inherit" />, onClick: () => chain().deleteRow().run()},
                {label: 'Delete column', variant: 'destructive' as const, icon: <Icon icon={Trash2} size="sm" color="inherit" />, onClick: () => chain().deleteColumn().run()},
                {label: 'Delete table', variant: 'destructive' as const, icon: <Icon icon={Trash2} size="sm" color="inherit" />, onClick: () => chain().deleteTable().run()},
              ],
            },
          ]}
          menuWidth={240}
          hasChevron={false}
        />
      </HStack>
    </BubbleMenu>
  );
}
