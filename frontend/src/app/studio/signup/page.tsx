import type {Metadata} from 'next';
import {connection} from 'next/server';
import {NotConfigured} from '@/components/editor/NotConfigured';
import {StudioSignupForm} from '@/components/studio/StudioAuthForms';
import {isBackendConfigured} from '@/lib/api/env';
import {turnstileSiteKey} from '@/lib/auth/turnstile';

export const metadata: Metadata = {title: 'Create an account'};

export default async function StudioSignupPage() {
  await connection();
  if (!isBackendConfigured) return <NotConfigured />;
  return <StudioSignupForm siteKey={turnstileSiteKey()} />;
}
