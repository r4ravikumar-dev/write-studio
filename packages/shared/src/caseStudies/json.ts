/**
 * A Tiptap (ProseMirror) JSON document, structurally the same as
 * `JSONContent` from @tiptap/core, declared here so the shared package (and
 * the Express API) don't depend on the editor.
 */
export type JSONContent = {
  type?: string;
  attrs?: Record<string, any>;
  content?: JSONContent[];
  marks?: {type: string; attrs?: Record<string, any>; [key: string]: any}[];
  text?: string;
  [key: string]: any;
};
