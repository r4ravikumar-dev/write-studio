'use server';

import {revalidatePath} from 'next/cache';
import type {StudioAsset} from '@studio/shared';
import {api, errorMessage} from '@/lib/api/express';
import {requireStudioUser} from '@/lib/auth/current-user';

/**
 * The Studio media library's server side (for lib/storage/studio-storage.ts).
 * Each call re-checks the Studio session and sends the user's own token;
 * the Express API scopes everything to that user. Never the legacy bucket.
 */
export type MediaResult<T> = {ok: true; data: T} | {ok: false; error: string};

async function run<T>(fn: () => Promise<T>, fallback: string): Promise<MediaResult<T>> {
  await requireStudioUser(); // outside the try: its sign-in redirect must not be swallowed
  try {
    return {ok: true, data: await fn()};
  } catch (error) {
    return {ok: false, error: errorMessage(error, fallback)};
  }
}

export async function createStudioUploadUrl(input: {mime: string; size: number; caseStudyId?: string | null}) {
  return run(
    () =>
      api<{path: string; signedUrl: string}>('/api/app/assets/upload-url', {
        method: 'POST',
        body: {mime: input.mime, size: input.size, case_study_id: input.caseStudyId ?? null},
        auth: true,
      }),
    'Couldn’t start the upload.',
  );
}

export async function recordStudioAsset(input: {
  path: string;
  caseStudyId?: string | null;
  width: number | null;
  height: number | null;
  alt: string;
  originalName: string;
}) {
  const result = await run(
    async () =>
      (
        await api<{asset: StudioAsset}>('/api/app/assets', {
          method: 'POST',
          body: {
            path: input.path,
            case_study_id: input.caseStudyId ?? null,
            width: input.width,
            height: input.height,
            alt: input.alt,
            original_name: input.originalName,
          },
          auth: true,
        })
      ).asset,
    'Couldn’t save the upload.',
  );
  if (result.ok) revalidatePath('/studio/media');
  return result;
}

export async function listStudioAssets(kind?: StudioAsset['kind']) {
  return run(
    async () => (await api<{assets: StudioAsset[]}>(`/api/app/assets${kind ? `?kind=${kind}` : ''}`, {auth: true})).assets,
    'Couldn’t load your media.',
  );
}

export async function updateStudioAssetAlt(id: string, alt: string) {
  return run(
    async () => (await api<{asset: StudioAsset}>(`/api/app/assets/${id}`, {method: 'PATCH', body: {alt}, auth: true})).asset,
    'Couldn’t save the description.',
  );
}

export async function deleteStudioAsset(id: string) {
  const result = await run(() => api(`/api/app/assets/${id}`, {method: 'DELETE', auth: true}), 'Couldn’t delete it.');
  if (result.ok) revalidatePath('/studio/media');
  return result;
}
