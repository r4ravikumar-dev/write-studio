import type {Metadata} from 'next';
import {connection} from 'next/server';
import {NotConfigured} from '@/components/editor/NotConfigured';
import {StudioForgotPasswordForm} from '@/components/studio/StudioAuthForms';
import {isBackendConfigured} from '@/lib/api/env';

export const metadata: Metadata = {title: 'Forgot your password?'};

export default async function StudioForgotPasswordPage() {
  await connection();
  if (!isBackendConfigured) return <NotConfigured />;
  return <StudioForgotPasswordForm />;
}
