import type {Metadata} from 'next';
import NextLink from 'next/link';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {Heading} from '@astryxdesign/core/Heading';
import {Text} from '@astryxdesign/core/Text';
import {NewCaseStudyButton} from '@/components/studio/NewCaseStudyButton';
import {StudioCaseStudyList} from '@/components/studio/StudioCaseStudyList';
import {getAccountDetails, requireStudioUser} from '@/lib/auth/current-user';
import {listStudioCaseStudies} from '@/lib/studio/queries';

export const metadata: Metadata = {title: 'Your workspace'};

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
            Your private workspace. Everything you write and upload here is visible only to you.
          </Text>
        </VStack>
        <NewCaseStudyButton />
      </HStack>
      <StudioCaseStudyList
        studies={studies}
        emptyTitle="No case studies yet"
        emptyText="Start one with New case study. It opens with a ten-section storytelling template, ready to write over."
      />
      <NextLink href="/studio/case-studies?status=archived" className="studio-auth-link">
        Archived case studies
      </NextLink>
    </VStack>
  );
}
