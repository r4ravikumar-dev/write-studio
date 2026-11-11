import type {Metadata} from 'next';
import {VStack} from '@astryxdesign/core/Layout';
import {Heading} from '@astryxdesign/core/Heading';
import {newSetup} from '@studio/shared';
import {ProjectSetup, type CopySource} from '@/components/studio/creation/ProjectSetup';
import {requireStudioUser} from '@/lib/auth/current-user';
import {listStudioCaseStudies} from '@/lib/studio/queries';

export const metadata: Metadata = {title: 'New case study'};

/**
 * Project setup. Showing this page creates nothing: the case study is created only when the user
 * chooses Create (or Save and finish later), with a server action (a POST), so prefetching or
 * reloading can never make drafts.
 */
export default async function NewStudioCaseStudyPage() {
  await requireStudioUser();
  const studies = await listStudioCaseStudies('draft');
  return (
    <VStack gap={6}>
      <Heading level={1}>New case study</Heading>
      <ProjectSetup initial={newSetup()} copySources={copySourcesOf(studies)} />
    </VStack>
  );
}

/** Case studies that can be copied (created ones only), named for the picker. */
function copySourcesOf(studies: {id: string; title: string; setup_state: unknown}[]): CopySource[] {
  return studies.filter(study => !study.setup_state).map(study => ({id: study.id, title: study.title.replace(/\*/g, '').trim() || 'Untitled case study'}));
}
