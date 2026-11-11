'use client';

import {useTransition} from 'react';
import NextLink from 'next/link';
import {HStack} from '@astryxdesign/core/Layout';
import {Text} from '@astryxdesign/core/Text';
import {Button} from '@astryxdesign/core/Button';
import {IconButton} from '@astryxdesign/core/IconButton';
import {Icon} from '@astryxdesign/core/Icon';
import {Images, LogOut, Settings} from 'lucide-react';
import {signOutOfStudio} from '@/app/studio/account-actions';
import {EYEBROW_STYLE} from '@/theme/eyebrow';

/** The signed-in Studio's top bar: workspace name, the account, settings and sign out. */
export function WorkspaceHeader({workspaceName, displayName}: {workspaceName: string; displayName: string}) {
  const [isSigningOut, startSignOut] = useTransition();
  return (
    <HStack className="studio-bar glass glass-bar" justify="between" vAlign="center" gap={4}>
      <HStack gap={3} vAlign="center">
        <NextLink href="/studio" className="studio-home">
          <Text type="supporting" style={EYEBROW_STYLE}>
            {workspaceName}
          </Text>
        </NextLink>
      </HStack>
      {/* Wide screens: name + labelled actions. Phones: icon-only actions (labels as tooltips). */}
      <HStack gap={2} vAlign="center" className="only-wide">
        <Text type="supporting" color="secondary">
          {displayName}
        </Text>
        <Button label="Media" variant="ghost" size="sm" href="/studio/media" icon={<Icon icon={Images} size="sm" color="inherit" />} />
        <Button label="Settings" variant="ghost" size="sm" href="/studio/settings" icon={<Icon icon={Settings} size="sm" color="inherit" />} />
        <Button
          label="Sign out"
          variant="ghost"
          size="sm"
          isLoading={isSigningOut}
          onClick={() => startSignOut(() => signOutOfStudio())}
          icon={<Icon icon={LogOut} size="sm" color="inherit" />}
        />
      </HStack>
      <HStack gap={2} vAlign="center" className="only-narrow">
        <IconButton label="Media" tooltip="Media" variant="ghost" size="sm" href="/studio/media" icon={<Icon icon={Images} size="sm" color="inherit" />} />
        <IconButton label="Settings" tooltip="Settings" variant="ghost" size="sm" href="/studio/settings" icon={<Icon icon={Settings} size="sm" color="inherit" />} />
        <IconButton
          label="Sign out"
          tooltip="Sign out"
          variant="ghost"
          size="sm"
          isLoading={isSigningOut}
          onClick={() => startSignOut(() => signOutOfStudio())}
          icon={<Icon icon={LogOut} size="sm" color="inherit" />}
        />
      </HStack>
    </HStack>
  );
}
