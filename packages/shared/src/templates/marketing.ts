import type {DocumentType, TemplateCategory} from './types';
import {CURRENT_TEMPLATES} from './index';

export type TemplateMarketingMetadata = {
  slug: string;
  templateId: string;
  documentType: DocumentType;
  name: string;
  category: TemplateCategory;
  categoryLabel: string;
  tagline: string;
  description: string;
  audience: string[];
  status: 'active' | 'coming_soon';
  marketingTitle: string;
  marketingDescription: string;
  heroHeadline: string;
  heroCopy: string;
  whatItHelpsCreate: string;
  suggestedSections: string[];
  supportedBlocks: string[];
  sampleHighlights: string[];
  relatedSlugs: string[];
};

/**
 * Section titles come from the real template, so the marketing outline can never drift
 * from what the Studio creates. Read lazily: this module and ./index import each other.
 */
function sectionTitles(templateId: string): string[] {
  return CURRENT_TEMPLATES.find(template => template.id === templateId)?.sections.map(section => section.title) ?? [];
}

export const MARKETING_TEMPLATES: readonly TemplateMarketingMetadata[] = [
  {
    slug: 'developer-documentation',
    templateId: 'developer-docs',
    documentType: 'developer_documentation',
    name: 'Developer Documentation',
    category: 'product_engineering',
    categoryLabel: 'Product & Engineering',
    tagline: 'Write documentation developers can follow.',
    description: 'Create clear technical guides, setup instructions and implementation documentation with a structure designed for developers.',
    audience: ['Developers', 'Technical writers', 'Engineering teams', 'DevRel'],
    status: 'active',
    marketingTitle: 'Developer Documentation Template — Write Studio',
    marketingDescription: 'Create setup guides, technical documentation and developer resources with a structured template.',
    heroHeadline: 'Write documentation developers can follow.',
    heroCopy: 'Create clear technical guides, setup instructions and implementation documentation with a structure designed for developers. Explain concepts, document configurations and present code examples in one organised workspace.',
    whatItHelpsCreate: 'A useful developer guide should help readers understand what they need, what to do and what to expect. Explain concepts, document configurations and present code examples in one organised workspace.',
    get suggestedSections() {
      return sectionTitles(this.templateId);
    },
    supportedBlocks: [
      'Code block with syntax highlighting and line numbers',
      'Terminal with commands and output',
      'API endpoint and parameter tables',
      'Callouts and flow diagrams',
    ],
    sampleHighlights: [
      'Acme Payments SDK Webhook Guide with real HMAC signatures',
      'Structured configuration tables and environment settings',
      'Ready-to-run curl and Node.js code snippets',
    ],
    relatedSlugs: ['feature-specification', 'technical-design', 'adr', 'release-notes'],
  },
  {
    slug: 'feature-specification',
    templateId: 'feature-spec',
    documentType: 'feature_specification',
    name: 'Feature Specification',
    category: 'product_engineering',
    categoryLabel: 'Product & Engineering',
    tagline: 'Turn feature ideas into clear specifications.',
    description: 'Document what a feature should do, who it is for and how the team will know it is complete.',
    audience: ['Product managers', 'Engineering leads', 'Designers', 'QA engineers'],
    status: 'active',
    marketingTitle: 'Feature Specification Template — Write Studio',
    marketingDescription: 'Organise feature goals, user stories, requirements and acceptance criteria.',
    heroHeadline: 'Turn feature ideas into clear specifications.',
    heroCopy: 'Document what a feature should do, who it is for and how the team will know it is complete. Bring objectives, user stories, functional requirements, user flows and acceptance criteria together in one structured document.',
    whatItHelpsCreate: 'Create a specification that helps product, design and engineering understand the same problem, target users and intended system behaviour.',
    get suggestedSections() {
      return sectionTitles(this.templateId);
    },
    supportedBlocks: [
      'User stories (As a / I want / so that)',
      'Requirements with IDs and priorities (FR-1, FR-2)',
      'Acceptance criteria (Given / When / Then)',
      'Flow diagrams and callouts',
    ],
    sampleHighlights: [
      'Workspace Member Invitation feature spec with Gherkin acceptance criteria',
      'Role-based permission tables and rate limit requirements',
      'Multi-tenant security checks and rollout phases',
    ],
    relatedSlugs: ['product-requirements', 'technical-design', 'developer-documentation'],
  },
  {
    slug: 'release-notes',
    templateId: 'release-notes',
    documentType: 'release_notes',
    name: 'Release Notes',
    category: 'product_engineering',
    categoryLabel: 'Product & Engineering',
    tagline: 'Make every product update easier to understand.',
    description: "Create organised release notes that explain what's new, what changed and what users need to know.",
    audience: ['Product teams', 'Engineering teams', 'Release managers', 'Support teams'],
    status: 'active',
    marketingTitle: 'Release Notes Template — Write Studio',
    marketingDescription: 'Create organised software release notes covering features, improvements and fixes.',
    heroHeadline: 'Make every product update easier to understand.',
    heroCopy: "Create organised release notes that explain what's new, what changed and what users need to know. Group features, improvements, fixes and breaking changes into a clear release document.",
    whatItHelpsCreate: 'Start from a repeatable structure and communicate software updates consistently to users, customers and internal stakeholders.',
    get suggestedSections() {
      return sectionTitles(this.templateId);
    },
    supportedBlocks: [
      'Callouts for breaking changes',
      'Images and image grids for new features',
      'Code blocks for migration steps',
      'Tables for compatibility',
    ],
    sampleHighlights: [
      'Write Studio v2.4.0 Release Notes with multi-vertical changelog',
      'Breaking change migration guides with before-and-after syntax',
      'Browser and node runtime compatibility matrix',
    ],
    relatedSlugs: ['developer-documentation', 'feature-specification'],
  },
  {
    slug: 'marketing-case-study',
    templateId: 'marketing-case-study',
    documentType: 'marketing_case_study',
    name: 'Marketing Case Study',
    category: 'marketing_growth',
    categoryLabel: 'Marketing & Growth',
    tagline: 'Show the impact behind your work.',
    description: 'Turn campaigns, client engagements and customer success stories into compelling marketing case studies.',
    audience: ['Marketing leads', 'Content strategists', 'Growth teams', 'Agency founders'],
    status: 'active',
    marketingTitle: 'Marketing Case Study Template — Write Studio',
    marketingDescription: 'Document customer challenges, marketing strategies and measurable results.',
    heroHeadline: 'Show the impact behind your work.',
    heroCopy: 'Turn campaigns, client engagements and customer success stories into compelling marketing case studies. Explain the challenge, present your strategy, show what you delivered and communicate the results with clear evidence.',
    whatItHelpsCreate: 'Tell the complete customer story with context, strategy, execution and verified metrics that prove tangible business value.',
    get suggestedSections() {
      return sectionTitles(this.templateId);
    },
    supportedBlocks: [
      'Metrics for headline results',
      'Testimonials with photo, role, organisation and permission status',
      'Before-and-after comparisons',
      'Image grids and pull quotes',
    ],
    sampleHighlights: [
      'Apex Financial B2B Demand Generation Case Study',
      'Enterprise pipeline growth metrics with audit sources',
      'Executive testimonial with verified attribution',
    ],
    relatedSlugs: ['ux-case-study', 'feature-specification'],
  },
  {
    slug: 'product-requirements',
    templateId: 'prd',
    documentType: 'product_requirements_document',
    name: 'Product Requirements Document',
    category: 'product_engineering',
    categoryLabel: 'Product & Engineering',
    tagline: 'Give your product ideas a clear direction.',
    description: 'Bring product context, user needs, goals, requirements and success metrics into one structured Product Requirements Document.',
    audience: ['Product managers', 'Founders', 'Product leads', 'Cross-functional teams'],
    status: 'active',
    marketingTitle: 'Product Requirements Document Template — Write Studio',
    marketingDescription: 'Structure product goals, user needs, requirements and success metrics.',
    heroHeadline: 'Give your product ideas a clear direction.',
    heroCopy: 'Bring product context, user needs, goals, requirements and success metrics into one structured Product Requirements Document. Create a shared reference for the decisions and outcomes that guide product development.',
    whatItHelpsCreate: 'Align engineering, design and leadership on the core problem, user personas, functional scope, release boundaries and success criteria.',
    get suggestedSections() {
      return sectionTitles(this.templateId);
    },
    supportedBlocks: [
      'Requirements with priorities',
      'Metrics for success targets',
      'Research insights',
      'Process timelines and callouts',
    ],
    sampleHighlights: [
      'Collaborative Document Review PRD with end-to-end user journeys',
      'Categorised functional requirements (P0/P1/P2)',
      'Success criteria tied to adoption and satisfaction metrics',
    ],
    relatedSlugs: ['feature-specification', 'technical-design', 'adr'],
  },
  {
    slug: 'technical-design',
    templateId: 'technical-design',
    documentType: 'technical_design_document',
    name: 'Technical Design Document',
    category: 'product_engineering',
    categoryLabel: 'Product & Engineering',
    tagline: 'Explain the architecture before the build begins.',
    description: 'Document technical approaches, system components, data flows and important implementation decisions in a clear, reusable structure.',
    audience: ['Software architects', 'Staff engineers', 'Tech leads', 'Engineering managers'],
    status: 'active',
    marketingTitle: 'Technical Design Document Template — Write Studio',
    marketingDescription: 'Document software architecture, data flows, APIs and technical decisions.',
    heroHeadline: 'Explain the architecture before the build begins.',
    heroCopy: 'Document technical approaches, system components, data flows and important implementation decisions in a clear, reusable structure. Make complex architecture easier for engineering teams to understand and review.',
    whatItHelpsCreate: 'Clarify system components, API contracts, schema models, performance thresholds and operational failure modes before writing code.',
    get suggestedSections() {
      return sectionTitles(this.templateId);
    },
    supportedBlocks: [
      'Flow diagrams',
      'API endpoints with method badges and request/response schemas',
      'Tables and parameter tables',
      'Code blocks and callouts',
    ],
    sampleHighlights: [
      'Distributed Real-Time Sync Engine design document',
      'Websocket gateway sequence diagrams and recovery protocols',
      'PostgreSQL schema migrations with benchmark data',
    ],
    relatedSlugs: ['adr', 'developer-documentation', 'feature-specification'],
  },
  {
    slug: 'adr',
    templateId: 'adr',
    documentType: 'architecture_decision_record',
    name: 'Architecture Decision Record',
    category: 'product_engineering',
    categoryLabel: 'Product & Engineering',
    tagline: 'Make important technical decisions clear.',
    description: 'Record the context, options, reasoning and consequences behind important engineering decisions.',
    audience: ['Principal engineers', 'Engineering teams', 'Architects', 'CTOs'],
    status: 'active',
    marketingTitle: 'Architecture Decision Record Template — Write Studio',
    marketingDescription: 'Record context, options, reasoning and consequences behind technical decisions.',
    heroHeadline: 'Make important technical decisions clear.',
    heroCopy: 'Record the context, options, reasoning and consequences behind important engineering decisions. Create concise Architecture Decision Records that teams can understand and refer back to as systems evolve.',
    whatItHelpsCreate: 'Capture why a technical choice was made, what trade-offs were accepted, and what alternatives were evaluated so teams preserve institutional memory.',
    get suggestedSections() {
      return sectionTitles(this.templateId);
    },
    supportedBlocks: [
      'Callouts for the decision and its status',
      'Tables for comparing options',
      'Bulleted lists for consequences',
      'References to RFCs and benchmarks',
    ],
    sampleHighlights: [
      'ADR-004: Adopting WebSocket over HTTP Polling for Real-Time State',
      'Detailed pros/cons breakdown of SSE vs gRPC vs WebSocket',
      'Documented operational costs and fallback policies',
    ],
    relatedSlugs: ['technical-design', 'developer-documentation'],
  },
  {
    slug: 'sop',
    templateId: 'sop',
    documentType: 'standard_operating_procedure',
    name: 'Standard Operating Procedure (SOP)',
    category: 'operations_knowledge',
    categoryLabel: 'Operations & Knowledge',
    tagline: 'Turn repeatable work into clear processes.',
    description: 'Create step-by-step procedures that help teams understand what to do, who is responsible and how to handle exceptions.',
    audience: ['Operations teams', 'Support leads', 'IT administrators', 'DevOps engineers'],
    status: 'active',
    marketingTitle: 'SOP Template — Write Studio',
    marketingDescription: 'Create practical standard operating procedures and process documentation.',
    heroHeadline: 'Turn repeatable work into clear processes.',
    heroCopy: 'Create step-by-step procedures that help teams understand what to do, who is responsible and how to handle exceptions. Organise operational knowledge into clear, practical documents.',
    whatItHelpsCreate: 'Standardise team execution, reduce onboarding friction, eliminate procedural errors and document escalation paths.',
    get suggestedSections() {
      return sectionTitles(this.templateId);
    },
    supportedBlocks: [
      'Procedure steps with who does them and the expected result',
      'Checklists',
      'Tables for escalation contacts',
      'Callouts for warnings',
    ],
    sampleHighlights: [
      'Production Incident Sev-1 Triage and Recovery SOP',
      'Role assignment matrix (Incident Commander, Comms Lead, SRE)',
      'Time-boxed escalation thresholds and customer comms templates',
    ],
    relatedSlugs: ['developer-documentation', 'release-notes'],
  },
  {
    slug: 'ux-case-study',
    templateId: 'product-ux',
    documentType: 'ux_case_study',
    name: 'UX Case Study',
    category: 'design_research',
    categoryLabel: 'Design & Research',
    tagline: 'Show the thinking behind the experience.',
    description: 'Document the problem, research, decisions and design process behind your product work.',
    audience: ['Product designers', 'UX researchers', 'Design leaders', 'Interaction designers'],
    status: 'active',
    marketingTitle: 'UX Case Study Template — Write Studio',
    marketingDescription: 'Structure your UX process, design decisions and product outcomes.',
    heroHeadline: 'Show the thinking behind the experience.',
    heroCopy: 'Document the problem, research, decisions and design process behind your product work. Create UX case studies that explain not only what you designed, but why you made the decisions you did.',
    whatItHelpsCreate: 'Take readers through your entire design narrative: from initial discovery and user testing to design iterations and measured product outcomes.',
    get suggestedSections() {
      return sectionTitles(this.templateId);
    },
    supportedBlocks: [
      'Device mockups (phone, tablet, laptop, browser)',
      'Before-and-after comparisons with a slider',
      'Research insights',
      'Videos, screen sequences and annotated screenshots',
    ],
    sampleHighlights: [
      'Fintech Mobile App Onboarding Overhaul case study',
      'Qualitative interview findings and friction maps',
      'Conversion funnel improvement data backed by user testing',
    ],
    relatedSlugs: ['marketing-case-study', 'feature-specification'],
  },
];

export function getMarketingTemplate(slug: string): TemplateMarketingMetadata | undefined {
  return MARKETING_TEMPLATES.find(template => template.slug === slug);
}

export function getMarketingTemplatesByCategory(category: TemplateCategory): TemplateMarketingMetadata[] {
  return MARKETING_TEMPLATES.filter(template => template.category === category);
}

export function templateSlugToId(slug: string): string {
  const match = MARKETING_TEMPLATES.find(template => template.slug === slug);
  return match?.templateId ?? slug;
}

export function templateIdToSlug(id: string): string {
  const match = MARKETING_TEMPLATES.find(template => template.templateId === id);
  return match?.slug ?? id;
}

export function isAvailableMarketingSlug(slug: string): boolean {
  const marketing = getMarketingTemplate(slug);
  if (!marketing) return false;
  return CURRENT_TEMPLATES.some(template => template.id === marketing.templateId);
}
