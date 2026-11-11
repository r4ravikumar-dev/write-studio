import {Router} from 'express';
import {
  CONTENT_SCHEMA_VERSION,
  caseStudyTemplate,
  cleanSetup,
  isSectionId,
  migrateContent,
  normaliseSections,
  getFramework,
  isProjectType,
  outlineDocument,
  slugify,
  type StudioSetup,
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
  'id, workspace_id, owner_id, slug, title, subtitle, label, area, tags, summary, focus, thumbnail_path, thumbnail_alt, thumbnail_focus, cover_path, layout, project_type, role, team, timeline, platform, objective, challenge, framework_id, framework_version, setup_state, content_schema_version, status, created_at, updated_at';
const LAYOUTS: CaseStudyLayout[] = ['wide', 'split', 'split-reverse'];
const text = (value: unknown, max: number) => String(value ?? '').trim().slice(0, max);
const noStore = (res: import('express').Response) => res.set('Cache-Control', 'private, no-store');

/** The draft as stored, from whatever the editor sent (validated against the user's own files). */
function toRow(draft: Partial<StudioCaseStudyDraft>, ownerId: string, workspaceId: string) {
  const slug = slugify(text(draft.slug, 200) || text(draft.title, 300));
  if (!slug) throw new HttpError(400, 'Enter a headline or a short name.');
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
    project_type: isProjectType(draft.project_type) ? draft.project_type : null,
    role: text(draft.role, 200),
    team: text(draft.team, 500),
    timeline: text(draft.timeline, 200),
    platform: text(draft.platform, 200),
    objective: text(draft.objective, 1000),
    challenge: text(draft.challenge, 1000),
    // Every save is stored in the current schema, with valid, unique section ids.
    content: draft.content && typeof draft.content === 'object' ? normaliseSections(draft.content) : draft.content,
    content_schema_version: CONTENT_SCHEMA_VERSION,
  };
  const problems = studioDraftProblems(row as StudioCaseStudyDraft, ownerId, workspaceId);
  if (problems.length) throw new HttpError(422, problems.join(' '));
  return row;
}

/**
 * A case study in the current content schema. An older document is migrated explicitly: the
 * original is copied to studio_content_backups first, then the migrated version is saved (only if
 * nobody saved in between). Never done silently in the browser.
 */
async function currentCaseStudy(id: string, ownerId: string): Promise<StudioCaseStudy> {
  const study = await ownCaseStudy(id, ownerId);
  if (study.content_schema_version >= CONTENT_SCHEMA_VERSION || study.setup_state) return study;
  const {content, version} = migrateContent(study.content, study.content_schema_version);
  const backup = await supabase.from('studio_content_backups').insert({
    case_study_id: study.id,
    owner_id: ownerId,
    from_version: study.content_schema_version,
    to_version: version,
    content: study.content,
  });
  if (backup.error) throw new HttpError(502, backup.error.message);
  const {data, error} = await supabase
    .from('studio_case_studies')
    .update({content, content_schema_version: version})
    .eq('id', study.id)
    .eq('owner_id', ownerId)
    .eq('updated_at', study.updated_at)
    .select('*')
    .maybeSingle();
  if (error) throw new HttpError(502, error.message);
  // Saved elsewhere in the meantime: read whatever is there now (it was saved in the new schema).
  return (data as unknown as StudioCaseStudy | null) ?? ownCaseStudy(id, ownerId);
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

/**
 * The columns a project setup fills, validated: the framework must exist, the outline must fit it,
 * and the cover must be one of the user's own uploads. `finish` creates the document from the
 * outline; otherwise the setup is kept for later (`setup_state`) and the document stays empty.
 */
function setupRow(body: unknown, ownerId: string, workspaceId: string, finish: boolean) {
  const {setup, problems} = cleanSetup(body);
  if (problems.length) throw new HttpError(422, problems.join(' '));
  const content = finish ? outlineDocument(setup.outline, getFramework(setup.framework_id, setup.framework_version)) : {type: 'doc', content: []};
  const pathProblems = studioDraftProblems({content, thumbnail_path: null, cover_path: setup.cover_path}, ownerId, workspaceId);
  if (pathProblems.length) throw new HttpError(422, pathProblems.join(' '));
  const state: Pick<StudioSetup, 'step' | 'start' | 'outline'> = {step: setup.step, start: setup.start, outline: setup.outline};
  return {
    title: setup.title || 'Untitled case study',
    summary: setup.summary,
    project_type: setup.project_type,
    role: setup.role,
    team: setup.team,
    timeline: setup.timeline,
    platform: setup.platform,
    objective: setup.objective,
    challenge: setup.challenge,
    framework_id: setup.framework_id,
    framework_version: setup.framework_version,
    // The cover is also the card thumbnail until the user picks another one.
    cover_path: setup.cover_path,
    thumbnail_path: setup.cover_path,
    thumbnail_alt: setup.cover_path ? setup.cover_alt : '',
    content,
    setup_state: finish ? null : state,
  };
}

/** Inserts a new row with a unique slug (retries on the rare clash). */
async function insertCaseStudy(ownerId: string, workspaceId: string, row: Record<string, unknown> & {title: string}) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const slug = `${slugify(row.title).slice(0, 60) || 'untitled'}-${crypto.randomUUID().slice(0, 6)}`;
    const {data, error} = await supabase
      .from('studio_case_studies')
      .insert({...row, workspace_id: workspaceId, owner_id: ownerId, slug})
      .select('id')
      .single();
    if (!error) return data.id as string;
    if (error.code !== '23505') throw new HttpError(502, error.message);
  }
  throw new HttpError(409, 'We couldn’t create a unique short name. Try again.');
}

/**
 * Starts a private draft. With `setup` (the wizard), from the user's answers and outline, or kept
 * unfinished when `finish` is false; without it, from the default framework's sections.
 */
appCaseStudiesRouter.post(
  '/',
  handle(async (req, res) => {
    const workspace = await workspaceOf(req.user!.id);
    const body = (req.body ?? {}) as {title?: unknown; setup?: unknown; finish?: unknown};
    const row = body.setup
      ? setupRow(body.setup, req.user!.id, workspace.id, body.finish !== false)
      : {title: text(body.title, 300) || 'Untitled case study', content: caseStudyTemplate(), framework_id: 'product-ux', framework_version: 1};
    (row as Record<string, unknown>).content_schema_version = CONTENT_SCHEMA_VERSION;
    const id = await insertCaseStudy(req.user!.id, workspace.id, row);
    noStore(res);
    res.status(201).json({id});
  }),
);

/** Updates an unfinished setup, or finishes it (creates the document). Only while setup is unfinished. */
appCaseStudiesRouter.put(
  '/:id/setup',
  handle(async (req, res) => {
    const id = requireUuid(param(req, 'id'));
    const current = await ownCaseStudy(id, req.user!.id, 'id, workspace_id, setup_state');
    if (!current.setup_state) throw new HttpError(409, 'This case study has already been created. Open it to keep writing.');
    const body = (req.body ?? {}) as {setup?: unknown; finish?: unknown};
    const row = {...setupRow(body.setup, req.user!.id, current.workspace_id, body.finish !== false), content_schema_version: CONTENT_SCHEMA_VERSION};
    const {data, error} = await supabase
      .from('studio_case_studies')
      .update(row)
      .eq('id', id)
      .eq('owner_id', req.user!.id)
      .not('setup_state', 'is', null)
      .select('id')
      .maybeSingle();
    if (error) throw new HttpError(502, error.message);
    if (!data) throw new HttpError(409, 'This case study has already been created. Open it to keep writing.');
    noStore(res);
    res.json({id});
  }),
);

/** Copies one of the user's own case studies into a new private draft. */
appCaseStudiesRouter.post(
  '/:id/duplicate',
  handle(async (req, res) => {
    const source = await currentCaseStudy(requireUuid(param(req, 'id')), req.user!.id);
    if (source.setup_state) throw new HttpError(409, 'Finish setting up this case study before copying it.');
    const name = source.title.replace(/\*/g, '').trim() || 'Untitled case study';
    const title = text((req.body ?? {}).title, 300) || `Copy of ${name}`.slice(0, 300);
    const copy: Record<string, unknown> & {title: string} = {title};
    for (const field of ['subtitle', 'label', 'area', 'tags', 'summary', 'focus', 'thumbnail_path', 'thumbnail_alt', 'thumbnail_focus', 'cover_path', 'layout', 'project_type', 'role', 'team', 'timeline', 'platform', 'objective', 'challenge', 'framework_id', 'framework_version', 'content', 'content_schema_version'] as const) {
      copy[field] = source[field];
    }
    const id = await insertCaseStudy(req.user!.id, source.workspace_id, copy);
    noStore(res);
    res.status(201).json({id});
  }),
);

appCaseStudiesRouter.get(
  '/:id',
  handle(async (req, res) => {
    const study = await currentCaseStudy(requireUuid(param(req, 'id')), req.user!.id);
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
    const current = await ownCaseStudy(id, req.user!.id, 'id, workspace_id, updated_at, status, setup_state');
    if (current.setup_state) throw new HttpError(409, 'Finish setting up this case study before writing in it.');
    if (current.status === 'archived') throw new HttpError(409, 'This case study is archived. Restore it to keep editing.');
    const body = (req.body ?? {}) as Partial<StudioCaseStudyDraft> & {expected_updated_at?: string};
    const row = toRow(body, req.user!.id, current.workspace_id);

    let query = supabase.from('studio_case_studies').update(row).eq('id', id).eq('owner_id', req.user!.id);
    if (body.expected_updated_at) query = query.eq('updated_at', body.expected_updated_at);
    const {data, error} = await query.select('updated_at, slug').maybeSingle();
    if (error) {
      if (error.code === '23505') throw new HttpError(409, 'Another of your case studies already uses that short name. Choose a different one.');
      throw new HttpError(502, error.message);
    }
    if (!data) throw new HttpError(409, 'This case study was changed in another tab or window. Reload the page to get the latest version, then make your change again.', {code: 'conflict'});
    noStore(res);
    res.json({updatedAt: data.updated_at, slug: data.slug});
  }),
);

/** Private section notes: never part of the document, its preview or exports. */
appCaseStudiesRouter.get(
  '/:id/notes',
  handle(async (req, res) => {
    const id = requireUuid(param(req, 'id'));
    await ownCaseStudy(id, req.user!.id, 'id');
    const {data, error} = await supabase.from('studio_section_notes').select('section_id, body, updated_at').eq('case_study_id', id).eq('owner_id', req.user!.id);
    if (error) throw new HttpError(502, error.message);
    noStore(res);
    res.json({notes: data ?? []});
  }),
);

/** Saves (or, when empty, deletes) the note for one section. */
appCaseStudiesRouter.put(
  '/:id/notes/:sectionId',
  handle(async (req, res) => {
    const id = requireUuid(param(req, 'id'));
    const sectionId = param(req, 'sectionId');
    if (!isSectionId(sectionId)) throw new HttpError(400, 'Unknown section.');
    await ownCaseStudy(id, req.user!.id, 'id');
    const body = String((req.body ?? {}).body ?? '').trim();
    if (body.length > 5000) throw new HttpError(422, 'A note can be up to 5,000 characters. Shorten it, then try again.');
    const notes = supabase.from('studio_section_notes');
    const {error} = body
      ? await notes.upsert({case_study_id: id, owner_id: req.user!.id, section_id: sectionId, body}, {onConflict: 'case_study_id,section_id'})
      : await notes.delete().eq('case_study_id', id).eq('owner_id', req.user!.id).eq('section_id', sectionId);
    if (error) throw new HttpError(502, error.message);
    noStore(res);
    res.json({ok: true});
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
