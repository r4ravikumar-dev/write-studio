import {VStack} from '@astryxdesign/core/Layout';
import {NotConfigured} from '@/components/editor/NotConfigured';
import {WorkspaceHeader} from '@/components/studio/WorkspaceHeader';
import {isBackendConfigured} from '@/lib/api/env';
import {getAccountDetails, getPersonalWorkspace, requireStudioUser} from '@/lib/auth/current-user';

/**
 * Every signed-in Studio page: checks the session (not just the proxy) and
 * shows the account's own workspace. Rendered per request, never cached.
 */
export default async function WorkspaceLayout({children}: {children: React.ReactNode}) {
  if (!isBackendConfigured) return <NotConfigured />;
  const user = await requireStudioUser();
  const [workspace, account] = await Promise.all([getPersonalWorkspace(), getAccountDetails()]);
  return (
    <VStack gap={0} className="studio">
      <WorkspaceHeader workspaceName={workspace.name} displayName={account?.display_name || user.email} />
      <VStack gap={6} className="studio-body">
        {children}
      </VStack>
    </VStack>
  );
}
