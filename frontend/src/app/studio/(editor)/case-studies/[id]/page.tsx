import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {NotConfigured} from '@/components/editor/NotConfigured';
import {Editor} from '@/components/editor/Editor';
import {isBackendConfigured} from '@/lib/api/env';
import {requireStudioUser} from '@/lib/auth/current-user';
import {getStudioCaseStudy} from '@/lib/studio/queries';

export const metadata: Metadata = {title: 'Editing'};

/** Writing one private case study (the owner's only; anyone else gets 404). */
export default async function StudioEditorPage({params}: {params: Promise<{id: string}>}) {
  if (!isBackendConfigured) return <NotConfigured />;
  await requireStudioUser();
  const study = await getStudioCaseStudy((await params).id);
  if (!study) notFound();
  return <Editor study={study} />;
}
