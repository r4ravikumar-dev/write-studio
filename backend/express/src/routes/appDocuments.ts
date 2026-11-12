import {Router} from 'express';
import {
  CONTENT_SCHEMA_VERSION,
  isEnforcedType,
  cleanDocument,
  DEFAULT_DOCUMENT_TYPE,
  canChangeStatus,
  cleanMetadata,
  cleanSetup,
  defaultTemplate,
  documentNoun,
  getTemplate,
  isAvailableDocumentType,
  isDocumentType,
  isProjectType,
  isSectionId,
  isStudioStatus,
  migrateContent,
  newerTemplate,
  normaliseSections,
  outlineDocument,
  outlineFor,
  slugify,
  studioDraftProblems,
  untitledTitle,
  type CaseStudyLayout,
  type DocumentType,
  type JSONContent,
  type StudioSetup,
  type StudioStatus,
  type StudioDocument,
  type StudioDocumentCard,
  type StudioDocumentDraft,
} from '@studio/shared';
import {HttpError, handle, param, requireUuid} from '../lib/http';
import {supabase} from '../lib/supabase';
import {workspaceOf} from './app';

/**
 * The signed-in user's private documents, of every type, mounted at /api/app/documents behind
 * requireUser. Every query is filtered by owner_id = req.user.id (from the verified token); owner
 * and workspace are always set here, never taken from the request. No publish, no public
 * snapshot: the statuses (draft, in progress, ready for review, archived) are all private.
 */
export const appDocumentsRouter = Router();

const DOCUMENTS = 'studio_documents';
const CARD_FIELDS =
  'id, workspace_id, owner_id, document_type, metadata, slug, title, subtitle, label, area, tags, summary, focus, thumbnail_path, thumbnail_alt, thumbnail_focus, cover_path, layout, project_type, role, team, timeline, platform, objective, challenge, template_id, template_version, setup_state, sections_total, sections_complete, content_schema_version, status, created_at, updated_at';
const LAYOUTS: CaseStudyLayout[] = ['wide', 'split', 'split-reverse'];
const text = (value: unknown, max: number) => String(value ?? '').trim().slice(0, max);
const noStore = (res: import('express').Response) => res.set('Cache-Control', 'private, no-store');

/** "case study", "guide": the document in a message. */
const nounOf = (row: {document_type?: unknown}) => documentNoun(row.document_type ?? DEFAULT_DOCUMENT_TYPE);
const NOT_FOUND = 'Document not found.';

type TemplateRef = Pick<StudioDocument, 'document_type' | 'template_id' | 'template_version'>;

/**
 * Block contract B2/B3: a document is stored only if every node and mark in it is one this API
 * knows (never a placeholder or a made-up type), and each block's attributes are cleaned. Cleaning
 * is kept for blocks whose contract enforces it; for the others it is only reported, by node type,
 * path and rule (never any of the document's text).
 */
function cleanContent(content: unknown) {
  if (!content || typeof content !== 'object') return content;
  const report = cleanDocument(content as JSONContent, isEnforcedType);
  if (report.unknown.length) {
    throw new HttpError(422, `This document contains blocks this version of Case Study Studio doesn’t know (${report.unknown.slice(0, 5).join(', ')}). Reload the page to get the latest version, then make your change again. Nothing was saved.`);
  }
  const reported = report.issues.filter(issue => !issue.enforced);
  if (reported.length) console.warn('[documents] cleaning would change', reported.length, 'value(s):', reported.slice(0, 10).map(issue => `${issue.type} ${issue.path}: ${issue.rule}`).join('; '));
  return report.doc;
}

/** The draft as stored, from whatever the editor sent (validated against the user's own files). */
function toRow(draft: Partial<StudioDocumentDraft>, ownerId: string, workspaceId: string, current: TemplateRef) {
  const slug = slugify(text(draft.slug, 200) || text(draft.title, 300));
  if (!slug) throw new HttpError(400, 'Enter a headline or a short name.');
  const row = {
    slug,
    title: text(draft.title, 300) || untitledTitle(current.document_type),
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
    content: draft.content && typeof draft.content === 'object' ? cleanContent(normaliseSections(draft.content)) : draft.content,
    content_schema_version: CONTENT_SCHEMA_VERSION,
    // The template's own details, only when the editor sent them (an older editor tab never wipes them).
    ...(draft.metadata === undefined ? {} : {metadata: cleanMetadata(getTemplate(current.template_id, current.template_version), draft.metadata)}),
  };
  const problems = studioDraftProblems(row as StudioDocumentDraft, ownerId, workspaceId);
  if (problems.length) throw new HttpError(422, problems.join(' '));
  return row;
}

/**
 * A document in the current content schema. An older document is migrated explicitly: the
 * original is copied to studio_content_backups first, then the migrated version is saved (only if
 * nobody saved in between). Never done silently in the browser.
 */
async function currentDocument(id: string, ownerId: string): Promise<StudioDocument> {
  const study = await ownDocument(id, ownerId);
  if (study.content_schema_version >= CONTENT_SCHEMA_VERSION || study.setup_state) return study;
  const {content, version} = migrateContent(study.content, study.content_schema_version);
  const backup = await supabase.from('studio_content_backups').insert({
    document_id: study.id,
    owner_id: ownerId,
    from_version: study.content_schema_version,
    to_version: version,
    content: study.content,
  });
  if (backup.error) throw new HttpError(502, backup.error.message);
  const {data, error} = await supabase
    .from(DOCUMENTS)
    .update({content, content_schema_version: version})
    .eq('id', study.id)
    .eq('owner_id', ownerId)
    .eq('updated_at', study.updated_at)
    .select('*')
    .maybeSingle();
  if (error) throw new HttpError(502, error.message);
  // Saved elsewhere in the meantime: read whatever is there now (it was saved in the new schema).
  return (data as unknown as StudioDocument | null) ?? ownDocument(id, ownerId);
}

async function ownDocument(id: string, ownerId: string, fields = '*') {
  const {data, error} = await supabase.from(DOCUMENTS).select(fields).eq('id', id).eq('owner_id', ownerId).maybeSingle();
  if (error) throw new HttpError(502, error.message);
  if (!data) throw new HttpError(404, NOT_FOUND);
  return data as unknown as StudioDocument;
}

/**
 * The user's documents, newest edit first.
 *   ?status=draft|in_progress|ready_for_review|archived, or `active` for everything not archived
 *   ?type=<document type>
 */
appDocumentsRouter.get(
  '/',
  handle(async (req, res) => {
    let query = supabase.from(DOCUMENTS).select(CARD_FIELDS).eq('owner_id', req.user!.id).order('updated_at', {ascending: false}).limit(500);
    const status = String(req.query.status ?? '');
    if (status === 'active') {
      query = query.neq('status', 'archived');
    } else if (status) {
      if (!isStudioStatus(status)) throw new HttpError(400, 'Unknown status.');
      query = query.eq('status', status);
    }
    const type = String(req.query.type ?? '');
    if (type) {
      if (!isDocumentType(type)) throw new HttpError(400, 'Unknown document type.');
      query = query.eq('document_type', type);
    }
    const {data, error} = await query;
    if (error) throw new HttpError(502, error.message);
    noStore(res);
    res.json({documents: (data ?? []) as unknown as StudioDocumentCard[]});
  }),
);

/**
 * The columns a setup fills, validated: the template must exist and fit the document type, the outline must fit it,
 * and the cover must be one of the user's own uploads. `finish` creates the document from the
 * outline; otherwise the setup is kept for later (`setup_state`) and the document stays empty.
 */
function setupRow(body: unknown, ownerId: string, workspaceId: string, finish: boolean) {
  const {setup, problems} = cleanSetup(body);
  if (problems.length) throw new HttpError(422, problems.join(' '));
  const template = getTemplate(setup.template_id, setup.template_version);
  const content = finish ? outlineDocument(setup.outline, template) : {type: 'doc', content: []};
  const pathProblems = studioDraftProblems({content, thumbnail_path: null, cover_path: setup.cover_path}, ownerId, workspaceId);
  if (pathProblems.length) throw new HttpError(422, pathProblems.join(' '));
  const state: Pick<StudioSetup, 'step' | 'start' | 'outline'> = {step: setup.step, start: setup.start, outline: setup.outline};
  return {
    document_type: setup.document_type,
    metadata: cleanMetadata(template, setup.metadata),
    title: setup.title || untitledTitle(setup.document_type),
    summary: setup.summary,
    project_type: setup.project_type,
    role: setup.role,
    team: setup.team,
    timeline: setup.timeline,
    platform: setup.platform,
    objective: setup.objective,
    challenge: setup.challenge,
    template_id: setup.template_id,
    template_version: setup.template_version,
    // The cover is also the card thumbnail until the user picks another one.
    cover_path: setup.cover_path,
    thumbnail_path: setup.cover_path,
    thumbnail_alt: setup.cover_path ? setup.cover_alt : '',
    content,
    setup_state: finish ? null : state,
  };
}

/** Inserts a new row with a unique slug (retries on the rare clash). */
async function insertDocument(ownerId: string, workspaceId: string, row: Record<string, unknown> & {title: string}) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const slug = `${slugify(row.title).slice(0, 60) || 'untitled'}-${crypto.randomUUID().slice(0, 6)}`;
    const {data, error} = await supabase
      .from(DOCUMENTS)
      .insert({...row, workspace_id: workspaceId, owner_id: ownerId, slug})
      .select('id')
      .single();
    if (!error) return data.id as string;
    if (error.code !== '23505') throw new HttpError(502, error.message);
  }
  throw new HttpError(409, 'We couldn’t create a unique short name. Try again.');
}

/** A document straight from a type's default template, with every section (no wizard). */
function quickRow(title: unknown, type: unknown) {
  const documentType: DocumentType = type === undefined ? DEFAULT_DOCUMENT_TYPE : (type as DocumentType);
  const template = isAvailableDocumentType(documentType) ? defaultTemplate(documentType) : undefined;
  if (!template) throw new HttpError(422, 'Choose a kind of document from the list.');
  return {
    document_type: documentType,
    title: text(title, 300) || untitledTitle(documentType),
    content: outlineDocument(outlineFor(template), template),
    template_id: template.id,
    template_version: template.version,
  };
}

/**
 * Starts a private draft. With `setup` (the wizard), from the user's answers and outline, or kept
 * unfinished when `finish` is false; without it, from the document type's default template.
 */
appDocumentsRouter.post(
  '/',
  handle(async (req, res) => {
    const workspace = await workspaceOf(req.user!.id);
    const body = (req.body ?? {}) as {title?: unknown; document_type?: unknown; setup?: unknown; finish?: unknown};
    const row = body.setup ? setupRow(body.setup, req.user!.id, workspace.id, body.finish !== false) : quickRow(body.title, body.document_type);
    (row as Record<string, unknown>).content_schema_version = CONTENT_SCHEMA_VERSION;
    const id = await insertDocument(req.user!.id, workspace.id, row);
    noStore(res);
    res.status(201).json({id});
  }),
);

/** Updates an unfinished setup, or finishes it (creates the document). Only while setup is unfinished. */
appDocumentsRouter.put(
  '/:id/setup',
  handle(async (req, res) => {
    const id = requireUuid(param(req, 'id'));
    const current = await ownDocument(id, req.user!.id, 'id, workspace_id, document_type, setup_state');
    const created = `This ${nounOf(current)} has already been created. Open it to keep writing.`;
    if (!current.setup_state) throw new HttpError(409, created);
    const body = (req.body ?? {}) as {setup?: unknown; finish?: unknown};
    const row = {...setupRow(body.setup, req.user!.id, current.workspace_id, body.finish !== false), content_schema_version: CONTENT_SCHEMA_VERSION};
    const {data, error} = await supabase
      .from(DOCUMENTS)
      .update(row)
      .eq('id', id)
      .eq('owner_id', req.user!.id)
      .not('setup_state', 'is', null)
      .select('id')
      .maybeSingle();
    if (error) throw new HttpError(502, error.message);
    if (!data) throw new HttpError(409, created);
    noStore(res);
    res.json({id});
  }),
);

/** Copies one of the user's own documents into a new private draft (same type and template). */
appDocumentsRouter.post(
  '/:id/duplicate',
  handle(async (req, res) => {
    const source = await currentDocument(requireUuid(param(req, 'id')), req.user!.id);
    if (source.setup_state) throw new HttpError(409, `Finish setting up this ${nounOf(source)} before copying it.`);
    const name = source.title.replace(/\*/g, '').trim() || untitledTitle(source.document_type);
    const title = text((req.body ?? {}).title, 300) || `Copy of ${name}`.slice(0, 300);
    const copy: Record<string, unknown> & {title: string} = {title};
    for (const field of ['document_type', 'metadata', 'subtitle', 'label', 'area', 'tags', 'summary', 'focus', 'thumbnail_path', 'thumbnail_alt', 'thumbnail_focus', 'cover_path', 'layout', 'project_type', 'role', 'team', 'timeline', 'platform', 'objective', 'challenge', 'template_id', 'template_version', 'content', 'content_schema_version'] as const) {
      copy[field] = source[field];
    }
    const id = await insertDocument(req.user!.id, source.workspace_id, copy);
    noStore(res);
    res.status(201).json({id});
  }),
);

appDocumentsRouter.get(
  '/:id',
  handle(async (req, res) => {
    const document = await currentDocument(requireUuid(param(req, 'id')), req.user!.id);
    noStore(res);
    res.json({document});
  }),
);

/**
 * Saves the draft (autosave). With `expected_updated_at`, the save only
 * applies if nobody saved in between (another tab or device): otherwise 409,
 * so one copy never silently overwrites the other.
 */
appDocumentsRouter.put(
  '/:id',
  handle(async (req, res) => {
    const id = requireUuid(param(req, 'id'));
    const current = await ownDocument(id, req.user!.id, 'id, workspace_id, document_type, template_id, template_version, updated_at, status, setup_state');
    if (current.setup_state) throw new HttpError(409, `Finish setting up this ${nounOf(current)} before writing in it.`);
    if (current.status === 'archived') throw new HttpError(409, `This ${nounOf(current)} is archived. Restore it to keep editing.`);
    const body = (req.body ?? {}) as Partial<StudioDocumentDraft> & {expected_updated_at?: string};
    const row = toRow(body, req.user!.id, current.workspace_id, current);

    // Version history: keep the state this save replaces, at most every 10 minutes.
    await snapshotIfDue(id, req.user!.id);
    let query = supabase.from(DOCUMENTS).update(row).eq('id', id).eq('owner_id', req.user!.id);
    if (body.expected_updated_at) query = query.eq('updated_at', body.expected_updated_at);
    const {data, error} = await query.select('updated_at, slug').maybeSingle();
    if (error) {
      if (error.code === '23505') throw new HttpError(409, 'Another of your documents already uses that short name. Choose a different one.');
      throw new HttpError(502, error.message);
    }
    if (!data) throw new HttpError(409, `This ${nounOf(current)} was changed in another tab or window. Reload the page to get the latest version, then make your change again.`, {code: 'conflict'});
    noStore(res);
    res.json({updatedAt: data.updated_at, slug: data.slug});
  }),
);

// ---- Version history (editor roadmap T7) -------------------------------------------------------
const AUTO_EVERY_MS = 10 * 60 * 1000;
const AUTO_KEEP = 50;
const NAMED_MAX = 100;
const REVISIONS = 'studio_document_revisions';
type RevisionKind = 'auto' | 'named' | 'before_restore';

/** Copies the document as it is now into its history. */
async function snapshot(id: string, ownerId: string, kind: RevisionKind, name: string | null = null) {
  const current = await ownDocument(id, ownerId, 'id, title, subtitle, content, content_schema_version');
  const {data, error} = await supabase
    .from(REVISIONS)
    .insert({document_id: id, owner_id: ownerId, kind, name, title: current.title ?? '', subtitle: current.subtitle ?? '', content: current.content, content_schema_version: current.content_schema_version})
    .select('id, kind, name, title, created_at')
    .single();
  if (error) throw new HttpError(502, error.message);
  if (kind === 'auto') {
    // Keep the newest automatic versions only; named ones stay until the owner deletes them.
    const {data: old} = await supabase.from(REVISIONS).select('id').eq('document_id', id).eq('owner_id', ownerId).eq('kind', 'auto').order('created_at', {ascending: false}).range(AUTO_KEEP, AUTO_KEEP + 100);
    if (old?.length) await supabase.from(REVISIONS).delete().eq('owner_id', ownerId).in('id', old.map(row => row.id));
  }
  return data;
}

/** An automatic version before a save, when the newest version is over 10 minutes old (or there's none). */
async function snapshotIfDue(id: string, ownerId: string) {
  const {data, error} = await supabase.from(REVISIONS).select('created_at').eq('document_id', id).eq('owner_id', ownerId).order('created_at', {ascending: false}).limit(1).maybeSingle();
  if (error) throw new HttpError(502, error.message);
  if (data && Date.now() - new Date(data.created_at).getTime() < AUTO_EVERY_MS) return;
  await snapshot(id, ownerId, 'auto');
}

/** The document's versions, newest first (no documents: open one to see it). */
appDocumentsRouter.get(
  '/:id/revisions',
  handle(async (req, res) => {
    const id = requireUuid(param(req, 'id'));
    await ownDocument(id, req.user!.id, 'id');
    const {data, error} = await supabase.from(REVISIONS).select('id, kind, name, title, created_at').eq('document_id', id).eq('owner_id', req.user!.id).order('created_at', {ascending: false}).limit(200);
    if (error) throw new HttpError(502, error.message);
    noStore(res);
    res.json({revisions: data ?? []});
  }),
);

/** One version with its document (migrated to the current schema for display; stored as it was). */
appDocumentsRouter.get(
  '/:id/revisions/:revisionId',
  handle(async (req, res) => {
    const id = requireUuid(param(req, 'id'));
    const revision = await ownRevision(id, requireUuid(param(req, 'revisionId')), req.user!.id);
    const content = revision.content_schema_version < CONTENT_SCHEMA_VERSION ? migrateContent(revision.content, revision.content_schema_version).content : revision.content;
    noStore(res);
    res.json({revision: {...revision, content, content_schema_version: CONTENT_SCHEMA_VERSION}});
  }),
);

/** Saves the document as it is now as a named version. */
appDocumentsRouter.post(
  '/:id/revisions',
  handle(async (req, res) => {
    const id = requireUuid(param(req, 'id'));
    const current = await ownDocument(id, req.user!.id, 'id, document_type, setup_state');
    if (current.setup_state) throw new HttpError(409, `Finish setting up this ${nounOf(current)} first.`);
    const name = text((req.body ?? {}).name, 100);
    if (!name) throw new HttpError(422, 'Enter a name for this version, for example: Sent to the hiring manager.');
    const {count} = await supabase.from(REVISIONS).select('id', {count: 'exact', head: true}).eq('document_id', id).eq('owner_id', req.user!.id).eq('kind', 'named');
    if ((count ?? 0) >= NAMED_MAX) throw new HttpError(409, `A document can keep up to ${NAMED_MAX} named versions. Delete one you no longer need, then try again.`);
    const revision = await snapshot(id, req.user!.id, 'named', name);
    noStore(res);
    res.status(201).json({revision});
  }),
);

/**
 * Restores a version: the document as it is now is kept first (kind before_restore), so a restore
 * can be undone from the same list. Only the document, title and subtitle change.
 */
appDocumentsRouter.post(
  '/:id/revisions/:revisionId/restore',
  handle(async (req, res) => {
    const id = requireUuid(param(req, 'id'));
    const ownerId = req.user!.id;
    const revision = await ownRevision(id, requireUuid(param(req, 'revisionId')), ownerId);
    const current = await ownDocument(id, ownerId, 'id, workspace_id, document_type, status, setup_state');
    if (current.setup_state) throw new HttpError(409, `Finish setting up this ${nounOf(current)} first.`);
    if (current.status === 'archived') throw new HttpError(409, `This ${nounOf(current)} is archived. Restore it from the archive before restoring a version.`);
    await snapshot(id, ownerId, 'before_restore');
    const migrated = revision.content_schema_version < CONTENT_SCHEMA_VERSION ? migrateContent(revision.content, revision.content_schema_version).content : revision.content;
    const content = cleanContent(normaliseSections(migrated)) as JSONContent;
    const problems = studioDraftProblems({content} as StudioDocumentDraft, ownerId, current.workspace_id);
    if (problems.length) throw new HttpError(422, problems.join(' '));
    const {data, error} = await supabase
      .from(DOCUMENTS)
      .update({content, content_schema_version: CONTENT_SCHEMA_VERSION, title: revision.title || untitledTitle(current.document_type), subtitle: revision.subtitle ?? ''})
      .eq('id', id)
      .eq('owner_id', ownerId)
      .select('updated_at')
      .single();
    if (error) throw new HttpError(502, error.message);
    noStore(res);
    res.json({updatedAt: data.updated_at});
  }),
);

/** Deletes a named version (automatic ones come and go by themselves). */
appDocumentsRouter.delete(
  '/:id/revisions/:revisionId',
  handle(async (req, res) => {
    const id = requireUuid(param(req, 'id'));
    const revisionId = requireUuid(param(req, 'revisionId'));
    const {data, error} = await supabase.from(REVISIONS).delete().eq('id', revisionId).eq('document_id', id).eq('owner_id', req.user!.id).select('id').maybeSingle();
    if (error) throw new HttpError(502, error.message);
    if (!data) throw new HttpError(404, 'Version not found.');
    noStore(res);
    res.json({ok: true});
  }),
);

async function ownRevision(id: string, revisionId: string, ownerId: string) {
  const {data, error} = await supabase.from(REVISIONS).select('id, kind, name, title, subtitle, content, content_schema_version, created_at').eq('id', revisionId).eq('document_id', id).eq('owner_id', ownerId).maybeSingle();
  if (error) throw new HttpError(502, error.message);
  if (!data) throw new HttpError(404, 'Version not found.');
  return data as {id: string; kind: RevisionKind; name: string | null; title: string; subtitle: string; content: object; content_schema_version: number; created_at: string};
}

/** Private section notes: never part of the document, its preview or exports. */
appDocumentsRouter.get(
  '/:id/notes',
  handle(async (req, res) => {
    const id = requireUuid(param(req, 'id'));
    await ownDocument(id, req.user!.id, 'id');
    const {data, error} = await supabase.from('studio_section_notes').select('section_id, body, updated_at').eq('document_id', id).eq('owner_id', req.user!.id);
    if (error) throw new HttpError(502, error.message);
    noStore(res);
    res.json({notes: data ?? []});
  }),
);

/** Saves (or, when empty, deletes) the note for one section. */
appDocumentsRouter.put(
  '/:id/notes/:sectionId',
  handle(async (req, res) => {
    const id = requireUuid(param(req, 'id'));
    const sectionId = param(req, 'sectionId');
    if (!isSectionId(sectionId)) throw new HttpError(400, 'Unknown section.');
    await ownDocument(id, req.user!.id, 'id');
    const body = String((req.body ?? {}).body ?? '').trim();
    if (body.length > 5000) throw new HttpError(422, 'A note can be up to 5,000 characters. Shorten it, then try again.');
    const notes = supabase.from('studio_section_notes');
    const {error} = body
      ? await notes.upsert({document_id: id, owner_id: req.user!.id, section_id: sectionId, body}, {onConflict: 'document_id,section_id'})
      : await notes.delete().eq('document_id', id).eq('owner_id', req.user!.id).eq('section_id', sectionId);
    if (error) throw new HttpError(502, error.message);
    noStore(res);
    res.json({ok: true});
  }),
);

/**
 * Moves a document to another private status, if that move is allowed (shared `canChangeStatus`):
 * the three working states in any order, anything to archived, archived only back to draft.
 * The update is conditional on the status it was checked against.
 */
async function setStatus(id: string, ownerId: string, status: StudioStatus) {
  const current = await ownDocument(id, ownerId, 'id, document_type, status, setup_state');
  if (current.status === status) return {updated_at: (await ownDocument(id, ownerId, 'updated_at')).updated_at, status};
  if (current.setup_state && status !== 'archived' && status !== 'draft') throw new HttpError(409, `Finish setting up this ${nounOf(current)} first.`);
  if (!canChangeStatus(current.status, status)) {
    throw new HttpError(409, current.status === 'archived' ? `This ${nounOf(current)} is archived. Restore it first.` : 'That change of status isn’t possible.');
  }
  const {data, error} = await supabase
    .from(DOCUMENTS)
    .update({status})
    .eq('id', id)
    .eq('owner_id', ownerId)
    .eq('status', current.status)
    .select('updated_at, status')
    .maybeSingle();
  if (error) throw new HttpError(502, error.message);
  if (!data) throw new HttpError(409, 'The status was changed in another tab or window. Reload the page, then try again.');
  return data as {updated_at: string; status: StudioStatus};
}

/** Sets the working status: draft, in progress or ready for review (archiving has its own routes). */
appDocumentsRouter.post(
  '/:id/status',
  handle(async (req, res) => {
    const status = (req.body ?? {}).status;
    if (!isStudioStatus(status) || status === 'archived') throw new HttpError(422, 'Choose draft, in progress or ready for review.');
    const data = await setStatus(requireUuid(param(req, 'id')), req.user!.id, status);
    noStore(res);
    res.json({updatedAt: data.updated_at, status: data.status});
  }),
);

/** Archive: out of the way, read-only, still private and restorable. Not "unpublish". */
appDocumentsRouter.post(
  '/:id/archive',
  handle(async (req, res) => {
    const data = await setStatus(requireUuid(param(req, 'id')), req.user!.id, 'archived');
    noStore(res);
    res.json({updatedAt: data.updated_at, status: data.status});
  }),
);

appDocumentsRouter.post(
  '/:id/restore',
  handle(async (req, res) => {
    const data = await setStatus(requireUuid(param(req, 'id')), req.user!.id, 'draft');
    noStore(res);
    res.json({updatedAt: data.updated_at, status: data.status});
  }),
);

/**
 * Template upgrade: explicit, never automatic. Moves the document to the newest released version of
 * its OWN template, and only when the caller names that version (so what was previewed is what is
 * applied). Only the reference changes: the content is not read or written, so nothing the user
 * wrote can be lost; sections the new version adds are offered by the guide, not inserted.
 */
appDocumentsRouter.post(
  '/:id/template',
  handle(async (req, res) => {
    const id = requireUuid(param(req, 'id'));
    const current = await ownDocument(id, req.user!.id, 'id, document_type, template_id, template_version, status, setup_state');
    if (current.setup_state) throw new HttpError(409, `Finish setting up this ${nounOf(current)} first.`);
    if (current.status === 'archived') throw new HttpError(409, `This ${nounOf(current)} is archived. Restore it first.`);
    const newer = newerTemplate(getTemplate(current.template_id, current.template_version));
    if (!newer) throw new HttpError(409, `This ${nounOf(current)} already uses the newest version of its template.`);
    if (Number((req.body ?? {}).version) !== newer.version) throw new HttpError(422, 'That template version isn’t available. Reload the page to see the current one.');
    const {data, error} = await supabase
      .from(DOCUMENTS)
      .update({template_version: newer.version})
      .eq('id', id)
      .eq('owner_id', req.user!.id)
      .eq('template_id', newer.id)
      .eq('template_version', current.template_version)
      .select('updated_at, template_id, template_version')
      .maybeSingle();
    if (error) throw new HttpError(502, error.message);
    if (!data) throw new HttpError(409, 'The template was changed in another tab or window. Reload the page, then try again.');
    noStore(res);
    res.json({updatedAt: data.updated_at, template_id: data.template_id, template_version: data.template_version});
  }),
);

/** Deletes a document for good. Its uploads stay in the media library (detached). */
appDocumentsRouter.delete(
  '/:id',
  handle(async (req, res) => {
    const id = requireUuid(param(req, 'id'));
    const {data, error} = await supabase.from(DOCUMENTS).delete().eq('id', id).eq('owner_id', req.user!.id).select('id').maybeSingle();
    if (error) throw new HttpError(502, error.message);
    if (!data) throw new HttpError(404, NOT_FOUND);
    res.json({ok: true});
  }),
);
