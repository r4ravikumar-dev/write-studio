import type {VisualBlockName} from '../caseStudies/blocks';

/**
 * Storytelling frameworks (Write Studio 2.0 blueprint in docs, "Framework system").
 *
 * A framework is data: a narrative purpose and its sections. Each version is immutable. To
 * change one, add a new version and leave the old one in place, because existing case studies
 * keep the framework id and version they were made with, and a framework change must never
 * alter a project that already exists. Frameworks only suggest; users rename, reorder, add,
 * repeat and remove sections freely.
 */
export type FrameworkSection = {
  /** Stable across versions: documents tag their section headings with it. */
  key: string;
  title: string;
  /** The placeholder under the section heading in the editor (never stored in the document). */
  hint: string;
  /** What the section does in the story, shown when choosing a framework. */
  purpose: string;
  /** Part of the narrative arc the section belongs to, for the framework preview. */
  act: FrameworkAct;
  required: boolean;
  /** Questions to answer while writing. */
  prompts: string[];
  /** What to show as proof. */
  suggestedEvidence: string[];
  suggestedVisuals: VisualBlockName[];
};

export type FrameworkAct = 'scene' | 'problem' | 'work' | 'result';

export const FRAMEWORK_ACTS: Record<FrameworkAct, string> = {
  scene: 'Set the scene',
  problem: 'Frame the problem',
  work: 'Show the work',
  result: 'Share the result',
};

export type Framework = {
  id: string;
  version: number;
  name: string;
  description: string;
  audience: string[];
  sections: FrameworkSection[];
};

const productUxV1: Framework = {
  id: 'product-ux',
  version: 1,
  name: 'Product and UX design',
  description:
    'A complete project story, from the context and the problem through your process and decisions to the outcome. Works for most product and UX projects.',
  audience: ['ux-designer', 'product-designer'],
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
      suggestedVisuals: ['showcase', 'deviceMockup'],
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
      suggestedVisuals: ['metrics'],
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
      suggestedVisuals: ['showcase', 'callout'],
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
      suggestedVisuals: ['pullQuote', 'annotatedImage', 'metrics'],
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
      suggestedVisuals: ['callout'],
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
      suggestedVisuals: ['flowDiagram', 'imageGrid', 'timeline'],
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
      suggestedVisuals: ['comparison', 'splitLayout', 'annotatedImage'],
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
      suggestedVisuals: ['screenSequence', 'deviceMockup', 'showcase'],
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
      suggestedVisuals: ['metrics', 'pullQuote'],
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
      suggestedVisuals: ['callout'],
    },
  ],
};

const blankV1: Framework = {
  id: 'blank',
  version: 1,
  name: 'Blank',
  description: 'No suggested sections. Add your own, in your own order.',
  audience: [],
  sections: [],
};

/** Every framework version ever released. Never edit or remove one: add a new version instead. */
export const FRAMEWORKS: readonly Framework[] = [productUxV1, blankV1];

/** The newest version of each framework: what new case studies are offered. */
export const CURRENT_FRAMEWORKS: readonly Framework[] = [productUxV1, blankV1];

export const DEFAULT_FRAMEWORK = productUxV1;

export function getFramework(id: unknown, version: unknown): Framework | undefined {
  return FRAMEWORKS.find(framework => framework.id === id && framework.version === version);
}

/** A section of any framework version, by its key (keys are stable across versions). */
export function frameworkSection(key: unknown): FrameworkSection | undefined {
  if (typeof key !== 'string') return undefined;
  for (const framework of FRAMEWORKS) {
    const section = framework.sections.find(candidate => candidate.key === key);
    if (section) return section;
  }
  return undefined;
}

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

/**
 * The framework recommended for a project type. Only Product and UX design is fully written so
 * far (the others are planned), so it's the recommendation for every type. Recommendations are
 * optional: the user can always choose Blank.
 */
export function recommendedFramework(type: ProjectType | null | undefined): Framework {
  void type;
  return DEFAULT_FRAMEWORK;
}
