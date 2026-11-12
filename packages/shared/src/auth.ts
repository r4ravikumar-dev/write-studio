/**
 * The JWTs the Django auth service issues and Express / Next.js verify
 * (HS256, shared JWT_SECRET). Keep these in step with
 * backend/django/accounts/tokens.py.
 */
export const JWT_ISSUER = 'studio-auth';
export const JWT_AUDIENCE = 'studio';

/** Every account has the same single role: there is no owner or admin. */
export type Role = 'user';

export type AccessClaims = {
  /** The account's UUID; also the owner_id of its Studio rows. */
  sub: string;
  email: string;
  role: Role;
  type: 'access';
  sv: number;
  jti: string;
  iat: number;
  exp: number;
};

/**
 * The Studio session: two httpOnly cookies scoped to /studio, so page
 * scripts can't read the tokens and no other path ever receives them.
 */
export const STUDIO_SESSION = {path: '/studio', access: 'studio_access', refresh: 'studio_refresh'} as const;

/** A Studio workspace (public.studio_workspaces). */
export type StudioWorkspace = {
  id: string;
  owner_id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

/** The private Studio bucket (supabase/migrations/0008), the only bucket. */
export const STUDIO_BUCKET = 'studio-private-media';

/** A Studio upload (public.studio_assets). `path` is a storage path, never a URL. */
export type StudioAsset = {
  id: string;
  workspace_id: string;
  owner_id: string;
  /** The document it was uploaded for (null: straight into the library). */
  document_id: string | null;
  path: string;
  kind: 'image' | 'video' | 'file';
  mime: string;
  size: number;
  width: number | null;
  height: number | null;
  alt: string;
  original_name: string;
  created_at: string;
};

/** What Studio uploads may be, by MIME type, with the extension each is stored under. */
export const STUDIO_UPLOAD_TYPES: Record<string, {kind: StudioAsset['kind']; ext: string}> = {
  'image/png': {kind: 'image', ext: 'png'},
  'image/jpeg': {kind: 'image', ext: 'jpg'},
  'image/webp': {kind: 'image', ext: 'webp'},
  'image/gif': {kind: 'image', ext: 'gif'},
  'image/avif': {kind: 'image', ext: 'avif'},
  'video/mp4': {kind: 'video', ext: 'mp4'},
  'video/webm': {kind: 'video', ext: 'webm'},
  'video/quicktime': {kind: 'video', ext: 'mov'},
  'application/pdf': {kind: 'file', ext: 'pdf'},
  'application/vnd.ms-powerpoint': {kind: 'file', ext: 'ppt'},
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': {kind: 'file', ext: 'pptx'},
  'application/msword': {kind: 'file', ext: 'doc'},
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {kind: 'file', ext: 'docx'},
};
export const STUDIO_MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

/** A Studio storage path: {owner}/{workspace}/{case-study-id|library}/{uuid}.{ext}. */
export const STUDIO_PATH = /^[0-9a-f-]{36}\/[0-9a-f-]{36}\/([0-9a-f-]{36}|library)\/[0-9a-f-]{36}\.[a-z0-9]{1,8}$/;

/** Where the browser loads a private Studio file from (same origin, session-checked). */
export const studioMediaUrl = (path: string | null | undefined) =>
  path && STUDIO_PATH.test(path) ? `/studio/files/${path}` : '';
