'use client';

import {useEffect, useState, useTransition} from 'react';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {Text} from '@astryxdesign/core/Text';
import {Heading} from '@astryxdesign/core/Heading';
import {Button} from '@astryxdesign/core/Button';
import {IconButton} from '@astryxdesign/core/IconButton';
import {TextInput} from '@astryxdesign/core/TextInput';
import {Dialog, DialogHeader} from '@astryxdesign/core/Dialog';
import {AlertDialog} from '@astryxdesign/core/AlertDialog';
import {Icon} from '@astryxdesign/core/Icon';
import {Bookmark, History, RotateCcw, Trash2, Undo2} from 'lucide-react';
import type {JSONContent} from '@tiptap/core';
import {CaseStudyArticle} from '@/components/caseStudy/CaseStudyArticle';
import {
  deleteRevision,
  getRevision,
  listRevisions,
  restoreRevision,
  saveRevision,
  type StudioRevision,
  type StudioRevisionWithContent,
} from '@/app/studio/document-actions';

const KIND_LABELS: Record<StudioRevision['kind'], string> = {
  auto: 'Saved automatically',
  named: 'Named version',
  before_restore: 'Before a restore',
};
const ICONS = {auto: History, named: Bookmark, before_restore: Undo2};

const day = new Intl.DateTimeFormat('en-GB', {weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'});
const time = new Intl.DateTimeFormat('en-GB', {hour: 'numeric', minute: '2-digit', hour12: true});

/**
 * Version history (editor roadmap T7). Versions are kept by the API: automatically as you write
 * (at most every 10 minutes, the newest 50), by name when you save one, and just before a restore,
 * so a restore can be undone. Opening a version shows it read-only; restoring replaces the
 * document, title and subtitle, then reloads the editor.
 */
export function HistoryDialog({
  caseStudyId,
  isOpen,
  isArchived,
  onClose,
  beforeChange,
}: {
  caseStudyId: string;
  isOpen: boolean;
  isArchived: boolean;
  onClose: () => void;
  /** Saves pending edits first, so the version kept before a restore has them. */
  beforeChange: () => Promise<unknown>;
}) {
  const [revisions, setRevisions] = useState<StudioRevision[] | null>(null);
  const [open, setOpen] = useState<StudioRevisionWithContent | null>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [toDelete, setToDelete] = useState<StudioRevision | null>(null);
  const [toRestore, setToRestore] = useState<StudioRevision | null>(null);
  const [isPending, startTransition] = useTransition();

  const load = () =>
    startTransition(async () => {
      setOpen(null);
      setError('');
      const result = await listRevisions(caseStudyId);
      if (result.ok) setRevisions(result.revisions);
      else setError(result.error);
    });

  useEffect(() => {
    if (!isOpen) return;
    load();
    // Reload the list each time the dialog opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, caseStudyId]);

  const show = (revision: StudioRevision) =>
    startTransition(async () => {
      const result = await getRevision(caseStudyId, revision.id);
      if (result.ok) setOpen(result.revision);
      else setError(result.error);
    });

  // Takes the typed name from the field itself: the field may keep an older copy of this handler.
  const saveNamed = (typed: string) =>
    startTransition(async () => {
      const trimmed = typed.trim();
      if (!trimmed) {
        setError('Enter a name for this version, for example: Sent to the hiring manager.');
        return;
      }
      // Clear the field at once (saving can take a moment); put the name back if it fails.
      setName('');
      setError('');
      await beforeChange();
      const result = await saveRevision(caseStudyId, trimmed);
      if (!result.ok) {
        setName(trimmed);
        return setError(result.error);
      }
      const list = await listRevisions(caseStudyId);
      if (list.ok) setRevisions(list.revisions);
    });

  const restore = (revision: StudioRevision) =>
    startTransition(async () => {
      await beforeChange();
      const result = await restoreRevision(caseStudyId, revision.id);
      if (!result.ok) {
        setToRestore(null);
        return setError(result.error);
      }
      // Reload so the editor starts from the restored document (and its new save time).
      window.location.reload();
    });

  const remove = (revision: StudioRevision) =>
    startTransition(async () => {
      const result = await deleteRevision(caseStudyId, revision.id);
      setToDelete(null);
      if (!result.ok) return setError(result.error);
      setRevisions(current => current?.filter(item => item.id !== revision.id) ?? null);
      if (open?.id === revision.id) setOpen(null);
    });

  const label = (revision: StudioRevision) => revision.name || KIND_LABELS[revision.kind];
  const groups = groupByDay(revisions ?? []);

  return (
    <>
      <Dialog isOpen={isOpen} onOpenChange={next => !next && onClose()} width={open ? 1040 : 640} maxHeight="88dvh">
        <DialogHeader
          title="Version history"
          subtitle="Versions are kept as you write, at most every 10 minutes. Restoring one keeps the current version here too."
          onOpenChange={next => !next && onClose()}
        />
        <div className="history" data-open={open ? '' : undefined}>
          <VStack gap={6} className="history-list">
            <HStack gap={2} vAlign="end" wrap="wrap">
              <TextInput
                label="Save this version"
                description="Give it a name to keep it until you delete it."
                value={name}
                onChange={setName}
                onKeyDown={event => {
                  if (event.key !== 'Enter') return;
                  event.preventDefault();
                  saveNamed((event.target as HTMLInputElement).value);
                }}
                size="sm"
                width="min(100%, 20rem)"
              />
              <Button label="Save version" size="sm" variant="secondary" isLoading={isPending} onClick={() => saveNamed(name)} icon={<Icon icon={Bookmark} size="sm" color="inherit" />} />
            </HStack>
            {error && (
              <Text role="alert" className="history-error">
                {error}
              </Text>
            )}
            {revisions === null ? (
              <Text color="secondary">Loading versions…</Text>
            ) : revisions.length === 0 ? (
              <VStack gap={2}>
                <Heading level={3}>No versions yet</Heading>
                <Text color="secondary">The first one is kept the next time your changes are saved after 10 minutes, or save one now with a name.</Text>
              </VStack>
            ) : (
              groups.map(group => (
                <VStack key={group.day} gap={2}>
                  <Text type="supporting" color="secondary" className="history-day">
                    {group.day}
                  </Text>
                  <ul className="history-items">
                    {group.items.map(revision => (
                      <li key={revision.id} className="history-item" data-active={open?.id === revision.id || undefined}>
                        <Icon icon={ICONS[revision.kind]} size="sm" color="secondary" />
                        <button type="button" className="history-open" onClick={() => show(revision)} aria-label={`Open the version from ${time.format(new Date(revision.created_at))}: ${label(revision)}`}>
                          <span className="history-time">{time.format(new Date(revision.created_at))}</span>
                          <span className="history-label">{label(revision)}</span>
                          <span className="history-title">{revision.title.replace(/\*/g, '') || 'Untitled'}</span>
                        </button>
                        <IconButton
                          label={`Delete the version from ${time.format(new Date(revision.created_at))}`}
                          tooltip="Delete"
                          size="sm"
                          variant="destructive"
                          onClick={() => setToDelete(revision)}
                          icon={<Icon icon={Trash2} size="sm" color="inherit" />}
                        />
                      </li>
                    ))}
                  </ul>
                </VStack>
              ))
            )}
          </VStack>
          {open && (
            <VStack gap={4} className="history-preview">
              <HStack justify="between" vAlign="center" gap={3} wrap="wrap">
                <VStack gap={0}>
                  <Heading level={3}>{open.name || KIND_LABELS[open.kind]}</Heading>
                  <Text type="supporting" color="secondary">
                    {day.format(new Date(open.created_at))}, {time.format(new Date(open.created_at))}
                  </Text>
                </VStack>
                {isArchived ? (
                  <Text type="supporting" color="secondary">
                    Restore the document from the archive to restore a version.
                  </Text>
                ) : (
                  <Button label="Restore this version" variant="primary" size="sm" onClick={() => setToRestore(open)} icon={<Icon icon={RotateCcw} size="sm" color="inherit" />} />
                )}
              </HStack>
              <div className="history-doc" tabIndex={0} aria-label="The version’s text, read-only">
                <h1 className="history-doc-title">{open.title.replace(/\*/g, '') || 'Untitled'}</h1>
                {open.subtitle && <p className="history-doc-subtitle">{open.subtitle}</p>}
                <CaseStudyArticle content={open.content as JSONContent} />
              </div>
            </VStack>
          )}
        </div>
      </Dialog>

      <AlertDialog
        isOpen={toRestore !== null}
        onOpenChange={next => !next && setToRestore(null)}
        title="Restore this version?"
        description="The document, title and subtitle go back to this version. What you have now is kept in the history as “Before a restore”, so you can undo this."
        actionLabel="Restore"
        cancelLabel="Cancel"
        actionVariant="primary"
        isActionLoading={isPending}
        onAction={() => toRestore && restore(toRestore)}
      />
      <AlertDialog
        isOpen={toDelete !== null}
        onOpenChange={next => !next && setToDelete(null)}
        title="Delete this version?"
        description="It’s removed from the history for good. The document itself doesn’t change."
        actionLabel="Delete"
        cancelLabel="Keep it"
        isActionLoading={isPending}
        onAction={() => toDelete && remove(toDelete)}
      />
    </>
  );
}

function groupByDay(revisions: StudioRevision[]) {
  const groups: {day: string; items: StudioRevision[]}[] = [];
  for (const revision of revisions) {
    const label = day.format(new Date(revision.created_at));
    const last = groups[groups.length - 1];
    if (last?.day === label) last.items.push(revision);
    else groups.push({day: label, items: [revision]});
  }
  return groups;
}
