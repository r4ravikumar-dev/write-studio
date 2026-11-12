import type {DocumentTemplate, MetadataField, TemplateSection, ValidationRule} from './types';

/**
 * Standard Operating Procedure (SOP / Process Playbook) v1 template (Release 2, Phase 5).
 * Supports operations managers, SREs, DevOps engineers, and support leads in creating
 * clear, repeatable, step-by-step procedures with role matrices, escalation paths, and quality checklists.
 */

const SOP_ACTS: Record<string, string> = {
  governance: 'Document governance & purpose',
  process: 'Roles & process overview',
  procedure: 'Step-by-step execution',
  quality: 'Exceptions, quality & revision',
};

const SOP_METADATA: MetadataField[] = [
  {key: 'process_name', label: 'Process name', description: 'Canonical title of the procedure or standard operating playbook.', kind: 'text', max: 200, storage: 'metadata'},
  {key: 'process_owner', label: 'Process owner', description: 'Department or role accountable for updating this procedure.', kind: 'text', max: 200, storage: 'metadata'},
  {key: 'department', label: 'Department / Unit', description: 'e.g. Infrastructure, Security Ops, Customer Support, Finance.', kind: 'text', max: 200, storage: 'metadata'},
  {key: 'sop_version', label: 'Version', description: 'e.g. v1.0, 2026.1.', kind: 'text', max: 100, storage: 'metadata'},
  {key: 'effective_date', label: 'Effective date', description: 'Date this standard operating procedure took effect.', kind: 'text', max: 100, storage: 'metadata'},
];

const SOP_RULES: ValidationRule[] = [
  {key: 'info', label: 'Document information', description: 'Process title, owner, version and effective dates.', check: 'section', sections: ['sop-info']},
  {key: 'purpose', label: 'Process purpose', description: 'Why the procedure exists and intended operational outcome.', check: 'section', sections: ['sop-purpose']},
  {key: 'scope', label: 'Scope and boundaries', description: 'When the process applies and what is excluded.', check: 'section', sections: ['sop-scope']},
  {key: 'roles', label: 'Roles and responsibilities', description: 'Explicit role accountability for all stages.', check: 'section', sections: ['sop-roles']},
  {key: 'overview', label: 'Process overview', description: 'High-level summary of stages and flow.', check: 'section', sections: ['sop-overview']},
  {key: 'procedure', label: 'Ordered procedure steps', description: 'Actionable, ordered steps with explicit expected outcomes.', check: 'section', sections: ['sop-procedure']},
  {key: 'exceptions', label: 'Exceptions and escalations', description: 'Failure conditions, escalation paths, and contact owners.', check: 'section', sections: ['sop-exceptions']},
  {key: 'quality', label: 'Quality checklist', description: 'Verification checks required before marking process complete.', check: 'section', sections: ['sop-quality']},
  {key: 'revision', label: 'Revision history', description: 'Documented log of changes, authors, and approval dates.', check: 'section', sections: ['sop-revision']},
  {key: 'evidence', label: 'Operational evidence', description: 'Procedure steps, checklists, flow diagrams or SLA metrics.', check: 'evidence'},
];

const SOP_SECTIONS: TemplateSection[] = [
  {
    key: 'sop-info',
    title: 'Document Information',
    hint: 'Process metadata, owner, department, classification, and effective dates.',
    purpose: 'Establishes official operational governance, ownership, and revision tracking.',
    act: 'governance',
    required: true,
    covers: 'info',
    prompts: [
      'What is the official title and identifier for this procedure?',
      'Who is the accountable process owner and approving authority?',
      'What is the effective date and scheduled next review date?',
    ],
    writingGuidance: [
      'Use structured tables to capture process ownership, version, and review cadences.',
      'Never fabricate effective dates or approvals.',
    ],
    suggestedEvidence: ['Document governance table', 'Classification badge'],
    suggestedBlocks: ['table', 'callout'],
    completionCriteria: ['Process owner, version, and effective date are documented.'],
  },
  {
    key: 'sop-purpose',
    title: 'Purpose & Objective',
    hint: 'Why this procedure exists and what operational outcome it guarantees.',
    purpose: 'Defines the operational rationale, safety standard, or regulatory compliance goal.',
    act: 'governance',
    required: true,
    covers: 'purpose',
    prompts: [
      'What specific operational outcome does this procedure ensure?',
      'What risks, service degradation, or compliance violations does it prevent?',
    ],
    writingGuidance: [
      'State the operational objective in one clear paragraph.',
    ],
    suggestedEvidence: ['Purpose statement', 'Target reliability outcome'],
    suggestedBlocks: ['paragraph', 'callout'],
    completionCriteria: ['The purpose and operational objective are clearly defined.'],
  },
  {
    key: 'sop-scope',
    title: 'Scope & Applicability',
    hint: 'When this procedure applies, operational triggers, and explicit exclusions.',
    purpose: 'Sets unambiguous boundaries on when the operator should and should not follow this runbook.',
    act: 'governance',
    required: true,
    covers: 'scope',
    prompts: [
      'Under what conditions or operational triggers does this procedure apply?',
      'Which systems, teams, or environments are covered?',
      'What related scenarios are explicitly excluded and covered elsewhere?',
    ],
    writingGuidance: [
      'Define clear trigger events (e.g. "Triggered upon P1 alert for database replication lag > 60s").',
      'List excluded scenarios with links to the appropriate alternative SOPs.',
    ],
    suggestedEvidence: ['Applicability checklist', 'Trigger conditions callout'],
    suggestedBlocks: ['callout', 'taskList', 'table'],
    completionCriteria: ['Operational triggers and scope boundaries are explicit.'],
  },
  {
    key: 'sop-roles',
    title: 'Roles & Responsibilities',
    hint: 'RACI matrix or role table defining who executes, approves, and consults.',
    purpose: 'Eliminates operational confusion during critical incidents by assigning clear responsibility.',
    act: 'process',
    required: true,
    covers: 'roles',
    prompts: [
      'What specific roles (Incident Commander, Primary On-Call, SRE Lead) are involved?',
      'What actions is each role accountable for during execution?',
      'Who has authority to approve deviations or emergency actions?',
    ],
    writingGuidance: [
      'Use RACI tables (Responsible, Accountable, Consulted, Informed).',
      'Refer to roles rather than individuals so the SOP survives team changes.',
    ],
    suggestedEvidence: ['RACI responsibility matrix', 'Role definitions table'],
    suggestedBlocks: ['table', 'callout'],
    completionCriteria: ['Roles and specific execution responsibilities are documented.'],
  },
  {
    key: 'sop-prerequisites',
    title: 'Prerequisites & Tooling',
    hint: 'Required access permissions, VPNs, CLI tools, API keys, and credentials.',
    purpose: 'Ensures the operator has all necessary access before commencing the runbook.',
    act: 'process',
    required: false,
    prompts: [
      'What tools, CLI utilities, or web consoles must be installed or accessible?',
      'What IAM roles, elevated privileges, or credentials are required?',
      'What environmental checks must be verified before starting?',
    ],
    writingGuidance: [
      'Format as a checklist of tooling and verification commands.',
    ],
    suggestedEvidence: ['Prerequisites checklist', 'Access verification commands'],
    suggestedBlocks: ['taskList', 'terminal', 'table'],
  },
  {
    key: 'sop-overview',
    title: 'Process Overview & Flow',
    hint: 'High-level flowchart and phase breakdown of the complete procedure.',
    purpose: 'Gives the operator an end-to-end visual mental model before executing steps.',
    act: 'process',
    required: true,
    covers: 'overview',
    prompts: [
      'What are the primary execution stages from initiation to verification?',
      'How long does the complete process typically take?',
    ],
    writingGuidance: [
      'Include a flow diagram illustrating stages, checkpoints, and decision branches.',
    ],
    suggestedEvidence: ['Process flow diagram', 'Stage timeline'],
    suggestedBlocks: ['flowDiagram', 'timeline', 'paragraph'],
    completionCriteria: ['Process stages and sequential flow are outlined.'],
  },
  {
    key: 'sop-procedure',
    title: 'Step-by-Step Procedure',
    hint: 'Numbered, ordered steps with who executes each and the expected output.',
    purpose: 'Actionable, unambiguous execution steps that prevent operator error.',
    act: 'procedure',
    required: true,
    covers: 'procedure',
    prompts: [
      'What exact action must the operator take at each step?',
      'What command or console action is executed?',
      'What is the exact expected result confirming the step succeeded?',
    ],
    writingGuidance: [
      'Use structured procedureSteps blocks detailing operator, instruction, and expected result.',
      'Never omit expected output: operators must be able to verify each transition.',
    ],
    suggestedEvidence: ['Numbered procedure steps', 'Terminal commands and expected output'],
    suggestedBlocks: ['procedureSteps', 'terminal', 'codeBlock'],
    completionCriteria: ['Procedure steps are sequenced with explicit expected results.'],
  },
  {
    key: 'sop-decisions',
    title: 'Decision Points & Branching',
    hint: 'Conditional branches: If condition X occurs, proceed to Step Y; otherwise Step Z.',
    purpose: 'Guides the operator through branching logic and operational forks.',
    act: 'procedure',
    required: false,
    prompts: [
      'What conditions alter the execution path during the procedure?',
      'What criteria determine whether to proceed, pause, or roll back?',
    ],
    writingGuidance: [
      'Use decision trees or condition tables (If / Then / Else).',
    ],
    suggestedEvidence: ['Decision branch table', 'Decision flow diagram'],
    suggestedBlocks: ['table', 'flowDiagram', 'callout'],
  },
  {
    key: 'sop-exceptions',
    title: 'Exceptions & Escalation Paths',
    hint: 'Failure modes, unexpected errors, on-call escalation contacts, and paging rules.',
    purpose: 'Ensures the operator knows exactly how to escalate when standard steps fail.',
    act: 'quality',
    required: true,
    covers: 'exceptions',
    prompts: [
      'What unexpected failure modes or errors might occur during execution?',
      'Under what criteria must the operator halt and escalate immediately?',
      'Who is the secondary escalation contact and via what channel (PagerDuty, phone)?',
    ],
    writingGuidance: [
      'Provide an escalation matrix with trigger condition, contact role, SLA, and channel.',
      'Highlight critical abort criteria prominently in a warning callout.',
    ],
    suggestedEvidence: ['Escalation contact matrix', 'Emergency abort criteria'],
    suggestedBlocks: ['callout', 'table'],
    completionCriteria: ['Escalation conditions and contact paths are defined.'],
  },
  {
    key: 'sop-quality',
    title: 'Quality Verification Checklist',
    hint: 'Post-execution checklist to confirm service health and quality before closing.',
    purpose: 'Verifies the procedure was completed thoroughly and no regressions occurred.',
    act: 'quality',
    required: true,
    covers: 'quality',
    prompts: [
      'What telemetry checks or health endpoints confirm system normalcy?',
      'What logs or audit records must be preserved for compliance?',
      'What stakeholders must be notified upon completion?',
    ],
    writingGuidance: [
      'Use task lists for quick verification during post-incident or post-maintenance signoff.',
    ],
    suggestedEvidence: ['Quality checklist', 'Health verification metrics'],
    suggestedBlocks: ['taskList', 'metrics', 'table'],
    completionCriteria: ['Quality checklist defines all necessary completion verifications.'],
  },
  {
    key: 'sop-sla',
    title: 'Service Levels & Timelines',
    hint: 'Target execution time, response SLAs, and recovery time objectives (RTO).',
    purpose: 'Documents performance expectations and contractual service level commitments.',
    act: 'quality',
    required: false,
    prompts: [
      'What is the maximum allowed duration for this procedure (e.g. RTO < 15 min)?',
      'What response time SLAs apply to acknowledgments and updates?',
    ],
    writingGuidance: [
      'Include specific quantitative time bounds in minutes or hours.',
    ],
    suggestedEvidence: ['SLA targets table', 'RTO/RPO metrics'],
    suggestedBlocks: ['metrics', 'table'],
  },
  {
    key: 'sop-related',
    title: 'Related Documents & References',
    hint: 'Supporting architectural docs, corporate policies, incident runbooks, and forms.',
    purpose: 'Connects this playbook to the broader operational and policy ecosystem.',
    act: 'quality',
    required: false,
    prompts: [
      'What parent policies or compliance standards govern this procedure?',
      'What related runbooks or troubleshooting guides are relevant?',
    ],
    writingGuidance: [
      'Use reference lists with safe URLs and short descriptive context.',
    ],
    suggestedEvidence: ['Reference list'],
    suggestedBlocks: ['referenceList', 'bulletList'],
  },
  {
    key: 'sop-revision',
    title: 'Revision History & Change Log',
    hint: 'Version numbers, change descriptions, authors, and approval dates.',
    purpose: 'Maintains an immutable audit trail of all procedure revisions.',
    act: 'quality',
    required: true,
    covers: 'revision',
    prompts: [
      'What revisions have been made to this document over time?',
      'Who authored and who approved each version?',
      'What was the motivation for each change?',
    ],
    writingGuidance: [
      'Maintain an ordered revision table (Version, Date, Author, Change Description, Approver).',
    ],
    suggestedEvidence: ['Revision history table'],
    suggestedBlocks: ['table', 'paragraph'],
    completionCriteria: ['Revision history documents version changes and approvers.'],
  },
];

export const sopV1: DocumentTemplate = {
  id: 'sop',
  version: 1,
  name: 'SOP / Process Playbook',
  description: 'Step-by-step operational procedures, responsibility matrices, escalation paths, quality checklists and SLAs.',
  purpose: 'Empowers teams to execute repeatable processes reliably, safely and consistently with clear role accountability.',
  documentType: 'standard_operating_procedure',
  audience: ['Operations managers', 'Site Reliability Engineers', 'DevOps engineers', 'Customer support leads', 'Compliance officers'],
  acts: SOP_ACTS,
  sections: SOP_SECTIONS,
  metadataFields: SOP_METADATA,
  recommendedBlocks: [
    'procedureSteps',
    'taskList',
    'table',
    'flowDiagram',
    'callout',
    'metrics',
    'referenceList',
  ],
  validationRules: SOP_RULES,
  exportProfiles: ['pdf', 'html_zip', 'markdown', 'json_backup'],
};
