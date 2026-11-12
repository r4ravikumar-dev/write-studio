import type {Metadata} from 'next';
import {VStack} from '@astryxdesign/core/Layout';
import {Heading} from '@astryxdesign/core/Heading';
import {CURRENT_TEMPLATES, documentTypeOf, newSetup, outlineFor, projectTypeFor, untitledTitle, type StudioSetup} from '@studio/shared';
import {ProjectSetup, type CopySource} from '@/components/studio/creation/ProjectSetup';
import {requireStudioUser} from '@/lib/auth/current-user';
import {listStudioCaseStudies} from '@/lib/studio/queries';

export const metadata: Metadata = {title: 'Create document'};

/**
 * Create Document. Showing this page creates nothing: the document is created only when the user
 * chooses Create (or Save and finish later), with a server action (a POST), so prefetching or
 * reloading can never make drafts. `?template=<id>` (from the template library) preselects one.
 */
export default async function NewStudioDocumentPage({searchParams}: {searchParams: Promise<{template?: string}>}) {
  await requireStudioUser();
  const documents = await listStudioCaseStudies('active');
  return (
    <VStack gap={6}>
      <Heading level={1}>Create document</Heading>
      <ProjectSetup initial={initialSetup((await searchParams).template)} copySources={copySourcesOf(documents)} />
    </VStack>
  );
}

/** A new setup, on the template named in the link when it is one a new document can use. */
function initialSetup(templateId: string | undefined): StudioSetup {
  const setup = newSetup();
  const template = CURRENT_TEMPLATES.find(candidate => candidate.id === templateId);
  if (!template) return setup;
  return {
    ...setup,
    template_id: template.id,
    template_version: template.version,
    document_type: documentTypeOf(template, setup.document_type),
    project_type: projectTypeFor(template),
    outline: outlineFor(template),
    start: template.sections.length ? 'framework' : 'blank',
  };
}

/** Documents that can be copied (created ones only), named for the picker. */
function copySourcesOf(documents: {id: string; title: string; document_type: string; setup_state: unknown}[]): CopySource[] {
  return documents.filter(document => !document.setup_state).map(document => ({id: document.id, title: document.title.replace(/\*/g, '').trim() || untitledTitle(document.document_type)}));
}
