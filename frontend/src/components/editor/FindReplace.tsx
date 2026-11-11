'use client';

import {useEffect, useState} from 'react';
import {useEditorState, type Editor} from '@tiptap/react';
import {HStack, VStack} from '@astryxdesign/core/Layout';
import {TextInput} from '@astryxdesign/core/TextInput';
import {Button} from '@astryxdesign/core/Button';
import {IconButton} from '@astryxdesign/core/IconButton';
import {Switch} from '@astryxdesign/core/Switch';
import {Text} from '@astryxdesign/core/Text';
import {Icon} from '@astryxdesign/core/Icon';
import {ChevronDown, ChevronUp, X} from 'lucide-react';
import {searchStateOf} from './search';

/**
 * Find and replace (⌘F / Ctrl+F): a glass panel under the toolbar. Matches are highlighted in
 * the document (decorations, never stored); Enter goes to the next match, Shift+Enter the
 * previous, Escape closes. Replace all is one undo step.
 */
export function FindReplace({editor, onClose}: {editor: Editor; onClose: () => void}) {
  const [query, setQuery] = useState(() => {
    const {from, to, empty} = editor.state.selection;
    const selected = empty ? '' : editor.state.doc.textBetween(from, to, ' ');
    return selected.length <= 80 ? selected : '';
  });
  const [replacement, setReplacement] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const search = useEditorState({editor, selector: ({editor: e}) => searchStateOf(e.state)});

  // Search as you type (and when Match case changes).
  useEffect(() => {
    editor.commands.setSearch(query, caseSensitive);
  }, [editor, query, caseSensitive]);

  // Clear the highlights when the panel closes.
  useEffect(() => () => void editor.commands.clearSearch(), [editor]);

  const count = search.matches.length;
  const status = !query ? '' : count ? `${search.current + 1} of ${count}` : 'No matches';
  const editable = editor.isEditable;

  return (
    <VStack
      gap={3}
      className="write-find glass glass--panel"
      role="search"
      aria-label="Find and replace"
      onKeyDown={event => {
        if (event.key === 'Escape') {
          event.preventDefault();
          onClose();
          editor.commands.focus();
        }
      }}>
      <HStack gap={2} vAlign="end">
        <TextInput
          label="Find"
          value={query}
          onChange={setQuery}
          hasAutoFocus
          size="sm"
          width="100%"
          onKeyDown={event => {
            if (event.key === 'Enter') {
              event.preventDefault();
              editor.commands.goToMatch(event.shiftKey ? -1 : 1);
            }
          }}
        />
        <Text type="supporting" color="secondary" aria-live="polite" className="write-find-count">
          {status}
        </Text>
        <IconButton label="Previous match" tooltip="Previous match (Shift+Enter)" size="sm" variant="ghost" isDisabled={!count} onClick={() => editor.commands.goToMatch(-1)} icon={<Icon icon={ChevronUp} size="sm" color="inherit" />} />
        <IconButton label="Next match" tooltip="Next match (Enter)" size="sm" variant="ghost" isDisabled={!count} onClick={() => editor.commands.goToMatch(1)} icon={<Icon icon={ChevronDown} size="sm" color="inherit" />} />
        <IconButton label="Close find and replace" tooltip="Close (Esc)" size="sm" variant="ghost" onClick={onClose} icon={<Icon icon={X} size="sm" color="inherit" />} />
      </HStack>
      <Switch label="Match case" size="sm" value={caseSensitive} onChange={setCaseSensitive} />
      {editable && (
        <VStack gap={2}>
          <TextInput label="Replace with" value={replacement} onChange={setReplacement} size="sm" width="100%" />
          <HStack gap={2} hAlign="end">
            <Button label="Replace" size="sm" variant="secondary" isDisabled={!count} onClick={() => editor.commands.replaceMatch(replacement)} />
            <Button label="Replace all" size="sm" variant="secondary" isDisabled={!count} onClick={() => editor.commands.replaceAllMatches(replacement)} />
          </HStack>
        </VStack>
      )}
    </VStack>
  );
}
