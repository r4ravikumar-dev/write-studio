import type {DocumentTemplate, MetadataField, TemplateSection, ValidationRule} from './types';

/**
 * Architecture Decision Record (ADR) v1 companion template (Release 2, Phase 5).
 * Supports software architects and engineering leads in capturing a single significant
 * technical decision, its context, evaluated alternatives, selected outcome, and trade-offs.
 */

const ADR_ACTS: Record<string, string> = {
  context: 'Context & status',
  options: 'Drivers & alternatives',
  decision: 'Decision & consequences',
  references: 'References',
};

const ADR_METADATA: MetadataField[] = [
  {key: 'decision_title', label: 'Decision title', description: 'Short descriptive title of the decision (e.g. ADR-004: Redis for Rate Limiting).', kind: 'text', max: 200, storage: 'metadata'},
  {key: 'status', label: 'Status', description: 'Proposed, Accepted, Rejected, Deprecated, or Superseded.', kind: 'text', max: 100, storage: 'metadata'},
  {key: 'author', label: 'Author / Driver', description: 'Primary engineer driving the architectural decision.', kind: 'text', max: 200, storage: 'metadata'},
  {key: 'decision_date', label: 'Decision date', description: 'Date the decision was proposed or approved.', kind: 'text', max: 100, storage: 'metadata'},
  {key: 'supersedes', label: 'Supersedes / Superseded by', description: 'Reference to previous or replacing ADR if applicable.', kind: 'text', max: 200, storage: 'metadata'},
];

const ADR_RULES: ValidationRule[] = [
  {key: 'status', label: 'Decision status', description: 'Current status: Proposed, Accepted, Rejected, Deprecated, or Superseded.', check: 'section', sections: ['adr-status']},
  {key: 'context', label: 'Context and problem', description: 'The situation and forces demanding an architectural choice.', check: 'section', sections: ['adr-context']},
  {key: 'options', label: 'Options considered', description: 'Viable alternatives evaluated with their pros and cons.', check: 'section', sections: ['adr-options']},
  {key: 'decision', label: 'Decision and rationale', description: 'The selected choice and exact reasons why it won.', check: 'section', sections: ['adr-decision']},
  {key: 'consequences', label: 'Consequences', description: 'Positive, negative, and neutral trade-offs accepted.', check: 'section', sections: ['adr-consequences']},
  {key: 'evidence', label: 'Comparison or decision evidence', description: 'Comparison matrix, code snippets, benchmarks or callouts.', check: 'evidence'},
];

const ADR_SECTIONS: TemplateSection[] = [
  {
    key: 'adr-status',
    title: 'Status',
    hint: 'Proposed, Accepted, Rejected, Deprecated, or Superseded, with approval date.',
    purpose: 'Explicitly declares the current governance state of the architectural decision.',
    act: 'context',
    required: true,
    covers: 'status',
    prompts: [
      'What is the current status of this decision (Proposed, Accepted, Rejected)?',
      'What date was this decision approved or rejected?',
      'Does this decision supersede an older ADR or is it superseded by a newer one?',
    ],
    writingGuidance: [
      'Use high-visibility callouts to state the lifecycle state.',
      'Never silently overwrite an accepted ADR: create a new record that supersedes it.',
    ],
    suggestedEvidence: ['Decision status callout', 'Date badge'],
    suggestedBlocks: ['callout', 'paragraph'],
    completionCriteria: ['Status and effective date are unambiguously stated.'],
  },
  {
    key: 'adr-context',
    title: 'Context & Problem',
    hint: 'The technical challenge, business forces, and constraints that require a decision.',
    purpose: 'Describes the context and forces that necessitate an architectural choice.',
    act: 'context',
    required: true,
    covers: 'context',
    prompts: [
      'What specific architectural or operational problem arose?',
      'What forces, technological shifts, or scale requirements demand a choice now?',
      'What constraints (performance, cost, team expertise) limit the solution space?',
    ],
    writingGuidance: [
      'Focus neutrally on the forces influencing the decision.',
      'Avoid biasing the problem description towards one favored option.',
    ],
    suggestedEvidence: ['Context description', 'Problem statement callout'],
    suggestedBlocks: ['paragraph', 'callout'],
    completionCriteria: ['Context clearly explains why a decision must be made.'],
  },
  {
    key: 'adr-drivers',
    title: 'Decision Drivers',
    hint: 'Key criteria used to evaluate options (e.g. latency, operational simplicity, cost).',
    purpose: 'Lists the objective factors and weighting criteria used to evaluate options.',
    act: 'options',
    required: false,
    prompts: [
      'What primary criteria were used to compare alternatives?',
      'Which factors are hard requirements versus nice-to-haves?',
    ],
    writingGuidance: [
      'Use checklists to itemize the decision drivers in order of priority.',
    ],
    suggestedEvidence: ['Evaluation criteria checklist'],
    suggestedBlocks: ['taskList', 'bulletList', 'table'],
  },
  {
    key: 'adr-options',
    title: 'Options Considered',
    hint: 'The realistic architectural alternatives evaluated, with pros and cons.',
    purpose: 'Records all evaluated options and their trade-offs to ensure transparent governance.',
    act: 'options',
    required: true,
    covers: 'options',
    prompts: [
      'What viable architectural approaches or technologies were considered?',
      'What were the primary advantages and disadvantages of each option?',
      'Why were rejected options deemed unsuitable for our constraints?',
    ],
    writingGuidance: [
      'Evaluate at least two real alternatives fairly.',
      'Use comparison blocks or side-by-side tables for readability.',
    ],
    suggestedEvidence: ['Comparison matrix', 'Options pros and cons table'],
    suggestedBlocks: ['comparison', 'table', 'bulletList'],
    completionCriteria: ['All viable options are documented with pros and cons.'],
  },
  {
    key: 'adr-decision',
    title: 'Decision & Rationale',
    hint: 'The chosen architectural option and the decisive rationale for selecting it.',
    purpose: 'States the selected option clearly along with the specific reasons why it won.',
    act: 'decision',
    required: true,
    covers: 'decision',
    prompts: [
      'Which architectural option was selected?',
      'What decisive evidence, benchmarks, or alignment factors tipped the balance?',
      'How does this option satisfy the primary decision drivers?',
    ],
    writingGuidance: [
      'State the chosen option in active voice ("We will use X for Y").',
      'Directly link the rationale back to the stated decision drivers.',
    ],
    suggestedEvidence: ['Decision statement callout', 'Selected architecture summary'],
    suggestedBlocks: ['callout', 'paragraph', 'codeBlock'],
    completionCriteria: ['The chosen option and core rationale are explicitly stated.'],
  },
  {
    key: 'adr-consequences',
    title: 'Consequences & Trade-offs',
    hint: 'Positive, negative, and neutral trade-offs accepted as a result of this decision.',
    purpose: 'Transparently documents the long-term consequences and technical debt accepted.',
    act: 'decision',
    required: true,
    covers: 'consequences',
    prompts: [
      'What positive outcomes and capabilities are unlocked?',
      'What negative consequences, ongoing maintenance burdens, or technical debt are accepted?',
      'What follow-up tasks or tooling investments are now required?',
    ],
    writingGuidance: [
      'Every major architectural choice has trade-offs: do not hide negative consequences.',
      'Enumerate follow-up actions required to support the decision.',
    ],
    suggestedEvidence: ['Consequences table', 'Follow-up actions checklist'],
    suggestedBlocks: ['table', 'callout', 'taskList'],
    completionCriteria: ['Both positive and negative consequences are candidly documented.'],
  },
  {
    key: 'adr-references',
    title: 'References & Related Docs',
    hint: 'Links to related technical design documents, benchmarks, PRs, and meeting notes.',
    purpose: 'Points future engineers to supporting research, prototypes, and benchmarks.',
    act: 'references',
    required: false,
    prompts: [
      'What technical design documents, pull requests, or benchmark repos support this decision?',
      'What industry standards or upstream documentation were consulted?',
    ],
    writingGuidance: [
      'Provide clean reference lists with safe https:// URLs.',
    ],
    suggestedEvidence: ['Reference list'],
    suggestedBlocks: ['referenceList', 'bulletList'],
  },
];

export const adrV1: DocumentTemplate = {
  id: 'adr',
  version: 1,
  name: 'Architecture Decision Record (ADR)',
  description: 'Captures one significant technical decision, its context, evaluated alternatives, selected choice and consequences.',
  purpose: 'Records a single architecture decision and its rationale in an immutable, searchable format for technical governance.',
  documentType: 'architecture_decision_record',
  audience: ['Software architects', 'Staff engineers', 'Engineering managers', 'System maintainers'],
  acts: ADR_ACTS,
  sections: ADR_SECTIONS,
  metadataFields: ADR_METADATA,
  recommendedBlocks: [
    'callout',
    'comparison',
    'table',
    'codeBlock',
    'taskList',
    'referenceList',
  ],
  validationRules: ADR_RULES,
  exportProfiles: ['pdf', 'html_zip', 'markdown', 'json_backup'],
};
