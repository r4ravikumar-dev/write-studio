import {Router} from 'express';
import {
  caseStudyTemplate,
  slugify,
  studioDraftProblems,
  type CaseStudyLayout,
  type StudioCaseStudy,
  type StudioCaseStudyCard,
  type StudioCaseStudyDraft,
} from '@studio/shared';
import {HttpError, handle, param, requireUuid} from '../lib/http';
import {supabase} from '../lib/supabase';
import {workspaceOf} from './app';

/**
 * The signed-in user's private case studies, mounted at
 * /api/app/case-studies behind requireUser. Every query is filtered by
 * owner_id = req.user.id (from the verified token); owner and workspace are
 * always set here, never taken from the request. No publish, no public
 * snapshot: status is draft or archived only.
 */
export const appCaseStudiesRouter = Router();

const CARD_FIELDS =
  'id, workspace_id, owner_id, slug, title, subtitle, label, area, tags, summary, focus, thumbnail_path, thumbnail_alt, thumbnail_focus, cover_path, layout, content_schema_version, status, created_at, updated_at';
const LAYOUTS: CaseStudyLayout[] = ['wide', 'split', 'split-reverse'];
const text = (value: unknown, max: number) => String(value ?? '').trim().slice(0, max);
const noStore = (res: import('express').Response) => res.set('Cache-Control', 'private, no-store');

/** The draft as stored, from whatever the editor sent (validated against the user's own files). */
function toRow(draft: Partial<StudioCaseStudyDraft>, ownerId: string, workspaceId: string) {
  const slug = slugify(text(draft.slug, 200) || text(draft.title, 300));
  if (!slug) throw new HttpError(400, 'Add a headline or a short name.');
  const row = {
    slug,
    title: text(draft.title, 300) || 'Untitled case study',
    subtitle: text(draft.subtitle, 500),
    label: text(draft.label, 200),
    area: text(draft.area, 200),
    tags: (Array.isArray(draft.tags) ? draft.tags : []).map(tag => text(tag, 60)).filter(Boolean).slice(0, 20),
    summary: text(draft.summary, 2000),
    focus: text(draft.focus, 500),
    thumbnail_path: draft.thumbnail_path ? String(draft.thumbnail_path) : null,
    thumbnail_alt: text(draft.thumbnail_alt, 500),
    thumbnail_focus: text(draft.thumbnail_focus, 40) || 'center',
    cover_path: draft.cover_path ? String(draft.cover_path) : null,
    layout: LAYOUTS.includes(draft.layout as CaseStudyLayout) ? draft.layout : 'split',
    content: draft.content,
  };
  const problems = studioDraftProblems(row as StudioCaseStudyDraft, ownerId, workspaceId);
  if (problems.length) throw new HttpError(422, problems.join(' '));
  return row;
}

async function ownCaseStudy(id: string, ownerId: string, fields = '*') {
  const {data, error} = await supabase.from('studio_case_studies').select(fields).eq('id', id).eq('owner_id', ownerId).maybeSingle();
  if (error) throw new HttpError(502, error.message);
  if (!data) throw new HttpError(404, 'Case study not found.');
  return data as unknown as StudioCaseStudy;
}

/** The user's case studies, newest edit first. ?status=draft|archived */
appCaseStudiesRouter.get(
  '/',
  handle(async (req, res) => {
    let query = supabase.from('studio_case_studies').select(CARD_FIELDS).eq('owner_id', req.user!.id).order('updated_at', {ascending: false}).limit(500);
    const status = String(req.query.status ?? '');
    if (status) {
      if (status !== 'draft' && status !== 'archived') throw new HttpError(400, 'Unknown status.');
      query = query.eq('status', status);
    }
    const {data, error} = await query;
    if (error) throw new HttpError(502, error.message);
    noStore(res);
    res.json({studies: (data ?? []) as unknown as StudioCaseStudyCard[]});
  }),
);

/** Starts a private draft from the storytelling template. */
appCaseStudiesRouter.post(
  '/',
  handle(async (req, res) => {
    const workspace = await workspaceOf(req.user!.id);
    const title = text((req.body ?? {}).title, 300) || 'Untitled case study';
    for (let attempt = 0; attempt < 3; attempt++) {
      const slug = `${slugify(title).slice(0, 60) || 'untitled'}-${crypto.randomUUID().slice(0, 6)}`;
      const {data, error} = await supabase
        .from('studio_case_studies')
        .insert({workspace_id: workspace.id, owner_id: req.user!.id, slug, title, content: caseStudyTemplate()})
        .select('id')
        .single();
      if (!error) {
        noStore(res);
        res.status(201).json({id: data.id});
        return;
      }
      if (error.code !== '23505') throw new HttpError(502, error.message);
    }
    throw new HttpError(409, 'Couldn’t pick a unique short name. Try again.');
  }),
);

appCaseStudiesRouter.get(
  '/:id',
  handle(async (req, res) => {
    const study = await ownCaseStudy(requireUuid(param(req, 'id')), req.user!.id);
    noStore(res);
    res.json({study});
  }),
);

/**
 * Saves the draft (autosave). With `expected_updated_at`, the save only
 * applies if nobody saved in between (another tab or device): otherwise 409,
 * so one copy never silently overwrites the other.
 */
appCaseStudiesRouter.put(
  '/:id',
  handle(async (req, res) => {
    const id = requireUuid(param(req, 'id'));
    const current = await ownCaseStudy(id, req.user!.id, 'id, workspace_id, updated_at, status');
    if (current.status === 'archived') throw new HttpError(409, 'This case study is archived. Restore it to keep editing.');
    const body = (req.body ?? {}) as Partial<StudioCaseStudyDraft> & {expected_updated_at?: string};
    const row = toRow(body, req.user!.id, current.workspace_id);

    let query = supabase.from('studio_case_studies').update(row).eq('id', id).eq('owner_id', req.user!.id);
    if (body.expected_updated_at) query = query.eq('updated_at', body.expected_updated_at);
    const {data, error} = await query.select('updated_at, slug').maybeSingle();
    if (error) {
      if (error.code === '23505') throw new HttpError(409, 'Another of your case studies already uses that short name.');
      throw new HttpError(502, error.message);
    }
    if (!data) throw new HttpError(409, 'This case study changed somewhere else (another tab?). Reload to get the latest version.', {code: 'conflict'});
    noStore(res);
    res.json({updatedAt: data.updated_at, slug: data.slug});
  }),
);

async function setStatus(id: string, ownerId: string, status: 'draft' | 'archived') {
  const {data, error} = await supabase
    .from('studio_case_studies')
    .update({status})
    .eq('id', id)
    .eq('owner_id', ownerId)
    .select('updated_at, status')
    .maybeSingle();
  if (error) throw new HttpError(502, error.message);
  if (!data) throw new HttpError(404, 'Case study not found.');
  return data;
}

/** Archive: out of the way, read-only, still private and restorable. Not "unpublish". */
appCaseStudiesRouter.post(
  '/:id/archive',
  handle(async (req, res) => {
    const data = await setStatus(requireUuid(param(req, 'id')), req.user!.id, 'archived');
    noStore(res);
    res.json({updatedAt: data.updated_at, status: data.status});
  }),
);

appCaseStudiesRouter.post(
  '/:id/restore',
  handle(async (req, res) => {
    const data = await setStatus(requireUuid(param(req, 'id')), req.user!.id, 'draft');
    noStore(res);
    res.json({updatedAt: data.updated_at, status: data.status});
  }),
);

/** Deletes a case study for good. Its uploads stay in the media library (detached). */
appCaseStudiesRouter.delete(
  '/:id',
  handle(async (req, res) => {
    const id = requireUuid(param(req, 'id'));
    const {data, error} = await supabase.from('studio_case_studies').delete().eq('id', id).eq('owner_id', req.user!.id).select('id').maybeSingle();
    if (error) throw new HttpError(502, error.message);
    if (!data) throw new HttpError(404, 'Case study not found.');
    res.json({ok: true});
  }),
);
