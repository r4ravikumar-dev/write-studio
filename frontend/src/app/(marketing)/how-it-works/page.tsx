import type {Metadata} from 'next';
import NextLink from 'next/link';
import {ArrowRight, CheckCircle2, Circle, GripVertical, Lightbulb} from 'lucide-react';
import {StickyStory, type StoryStep} from '@/components/marketing/motion/StickyStory';

export const metadata: Metadata = {
  title: 'How Write Studio Works — From Template to Document',
  description:
    'Learn how to choose a template, structure your document, write with contextual guidance and create clear content in Write Studio.',
  alternates: {
    canonical: '/how-it-works',
  },
};

/*
 * Small product states, one per step. Each mirrors a real Studio surface (template library,
 * Details step, story outline, Guide panel, "/" menu, review and export) using the Feature
 * Specification template's own names, fields, questions and checks. Nothing here is a feature
 * the Studio lacks.
 */

function TemplateLibraryVisual() {
  const types = [
    {name: 'Feature specification', sub: 'Behaviour, requirements and acceptance criteria'},
    {name: 'Technical design document', sub: 'An architecture, its trade-offs and how it will be built'},
    {name: 'Developer documentation', sub: 'Guides, setup instructions and implementation documentation'},
    {name: 'Procedure or playbook', sub: 'A process someone else can follow, step by step'},
  ];
  return (
    <div className="m-demo">
      <p className="m-demo-heading">Template library</p>
      <div className="m-cluster">
        <span className="m-badge m-badge--brand">Product &amp; Engineering</span>
        <span className="m-badge">Marketing &amp; Growth</span>
        <span className="m-badge">Design &amp; Research</span>
        <span className="m-badge">Operations &amp; Knowledge</span>
      </div>
      <ul className="m-demo-list">
        {types.map((type, index) => (
          <li key={type.name} className="m-demo-row" data-current={index === 0 ? '' : undefined}>
            <span>
              <span className="m-row-title">{type.name}</span>
              <span className="m-row-sub">{type.sub}</span>
            </span>
            {index === 0 && <span className="m-badge m-badge--brand">Selected</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

function DetailsVisual() {
  const fields = [
    {label: 'Feature name', value: 'Bulk document export'},
    {label: 'Target release', value: 'v2.4'},
    {label: 'Status', value: 'Draft'},
    {label: 'Feature owner / PM', value: 'Priya Shah'},
    {label: 'Engineering lead', value: 'Tom Okafor'},
  ];
  return (
    <div className="m-demo">
      <p className="m-demo-heading">Details · Feature specification</p>
      <ul className="m-demo-list">
        {fields.map(field => (
          <li key={field.label} className="m-demo-row">
            <span className="m-caption">{field.label}</span>
            <span className="m-row-title">{field.value}</span>
          </li>
        ))}
      </ul>
      <p className="m-caption">Every field is optional. Add more details as your draft takes shape.</p>
    </div>
  );
}

function OutlineVisual() {
  const sections = [
    'Feature Overview',
    'Problem Statement',
    'Objectives & Non-goals',
    'User Stories',
    'Functional Requirements',
    'Acceptance Criteria',
  ];
  return (
    <div className="m-demo">
      <p className="m-demo-heading">Story outline</p>
      <ol className="m-demo-list">
        {sections.map((name, index) => (
          <li key={name} className="m-demo-row" data-current={index === 3 ? '' : undefined}>
            <span className="m-hiw-row-lead">
              <GripVertical size={16} aria-hidden="true" className="m-hiw-grip" />
              {name}
            </span>
            {index === 3 && <span className="m-badge m-badge--brand">Moving</span>}
          </li>
        ))}
      </ol>
      <p className="m-caption">Drag a section, or use Move up and Move down in its menu.</p>
    </div>
  );
}

function GuideVisual() {
  const questions = [
    'What is being proposed?',
    'Who is the target user and what is the primary benefit?',
    'What is the targeted timeline or release milestone?',
  ];
  return (
    <div className="m-demo">
      <p className="m-demo-heading m-demo-heading--brand">Guide · Feature Overview</p>
      <p className="m-text-sm">Questions to answer</p>
      <ul className="m-demo-list">
        {questions.map(question => (
          <li key={question} className="m-demo-row m-demo-row--text">
            {question}
          </li>
        ))}
      </ul>
      <p className="m-demo-tip">
        <Lightbulb size={16} aria-hidden="true" />
        Blocks that work here: callout, bullet list.
      </p>
    </div>
  );
}

function InsertVisual() {
  const blocks = [
    {name: 'Requirements', sub: 'Numbered requirements, each with a priority.'},
    {name: 'User story', sub: 'As a …, I want …, so that ….'},
    {name: 'Acceptance criteria', sub: 'Scenarios as Given, When, Then.'},
  ];
  return (
    <div className="m-demo">
      <code className="m-demo-code">/requ</code>
      <p className="m-demo-heading">Recommended for “Functional Requirements”</p>
      <ul className="m-demo-list">
        {blocks.map((block, index) => (
          <li key={block.name} className="m-demo-row" data-current={index === 0 ? '' : undefined}>
            <span>
              <span className="m-row-title">{block.name}</span>
              <span className="m-row-sub">{block.sub}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ReviewVisual() {
  const checks = [
    {name: 'Feature overview', done: true},
    {name: 'Problem and context', done: true},
    {name: 'Objectives and scope', done: true},
    {name: 'Requirements and stories', done: true},
    {name: 'Acceptance criteria', done: false},
  ];
  return (
    <div className="m-demo">
      <p className="m-demo-heading">Review checklist</p>
      <ul className="m-demo-list">
        {checks.map(check => (
          <li key={check.name} className="m-demo-row">
            <span className={check.done ? 'm-demo-check' : 'm-hiw-row-lead'}>
              {check.done ? (
                <CheckCircle2 size={16} aria-hidden="true" />
              ) : (
                <Circle size={16} aria-hidden="true" className="m-hiw-grip" />
              )}
              {check.name}
            </span>
            <span className={check.done ? 'm-badge m-badge--success' : 'm-badge m-badge--warning'}>
              {check.done ? 'Done' : 'To do'}
            </span>
          </li>
        ))}
      </ul>
      <p className="m-demo-heading">Export</p>
      <div className="m-cluster">
        <span className="m-badge">PDF</span>
        <span className="m-badge">HTML</span>
        <span className="m-badge">Markdown</span>
        <span className="m-badge">JSON backup</span>
      </div>
    </div>
  );
}

const STEPS = [
  {
    step: '01',
    id: 'step-document-type',
    title: 'Choose your document type',
    copy: 'Select what you want to create. Write Studio starts you with a purpose-built template designed for that kind of document — whether a technical design, developer guide, PRD, or UX case study.',
    details: [
      '9 document types across engineering, product, design, marketing and operations.',
      'No more adapting generic note-taking pages to complex technical specs.',
      'Instantly previews suggested section counts and validation checklists.',
    ],
    visual: <TemplateLibraryVisual />,
  },
  {
    step: '02',
    id: 'step-context',
    title: 'Add project context',
    copy: 'Provide the important background information up front. You can define target roles, timelines, constraints and objectives, or add more details as your draft takes shape.',
    details: [
      'Detail fields that fit the template, such as target release, feature owner and engineering lead.',
      'Every field is optional: add details now or as your draft takes shape.',
      'Everything saved securely and privately in your workspace.',
    ],
    visual: <DetailsVisual />,
  },
  {
    step: '03',
    id: 'step-structure',
    title: 'Build your structure',
    copy: 'Review the suggested sections. Keep the recommended narrative arc, reorder headings to match your workflow, rename sections, or add bespoke ones to fit your project.',
    details: [
      'Visual story outline gives you a clear bird’s-eye view of your document.',
      'Drag-and-drop or keyboard-accessible reordering of sections.',
      'Add your own sections alongside the suggested ones.',
    ],
    visual: <OutlineVisual />,
  },
  {
    step: '04',
    id: 'step-guidance',
    title: 'Write with guidance',
    copy: 'Use section-level questions and writing guidance to communicate your ideas clearly. Each section highlights the specific questions your readers need answered.',
    details: [
      'Targeted prompts for every section: problem framing, data flows, acceptance criteria.',
      'Eliminates blank-page anxiety and writer’s block.',
      'Non-prescriptive: prompts serve as guides while you retain complete editorial freedom.',
    ],
    visual: <GuideVisual />,
  },
  {
    step: '05',
    id: 'step-compose',
    title: 'Compose your content',
    copy: 'Add images, tables, code examples, diagrams and other supported content where they help explain the story. Insert rich blocks naturally using the slash command menu.',
    details: [
      '38 content blocks, including Code block, Terminal, Parameter table, Requirements and Given/When/Then acceptance criteria.',
      'Attributed testimonials, metric cards, device mockups and before/after comparisons.',
      'Keyboard-first slash menu (/) that keeps you in writing flow.',
    ],
    visual: <InsertVisual />,
  },
  {
    step: '06',
    id: 'step-review',
    title: 'Review your document',
    copy: 'Check the structure, refine the content and preview the result. Run the pre-flight story review checklist to catch missing details, and export to PDF, HTML, or Markdown.',
    details: [
      'Deterministic checklist checks for complete sections and evidence.',
      'Presentation profiles (editorial, technical, product, changelog, procedure).',
      'Export to PDF (through your browser’s print dialog), standalone HTML, Markdown or a full JSON backup.',
    ],
    visual: <ReviewVisual />,
  },
];

const STORY: StoryStep[] = STEPS.map(item => ({
  id: item.id,
  eyebrow: `Step ${item.step}`,
  title: item.title,
  body: (
    <div className="m-stack">
      <p className="m-text">{item.copy}</p>
      <ul className="m-checklist">
        {item.details.map(detail => (
          <li key={detail}>{detail}</li>
        ))}
      </ul>
    </div>
  ),
  visual: item.visual,
}));

export default function HowItWorksPage() {
  return (
    <div className="marketing-how-it-works">
      {/* Hero */}
      <section className="m-section-hero">
        <div className="m-container">
          <div className="m-hero-head">
            <span className="m-eyebrow">Creation Workflow</span>
            <h1 className="m-title-display">A clearer way to create professional documents.</h1>
            <p className="m-subtitle">
              From choosing the right structure to refining the final draft, Write Studio gives you a focused process
              for creating documents that make sense.
            </p>
            <div className="m-actions">
              <NextLink href="/templates" className="m-btn m-btn-primary m-btn-lg">
                <span>Choose a template</span>
                <ArrowRight size={18} aria-hidden="true" />
              </NextLink>
            </div>
          </div>
        </div>
      </section>

      {/* Steps: sticky story */}
      <section className="m-section m-section--muted" aria-labelledby="hiw-steps-heading">
        <div className="m-container">
          <h2 id="hiw-steps-heading" className="sr-only">
            The six steps
          </h2>
          <StickyStory steps={STORY} label="The six steps" />
        </div>
      </section>

      {/* Closing CTA */}
      <section className="m-section">
        <div className="m-container">
          <div className="m-banner-cta">
            <h2>Your next document doesn&apos;t have to start from a blank page.</h2>
            <p>
              Experience a guided, structured process that transforms your thinking into polished technical, product,
              or operational documents.
            </p>
            <NextLink href="/templates" className="m-btn m-btn-inverse m-btn-lg">
              <span>Choose a template</span>
              <ArrowRight size={18} aria-hidden="true" />
            </NextLink>
          </div>
        </div>
      </section>
    </div>
  );
}
