'use client';

import {useRef, useState} from 'react';
import type {Editor} from '@tiptap/react';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {Text} from '@astryxdesign/core/Text';
import {IconButton} from '@astryxdesign/core/IconButton';
import {Button} from '@astryxdesign/core/Button';
import {DropdownMenu} from '@astryxdesign/core/DropdownMenu';
import {AlertDialog} from '@astryxdesign/core/AlertDialog';
import {Icon} from '@astryxdesign/core/Icon';
import {ArrowDown, ArrowUp, Check, CheckCircle2, Circle, CircleDot, Copy, Eye, GripVertical, MoreHorizontal, PencilLine, Plus, Trash2, Undo2, X} from 'lucide-react';
import {SECTION_STATES, frameworkSection, type Framework, type SectionState} from '@studio/shared';
import {
  addSection,
  deleteSection,
  duplicateSection,
  goToSection,
  moveSection,
  renameSection,
  setSectionStatus,
  type OutlineSection,
} from './sections';

const STATE_ICONS: Record<SectionState, typeof Circle> = {empty: Circle, in_progress: CircleDot, review: Eye, complete: CheckCircle2};

/**
 * Story outline (Region A): the document's sections, worked out from the document itself.
 * Select one to go to it; rename, duplicate, reorder (drag, or Move up/down in its menu), mark it
 * for review or complete, or delete it. Add a new section or one the framework suggests.
 * Status is understated on purpose: a section is never judged by its word count.
 */
export function StoryOutline({
  editor,
  sections,
  active,
  framework,
  isEditable,
  onNavigate,
  onClose,
}: {
  editor: Editor;
  sections: OutlineSection[];
  active: number;
  framework: Framework | undefined;
  isEditable: boolean;
  onNavigate: (section: OutlineSection) => void;
  onClose?: () => void;
}) {
  const [renaming, setRenaming] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [toDelete, setToDelete] = useState<OutlineSection | null>(null);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dropAt, setDropAt] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const renameInput = useRef<HTMLInputElement>(null);

  const complete = sections.filter(section => section.state === 'complete').length;
  const used = new Set(sections.map(section => section.key).filter(Boolean));
  const suggestions = (framework?.sections ?? []).filter(section => !used.has(section.key));
  const after = sections[active] ?? sections.at(-1) ?? null;

  const move = (from: number, to: number) => {
    if (to < 0 || to >= sections.length) return;
    moveSection(editor, sections, from, to);
    setAnnouncement(`${sections[from].name} moved to position ${to + 1} of ${sections.length}.`);
  };

  const startRename = (section: OutlineSection) => {
    setDraft(section.title || section.name);
    setRenaming(section.id);
    requestAnimationFrame(() => renameInput.current?.select());
  };
  const finishRename = (section: OutlineSection, save: boolean) => {
    const text = draft.trim();
    // Back to the framework's own title: leave the heading empty so the title shows as a placeholder.
    const frameworkTitle = section.key ? frameworkSection(section.key)?.title : undefined;
    if (save && text !== section.name) renameSection(editor, section, text === frameworkTitle ? '' : text);
    setRenaming(null);
    // Back to the row, so keyboard users keep their place.
    requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-section-row="${section.id}"] .write-outline-link`)?.focus());
  };

  return (
    <VStack gap={0} className="write-outline" aria-label="Story outline">
      <HStack justify="between" vAlign="center" gap={2} className="write-outline-head">
        <VStack gap={0}>
          <Text weight="semibold">Outline</Text>
          <Text type="supporting" color="secondary">
            {sections.length ? `${complete} of ${sections.length} sections complete` : 'No sections yet'}
          </Text>
        </VStack>
        {onClose && <IconButton label="Close outline" tooltip="Close" size="sm" variant="ghost" onClick={onClose} icon={<Icon icon={X} size="sm" color="inherit" />} />}
      </HStack>

      <ol className="write-outline-list">
        {sections.map(section => {
          const StateIcon = STATE_ICONS[section.state];
          const isActive = section.index === active;
          return (
            <li
              key={section.id || section.pos}
              className="write-outline-item"
              data-section-row={section.id}
              data-active={isActive || undefined}
              data-state={section.state}
              data-drop={dropAt === section.index && dragFrom !== null && dragFrom !== section.index ? (dragFrom < section.index ? 'after' : 'before') : undefined}
              onDragOver={event => {
                if (dragFrom === null) return;
                event.preventDefault();
                setDropAt(section.index);
              }}
              onDragEnd={() => {
                setDragFrom(null);
                setDropAt(null);
              }}
              onDrop={event => {
                event.preventDefault();
                if (dragFrom !== null) move(dragFrom, section.index);
                setDragFrom(null);
                setDropAt(null);
              }}>
              {isEditable && (
                // Only the grip is draggable: a draggable row would swallow clicks on its menu button.
                // Keyboard users move sections with Move up / Move down in the menu.
                <span
                  className="write-outline-grip"
                  aria-hidden="true"
                  draggable={renaming !== section.id}
                  onDragStart={event => {
                    setDragFrom(section.index);
                    event.dataTransfer.effectAllowed = 'move';
                    event.dataTransfer.setData('text/plain', section.name);
                    const row = event.currentTarget.closest('li');
                    if (row) event.dataTransfer.setDragImage(row, 16, 16);
                  }}>
                  <Icon icon={GripVertical} size="sm" color="inherit" />
                </span>
              )}
              {renaming === section.id ? (
                <input
                  ref={renameInput}
                  className="write-outline-rename t-web-label-xl-medium"
                  aria-label={`New name for ${section.name}`}
                  value={draft}
                  maxLength={120}
                  onChange={event => setDraft(event.target.value)}
                  onBlur={() => finishRename(section, true)}
                  onKeyDown={event => {
                    if (event.key === 'Enter') finishRename(section, true);
                    if (event.key === 'Escape') finishRename(section, false);
                  }}
                />
              ) : (
                <button
                  type="button"
                  className="write-outline-link"
                  aria-current={isActive ? 'location' : undefined}
                  onClick={() => {
                    goToSection(editor, section);
                    onNavigate(section);
                  }}>
                  <span className="write-outline-state" title={SECTION_STATES[section.state]}>
                    <Icon icon={StateIcon} size="sm" color="inherit" />
                  </span>
                  <span className="write-outline-name t-web-label-xl-medium" data-placeholder={!section.title || undefined}>
                    {section.name}
                  </span>
                  <span className="sr-only">, {SECTION_STATES[section.state]}</span>
                </button>
              )}
              {isEditable && renaming !== section.id && (
                <DropdownMenu
                  renderTrigger={props => (
                    <IconButton {...props} label={`Actions for ${section.name}`} tooltip="Section actions" size="sm" variant="ghost" className="write-outline-menu" icon={<Icon icon={MoreHorizontal} size="sm" color="inherit" />} />
                  )}
                  items={[
                    {
                      type: 'section' as const,
                      title: 'Status',
                      items: [
                        section.status === 'complete'
                          ? {label: 'Mark as not complete', icon: <Icon icon={Undo2} size="sm" color="inherit" />, onClick: () => setSectionStatus(editor, section, null)}
                          : {label: 'Mark complete', icon: <Icon icon={Check} size="sm" color="inherit" />, onClick: () => setSectionStatus(editor, section, 'complete')},
                        section.status === 'review'
                          ? {label: 'Clear review flag', icon: <Icon icon={Undo2} size="sm" color="inherit" />, onClick: () => setSectionStatus(editor, section, null)}
                          : {label: 'Mark ready for review', icon: <Icon icon={Eye} size="sm" color="inherit" />, onClick: () => setSectionStatus(editor, section, 'review')},
                      ],
                    },
                    {
                      type: 'section' as const,
                      title: 'Section',
                      items: [
                        {label: 'Rename', icon: <Icon icon={PencilLine} size="sm" color="inherit" />, onClick: () => startRename(section)},
                        {label: 'Duplicate', icon: <Icon icon={Copy} size="sm" color="inherit" />, onClick: () => duplicateSection(editor, section)},
                        {label: 'Move up', icon: <Icon icon={ArrowUp} size="sm" color="inherit" />, isDisabled: section.index === 0, onClick: () => move(section.index, section.index - 1)},
                        {label: 'Move down', icon: <Icon icon={ArrowDown} size="sm" color="inherit" />, isDisabled: section.index === sections.length - 1, onClick: () => move(section.index, section.index + 1)},
                        {label: 'Delete', variant: 'destructive' as const, icon: <Icon icon={Trash2} size="sm" color="inherit" />, onClick: () => setToDelete(section)},
                      ],
                    },
                  ]}
                  menuWidth={240}
                  hasChevron={false}
                />
              )}
            </li>
          );
        })}
      </ol>

      {!sections.length && (
        <Text type="supporting" color="secondary" className="write-outline-empty">
          Sections organise your story. Add one here, or choose Heading 1 in the text style menu.
        </Text>
      )}

      {isEditable && (
        <div className="write-outline-foot">
          <DropdownMenu
            renderTrigger={props => <Button {...props} label="Add section" variant="secondary" size="sm" icon={<Icon icon={Plus} size="sm" color="inherit" />} />}
            items={[
              {label: 'New section', description: after ? `After “${after.name}”` : 'At the end', icon: <Icon icon={Plus} size="sm" color="inherit" />, onClick: () => addSection(editor, after)},
              ...(suggestions.length
                ? [
                    {
                      type: 'section' as const,
                      title: 'Suggested by the framework',
                      items: suggestions.map(section => ({label: section.title, description: section.hint, onClick: () => addSection(editor, after, section.key)})),
                    },
                  ]
                : []),
            ]}
            menuWidth={300}
          />
        </div>
      )}

      <span className="sr-only" aria-live="polite">
        {announcement}
      </span>

      <AlertDialog
        isOpen={toDelete !== null}
        onOpenChange={open => !open && setToDelete(null)}
        title={`Delete “${toDelete?.name ?? ''}”?`}
        description="This deletes the section and everything in it. To get it back, use Undo (Ctrl+Z, or ⌘Z on a Mac)."
        actionLabel="Delete section"
        cancelLabel="Keep it"
        onAction={() => {
          if (toDelete) {
            deleteSection(editor, toDelete);
            setAnnouncement(`${toDelete.name} deleted.`);
          }
          setToDelete(null);
        }}
      />
    </VStack>
  );
}
