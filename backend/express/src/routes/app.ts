import {Router} from 'express';
import type {StudioWorkspace} from '@studio/shared';
import {HttpError, handle} from '../lib/http';
import {supabase} from '../lib/supabase';

/**
 * The public Studio's API, mounted at /api/app behind requireUser. Every
 * query is scoped to req.user.id (from the verified Django token). The
 * studio_* tables are unreachable through Supabase's public API, so this is
 * the only way in. Case studies and media follow in Phases 3–4.
 */
export const appRouter = Router();

/** The signed-in account's personal workspace (made by the sign-up trigger). */
export async function workspaceOf(userId: string): Promise<StudioWorkspace> {
  const {data, error} = await supabase
    .from('studio_workspaces')
    .select('id, owner_id, name, created_at, updated_at')
    .eq('owner_id', userId)
    .maybeSingle();
  if (error) throw new HttpError(502, error.message);
  if (!data) throw new HttpError(404, 'Your workspace isn’t ready yet. Try again in a moment.');
  return data as StudioWorkspace;
}

appRouter.get(
  '/workspace',
  handle(async (req, res) => {
    res.set('Cache-Control', 'private, no-store');
    res.json({workspace: await workspaceOf(req.user!.id)});
  }),
);

/** Renames the workspace (the only workspace field a user may change). */
appRouter.patch(
  '/workspace',
  handle(async (req, res) => {
    const name = String((req.body ?? {}).name ?? '').replace(/\s+/g, ' ').trim().slice(0, 80);
    if (!name) throw new HttpError(400, 'Give your workspace a name.');
    const {data, error} = await supabase
      .from('studio_workspaces')
      .update({name})
      .eq('owner_id', req.user!.id)
      .select('id, owner_id, name, created_at, updated_at')
      .single();
    if (error) throw new HttpError(502, error.message);
    res.set('Cache-Control', 'private, no-store');
    res.json({workspace: data as StudioWorkspace});
  }),
);
