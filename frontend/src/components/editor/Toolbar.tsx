'use client';

import {createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode} from 'react';
import type {Mark} from '@tiptap/pm/model';
import {Divider} from '@astryxdesign/core/Divider';
import {caseStudySections} from '@/content/caseStudyTemplate';
import {caseStudySectionNodes} from '@studio/shared';
import {Tab, TabList} from '@astryxdesign/core/TabList';
import {useEditorState, type Editor} from '@tiptap/react';
import {HStack, VStack} from '@astryxdesign/core/Layout';
import {Grid} from '@astryxdesign/core/Grid';
import {Text} from '@astryxdesign/core/Text';
import {Selector} from '@astryxdesign/core/Selector';
import {IconButton} from '@astryxdesign/core/IconButton';
import {Popover} from '@astryxdesign/core/Popover';
import {DropdownMenu} from '@astryxdesign/core/DropdownMenu';
import {Icon} from '@astryxdesign/core/Icon';
import {
  AArrowDown,
  AArrowUp,
  ALargeSmall,
  ChartColumn,
  Columns2,
  CornerDownLeft,
  Heading2,
  LayoutTemplate,
  Lightbulb,
  ListCollapse,
  MoveVertical,
  PaintbrushVertical,
  TextQuote,
  Unlink,
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Baseline,
  BetweenHorizontalEnd,
  BetweenHorizontalStart,
  BetweenVerticalEnd,
  BetweenVerticalStart,
  Bold,
  Code,
  Highlighter,
  Italic,
  Link2,
  List,
  ListChecks,
  ListIndentDecrease,
  ListIndentIncrease,
  ListOrdered,
  PanelTop,
  Plus,
  Quote,
  Redo2,
  RemoveFormatting,
  SeparatorHorizontal,
  SquareCode,
  Strikethrough,
  Subscript,
  Superscript,
  Table2,
  TableCellsMerge,
  TableCellsSplit,
  Trash2,
  Underline,
  Undo2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type {InsertCommand} from './insertCommands';

/** Paragraph styles, font families and sizes on offer (the site's own type). */
const BLOCKS = [
  {value: 'p', label: 'Paragraph'},
  {value: 'h1', label: 'Title'},
  {value: 'h2', label: 'Section heading'},
  {value: 'h3', label: 'Subheading'},
  {value: 'h4', label: 'Small heading'},
  {value: 'quote', label: 'Quote'},
  {value: 'code', label: 'Code'},
];

export const FONTS = [
  {value: 'default', label: 'Outfit (body)'},
  {value: 'var(--font-family-accent)', label: 'Bricolage Grotesque (display)'},
];

const SIZES = [
  'default',
  '12px',
  '14px',
  '16px',
  '18px',
  '20px',
  '24px',
  '28px',
  '32px',
  '40px',
  '48px',
  '64px',
];

/** Font weights the site's fonts carry (IBM Plex Sans has them all). */
const WEIGHTS = [
  {value: 'default', label: 'Weight'},
  {value: '300', label: 'Light'},
  {value: '400', label: 'Regular'},
  {value: '500', label: 'Medium'},
  {value: '600', label: 'Semibold'},
  {value: '700', label: 'Bold'},
];

/** Letter spacing, from tight (big headings) to wide (small caps labels). */
const LETTER_SPACINGS = [
  {value: 'default', label: 'Letter spacing'},
  {value: '-0.03em', label: 'Tighter (−3%)'},
  {value: '-0.02em', label: 'Tight (−2%)'},
  {value: '-0.01em', label: 'Slightly tight (−1%)'},
  {value: '0', label: 'Normal'},
  {value: '0.02em', label: 'Slightly wide (2%)'},
  {value: '0.05em', label: 'Wide (5%)'},
  {value: '0.08em', label: 'Wider (8%)'},
];

/** Line height, as in Word and Google Docs. */
const LINE_HEIGHTS = [
  {value: 'default', label: 'Line height'},
  {value: '1', label: 'Single'},
  {value: '1.15', label: '1.15'},
  {value: '1.5', label: '1.5'},
  {value: '1.8', label: '1.8'},
  {value: '2', label: 'Double'},
];

/** Text and highlight colours as theme tokens, so they adapt to light and dark mode. */
export const COLORS = [
  {label: 'Default', value: ''},
  {label: 'Brand purple', value: 'var(--color-brand-text)'},
  {label: 'Secondary', value: 'var(--color-text-secondary)'},
  {label: 'Blue', value: 'var(--color-text-blue)'},
  {label: 'Teal', value: 'var(--color-text-teal)'},
  {label: 'Green', value: 'var(--color-text-green)'},
  {label: 'Yellow', value: 'var(--color-text-yellow)'},
  {label: 'Orange', value: 'var(--color-text-orange)'},
  {label: 'Red', value: 'var(--color-text-red)'},
  {label: 'Pink', value: 'var(--color-text-pink)'},
  {label: 'Purple', value: 'var(--color-text-purple)'},
];

export const HIGHLIGHTS = [
  {label: 'None', value: ''},
  {label: 'Blue', value: 'var(--color-background-blue)'},
  {label: 'Teal', value: 'var(--color-background-teal)'},
  {label: 'Green', value: 'var(--color-background-green)'},
  {label: 'Yellow', value: 'var(--color-background-yellow)'},
  {label: 'Orange', value: 'var(--color-background-orange)'},
  {label: 'Red', value: 'var(--color-background-red)'},
  {label: 'Pink', value: 'var(--color-background-pink)'},
  {label: 'Purple', value: 'var(--color-background-purple)'},
  {label: 'Gray', value: 'var(--color-background-gray)'},
];

function blockOf(editor: Editor) {
  for (const level of [1, 2, 3, 4] as const)
    if (editor.isActive('heading', {level})) return `h${level}`;
  if (editor.isActive('blockquote')) return 'quote';
  if (editor.isActive('codeBlock')) return 'code';
  return 'p';
}

function setBlock(editor: Editor, value: string) {
  const chain = editor.chain().focus();
  if (value === 'p') chain.setParagraph().run();
  else if (value === 'quote') chain.setParagraph().toggleBlockquote().run();
  else if (value === 'code') chain.toggleCodeBlock().run();
  else chain.setHeading({level: Number(value.slice(1)) as 1 | 2 | 3 | 4}).run();
}

/** A row of swatches for picking a text or highlight colour. */
export function Swatches({
  label,
  options,
  current,
  onPick,
  kind,
}: {
  label: string;
  options: {label: string; value: string}[];
  current: string;
  onPick: (value: string) => void;
  kind: 'text' | 'highlight';
}) {
  return (
    <VStack gap={2}>
      <Text type="supporting" color="secondary">
        {label}
      </Text>
      <Grid columns={6} gap={1}>
        {options.map(option => (
          <IconButton
            key={option.label}
            label={option.label}
            tooltip={option.label}
            size="sm"
            variant={current === option.value ? 'secondary' : 'ghost'}
            onClick={() => onPick(option.value)}
            icon={
              <span
                aria-hidden
                className="write-swatch"
                data-kind={kind}
                data-empty={option.value ? undefined : true}
                style={{['--swatch' as string]: option.value || 'transparent'}}
              />
            }
          />
        ))}
      </Grid>
    </VStack>
  );
}

/** The toolbar's tabs, like Word's ribbon: one per group of tools. */
const TABS = ['Text', 'Format', 'Paragraph', 'Structure'] as const;
type ToolTab = (typeof TABS)[number];

const ActiveTab = createContext<ToolTab>('Format');

/** Phones (below 768px, the mobile breakpoint used across the Studio). */
const PHONE_QUERY = '(max-width: 767px)';
function useIsPhone() {
  return useSyncExternalStore(
    onChange => {
      const query = window.matchMedia(PHONE_QUERY);
      query.addEventListener('change', onChange);
      return () => query.removeEventListener('change', onChange);
    },
    () => window.matchMedia(PHONE_QUERY).matches,
    () => false,
  );
}

/** One tab's tools: shown only while its tab is selected. */
function ToolGroup({label, children}: {label: ToolTab; children: ReactNode}) {
  if (useContext(ActiveTab) !== label) return null;
  return (
    <HStack
      gap={1}
      vAlign="center"
      wrap="wrap"
      className="write-tool-panel"
      role="tabpanel"
      id={`write-tools-${label}`}
      aria-label={label}>
      {children}
    </HStack>
  );
}

/** Indents or outdents whichever kind of list item the cursor is in. */
function shiftListItem(editor: Editor, direction: 'in' | 'out') {
  const item = editor.isActive('taskItem') ? 'taskItem' : 'listItem';
  const chain = editor.chain().focus();
  return direction === 'in' ? chain.sinkListItem(item).run() : chain.liftListItem(item).run();
}

/**
 * The editor's formatting bar, in tabs like Word's ribbon, one per group:
 * Text (style, font, size, weight, line height, letter spacing), Format (bold to code, colour,
 * link, clear formatting), Paragraph (alignment, lists, indent) and Structure (quote, code block, divider, table and its rows and
 * columns).
 */
export function Toolbar({
  editor,
  onLink,
  inserts,
}: {
  editor: Editor;
  onLink: () => void;
  inserts: InsertCommand[];
}) {
  const [tab, setTab] = useState<ToolTab>('Format');
  /**
   * Phones follow Word / Google Docs mobile: a collapsed bottom bar of quick tools (the Format
   * group) with ⌃, which opens a sheet with a tab picker, undo/redo and that tab's tools.
   */
  const [isExpanded, setIsExpanded] = useState(false);
  const isPhone = useIsPhone();
  const shownTab: ToolTab = isPhone && !isExpanded ? 'Format' : tab;
  /** Bottom bar on phones: every picker and menu opens upward, never off-screen. */
  const popupPlacement = isPhone ? ('above' as const) : undefined;
  // Format painter: the marks copied from the text under the cursor, waiting
  // to be laid onto the next selection (like Word's Format Painter).
  const [painter, setPainter] = useState<readonly Mark[] | null>(null);
  useEffect(() => {
    if (!painter) return;
    const apply = () => {
      if (editor.state.selection.empty) return;
      let chain = editor.chain().focus().unsetAllMarks();
      for (const mark of painter) chain = chain.setMark(mark.type.name, mark.attrs);
      chain.run();
      setPainter(null);
    };
    editor.on('selectionUpdate', apply);
    return () => {
      editor.off('selectionUpdate', apply);
    };
  }, [editor, painter]);
  const state = useEditorState({
    editor,
    selector: ({editor: e}) => ({
      block: blockOf(e),
      font: (e.getAttributes('textStyle').fontFamily as string | undefined) ?? 'default',
      size: (e.getAttributes('textStyle').fontSize as string | undefined) ?? 'default',
      lineHeight: (e.getAttributes('textStyle').lineHeight as string | undefined) ?? 'default',
      weight: (e.getAttributes('textStyle').fontWeight as string | undefined) ?? 'default',
      textCase: (e.getAttributes('textStyle').textTransform as string | undefined) ?? '',
      details: e.isActive('details'),
      letterSpacing:
        (e.getAttributes('textStyle').letterSpacing as string | undefined) ?? 'default',
      color: (e.getAttributes('textStyle').color as string | undefined) ?? '',
      highlight: (e.getAttributes('highlight').color as string | undefined) ?? '',
      bold: e.isActive('bold'),
      italic: e.isActive('italic'),
      underline: e.isActive('underline'),
      strike: e.isActive('strike'),
      subscript: e.isActive('subscript'),
      superscript: e.isActive('superscript'),
      code: e.isActive('code'),
      link: e.isActive('link'),
      bullet: e.isActive('bulletList'),
      ordered: e.isActive('orderedList'),
      task: e.isActive('taskList'),
      inList: e.isActive('listItem') || e.isActive('taskItem'),
      quote: e.isActive('blockquote'),
      codeBlock: e.isActive('codeBlock'),
      table: e.isActive('table'),
      align:
        (['center', 'right', 'justify'] as const).find(a => e.isActive({textAlign: a})) ?? 'left',
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
      canMerge: e.can().mergeCells(),
      canSplit: e.can().splitCell(),
    }),
  });

  const tool = (
    label: string,
    icon: typeof Bold,
    isActive: boolean,
    run: () => void,
    options: {shortcut?: string; isDisabled?: boolean} = {},
  ) => (
    <IconButton
      label={label}
      tooltip={options.shortcut ? `${label} (${options.shortcut})` : label}
      icon={<Icon icon={icon} size="sm" color="inherit" />}
      variant={isActive ? 'secondary' : 'ghost'}
      size="sm"
      isDisabled={options.isDisabled}
      onClick={run}
    />
  );
  const chain = () => editor.chain().focus();
  /** Runs one of the Insert menu's commands (visual blocks and the like). */
  const runInsert = (id: string) => inserts.find(item => item.id === id)?.run();
  /** One step up or down the size list, from the text's current size. */
  const stepSize = (direction: 1 | -1) => {
    const sizes = SIZES.filter(size => size !== 'default');
    const current = parseInt(state.size === 'default' ? '18px' : state.size, 10);
    const index = sizes.findIndex(size => parseInt(size, 10) >= current);
    const from = index === -1 ? sizes.length - 1 : index;
    const next = sizes[Math.max(0, Math.min(sizes.length - 1, from + direction))];
    chain().setFontSize(next).run();
  };
  const separator = <Divider orientation="vertical" className="write-tool-separator" />;
  const tableItem = (
    label: string,
    icon: typeof Bold,
    run: () => void,
    isDisabled = !state.table,
  ) => ({
    label,
    icon: <Icon icon={icon} size="sm" color="inherit" />,
    isDisabled,
    onClick: run,
    ...(label.startsWith('Delete') ? {variant: 'destructive' as const} : {}),
  });

  const insertItems = (['Visual', 'Media', 'Text'] as const).map(group => ({
    type: 'section' as const,
    title: group === 'Visual' ? 'Visual blocks' : group,
    items: inserts
      .filter(item => item.group === group)
      .map(item => ({
        label: item.label,
        description: item.description,
        icon: <Icon icon={item.icon} size="sm" color="inherit" />,
        onClick: () => item.run(),
      })),
  }));

  return (
    <ActiveTab.Provider value={shownTab}>
      <VStack gap={0} className="write-toolbar glass glass--panel" role="toolbar" aria-label="Formatting" data-expanded={isPhone && isExpanded ? 'true' : undefined}>
        <HStack gap={2} vAlign="center" className="write-tool-tabs">
          {/* Undo and redo at the left edge, whichever tab is open. */}
          <HStack gap={1} className="write-tool-quick only-wide">
            {tool('Undo', Undo2, false, () => chain().undo().run(), {
              shortcut: '⌘Z',
              isDisabled: !state.canUndo,
            })}
            {tool('Redo', Redo2, false, () => chain().redo().run(), {
              shortcut: '⇧⌘Z',
              isDisabled: !state.canRedo,
            })}
          </HStack>
          <HStack gap={2} vAlign="center" className="write-tool-centre">
            <span className="only-wide">
              <TabList
                value={tab}
                onChange={value => setTab(value as ToolTab)}
                size="sm"
                role="tablist">
                {TABS.map(name => (
                  <Tab key={name} value={name} label={name} panelId={`write-tools-${name}`} />
                ))}
              </TabList>
            </span>
            {/* Phones: a compact picker instead of four tabs. */}
            <span className="only-narrow">
              <Selector
                placement={popupPlacement}
                label="Tools"
                isLabelHidden
                options={TABS.map(name => ({value: name, label: name}))}
                value={tab}
                onChange={value => setTab(value as ToolTab)}
                size="sm"
                variant="ghost"
              />
            </span>
          </HStack>
          {/* Insert at the right edge, whichever tab is open. */}
          <HStack gap={2} vAlign="center" className="write-tool-end only-wide">
            <DropdownMenu
              placement={popupPlacement}
              button={{
                label: 'Insert',
                size: 'sm',
                variant: 'primary',
                icon: <Icon icon={Plus} size="sm" color="inherit" />,
              }}
              items={insertItems}
              menuWidth={280}
              menuMaxHeight={560}
            />
          </HStack>
        </HStack>

        <ToolGroup label="Text">
          <Selector
            placement={popupPlacement}
            label="Paragraph style"
            isLabelHidden
            options={BLOCKS}
            value={state.block}
            onChange={value => setBlock(editor, value)}
            size="sm"
            variant="ghost"
          />
          <Selector
            placement={popupPlacement}
            label="Font"
            isLabelHidden
            options={FONTS}
            value={state.font}
            onChange={value =>
              value === 'default'
                ? chain().unsetFontFamily().run()
                : chain().setFontFamily(value).run()
            }
            size="sm"
            variant="ghost"
          />
          <Selector
            placement={popupPlacement}
            label="Size"
            isLabelHidden
            options={SIZES.map(size => ({
              value: size,
              label: size === 'default' ? 'Size' : size.replace('px', ''),
            }))}
            value={state.size}
            onChange={value =>
              value === 'default' ? chain().unsetFontSize().run() : chain().setFontSize(value).run()
            }
            size="sm"
            variant="ghost"
          />
          <Selector
            placement={popupPlacement}
            label="Weight"
            isLabelHidden
            options={WEIGHTS}
            value={state.weight}
            onChange={value =>
              value === 'default'
                ? chain().unsetFontWeight().run()
                : chain().setFontWeight(value).run()
            }
            size="sm"
            variant="ghost"
          />
          <Selector
            placement={popupPlacement}
            label="Line height"
            isLabelHidden
            options={LINE_HEIGHTS}
            value={state.lineHeight}
            onChange={value =>
              value === 'default'
                ? chain().unsetLineHeight().run()
                : chain().setLineHeight(value).run()
            }
            size="sm"
            variant="ghost"
          />
          <Selector
            placement={popupPlacement}
            label="Letter spacing"
            isLabelHidden
            options={LETTER_SPACINGS}
            value={state.letterSpacing}
            onChange={value =>
              value === 'default'
                ? chain().unsetLetterSpacing().run()
                : chain().setLetterSpacing(value).run()
            }
            size="sm"
            variant="ghost"
          />
        </ToolGroup>

        <ToolGroup label="Format">
          {tool('Bold', Bold, state.bold, () => chain().toggleBold().run(), {shortcut: '⌘B'})}
          {tool('Italic', Italic, state.italic, () => chain().toggleItalic().run(), {
            shortcut: '⌘I',
          })}
          {tool('Underline', Underline, state.underline, () => chain().toggleUnderline().run(), {
            shortcut: '⌘U',
          })}
          {tool('Strikethrough', Strikethrough, state.strike, () => chain().toggleStrike().run(), {
            shortcut: '⇧⌘S',
          })}
          {tool('Subscript', Subscript, state.subscript, () => chain().toggleSubscript().run(), {
            shortcut: '⌘,',
          })}
          {tool(
            'Superscript',
            Superscript,
            state.superscript,
            () => chain().toggleSuperscript().run(),
            {shortcut: '⌘.'},
          )}
          {tool('Inline code', Code, state.code, () => chain().toggleCode().run(), {
            shortcut: '⌘E',
          })}
          {separator}
          <DropdownMenu
            placement={popupPlacement}
            renderTrigger={props => (
              <IconButton
                {...props}
                label="Text case"
                tooltip="Text case"
                icon={<Icon icon={ALargeSmall} size="sm" color="inherit" />}
                variant={state.textCase ? 'secondary' : 'ghost'}
                size="sm"
              />
            )}
            items={[
              {label: 'Normal', onClick: () => chain().unsetTextTransform().run()},
              {label: 'UPPERCASE', onClick: () => chain().setTextTransform('uppercase').run()},
              {label: 'lowercase', onClick: () => chain().setTextTransform('lowercase').run()},
              {label: 'Title Case', onClick: () => chain().setTextTransform('capitalize').run()},
            ]}
            menuWidth={180}
            hasChevron={false}
          />
          {tool('Increase font size', AArrowUp, false, () => stepSize(1))}
          {tool('Decrease font size', AArrowDown, false, () => stepSize(-1))}
          {separator}
          <Popover
            label="Text colour"
            content={
              <VStack gap={4}>
                <Swatches
                  label="Text colour"
                  kind="text"
                  options={COLORS}
                  current={state.color}
                  onPick={value =>
                    value ? chain().setColor(value).run() : chain().unsetColor().run()
                  }
                />
                <Swatches
                  label="Highlight"
                  kind="highlight"
                  options={HIGHLIGHTS}
                  current={state.highlight}
                  onPick={value =>
                    value
                      ? chain().setHighlight({color: value}).run()
                      : chain().unsetHighlight().run()
                  }
                />
              </VStack>
            }>
            <IconButton
              label="Colour and highlight"
              tooltip="Colour and highlight"
              icon={
                <Icon icon={state.highlight ? Highlighter : Baseline} size="sm" color="inherit" />
              }
              variant={state.color || state.highlight ? 'secondary' : 'ghost'}
              size="sm"
            />
          </Popover>
          {tool('Link', Link2, state.link, onLink, {shortcut: '⌘K'})}
          {tool(
            'Remove link',
            Unlink,
            false,
            () => chain().extendMarkRange('link').unsetLink().run(),
            {
              isDisabled: !state.link,
            },
          )}
          {separator}
          {tool(
            painter ? 'Format painter: select text to apply' : 'Format painter',
            PaintbrushVertical,
            Boolean(painter),
            () => setPainter(current => (current ? null : editor.state.selection.$from.marks())),
          )}
          {tool(
            'Clear formatting',
            RemoveFormatting,
            false,
            () => chain().unsetAllMarks().clearNodes().unsetTextAlign().run(),
            {
              shortcut: '⌘\\',
            },
          )}
        </ToolGroup>

        <ToolGroup label="Paragraph">
          {tool(
            'Align left',
            AlignLeft,
            state.align === 'left',
            () => chain().setTextAlign('left').run(),
            {shortcut: '⇧⌘L'},
          )}
          {tool(
            'Align centre',
            AlignCenter,
            state.align === 'center',
            () => chain().setTextAlign('center').run(),
            {shortcut: '⇧⌘E'},
          )}
          {tool(
            'Align right',
            AlignRight,
            state.align === 'right',
            () => chain().setTextAlign('right').run(),
            {shortcut: '⇧⌘R'},
          )}
          {tool(
            'Justify',
            AlignJustify,
            state.align === 'justify',
            () => chain().setTextAlign('justify').run(),
            {shortcut: '⇧⌘J'},
          )}
          {tool('Bulleted list', List, state.bullet, () => chain().toggleBulletList().run(), {
            shortcut: '⇧⌘8',
          })}
          {tool(
            'Numbered list',
            ListOrdered,
            state.ordered,
            () => chain().toggleOrderedList().run(),
            {shortcut: '⇧⌘7'},
          )}
          {tool('Checklist', ListChecks, state.task, () => chain().toggleTaskList().run(), {
            shortcut: '⇧⌘9',
          })}
          {tool('Decrease indent', ListIndentDecrease, false, () => shiftListItem(editor, 'out'), {
            shortcut: '⇧Tab',
            isDisabled: !state.inList,
          })}
          {tool('Increase indent', ListIndentIncrease, false, () => shiftListItem(editor, 'in'), {
            shortcut: 'Tab',
            isDisabled: !state.inList,
          })}
        </ToolGroup>

        <ToolGroup label="Structure">
          {tool('New section', Heading2, false, () => runInsert('section'))}
          <DropdownMenu
            placement={popupPlacement}
            renderTrigger={props => (
              <IconButton
                {...props}
                label="Add a template section"
                tooltip="Add a template section"
                icon={<Icon icon={LayoutTemplate} size="sm" color="inherit" />}
                variant="ghost"
                size="sm"
              />
            )}
            items={[
              {
                type: 'section',
                title: 'Template sections',
                items: caseStudySections.map(section => ({
                  label: section.title,
                  description: section.hint,
                  onClick: () => chain().insertContent(caseStudySectionNodes(section)).run(),
                })),
              },
            ]}
            menuWidth={300}
            menuMaxHeight={480}
            hasChevron={false}
          />
          {separator}
          {tool('Quote', Quote, state.quote, () => chain().toggleBlockquote().run(), {
            shortcut: '⇧⌘B',
          })}
          {tool('Pull quote', TextQuote, false, () => runInsert('pull-quote'))}
          {tool('Callout', Lightbulb, false, () => runInsert('callout'))}
          {tool('Collapsible section', ListCollapse, state.details, () =>
            state.details ? chain().unsetDetails().run() : chain().setDetails().run(),
          )}
          {tool('Code block', SquareCode, state.codeBlock, () => chain().toggleCodeBlock().run(), {
            shortcut: '⌥⌘C',
          })}
          {separator}
          {tool('Split layout', Columns2, false, () => runInsert('split'))}
          {tool('Divider', SeparatorHorizontal, false, () => chain().setHorizontalRule().run())}
          <DropdownMenu
            placement={popupPlacement}
            renderTrigger={props => (
              <IconButton
                {...props}
                label="Add space"
                tooltip="Add space"
                icon={<Icon icon={MoveVertical} size="sm" color="inherit" />}
                variant="ghost"
                size="sm"
              />
            )}
            items={[
              {
                type: 'section',
                title: 'Add space',
                items: (
                  [
                    ['sm', 'Small'],
                    ['md', 'Medium'],
                    ['lg', 'Large'],
                    ['xl', 'Extra large'],
                  ] as const
                ).map(([size, label]) => ({
                  label,
                  onClick: () => chain().insertSpacer(size).run(),
                })),
              },
            ]}
            menuWidth={180}
            hasChevron={false}
          />
          {tool('Line break', CornerDownLeft, false, () => chain().setHardBreak().run(), {
            shortcut: '⇧↵',
          })}
          {separator}
          {tool('Metrics', ChartColumn, false, () => runInsert('metrics'))}
          <DropdownMenu
            placement={popupPlacement}
            renderTrigger={props => (
              <IconButton
                {...props}
                label="Table"
                tooltip="Table"
                icon={<Icon icon={Table2} size="sm" color="inherit" />}
                variant={state.table ? 'secondary' : 'ghost'}
                size="sm"
              />
            )}
            items={[
              {
                type: 'section',
                title: 'Table',
                items: [
                  tableItem(
                    'Insert a 3 × 3 table',
                    Table2,
                    () => chain().insertTable({rows: 3, cols: 3, withHeaderRow: true}).run(),
                    false,
                  ),
                  tableItem('Header row on or off', PanelTop, () =>
                    chain().toggleHeaderRow().run(),
                  ),
                ],
              },
              {
                type: 'section',
                title: 'Rows',
                items: [
                  tableItem('Add row above', BetweenHorizontalStart, () =>
                    chain().addRowBefore().run(),
                  ),
                  tableItem('Add row below', BetweenHorizontalEnd, () =>
                    chain().addRowAfter().run(),
                  ),
                  {
                    ...tableItem('Delete row', Trash2, () => chain().deleteRow().run()),
                    variant: 'destructive' as const,
                  },
                ],
              },
              {
                type: 'section',
                title: 'Columns',
                items: [
                  tableItem('Add column left', BetweenVerticalStart, () =>
                    chain().addColumnBefore().run(),
                  ),
                  tableItem('Add column right', BetweenVerticalEnd, () =>
                    chain().addColumnAfter().run(),
                  ),
                  {
                    ...tableItem('Delete column', Trash2, () => chain().deleteColumn().run()),
                    variant: 'destructive' as const,
                  },
                ],
              },
              {
                type: 'section',
                title: 'Cells',
                items: [
                  tableItem(
                    'Merge cells',
                    TableCellsMerge,
                    () => chain().mergeCells().run(),
                    !state.canMerge,
                  ),
                  tableItem(
                    'Split cell',
                    TableCellsSplit,
                    () => chain().splitCell().run(),
                    !state.canSplit,
                  ),
                  {
                    ...tableItem('Delete table', Trash2, () => chain().deleteTable().run()),
                    variant: 'destructive' as const,
                  },
                ],
              },
            ]}
            menuWidth={240}
            menuMaxHeight={520}
            hasChevron={false}
          />
        </ToolGroup>
        {/* Phones: expand the bottom bar to every tool group, or collapse it back to one row. */}
        <span className="write-tool-toggle only-narrow">
          <IconButton
            label={isExpanded ? 'Close tools' : 'More tools'}
            tooltip={isExpanded ? 'Close tools' : 'More tools'}
            variant="ghost"
            size="sm"
            aria-expanded={isExpanded}
            onClick={() => setIsExpanded(open => !open)}
            icon={<Icon icon={isExpanded ? ChevronDown : ChevronUp} size="sm" color="inherit" />}
          />
        </span>
      </VStack>
      {/* Phones: Insert is a floating action button (bottom-right), opening the same menu upward. */}
      <div className="write-fab only-narrow">
        <DropdownMenu
          renderTrigger={props => (
            <IconButton {...props} label="Insert" tooltip="Insert" variant="primary" size="lg" icon={<Icon icon={Plus} size="md" color="inherit" />} />
          )}
          items={insertItems}
          placement="above"
          alignment="end"
          menuWidth="75vw"
          menuMaxHeight={480}
        />
      </div>
    </ActiveTab.Provider>
  );
}
