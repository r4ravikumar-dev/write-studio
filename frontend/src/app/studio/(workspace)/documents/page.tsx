import type {Metadata} from 'next';
import {DocumentsDashboard, documentFilter} from '@/components/studio/DocumentsDashboard';

type Search = Promise<{status?: string; view?: string}>;

export async function generateMetadata({searchParams}: {searchParams: Search}): Promise<Metadata> {
  return {title: documentFilter((await searchParams).status).title};
}

/** The user's documents, by status (?status=in_progress | ready_for_review | archived) and view (?view=list). */
export default async function StudioDocumentsPage({searchParams}: {searchParams: Search}) {
  const {status, view} = await searchParams;
  return <DocumentsDashboard status={status} view={view} base="/studio/documents" />;
}
