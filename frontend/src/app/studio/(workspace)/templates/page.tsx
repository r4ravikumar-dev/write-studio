import type {Metadata} from 'next';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {Heading} from '@astryxdesign/core/Heading';
import {Text} from '@astryxdesign/core/Text';
import {TemplateGallery} from '@/components/studio/creation/TemplateGallery';
import {BackButton} from '@/components/studio/BackButton';
import {requireStudioUser} from '@/lib/auth/current-user';

export const metadata: Metadata = {title: 'Templates'};

/**
 * The template library: every template the app ships, by category or search, with a preview.
 * Read-only product content (no user data); a template is used from here by opening Create Document.
 */
export default async function TemplatesPage() {
  await requireStudioUser();
  return (
    <VStack gap={6}>
      <HStack>
        <BackButton href="/studio" label="My documents" />
      </HStack>
      <VStack gap={2}>
        <Heading level={1}>Templates</Heading>
        <Text color="secondary" style={{maxInlineSize: '60ch'}}>
          Each template gives a document its sections, the questions each section answers and the blocks that suit it. Choose one to see what it contains.
        </Text>
      </VStack>
      <TemplateGallery />
    </VStack>
  );
}
