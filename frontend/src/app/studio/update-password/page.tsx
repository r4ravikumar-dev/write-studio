import type {Metadata} from 'next';
import {NotConfigured} from '@/components/editor/NotConfigured';
import {StudioResetPasswordForm} from '@/components/studio/StudioAuthForms';
import {isBackendConfigured} from '@/lib/api/env';

export const metadata: Metadata = {title: 'Choose a new password', referrer: 'no-referrer'};

/** Opened from the password reset email (?uid=…&token=…). */
export default async function StudioUpdatePasswordPage({searchParams}: {searchParams: Promise<{uid?: string; token?: string}>}) {
  const {uid = '', token = ''} = await searchParams;
  if (!isBackendConfigured) return <NotConfigured />;
  return <StudioResetPasswordForm uid={uid.slice(0, 100)} token={token.slice(0, 200)} />;
}
