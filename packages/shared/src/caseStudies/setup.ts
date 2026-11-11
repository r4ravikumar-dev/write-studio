import type {JSONContent} from './json';
import {newSectionId} from './sections';
import {
  CURRENT_FRAMEWORKS,
  DEFAULT_FRAMEWORK,
  getFramework,
  isProjectType,
  type Framework,
  type ProjectType,
} from '../frameworks';

/**
 * Project setup (the "new case study" wizard, Stage 1). The answers become columns on the case
 * study; the outline becomes the first version of the document. While setup isn't finished
 * ("Save and finish later"), the wizard's position and outline are kept in `setup_state`, and
 * the document stays empty until the user creates it.
 */
export const SETUP_STEPS = ['start', 'type', 'details', 'framework', 'cover', 'outline'] as const;
export type SetupStep = (typeof SETUP_STEPS)[number];

/** One section in the outline. `key` links it to a framework section (null = the user's own). */
export type OutlineItem = {id: string; key: string | null; title: string};

export type StudioSetup = {
  step: SetupStep;
  start: 'framework' | 'blank';
  project_type: ProjectType | null;
  title: string;
  summary: string;
  role: string;
  team: string;
  timeline: string;
  platform: string;
  objective: string;
  challenge: string;
  framework_id: string;
  framework_version: number;
  cover_path: string | null;
  cover_alt: string;
  outline: OutlineItem[];
};

/** What's kept in `setup_state` while setup is unfinished (everything else has a column). */
export type StudioSetupState = Pick<StudioSetup, 'step' | 'start' | 'outline'>;

export const SETUP_LIMITS = {
  title: 300,
  summary: 2000,
  role: 200,
  team: 500,
  timeline: 200,
  platform: 200,
  objective: 1000,
  challenge: 1000,
  coverAlt: 500,
  sectionTitle: 120,
  sections: 40,
} as const;

let counter = 0;
/** A short id for an outline row (React keys and reordering only; never stored in the document). */
export function outlineId(): string {
  counter += 1;
  return `s${Date.now().toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/** A framework's sections as an editable outline. */
export function outlineFor(framework: Framework): OutlineItem[] {
  return framework.sections.map(section => ({id: outlineId(), key: section.key, title: section.title}));
}

export function newSetup(start: StudioSetup['start'] = 'framework'): StudioSetup {
  const framework = start === 'blank' ? getFramework('blank', 1)! : DEFAULT_FRAMEWORK;
  return {
    step: 'start',
    start,
    project_type: null,
    title: '',
    summary: '',
    role: '',
    team: '',
    timeline: '',
    platform: '',
    objective: '',
    challenge: '',
    framework_id: framework.id,
    framework_version: framework.version,
    cover_path: null,
    cover_alt: '',
    outline: outlineFor(framework),
  };
}

/**
 * The first version of the document, from the outline. A framework section keeps an EMPTY heading
 * tagged with its key, so the editor shows its title and hint as placeholders. A renamed one keeps
 * the user's title as text (and its key, so the hint still shows). A section of the user's own is
 * a heading with their title. With no sections, the document is one empty paragraph.
 */
export function outlineDocument(outline: OutlineItem[], framework: Framework | undefined): JSONContent {
  const content: JSONContent[] = [];
  for (const item of outline) {
    const section = item.key ? framework?.sections.find(candidate => candidate.key === item.key) : undefined;
    const title = item.title.trim();
    const attrs: Record<string, unknown> = {level: 2, sectionId: newSectionId(), sectionStatus: null};
    if (section) attrs.section = section.key;
    const heading: JSONContent = {type: 'heading', attrs};
    if (title && title !== section?.title) heading.content = [{type: 'text', text: title}];
    if (!section && !title) continue;
    content.push(heading, {type: 'paragraph'});
  }
  return {type: 'doc', content: content.length ? content : [{type: 'paragraph'}]};
}

const text = (value: unknown, max: number) => (typeof value === 'string' ? value.trim().slice(0, max) : '');

/**
 * Cleans setup answers from the browser (the server never trusts them). Text is trimmed and capped;
 * the framework must exist; outline sections must belong to that framework or be the user's own.
 * Returns the cleaned setup and anything that can't be accepted.
 */
export function cleanSetup(input: unknown): {setup: StudioSetup; problems: string[]} {
  const raw = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const problems: string[] = [];
  const framework = getFramework(raw.framework_id, raw.framework_version);
  if (!framework) problems.push('Choose a framework from the list.');
  const step = (SETUP_STEPS as readonly string[]).includes(raw.step as string) ? (raw.step as SetupStep) : 'start';

  const outlineRaw = Array.isArray(raw.outline) ? raw.outline : [];
  if (outlineRaw.length > SETUP_LIMITS.sections) problems.push(`An outline can have up to ${SETUP_LIMITS.sections} sections. Remove some, then try again.`);
  const outline: OutlineItem[] = [];
  for (const entry of outlineRaw.slice(0, SETUP_LIMITS.sections)) {
    const item = (entry && typeof entry === 'object' ? entry : {}) as Record<string, unknown>;
    const key = typeof item.key === 'string' && item.key ? item.key : null;
    if (key && framework && !framework.sections.some(section => section.key === key)) {
      problems.push('A section in the outline isn’t part of the chosen framework. Choose the framework again to reset the outline.');
      break;
    }
    const id = typeof item.id === 'string' && /^[a-z0-9]{1,40}$/i.test(item.id) ? item.id : outlineId();
    outline.push({id, key, title: text(item.title, SETUP_LIMITS.sectionTitle)});
  }

  const cover = typeof raw.cover_path === 'string' && raw.cover_path ? raw.cover_path : null;
  return {
    problems,
    setup: {
      step,
      start: raw.start === 'blank' ? 'blank' : 'framework',
      project_type: isProjectType(raw.project_type) ? raw.project_type : null,
      title: text(raw.title, SETUP_LIMITS.title),
      summary: text(raw.summary, SETUP_LIMITS.summary),
      role: text(raw.role, SETUP_LIMITS.role),
      team: text(raw.team, SETUP_LIMITS.team),
      timeline: text(raw.timeline, SETUP_LIMITS.timeline),
      platform: text(raw.platform, SETUP_LIMITS.platform),
      objective: text(raw.objective, SETUP_LIMITS.objective),
      challenge: text(raw.challenge, SETUP_LIMITS.challenge),
      framework_id: framework?.id ?? DEFAULT_FRAMEWORK.id,
      framework_version: framework?.version ?? DEFAULT_FRAMEWORK.version,
      cover_path: cover,
      cover_alt: text(raw.cover_alt, SETUP_LIMITS.coverAlt),
      outline,
    },
  };
}

/** The frameworks a new case study can use (newest version of each). */
export function setupFrameworks(): readonly Framework[] {
  return CURRENT_FRAMEWORKS;
}
