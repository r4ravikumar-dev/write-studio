import type {Metadata} from 'next';
import {NotConfigured} from '@/components/editor/NotConfigured';
import {StudioLoginForm} from '@/components/studio/StudioAuthForms';
import {isBackendConfigured} from '@/lib/api/env';
import {safeStudioNext} from '@/lib/auth/safe-next';
import {turnstileSiteKey} from '@/lib/auth/turnstile';
import {templateSlugToId, CURRENT_TEMPLATES} from '@studio/shared';

export const metadata: Metadata = {title: 'Sign in'};

export default async function StudioLoginPage({
  searchParams,
}: {
  searchParams: Promise<{template?: string; next?: string; deleted?: string}>;
}) {
  const {template, next, deleted} = await searchParams;
  if (!isBackendConfigured) return <NotConfigured />;

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
    <StudioLoginForm
      next={targetNext}
      notice={deleted === '1' ? 'Your account and everything in it have been deleted.' : undefined}
      siteKey={turnstileSiteKey()}
    />
  );
}
