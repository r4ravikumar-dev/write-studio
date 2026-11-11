import type {Metadata} from 'next';
import {notFound, redirect} from 'next/navigation';
import {NotConfigured} from '@/components/editor/NotConfigured';
import {Editor} from '@/components/editor/Editor';
import {isBackendConfigured} from '@/lib/api/env';
import {requireStudioUser} from '@/lib/auth/current-user';
import {getStudioCaseStudy} from '@/lib/studio/queries';

export async function generateMetadata({params}: {params: Promise<{id: string}>}): Promise<Metadata> {
  if (!isBackendConfigured) return {title: 'Edit case study'};
  const study = await getStudioCaseStudy((await params).id);
  return {title: `Edit: ${nameOf(study?.title)}`};
}

/** The case study's name for a page title (or a fallback), plain text without *accent* marks. */
function nameOf(title: string | undefined) {
  return title?.replace(/\*/g, '').trim() || 'Untitled case study';
}


/** Writing one private case study (the owner's only; anyone else gets 404). */
export default async function StudioEditorPage({params}: {params: Promise<{id: string}>}) {
  if (!isBackendConfigured) return <NotConfigured />;
  await requireStudioUser();
  const study = await getStudioCaseStudy((await params).id);
  if (!study) notFound();
  // Setup isn't finished: there's no document yet, so continue the setup.
  if (study.setup_state) redirect(`/studio/case-studies/${study.id}/setup`);
  return <Editor study={study} />;
}
