'use client';

import {useState, useTransition} from 'react';
import {useRouter} from 'next/navigation';
import NextLink from 'next/link';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {Heading} from '@astryxdesign/core/Heading';
import {Text} from '@astryxdesign/core/Text';
import {IconButton} from '@astryxdesign/core/IconButton';
import {Icon} from '@astryxdesign/core/Icon';
import {ArchiveRestore, Eye, MoreVertical, PencilLine, Trash2} from 'lucide-react';
import {DropdownMenu} from '@astryxdesign/core/DropdownMenu';
import {Table, proportional, pixel, type TableColumn} from '@astryxdesign/core/Table';
import {AlertDialog} from '@astryxdesign/core/AlertDialog';
import type {StudioCaseStudyCard} from '@studio/shared';
import {deleteStudioCaseStudy, restoreStudioCaseStudy} from '@/app/studio/case-study-actions';
import {EYEBROW_STYLE} from '@/theme/eyebrow';

type Row = StudioCaseStudyCard & Record<string, unknown>;
const DATE = new Intl.DateTimeFormat('en-IN', {dateStyle: 'medium', timeStyle: 'short'});

/** The signed-in user's own case studies (the API only ever returns theirs). */
export function StudioCaseStudyList({studies, emptyTitle, emptyText}: {studies: StudioCaseStudyCard[]; emptyTitle: string; emptyText: string}) {
  const router = useRouter();
  const [toDelete, setToDelete] = useState<Row | null>(null);
  const [isWorking, startWork] = useTransition();
  const [error, setError] = useState('');

  const restore = (row: Row) =>
    startWork(async () => {
      const result = await restoreStudioCaseStudy(row.id);
      if (!result.ok) setError(result.error);
      router.refresh();
    });

  /** Phones: one ⋯ button that opens the same actions as a menu. */
  const actionsMenu = (row: Row) => (
    <DropdownMenu
      renderTrigger={props => (
        <IconButton {...props} label={`Actions for ${row.title.replace(/\*/g, '')}`} tooltip="More actions" size="sm" variant="ghost" icon={<Icon icon={MoreVertical} size="sm" color="inherit" />} />
      )}
      items={[
        row.status === 'archived'
          ? {label: 'Restore', icon: <Icon icon={ArchiveRestore} size="sm" color="inherit" />, isDisabled: isWorking, onClick: () => restore(row)}
          : {label: 'Edit', icon: <Icon icon={PencilLine} size="sm" color="inherit" />, href: `/studio/case-studies/${row.id}`},
        {label: 'Preview', icon: <Icon icon={Eye} size="sm" color="inherit" />, href: `/studio/case-studies/${row.id}/preview`},
        {label: 'Delete', icon: <Icon icon={Trash2} size="sm" color="inherit" />, variant: 'destructive' as const, onClick: () => setToDelete(row)},
      ]}
      menuWidth={200}
    />
  );

  const actions = (row: Row) => (
    <HStack gap={3} hAlign="end">
      {row.status === 'archived' ? (
        <IconButton
          label="Restore"
          tooltip="Restore"
          size="sm"
          variant="secondary"
          icon={<Icon icon={ArchiveRestore} size="sm" color="inherit" />}
          isDisabled={isWorking}
          onClick={() => restore(row)}
        />
      ) : (
        <IconButton label="Edit" tooltip="Edit" size="sm" variant="secondary" href={`/studio/case-studies/${row.id}`} icon={<Icon icon={PencilLine} size="sm" color="inherit" />} />
      )}
      <IconButton label="Preview" tooltip="Preview" size="sm" variant="secondary" href={`/studio/case-studies/${row.id}/preview`} icon={<Icon icon={Eye} size="sm" color="inherit" />} />
      <IconButton label="Delete" tooltip="Delete" size="sm" variant="destructive" onClick={() => setToDelete(row)} icon={<Icon icon={Trash2} size="sm" color="inherit" />} />
    </HStack>
  );

  const columns: TableColumn<Row>[] = [
    {
      key: 'title',
      header: 'Case study',
      width: proportional(3, {minWidth: 220}),
      renderCell: row => <TitleCell row={row} />,
    },
    {
      key: 'status',
      header: 'Status',
      width: pixel(140),
      renderCell: row => <StatusLabel row={row} />,
    },
    {
      key: 'updated_at',
      header: 'Last edited',
      width: proportional(1, {minWidth: 190}),
      renderCell: row => <EditedLabel row={row} />,
    },
    {
      key: 'id',
      header: '',
      width: pixel(160),
      align: 'end',
      renderCell: row => actions(row),
    },
  ];

  if (!studies.length) {
    return (
      <VStack gap={3} className="studio-empty">
        <Heading level={2}>{emptyTitle}</Heading>
        <Text color="secondary">{emptyText}</Text>
      </VStack>
    );
  }

  return (
    <VStack gap={4}>
      {error && (
        <Text role="alert" color="secondary">
          {error}
        </Text>
      )}
      {/* Wide screens: a table. Narrow screens (below 900px): one card per case study. */}
      <div className="studio-table studio-cases-wide">
        <Table<Row> data={studies as Row[]} columns={columns} idKey="id" />
      </div>
      <ul className="studio-cases-cards">
        {(studies as Row[]).map(row => (
          <li key={row.id} className="studio-case-card">
            <VStack gap={3} className="studio-case-card-body">
              <HStack gap={2} justify="between" vAlign="start">
                <TitleCell row={row} />
                <span className="only-narrow">{actionsMenu(row)}</span>
              </HStack>
              <VStack gap={1}>
                <StatusLabel row={row} />
                <EditedLabel row={row} />
              </VStack>
              <div className="studio-case-card-actions only-wide">{actions(row)}</div>
            </VStack>
          </li>
        ))}
      </ul>
      <AlertDialog
        isOpen={toDelete !== null}
        onOpenChange={open => {
          if (!open) setToDelete(null);
        }}
        title={`Delete “${toDelete?.title.replace(/\*/g, '') ?? ''}”?`}
        description="This removes the case study for good. Its pictures, videos and files stay in your media library."
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

function TitleCell({row}: {row: Row}) {
  return (
    <VStack gap={1}>
      <NextLink href={`/studio/case-studies/${row.id}`} className="studio-link">
        {row.title.replace(/\*/g, '')}
      </NextLink>
      {row.summary && (
        <Text type="supporting" color="secondary">
          {row.summary.length > 120 ? `${row.summary.slice(0, 120)}…` : row.summary}
        </Text>
      )}
    </VStack>
  );
}

function StatusLabel({row}: {row: Row}) {
  return (
    <Text type="supporting" style={{...EYEBROW_STYLE, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap'}}>
      {row.status === 'archived' ? 'Archived' : 'Private draft'}
    </Text>
  );
}

function EditedLabel({row}: {row: Row}) {
  return (
    <Text color="secondary" style={{whiteSpace: 'nowrap'}}>
      {DATE.format(new Date(row.updated_at))}
    </Text>
  );
}
