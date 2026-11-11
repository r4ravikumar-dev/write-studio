import type {Metadata} from 'next';
import NextLink from 'next/link';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {Heading} from '@astryxdesign/core/Heading';
import {Text} from '@astryxdesign/core/Text';
import {NewCaseStudyButton} from '@/components/studio/NewCaseStudyButton';
import {AddNameForm} from '@/components/studio/AddNameForm';
import {StudioCaseStudyList} from '@/components/studio/StudioCaseStudyList';
import {getAccountDetails, requireStudioUser} from '@/lib/auth/current-user';
import {listStudioCaseStudies} from '@/lib/studio/queries';

export const metadata: Metadata = {title: 'Your case studies'};

/** The workspace home: the user's own private drafts. */
export default async function StudioHomePage() {
  const user = await requireStudioUser();
  const [account, studies] = await Promise.all([getAccountDetails(), listStudioCaseStudies('draft')]);
  const name = account?.display_name?.split(' ')[0] || user.email.split('@')[0];
  return (
    <VStack gap={6}>
      <HStack justify="between" vAlign="end" gap={6} wrap="wrap">
        <VStack gap={2}>
          <Heading level={1}>Welcome, {name}</Heading>
          <Text color="secondary" style={{maxInlineSize: '60ch'}}>
            {studies.length ? 'Pick up where you left off, or start a new case study.' : 'Turn a project you’ve worked on into a clear, well-structured case study.'}
          </Text>
        </VStack>
        {studies.length > 0 && <NewCaseStudyButton />}
      </HStack>
      {!account?.display_name && <AddNameForm />}
      <StudioCaseStudyList
        studies={studies}
        emptyTitle="No case studies yet"
        emptyText="Answer a few questions about your project and choose a story framework. You’ll get an outline with questions for each section, so you always know what to write next."
        emptyAction={<NewCaseStudyButton label="Start your first case study" />}
      />
      <NextLink href="/studio/case-studies?status=archived" className="studio-auth-link">
        Archived case studies
      </NextLink>
    </VStack>
  );
}
