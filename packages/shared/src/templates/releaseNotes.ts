import type {DocumentTemplate, MetadataField, TemplateSection, ValidationRule} from './types';

/**
 * Release Notes and Changelog v1 template (Release 1, Phase 4).
 * Supports product managers, software engineers, devrel and release managers in communicating
 * version releases, new features, improvements, bug fixes, breaking changes, and migration steps.
 */

const RELEASE_NOTES_ACTS: Record<string, string> = {
  header: 'Release summary',
  changes: 'Changes & fixes',
  upgrade: 'Breaking changes & upgrade',
  details: 'Compatibility & resources',
};

const RELEASE_NOTES_METADATA: MetadataField[] = [
  {key: 'product_name', label: 'Product name', description: 'The product, platform or service being released.', kind: 'text', max: 200, storage: 'metadata'},
  {key: 'release_version', label: 'Version', description: 'Semantic version or release code (e.g. v2.4.0, 2026.11).', kind: 'text', max: 100, storage: 'metadata'},
  {key: 'release_date', label: 'Release date', description: 'Date of publication or rollout (e.g. 2026-11-12).', kind: 'text', max: 100, storage: 'metadata'},
  {key: 'release_channel', label: 'Release channel', description: 'Stable, Beta, Early Access, or LTS.', kind: 'text', max: 100, storage: 'metadata'},
  {key: 'target_platforms', label: 'Platforms / targets', description: 'Supported platforms (e.g. Web, macOS, Linux, iOS).', kind: 'text', max: 200, storage: 'metadata'},
];

const RELEASE_NOTES_RULES: ValidationRule[] = [
  {key: 'header', label: 'Version and release date', description: 'Product name, release version and release date clearly identified.', check: 'section', sections: ['rel-header']},
  {key: 'overview', label: 'Release overview', description: 'High-level summary of the highlights in this release.', check: 'section', sections: ['rel-overview']},
  {key: 'changes', label: 'Features, improvements or fixes', description: 'Specific details on what was added, changed or resolved.', check: 'section', sections: ['rel-features', 'rel-improvements', 'rel-fixes']},
  {key: 'migration', label: 'Migration or upgrade path', description: 'Actionable upgrade instructions when breaking changes exist.', check: 'section', sections: ['rel-breaking-changes', 'rel-migration']},
  {key: 'evidence', label: 'Release artifacts or code', description: 'Screenshots, terminal commands, code snippets or comparison tables documenting changes.', check: 'evidence'},
];

const RELEASE_NOTES_SECTIONS: TemplateSection[] = [
  {
    key: 'rel-header',
    title: 'Release Header',
    hint: 'Product name, version badge, release date, and channel.',
    purpose: 'Sets immediate context on what version is released, on which date, and for which target audience.',
    act: 'header',
    required: true,
    covers: 'header',
    prompts: [
      'What product and version is this release?',
      'What is the release date and channel (Stable, Beta, LTS)?',
      'What are the headline highlights in one sentence?',
    ],
    writingGuidance: [
      'Always state explicit version numbers (e.g. v2.4.0) and ISO release dates.',
      'Highlight whether this is a major, minor, or patch release.',
    ],
    suggestedEvidence: ['Version badge', 'Release date confirmation'],
    suggestedBlocks: ['callout', 'paragraph'],
    completionCriteria: ['Version, release date, and channel are specified.'],
  },
  {
    key: 'rel-overview',
    title: 'Release Overview',
    hint: 'Executive summary of key themes and marquee updates.',
    purpose: 'Summarises the main themes of the release for users and stakeholders.',
    act: 'header',
    required: true,
    covers: 'overview',
    prompts: [
      'What are the primary themes or focal points of this release?',
      'Why do these changes matter to users or developers?',
      'What is the overarching value delivered?',
    ],
    writingGuidance: [
      'Focus on user impact rather than internal refactorings.',
      'Link to dedicated deep-dive sections or documentation where appropriate.',
    ],
    suggestedEvidence: ['Release summary callout', 'Highlight bullet points'],
    suggestedBlocks: ['paragraph', 'callout', 'bulletList'],
    completionCriteria: ['Clear summary of release highlights provided.'],
  },
  {
    key: 'rel-features',
    title: 'New Features',
    hint: 'Major capabilities introduced in this release.',
    purpose: 'Showcases new capabilities, how to use them, and why they matter.',
    act: 'changes',
    required: false,
    covers: 'changes',
    prompts: [
      'What new features or capabilities are included in this release?',
      'How does a user or developer enable and use them?',
      'What benefits do they unlock?',
    ],
    writingGuidance: [
      'Provide concise descriptions with screenshots or code samples.',
      'Include links to documentation guides for full details.',
    ],
    suggestedEvidence: ['Feature screenshots', 'Code snippets', 'CLI commands'],
    suggestedBlocks: ['codeBlock', 'imageGrid', 'callout', 'bulletList'],
  },
  {
    key: 'rel-improvements',
    title: 'Improvements & Enhancements',
    hint: 'Performance gains, UX refinements, and ergonomic updates.',
    purpose: 'Highlights polish, optimizations, and incremental enhancements.',
    act: 'changes',
    required: false,
    covers: 'changes',
    prompts: [
      'What existing workflows are now faster, cleaner, or more reliable?',
      'What performance benchmarks or memory reductions were achieved?',
      'What subtle usability improvements were made?',
    ],
    writingGuidance: [
      'Highlight concrete benchmarks (e.g. "35% faster cold start") whenever possible.',
    ],
    suggestedEvidence: ['Performance benchmark numbers', 'Before/after comparisons'],
    suggestedBlocks: ['comparison', 'bulletList', 'table'],
  },
  {
    key: 'rel-fixes',
    title: 'Bug Fixes',
    hint: 'Resolved issues, bug IDs, and regression fixes.',
    purpose: 'Lists issues that were resolved, along with affected components and ticket references.',
    act: 'changes',
    required: false,
    covers: 'changes',
    prompts: [
      'What specific bugs or crashes were resolved?',
      'Which components or platforms were affected?',
      'Are there public issue tracker IDs or PR numbers to reference?',
    ],
    writingGuidance: [
      'Format concisely: [Component] Fixed issue where X happened under condition Y (#1234).',
      'Avoid vague entries like "various bug fixes".',
    ],
    suggestedEvidence: ['Issue IDs', 'Resolved symptoms list'],
    suggestedBlocks: ['bulletList', 'table'],
  },
  {
    key: 'rel-breaking-changes',
    title: 'Breaking Changes',
    hint: 'Incompatible changes, removed APIs, or behavioural shifts.',
    purpose: 'Alerts developers to breaking changes with clear impact and required actions.',
    act: 'upgrade',
    required: false,
    covers: 'migration',
    prompts: [
      'What interfaces, methods, or configurations changed incompatibly?',
      'What is the impact if a user does not update their code?',
      'What exact action must the user take to adapt?',
    ],
    writingGuidance: [
      'Use high-visibility warning callouts for breaking changes.',
      'Provide side-by-side Before/After code snippets showing the necessary update.',
    ],
    suggestedEvidence: ['Before/after code samples', 'Breaking change callout'],
    suggestedBlocks: ['callout', 'codeBlock', 'table'],
  },
  {
    key: 'rel-migration',
    title: 'Migration Instructions',
    hint: 'Step-by-step upgrade guide and codemods.',
    purpose: 'Provides a clear, ordered procedure to upgrade smoothly from the previous version.',
    act: 'upgrade',
    required: false,
    covers: 'migration',
    prompts: [
      'What are the ordered steps to upgrade to this release?',
      'Are there automated codemods or CLI migration commands?',
      'How can developers test their upgrade for regressions?',
    ],
    writingGuidance: [
      'Structure as numbered procedure steps with verifiable checkpoints.',
      'Provide exact shell commands to install and run migrations.',
    ],
    suggestedEvidence: ['Numbered upgrade steps', 'Terminal commands'],
    suggestedBlocks: ['procedureSteps', 'terminal', 'taskList'],
  },
  {
    key: 'rel-deprecations',
    title: 'Deprecations',
    hint: 'Features marked for future removal with replacement recommendations.',
    purpose: 'Informs users about APIs scheduled for deprecation and their recommended replacements.',
    act: 'upgrade',
    required: false,
    prompts: [
      'What functions, flags, or features are deprecated in this release?',
      'What is the recommended replacement or migration target?',
      'When is complete removal scheduled (e.g. next major version)?',
    ],
    writingGuidance: [
      'State the target version for eventual removal so users can plan ahead.',
      'Link directly to the new replacement pattern.',
    ],
    suggestedEvidence: ['Deprecations table', 'Replacement guide'],
    suggestedBlocks: ['table', 'callout'],
  },
  {
    key: 'rel-known-issues',
    title: 'Known Issues',
    hint: 'Known bugs or limitations in this build with available workarounds.',
    purpose: 'Maintains transparency by documenting known issues and interim workarounds.',
    act: 'details',
    required: false,
    prompts: [
      'What known bugs or edge cases exist in this release?',
      'What platforms or environments are affected?',
      'What is the recommended workaround until a patch is released?',
    ],
    writingGuidance: [
      'Be candid about limitations and provide immediate workarounds.',
    ],
    suggestedEvidence: ['Known issues callout', 'Workaround commands'],
    suggestedBlocks: ['callout', 'bulletList'],
  },
  {
    key: 'rel-compatibility',
    title: 'Compatibility Matrix',
    hint: 'Supported OS, browser, database, runtime, and dependency versions.',
    purpose: 'Defines exact platform, dependency, and runtime compatibility bounds.',
    act: 'details',
    required: false,
    prompts: [
      'What versions of runtimes (Node, Python, Java), OSs, or databases are supported?',
      'What peer dependencies or package versions are required?',
      'Are there any dropped platforms or minimum version bumps?',
    ],
    writingGuidance: [
      'Present as a clean matrix table with status indicators (Supported, Deprecated, Unsupported).',
    ],
    suggestedEvidence: ['Compatibility matrix table'],
    suggestedBlocks: ['table', 'callout'],
  },
  {
    key: 'rel-resources',
    title: 'Resources & Support',
    hint: 'Documentation links, release assets, npm/crates packages, and discussion channels.',
    purpose: 'Directs users to download binaries, package registries, documentation, and support.',
    act: 'details',
    required: false,
    prompts: [
      'Where can users download artifacts or install packages?',
      'Where can developers ask questions or report regressions?',
      'Where can full changelogs or git diffs be inspected?',
    ],
    writingGuidance: [
      'Use reference lists with direct links to release tags and package registries.',
    ],
    suggestedEvidence: ['Reference list', 'Download links'],
    suggestedBlocks: ['referenceList', 'bulletList'],
  },
];

export const releaseNotesV1: DocumentTemplate = {
  id: 'release-notes',
  version: 1,
  name: 'Release Notes and Changelog',
  description: 'What changed in a release: features, improvements, fixes, breaking changes and migration steps.',
  purpose: 'Communicates changes, improvements, fixes, breaking changes and upgrade steps to users, developers and teams.',
  documentType: 'release_notes',
  audience: ['Product managers', 'Software engineers', 'DevRel teams', 'Release managers', 'Support teams'],
  acts: RELEASE_NOTES_ACTS,
  sections: RELEASE_NOTES_SECTIONS,
  metadataFields: RELEASE_NOTES_METADATA,
  recommendedBlocks: [
    'callout',
    'codeBlock',
    'terminal',
    'procedureSteps',
    'table',
    'bulletList',
    'orderedList',
    'referenceList',
    'imageGrid',
  ],
  validationRules: RELEASE_NOTES_RULES,
  exportProfiles: ['pdf', 'html_zip', 'markdown', 'json_backup'],
};
