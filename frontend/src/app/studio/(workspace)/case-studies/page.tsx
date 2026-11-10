import type {Metadata} from 'next';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {Heading} from '@astryxdesign/core/Heading';
import {Button} from '@astryxdesign/core/Button';
import {NewCaseStudyButton} from '@/components/studio/NewCaseStudyButton';
import {StudioCaseStudyList} from '@/components/studio/StudioCaseStudyList';
import {requireStudioUser} from '@/lib/auth/current-user';
import {listStudioCaseStudies} from '@/lib/studio/queries';

export const metadata: Metadata = {title: 'Case studies'};

/** All of the user's case studies: drafts, or the archived ones (?status=archived). */
export default async function StudioCaseStudiesPage({searchParams}: {searchParams: Promise<{status?: string}>}) {
  await requireStudioUser();
  const isArchived = (await searchParams).status === 'archived';
  const studies = await listStudioCaseStudies(isArchived ? 'archived' : 'draft');
  return (
    <VStack gap={6}>
      <HStack justify="between" vAlign="end" gap={6} wrap="wrap">
        <Heading level={1}>{isArchived ? 'Archived case studies' : 'Case studies'}</Heading>
        <HStack gap={2}>
          <Button label={isArchived ? 'Show drafts' : 'Show archived'} variant="ghost" href={isArchived ? '/studio/case-studies' : '/studio/case-studies?status=archived'} />
          {!isArchived && <NewCaseStudyButton />}
        </HStack>
      </HStack>
      <StudioCaseStudyList
        studies={studies}
        emptyTitle={isArchived ? 'Nothing archived' : 'No case studies yet'}
        emptyText={isArchived ? 'Archive a case study to put it out of the way without deleting it.' : 'Start one with New case study.'}
      />
    </VStack>
  );
}
