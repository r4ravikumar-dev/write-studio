import type {JSONContent} from './json';

/**
 * The case-study storytelling framework. Every new case study starts with
 * these sections: a heading and an empty paragraph. The hint is never stored
 * in the document: the editor shows it as a placeholder in the empty
 * paragraph under its heading (see sectionHint) and it disappears as soon as
 * you type. Rename, reorder, remove or add sections freely.
 */
export const caseStudySections = [
  {key: 'opening', title: 'Opening', hint: 'The project title and one strong visual.'},
  {key: 'overview', title: 'Overview', hint: 'What the project is about, in a few sentences.'},
  {key: 'context', title: 'The context', hint: 'What was happening: the product, the people, the moment.'},
  {key: 'challenge', title: 'The challenge', hint: 'What needed to be improved, and why it mattered.'},
  {key: 'contribution', title: 'My contribution', hint: 'Your responsibilities, and who you worked with.'},
  {key: 'exploration', title: 'Exploration', hint: 'Flows, iterations and the alternatives you tried.'},
  {key: 'decisions', title: 'Key decisions', hint: 'Why particular solutions were chosen over others.'},
  {key: 'experience', title: 'The experience', hint: 'The final product: screens and interactions.'},
  {key: 'outcome', title: 'Outcome', hint: 'Verified results, or the design improvements it made.'},
  {key: 'reflection', title: 'Reflection', hint: 'What you learned, and what you’d do differently.'},
] as const;

export type CaseStudySection = (typeof caseStudySections)[number];

/**
 * One framework section as stored: an EMPTY heading tagged with its section key, then an empty
 * paragraph. Nothing to delete: the editor shows the title (heading style) and the hint (body
 * style) as placeholders, and whatever the user types takes those styles.
 */
export function caseStudySectionNodes(section: CaseStudySection): JSONContent[] {
  return [{type: 'heading', attrs: {level: 2, section: section.key}}, {type: 'paragraph'}];
}

/** A new case study's body: every framework section, empty, ready to write in. */
export function caseStudyTemplate(): JSONContent {
  return {type: 'doc', content: caseStudySections.flatMap(caseStudySectionNodes)};
}

const BY_KEY = new Map<string, CaseStudySection>(caseStudySections.map(section => [section.key, section]));
const BY_TITLE = new Map<string, CaseStudySection>(
  caseStudySections.map(section => [section.title.toLowerCase(), section]),
);

/** The framework section a heading belongs to: by its section key, else by its text (older drafts). */
export function sectionOf(heading: {attrs?: Record<string, unknown> | null; textContent?: string}): CaseStudySection | undefined {
  const key = heading.attrs?.section;
  if (typeof key === 'string' && BY_KEY.has(key)) return BY_KEY.get(key);
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
