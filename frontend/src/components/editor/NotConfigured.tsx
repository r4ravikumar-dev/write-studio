import {VStack} from '@astryxdesign/core/Layout';
import {Heading} from '@astryxdesign/core/Heading';
import {Text} from '@astryxdesign/core/Text';
import {Banner} from '@astryxdesign/core/Banner';

/** Shown in /studio until the backends are configured (see the root README.md). */
export function NotConfigured() {
  return (
    <VStack gap={6} className="studio-centered">
      <Heading level={1}>Connect the backends to start writing</Heading>
      <Banner
        status="info"
        title="The studio needs its backend"
        description="Start the Express API and the Django auth service, then add API_URL, AUTH_URL, JWT_SECRET and AUTH_SERVICE_KEY to frontend/.env.local, and reload."
        collapsible={false}
      />
      <Text color="secondary">The full setup is in README.md at the root of the project.</Text>
    </VStack>
  );
}
