'use server';

import {redirect} from 'next/navigation';
import {revalidatePath} from 'next/cache';
import type {StudioCaseStudyDraft} from '@studio/shared';
import {api, errorMessage} from '@/lib/api/express';
import {requireStudioUser} from '@/lib/auth/current-user';

/**
 * The private Studio's case-study actions. Each re-checks the Studio session
 * and calls the Express API with the user's own token; the API scopes
 * everything to that user. Studio documents are never public.
 */
export type StudioResult = {ok: true; updatedAt?: string} | {ok: false; error: string};

async function attempt(fn: () => Promise<{updatedAt?: string} | unknown>, fallback: string): Promise<StudioResult> {
  await requireStudioUser(); // outside the try: its sign-in redirect must reach the browser
  try {
    const data = (await fn()) as {updatedAt?: string} | undefined;
    return {ok: true, updatedAt: data?.updatedAt};
  } catch (error) {
    return {ok: false, error: errorMessage(error, fallback)};
  }
}

/** Starts a private draft and opens it. */
export async function createStudioCaseStudy(formData?: FormData) {
  await requireStudioUser();
  const title = String(formData?.get('title') ?? '').trim();
  const {id} = await api<{id: string}>('/api/app/case-studies', {method: 'POST', body: {title}, auth: true});
  revalidatePath('/studio', 'layout');
  redirect(`/studio/case-studies/${id}`);
}

export async function saveStudioCaseStudy(id: string, draft: StudioCaseStudyDraft, expectedUpdatedAt: string) {
  return attempt(
    () =>
      api<{updatedAt: string}>(`/api/app/case-studies/${id}`, {
        method: 'PUT',
        body: {...draft, expected_updated_at: expectedUpdatedAt},
        auth: true,
      }),
    'We couldn’t save your changes. Check your connection and try again.',
  );
}

export async function archiveStudioCaseStudy(id: string) {
  const result = await attempt(() => api(`/api/app/case-studies/${id}/archive`, {method: 'POST', auth: true}), 'We couldn’t archive this case study. Try again.');
  revalidatePath('/studio', 'layout');
  return result;
}

export async function restoreStudioCaseStudy(id: string) {
  const result = await attempt(() => api(`/api/app/case-studies/${id}/restore`, {method: 'POST', auth: true}), 'We couldn’t restore this case study. Try again.');
  revalidatePath('/studio', 'layout');
  return result;
}

export async function deleteStudioCaseStudy(id: string) {
  const result = await attempt(() => api(`/api/app/case-studies/${id}`, {method: 'DELETE', auth: true}), 'We couldn’t delete this case study. Try again.');
  revalidatePath('/studio', 'layout');
  return result;
}
