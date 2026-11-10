import type {Metadata} from 'next';
import {VStack} from '@astryxdesign/core/Layout';
import {Heading} from '@astryxdesign/core/Heading';
import {Text} from '@astryxdesign/core/Text';
import {NewCaseStudyForm} from '@/components/studio/NewCaseStudyForm';
import {requireStudioUser} from '@/lib/auth/current-user';

export const metadata: Metadata = {title: 'New case study'};

/** Starting a case study is a POST (a form), never a GET, so prefetching can't create drafts. */
export default async function NewStudioCaseStudyPage() {
  await requireStudioUser();
  return (
    <VStack gap={6} style={{maxInlineSize: 560}}>
      <VStack gap={2}>
        <Heading level={1}>New case study</Heading>
        <Text color="secondary">It starts as a private draft with a ten-section storytelling template.</Text>
      </VStack>
      <NewCaseStudyForm />
    </VStack>
  );
}
