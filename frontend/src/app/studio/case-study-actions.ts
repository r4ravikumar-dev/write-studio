'use server';

import {redirect} from 'next/navigation';
import {revalidatePath} from 'next/cache';
import type {StudioCaseStudyDraft, StudioSetup} from '@studio/shared';
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

/**
 * Project setup (the new case study wizard). `finish` creates the case study from the outline and
 * opens it in the editor; otherwise the answers are kept as an unfinished setup and the user goes
 * back to the workspace. `id` continues a setup saved earlier.
 */
export async function saveProjectSetup(setup: StudioSetup, {id, finish}: {id?: string; finish: boolean}): Promise<StudioResult> {
  await requireStudioUser();
  let target: string;
  try {
    if (id) {
      await api(`/api/app/case-studies/${id}/setup`, {method: 'PUT', body: {setup, finish}, auth: true});
      target = id;
    } else {
      target = (await api<{id: string}>('/api/app/case-studies', {method: 'POST', body: {setup, finish}, auth: true})).id;
    }
  } catch (error) {
    return {ok: false, error: errorMessage(error, finish ? 'We couldn’t create your case study. Check your connection and try again.' : 'We couldn’t save your answers. Check your connection and try again.')};
  }
  revalidatePath('/studio', 'layout');
  redirect(finish ? `/studio/case-studies/${target}` : '/studio');
}

/** Copies one of the user's case studies into a new draft and opens it. */
export async function duplicateStudioCaseStudy(id: string, title: string): Promise<StudioResult> {
  await requireStudioUser();
  let copy: string;
  try {
    copy = (await api<{id: string}>(`/api/app/case-studies/${id}/duplicate`, {method: 'POST', body: {title}, auth: true})).id;
  } catch (error) {
    return {ok: false, error: errorMessage(error, 'We couldn’t copy that case study. Try again.')};
  }
  revalidatePath('/studio', 'layout');
  redirect(`/studio/case-studies/${copy}`);
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

/** Private section notes (never part of the document). Keyed by section id. */
export async function getSectionNotes(id: string): Promise<{ok: true; notes: Record<string, string>} | {ok: false; error: string}> {
  await requireStudioUser();
  try {
    const {notes} = await api<{notes: {section_id: string; body: string}[]}>(`/api/app/case-studies/${id}/notes`, {auth: true});
    return {ok: true, notes: Object.fromEntries(notes.map(note => [note.section_id, note.body]))};
  } catch (error) {
    return {ok: false, error: errorMessage(error, 'We couldn’t load your notes. Reload the page to try again.')};
  }
}

export async function saveSectionNote(id: string, sectionId: string, body: string) {
  return attempt(
    () => api(`/api/app/case-studies/${id}/notes/${encodeURIComponent(sectionId)}`, {method: 'PUT', body: {body}, auth: true}),
    'We couldn’t save your note. Check your connection and try again.',
  );
}
