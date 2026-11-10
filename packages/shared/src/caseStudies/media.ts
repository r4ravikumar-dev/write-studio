/**
 * How a block points at an uploaded file: its private storage path plus what
 * the page needs to lay it out (never the file itself, never a URL or base64).
 * The file is a row of public.studio_assets in studio-private-media.
 */
export type MediaRef = {
  path: string;
  kind: 'image' | 'video';
  mime?: string;
  width?: number | null;
  height?: number | null;
  alt: string;
  caption?: string;
  /** CSS object-position kept in view when cropped. */
  focus?: string;
};
