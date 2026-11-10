import {Readable} from 'node:stream';
import {Router} from 'express';
import {
  STUDIO_BUCKET,
  STUDIO_MAX_UPLOAD_BYTES,
  STUDIO_PATH,
  STUDIO_UPLOAD_TYPES,
  type StudioAsset,
} from '@studio/shared';
import {env} from '../config/env';
import {HttpError, UUID, handle, param, requireUuid} from '../lib/http';
import {supabase} from '../lib/supabase';
import {workspaceOf} from './app';

/**
 * Private Studio media, mounted at /api/app/assets behind requireUser.
 * Everything is scoped to req.user.id (from the verified Django token) and
 * that user's workspace; ids or paths from the client are only ever looked
 * up within that scope. Files live in the private studio-private-media
 * bucket, which has no storage policies: only this API can reach it.
 */
export const appAssetsRouter = Router();

const FIELDS = 'id, workspace_id, owner_id, case_study_id, path, kind, mime, size, width, height, alt, original_name, created_at';
const storageUrl = (path: string) =>
  `${env.supabaseUrl}/storage/v1/object/authenticated/${STUDIO_BUCKET}/${path.split('/').map(encodeURIComponent).join('/')}`;
const serviceHeaders = {apikey: env.supabaseServiceRoleKey, Authorization: `Bearer ${env.supabaseServiceRoleKey}`};
const privateNoStore = (res: import('express').Response) => res.set('Cache-Control', 'private, no-store');

/** A case study id, only if it is one of this user's (null for the library). */
async function ownCaseStudy(userId: string, value: unknown): Promise<string | null> {
  if (value == null || value === '') return null;
  const id = String(value);
  if (!UUID.test(id)) throw new HttpError(404, 'Case study not found.');
  const {data, error} = await supabase.from('studio_case_studies').select('id').eq('id', id).eq('owner_id', userId).maybeSingle();
  if (error) throw new HttpError(502, error.message);
  if (!data) throw new HttpError(404, 'Case study not found.');
  return id;
}

/** Removes stored objects (best effort; used for cleanup). */
async function removeObjects(paths: string[]) {
  if (!paths.length) return;
  const {error} = await supabase.storage.from(STUDIO_BUCKET).remove(paths);
  if (error) console.error('[studio media] cleanup failed:', error.message);
}

/** Every upload in the user's library, newest first. ?kind=image|video|file, ?case_study_id= */
appAssetsRouter.get(
  '/',
  handle(async (req, res) => {
    let query = supabase.from('studio_assets').select(FIELDS).eq('owner_id', req.user!.id).order('created_at', {ascending: false}).limit(500);
    const kind = String(req.query.kind ?? '');
    if (kind) {
      if (!['image', 'video', 'file'].includes(kind)) throw new HttpError(400, 'Unknown kind of file.');
      query = query.eq('kind', kind);
    }
    if (req.query.case_study_id) query = query.eq('case_study_id', requireUuid(String(req.query.case_study_id)));
    const {data, error} = await query;
    if (error) throw new HttpError(502, error.message);
    privateNoStore(res);
    res.json({assets: (data ?? []) as StudioAsset[]});
  }),
);

/**
 * Step 1 of an upload: a one-time signed URL to put ONE new object at a path
 * this API chooses (the user's own folder, a random name, an extension from
 * the declared type). It can't read anything and can't overwrite.
 */
appAssetsRouter.post(
  '/upload-url',
  handle(async (req, res) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const mime = String(body.mime ?? '').toLowerCase();
    const type = STUDIO_UPLOAD_TYPES[mime];
    if (!type) throw new HttpError(400, 'That file type isn’t supported. Use PNG, JPG, WebP, GIF, AVIF, MP4, WebM, MOV, PDF, PowerPoint or Word.');
    const size = Number(body.size ?? 0);
    if (!(size > 0) || size > STUDIO_MAX_UPLOAD_BYTES) {
      throw new HttpError(400, 'Files can be up to 50 MB. For long videos, use a YouTube, Vimeo or Loom link instead.');
    }
    const workspace = await workspaceOf(req.user!.id);
    const caseStudyId = await ownCaseStudy(req.user!.id, body.case_study_id);
    const path = `${req.user!.id}/${workspace.id}/${caseStudyId ?? 'library'}/${crypto.randomUUID()}.${type.ext}`;
    const {data, error} = await supabase.storage.from(STUDIO_BUCKET).createSignedUploadUrl(path);
    if (error) throw new HttpError(502, error.message);
    privateNoStore(res);
    res.json({path: data.path, signedUrl: data.signedUrl});
  }),
);

/**
 * Step 2: records an uploaded object in the library, after checking that it
 * is in this user's folder and that what was stored matches what was
 * declared. Anything that doesn't check out is deleted from storage.
 */
appAssetsRouter.post(
  '/',
  handle(async (req, res) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const path = String(body.path ?? '');
    const workspace = await workspaceOf(req.user!.id);
    // Not this user's folder: refuse, and never touch it (it may be someone else's file).
    if (!STUDIO_PATH.test(path) || !path.startsWith(`${req.user!.id}/${workspace.id}/`)) {
      throw new HttpError(404, 'Upload not found.');
    }
    const caseStudyId = await ownCaseStudy(req.user!.id, body.case_study_id);
    const folder = path.split('/')[2];
    if (folder !== (caseStudyId ?? 'library')) throw new HttpError(400, 'That upload belongs to a different case study.');

    // What actually got stored.
    const head = await fetch(storageUrl(path), {method: 'HEAD', headers: serviceHeaders});
    if (!head.ok) throw new HttpError(404, 'Upload not found. Try uploading it again.');
    const storedMime = (head.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
    const storedSize = Number(head.headers.get('content-length') ?? 0);
    const type = STUDIO_UPLOAD_TYPES[storedMime];
    const fail = async (message: string): Promise<never> => {
      await removeObjects([path]);
      throw new HttpError(400, message);
    };
    if (!type || !path.endsWith(`.${type.ext}`)) await fail('The uploaded file’s type doesn’t match. Upload it again.');
    if (!(storedSize > 0) || storedSize > STUDIO_MAX_UPLOAD_BYTES) await fail('The uploaded file is empty or too large.');

    const dimension = (value: unknown) => (Number(value) > 0 && Number(value) < 100000 ? Math.round(Number(value)) : null);
    const {data, error} = await supabase
      .from('studio_assets')
      .insert({
        workspace_id: workspace.id,
        owner_id: req.user!.id,
        case_study_id: caseStudyId,
        path,
        kind: type!.kind,
        mime: storedMime,
        size: storedSize,
        width: type!.kind === 'file' ? null : dimension(body.width),
        height: type!.kind === 'file' ? null : dimension(body.height),
        alt: String(body.alt ?? '').replace(/\s+/g, ' ').trim().slice(0, 500),
        original_name: String(body.original_name ?? '').slice(0, 300),
      })
      .select(FIELDS)
      .single();
    if (error) {
      // Recorded already (a retry) is fine; anything else: don't leave an orphan file.
      if (error.code === '23505') throw new HttpError(409, 'That upload is already in your library.');
      await removeObjects([path]);
      throw new HttpError(502, error.message);
    }
    privateNoStore(res);
    res.status(201).json({asset: data as StudioAsset});
  }),
);

/** Saves an asset's alt text. */
appAssetsRouter.patch(
  '/:id',
  handle(async (req, res) => {
    const id = requireUuid(param(req, 'id'));
    const alt = String((req.body ?? {}).alt ?? '').replace(/\s+/g, ' ').trim().slice(0, 500);
    const {data, error} = await supabase.from('studio_assets').update({alt}).eq('id', id).eq('owner_id', req.user!.id).select(FIELDS).maybeSingle();
    if (error) throw new HttpError(502, error.message);
    if (!data) throw new HttpError(404, 'Not found.');
    privateNoStore(res);
    res.json({asset: data as StudioAsset});
  }),
);

/** Deletes an upload: its library row, then the file. */
appAssetsRouter.delete(
  '/:id',
  handle(async (req, res) => {
    const id = requireUuid(param(req, 'id'));
    const {data, error} = await supabase.from('studio_assets').delete().eq('id', id).eq('owner_id', req.user!.id).select('path').maybeSingle();
    if (error) throw new HttpError(502, error.message);
    if (!data) throw new HttpError(404, 'Not found.');
    await removeObjects([data.path]);
    res.json({ok: true});
  }),
);

// ---------------------------------------------------------------------------
// Streaming a private file back to its owner (the Next.js /studio/media route
// calls this with the user's token). Unknown and other people's files get the
// same 404. Byte ranges pass through, so video seeks without downloading all.
// ---------------------------------------------------------------------------
export const appMediaRouter = Router();

const PASS_HEADERS = ['content-type', 'content-length', 'content-range', 'accept-ranges', 'etag', 'last-modified'];

appMediaRouter.get(
  '/',
  handle(async (req, res) => {
    const path = String(req.query.path ?? '');
    if (!STUDIO_PATH.test(path) || !path.startsWith(`${req.user!.id}/`)) throw new HttpError(404, 'Not found.');
    const {data: asset, error} = await supabase
      .from('studio_assets')
      .select('path, kind, mime, original_name')
      .eq('path', path)
      .eq('owner_id', req.user!.id)
      .maybeSingle();
    if (error) throw new HttpError(502, error.message);
    if (!asset) throw new HttpError(404, 'Not found.');

    const range = req.get('range');
    const upstream = await fetch(storageUrl(path), {headers: {...serviceHeaders, ...(range ? {Range: range} : {})}});
    if (!upstream.ok || !upstream.body) throw new HttpError(upstream.status === 416 ? 416 : 404, 'Not found.');

    res.status(upstream.status);
    for (const name of PASS_HEADERS) {
      const value = upstream.headers.get(name);
      if (value) res.set(name, value);
    }
    // The type we recorded wins; files open as downloads, pictures and video inline.
    res.set('Content-Type', asset.mime);
    res.set('Cache-Control', 'private, no-store');
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Content-Security-Policy', "default-src 'none'; sandbox");
    const filename = (asset.original_name || 'file').replace(/["\\\r\n]/g, '');
    res.set('Content-Disposition', `${asset.kind === 'file' && asset.mime !== 'application/pdf' ? 'attachment' : 'inline'}; filename="${filename}"`);
    Readable.fromWeb(upstream.body as import('node:stream/web').ReadableStream).pipe(res);
  }),
);
