'use client';

import {useEffect, useMemo, useRef, useState} from 'react';
import type {Editor} from '@tiptap/react';
import {VStack} from '@astryxdesign/core/Layout';
import {Text} from '@astryxdesign/core/Text';
import {Button} from '@astryxdesign/core/Button';
import {Icon} from '@astryxdesign/core/Icon';
import {INSERT_GROUPS, smartSections, type InsertCommand} from './insertCommands';

/** One row: a command, under a section heading (top sections or its category). */
type Entry = {section: string; command: InsertCommand};

type Slash = {query: string; from: number; to: number; top: number; left: number};

/**
 * The "/" menu, as in Notion: type "/" at the start of an empty line to list
 * everything that can be inserted, keep typing to filter, use the arrow keys
 * and Enter (or click) to insert, Escape to close. The "/query" text is
 * removed as the block goes in.
 */
export function SlashMenu({editor, commands}: {editor: Editor; commands: InsertCommand[]}) {
  const [slash, setSlash] = useState<Slash | null>(null);
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLElement | null>(null);

  const matches = useMemo((): Entry[] => {
    if (!slash) return [];
    const query = slash.query.toLowerCase();
    // Unfiltered: the top sections (recommended, recent, frequent), then the categories in order.
    if (!query) {
      return [
        ...smartSections(commands, editor).flatMap(section => section.commands.map(command => ({section: section.title, command}))),
        ...INSERT_GROUPS.flatMap(group => commands.filter(command => command.group === group).map(command => ({section: group, command}))),
      ];
    }
    // Names that match come first, then keyword and category matches ("/flow" → Flow diagram first).
    const byName = commands.filter(command => command.label.toLowerCase().includes(query));
    const byKeyword = commands.filter(command => !byName.includes(command) && `${command.keywords} ${command.group}`.toLowerCase().includes(query));
    return [...byName, ...byKeyword].map(command => ({section: '', command}));
    // `slash` changes whenever the cursor moves, so the recommendations follow the section.
  }, [commands, slash, editor]);

  // Watch the text: "/" + up to 24 non-space characters, alone in a paragraph, cursor at its end.
  useEffect(() => {
    const update = () => {
      const {selection} = editor.state;
      const {$from, empty} = selection;
      const parent = $from.parent;
      const text = parent.textContent;
      const atEnd = $from.parentOffset === text.length;
      const match = /^\/([^\s/]{0,24})$/.exec(text);
      if (!empty || parent.type.name !== 'paragraph' || !atEnd || !match) {
        setSlash(null);
        return;
      }
      const from = $from.start();
      const coords = editor.view.coordsAtPos(from);
      const host = editor.view.dom.closest('.write-canvas')?.getBoundingClientRect();
      setSlash({
        query: match[1],
        from,
        to: $from.pos,
        top: coords.bottom - (host?.top ?? 0) + 6,
        left: coords.left - (host?.left ?? 0),
      });
      setActive(0);
    };
    editor.on('transaction', update);
    return () => {
      editor.off('transaction', update);
    };
  }, [editor]);

  const choose = (entry: Entry | undefined) => {
    const command = entry?.command;
    if (!command || !slash) return;
    editor.chain().focus().deleteRange({from: slash.from, to: slash.to}).run();
    setSlash(null);
    command.run();
  };

  // Keys while the menu is open go to the menu, not the document.
  useEffect(() => {
    if (!slash) return;
    const dom = editor.view.dom;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowDown') setActive(index => (index + 1) % Math.max(matches.length, 1));
      else if (event.key === 'ArrowUp')
        setActive(index => (index - 1 + matches.length) % Math.max(matches.length, 1));
      else if (event.key === 'Enter') choose(matches[active]);
      else if (event.key === 'Escape') setSlash(null);
      else return;
      event.preventDefault();
      event.stopPropagation();
    };
    dom.addEventListener('keydown', onKey, true);
    return () => dom.removeEventListener('keydown', onKey, true);
  });

  // Keep the highlighted row in view.
  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({block: 'nearest'});
  }, [active]);

  if (!slash) return null;

  return (
    <VStack
      ref={listRef as React.Ref<HTMLDivElement>}
      gap={0}
      className="write-slash"
      role="listbox"
      aria-label="Insert a block"
      style={{insetBlockStart: slash.top, insetInlineStart: slash.left}}>
      {matches.length === 0 ? (
        <Text type="supporting" color="secondary" className="write-slash-empty">
          Nothing matches “{slash.query}”
        </Text>
      ) : (
        matches.map(({section, command}, index) => [
          // Section headings while nothing is typed (presentation only: options stay one list).
          section && section !== matches[index - 1]?.section ? (
            <Text key={`section-${section}`} type="supporting" color="secondary" role="presentation" className="write-slash-group">
              {section}
            </Text>
          ) : null,
          <Button
            key={`${section}-${command.id}`}
            role="option"
            aria-selected={index === active}
            data-active={index === active}
            label={command.label}
            variant={index === active ? 'secondary' : 'ghost'}
            size="sm"
            width="100%"
            icon={<Icon icon={command.icon} size="sm" color="inherit" />}
            onMouseEnter={() => setActive(index)}
            onMouseDown={event => event.preventDefault()}
            onClick={() => choose(matches[index])}
          />,
        ])
      )}
    </VStack>
  );
}
