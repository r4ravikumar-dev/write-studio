import type {Metadata} from 'next';
import {notFound, redirect} from 'next/navigation';
import {NotConfigured} from '@/components/editor/NotConfigured';
import {Editor} from '@/components/editor/Editor';
import {DocumentUnreadable} from '@/components/editor/DocumentUnreadable';
import {checkDocument} from '@/components/caseStudy/documentCheck';
import {CONTENT_SCHEMA_VERSION} from '@studio/shared';
import {isBackendConfigured} from '@/lib/api/env';
import {requireStudioUser} from '@/lib/auth/current-user';
import {getStudioCaseStudy} from '@/lib/studio/queries';

export async function generateMetadata({params}: {params: Promise<{id: string}>}): Promise<Metadata> {
  if (!isBackendConfigured) return {title: 'Edit document'};
  const study = await getStudioCaseStudy((await params).id);
  return {title: `Edit: ${nameOf(study?.title)}`};
}

/** The document's name for a page title (or a fallback), plain text without *accent* marks. */
function nameOf(title: string | undefined) {
  return title?.replace(/\*/g, '').trim() || 'Untitled document';
}


/** Writing one private document (the owner's only; anyone else gets 404). */
export default async function StudioEditorPage({params}: {params: Promise<{id: string}>}) {
  if (!isBackendConfigured) return <NotConfigured />;
  await requireStudioUser();
  const study = await getStudioCaseStudy((await params).id);
  if (!study) notFound();
  // Setup isn't finished: there's no document yet, so continue the setup.
  if (study.setup_state) redirect(`/studio/documents/${study.id}/setup`);
  // Block contract B2: never open a document this version can't fully read as if it could.
  const check = checkDocument(study.content);
  if (!check.ok) return <DocumentUnreadable id={study.id} title={nameOf(study.title)} />;
  const newer = study.content_schema_version > CONTENT_SCHEMA_VERSION;
  return (
    <Editor
      study={{...study, content: check.content}}
      wrapped={check.wrapped}
      lockReason={newer ? 'It was saved by a newer version of Case Study Studio. You can read it here; reload the page to edit it once this version has been updated.' : undefined}
    />
  );
}
