import type {Metadata} from 'next';
import '../studio.css';
import {NotConfigured} from '@/components/editor/NotConfigured';
import {StudioForgotPasswordForm} from '@/components/studio/StudioAuthForms';
import {isBackendConfigured} from '@/lib/api/env';
import {turnstileSiteKey} from '@/lib/auth/turnstile';

export const metadata: Metadata = {
  title: 'Reset Password',
  description: 'Reset your Write Studio account password.',
  robots: {index: false, follow: true},
};

export default function PublicForgotPasswordPage() {
  if (!isBackendConfigured) return <NotConfigured />;
  return (
    <div style={{minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px'}}>
      <StudioForgotPasswordForm siteKey={turnstileSiteKey()} />
    </div>
  );
}
