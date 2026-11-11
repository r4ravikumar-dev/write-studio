import type {Metadata} from 'next';
import {NotConfigured} from '@/components/editor/NotConfigured';
import {StudioConfirmForm} from '@/components/studio/StudioAuthForms';
import {isBackendConfigured} from '@/lib/api/env';

export const metadata: Metadata = {title: 'Confirm your email', referrer: 'no-referrer'};

/** Opened from the sign-up confirmation email (?token=…). */
export default async function StudioConfirmPage({searchParams}: {searchParams: Promise<{token?: string}>}) {
  const {token = ''} = await searchParams;
  if (!isBackendConfigured) return <NotConfigured />;
  return <StudioConfirmForm token={token.slice(0, 500)} />;
}
