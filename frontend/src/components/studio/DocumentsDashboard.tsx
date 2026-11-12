import NextLink from 'next/link';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {Heading} from '@astryxdesign/core/Heading';
import {Text} from '@astryxdesign/core/Text';
import {Button} from '@astryxdesign/core/Button';
import type {StudioStatus} from '@studio/shared';
import {NewCaseStudyButton} from '@/components/studio/NewCaseStudyButton';
import {AddNameForm} from '@/components/studio/AddNameForm';
import {StudioCaseStudyList} from '@/components/studio/StudioCaseStudyList';
import {getAccountDetails, requireStudioUser} from '@/lib/auth/current-user';
import {listStudioCaseStudies} from '@/lib/studio/queries';

/** The dashboard's filters: everything that isn't archived, two working statuses, and the archive. */
export const DOCUMENT_FILTERS = [
  {id: 'all', label: 'All', status: 'active', title: 'My documents'},
  {id: 'in_progress', label: 'In progress', status: 'in_progress', title: 'Documents in progress'},
  {id: 'ready_for_review', label: 'Ready for review', status: 'ready_for_review', title: 'Documents ready for review'},
  {id: 'archived', label: 'Archived', status: 'archived', title: 'Archived documents'},
] as const satisfies readonly {id: string; label: string; status: StudioStatus | 'active'; title: string}[];

export type DocumentFilter = (typeof DOCUMENT_FILTERS)[number];

export function documentFilter(status: string | undefined): DocumentFilter {
  return DOCUMENT_FILTERS.find(filter => filter.id === status) ?? DOCUMENT_FILTERS[0];
}

const EMPTY: Record<DocumentFilter['id'], {title: string; text: string}> = {
  all: {
    title: 'Create your first document',
    text: 'Choose a template for what you’re writing, answer a few optional questions and review the outline. You get a private draft with guidance for every section, ready to write, preview and export.',
  },
  in_progress: {title: 'Nothing in progress', text: 'Open a document and choose In progress from its status to see it here.'},
  ready_for_review: {title: 'Nothing ready for review', text: 'When a document is ready for you to check, choose Ready for review from its status. It stays private.'},
  archived: {title: 'Nothing archived', text: 'Archive a document to put it away without deleting it. You can restore it at any time.'},
};

/**
 * My documents: the signed-in user's own private documents of every type, filtered by status, as
 * a grid of cards or a list. Used by /studio (the home) and /studio/documents.
 */
export async function DocumentsDashboard({status, view, base}: {status?: string; view?: string; base: '/studio' | '/studio/documents'}) {
  const user = await requireStudioUser();
  const filter = documentFilter(status);
  const isList = view === 'list';
  const [account, documents] = await Promise.all([getAccountDetails(), listStudioCaseStudies(filter.status)]);
  const name = account?.display_name?.split(' ')[0] || user.email.split('@')[0];
  const href = (next: {status?: string; view?: string}) => {
    const query = new URLSearchParams();
    const nextStatus = next.status ?? filter.id;
    const nextView = next.view ?? (isList ? 'list' : 'grid');
    if (nextStatus !== 'all') query.set('status', nextStatus);
    if (nextView === 'list') query.set('view', 'list');
    const text = query.toString();
    return text ? `${base}?${text}` : base;
  };
  const isFirstVisit = filter.id === 'all' && documents.length === 0;

  return (
    <VStack gap={6}>
      <HStack justify="between" vAlign="end" gap={6} wrap="wrap">
        <VStack gap={2}>
          <Heading level={1}>{filter.title}</Heading>
          <Text color="secondary" style={{maxInlineSize: '60ch'}}>
            {isFirstVisit ? `Welcome, ${name}. Everything you write here is private to you.` : `Welcome, ${name}. Pick up where you left off, or create a new document.`}
          </Text>
        </VStack>
        {!isFirstVisit && (
          <HStack gap={2} wrap="wrap">
            <Button label="Templates" variant="ghost" href="/studio/templates" />
            <NewCaseStudyButton />
          </HStack>
        )}
      </HStack>
      {!account?.display_name && <AddNameForm />}
      {!isFirstVisit && (
        <HStack justify="between" gap={4} wrap="wrap" vAlign="center">
          <nav aria-label="Filter documents by status">
            <ul className="doc-filters">
              {DOCUMENT_FILTERS.map(item => (
                <li key={item.id}>
                  <NextLink href={href({status: item.id})} className="doc-filter t-web-label-lg-medium" aria-current={item.id === filter.id ? 'page' : undefined}>
                    {item.label}
                  </NextLink>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-label="Show documents as">
            <ul className="doc-filters">
              {(['grid', 'list'] as const).map(mode => (
                <li key={mode}>
                  <NextLink href={href({view: mode})} className="doc-filter t-web-label-lg-medium" aria-current={(mode === 'list') === isList ? 'true' : undefined}>
                    {mode === 'grid' ? 'Grid' : 'List'}
                  </NextLink>
                </li>
              ))}
            </ul>
          </nav>
        </HStack>
      )}
      <StudioCaseStudyList
        studies={documents}
        view={isList ? 'list' : 'grid'}
        emptyTitle={EMPTY[filter.id].title}
        emptyText={EMPTY[filter.id].text}
        emptyAction={
          filter.id === 'all' ? (
            <HStack gap={2} wrap="wrap" hAlign="center">
              <NewCaseStudyButton label="Create document" />
              <Button label="Browse templates" variant="secondary" href="/studio/templates" />
            </HStack>
          ) : undefined
        }
      />
    </VStack>
  );
}
