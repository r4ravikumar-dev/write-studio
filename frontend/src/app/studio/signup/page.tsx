import type {Metadata} from 'next';
import {connection} from 'next/server';
import {NotConfigured} from '@/components/editor/NotConfigured';
import {StudioSignupForm} from '@/components/studio/StudioAuthForms';
import {isBackendConfigured} from '@/lib/api/env';

export const metadata: Metadata = {title: 'Create your studio'};

export default async function StudioSignupPage() {
  await connection();
  if (!isBackendConfigured) return <NotConfigured />;
  return <StudioSignupForm />;
}
