import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {StudioPreview} from '@/components/studio/StudioPreview';
import {requireStudioUser} from '@/lib/auth/current-user';
import {getStudioCaseStudy} from '@/lib/studio/queries';

export const metadata: Metadata = {title: 'Private preview', robots: {index: false, follow: false}};

/** The owner's private preview (?embed=1 inside the editor's preview dialog). Never public. */
export default async function StudioPreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{id: string}>;
  searchParams: Promise<{embed?: string}>;
}) {
  await requireStudioUser();
  const study = await getStudioCaseStudy((await params).id);
  if (!study) notFound();
  return <StudioPreview study={study} isEmbedded={(await searchParams).embed === '1'} />;
}
