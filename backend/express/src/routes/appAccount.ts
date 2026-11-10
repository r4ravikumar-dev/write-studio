import {Router} from 'express';
import {STUDIO_BUCKET} from '@studio/shared';
import {HttpError, handle} from '../lib/http';
import {supabase} from '../lib/supabase';

/**
 * Account lifecycle, mounted at /api/app/account behind requireUser.
 *
 * Deleting an account deletes its rows by database cascade (Django deletes
 * the user), but objects in Storage are not rows: they must be removed here
 * first. Only ever the caller's own prefix `{userId}/` in the private bucket,
 * taken from the verified token, never from the request.
 */
export const appAccountRouter = Router();

/** Every object path under a prefix (folders walked recursively). */
async function listAll(prefix: string): Promise<string[]> {
  const found: string[] = [];
  const folders = [prefix];
  while (folders.length) {
    const folder = folders.pop()!;
    for (let offset = 0; ; offset += 1000) {
      const {data, error} = await supabase.storage.from(STUDIO_BUCKET).list(folder, {limit: 1000, offset});
      if (error) throw new HttpError(502, error.message);
      for (const item of data ?? []) {
        const path = `${folder}/${item.name}`;
        // Folders come back without an id.
        if (item.id) found.push(path);
        else folders.push(path);
      }
      if (!data || data.length < 1000) break;
    }
  }
  return found;
}

/** Removes every private file the caller owns. Safe to repeat. */
appAccountRouter.delete(
  '/storage',
  handle(async (req, res) => {
    const userId = req.user!.id;
    const {data: rows, error} = await supabase.from('studio_assets').select('path').eq('owner_id', userId);
    if (error) throw new HttpError(502, error.message);
    const paths = [...new Set([...(rows ?? []).map(row => row.path as string), ...(await listAll(userId))])].filter(path =>
      path.startsWith(`${userId}/`),
    );
    for (let i = 0; i < paths.length; i += 100) {
      const {error: removeError} = await supabase.storage.from(STUDIO_BUCKET).remove(paths.slice(i, i + 100));
      if (removeError) throw new HttpError(502, removeError.message);
    }
    const left = await listAll(userId);
    if (left.length) throw new HttpError(502, 'Some files couldn’t be removed. Try again.');
    res.set('Cache-Control', 'private, no-store');
    res.json({removed: paths.length});
  }),
);
