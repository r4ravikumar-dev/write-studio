import type {Metadata} from 'next';
import {connection} from 'next/server';
import {NotConfigured} from '@/components/editor/NotConfigured';
import {StudioSignupForm} from '@/components/studio/StudioAuthForms';
import {isBackendConfigured} from '@/lib/api/env';
import {safeStudioNext} from '@/lib/auth/safe-next';
import {turnstileSiteKey} from '@/lib/auth/turnstile';
import {templateSlugToId, CURRENT_TEMPLATES} from '@studio/shared';

export const metadata: Metadata = {title: 'Create an account'};

export default async function StudioSignupPage({
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

  return <StudioSignupForm siteKey={turnstileSiteKey()} next={targetNext} />;
}
