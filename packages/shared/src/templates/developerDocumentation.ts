import type {DocumentTemplate, MetadataField, TemplateSection, ValidationRule} from './types';

/**
 * Developer Documentation v1 template (Release 1, Phase 4).
 * Supports software engineers, technical writers, and devrel teams in creating
 * guides, setup instructions, API/interface references, and troubleshooting playbooks.
 */

const DEV_DOCS_ACTS: Record<string, string> = {
  start: 'Getting started',
  implementation: 'Implementation & usage',
  reference: 'Reference & configuration',
  troubleshooting: 'Troubleshooting & resources',
};

const DEV_DOCS_METADATA: MetadataField[] = [
  {key: 'system_or_library', label: 'Product or system', description: 'The library, API, service or system being documented.', kind: 'text', max: 200, storage: 'metadata'},
  {key: 'tech_stack', label: 'Technology stack', description: 'Languages, frameworks or runtimes used (e.g. Node.js 20+, TypeScript).', kind: 'text', max: 200, storage: 'metadata'},
  {key: 'supported_versions', label: 'Supported versions', description: 'Target versions or API compatibility range (e.g. v2.x, ES2022+).', kind: 'text', max: 100, storage: 'metadata'},
  {key: 'target_audience', label: 'Target audience', description: 'Who should read this guide (e.g. Backend engineers, API consumers).', kind: 'text', max: 200, storage: 'metadata'},
  {key: 'repository_url', label: 'Repository or source URL', description: 'Link to source code, package registry or demo repository.', kind: 'text', max: 500, storage: 'metadata'},
];

const DEV_DOCS_RULES: ValidationRule[] = [
  {key: 'overview', label: 'Overview', description: 'What this technology or system is and who it is for.', check: 'section', sections: ['dev-overview']},
  {key: 'prerequisites', label: 'Prerequisites', description: 'System requirements, dependencies and knowledge needed before starting.', check: 'section', sections: ['dev-prerequisites']},
  {key: 'quick_start', label: 'Quick start', description: 'A fast working example or command to get started immediately.', check: 'section', sections: ['dev-quick-start']},
  {key: 'installation', label: 'Installation', description: 'Step-by-step setup and configuration instructions.', check: 'section', sections: ['dev-installation']},
  {key: 'implementation', label: 'Implementation', description: 'Clear, step-by-step usage guide and code examples.', check: 'section', sections: ['dev-implementation', 'dev-code-examples']},
  {key: 'evidence', label: 'Code or technical evidence', description: 'Syntax-highlighted code, terminal commands or parameter tables backing the guide.', check: 'evidence'},
];

const DEV_DOCS_SECTIONS: TemplateSection[] = [
  {
    key: 'dev-overview',
    title: 'Overview',
    hint: 'What is this technology, library or system and what does it solve?',
    purpose: 'Introduces the technology, its primary use cases, and key capabilities.',
    act: 'start',
    required: true,
    covers: 'overview',
    prompts: [
      'What technology, library or system does this document describe?',
      'What core problem does it solve for developers?',
      'What are the primary capabilities and benefits?',
    ],
    writingGuidance: [
      'Lead with a concise summary sentence before diving into technical details.',
      'Identify the target runtime, supported architectures, and typical integration points.',
    ],
    suggestedEvidence: ['Architecture overview', 'Supported environment summary'],
    suggestedBlocks: ['paragraph', 'callout', 'bulletList'],
    completionCriteria: ['The developer understands what the system does and when to choose it.'],
  },
  {
    key: 'dev-prerequisites',
    title: 'Prerequisites',
    hint: 'What should developers know, install or configure beforehand?',
    purpose: 'Lists required dependencies, runtimes, credentials, and access permissions.',
    act: 'start',
    required: true,
    covers: 'prerequisites',
    prompts: [
      'What minimum language, runtime or OS versions are required?',
      'Which API keys, credentials or network permissions are needed?',
      'What background knowledge does the reader need?',
    ],
    writingGuidance: [
      'Be exact about version requirements (e.g. Node.js >= 20.0.0, Python 3.11+).',
      'Distinguish hard requirements from optional tools.',
    ],
    suggestedEvidence: ['Version requirements table', 'Access requirements checklist'],
    suggestedBlocks: ['taskList', 'table', 'callout'],
    completionCriteria: ['All necessary tooling and prerequisites are clearly stated.'],
  },
  {
    key: 'dev-quick-start',
    title: 'Quick Start',
    hint: 'A minimal working example in under 5 minutes.',
    purpose: 'Gets a developer to their first successful run as quickly as possible.',
    act: 'start',
    required: true,
    covers: 'quick_start',
    prompts: [
      'What is the fastest command to install or clone this?',
      'What is the shortest working code snippet?',
      'What does success look like when it runs?',
    ],
    writingGuidance: [
      'Keep the quick start minimal: avoid deep configuration or edge cases here.',
      'Show exact command syntax and the expected console or HTTP output.',
    ],
    suggestedEvidence: ['One-line install command', 'Minimal working snippet', 'Console output'],
    suggestedBlocks: ['terminal', 'codeBlock', 'callout'],
    completionCriteria: ['A developer can copy and execute the quick start successfully.'],
  },
  {
    key: 'dev-installation',
    title: 'Installation and Setup',
    hint: 'Package installation, environment setup, and dependency management.',
    purpose: 'Details package manager commands, environment variables, and initial setup.',
    act: 'start',
    required: true,
    covers: 'installation',
    prompts: [
      'How is the package or binary installed across supported package managers?',
      'What environment variables must be declared?',
      'How does a developer verify the installation succeeded?',
    ],
    writingGuidance: [
      'Include commands for standard package managers (npm, pnpm, yarn, brew, etc.).',
      'Provide a sample .env file or configuration table.',
    ],
    suggestedEvidence: ['Package manager commands', 'Configuration table'],
    suggestedBlocks: ['terminal', 'codeBlock', 'parameterTable'],
    completionCriteria: ['Installation steps for all supported environments are covered.'],
  },
  {
    key: 'dev-core-concepts',
    title: 'Core Concepts',
    hint: 'Underlying mental model, terminology, and architecture.',
    purpose: 'Explains foundational concepts necessary to build effectively with the system.',
    act: 'start',
    required: false,
    prompts: [
      'What terms or concepts are unique to this system?',
      'How do data and execution flow through the architecture?',
      'What lifecycle or state transitions occur?',
    ],
    writingGuidance: [
      'Use diagrams or callouts to make architectural relationships immediately clear.',
      'Define specialized terminology before referencing it in code.',
    ],
    suggestedEvidence: ['Architecture diagram', 'Term definitions', 'State machine flow'],
    suggestedBlocks: ['flowDiagram', 'callout', 'table'],
  },
  {
    key: 'dev-implementation',
    title: 'Implementation Guide',
    hint: 'Step-by-step instructions for building the main integration or workflow.',
    purpose: 'Guides the developer through building real features with structured instructions.',
    act: 'implementation',
    required: true,
    covers: 'implementation',
    prompts: [
      'What are the discrete steps to implement this feature or integration?',
      'What decisions or trade-offs should developers consider at each step?',
      'How should components or modules be wired together?',
    ],
    writingGuidance: [
      'Structure into numbered, actionable steps with expected outcomes.',
      'Explain why certain patterns or hooks are chosen.',
    ],
    suggestedEvidence: ['Numbered procedure', 'Code snippets per step'],
    suggestedBlocks: ['procedureSteps', 'codeBlock', 'callout'],
    completionCriteria: ['Full implementation flow is documented from initialization to completion.'],
  },
  {
    key: 'dev-code-examples',
    title: 'Code Examples',
    hint: 'Practical, realistic code samples demonstrating key use cases.',
    purpose: 'Provides robust, copy-paste-ready code samples for common patterns.',
    act: 'implementation',
    required: false,
    prompts: [
      'What are the top 2-3 real-world use cases developers implement?',
      'What does robust input handling and error checking look like in practice?',
      'What is the expected return value or output for each example?',
    ],
    writingGuidance: [
      'Every code sample must declare its language and have syntax highlighting.',
      'Samples should be production-oriented, showing proper error handling.',
    ],
    suggestedEvidence: ['Annotated code blocks', 'Sample input/output'],
    suggestedBlocks: ['codeBlock', 'terminal', 'details'],
  },
  {
    key: 'dev-configuration',
    title: 'Configuration Reference',
    hint: 'All environment variables, options, config files, and flags.',
    purpose: 'Comprehensive reference for tuning parameters, environment flags, and settings.',
    act: 'reference',
    required: false,
    prompts: [
      'What options can be configured via files, flags, or environment variables?',
      'What is the type, default value, and valid range for each parameter?',
      'Which options are required versus optional?',
    ],
    writingGuidance: [
      'Use parameter tables with clear column headers (Parameter, Type, Default, Description).',
      'Group related configuration options logically.',
    ],
    suggestedEvidence: ['Parameter table', 'Config file snippet'],
    suggestedBlocks: ['parameterTable', 'codeBlock', 'table'],
  },
  {
    key: 'dev-api-reference',
    title: 'API / Interface Reference',
    hint: 'Endpoints, methods, signatures, parameters, and response schemas.',
    purpose: 'Documents public functions, classes, interfaces, or REST/RPC endpoints.',
    act: 'reference',
    required: false,
    prompts: [
      'What methods, functions, or HTTP routes are exposed?',
      'What arguments or payload parameters does each accept?',
      'What data structure is returned, and what error codes can occur?',
    ],
    writingGuidance: [
      'Provide structured parameter tables detailing types, nullability, and constraints.',
      'Include sample request and response payloads.',
    ],
    suggestedEvidence: ['Interface signatures', 'Request/response payloads', 'Parameter table'],
    suggestedBlocks: ['parameterTable', 'codeBlock', 'table', 'callout'],
  },
  {
    key: 'dev-error-handling',
    title: 'Error Handling',
    hint: 'Error codes, failure modes, retry policies, and resolution patterns.',
    purpose: 'Equips developers to catch, diagnose, and handle exceptions gracefully.',
    act: 'troubleshooting',
    required: false,
    prompts: [
      'What exception types or HTTP error status codes can this system emit?',
      'Under what circumstances does each error trigger?',
      'How should client code handle or retry on failures?',
    ],
    writingGuidance: [
      'Document error structures and error codes in a reference table.',
      'Recommend specific retry, backoff, or fallback strategies.',
    ],
    suggestedEvidence: ['Error code table', 'Error handling code sample'],
    suggestedBlocks: ['table', 'callout', 'codeBlock'],
  },
  {
    key: 'dev-troubleshooting',
    title: 'Troubleshooting & FAQs',
    hint: 'Common stumbling blocks, diagnostic commands, and how to resolve them.',
    purpose: 'Saves developer time by diagnosing common failure modes and environment issues.',
    act: 'troubleshooting',
    required: false,
    prompts: [
      'What are the most frequent issues encountered during setup or runtime?',
      'What diagnostic commands or log flags pinpoint the root cause?',
      'What exact steps resolve each issue?',
    ],
    writingGuidance: [
      'Format problems as clear symptom headings followed by root cause and resolution steps.',
      'Provide copyable diagnostic commands to verify state.',
    ],
    suggestedEvidence: ['Symptom-cause-solution guide', 'Diagnostic terminal commands'],
    suggestedBlocks: ['callout', 'terminal', 'procedureSteps', 'details'],
  },
  {
    key: 'dev-resources',
    title: 'Additional Resources',
    hint: 'Official documentation links, SDK repositories, issue trackers, and community.',
    purpose: 'Points developers to upstream references, changelogs, and community channels.',
    act: 'troubleshooting',
    required: false,
    prompts: [
      'Where can developers find the official source code or package repo?',
      'Where should bug reports or feature requests be filed?',
      'Are there community channels, sample repositories, or video walkthroughs?',
    ],
    writingGuidance: [
      'Use reference lists with title, safe external URL, and context.',
      'Ensure all external links use safe https:// protocols.',
    ],
    suggestedEvidence: ['Reference list', 'External documentation links'],
    suggestedBlocks: ['referenceList', 'bulletList'],
  },
];

export const developerDocsV1: DocumentTemplate = {
  id: 'developer-docs',
  version: 1,
  name: 'Developer Documentation',
  description: 'Guides, setup instructions and implementation documentation for libraries, APIs and systems.',
  purpose: 'Helps developers understand how a product, library, API, integration or technical system works, with runnable steps and verified examples.',
  documentType: 'developer_documentation',
  audience: ['Software engineers', 'Technical writers', 'DevRel engineers', 'System architects'],
  acts: DEV_DOCS_ACTS,
  sections: DEV_DOCS_SECTIONS,
  metadataFields: DEV_DOCS_METADATA,
  recommendedBlocks: [
    'codeBlock',
    'terminal',
    'parameterTable',
    'procedureSteps',
    'callout',
    'taskList',
    'flowDiagram',
    'table',
    'referenceList',
  ],
  validationRules: DEV_DOCS_RULES,
  exportProfiles: ['pdf', 'html_zip', 'markdown', 'json_backup'],
};
