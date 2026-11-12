import type {Metadata} from 'next';
import {NotConfigured} from '@/components/editor/NotConfigured';
import {StudioLoginForm} from '@/components/studio/StudioAuthForms';
import {isBackendConfigured} from '@/lib/api/env';
import {safeStudioNext} from '@/lib/auth/safe-next';
import {turnstileSiteKey} from '@/lib/auth/turnstile';

export const metadata: Metadata = {title: 'Sign in'};

export default async function StudioLoginPage({searchParams}: {searchParams: Promise<{next?: string; deleted?: string}>}) {
  const {next, deleted} = await searchParams;
  if (!isBackendConfigured) return <NotConfigured />;
  return (
    <StudioLoginForm
      next={safeStudioNext(next)}
      notice={deleted === '1' ? 'Your account and everything in it have been deleted.' : undefined}
      siteKey={turnstileSiteKey()}
    />
  );
}
