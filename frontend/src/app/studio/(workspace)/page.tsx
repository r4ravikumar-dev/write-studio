import type {Metadata} from 'next';
import {DocumentsDashboard, documentFilter} from '@/components/studio/DocumentsDashboard';

type Search = Promise<{status?: string; view?: string}>;

export async function generateMetadata({searchParams}: {searchParams: Search}): Promise<Metadata> {
  return {title: documentFilter((await searchParams).status).title};
}

/** The workspace home: My documents. */
export default async function StudioHomePage({searchParams}: {searchParams: Search}) {
  const {status, view} = await searchParams;
  return <DocumentsDashboard status={status} view={view} base="/studio" />;
}
