'use client';

import {useState, useTransition} from 'react';
import {useRouter} from 'next/navigation';
import NextLink from 'next/link';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {Heading} from '@astryxdesign/core/Heading';
import {Text} from '@astryxdesign/core/Text';
import {IconButton} from '@astryxdesign/core/IconButton';
import {Icon} from '@astryxdesign/core/Icon';
import {ArchiveRestore, Eye, ListChecks, MoreHorizontal, PencilLine, Trash2} from 'lucide-react';
import {DropdownMenu} from '@astryxdesign/core/DropdownMenu';
import {Button} from '@astryxdesign/core/Button';
import {AlertDialog} from '@astryxdesign/core/AlertDialog';
import {PROJECT_TYPES, studioMediaUrl, type StudioCaseStudyCard} from '@studio/shared';
import {deleteStudioCaseStudy, restoreStudioCaseStudy} from '@/app/studio/case-study-actions';

type Row = StudioCaseStudyCard & Record<string, unknown>;
/** A 3×3 page of cards; Show more adds the next nine. */
const PAGE = 9;

/** The signed-in user's own case studies (the API only ever returns theirs). */
export function StudioCaseStudyList({studies, emptyTitle, emptyText, emptyAction}: {studies: StudioCaseStudyCard[]; emptyTitle: string; emptyText: string; emptyAction?: React.ReactNode}) {
  const router = useRouter();
  const [toDelete, setToDelete] = useState<Row | null>(null);
  const [isWorking, startWork] = useTransition();
  const [error, setError] = useState('');
  const [visible, setVisible] = useState(PAGE);

  const restore = (row: Row) =>
    startWork(async () => {
      const result = await restoreStudioCaseStudy(row.id);
      if (!result.ok) setError(result.error);
      router.refresh();
    });

  /** Each card's ⋯ menu: Edit (or Restore), Preview, Delete. */
  const actionsMenu = (row: Row) => (
    <DropdownMenu
      renderTrigger={props => (
        <IconButton {...props} label={`Actions for ${nameOf(row)}`} tooltip="Actions" size="sm" variant="ghost" icon={<Icon icon={MoreHorizontal} size="sm" color="inherit" />} />
      )}
      items={
        row.setup_state
          ? [
              {label: 'Continue setup', icon: <Icon icon={ListChecks} size="sm" color="inherit" />, href: hrefOf(row)},
              {label: 'Delete', icon: <Icon icon={Trash2} size="sm" color="inherit" />, variant: 'destructive' as const, onClick: () => setToDelete(row)},
            ]
          : [
              row.status === 'archived'
                ? {label: 'Restore', icon: <Icon icon={ArchiveRestore} size="sm" color="inherit" />, isDisabled: isWorking, onClick: () => restore(row)}
                : {label: 'Edit', icon: <Icon icon={PencilLine} size="sm" color="inherit" />, href: `/studio/case-studies/${row.id}`},
              {label: 'Preview', icon: <Icon icon={Eye} size="sm" color="inherit" />, href: `/studio/case-studies/${row.id}/preview`},
              {label: 'Delete', icon: <Icon icon={Trash2} size="sm" color="inherit" />, variant: 'destructive' as const, onClick: () => setToDelete(row)},
            ]
      }
      menuWidth={200}
    />
  );

  if (!studies.length) {
    return (
      <VStack gap={3} className="studio-empty">
        <Heading level={2}>{emptyTitle}</Heading>
        <Text color="secondary">{emptyText}</Text>
        {emptyAction}
      </VStack>
    );
  }

  const shown = (studies as Row[]).slice(0, visible);

  return (
    <VStack gap={6}>
      {error && (
        <Text role="alert" color="secondary">
          {error}
        </Text>
      )}
      {/* Project cards (like a design-tool dashboard): 3 columns on desktop, 2 on tablet, 1 on
          phone; 9 at a time (a 3×3 page), with Show more for long lists. */}
      <ul className="project-grid" aria-label="Case studies">
        {shown.map(row => (
          <li key={row.id} className="project-card">
            <div className="project-card-thumb">
              {row.thumbnail_path ? (
                // Decorative here: the title below names the card.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={studioMediaUrl(row.thumbnail_path)} alt="" loading="lazy" />
              ) : (
                <span className="project-card-initial" aria-hidden="true">
                  {nameOf(row).charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <HStack gap={2} vAlign="start" justify="between" className="project-card-body">
              <VStack gap={1} className="project-card-text">
                {/* The title link covers the whole card (one link per card for screen readers). */}
                <NextLink href={hrefOf(row)} className="project-card-link">
                  {nameOf(row)}
                </NextLink>
                <Text type="supporting" color="secondary">
                  {[row.setup_state ? 'Setup not finished' : null, row.status === 'archived' ? 'Archived' : null, row.project_type ? PROJECT_TYPES[row.project_type]?.label : null]
                    .filter(Boolean)
                    .map(part => `${part} · `)
                    .join('')}
                  Edited <span suppressHydrationWarning>{relative(row.updated_at)}</span>
                </Text>
                {!row.setup_state && (row.sections_total ?? 0) > 0 && (
                  <HStack gap={2} vAlign="center" className="project-card-progress">
                    {/* Text first for screen readers; the bar repeats it visually. */}
                    <Text type="supporting" color="secondary">
                      {`${row.sections_complete ?? 0} of ${row.sections_total} sections complete`}
                    </Text>
                    <span className="project-card-bar" aria-hidden="true">
                      <span style={{inlineSize: `${Math.round(((row.sections_complete ?? 0) / (row.sections_total ?? 1)) * 100)}%`}} />
                    </span>
                  </HStack>
                )}
              </VStack>
              <span className="project-card-menu">{actionsMenu(row)}</span>
            </HStack>
          </li>
        ))}
      </ul>
      {studies.length > visible && (
        <HStack hAlign="center">
          <Button
            label={`Show more (${studies.length - visible} more)`}
            variant="secondary"
            onClick={() => setVisible(count => count + PAGE)}
          />
        </HStack>
      )}
      <AlertDialog
        isOpen={toDelete !== null}
        onOpenChange={open => {
          if (!open) setToDelete(null);
        }}
        title={`Delete “${toDelete?.title.replace(/\*/g, '') ?? ''}”?`}
        description="This deletes the case study for good. The files it uses stay in your media library."
        actionLabel="Delete"
        cancelLabel="Keep it"
        isActionLoading={isWorking}
        onAction={() =>
          startWork(async () => {
            if (!toDelete) return;
            const result = await deleteStudioCaseStudy(toDelete.id);
            if (!result.ok) setError(result.error);
            setToDelete(null);
            router.refresh();
          })
        }
      />
    </VStack>
  );
}

const RELATIVE = new Intl.RelativeTimeFormat('en', {numeric: 'auto'});
const STEPS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 31536000],
  ['month', 2592000],
  ['week', 604800],
  ['day', 86400],
  ['hour', 3600],
  ['minute', 60],
];

/** "3 hours ago", "yesterday", "just now". */
function relative(iso: string) {
  const seconds = (new Date(iso).getTime() - Date.now()) / 1000;
  for (const [unit, size] of STEPS) {
    if (Math.abs(seconds) >= size) return RELATIVE.format(Math.round(seconds / size), unit);
  }
  return 'just now';
}

/** Where a card goes: the editor, or the setup when it isn't finished. */
function hrefOf(row: StudioCaseStudyCard) {
  return row.setup_state ? `/studio/case-studies/${row.id}/setup` : `/studio/case-studies/${row.id}`;
}

/** A case study's plain name for screen-reader labels ("Edit Booking redesign"). */
function nameOf(row: {title: string}) {
  return row.title.replace(/\*/g, '').trim() || 'Untitled case study';
}
