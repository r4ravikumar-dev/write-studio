import type {Framework} from '../frameworks';
import type {JSONContent} from './json';
import {BLOCK_SCHEMAS, blockProblems, isEvidenceBlock} from './blockSchemas';
import {frameworkSection} from '../frameworks';
import {documentSections, hasContent, isSectionHeading, type SectionState} from './sections';

/**
 * Story review (Stage 5): a deterministic check of a case study, never AI and never a score.
 * The same function runs in the editor (Review dashboard) and the API (dashboard progress).
 *
 *  - checklist: does the story cover context, problem, contribution, decisions, evidence, outcome?
 *  - warnings:  things to fix or consider, each pointing at the section (and block) it's about
 *  - progress:  how many sections are complete
 */
export type ReviewCategory = 'structure' | 'content' | 'visual' | 'technical';
export type ReviewSeverity = 'fix' | 'consider';

export type ChecklistItem = {
  key: 'context' | 'problem' | 'contribution' | 'decisions' | 'evidence' | 'outcome';
  label: string;
  description: string;
  done: boolean;
  /** Where to go: the section it's about, when there is one. */
  sectionId: string | null;
  /** The framework section to add when the story has none for this. */
  addKey: string | null;
};

export type ReviewWarning = {
  id: string;
  category: ReviewCategory;
  severity: ReviewSeverity;
  message: string;
  /** How to fix it, in a few words. */
  fix: string;
  sectionId: string | null;
  /** Top-level block index in the document, for "Go to" a specific block. */
  nodeIndex: number | null;
  /** Fixed in the case study's details (title, cover), not the story. */
  inDetails?: boolean;
};

export type ReviewProgress = {total: number; complete: number; review: number; inProgress: number; empty: number};

export type StoryReview = {checklist: ChecklistItem[]; warnings: ReviewWarning[]; progress: ReviewProgress};

export type ReviewInput = {
  title: string;
  content: JSONContent;
  cover_path?: string | null;
  thumbnail_path?: string | null;
  thumbnail_alt?: string;
  /** The case study's framework version: its sections say which story element they cover. */
  framework?: Framework;
};

export const REVIEW_CATEGORIES: Record<ReviewCategory, string> = {
  structure: 'Structure',
  content: 'Content',
  visual: 'Visuals',
  technical: 'Technical',
};

const CHECKLIST: {key: ChecklistItem['key']; label: string; description: string; sections: string[]}[] = [
  {key: 'context', label: 'Context', description: 'The product, the people and the situation.', sections: ['context', 'overview']},
  {key: 'problem', label: 'Problem', description: 'What needed solving, and why it mattered.', sections: ['challenge']},
  {key: 'contribution', label: 'Your contribution', description: 'What you did, and who you worked with.', sections: ['contribution']},
  {key: 'decisions', label: 'Decisions', description: 'The choices you made, and why.', sections: ['decisions']},
  {key: 'evidence', label: 'Evidence', description: 'Pictures, figures or quotes that back the story up.', sections: []},
  {key: 'outcome', label: 'Outcome', description: 'What changed, with real results.', sections: ['outcome']},
];

export function reviewCaseStudy(study: ReviewInput): StoryReview {
  const nodes = study.content?.content ?? [];
  const sections = documentSections(study.content ?? {type: 'doc'});
  const warnings: ReviewWarning[] = [];
  const add = (warning: Omit<ReviewWarning, 'id'>) => warnings.push({...warning, id: `${warning.category}-${warnings.length}`});
  const nameOf = (section: (typeof sections)[number]) => section.title || frameworkSection(section.key)?.title || 'Untitled section';

  // Which section each top-level block is in.
  const sectionAt: (string | null)[] = [];
  let current: string | null = null;
  nodes.forEach((node, index) => {
    if (isSectionHeading(node)) current = String(node.attrs?.sectionId ?? '') || null;
    sectionAt[index] = current;
  });

  // Structure
  if (!study.title.trim() || study.title === 'Untitled case study') {
    add({category: 'structure', severity: 'fix', message: 'The case study has no title.', fix: 'Add a title at the top of the page.', sectionId: null, nodeIndex: null});
  }
  if (!sections.length) {
    add({category: 'structure', severity: 'consider', message: 'The story has no sections.', fix: 'Add sections from the outline to organise it.', sectionId: null, nodeIndex: null});
  }
  for (const section of sections) {
    const framework = frameworkSection(section.key);
    if (section.state === 'empty') {
      add({
        category: framework?.required ? 'content' : 'structure',
        severity: framework?.required ? 'fix' : 'consider',
        message: `“${nameOf(section)}” is empty.`,
        fix: framework?.required ? 'Write it, or remove the section if the story doesn’t need it.' : 'Write it, or remove it from the outline.',
        sectionId: section.id,
        nodeIndex: null,
      });
    } else if (section.state === 'review') {
      add({category: 'structure', severity: 'consider', message: `“${nameOf(section)}” is marked for review.`, fix: 'Check it, then mark it complete.', sectionId: section.id, nodeIndex: null});
    }
  }

  // Visuals and technical, block by block
  nodes.forEach((node, index) => {
    const name = BLOCK_SCHEMAS[node.type ?? '']?.phrase ?? 'A block';
    for (const problem of blockProblems(node)) {
      const at = {sectionId: sectionAt[index], nodeIndex: index};
      if (problem.kind === 'alt') {
        add({category: 'visual', severity: 'fix', message: problem.count && problem.count > 1 ? `${name} has ${problem.count} pictures without alt text.` : `${name} has a picture without alt text.`, fix: 'Describe what each picture shows, or mark it as decorative.', ...at});
      } else if (problem.kind === 'empty' && node.type === 'researchInsights') {
        add({category: 'content', severity: 'fix', message: `${name} has no findings yet.`, fix: 'Write at least one finding, or delete the block.', ...at});
      } else if (problem.kind === 'empty') {
        add({category: 'visual', severity: 'fix', message: `${name} is missing its pictures or text.`, fix: 'Choose the media, or delete the block.', ...at});
      } else if (problem.kind === 'evidence') {
        add({category: 'content', severity: 'consider', message: `${name} has findings without evidence.`, fix: 'Add what each finding is based on: a quote, a number or an observation.', ...at});
      } else if (problem.kind === 'summary') {
        add({category: 'visual', severity: 'fix', message: `${name} has no summary for people who can’t see it.`, fix: 'Describe what the chart shows in one sentence, in the chart’s properties.', ...at});
      } else if (problem.kind === 'figures') {
        add({category: 'content', severity: 'fix', message: node.type === 'chart' ? `${name} has no values yet.` : `${name} has figures without a value or label.`, fix: node.type === 'chart' ? 'Add each label and its value, using real, verified figures.' : 'Fill in every figure, using real, verified results.', ...at});
      } else if (problem.kind === 'embed') {
        add({category: 'technical', severity: 'fix', message: `${name} has a link that can’t be shown.`, fix: 'Paste a YouTube, Vimeo, Loom or Figma link again.', ...at});
      }
    }
  });
  if (study.cover_path && !study.thumbnail_alt?.trim()) {
    add({category: 'visual', severity: 'fix', message: 'The cover picture has no alt text.', fix: 'Add alt text in the case study’s details.', sectionId: null, nodeIndex: null, inDetails: true});
  }
  if (!study.thumbnail_path && !study.cover_path) {
    add({category: 'technical', severity: 'consider', message: 'There’s no thumbnail for the case study’s card.', fix: 'Choose a thumbnail in the case study’s details.', sectionId: null, nodeIndex: null, inDetails: true});
  }

  // Story completeness checklist
  const evidenceAt = nodes.findIndex(isEvidenceBlock);
  const checklist: ChecklistItem[] = CHECKLIST.map(item => {
    if (item.key === 'evidence') {
      return {key: item.key, label: item.label, description: item.description, done: evidenceAt !== -1, sectionId: evidenceAt === -1 ? null : sectionAt[evidenceAt], addKey: null};
    }
    const counts = (key: string | null) => Boolean(key && (item.sections.includes(key) || frameworkSection(key, study.framework)?.covers === item.key));
    const matching = sections.filter(section => counts(section.key));
    // "Add section" offers the case study's own framework's section for this part of the story.
    const own = study.framework?.sections.find(section => section.covers === item.key || item.sections.includes(section.key));
    const written = matching.find(section => section.body.some(hasContent));
    return {
      key: item.key,
      label: item.label,
      description: item.description,
      done: Boolean(written),
      sectionId: (written ?? matching[0])?.id ?? null,
      addKey: matching.length ? null : own?.key ?? item.sections[0],
    };
  });

  return {checklist, warnings, progress: sectionProgress(sections.map(section => section.state))};
}

export function sectionProgress(states: SectionState[]): ReviewProgress {
  const count = (state: SectionState) => states.filter(item => item === state).length;
  return {total: states.length, complete: count('complete'), review: count('review'), inProgress: count('in_progress'), empty: count('empty')};
}

/** "4 of 10 sections complete" (or nothing to say when there are no sections). */
export function progressLabel(progress: ReviewProgress | null | undefined): string {
  if (!progress?.total) return '';
  return `${progress.complete} of ${progress.total} sections complete`;
}


