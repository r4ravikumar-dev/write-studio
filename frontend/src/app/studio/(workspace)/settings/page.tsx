import type {Metadata} from 'next';
import {redirect} from 'next/navigation';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {Heading} from '@astryxdesign/core/Heading';
import {BackButton} from '@/components/studio/BackButton';
import {SettingsForms} from '@/components/studio/SettingsForms';
import {getAccountDetails, getPersonalWorkspace, requireStudioUser} from '@/lib/auth/current-user';

export const metadata: Metadata = {title: 'Settings'};

export default async function StudioSettingsPage() {
  await requireStudioUser();
  const [account, workspace] = await Promise.all([getAccountDetails(), getPersonalWorkspace()]);
  if (!account) redirect('/studio/login');
  return (
    <VStack gap={8}>
      {/* The page title stays in the same place as on every other page; only the cards are centred. */}
      <HStack gap={3} vAlign="center">
        <BackButton href="/studio" label="Back to your case studies" />
        <Heading level={1}>Settings</Heading>
      </HStack>
      <div className="studio-settings">
        <SettingsForms
          email={account.email}
          displayName={account.display_name}
          workspaceName={workspace.name}
          hasPassword={account.has_password}
        />
      </div>
    </VStack>
  );
}
