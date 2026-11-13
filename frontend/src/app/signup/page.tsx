import type {Metadata} from 'next';
import '../studio.css';
import {connection} from 'next/server';
import {NotConfigured} from '@/components/editor/NotConfigured';
import {StudioSignupForm} from '@/components/studio/StudioAuthForms';
import {isBackendConfigured} from '@/lib/api/env';
import {safeStudioNext} from '@/lib/auth/safe-next';
import {turnstileSiteKey} from '@/lib/auth/turnstile';
import {templateSlugToId, CURRENT_TEMPLATES} from '@studio/shared';

export const metadata: Metadata = {
  title: 'Create Account',
  description: 'Create your Write Studio account. Start with a structure. Build a document that makes sense.',
  robots: {index: false, follow: true},
};

export default async function PublicSignupPage({
  searchParams,
}: {
  searchParams: Promise<{template?: string; next?: string}>;
}) {
  await connection();
  if (!isBackendConfigured) return <NotConfigured />;

  const {template, next} = await searchParams;

  let targetNext = '/studio';
  if (template) {
    const templateId = templateSlugToId(template);
    const isValid = CURRENT_TEMPLATES.some(candidate => candidate.id === templateId);
    if (isValid) {
      targetNext = `/studio/documents/new?template=${templateId}`;
    }
  } else if (next) {
    targetNext = safeStudioNext(next);
  }

  return (
    <div style={{minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px'}}>
      <StudioSignupForm siteKey={turnstileSiteKey()} next={targetNext} />
    </div>
  );
}
