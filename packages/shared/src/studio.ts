import type {JSONContent} from './caseStudies/json';
import type {CaseStudyLayout} from './caseStudies/types';
import {STUDIO_PATH} from './auth';
import type {ProjectType} from './frameworks';
import type {StudioSetupState} from './caseStudies/setup';

/**
 * Studio case studies: private documents in a user's workspace
 * (public.studio_case_studies). Not the portfolio's CaseStudy: no published
 * snapshot, no Home/Work settings, no public slug route.
 */
export type StudioStatus = 'draft' | 'archived';

export type StudioCaseStudy = {
  id: string;
  workspace_id: string;
  owner_id: string;
  slug: string;
  title: string;
  subtitle: string;
  label: string;
  area: string;
  tags: string[];
  summary: string;
  focus: string;
  thumbnail_path: string | null;
  thumbnail_alt: string;
  thumbnail_focus: string;
  cover_path: string | null;
  layout: CaseStudyLayout;
  /** Project details from setup (all optional; editable in the settings panel). */
  project_type: ProjectType | null;
  role: string;
  team: string;
  timeline: string;
  platform: string;
  objective: string;
  challenge: string;
  /** The framework (and its immutable version) the case study was set up with. */
  framework_id: string | null;
  framework_version: number | null;
  /** Set while project setup is unfinished; null once the case study is created. */
  setup_state: StudioSetupState | null;
  content: JSONContent;
  content_schema_version: number;
  status: StudioStatus;
  created_at: string;
  updated_at: string;
};

/** A row for lists (no body), with section progress worked out by the database. */
export type StudioCaseStudyCard = Omit<StudioCaseStudy, 'content'> & {sections_total?: number | null; sections_complete?: number | null};

/** What the Studio editor saves. */
export type StudioCaseStudyDraft = Pick<
  StudioCaseStudy,
  | 'slug'
  | 'title'
  | 'subtitle'
  | 'label'
  | 'area'
  | 'tags'
  | 'summary'
  | 'focus'
  | 'thumbnail_path'
  | 'thumbnail_alt'
  | 'thumbnail_focus'
  | 'cover_path'
  | 'layout'
  | 'project_type'
  | 'role'
  | 'team'
  | 'timeline'
  | 'platform'
  | 'objective'
  | 'challenge'
  | 'content'
>;

/** Document bodies are capped (also enforced by the database). */
export const STUDIO_MAX_CONTENT_BYTES = 2 * 1024 * 1024;

/** Every media path a Tiptap document refers to (node attrs and visual-block configs). */
export function documentMediaPaths(doc: unknown): string[] {
  const paths: string[] = [];
  const visit = (value: unknown, key = '') => {
    if (Array.isArray(value)) return value.forEach(item => visit(item, key));
    if (!value || typeof value !== 'object') {
      if (typeof value === 'string' && (key === 'src' || key === 'path')) paths.push(value);
      return;
    }
    for (const [k, v] of Object.entries(value)) visit(v, k);
  };
  const walk = (node: JSONContent) => {
    const type = node.type ?? '';
    const attrs = node.attrs ?? {};
    // Embeds hold a pasted provider URL (rebuilt safely at render), not a file.
    if (type !== 'embed') {
      if (typeof attrs.src === 'string' && attrs.src) paths.push(attrs.src);
      if (attrs.config) visit(attrs.config);
    }
    node.content?.forEach(walk);
  };
  if (doc && typeof doc === 'object') walk(doc as JSONContent);
  return paths;
}

/**
 * Why a Studio draft can't be saved, if anything: every file it points at
 * (in the body, thumbnail and cover) must be one of the owner's own private
 * uploads, i.e. a Studio path inside `{ownerId}/{workspaceId}/`. That keeps a
 * Studio document from ever referencing a portfolio (public) file, another
 * user's file, an external URL or inline data (none of those match the
 * Studio path pattern).
 */
export function studioDraftProblems(
  draft: Pick<StudioCaseStudyDraft, 'content' | 'thumbnail_path' | 'cover_path'>,
  ownerId: string,
  workspaceId: string,
): string[] {
  const problems: string[] = [];
  const content = draft.content as JSONContent | undefined;
  if (!content || typeof content !== 'object' || content.type !== 'doc') return ['The document is missing.'];
  if (new TextEncoder().encode(JSON.stringify(content)).length > STUDIO_MAX_CONTENT_BYTES) {
    return ['This case study is too large to save. Its text and settings must be under 2 MB. Move some of it into another case study.'];
  }
  const prefix = `${ownerId}/${workspaceId}/`;
  const own = (path: string) => STUDIO_PATH.test(path) && path.startsWith(prefix);
  const foreign = documentMediaPaths(content).filter(path => !own(path));
  if (foreign.length) problems.push('A picture, video or file isn’t one of your uploads. Choose it from your media library.');
  for (const [label, path] of [['thumbnail', draft.thumbnail_path], ['cover', draft.cover_path]] as const) {
    if (path && !own(path)) problems.push(`The ${label} isn’t one of your uploads.`);
  }
  return problems;
}

/** The editor's settings: every draft field except the body. */
export type StudioMeta = Omit<StudioCaseStudyDraft, 'content'>;
