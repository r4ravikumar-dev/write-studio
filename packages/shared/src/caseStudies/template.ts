import type {JSONContent} from './json';
import {newSectionId} from './sections';
import {DEFAULT_FRAMEWORK, type FrameworkSection} from '../frameworks';
import {frameworkSection} from '../templates';

/**
 * The default storytelling framework's sections (Product and UX design, v1; see
 * ../frameworks). Every section is stored as a heading and an empty paragraph. The hint is never
 * stored in the document: the editor shows it as a placeholder in the empty paragraph under its
 * heading (see sectionOf) and it disappears as soon as you type.
 */
export const caseStudySections: readonly FrameworkSection[] = DEFAULT_FRAMEWORK.sections;

export type CaseStudySection = FrameworkSection;

/**
 * One framework section as stored: an EMPTY heading tagged with its section key, then an empty
 * paragraph. Nothing to delete: the editor shows the title (heading style) and the hint (body
 * style) as placeholders, and whatever the user types takes those styles.
 */
export function caseStudySectionNodes(section: CaseStudySection): JSONContent[] {
  return [{type: 'heading', attrs: {level: 2, section: section.key, sectionId: newSectionId(), sectionStatus: null}}, {type: 'paragraph'}];
}

/** A new case study's body: every framework section, empty, ready to write in. */
export function caseStudyTemplate(): JSONContent {
  return {type: 'doc', content: caseStudySections.flatMap(caseStudySectionNodes)};
}

const BY_TITLE = new Map<string, CaseStudySection>(
  caseStudySections.map(section => [section.title.toLowerCase(), section]),
);

/** The framework section a heading belongs to: by its section key, else by its text (older drafts). */
export function sectionOf(heading: {attrs?: Record<string, unknown> | null; textContent?: string}): CaseStudySection | undefined {
  const key = heading.attrs?.section;
  const tagged = frameworkSection(key);
  if (tagged) return tagged;
  return heading.textContent ? BY_TITLE.get(heading.textContent.trim().toLowerCase()) : undefined;
}

/** The placeholder hint for a section heading's text, if it is one of the framework's sections. */
export function sectionHint(headingText: string): string | undefined {
  return BY_TITLE.get(headingText.trim().toLowerCase())?.hint;
}

/**
 * Drafts created before titles and hints became placeholders hold them as real text. A section
 * that is still completely untouched (heading = the framework title AND the next paragraph = its
 * hint) becomes an empty, tagged heading and an empty paragraph, so the editor shows both as
 * placeholders. Anything the user changed is left alone. Pure: returns a new document.
 */
export function clearUntouchedHints(doc: JSONContent): JSONContent {
  const nodes = doc.content;
  if (!nodes) return doc;
  const textOf = (node: JSONContent): string => node.text ?? (node.content ?? []).map(textOf).join('');
  let changed = false;
  const content: JSONContent[] = [];
  for (let i = 0; i < nodes.length; i += 1) {
    const node = nodes[i];
    const next = nodes[i + 1];
    const section = node.type === 'heading' ? BY_TITLE.get(textOf(node).trim().toLowerCase()) : undefined;
    if (section && next?.type === 'paragraph' && textOf(next).trim() === section.hint) {
      content.push({type: 'heading', attrs: {...node.attrs, section: section.key}}, {type: 'paragraph'});
      i += 1;
      changed = true;
    } else {
      content.push(node);
    }
  }
  return changed ? {...doc, content} : doc;
}
