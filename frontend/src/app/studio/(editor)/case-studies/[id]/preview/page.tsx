import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {StudioPreview} from '@/components/studio/StudioPreview';
import {requireStudioUser} from '@/lib/auth/current-user';
import {getStudioCaseStudy} from '@/lib/studio/queries';

export async function generateMetadata({params}: {params: Promise<{id: string}>}): Promise<Metadata> {
  const study = await getStudioCaseStudy((await params).id);
  return {title: `Preview: ${nameOf(study?.title)}`, robots: {index: false, follow: false}};
}

/** The case study's name for a page title (or a fallback), plain text without *accent* marks. */
function nameOf(title: string | undefined) {
  return title?.replace(/\*/g, '').trim() || 'Untitled case study';
}


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
