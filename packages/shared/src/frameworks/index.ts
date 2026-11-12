import type {SuggestedBlock} from '../blocks/catalog';
import type {DocumentTemplate, MetadataField, TemplateSection, ValidationRule} from '../templates/types';

/**
 * The Design & Research template pack: the storytelling frameworks UX case studies are made with
 * (Write Studio 2.0 blueprint, "Framework system"). Frameworks were the first templates, and keep
 * their name here; the registry every lookup goes through is `../templates`.
 *
 * A framework is data: a narrative purpose and its sections. Each version is immutable. To
 * change one, add a new version and leave the old one in place, because existing case studies
 * keep the template id and version they were made with, and a template change must never
 * alter a document that already exists. Frameworks only suggest; users rename, reorder, add,
 * repeat and remove sections freely.
 */
export type Framework = DocumentTemplate;
export type FrameworkSection = TemplateSection;
/** Earlier name of a recommended block. */
export type SuggestedVisual = SuggestedBlock;

/** The story elements the UX review checklist looks for (a section's `covers`). */
export type StoryElement = 'context' | 'problem' | 'contribution' | 'decisions' | 'outcome';

export type FrameworkAct = 'scene' | 'problem' | 'work' | 'result';

export const FRAMEWORK_ACTS: Record<FrameworkAct, string> = {
  scene: 'Set the scene',
  problem: 'Frame the problem',
  work: 'Show the work',
  result: 'Share the result',
};

/** Project details every UX case study can carry. They have their own columns (migration 0010). */
const UX_METADATA: MetadataField[] = [
  {key: 'role', label: 'Your role', description: 'For example: Lead product designer', kind: 'text', max: 200, storage: 'column'},
  {key: 'team', label: 'Team', description: 'Who you worked with. For example: 2 designers, 4 engineers, a product manager', kind: 'text', max: 500, storage: 'column'},
  {key: 'timeline', label: 'Timeline', description: 'For example: March to June 2025', kind: 'text', max: 200, storage: 'column'},
  {key: 'platform', label: 'Platform', description: 'For example: iOS and Android app', kind: 'text', max: 200, storage: 'column'},
  {key: 'objective', label: 'Objective', description: 'What the project set out to achieve.', kind: 'longtext', max: 1000, storage: 'column'},
  {key: 'challenge', label: 'Main challenge', description: 'The biggest problem you had to solve.', kind: 'longtext', max: 1000, storage: 'column'},
];

/**
 * The story checklist. A line is done when a section that `covers` it (or one of the listed
 * Product and UX design sections, which predate `covers`) has content; Evidence, when the story
 * has a picture, figure or quote. Never a score, and never a claim that the writing is good.
 */
const UX_RULES: ValidationRule[] = [
  {key: 'context', label: 'Context', description: 'The product, the people and the situation.', check: 'section', sections: ['context', 'overview']},
  {key: 'problem', label: 'Problem', description: 'What needed solving, and why it mattered.', check: 'section', sections: ['challenge']},
  {key: 'contribution', label: 'Your contribution', description: 'What you did, and who you worked with.', check: 'section', sections: ['contribution']},
  {key: 'decisions', label: 'Decisions', description: 'The choices you made, and why.', check: 'section', sections: ['decisions']},
  {key: 'evidence', label: 'Evidence', description: 'Pictures, figures or quotes that back the story up.', check: 'evidence'},
  {key: 'outcome', label: 'Outcome', description: 'What changed, with real results.', check: 'section', sections: ['outcome']},
];

/** What every template in this pack shares. */
const UX_PACK = {
  documentType: 'ux_case_study',
  acts: FRAMEWORK_ACTS,
  metadataFields: UX_METADATA,
  recommendedBlocks: ['imageGrid', 'comparison', 'showcase', 'deviceMockup', 'splitLayout', 'pullQuote', 'callout', 'metrics', 'annotatedImage', 'screenSequence', 'flowDiagram'],
  validationRules: UX_RULES,
  exportProfiles: ['pdf', 'html_zip', 'markdown', 'json_backup'],
} satisfies Partial<DocumentTemplate>;

const productUxV1: Framework = {
  ...UX_PACK,
  id: 'product-ux',
  version: 1,
  name: 'Product and UX design',
  description:
    'A complete project story, from the context and the problem through your process and decisions to the outcome. Works for most product and UX projects.',
  purpose: 'Explains a design or product project through its context, the problem, your role, exploration, decisions, the experience and evidence-based outcomes.',
  audience: ['UX designers', 'UI designers', 'Product designers', 'Design students'],
  sections: [
    {
      key: 'opening',
      title: 'Opening',
      hint: 'The project title and one strong visual.',
      purpose: 'Grabs attention with the project and the final result.',
      act: 'scene',
      required: true,
      prompts: ['What is the one picture that sums up this project?', 'How would you describe the project in one sentence?'],
      suggestedEvidence: ['A hero screen of the final design'],
      suggestedBlocks: ['showcase', 'deviceMockup'],
    },
    {
      key: 'overview',
      title: 'Overview',
      hint: 'What the project is about, in a few sentences.',
      purpose: 'Gives a busy reader the whole story in under a minute.',
      act: 'scene',
      required: true,
      prompts: ['What did you make, and for whom?', 'What was your role?', 'What changed because of it?'],
      suggestedEvidence: ['Your role, the team, the timeline and the platform'],
      suggestedBlocks: ['metrics'],
    },
    {
      key: 'context',
      title: 'The context',
      hint: 'What was happening: the product, the people, the moment.',
      purpose: 'Explains the product, its users and the situation the work started from.',
      act: 'scene',
      required: true,
      prompts: ['What does the product do, and who uses it?', 'Why did this work start now?', 'What constraints did you have?'],
      suggestedEvidence: ['The product before your work', 'Who the users are'],
      suggestedBlocks: ['showcase', 'callout'],
    },
    {
      key: 'challenge',
      title: 'The challenge',
      hint: 'What needed to be improved, and why it mattered.',
      purpose: 'States the problem clearly so every decision later has a reason.',
      act: 'problem',
      required: true,
      prompts: ['What problem did users or the business have?', 'How did you know it was a problem?', 'What would success look like?'],
      suggestedEvidence: ['Research findings', 'Support tickets or analytics', 'Quotes from users'],
      suggestedBlocks: ['pullQuote', 'annotatedImage', 'metrics'],
    },
    {
      key: 'contribution',
      title: 'My contribution',
      hint: 'Your responsibilities, and who you worked with.',
      purpose: 'Makes your part of the work clear, separate from the team’s.',
      act: 'problem',
      required: true,
      prompts: ['What were you responsible for?', 'Who did you work with, and how?', 'What decisions were yours?'],
      suggestedEvidence: ['Your role and the team around you'],
      suggestedBlocks: ['callout'],
    },
    {
      key: 'exploration',
      title: 'Exploration',
      hint: 'Flows, iterations and the alternatives you tried.',
      purpose: 'Shows how you thought: the options you explored and what you learned.',
      act: 'work',
      required: false,
      prompts: ['What did you try first?', 'Which ideas did you drop, and why?', 'How did testing change the design?'],
      suggestedEvidence: ['Sketches and wireframes', 'User flows', 'Test results'],
      suggestedBlocks: ['flowDiagram', 'imageGrid', 'timeline'],
    },
    {
      key: 'decisions',
      title: 'Key decisions',
      hint: 'Why particular solutions were chosen over others.',
      purpose: 'Explains the reasoning behind the design, which is what readers remember.',
      act: 'work',
      required: true,
      prompts: ['What were the two or three most important decisions?', 'What were the trade-offs?', 'What evidence supported each one?'],
      suggestedEvidence: ['Before and after screens', 'Options you compared'],
      suggestedBlocks: ['comparison', 'splitLayout', 'annotatedImage'],
    },
    {
      key: 'experience',
      title: 'The experience',
      hint: 'The final product: screens and interactions.',
      purpose: 'Shows the finished design as people use it.',
      act: 'work',
      required: true,
      prompts: ['What does the key journey look like now?', 'Which details matter most?'],
      suggestedEvidence: ['Final screens', 'A prototype or video'],
      suggestedBlocks: ['screenSequence', 'deviceMockup', 'showcase'],
    },
    {
      key: 'outcome',
      title: 'Outcome',
      hint: 'Verified results, or the design improvements it made.',
      purpose: 'Shows what changed. Use real, verified results only.',
      act: 'result',
      required: true,
      prompts: ['What changed for users or the business?', 'How was it measured?', 'If there are no numbers yet, what improved in the design?'],
      suggestedEvidence: ['Measured results', 'Feedback from users or stakeholders'],
      suggestedBlocks: ['metrics', 'pullQuote'],
    },
    {
      key: 'reflection',
      title: 'Reflection',
      hint: 'What you learned, and what you’d do differently.',
      purpose: 'Ends with what you learned, which shows how you grow as a designer.',
      act: 'result',
      required: false,
      prompts: ['What would you do differently next time?', 'What did this project teach you?'],
      suggestedEvidence: [],
      suggestedBlocks: ['callout'],
    },
  ],
};

/**
 * Product and UX design v2 (T4, 2026-11-12): the same sections, words and prompts as v1, with
 * recommendations that include the content cards, Research insights and Chart (editor spec §8.4).
 */
const V2_VISUALS: Record<string, SuggestedBlock[]> = {
  opening: ['showcase', 'deviceMockup'],
  overview: ['showcase', 'metrics'],
  context: ['showcase', 'callout', 'researchInsights'],
  challenge: ['problemCallout', 'comparison', 'annotatedImage', 'metrics'],
  contribution: ['callout', 'timeline'],
  exploration: ['researchInsights', 'imageGrid', 'flowDiagram', 'timeline'],
  decisions: ['comparison', 'annotatedImage', 'splitLayout'],
  experience: ['deviceMockup', 'screenSequence', 'flowDiagram', 'showcase'],
  outcome: ['resultsHighlights', 'metrics', 'chart', 'pullQuote'],
  reflection: ['keyTakeaway', 'pullQuote'],
};
const productUxV2: Framework = {
  ...productUxV1,
  version: 2,
  sections: productUxV1.sections.map(section => ({...section, suggestedBlocks: V2_VISUALS[section.key] ?? section.suggestedBlocks})),
};


type SectionInput = Omit<FrameworkSection, 'required'> & {required?: boolean};
const sections = (items: SectionInput[]): FrameworkSection[] => items.map(item => ({required: true, ...item}));

/** UX research v1 (T7): a study, what it found, and what it changed. */
const uxResearchV1: Framework = {
  ...UX_PACK,
  recommendedBlocks: ['researchInsights', 'pullQuote', 'chart', 'metrics', 'timeline', 'callout', 'imageGrid', 'comparison'],
  purpose: 'Reports a study so a reader can trust it: the question, the method, who took part, the evidence for each finding and what it changed.',
  id: 'ux-research',
  version: 1,
  name: 'UX research',
  description: 'A study from the question to what it changed: how you researched, who took part, what you found and what happened next.',
  audience: ['UX researchers', 'UX designers', 'Product designers'],
  sections: sections([
    {key: 'research-opening', title: 'Opening', hint: 'The study in one sentence and one telling picture.', purpose: 'Says what the study was and why it’s worth reading.', act: 'scene', prompts: ['What did this research set out to learn?', 'What is the one finding a reader should remember?'], suggestedEvidence: ['A photo of a session, a synthesis wall or a key screen'], suggestedBlocks: ['showcase', 'keyTakeaway']},
    {key: 'research-context', title: 'Context and goals', hint: 'The product, the team and what they needed to know.', purpose: 'Explains why the research happened and what decision it served.', act: 'scene', covers: 'context', prompts: ['What decision was the team facing?', 'What did they already know, or assume?', 'What were the constraints: time, budget, access to users?'], suggestedEvidence: ['The research brief or plan', 'Existing data that raised the question'], suggestedBlocks: ['callout', 'showcase']},
    {key: 'research-question', title: 'Research questions', hint: 'What you needed to find out.', purpose: 'States the questions so every method and finding can be traced back to them.', act: 'problem', covers: 'problem', prompts: ['What were the main research questions?', 'Which assumptions were you testing?', 'What would a useful answer look like?'], suggestedEvidence: ['The questions, in priority order'], suggestedBlocks: ['problemCallout']},
    {key: 'research-methods', title: 'Methods', hint: 'How you researched, and why those methods.', purpose: 'Shows your judgement in choosing methods that fit the questions.', act: 'work', covers: 'decisions', prompts: ['Which methods did you use, and why these?', 'What did you decide not to do?', 'How did you avoid bias?'], suggestedEvidence: ['Discussion guide or test script', 'The research timeline'], suggestedBlocks: ['timeline', 'flowDiagram']},
    {key: 'research-participants', title: 'Participants', hint: 'Who took part and how you found them.', purpose: 'Shows the findings rest on the right people.', act: 'work', prompts: ['Who did you speak to or test with, and how many?', 'How did you recruit them?', 'Who was missing, and does it matter?'], suggestedEvidence: ['Number and kinds of participants', 'Screening criteria'], suggestedBlocks: ['metrics', 'chart']},
    {key: 'research-role', title: 'My role', hint: 'What you did, and who you worked with.', purpose: 'Makes your part in the study clear.', act: 'work', covers: 'contribution', prompts: ['What did you plan, run and analyse yourself?', 'Who else was involved?', 'How did you bring the team along?'], suggestedEvidence: ['Your responsibilities', 'Workshops you ran'], suggestedBlocks: ['callout']},
    {key: 'research-findings', title: 'Findings', hint: 'What you learned, with the evidence for each finding.', purpose: 'The heart of the study: what’s true, and how you know.', act: 'result', prompts: ['What were the most important findings?', 'What evidence supports each one?', 'What surprised you?'], suggestedEvidence: ['Quotes', 'Numbers from surveys or tests', 'Observations'], suggestedBlocks: ['researchInsights', 'pullQuote', 'chart']},
    {key: 'research-recommendations', title: 'Recommendations', hint: 'What you suggested the team do next.', purpose: 'Turns findings into decisions.', act: 'result', prompts: ['What did you recommend, and which finding does each come from?', 'How did you prioritise them?'], suggestedEvidence: ['The recommendations, prioritised'], suggestedBlocks: ['callout', 'comparison']},
    {key: 'research-impact', title: 'Impact', hint: 'What changed because of the research.', purpose: 'Shows the research mattered.', act: 'result', covers: 'outcome', prompts: ['What did the team decide or build because of it?', 'What changed for users or the business?', 'What did you measure afterwards?'], suggestedEvidence: ['Decisions made', 'Before and after figures'], suggestedBlocks: ['resultsHighlights', 'metrics', 'chart']},
    {key: 'research-reflection', title: 'Reflection', hint: 'What you learned, and what you’d do differently.', purpose: 'Shows how you grow as a researcher.', act: 'result', required: false, prompts: ['What would you change about the study?', 'What did it teach you?'], suggestedEvidence: [], suggestedBlocks: ['keyTakeaway', 'pullQuote']},
  ]),
};

/** Product redesign v1 (T7): improving something that exists, from the old version to the new. */
const redesignV1: Framework = {
  ...UX_PACK,
  recommendedBlocks: ['comparison', 'annotatedImage', 'metrics', 'chart', 'deviceMockup', 'screenSequence', 'imageGrid', 'pullQuote'],
  purpose: 'Shows an improvement to something that exists: the starting point, what was wrong, each change with its reason, and what improved.',
  id: 'redesign',
  version: 1,
  name: 'Product redesign',
  description: 'Improving something that already exists: what was wrong with it, how you found out, what you changed and what improved.',
  audience: ['UX designers', 'Product designers'],
  sections: sections([
    {key: 'redesign-opening', title: 'Opening', hint: 'The redesign at a glance: before and after.', purpose: 'Shows the change in one look.', act: 'scene', prompts: ['What is the clearest before-and-after picture?', 'How would you describe the redesign in one sentence?'], suggestedEvidence: ['The old and new design side by side'], suggestedBlocks: ['comparison', 'showcase']},
    {key: 'redesign-before', title: 'The product before', hint: 'What existed, who used it and how it performed.', purpose: 'Sets the starting point every improvement is measured against.', act: 'scene', covers: 'context', prompts: ['What did the product do, and for whom?', 'How was it performing?', 'Why redesign it now?'], suggestedEvidence: ['Screens of the old version', 'Baseline figures'], suggestedBlocks: ['annotatedImage', 'metrics']},
    {key: 'redesign-problems', title: 'What wasn’t working', hint: 'The problems, and how you know they were problems.', purpose: 'Gives every change a reason.', act: 'problem', covers: 'problem', prompts: ['What went wrong for users?', 'What did data, research or support tickets show?', 'Which problems mattered most?'], suggestedEvidence: ['Analytics', 'Usability test results', 'Quotes'], suggestedBlocks: ['problemCallout', 'annotatedImage', 'researchInsights']},
    {key: 'redesign-goals', title: 'Goals', hint: 'What the redesign had to achieve, and what had to stay.', purpose: 'Defines success and the constraints.', act: 'problem', prompts: ['What did success look like, in numbers if possible?', 'What couldn’t change (brand, tech, habits)?'], suggestedEvidence: ['Goals and how they were measured'], suggestedBlocks: ['metrics', 'callout']},
    {key: 'redesign-role', title: 'My role', hint: 'What you did, and who you worked with.', purpose: 'Makes your part clear.', act: 'work', covers: 'contribution', prompts: ['What were you responsible for?', 'Who did you work with?'], suggestedEvidence: ['Your role, the team and the timeline'], suggestedBlocks: ['callout', 'timeline']},
    {key: 'redesign-process', title: 'Process', hint: 'How you explored and tested the new design.', purpose: 'Shows how you got from problems to a solution.', act: 'work', prompts: ['What did you try, and what did you learn from it?', 'How did you test with users?'], suggestedEvidence: ['Sketches, wireframes, prototypes', 'Test findings'], suggestedBlocks: ['imageGrid', 'flowDiagram', 'timeline']},
    {key: 'redesign-decisions', title: 'Key changes', hint: 'What you changed, and why.', purpose: 'Explains the reasoning behind each important change.', act: 'work', covers: 'decisions', prompts: ['What were the most important changes?', 'What alternatives did you reject, and why?', 'Which trade-offs did you accept?'], suggestedEvidence: ['Before and after of each change'], suggestedBlocks: ['comparison', 'annotatedImage', 'splitLayout']},
    {key: 'redesign-after', title: 'The new design', hint: 'The redesigned experience, end to end.', purpose: 'Shows the finished work.', act: 'result', prompts: ['How does the new experience work?', 'What are the details you’re proud of?'], suggestedEvidence: ['Final screens', 'A prototype or video'], suggestedBlocks: ['deviceMockup', 'screenSequence', 'showcase']},
    {key: 'redesign-results', title: 'Results', hint: 'What improved, compared with before.', purpose: 'Proves the redesign worked.', act: 'result', covers: 'outcome', prompts: ['What changed in the numbers you set as goals?', 'What did users say?'], suggestedEvidence: ['Before and after figures', 'User quotes'], suggestedBlocks: ['resultsHighlights', 'chart', 'pullQuote']},
    {key: 'redesign-reflection', title: 'Reflection', hint: 'What you learned, and what you’d do differently.', purpose: 'Shows how you grow.', act: 'result', required: false, prompts: ['What would you do differently?', 'What’s next for the product?'], suggestedEvidence: [], suggestedBlocks: ['keyTakeaway', 'pullQuote']},
  ]),
};

/** Feature development v1 (T7): one feature, from the idea to the launch. */
const featureV1: Framework = {
  ...UX_PACK,
  recommendedBlocks: ['screenSequence', 'flowDiagram', 'annotatedImage', 'comparison', 'deviceMockup', 'metrics', 'timeline', 'pullQuote'],
  purpose: 'Tells the story of one feature you designed: the need, the constraints, the decisions, how it shipped and how it performed.',
  id: 'feature',
  version: 1,
  name: 'Feature development',
  description: 'One feature from the idea to the launch: the need, the constraints, the design, how it was built and how it did.',
  audience: ['Product designers', 'UX designers'],
  sections: sections([
    {key: 'feature-opening', title: 'Opening', hint: 'The feature in one sentence and one picture.', purpose: 'Shows what the feature is at a glance.', act: 'scene', prompts: ['What does the feature let people do?', 'What is the best picture of it?'], suggestedEvidence: ['The feature in use'], suggestedBlocks: ['showcase', 'deviceMockup']},
    {key: 'feature-need', title: 'The need', hint: 'Who needed this, and why.', purpose: 'Explains where the feature came from.', act: 'scene', covers: 'context', prompts: ['Who asked for it, or who needed it?', 'What were they doing instead?', 'Why was it a priority?'], suggestedEvidence: ['Requests, research or data that showed the need'], suggestedBlocks: ['researchInsights', 'pullQuote']},
    {key: 'feature-problem', title: 'The problem to solve', hint: 'What exactly the feature had to do, and what made it hard.', purpose: 'Frames the design problem and its constraints.', act: 'problem', covers: 'problem', prompts: ['What did the feature need to achieve?', 'What were the constraints: technical, legal, time?'], suggestedEvidence: ['Requirements', 'Constraints'], suggestedBlocks: ['problemCallout', 'callout']},
    {key: 'feature-role', title: 'My role', hint: 'What you did, and who you worked with.', purpose: 'Makes your part clear.', act: 'work', covers: 'contribution', prompts: ['What were you responsible for?', 'How did you work with engineering and product?'], suggestedEvidence: ['Your role and the team'], suggestedBlocks: ['callout']},
    {key: 'feature-exploration', title: 'Exploration', hint: 'The options you considered.', purpose: 'Shows the range of ideas behind the final design.', act: 'work', prompts: ['What approaches did you explore?', 'How did you test them?'], suggestedEvidence: ['Sketches and prototypes', 'Test results'], suggestedBlocks: ['imageGrid', 'flowDiagram', 'comparison']},
    {key: 'feature-decisions', title: 'Design decisions', hint: 'The choices that shaped the feature, and why.', purpose: 'Explains your reasoning.', act: 'work', covers: 'decisions', prompts: ['Which decisions mattered most?', 'What trade-offs did you make?'], suggestedEvidence: ['Before and after', 'Annotated screens'], suggestedBlocks: ['annotatedImage', 'comparison', 'splitLayout']},
    {key: 'feature-solution', title: 'The feature', hint: 'How it works, step by step.', purpose: 'Shows the finished feature.', act: 'result', prompts: ['How does someone use it, start to finish?', 'Which details matter?'], suggestedEvidence: ['Final screens', 'A video'], suggestedBlocks: ['screenSequence', 'deviceMockup', 'flowDiagram']},
    {key: 'feature-launch', title: 'Building and launching', hint: 'How it was built, released and measured.', purpose: 'Shows how you saw it through.', act: 'result', required: false, prompts: ['How did you work with engineering?', 'How was it rolled out?', 'What did you measure?'], suggestedEvidence: ['Launch plan', 'Specs or handover'], suggestedBlocks: ['timeline']},
    {key: 'feature-results', title: 'Results', hint: 'How the feature performed.', purpose: 'Proves it was worth building.', act: 'result', covers: 'outcome', prompts: ['What happened after launch?', 'Did it meet its goals?', 'What did users say?'], suggestedEvidence: ['Adoption and usage figures', 'User quotes'], suggestedBlocks: ['resultsHighlights', 'chart', 'pullQuote']},
    {key: 'feature-reflection', title: 'Reflection', hint: 'What you learned, and what you’d do differently.', purpose: 'Shows how you grow.', act: 'result', required: false, prompts: ['What would you change?', 'What’s next for the feature?'], suggestedEvidence: [], suggestedBlocks: ['keyTakeaway', 'pullQuote']},
  ]),
};

const blankV1: Framework = {
  ...UX_PACK,
  documentType: 'any',
  recommendedBlocks: [],
  id: 'blank',
  version: 1,
  name: 'Blank',
  description: 'No suggested sections. Add your own, in your own order.',
  purpose: 'An empty page with every block available, for a document that doesn’t fit a template.',
  audience: [],
  sections: [],
};

/** Every framework version ever released. Never edit or remove one: add a new version instead. */
export const FRAMEWORKS: readonly Framework[] = [productUxV1, productUxV2, uxResearchV1, redesignV1, featureV1, blankV1];

/** The newest version of each framework: what new case studies are offered. */
export const CURRENT_FRAMEWORKS: readonly Framework[] = [productUxV2, uxResearchV1, redesignV1, featureV1, blankV1];

export const DEFAULT_FRAMEWORK = productUxV2;

/** Project types (wizard step 2). */
export const PROJECT_TYPES = {
  'product-ux': {label: 'Product or UX design', description: 'Designing a new product, feature set or experience.'},
  redesign: {label: 'Product redesign', description: 'Improving something that already exists.'},
  research: {label: 'UX research', description: 'A study, its findings and what they changed.'},
  feature: {label: 'Feature development', description: 'One feature, from the idea to the launch.'},
  custom: {label: 'Something else', description: 'Any other kind of project.'},
} as const;

export type ProjectType = keyof typeof PROJECT_TYPES;

export function isProjectType(value: unknown): value is ProjectType {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(PROJECT_TYPES, value);
}

/** The project type a UX template implies (the wizard no longer asks; choosing the template answers it). */
export function projectTypeFor(template: {id: string; documentType: string} | undefined): ProjectType | null {
  if (!template || template.documentType !== 'ux_case_study') return null;
  if (template.id === 'ux-research') return 'research';
  if (template.id === 'redesign') return 'redesign';
  if (template.id === 'feature') return 'feature';
  return 'product-ux';
}

/** The framework recommended for a project type (T7: each type has its own). The user can always choose another, or Blank. */
export function recommendedFramework(type: ProjectType | null | undefined): Framework {
  if (type === 'research') return uxResearchV1;
  if (type === 'redesign') return redesignV1;
  if (type === 'feature') return featureV1;
  return DEFAULT_FRAMEWORK;
}
