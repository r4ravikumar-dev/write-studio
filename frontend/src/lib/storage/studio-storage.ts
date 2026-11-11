'use client';

import {STUDIO_MAX_UPLOAD_BYTES, STUDIO_UPLOAD_TYPES, type StudioAsset} from '@studio/shared';
import {measure, type MediaKind} from '@/components/editor/upload';
import {
  createStudioUploadUrl,
  deleteStudioAsset,
  listStudioAssets,
  recordStudioAsset,
  updateStudioAssetAlt,
} from '@/app/studio/media-actions';

/**
 * The Studio's uploader (browser side). Private bucket only: the Express API
 * picks the path and hands out a one-time upload URL; the file goes straight
 * to Supabase Storage; the API then checks it and adds it to the library.
 */
export const STUDIO_ACCEPT = Object.keys(STUDIO_UPLOAD_TYPES).join(',');

/** File-picker filters per kind (MIME types plus extensions). */
export const STUDIO_ACCEPT_BY_KIND = Object.fromEntries(
  (['image', 'video', 'file'] as MediaKind[]).map(kind => [
    kind,
    Object.entries(STUDIO_UPLOAD_TYPES)
      .filter(([, type]) => type.kind === kind)
      .map(([mime, type]) => `${mime},.${type.ext}`)
      .join(','),
  ]),
) as Record<MediaKind, string>;

/** Which kind a dropped or pasted file is, or null if it can't be uploaded. */
export const studioKindOfFile = (file: File): MediaKind | null => STUDIO_UPLOAD_TYPES[file.type]?.kind ?? null;

const unwrap = <T,>(result: {ok: true; data: T} | {ok: false; error: string}) => {
  if (!result.ok) throw new Error(result.error);
  return result.data;
};

export async function uploadStudioAsset(file: File, caseStudyId: string | null = null): Promise<StudioAsset> {
  const type = STUDIO_UPLOAD_TYPES[file.type];
  if (!type) throw new Error(`${file.name}: that file type isn’t supported.`);
  if (file.size > STUDIO_MAX_UPLOAD_BYTES) throw new Error(`${file.name} is over 50 MB.`);
  const {width, height} = type.kind === 'file' ? {width: null, height: null} : await measure(file, type.kind);

  const {path, signedUrl} = unwrap(await createStudioUploadUrl({mime: file.type, size: file.size, caseStudyId}));
  const form = new FormData();
  form.append('cacheControl', 'no-store');
  form.append('', file);
  const response = await fetch(signedUrl, {method: 'PUT', body: form, headers: {'x-upsert': 'false'}});
  if (!response.ok) {
    const problem = await response.json().catch(() => ({}));
    throw new Error(`${file.name} couldn’t be uploaded: ${problem.message ?? problem.error ?? response.statusText}`);
  }
  return unwrap(
    await recordStudioAsset({
      path,
      caseStudyId,
      width,
      height,
      alt: type.kind === 'file' ? '' : file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '),
      originalName: file.name,
    }),
  );
}

export const listStudioMedia = async (kind?: StudioAsset['kind']) => unwrap(await listStudioAssets(kind));
export const saveStudioAlt = async (id: string, alt: string) => unwrap(await updateStudioAssetAlt(id, alt));
export const removeStudioAsset = async (id: string) => {
  unwrap(await deleteStudioAsset(id));
};
