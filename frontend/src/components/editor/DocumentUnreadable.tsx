import {VStack, HStack} from '@astryxdesign/core/Layout';
import {Heading} from '@astryxdesign/core/Heading';
import {Text} from '@astryxdesign/core/Text';
import {Button} from '@astryxdesign/core/Button';

/**
 * Shown instead of the editor when a stored document can't be read by this version of the app
 * (block contract B2). Nothing is opened, so nothing can be saved over it.
 */
export function DocumentUnreadable({id, title}: {id: string; title: string}) {
  return (
    <VStack gap={4} className="studio-empty document-unreadable" role="alert">
      <Heading level={1}>“{title}” can’t be opened here</Heading>
      <Text color="secondary" style={{maxInlineSize: '60ch'}}>
        This version of Case Study Studio can’t read part of it, so it hasn’t been opened, to make sure nothing in it is changed or lost. Your document is
        safe and unchanged. Reload the page in a little while; if it still doesn’t open, it may need a newer version of the app.
      </Text>
      <HStack gap={2} wrap="wrap" hAlign="center">
        <Button label="Back to My documents" variant="primary" href="/studio" />
        <Button label="Try again" variant="secondary" href={`/studio/documents/${id}/edit`} />
      </HStack>
    </VStack>
  );
}
