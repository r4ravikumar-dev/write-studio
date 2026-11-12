'use client';

import {useEffect, useRef, useState} from 'react';
import type {Editor} from '@tiptap/react';
import {TextSelection} from '@tiptap/pm/state';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {Heading} from '@astryxdesign/core/Heading';
import {Text} from '@astryxdesign/core/Text';
import {Button} from '@astryxdesign/core/Button';
import {TextArea} from '@astryxdesign/core/TextArea';
import {SegmentedControl, SegmentedControlItem} from '@astryxdesign/core/SegmentedControl';
import {Icon} from '@astryxdesign/core/Icon';
import {ArrowDown, ArrowUp, Plus} from 'lucide-react';
import {SECTION_STATES, frameworkSection, type SuggestedVisual} from '@studio/shared';
import {insertIdFor, suggestionLabel} from './blocks/registry';
import {saveSectionNote} from '@/app/studio/document-actions';
import {EYEBROW_STYLE} from '@/theme/eyebrow';
import {goToSection, setSectionStatus, type OutlineSection} from './sections';
import {frameworkOf, type InsertCommand} from './insertCommands';

/** Which Insert command adds each visual block. */

/** Guidance for the user's own sections (no framework entry). */
const OWN_SECTION = {
  purpose: 'Your own section. Say in a sentence what the reader should take from it, then show the evidence.',
  prompts: ['What should the reader learn here?', 'Why does it matter to the story?', 'What shows it: a picture, a quote or a result?'],
  suggestedEvidence: [] as string[],
  suggestedBlocks: [] as SuggestedVisual[],
};

const OPEN_KEY = 'studio.guide.closed';
function readClosed(): string[] {
  try {
    return JSON.parse(window.localStorage.getItem(OPEN_KEY) ?? '[]');
  } catch {
    return [];
  }
}

/**
 * Contextual guidance (Region C, Guide mode) for the section the cursor is in: its purpose,
 * questions to answer, evidence and visuals to consider, its status, and a private note.
 * Deterministic (from the framework), never AI, and never stored in the document.
 */
export function SectionGuide({
  editor,
  caseStudyId,
  sections,
  active,
  inserts,
  notes,
  onNoteSaved,
  isEditable,
}: {
  editor: Editor;
  caseStudyId: string;
  sections: OutlineSection[];
  active: number;
  inserts: InsertCommand[];
  notes: Record<string, string>;
  onNoteSaved: (sectionId: string, body: string) => void;
  isEditable: boolean;
}) {
  const section = sections[active];
  if (!section) {
    return (
      <VStack gap={2}>
        <Text weight="semibold">{sections.length ? 'Choose a section' : 'No sections yet'}</Text>
        <Text color="secondary">
          {sections.length
            ? 'Put the cursor in a section, or choose one in the outline, to see what to write there.'
            : 'Add a section from the outline to get questions and ideas for what to write.'}
        </Text>
      </VStack>
    );
  }
  return <Guide key={section.id} {...{editor, caseStudyId, sections, section, inserts, notes, onNoteSaved, isEditable}} />;
}

function Guide({
  editor,
  caseStudyId,
  sections,
  section,
  inserts,
  notes,
  onNoteSaved,
  isEditable,
}: {
  editor: Editor;
  caseStudyId: string;
  sections: OutlineSection[];
  section: OutlineSection;
  inserts: InsertCommand[];
  notes: Record<string, string>;
  onNoteSaved: (sectionId: string, body: string) => void;
  isEditable: boolean;
}) {
  const guide = frameworkSection(section.key, frameworkOf(inserts)) ?? OWN_SECTION;
  const [closed, setClosed] = useState<string[]>(() => (typeof window === 'undefined' ? [] : readClosed()));
  const [note, setNote] = useState(notes[section.id] ?? '');
  const [noteState, setNoteState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [noteError, setNoteError] = useState('');
  const timer = useRef<number | undefined>(undefined);
  const latest = useRef(note);

  // A note typed before notes finished loading isn't overwritten; otherwise show the stored one.
  const stored = notes[section.id] ?? '';
  const [lastStored, setLastStored] = useState(stored);
  if (stored !== lastStored) {
    setLastStored(stored);
    if (noteState === 'idle') setNote(stored);
  }

  const toggle = (name: string, isOpen: boolean) => {
    const next = isOpen ? closed.filter(item => item !== name) : [...new Set([...closed, name])];
    setClosed(next);
    try {
      window.localStorage.setItem(OPEN_KEY, JSON.stringify(next));
    } catch {
      // A preference only.
    }
  };

  const saveNote = async (body: string) => {
    setNoteState('saving');
    const result = await saveSectionNote(caseStudyId, section.id, body);
    if (latest.current !== body) return; // typed again meanwhile: the next save covers it
    if (result.ok) {
      setNoteState('saved');
      setNoteError('');
      onNoteSaved(section.id, body.trim());
    } else {
      setNoteState('error');
      setNoteError(result.error);
    }
  };

  // Save a pending note when switching sections or leaving.
  useEffect(
    () => () => {
      if (timer.current !== undefined) {
        window.clearTimeout(timer.current);
        void saveSectionNote(caseStudyId, section.id, latest.current);
      }
    },
    [caseStudyId, section.id],
  );

  /** Adds a visual block at the end of this section. */
  const addVisual = (name: SuggestedVisual) => {
    const command = inserts.find(item => item.id === insertIdFor(name));
    if (!command) return;
    const {state} = editor;
    const end = Math.max(section.pos + 1, section.end - 1);
    editor.view.dispatch(state.tr.setSelection(TextSelection.near(state.doc.resolve(end), -1)));
    command.run();
  };

  const status = section.status ?? 'auto';
  const previous = sections[section.index - 1];
  const next = sections[section.index + 1];
  const list = (name: string, title: string, items: string[]) =>
    items.length > 0 && (
      <details className="write-guide-group" open={!closed.includes(name)} onToggle={event => toggle(name, event.currentTarget.open)}>
        <summary className="t-web-label-xl-semibold">{title}</summary>
        <ul className="write-guide-list t-web-body-lg-regular">
          {items.map(item => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </details>
    );

  return (
    <VStack gap={6} className="write-guide">
      <VStack gap={2}>
        <Text type="supporting" style={EYEBROW_STYLE}>
          Section {section.index + 1} of {sections.length}
        </Text>
        <Heading level={2} style={{fontSize: 'var(--type-headline-s-size)'}}>
          {section.name}
        </Heading>
        <Text color="secondary">{guide.purpose}</Text>
      </VStack>

      <VStack gap={2}>
        <SegmentedControl
          label="Status"
          value={status}
          onChange={value => setSectionStatus(editor, section, value === 'auto' ? null : (value as 'review' | 'complete'))}
          size="sm"
          layout="fill"
          isDisabled={!isEditable}>
          <SegmentedControlItem value="auto" label="Writing" />
          <SegmentedControlItem value="review" label="Review" />
          <SegmentedControlItem value="complete" label="Complete" />
        </SegmentedControl>
        <Text type="supporting" color="secondary">
          {section.status ? SECTION_STATES[section.status] : `${SECTION_STATES[section.state]}. Mark it for review or complete when you’re ready.`}
        </Text>
      </VStack>

      {list('prompts', 'Questions to answer', guide.prompts)}
      {list('evidence', 'Evidence to include', guide.suggestedEvidence)}

      {guide.suggestedBlocks.length > 0 && (
        <details className="write-guide-group" open={!closed.includes('visuals')} onToggle={event => toggle('visuals', event.currentTarget.open)}>
          <summary className="t-web-label-xl-semibold">Blocks that work here</summary>
          <VStack gap={2} className="write-guide-visuals">
            {guide.suggestedBlocks.map(name => (
              <Button
                key={name}
                label={`Add ${suggestionLabel(name).toLowerCase()}`}
                variant="ghost"
                size="sm"
                isDisabled={!isEditable}
                onClick={() => addVisual(name)}
                icon={<Icon icon={Plus} size="sm" color="inherit" />}
              />
            ))}
          </VStack>
        </details>
      )}

      <VStack gap={2}>
        <TextArea
          label="Private note"
          description="For your own reminders. It isn’t part of the document, its preview or anything you export."
          value={note}
          onChange={value => {
            const body = value.slice(0, 5000);
            setNote(body);
            latest.current = body;
            setNoteState('saving');
            window.clearTimeout(timer.current);
            timer.current = window.setTimeout(() => {
              timer.current = undefined;
              void saveNote(body);
            }, 800);
          }}
          rows={4}
          width="100%"
          isDisabled={!isEditable}
          status={noteState === 'error' ? {type: 'error', message: noteError} : undefined}
        />
        <Text type="supporting" color="secondary" aria-live="polite">
          {noteState === 'saving' ? 'Saving note…' : noteState === 'saved' ? 'Note saved' : ''}
        </Text>
      </VStack>

      <HStack gap={2} justify="between" wrap="wrap">
        {previous ? (
          <Button label="Previous section" variant="ghost" size="sm" onClick={() => goToSection(editor, previous)} icon={<Icon icon={ArrowUp} size="sm" color="inherit" />} />
        ) : (
          <span />
        )}
        {next && <Button label="Next section" variant="secondary" size="sm" onClick={() => goToSection(editor, next)} icon={<Icon icon={ArrowDown} size="sm" color="inherit" />} />}
      </HStack>
    </VStack>
  );
}
