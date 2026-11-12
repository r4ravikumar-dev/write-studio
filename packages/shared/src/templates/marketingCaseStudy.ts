import type {DocumentTemplate, MetadataField, TemplateSection, ValidationRule} from './types';

/**
 * Marketing Case Study v1 template (Release 1, Phase 4).
 * Supports marketing teams, agencies, growth leads, and customer success in producing
 * evidence-based customer stories with baseline-to-result metrics and verified testimonials.
 */

const MARKETING_CASE_STUDY_ACTS: Record<string, string> = {
  intro: 'Client & challenge',
  strategy: 'Strategy & solution',
  impact: 'Results & testimonial',
  wrap: 'Takeaways & call to action',
};

const MARKETING_CASE_STUDY_METADATA: MetadataField[] = [
  {key: 'client_name', label: 'Client or brand name', description: 'Name of the client, customer or brand featured in the study.', kind: 'text', max: 200, storage: 'metadata'},
  {key: 'industry', label: 'Industry / sector', description: 'e.g. Fintech, E-commerce, B2B SaaS, HealthTech.', kind: 'text', max: 200, storage: 'metadata'},
  {key: 'campaign_name', label: 'Campaign or project name', description: 'Internal or public campaign name.', kind: 'text', max: 200, storage: 'metadata'},
  {key: 'timeline', label: 'Campaign timeline', description: 'e.g. Q3 2025 (12 weeks).', kind: 'text', max: 200, storage: 'metadata'},
  {key: 'services', label: 'Services or products used', description: 'Products, platforms or professional services involved.', kind: 'text', max: 500, storage: 'metadata'},
];

const MARKETING_CASE_STUDY_RULES: ValidationRule[] = [
  {key: 'hero', label: 'Client context', description: 'Client profile, industry and context of the engagement.', check: 'section', sections: ['mkt-hero']},
  {key: 'challenge', label: 'Business challenge and objectives', description: 'Clear definition of the problem and desired business outcomes.', check: 'section', sections: ['mkt-challenge', 'mkt-objectives']},
  {key: 'strategy', label: 'Strategy and execution', description: 'Strategic approach, creative execution and solutions delivered.', check: 'section', sections: ['mkt-strategy', 'mkt-execution', 'mkt-solution']},
  {key: 'results', label: 'Results and verified impact', description: 'Measurable business impact with baseline and timeframe.', check: 'section', sections: ['mkt-results']},
  {key: 'testimonial', label: 'Approved testimonial', description: 'Customer quote with verified attribution and permission.', check: 'section', sections: ['mkt-testimonial']},
  {key: 'evidence', label: 'Results or customer evidence', description: 'Metrics, charts, testimonials, before/after comparisons or showcase images.', check: 'evidence'},
];

const MARKETING_CASE_STUDY_SECTIONS: TemplateSection[] = [
  {
    key: 'mkt-hero',
    title: 'Client & Project Hero',
    hint: 'Client overview, industry, scale, and high-impact headline result.',
    purpose: 'Introduces the client, context, and hero outcome to hook the reader immediately.',
    act: 'intro',
    required: true,
    covers: 'hero',
    prompts: [
      'Who is the client or brand and what is their scale/industry?',
      'What was the headline achievement or transformation?',
      'What timeframe and services were involved?',
    ],
    writingGuidance: [
      'Open with a strong lead sentence summarizing the business transformation.',
      'Highlight the client’s standing in their market.',
    ],
    suggestedEvidence: ['Hero metrics callout', 'Client logo or overview'],
    suggestedBlocks: ['paragraph', 'callout', 'metrics'],
    completionCriteria: ['The reader understands who the customer is and the scale of the result.'],
  },
  {
    key: 'mkt-challenge',
    title: 'The Business Challenge',
    hint: 'The market pressure, revenue bottleneck, or customer experience obstacle.',
    purpose: 'Defines the core business impediment faced by the customer before the initiative.',
    act: 'intro',
    required: true,
    covers: 'challenge',
    prompts: [
      'What business challenge, inefficiency, or plateau was the client experiencing?',
      'What commercial consequences or lost opportunities did it create?',
      'Why had previous attempts or off-the-shelf solutions failed?',
    ],
    writingGuidance: [
      'Quantify the pre-existing state with baseline metrics where available.',
      'Focus on real business consequences: revenue loss, customer churn, or high CAC.',
    ],
    suggestedEvidence: ['Baseline performance figures', 'Client challenge quote'],
    suggestedBlocks: ['paragraph', 'callout', 'pullQuote'],
    completionCriteria: ['The core commercial problem is clearly framed with baseline data.'],
  },
  {
    key: 'mkt-objectives',
    title: 'Objectives & KPIs',
    hint: 'Quantifiable targets, timeframes, and success criteria agreed upon.',
    purpose: 'Articulates the measurable performance benchmarks the campaign set out to achieve.',
    act: 'intro',
    required: true,
    covers: 'challenge',
    prompts: [
      'What primary KPIs was the project accountable for (ROAS, conversion, LTV, pipeline)?',
      'What specific target numbers or deadlines were established?',
      'What guardrail metrics were monitored?',
    ],
    writingGuidance: [
      'List specific targets rather than generic aspirations (e.g. "+30% conversion within 60 days").',
    ],
    suggestedEvidence: ['KPI targets table', 'Milestones list'],
    suggestedBlocks: ['table', 'taskList', 'callout'],
    completionCriteria: ['Clear target metrics with measurable criteria are stated.'],
  },
  {
    key: 'mkt-strategy',
    title: 'Strategic Approach',
    hint: 'Market positioning, audience targeting, hypothesis, and channel strategy.',
    purpose: 'Explains the strategic insight that informed the solution and why it was chosen.',
    act: 'strategy',
    required: true,
    covers: 'strategy',
    prompts: [
      'What key insight or hypothesis unlocked this opportunity?',
      'How was audience segmentation or channel mix determined?',
      'What strategic trade-offs or differentiators were selected?',
    ],
    writingGuidance: [
      'Detail the strategic rationale before discussing visual or creative deliverables.',
      'Explain why this strategy differed from the competition.',
    ],
    suggestedEvidence: ['Strategic framework', 'Target audience mapping'],
    suggestedBlocks: ['paragraph', 'flowDiagram', 'callout'],
    completionCriteria: ['The underlying strategic rationale and insight are explained.'],
  },
  {
    key: 'mkt-execution',
    title: 'Campaign Execution',
    hint: 'Rollout plan, creative production, channel delivery, and optimizations.',
    purpose: 'Documents the concrete execution, phases, timeline, and tactical iterations.',
    act: 'strategy',
    required: true,
    covers: 'strategy',
    prompts: [
      'What were the major execution phases and campaign rollout steps?',
      'Which channels, creative assets, and formats were deployed?',
      'What A/B tests or in-flight optimizations occurred?',
    ],
    writingGuidance: [
      'Show the chronological progression of the work.',
      'Highlight active testing and performance iterations.',
    ],
    suggestedEvidence: ['Campaign timeline', 'Creative asset previews'],
    suggestedBlocks: ['timeline', 'imageGrid', 'screenSequence'],
    completionCriteria: ['Execution milestones and creative deployment are documented.'],
  },
  {
    key: 'mkt-solution',
    title: 'Solution Delivered',
    hint: 'The finalized creative assets, landing pages, flows, and marketing collateral.',
    purpose: 'Showcases the polished creative and product outputs delivered to the market.',
    act: 'strategy',
    required: true,
    covers: 'strategy',
    prompts: [
      'What was the final customer-facing experience or creative deliverable?',
      'How did the solution directly address the original business challenge?',
    ],
    writingGuidance: [
      'Use showcase blocks and device mockups to display work in realistic contexts.',
      'Accompany imagery with descriptive captions explaining key design decisions.',
    ],
    suggestedEvidence: ['Final campaign visuals', 'Device mockups', 'Interactive assets'],
    suggestedBlocks: ['showcase', 'deviceMockup', 'comparison'],
    completionCriteria: ['Final deliverables are showcased clearly in context.'],
  },
  {
    key: 'mkt-results',
    title: 'Results & Verified Impact',
    hint: 'Baseline vs. outcome metrics, timeframe, and verified data source.',
    purpose: 'Presents verified quantitative performance gains with clear baseline and measurement periods.',
    act: 'impact',
    required: true,
    covers: 'results',
    prompts: [
      'What were the quantified outcomes against each original KPI?',
      'What was the measurement period and comparative baseline?',
      'What data source or analytics platform verified these numbers?',
    ],
    writingGuidance: [
      'Always distinguish measured historical results from projections or estimates.',
      'Specify the measurement window (e.g. "Q3 2025 vs. Q3 2024").',
    ],
    suggestedEvidence: ['Performance metrics grid', 'Comparative chart', 'Analytics verification'],
    suggestedBlocks: ['metrics', 'chart', 'comparison'],
    completionCriteria: ['Results provide baseline, measurement period, and verified outcomes.'],
  },
  {
    key: 'mkt-testimonial',
    title: 'Customer Testimonial',
    hint: 'Approved quote from an executive or client stakeholder with explicit attribution.',
    purpose: 'Provides direct social proof from an authorized client representative.',
    act: 'impact',
    required: false,
    covers: 'testimonial',
    prompts: [
      'What did the client stakeholder say about the partnership and outcome?',
      'What is their exact name, title, and organization?',
      'Has explicit consent been granted for external publication?',
    ],
    writingGuidance: [
      'Ensure the quote reflects personal, authentic business impact.',
      'Never fabricate or extrapolate unverified quotes.',
    ],
    suggestedEvidence: ['Attributed testimonial quote with client approval'],
    suggestedBlocks: ['testimonial', 'pullQuote'],
  },
  {
    key: 'mkt-takeaways',
    title: 'Key Takeaways & Lessons',
    hint: 'Transferable insights, strategic learnings, and recommendations for peers.',
    purpose: 'Distills broader industry lessons and repeatable best practices from the project.',
    act: 'wrap',
    required: false,
    prompts: [
      'What key lessons or repeatable insights emerged from this engagement?',
      'What would the team do differently in hindsight?',
      'How can peers in similar industries apply these findings?',
    ],
    writingGuidance: [
      'Frame insights as actionable takeaways that provide value even to non-clients.',
    ],
    suggestedEvidence: ['Actionable takeaways list'],
    suggestedBlocks: ['callout', 'bulletList', 'pullQuote'],
  },
  {
    key: 'mkt-cta',
    title: 'Next Steps & Call to Action',
    hint: 'Relevant consultation, demo link, or related case study links.',
    purpose: 'Offers the reader a clear, relevant next step without resorting to aggressive sales copy.',
    act: 'wrap',
    required: false,
    prompts: [
      'What is the logical next step for an interested enterprise reader?',
      'Where can they learn more or schedule a discussion?',
    ],
    writingGuidance: [
      'Keep the CTA helpful, professional, and directly related to the story topic.',
    ],
    suggestedEvidence: ['Consultation link', 'Resource links'],
    suggestedBlocks: ['callout', 'referenceList'],
  },
  {
    key: 'mkt-sources',
    title: 'Data Sources & Methodology',
    hint: 'Attribution, analytics tools, sample sizes, and calculation methods.',
    purpose: 'Maintains credibility and integrity by documenting measurement methodology.',
    act: 'wrap',
    required: false,
    prompts: [
      'What analytics platforms, data warehouses, or attribution models were used?',
      'What sample sizes, date ranges, and filtering criteria applied?',
    ],
    writingGuidance: [
      'Cite specific tools (e.g. Google Analytics 4, Mixpanel, Snowflake) and models.',
    ],
    suggestedEvidence: ['Methodology notes', 'Attribution source reference'],
    suggestedBlocks: ['referenceList', 'bulletList'],
  },
];

export const marketingCaseStudyV1: DocumentTemplate = {
  id: 'marketing-case-study',
  version: 1,
  name: 'Marketing Case Study',
  description: 'A customer success story with real business challenge, campaign execution, verified metrics and approved testimonials.',
  purpose: 'Demonstrates how a customer or client succeeded with a product, agency or solution, with backed metrics and testimonials.',
  documentType: 'marketing_case_study',
  audience: ['Marketing teams', 'Agencies', 'Customer success teams', 'Growth leads', 'Sales enablement'],
  acts: MARKETING_CASE_STUDY_ACTS,
  sections: MARKETING_CASE_STUDY_SECTIONS,
  metadataFields: MARKETING_CASE_STUDY_METADATA,
  recommendedBlocks: [
    'metrics',
    'chart',
    'testimonial',
    'comparison',
    'showcase',
    'imageGrid',
    'timeline',
    'callout',
    'pullQuote',
    'referenceList',
  ],
  validationRules: MARKETING_CASE_STUDY_RULES,
  exportProfiles: ['pdf', 'html_zip', 'markdown', 'json_backup'],
};
