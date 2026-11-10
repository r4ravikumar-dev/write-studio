import type {JSONContent} from './json';

/**
 * The case-study storytelling framework. Every new case study starts with
 * these sections, each a heading and a one-line hint to write over. They're
 * ordinary content: rename, reorder, remove or add sections freely, and give
 * each project its own visual treatment with images, video, files and Figma.
 */
export const caseStudySections = [
  {title: 'Opening', hint: 'The project title and one strong visual.'},
  {title: 'Overview', hint: 'What the project is about, in a few sentences.'},
  {title: 'The context', hint: 'What was happening: the product, the people, the moment.'},
  {title: 'The challenge', hint: 'What needed to be improved, and why it mattered.'},
  {title: 'My contribution', hint: 'Your responsibilities, and who you worked with.'},
  {title: 'Exploration', hint: 'Flows, iterations and the alternatives you tried.'},
  {title: 'Key decisions', hint: 'Why particular solutions were chosen over others.'},
  {title: 'The experience', hint: 'The final product: screens and interactions.'},
  {title: 'Outcome', hint: 'Verified results, or the design improvements it made.'},
  {title: 'Reflection', hint: 'What you learned, and what you’d do differently.'},
] as const;

/** A new case study's body: the sections above as headings with hints. */
export function caseStudyTemplate(): JSONContent {
  return {
    type: 'doc',
    content: caseStudySections.flatMap(section => [
      {type: 'heading', attrs: {level: 2}, content: [{type: 'text', text: section.title}]},
      {
        type: 'paragraph',
        content: [{type: 'text', marks: [{type: 'italic'}], text: section.hint}],
      },
    ]),
  };
}
