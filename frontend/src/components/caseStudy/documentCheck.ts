import {getSchema} from '@tiptap/core';
import {UNKNOWN_BLOCK, wrapUnknownBlocks, type JSONContent} from '@studio/shared';
import {caseStudyExtensions} from './schema';

/**
 * Can this version of the app read a stored document? (block contract B2.) Used by the editor page,
 * the preview and version history before anything is drawn:
 *
 *   - blocks it doesn't know are wrapped in a locked placeholder that keeps the original, so they
 *     are shown as such and saved back exactly as they were;
 *   - a document it still can't read is refused, so the editor never opens an empty page that an
 *     autosave would then write over the real one (Tiptap falls back to an empty document).
 */
const schema = getSchema(caseStudyExtensions);
const NODES = new Set(Object.keys(schema.nodes).filter(name => name !== UNKNOWN_BLOCK));
const MARKS = new Set(Object.keys(schema.marks));

export type DocumentCheck = {ok: true; content: JSONContent; wrapped: number} | {ok: false; reason: string};

export function checkDocument(content: unknown): DocumentCheck {
  if (!content || typeof content !== 'object' || (content as JSONContent).type !== 'doc') return {ok: false, reason: 'The document is missing or isn’t a document.'};
  const {doc, wrapped} = wrapUnknownBlocks(content as JSONContent, NODES, MARKS);
  try {
    schema.nodeFromJSON(doc);
  } catch (error) {
    // The reason names the problem (a node type, an attribute), never any of the document's text.
    return {ok: false, reason: error instanceof Error ? error.message.slice(0, 200) : 'It couldn’t be read.'};
  }
  return {ok: true, content: doc, wrapped};
}
