'use client';

import {useEffect, useRef, useState, useSyncExternalStore, type ReactNode} from 'react';
import type {Mark} from '@tiptap/pm/model';
import {useEditorState, type Editor} from '@tiptap/react';
import {Divider} from '@astryxdesign/core/Divider';
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
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Baseline,
  Bold,
  ChevronDown,
  ChevronUp,
  Code,
  Highlighter,
  Italic,
  Link2,
  List,
  ListChecks,
  ListIndentDecrease,
  ListIndentIncrease,
  ListOrdered,
  MoreHorizontal,
  PaintbrushVertical,
  Plus,
  Redo2,
  RemoveFormatting,
  Search,
  Strikethrough,
  Subscript,
  Superscript,
  Underline,
  Undo2,
  Unlink,
} from 'lucide-react';
import {TEXT_ROLES, type TextRole} from '@/components/caseStudy/schema';
import type {InsertCommand} from './insertCommands';
import {insertMenuItems} from './insertCommands';
import {useRovingFocus} from './rovingFocus';

// ---------------------------------------------------------------------------------------------
// Options

/**
 * Text styles (semantic, from the design system). Headings are real h1–h4; Display, Lead,
 * Small, Caption and Label are paragraphs with a text role (a class the type scale styles).
 */
const STYLES = [
  {value: 'display', label: 'Display'},
  {value: 'h1', label: 'Title'},
  {value: 'h2', label: 'Heading 1'},
  {value: 'h3', label: 'Heading 2'},
  {value: 'h4', label: 'Heading 3'},
  {value: 'lead', label: 'Lead'},
  {value: 'p', label: 'Body'},
  {value: 'small', label: 'Small'},
  {value: 'caption', label: 'Caption'},
  {value: 'label', label: 'Label'},
  {value: 'quote', label: 'Quote'},
  {value: 'code', label: 'Code'},
];

export const FONTS = [
  {value: 'default', label: 'Outfit (body)'},
  {value: 'var(--font-family-accent)', label: 'Bricolage Grotesque (display)'},
];

const SIZES = ['default', '12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px', '40px', '48px', '64px'];

const WEIGHTS = [
  {value: 'default', label: 'Default'},
  {value: '300', label: 'Light'},
  {value: '400', label: 'Regular'},
  {value: '500', label: 'Medium'},
  {value: '600', label: 'Semibold'},
  {value: '700', label: 'Bold'},
];

const LETTER_SPACINGS = [
  {value: 'default', label: 'Default'},
  {value: '-0.03em', label: 'Tighter (−3%)'},
  {value: '-0.02em', label: 'Tight (−2%)'},
  {value: '-0.01em', label: 'Slightly tight (−1%)'},
  {value: '0', label: 'Normal'},
  {value: '0.02em', label: 'Slightly wide (2%)'},
  {value: '0.05em', label: 'Wide (5%)'},
  {value: '0.08em', label: 'Wider (8%)'},
];

const LINE_HEIGHTS = [
  {value: 'default', label: 'Default'},
  {value: '1', label: 'Single'},
  {value: '1.15', label: '1.15'},
  {value: '1.5', label: '1.5'},
  {value: '1.8', label: '1.8'},
  {value: '2', label: 'Double'},
];

/** Text and highlight colours as theme tokens. */
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

const ALIGNMENTS = [
  {value: 'left', label: 'Align left', icon: AlignLeft, shortcut: '⇧⌘L'},
  {value: 'center', label: 'Align centre', icon: AlignCenter, shortcut: '⇧⌘E'},
  {value: 'right', label: 'Align right', icon: AlignRight, shortcut: '⇧⌘R'},
  {value: 'justify', label: 'Justify', icon: AlignJustify, shortcut: '⇧⌘J'},
] as const;

// ---------------------------------------------------------------------------------------------
// Helpers

function styleOf(editor: Editor) {
  for (const level of [1, 2, 3, 4] as const) if (editor.isActive('heading', {level})) return `h${level}`;
  if (editor.isActive('codeBlock')) return 'code';
  if (editor.isActive('blockquote')) return 'quote';
  const role = editor.getAttributes('paragraph').textRole as TextRole | null | undefined;
  return role ?? 'p';
}

function setStyle(editor: Editor, value: string) {
  const chain = editor.chain().focus();
  if (value === 'code') return chain.toggleCodeBlock().run();
  if (editor.isActive('blockquote') && value !== 'quote') chain.unsetBlockquote();
  if (value === 'quote') return chain.setParagraph().updateAttributes('paragraph', {textRole: null}).setBlockquote().run();
  if (value.startsWith('h')) return chain.setHeading({level: Number(value.slice(1)) as 1 | 2 | 3 | 4}).run();
  const role = (TEXT_ROLES as readonly string[]).includes(value) ? value : null;
  return chain.setParagraph().updateAttributes('paragraph', {textRole: role}).run();
}

function shiftListItem(editor: Editor, direction: 'in' | 'out') {
  const item = editor.isActive('taskItem') ? 'taskItem' : 'listItem';
  const chain = editor.chain().focus();
  return direction === 'in' ? chain.sinkListItem(item).run() : chain.liftListItem(item).run();
}

const media = (query: string) =>
  [
    (onChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
  ] as const;

/** Phones (below 768px, the Studio's mobile breakpoint). */
function useIsPhone() {
  const [subscribe, get] = media('(max-width: 767px)');
  return useSyncExternalStore(subscribe, get, () => false);
}

/** Shortcut text for this platform: ⌘ on Apple devices, Ctrl elsewhere. */
function useShortcut() {
  const isApple = useSyncExternalStore(
    () => () => {},
    () => /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent),
    () => true,
  );
  return (shortcut: string) =>
    isApple ? shortcut : shortcut.replace(/⇧/g, 'Shift+').replace(/⌥/g, 'Alt+').replace(/⌘/g, 'Ctrl+');
}

/** True when the toolbar is too narrow for the paragraph menus (they move into More). */
function useIsCompact(ref: React.RefObject<HTMLElement | null>) {
  const [isCompact, setIsCompact] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setIsCompact(entry.contentRect.width < 720));
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return isCompact;
}

/** A row of swatches for picking a text or highlight colour. */
export function Swatches({label, options, current, onPick, kind}: {label: string; options: {label: string; value: string}[]; current: string; onPick: (value: string) => void; kind: 'text' | 'highlight'}) {
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
            icon={<span aria-hidden className="write-swatch" data-kind={kind} data-empty={option.value ? undefined : true} style={{['--swatch' as string]: option.value || 'transparent'}} />}
          />
        ))}
      </Grid>
    </VStack>
  );
}

function Group({label, children}: {label: string; children: ReactNode}) {
  return (
    <VStack gap={2} className="write-more-group">
      <Text type="supporting" color="secondary" className="write-more-label">
        {label}
      </Text>
      <HStack gap={1} vAlign="center" wrap="wrap">
        {children}
      </HStack>
    </VStack>
  );
}

// ---------------------------------------------------------------------------------------------
// Toolbar

/** Phone sheet groups (the desktop More menu's groups, plus the text style). */
const PHONE_GROUPS = ['Text style', 'Format', 'Paragraph'] as const;
type PhoneGroup = (typeof PHONE_GROUPS)[number];

/**
 * The formatting toolbar (Toolbar 2.0, docs/toolbar-2.0-spec.md). Desktop: one row, no tabs:
 * text style, inline formatting, colour, alignment, lists, More, Insert (undo/redo are in the
 * editor header; find, underline and the rest are in More). When the
 * column is narrow, alignment and lists move into More. Phones: a bottom bar of quick tools; ⌃
 * opens a sheet with a group picker, undo/redo and that group's tools; Insert is a floating
 * button. Tables have their own bar (TableBar) and selected text its own bubble.
 */
export function Toolbar({editor, onLink, onFind, inserts}: {editor: Editor; onLink: () => void; onFind: () => void; inserts: InsertCommand[]}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const isPhone = useIsPhone();
  const isCompact = useIsCompact(rootRef);
  // One tab stop; ← → Home End between controls (ARIA toolbar pattern, editor spec §5).
  useRovingFocus(rootRef);
  const shortcut = useShortcut();
  const [isExpanded, setIsExpanded] = useState(false);
  const [phoneGroup, setPhoneGroup] = useState<PhoneGroup>('Format');
  const popupPlacement = isPhone ? ('above' as const) : undefined;

  // Format painter: copies the marks under the cursor onto the next selection.
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
    selector: ({editor: e}) => {
      const style = e.getAttributes('textStyle');
      return {
        style: styleOf(e),
        font: (style.fontFamily as string | undefined) ?? 'default',
        size: (style.fontSize as string | undefined) ?? 'default',
        lineHeight: (style.lineHeight as string | undefined) ?? 'default',
        weight: (style.fontWeight as string | undefined) ?? 'default',
        letterSpacing: (style.letterSpacing as string | undefined) ?? 'default',
        textCase: (style.textTransform as string | undefined) ?? '',
        color: (style.color as string | undefined) ?? '',
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
        align: (['center', 'right', 'justify'] as const).find(a => e.isActive({textAlign: a})) ?? 'left',
        canUndo: e.can().undo(),
        canRedo: e.can().redo(),
        isEditable: e.isEditable,
      };
    },
  });

  const chain = () => editor.chain().focus();
  /** An icon button. Disabled buttons say why in their tooltip (spec A9). */
  const tool = (label: string, icon: typeof Bold, isActive: boolean, run: () => void, options: {shortcut?: string; isDisabled?: boolean; why?: string} = {}) => (
    <IconButton
      key={label}
      label={label}
      tooltip={options.isDisabled && options.why ? options.why : options.shortcut ? `${label} (${shortcut(options.shortcut)})` : label}
      icon={<Icon icon={icon} size="sm" color="inherit" />}
      variant={isActive ? 'secondary' : 'ghost'}
      size="sm"
      isDisabled={options.isDisabled || !state.isEditable}
      onClick={run}
    />
  );
  const separator = (key: string) => <Divider key={key} orientation="vertical" className="write-tool-separator" />;
  const stepSize = (direction: 1 | -1) => {
    const sizes = SIZES.filter(size => size !== 'default');
    const current = parseInt(state.size === 'default' ? '18px' : state.size, 10);
    const index = sizes.findIndex(size => parseInt(size, 10) >= current);
    const from = index === -1 ? sizes.length - 1 : index;
    chain().setFontSize(sizes[Math.max(0, Math.min(sizes.length - 1, from + direction))]).run();
  };

  // ---- pieces ------------------------------------------------------------------------------
  const history = [
    tool('Undo', Undo2, false, () => chain().undo().run(), {shortcut: '⌘Z', isDisabled: !state.canUndo, why: 'Nothing to undo'}),
    tool('Redo', Redo2, false, () => chain().redo().run(), {shortcut: '⇧⌘Z', isDisabled: !state.canRedo, why: 'Nothing to redo'}),
  ];
  const find = (
    <IconButton key="find" label="Find and replace" tooltip={`Find and replace (${shortcut('⌘F')})`} size="sm" variant="ghost" onClick={onFind} icon={<Icon icon={Search} size="sm" color="inherit" />} />
  );
  const styleSelect = (
    // A fixed minimum width: the longest style names ("Heading 1") stay readable when the
    // toolbar is narrow (outline and side panel both open).
    <span key="style" className="write-style-select">
    <Selector
      placement={popupPlacement}
      label="Text style"
      isLabelHidden
      options={STYLES}
      value={state.style}
      onChange={value => setStyle(editor, value)}
      size="sm"
      variant="ghost"
      isDisabled={!state.isEditable}
    />
    </span>
  );
  const colour = (
    <Popover
      key="colour"
      label="Text colour and highlight"
      content={
        <VStack gap={4}>
          <Swatches label="Text colour" kind="text" options={COLORS} current={state.color} onPick={value => (value ? chain().setColor(value).run() : chain().unsetColor().run())} />
          <Swatches label="Highlight" kind="highlight" options={HIGHLIGHTS} current={state.highlight} onPick={value => (value ? chain().setHighlight({color: value}).run() : chain().unsetHighlight().run())} />
        </VStack>
      }>
      <IconButton
        label="Text colour and highlight"
        tooltip="Text colour and highlight"
        icon={<Icon icon={state.highlight ? Highlighter : Baseline} size="sm" color="inherit" />}
        variant={state.color || state.highlight ? 'secondary' : 'ghost'}
        size="sm"
        isDisabled={!state.isEditable}
      />
    </Popover>
  );
  const inline = [
    tool('Bold', Bold, state.bold, () => chain().toggleBold().run(), {shortcut: '⌘B'}),
    tool('Italic', Italic, state.italic, () => chain().toggleItalic().run(), {shortcut: '⌘I'}),
    tool('Link', Link2, state.link, onLink, {shortcut: '⌘K'}),
    colour,
  ];
  // Underline lives in the selection toolbar and here (editor spec §5, T1), not on the main row.
  const decoration = [
    tool('Underline', Underline, state.underline, () => chain().toggleUnderline().run(), {shortcut: '⌘U'}),
    tool('Strikethrough', Strikethrough, state.strike, () => chain().toggleStrike().run(), {shortcut: '⇧⌘S'}),
    tool('Subscript', Subscript, state.subscript, () => chain().toggleSubscript().run(), {shortcut: '⌘,'}),
    tool('Superscript', Superscript, state.superscript, () => chain().toggleSuperscript().run(), {shortcut: '⌘.'}),
    tool('Inline code', Code, state.code, () => chain().toggleCode().run(), {shortcut: '⌘E'}),
  ];
  const editing = [
    tool('Find and replace', Search, false, onFind, {shortcut: '⌘F'}),
    tool(painter ? 'Format painter: select text to apply' : 'Format painter', PaintbrushVertical, Boolean(painter), () => setPainter(current => (current ? null : editor.state.selection.$from.marks()))),
    tool('Clear formatting', RemoveFormatting, false, () => chain().unsetAllMarks().clearNodes().unsetTextAlign().run(), {shortcut: '⌘\\'}),
    tool('Remove link', Unlink, false, () => chain().extendMarkRange('link').unsetLink().run(), {isDisabled: !state.link, why: 'Put the cursor in a link to remove it'}),
  ];
  const alignButtons = ALIGNMENTS.map(a => tool(a.label, a.icon, state.align === a.value, () => chain().setTextAlign(a.value).run(), {shortcut: a.shortcut}));
  const listButtons = [
    tool('Bulleted list', List, state.bullet, () => chain().toggleBulletList().run(), {shortcut: '⇧⌘8'}),
    tool('Numbered list', ListOrdered, state.ordered, () => chain().toggleOrderedList().run(), {shortcut: '⇧⌘7'}),
    tool('Checklist', ListChecks, state.task, () => chain().toggleTaskList().run(), {shortcut: '⇧⌘9'}),
  ];
  const indentButtons = [
    tool('Decrease indent', ListIndentDecrease, false, () => shiftListItem(editor, 'out'), {shortcut: '⇧Tab', isDisabled: !state.inList, why: 'Put the cursor in a list to change its indent'}),
    tool('Increase indent', ListIndentIncrease, false, () => shiftListItem(editor, 'in'), {shortcut: 'Tab', isDisabled: !state.inList, why: 'Put the cursor in a list to change its indent'}),
  ];
  const currentAlign = ALIGNMENTS.find(a => a.value === state.align) ?? ALIGNMENTS[0];
  const alignMenu = (
    <DropdownMenu
      key="align"
      placement={popupPlacement}
      renderTrigger={props => <IconButton {...props} label={`Alignment: ${currentAlign.label.replace('Align ', '')}`} tooltip="Alignment" size="sm" variant="ghost" isDisabled={!state.isEditable} icon={<Icon icon={currentAlign.icon} size="sm" color="inherit" />} />}
      items={ALIGNMENTS.map(a => ({label: a.label, description: shortcut(a.shortcut), icon: <Icon icon={a.icon} size="sm" color="inherit" />, onClick: () => chain().setTextAlign(a.value).run()}))}
      menuWidth={220}
      hasChevron={false}
    />
  );
  const listMenu = (
    <DropdownMenu
      key="lists"
      placement={popupPlacement}
      renderTrigger={props => <IconButton {...props} label="Lists" tooltip="Lists" size="sm" variant={state.bullet || state.ordered || state.task ? 'secondary' : 'ghost'} isDisabled={!state.isEditable} icon={<Icon icon={state.ordered ? ListOrdered : state.task ? ListChecks : List} size="sm" color="inherit" />} />}
      items={[
        {
          type: 'section' as const,
          title: 'Lists',
          items: [
            {label: 'Bulleted list', description: shortcut('⇧⌘8'), icon: <Icon icon={List} size="sm" color="inherit" />, onClick: () => chain().toggleBulletList().run()},
            {label: 'Numbered list', description: shortcut('⇧⌘7'), icon: <Icon icon={ListOrdered} size="sm" color="inherit" />, onClick: () => chain().toggleOrderedList().run()},
            {label: 'Checklist', description: shortcut('⇧⌘9'), icon: <Icon icon={ListChecks} size="sm" color="inherit" />, onClick: () => chain().toggleTaskList().run()},
          ],
        },
        {
          type: 'section' as const,
          title: 'Indent',
          items: [
            {label: 'Increase indent', description: state.inList ? 'Tab' : 'Put the cursor in a list first', isDisabled: !state.inList, icon: <Icon icon={ListIndentIncrease} size="sm" color="inherit" />, onClick: () => shiftListItem(editor, 'in')},
            {label: 'Decrease indent', description: state.inList ? shortcut('⇧Tab') : 'Put the cursor in a list first', isDisabled: !state.inList, icon: <Icon icon={ListIndentDecrease} size="sm" color="inherit" />, onClick: () => shiftListItem(editor, 'out')},
          ],
        },
      ]}
      menuWidth={240}
      hasChevron={false}
    />
  );
  const typography = (
    <VStack gap={3} key="typography" className="write-more-typography">
      <Selector placement={popupPlacement} label="Font" options={FONTS} value={state.font} onChange={value => (value === 'default' ? chain().unsetFontFamily().run() : chain().setFontFamily(value).run())} size="sm" />
      <HStack gap={2}>
        <Selector placement={popupPlacement} label="Size" options={SIZES.map(size => ({value: size, label: size === 'default' ? 'Default' : size.replace('px', '')}))} value={state.size} onChange={value => (value === 'default' ? chain().unsetFontSize().run() : chain().setFontSize(value).run())} size="sm" />
        <Selector placement={popupPlacement} label="Weight" options={WEIGHTS} value={state.weight} onChange={value => (value === 'default' ? chain().unsetFontWeight().run() : chain().setFontWeight(value).run())} size="sm" />
      </HStack>
      <HStack gap={2}>
        <Selector placement={popupPlacement} label="Line height" options={LINE_HEIGHTS} value={state.lineHeight} onChange={value => (value === 'default' ? chain().unsetLineHeight().run() : chain().setLineHeight(value).run())} size="sm" />
        <Selector placement={popupPlacement} label="Letter spacing" options={LETTER_SPACINGS} value={state.letterSpacing} onChange={value => (value === 'default' ? chain().unsetLetterSpacing().run() : chain().setLetterSpacing(value).run())} size="sm" />
      </HStack>
      <HStack gap={1} vAlign="center">
        <DropdownMenu
          placement={popupPlacement}
          renderTrigger={props => <IconButton {...props} label="Text case" tooltip="Text case" size="sm" variant={state.textCase ? 'secondary' : 'ghost'} icon={<Icon icon={ALargeSmall} size="sm" color="inherit" />} />}
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
      </HStack>
    </VStack>
  );
  const insertItems = insertMenuItems(inserts, editor);

  // ---- phone -------------------------------------------------------------------------------
  if (isPhone) {
    const groupTools: Record<PhoneGroup, ReactNode> = {
      'Text style': [styleSelect, typography],
      Format: [...inline, ...decoration, ...editing],
      Paragraph: [...alignButtons, ...listButtons, ...indentButtons],
    };
    return (
      <>
        <VStack gap={0} ref={rootRef} className="write-toolbar glass glass--panel" role="toolbar" aria-label="Formatting" data-expanded={isExpanded ? 'true' : undefined}>
          <HStack gap={2} vAlign="center" className="write-tool-tabs">
            <HStack gap={1} className="write-tool-quick only-wide">
              {history}
            </HStack>
            <HStack gap={2} vAlign="center" className="write-tool-centre">
              <Selector placement="above" label="Tool group" isLabelHidden options={PHONE_GROUPS.map(name => ({value: name, label: name}))} value={phoneGroup} onChange={value => setPhoneGroup(value as PhoneGroup)} size="sm" variant="ghost" />
            </HStack>
          </HStack>
          <HStack gap={1} vAlign="center" className="write-tool-panel" role="group" aria-label={isExpanded ? phoneGroup : 'Quick formatting'}>
            {isExpanded ? groupTools[phoneGroup] : [...inline, alignMenu, listMenu, find]}
          </HStack>
          <span className="write-tool-toggle">
            <IconButton label={isExpanded ? 'Close tools' : 'More tools'} tooltip={isExpanded ? 'Close tools' : 'More tools'} variant="ghost" size="sm" aria-expanded={isExpanded} onClick={() => setIsExpanded(open => !open)} icon={<Icon icon={isExpanded ? ChevronDown : ChevronUp} size="sm" color="inherit" />} />
          </span>
        </VStack>
        <div className="write-fab">
          <DropdownMenu
            renderTrigger={props => <IconButton {...props} label="Insert" tooltip="Insert" variant="primary" size="lg" isDisabled={!state.isEditable} icon={<Icon icon={Plus} size="md" color="inherit" />} />}
            items={insertItems}
            placement="above"
            alignment="end"
            menuWidth="75vw"
            menuMaxHeight={480}
          />
        </div>
      </>
    );
  }

  // ---- desktop and tablet ----------------------------------------------------------------------
  const more = (
    <Popover
      key="more"
      label="More formatting"
      content={
        <VStack gap={4} className="write-more">
          {isCompact && (
            <Group label="Paragraph">
              {alignButtons}
              {listButtons}
              {indentButtons}
            </Group>
          )}
          <Group label="Typography">{typography}</Group>
          <Group label="Decoration">{decoration}</Group>
          <Group label="Editing">{editing}</Group>
        </VStack>
      }>
      <IconButton label="More formatting" tooltip="More formatting" size="sm" variant="ghost" isDisabled={!state.isEditable} icon={<Icon icon={MoreHorizontal} size="sm" color="inherit" />} />
    </Popover>
  );

  return (
    // Undo/Redo are in the editor header and Find is in More (editor spec §4–§5, T1).
    <HStack gap={1} vAlign="center" ref={rootRef} className="write-toolbar write-toolbar--row glass glass--panel" role="toolbar" aria-label="Formatting">
      {styleSelect}
      {separator('s3')}
      {inline}
      {!isCompact && [separator('s4'), alignMenu, listMenu]}
      {separator('s5')}
      {more}
      <span className="write-tool-end">
        <DropdownMenu
          button={{label: 'Insert', size: 'sm', variant: 'primary', icon: <Icon icon={Plus} size="sm" color="inherit" />, isDisabled: !state.isEditable}}
          items={insertItems}
          menuWidth={300}
          menuMaxHeight={560}
          alignment="end"
        />
      </span>
    </HStack>
  );
}
