import type {JSONContent} from './json';
import {clearUntouchedHints} from './template';

/**
 * Story structure (Stage 2). A section is a TOP-LEVEL level-2 heading ("Heading 1" in the style
 * picker) and everything after it up to the next one. The heading carries the section's metadata:
 *
 *   section        framework section key (null for the user's own sections)
 *   sectionId      stable id, unique in the document (private notes are keyed by it)
 *   sectionStatus  null | 'review' | 'complete'  (set by the user; "empty" and "in progress" are
 *                  worked out from the content, never stored, so they can't go stale)
 *
 * The outline is always derived from the document; there is no second copy of the structure.
 * Guidance (purpose, questions, evidence) comes from the framework and is never stored here.
 */
export const CONTENT_SCHEMA_VERSION = 2;
export const SECTION_LEVEL = 2;

export type SectionStatus = 'review' | 'complete';
export type SectionState = 'empty' | 'in_progress' | SectionStatus;

export const SECTION_STATES: Record<SectionState, string> = {
  empty: 'Not started',
  in_progress: 'In progress',
  review: 'Ready for review',
  complete: 'Complete',
};

/** Whether a top-level node starts a section. */
export function isSectionHeading(node: {type?: string | {name: string}; attrs?: Record<string, unknown> | null}): boolean {
  const type = typeof node.type === 'string' ? node.type : node.type?.name;
  return type === 'heading' && node.attrs?.level === SECTION_LEVEL;
}

export function isSectionStatus(value: unknown): value is SectionStatus {
  return value === 'review' || value === 'complete';
}

/** A new section id: short, URL-safe, unique enough within one document. */
export function newSectionId(): string {
  const bytes = new Uint8Array(8);
  globalThis.crypto.getRandomValues(bytes);
  return `s${Array.from(bytes, byte => byte.toString(36).padStart(2, '0')).join('').slice(0, 12)}`;
}

const SECTION_ID = /^s[a-z0-9]{6,24}$/;
export const isSectionId = (value: unknown): value is string => typeof value === 'string' && SECTION_ID.test(value);

/** Whether a node holds anything: text, or any block other than an empty paragraph. */
export function hasContent(node: JSONContent): boolean {
  if (node.type === 'text') return Boolean(node.text?.trim());
  if (node.type === 'paragraph' || node.type === 'heading' || node.type === 'callout') return (node.content ?? []).some(hasContent);
  if (node.type === 'hardBreak') return false;
  return true;
}

/** The state shown for a section: the user's status, else worked out from its content. */
export function sectionState(status: unknown, body: JSONContent[]): SectionState {
  if (isSectionStatus(status)) return status;
  return body.some(hasContent) ? 'in_progress' : 'empty';
}

/**
 * Gives every section heading a valid, unique id, and removes section metadata from headings
 * that aren't sections (another level, or nested inside a block). Pure: returns the same object
 * when nothing needed changing.
 */
export function normaliseSections(doc: JSONContent): JSONContent {
  const nodes = doc.content;
  if (!nodes) return doc;
  const seen = new Set<string>();
  let changed = false;
  const strip = (node: JSONContent): JSONContent => {
    let next = node;
    if (node.type === 'heading' && node.attrs && ('sectionId' in node.attrs || 'sectionStatus' in node.attrs)) {
      const {sectionId: _id, sectionStatus: _status, ...rest} = node.attrs;
      void _id;
      void _status;
      next = {...node, attrs: rest};
      changed = true;
    }
    if (next.content) {
      const content = next.content.map(strip);
      if (content.some((child, index) => child !== next.content![index])) next = {...next, content};
    }
    return next;
  };
  const content = nodes.map(node => {
    if (!isSectionHeading(node)) return strip(node);
    const attrs = node.attrs ?? {};
    let id = attrs.sectionId;
    if (!isSectionId(id) || seen.has(id)) {
      id = newSectionId();
      changed = true;
    }
    seen.add(id as string);
    const status = isSectionStatus(attrs.sectionStatus) ? attrs.sectionStatus : null;
    if (status !== (attrs.sectionStatus ?? null)) changed = true;
    const inner = node.content?.map(strip);
    return {...node, attrs: {...attrs, sectionId: id, sectionStatus: status}, ...(inner ? {content: inner} : {})};
  });
  return changed ? {...doc, content} : doc;
}

/**
 * Brings a stored document up to the current schema, one version at a time. Each step is pure
 * and tested; the API backs up the original before saving the result (never silently on render).
 *
 *   1 → 2  untouched template hints become placeholders, and section headings get ids.
 */
export function migrateContent(doc: JSONContent, fromVersion: number): {content: JSONContent; version: number} {
  let content = doc;
  let version = fromVersion;
  if (version < 2) {
    content = normaliseSections(clearUntouchedHints(content));
    version = 2;
  }
  return {content, version};
}

/** One section of a stored document (for the outline, previews and counts). */
export type DocumentSection = {id: string; key: string | null; title: string; status: SectionStatus | null; state: SectionState; body: JSONContent[]};

/** The sections of a stored document, in order. Content before the first section isn't one. */
export function documentSections(doc: JSONContent): DocumentSection[] {
  const sections: DocumentSection[] = [];
  const textOf = (node: JSONContent): string => node.text ?? (node.content ?? []).map(textOf).join('');
  for (const node of doc.content ?? []) {
    if (isSectionHeading(node)) {
      const attrs = node.attrs ?? {};
      sections.push({
        id: String(attrs.sectionId ?? ''),
        key: typeof attrs.section === 'string' ? attrs.section : null,
        title: textOf(node).trim(),
        status: isSectionStatus(attrs.sectionStatus) ? attrs.sectionStatus : null,
        state: 'empty',
        body: [],
      });
    } else {
      sections.at(-1)?.body.push(node);
    }
  }
  for (const section of sections) section.state = sectionState(section.status, section.body);
  return sections;
}
