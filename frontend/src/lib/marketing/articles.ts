export type ResourceArticle = {
  slug: string;
  category: 'guides' | 'examples' | 'insights';
  title: string;
  summary: string;
  audience: string;
  readTime: string;
  templateSlug?: string;
  templateName?: string;
  content: string[];
};

export const RESOURCE_ARTICLES: ResourceArticle[] = [
  {
    slug: 'how-to-write-developer-documentation',
    category: 'guides',
    title: 'How to Write Developer Documentation',
    summary: 'A step-by-step guide to writing setup manuals, API references, and quick-start guides developers actually enjoy reading.',
    audience: 'Developers',
    readTime: '6 min read',
    templateSlug: 'developer-documentation',
    templateName: 'Developer Documentation',
    content: [
      'The best developer documentation helps engineers solve problems rapidly without unnecessary cognitive overhead.',
      'Always start with an Overview and Prerequisites: specify required runtime versions (e.g. Node 20+, Python 3.11), necessary environment variables, and authentication keys before diving into implementation.',
      'Provide copy-pasteable Quick Start snippets that can be executed in under 2 minutes. When including code blocks, specify the exact language, file path, and expected console output.',
      'Document edge cases and error handling proactively. Include a dedicated troubleshooting section that matches common runtime error codes to concrete remediation steps.',
    ],
  },
  {
    slug: 'practical-guide-to-writing-feature-specifications',
    category: 'guides',
    title: 'A Practical Guide to Writing Feature Specifications',
    summary: 'How product managers and engineering leads can align on goals, functional requirements, and acceptance criteria.',
    audience: 'Product teams',
    readTime: '7 min read',
    templateSlug: 'feature-specification',
    templateName: 'Feature Specification',
    content: [
      'A feature specification is not a wishlist; it is a shared contract between product, design, and engineering.',
      'Begin by framing the core customer problem: who is struggling, what is their current workaround, and why does solving it matter now?',
      'Express requirements in clear, numbered statements (e.g. FR-1, FR-2) with priority designations (P0 vs P1). Avoid vague language like "the system should be fast". Instead, define measurable constraints.',
      'Use Given/When/Then acceptance criteria for every primary user journey so that QA and engineering have unambiguous testable scenarios.',
    ],
  },
  {
    slug: 'how-to-write-release-notes-people-can-understand',
    category: 'guides',
    title: 'How to Write Release Notes People Can Understand',
    summary: 'Group features, improvements, fixes and breaking changes into an organised, human-friendly changelog.',
    audience: 'Product / Engineering',
    readTime: '5 min read',
    templateSlug: 'release-notes',
    templateName: 'Release Notes',
    content: [
      'Release notes communicate value, not just git commit histories. Group updates into distinct categories: Highlights, New Features, Improvements, and Bug Fixes.',
      'Highlight breaking changes prominently. Always provide explicit before-and-after code samples or migration steps so customers can upgrade without breaking production.',
      'Include compatibility matrices and runtime deprecation schedules to keep enterprise operators informed.',
    ],
  },
  {
    slug: 'how-to-structure-a-product-requirements-document',
    category: 'guides',
    title: 'How to Structure a Product Requirements Document',
    summary: 'Structure product goals, target user personas, requirements, and measurable success metrics in one PRD.',
    audience: 'Product managers',
    readTime: '8 min read',
    templateSlug: 'product-requirements',
    templateName: 'Product Requirements Document',
    content: [
      'A great PRD focuses the team on the destination and constraints, leaving engineering and design room to determine the best implementation.',
      'Explicitly define Non-Goals alongside Goals. Knowing what you will NOT build in this release prevents scope creep and clarifies trade-offs.',
      'Map success metrics to concrete business horizons: leading indicators (e.g. daily active feature usage) and lagging indicators (e.g. 90-day retention).',
    ],
  },
  {
    slug: 'how-to-write-a-technical-design-document',
    category: 'guides',
    title: 'How to Write a Technical Design Document',
    summary: 'Document software architecture, data schemas, API contracts, and trade-offs before writing code.',
    audience: 'Engineers',
    readTime: '9 min read',
    templateSlug: 'technical-design',
    templateName: 'Technical Design Document',
    content: [
      'Writing an RFC or Technical Design Document allows engineering teams to detect architectural flaws and scaling bottlenecks when changing design is cheap.',
      'Illustrate data flows using structured sequence diagrams and container models. Highlight where network boundaries are crossed and where data is cached.',
      'Dedicate a section to Alternatives Considered. Explain why rejected approaches were discarded so future maintainers understand the context.',
    ],
  },
  {
    slug: 'how-to-create-an-architecture-decision-record',
    category: 'guides',
    title: 'How to Create an Architecture Decision Record (ADR)',
    summary: 'Capture the reasoning, context, and consequences behind significant architectural decisions.',
    audience: 'Architects',
    readTime: '5 min read',
    templateSlug: 'adr',
    templateName: 'Architecture Decision Record',
    content: [
      'Software architectures evolve, but the reasoning behind choices is easily forgotten. ADRs create an immutable historical record.',
      'Keep ADRs concise and focused on one decision: state the context, list the drivers, evaluate the candidate options, and document the consequences (positive, negative, and neutral).',
      'Track decision status explicitly: Proposed, Accepted, Deprecated, or Superseded.',
    ],
  },
  {
    slug: 'how-to-write-a-marketing-case-study',
    category: 'examples',
    title: 'How to Write a Marketing Case Study That Converts',
    summary: 'Turn customer engagements into compelling case studies backed by measurable business impact.',
    audience: 'Marketers',
    readTime: '6 min read',
    templateSlug: 'marketing-case-study',
    templateName: 'Marketing Case Study',
    content: [
      'A B2B marketing case study should read like a story of transformation, not a generic product brochure.',
      'Set the baseline: describe the customer challenge with quantifiable pain points (e.g. 40 hours spent per week on manual data entry).',
      'Showcase results with large metric cards and context. Provide attribution and date ranges for claims (e.g. +312% pipeline generated within 6 months).',
      'Include a direct, authentic testimonial from an executive stakeholder.',
    ],
  },
  {
    slug: 'how-to-structure-a-ux-case-study',
    category: 'examples',
    title: 'How to Structure a UX Case Study',
    summary: 'Document the problem, user research, wireframe explorations, design decisions, and measured outcomes.',
    audience: 'Designers',
    readTime: '7 min read',
    templateSlug: 'ux-case-study',
    templateName: 'UX Case Study',
    content: [
      'Design recruiters and clients want to see your thinking, not just final high-fidelity Figma screens.',
      'Frame the problem and your personal contribution: were you the sole researcher, design lead, or part of a multi-disciplinary squad?',
      'Show early research insights and discarded design directions. Explain why the final solution was selected based on user feedback.',
      'Conclude with measured outcomes and personal reflections on what you learned during the project.',
    ],
  },
  {
    slug: 'how-to-document-research-findings',
    category: 'insights',
    title: 'How to Document Research Findings',
    summary: 'Transform qualitative user interviews and usability testing sessions into actionable insights for the team.',
    audience: 'Researchers',
    readTime: '6 min read',
    templateSlug: 'ux-case-study',
    templateName: 'UX Case Study',
    content: [
      'Raw transcripts are rarely read by busy stakeholders. Good research synthesis turns observations into structured insight themes.',
      'Back every insight with direct quotes, session timestamps, or video evidence clips.',
      'Prioritise friction points by severity (critical blockers vs minor aesthetic feedback) to guide product roadmaps.',
    ],
  },
  {
    slug: 'how-to-write-an-sop-that-people-actually-follow',
    category: 'guides',
    title: 'How to Write an SOP That People Actually Follow',
    summary: 'Create step-by-step operating procedures with clear responsibilities, decision points, and checklists.',
    audience: 'Operations',
    readTime: '7 min read',
    templateSlug: 'sop',
    templateName: 'Standard Operating Procedure (SOP)',
    content: [
      'Most SOPs fail because they are buried in long, unreadable walls of text. Successful procedures use numbered action steps and clear role assignments.',
      'Specify prerequisites and required credentials before step 1 so team members aren’t blocked halfway through.',
      'Include explicit decision points and escalation trees: if condition X occurs, contact person Y within 15 minutes.',
    ],
  },
  {
    slug: 'choosing-the-right-document-structure',
    category: 'insights',
    title: 'Choosing the Right Document Structure for Your Project',
    summary: 'How to determine whether your project needs a PRD, a feature spec, a tech design, or an ADR.',
    audience: 'Everyone',
    readTime: '5 min read',
    content: [
      'Choosing the wrong document framework leads to misaligned expectations. A PRD defines WHAT and WHY; a Feature Spec defines HOW IT BEHAVES; a Tech Design defines HOW IT IS BUILT.',
      'When faced with a significant architectural branching point, author an ADR to preserve decision history.',
      'For repeatable team routines, an SOP provides consistency and prevents operational knowledge loss.',
    ],
  },
  {
    slug: 'a-guide-to-clear-and-accessible-writing',
    category: 'insights',
    title: 'A Guide to Clear and Accessible Writing',
    summary: 'W3C WAI principles for writing headings, descriptive link text, concise sentences, and alt text.',
    audience: 'Everyone',
    readTime: '6 min read',
    content: [
      'Accessible writing benefits every reader. Use semantic heading hierarchies (H1 -> H2 -> H3) that allow screen-reader users to skim the structure.',
      'Write descriptive link destinations instead of generic "Click here" or "Read more". Links like "Explore developer documentation template" provide immediate context.',
      'Use short, declarative sentences with familiar vocabulary. Expand acronyms upon first usage and write meaningful alternative text for informative diagrams.',
    ],
  },
];

export function getResourceArticle(slug: string): ResourceArticle | undefined {
  return RESOURCE_ARTICLES.find(a => a.slug === slug);
}
