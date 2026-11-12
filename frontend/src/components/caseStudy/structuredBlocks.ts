import {Node, mergeAttributes} from '@tiptap/core';
import type {DOMOutputSpec} from '@tiptap/pm/model';
import CodeBlock from '@tiptap/extension-code-block';
import {isSafeHref, studioMediaUrl} from '@studio/shared';

/**
 * The Phase 3 blocks (docs/multi-vertical/phase-3-block-contract.md §5), as document nodes shared
 * by the editor (React node views are added on top, in editor/structuredViews.tsx) and the private
 * preview (these `renderHTML` specs, plus a few React mappings in CaseStudyArticle).
 *
 * B1: what a reader reads is content inside the block; short facts are attributes. Every
 * attribute here is listed, with its rules, in packages/shared/src/blocks/document.ts, and an
 * offline test fails if the two disagree.
 */

/** An attribute stored on the node but not written into the HTML by itself. */
const stored = (fallback: unknown, keepOnSplit = true) => ({default: fallback, rendered: false, keepOnSplit});

const PRIORITY_LABELS: Record<string, string> = {must: 'Must', should: 'Should', could: 'Could', wont: 'Won’t'};
const KEYWORD_LABELS: Record<string, string> = {given: 'Given', when: 'When', then: 'Then', and: 'And', but: 'But'};
const STORY_LABELS: Record<string, string> = {role: 'As', goal: 'I want', benefit: 'so that'};
export const SHELL_PROMPTS: Record<string, string> = {bash: '$', zsh: '%', sh: '$', powershell: 'PS>', cmd: '>'};
export {PRIORITY_LABELS, KEYWORD_LABELS, STORY_LABELS};

// ---- Code block v2 ----------------------------------------------------------------------------------

/** Code, with its language, a title, line numbers and wrapping. Highlighting is never stored. */
export const StudioCodeBlock = CodeBlock.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      title: stored(''),
      lineNumbers: stored(false),
      wrap: stored(false),
    };
  },
  renderHTML({node, HTMLAttributes}) {
    const language = String(node.attrs.language ?? '');
    const title = String(node.attrs.title ?? '');
    const pre: DOMOutputSpec = [
      'pre',
      mergeAttributes(HTMLAttributes, {'data-line-numbers': String(Boolean(node.attrs.lineNumbers)), 'data-wrap': String(Boolean(node.attrs.wrap))}),
      ['code', {class: language ? `language-${language}` : null}, 0],
    ];
    return ['figure', {class: 'cs-code', 'data-language': language || null}, ['figcaption', {class: 'cs-code-head'}, title || language || 'Code'], pre];
  },
});

// ---- Terminal ---------------------------------------------------------------------------------------

export const TerminalNode = Node.create({
  name: 'terminal',
  group: 'block',
  content: '(terminalCommand | terminalOutput)+',
  defining: true,
  isolating: true,
  draggable: true,
  addAttributes: () => ({shell: stored('bash'), prompt: stored('$')}),
  parseHTML: () => [{tag: 'div[data-block="terminal"]'}],
  renderHTML: ({node, HTMLAttributes}) => ['div', mergeAttributes(HTMLAttributes, {'data-block': 'terminal', class: 'cs-terminal', 'data-shell': String(node.attrs.shell)}), 0],
});

/** One command (the prompt is drawn, never stored in the text). */
export const TerminalCommandNode = Node.create({
  name: 'terminalCommand',
  content: 'text*',
  marks: '',
  code: true,
  defining: true,
  parseHTML: () => [{tag: 'div[data-line="command"]', preserveWhitespace: 'full'}],
  renderHTML: () => ['div', {'data-line': 'command', class: 'cs-terminal-command'}, ['code', 0]],
});

/** What a command printed. */
export const TerminalOutputNode = Node.create({
  name: 'terminalOutput',
  content: 'text*',
  marks: '',
  code: true,
  defining: true,
  parseHTML: () => [{tag: 'div[data-line="output"]', preserveWhitespace: 'full'}],
  renderHTML: () => ['div', {'data-line': 'output', class: 'cs-terminal-output'}, ['samp', 0]],
});

// ---- Parameter table --------------------------------------------------------------------------------

export const ParameterTableNode = Node.create({
  name: 'parameterTable',
  group: 'block',
  content: 'parameter+',
  defining: true,
  isolating: true,
  draggable: true,
  addAttributes: () => ({showRequired: stored(true), showDefault: stored(true)}),
  parseHTML: () => [{tag: 'div[data-block="parameterTable"]'}],
  renderHTML: ({node, HTMLAttributes}) => [
    'div',
    mergeAttributes(HTMLAttributes, {'data-block': 'parameterTable', class: 'cs-params', 'data-show-required': String(node.attrs.showRequired), 'data-show-default': String(node.attrs.showDefault)}),
    0,
  ],
});

export const ParameterNode = Node.create({
  name: 'parameter',
  content: 'paragraph+',
  defining: true,
  addAttributes: () => ({name: stored('', false), type: stored('', false), required: stored(false, false), default: stored('', false)}),
  parseHTML: () => [{tag: 'div[data-param]'}],
  renderHTML: ({node}) => [
    'div',
    {'data-param': '', class: 'cs-param'},
    [
      'div',
      {class: 'cs-param-head'},
      ['code', {class: 'cs-param-name'}, String(node.attrs.name || '—')],
      ['span', {class: 'cs-param-type'}, String(node.attrs.type ?? '')],
      ['span', {class: 'cs-param-required'}, node.attrs.required ? 'Required' : 'Optional'],
      ['span', {class: 'cs-param-default'}, node.attrs.default ? `Default: ${node.attrs.default}` : ''],
    ],
    ['div', {class: 'cs-param-description'}, 0],
  ],
});

// ---- Requirements -----------------------------------------------------------------------------------

export const RequirementListNode = Node.create({
  name: 'requirementList',
  group: 'block',
  content: 'requirement+',
  defining: true,
  isolating: true,
  draggable: true,
  parseHTML: () => [{tag: 'ol[data-block="requirementList"]'}],
  renderHTML: ({HTMLAttributes}) => ['ol', mergeAttributes(HTMLAttributes, {'data-block': 'requirementList', class: 'cs-requirements'}), 0],
});

export const RequirementNode = Node.create({
  name: 'requirement',
  content: 'paragraph+',
  defining: true,
  // A new requirement (Enter, duplicate, paste) gets its own id: see RequirementIds in the editor.
  addAttributes: () => ({reqId: stored('', false), priority: stored(null, false)}),
  parseHTML: () => [{tag: 'li[data-requirement]'}],
  renderHTML: ({node}) => [
    'li',
    {'data-requirement': '', class: 'cs-requirement', 'data-priority': node.attrs.priority ?? null},
    ['span', {class: 'cs-req-id'}, String(node.attrs.reqId || '—')],
    ' ',
    ['span', {class: 'cs-req-priority'}, PRIORITY_LABELS[String(node.attrs.priority)] ?? ''],
    ' ',
    ['div', {class: 'cs-req-text'}, 0],
  ],
});

// ---- User story -------------------------------------------------------------------------------------

export const UserStoryNode = Node.create({
  name: 'userStory',
  group: 'block',
  content: 'storyPart storyPart storyPart',
  defining: true,
  isolating: true,
  draggable: true,
  parseHTML: () => [{tag: 'div[data-block="userStory"]'}],
  renderHTML: ({HTMLAttributes}) => ['div', mergeAttributes(HTMLAttributes, {'data-block': 'userStory', class: 'cs-story'}), 0],
});

export const StoryPartNode = Node.create({
  name: 'storyPart',
  content: 'inline*',
  defining: true,
  addAttributes: () => ({part: stored('role')}),
  parseHTML: () => [{tag: 'p[data-story-part]'}],
  renderHTML: ({node}) => ['p', {'data-story-part': String(node.attrs.part), class: 'cs-story-part'}, ['span', {class: 'cs-story-label'}, STORY_LABELS[String(node.attrs.part)] ?? ''], ' ', ['span', {class: 'cs-story-text'}, 0]],
});

// ---- Acceptance criteria ----------------------------------------------------------------------------

export const AcceptanceCriteriaNode = Node.create({
  name: 'acceptanceCriteria',
  group: 'block',
  content: 'scenario+',
  defining: true,
  isolating: true,
  draggable: true,
  parseHTML: () => [{tag: 'div[data-block="acceptanceCriteria"]'}],
  renderHTML: ({HTMLAttributes}) => ['div', mergeAttributes(HTMLAttributes, {'data-block': 'acceptanceCriteria', class: 'cs-criteria'}), 0],
});

export const ScenarioNode = Node.create({
  name: 'scenario',
  content: 'scenarioStep+',
  defining: true,
  addAttributes: () => ({title: stored('', false), requirementRef: stored('', false)}),
  parseHTML: () => [{tag: 'section[data-scenario]'}],
  renderHTML: ({node}) => [
    'section',
    {'data-scenario': '', class: 'cs-scenario'},
    [
      'p',
      {class: 'cs-scenario-title'},
      ['strong', {}, node.attrs.title ? `Scenario: ${node.attrs.title}` : 'Scenario'],
      ['span', {class: 'cs-scenario-ref'}, node.attrs.requirementRef ? `Requirement ${node.attrs.requirementRef}` : ''],
    ],
    ['ul', {class: 'cs-scenario-steps'}, 0],
  ],
});

export const ScenarioStepNode = Node.create({
  name: 'scenarioStep',
  content: 'inline*',
  defining: true,
  // A new step (Enter) is an "And" step.
  addAttributes: () => ({keyword: stored('and', false)}),
  parseHTML: () => [{tag: 'li[data-keyword]'}],
  renderHTML: ({node}) => ['li', {'data-keyword': String(node.attrs.keyword), class: 'cs-scenario-step'}, ['strong', {class: 'cs-step-keyword'}, KEYWORD_LABELS[String(node.attrs.keyword)] ?? 'And'], ' ', ['span', {class: 'cs-step-text'}, 0]],
});

// ---- Testimonial ------------------------------------------------------------------------------------

export const TestimonialNode = Node.create({
  name: 'testimonial',
  group: 'block',
  content: 'paragraph+',
  defining: true,
  isolating: true,
  draggable: true,
  addAttributes: () => ({person: stored(''), role: stored(''), organisation: stored(''), consent: stored('none'), photo: stored(null)}),
  parseHTML: () => [{tag: 'figure[data-block="testimonial"]'}],
  renderHTML: ({node, HTMLAttributes}) => {
    const by = [node.attrs.role, node.attrs.organisation].filter(Boolean).join(', ');
    const photo = studioMediaUrl(node.attrs.photo);
    return [
      'figure',
      mergeAttributes(HTMLAttributes, {'data-block': 'testimonial', class: 'cs-testimonial'}),
      ['blockquote', {class: 'cs-testimonial-quote'}, 0],
      [
        'figcaption',
        {class: 'cs-testimonial-by'},
        ...(photo ? [['img', {src: photo, alt: '', class: 'cs-testimonial-photo'}] as DOMOutputSpec] : []),
        ['span', {class: 'cs-testimonial-person'}, String(node.attrs.person || '')],
        ['span', {class: 'cs-testimonial-role'}, by],
      ],
    ];
  },
});

// ---- Procedure steps --------------------------------------------------------------------------------

export const ProcedureStepsNode = Node.create({
  name: 'procedureSteps',
  group: 'block',
  content: 'procedureStep+',
  defining: true,
  isolating: true,
  draggable: true,
  parseHTML: () => [{tag: 'ol[data-block="procedureSteps"]'}],
  renderHTML: ({HTMLAttributes}) => ['ol', mergeAttributes(HTMLAttributes, {'data-block': 'procedureSteps', class: 'cs-procedure'}), 0],
});

export const ProcedureStepNode = Node.create({
  name: 'procedureStep',
  content: 'paragraph block*',
  defining: true,
  addAttributes: () => ({owner: stored('', false), expected: stored('', false)}),
  parseHTML: () => [{tag: 'li[data-step]'}],
  renderHTML: ({node}) => [
    'li',
    {'data-step': '', class: 'cs-procedure-step'},
    ['div', {class: 'cs-step-body'}, 0],
    ['p', {class: 'cs-step-owner'}, node.attrs.owner ? `Who: ${node.attrs.owner}` : ''],
    ['p', {class: 'cs-step-expected'}, node.attrs.expected ? `Expected result: ${node.attrs.expected}` : ''],
  ],
});

// ---- References -------------------------------------------------------------------------------------

export const ReferenceListNode = Node.create({
  name: 'referenceList',
  group: 'block',
  content: 'reference+',
  defining: true,
  isolating: true,
  draggable: true,
  parseHTML: () => [{tag: 'ul[data-block="referenceList"]'}],
  renderHTML: ({HTMLAttributes}) => ['ul', mergeAttributes(HTMLAttributes, {'data-block': 'referenceList', class: 'cs-references'}), 0],
});

export const ReferenceNode = Node.create({
  name: 'reference',
  content: 'inline*',
  defining: true,
  addAttributes: () => ({url: stored('', false), kind: stored('document', false)}),
  parseHTML: () => [{tag: 'li[data-reference]'}],
  renderHTML: ({node}) => {
    const url = String(node.attrs.url ?? '');
    // Only a link a reader can safely follow is a link (also cleaned by the server, B3).
    const title: DOMOutputSpec = isSafeHref(url) ? ['a', {href: url, rel: 'noopener noreferrer', target: url.startsWith('http') ? '_blank' : null}, 0] : ['span', 0];
    return ['li', {'data-reference': '', 'data-kind': String(node.attrs.kind), class: 'cs-reference'}, title];
  },
});

/** Every Phase 3 node, in the order they are registered. */
export const structuredNodes = [
  TerminalNode,
  TerminalCommandNode,
  TerminalOutputNode,
  ParameterTableNode,
  ParameterNode,
  RequirementListNode,
  RequirementNode,
  UserStoryNode,
  StoryPartNode,
  AcceptanceCriteriaNode,
  ScenarioNode,
  ScenarioStepNode,
  TestimonialNode,
  ProcedureStepsNode,
  ProcedureStepNode,
  ReferenceListNode,
  ReferenceNode,
];
