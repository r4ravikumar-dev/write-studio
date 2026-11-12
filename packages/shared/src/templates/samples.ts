import type {JSONContent} from '../caseStudies/json';
import type {DocumentType} from './types';

/**
 * Domain-reviewed sample documents for each template (Phase 4).
 * Each sample document contains full realistic content, structured blocks,
 * and valid section metadata that passes story review cleanly.
 */

export type SampleDocument = {
  title: string;
  documentType: DocumentType;
  templateId: string;
  templateVersion: number;
  metadata: Record<string, unknown>;
  content: JSONContent;
};

const p = (text: string): JSONContent => ({
  type: 'paragraph',
  content: [{type: 'text', text}],
});

const sectionHeading = (key: string, title: string, id: string): JSONContent => ({
  type: 'heading',
  attrs: {
    level: 2,
    section: key,
    sectionId: id,
    sectionStatus: 'complete',
  },
  content: [{type: 'text', text: title}],
});

/**
 * 1. Developer Documentation Sample: Acme Payments Node SDK Webhook Guide
 */
export const developerDocsSample: SampleDocument = {
  title: 'Acme Payments SDK — Webhook Integration Guide',
  documentType: 'developer_documentation',
  templateId: 'developer-docs',
  templateVersion: 1,
  metadata: {
    system_or_library: 'Acme Payments Node SDK',
    tech_stack: 'Node.js 20+, TypeScript 5+, Express/Fastify',
    supported_versions: 'v2.4.x - v3.x',
    target_audience: 'Backend software engineers & integration specialists',
    repository_url: 'https://github.com/acme/payments-node-sdk',
  },
  content: {
    type: 'doc',
    content: [
      sectionHeading('dev-overview', 'Overview', 's-dev-01'),
      p('The Acme Payments SDK provides strongly-typed event listeners, automatic cryptographic signature verification, and replay protection for high-throughput webhook processing in Node.js applications.'),
      {
        type: 'callout',
        attrs: {intent: 'info'},
        content: [p('Webhook signatures must be verified before parsing request bodies to prevent tampering and replay attacks.')],
      },

      sectionHeading('dev-prerequisites', 'Prerequisites', 's-dev-02'),
      p('Before integrating webhooks, verify that your development environment satisfies the following requirements:'),
      {
        type: 'taskList',
        content: [
          {type: 'taskItem', attrs: {checked: true}, content: [p('Node.js 20 LTS or later installed on the host machine')]},
          {type: 'taskItem', attrs: {checked: true}, content: [p('Active Acme Merchant Account with access to API Keys and Webhook Signing Secret')]},
          {type: 'taskItem', attrs: {checked: true}, content: [p('Publicly reachable HTTPS endpoint (or local tunnel via ngrok / cloudflared)')]},
        ],
      },
      {
        type: 'table',
        content: [
          {
            type: 'tableRow',
            content: [
              {type: 'tableHeader', content: [p('Component')]},
              {type: 'tableHeader', content: [p('Supported Version')]},
              {type: 'tableHeader', content: [p('Requirement')]},
            ],
          },
          {
            type: 'tableRow',
            content: [
              {type: 'tableCell', content: [p('Node.js')]},
              {type: 'tableCell', content: [p('>= 20.0.0')]},
              {type: 'tableCell', content: [p('Required')]},
            ],
          },
          {
            type: 'tableRow',
            content: [
              {type: 'tableCell', content: [p('TypeScript')]},
              {type: 'tableCell', content: [p('>= 5.0.0')]},
              {type: 'tableCell', content: [p('Recommended')]},
            ],
          },
        ],
      },

      sectionHeading('dev-quick-start', 'Quick Start', 's-dev-03'),
      p('Install the official SDK and configure your webhook receiver in under five minutes:'),
      {
        type: 'terminal',
        attrs: {shell: 'bash', prompt: '$'},
        content: [
          {type: 'terminalCommand', content: [{type: 'text', text: 'npm install @acme/payments-node dotenv'}]},
          {type: 'terminalOutput', content: [{type: 'text', text: 'added 3 packages in 0.4s'}]},
        ],
      },
      {
        type: 'codeBlock',
        attrs: {language: 'typescript', title: 'webhook-handler.ts', lineNumbers: true, wrap: false},
        content: [
          {
            type: 'text',
            text: `import { WebhookReceiver } from '@acme/payments-node';

const receiver = new WebhookReceiver({
  signingSecret: process.env.ACME_SIGNING_SECRET!,
});

export async function handleWebhook(rawBody: Buffer, signature: string) {
  const event = receiver.verifyHeader(rawBody, signature);
  console.log('Received valid event:', event.type, event.data.id);
  return { received: true };
}`,
          },
        ],
      },

      sectionHeading('dev-installation', 'Installation and Setup', 's-dev-04'),
      p('Add the package to your package dependencies using your preferred package manager:'),
      {
        type: 'terminal',
        attrs: {shell: 'bash', prompt: '$'},
        content: [
          {type: 'terminalCommand', content: [{type: 'text', text: 'pnpm add @acme/payments-node'}]},
          {type: 'terminalOutput', content: [{type: 'text', text: 'Packages: +1\nProgress: resolved 1, reused 0, downloaded 1, added 1'}]},
        ],
      },
      p('Configure the webhook receiver parameters:'),
      {
        type: 'parameterTable',
        attrs: {showRequired: true, showDefault: true},
        content: [
          {
            type: 'parameter',
            attrs: {name: 'signingSecret', type: 'string', required: true, default: ''},
            content: [p('The webhook signing secret (whsec_...) from the Acme Developer Dashboard.')],
          },
          {
            type: 'parameter',
            attrs: {name: 'toleranceSeconds', type: 'number', required: false, default: '300'},
            content: [p('Maximum allowable timestamp drift in seconds to protect against replay attacks.')],
          },
        ],
      },

      sectionHeading('dev-core-concepts', 'Core Concepts', 's-dev-05'),
      p('Acme webhooks follow an at-least-once delivery contract. Events may occasionally be redelivered in cases of transient network failure.'),
      {
        type: 'callout',
        attrs: {intent: 'tip'},
        content: [p('Always record processed event IDs in your database and verify idempotency before executing financial side-effects.')],
      },

      sectionHeading('dev-implementation', 'Implementation Guide', 's-dev-06'),
      p('Follow these three steps to integrate webhook handling into your web service:'),
      {
        type: 'procedureSteps',
        content: [
          {
            type: 'procedureStep',
            attrs: {owner: 'Backend engineer', expected: 'Raw body buffer is captured unmodified.'},
            content: [p('Configure your HTTP router to retain raw request bytes without JSON body parsing.')],
          },
          {
            type: 'procedureStep',
            attrs: {owner: 'Backend engineer', expected: 'Headers are extracted safely.'},
            content: [p('Extract the x-acme-signature and x-acme-timestamp headers from the incoming request.')],
          },
          {
            type: 'procedureStep',
            attrs: {owner: 'Backend engineer', expected: 'Cryptographic signature is verified.'},
            content: [p('Invoke receiver.verifyHeader(rawBody, signature) and dispatch the typed event payload.')],
          },
        ],
      },

      sectionHeading('dev-code-examples', 'Code Examples', 's-dev-07'),
      p('Production-ready Express.js route implementation with raw body buffering and error handling:'),
      {
        type: 'codeBlock',
        attrs: {language: 'typescript', title: 'server.ts', lineNumbers: true, wrap: false},
        content: [
          {
            type: 'text',
            text: `import express from 'express';
import { WebhookReceiver, SignatureVerificationError } from '@acme/payments-node';

const app = express();
const receiver = new WebhookReceiver({ signingSecret: process.env.ACME_SIGNING_SECRET! });

app.post('/api/webhooks/acme', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['x-acme-signature'];
  if (typeof signature !== 'string') {
    return res.status(400).send('Missing signature header');
  }

  try {
    const event = receiver.verifyHeader(req.body, signature);
    switch (event.type) {
      case 'payment.succeeded':
        console.log('Payment completed:', event.data.amount);
        break;
      case 'refund.created':
        console.log('Refund initiated:', event.data.id);
        break;
    }
    return res.status(200).json({ status: 'ok' });
  } catch (err) {
    if (err instanceof SignatureVerificationError) {
      return res.status(401).send('Invalid signature');
    }
    return res.status(500).send('Internal server error');
  }
});`,
          },
        ],
      },

      sectionHeading('dev-configuration', 'Configuration Reference', 's-dev-08'),
      p('All environment variables and SDK options for fine-tuning webhook behavior:'),
      {
        type: 'parameterTable',
        attrs: {showRequired: true, showDefault: true},
        content: [
          {
            type: 'parameter',
            attrs: {name: 'ACME_SIGNING_SECRET', type: 'string', required: true, default: ''},
            content: [p('The HMAC-SHA256 signature verification key for your webhook endpoint.')],
          },
          {
            type: 'parameter',
            attrs: {name: 'ACME_WEBHOOK_MAX_RETRIES', type: 'number', required: false, default: '5'},
            content: [p('Number of retry attempts before dropping an unacknowledged event notification.')],
          },
        ],
      },

      sectionHeading('dev-api-reference', 'API / Interface Reference', 's-dev-09'),
      p('Methods exposed by the WebhookReceiver class:'),
      {
        type: 'parameterTable',
        attrs: {showRequired: true, showDefault: true},
        content: [
          {
            type: 'parameter',
            attrs: {name: 'verifyHeader(rawBody, signature)', type: 'AcmeEvent', required: true, default: ''},
            content: [p('Validates the HMAC-SHA256 signature and returns the deserialized event object.')],
          },
        ],
      },

      sectionHeading('dev-error-handling', 'Error Handling', 's-dev-10'),
      p('The SDK throws typed exceptions when webhook verification fails:'),
      {
        type: 'table',
        content: [
          {
            type: 'tableRow',
            content: [
              {type: 'tableHeader', content: [p('Error Class')]},
              {type: 'tableHeader', content: [p('HTTP Status')]},
              {type: 'tableHeader', content: [p('Cause & Recommended Action')]},
            ],
          },
          {
            type: 'tableRow',
            content: [
              {type: 'tableCell', content: [p('SignatureVerificationError')]},
              {type: 'tableCell', content: [p('401')]},
              {type: 'tableCell', content: [p('HMAC mismatch. Verify that ACME_SIGNING_SECRET matches dashboard.')]},
            ],
          },
          {
            type: 'tableRow',
            content: [
              {type: 'tableCell', content: [p('TimestampToleranceError')]},
              {type: 'tableCell', content: [p('400')]},
              {type: 'tableCell', content: [p('Timestamp drift exceeds tolerance. Synchronize server system clock via NTP.')]},
            ],
          },
        ],
      },

      sectionHeading('dev-troubleshooting', 'Troubleshooting & FAQs', 's-dev-11'),
      p('Diagnose signature verification errors using curl with the simulated signature header:'),
      {
        type: 'terminal',
        attrs: {shell: 'bash', prompt: '$'},
        content: [
          {type: 'terminalCommand', content: [{type: 'text', text: 'curl -v -X POST http://localhost:3000/api/webhooks/acme -H "Content-Type: application/json" -H "x-acme-signature: test_sig" -d "{\\"type\\":\\"ping\\"}"'}]},
          {type: 'terminalOutput', content: [{type: 'text', text: '< HTTP/1.1 401 Unauthorized\n< Invalid signature'}]},
        ],
      },

      sectionHeading('dev-resources', 'Additional Resources', 's-dev-12'),
      p('Official documentation, developer tools, and community support links:'),
      {
        type: 'referenceList',
        content: [
          {
            type: 'reference',
            attrs: {url: 'https://docs.acme.example.com/webhooks', kind: 'documentation'},
            content: [{type: 'text', text: 'Acme Official Webhooks Documentation'}],
          },
          {
            type: 'reference',
            attrs: {url: 'https://github.com/acme/payments-node-sdk', kind: 'repository'},
            content: [{type: 'text', text: 'Acme Node SDK GitHub Repository'}],
          },
        ],
      },
      // Evidence: verified metrics block
      {
        type: 'metrics',
        attrs: {
          config: {
            items: [
              {value: '99.999%', label: 'Delivery reliability'},
              {value: '< 15ms', label: 'Average verification latency'},
              {value: '0', label: 'Replay vulnerabilities'},
            ],
          },
        },
      },
    ],
  },
};

/**
 * 2. Feature Specification Sample: Multi-Currency Dynamic Settlement Specification
 */
export const featureSpecSample: SampleDocument = {
  title: 'Multi-Currency Dynamic Settlement Specification',
  documentType: 'feature_specification',
  templateId: 'feature-spec',
  templateVersion: 1,
  metadata: {
    feature_name: 'Multi-Currency Settlement',
    target_release: 'v2.4.0 (Q1 2026)',
    status: 'Approved',
    owner: 'Alex Mercer (Staff PM)',
    engineering_lead: 'Sarah Lin (Principal Engineer)',
  },
  content: {
    type: 'doc',
    content: [
      sectionHeading('spec-overview', 'Feature Overview', 's-spec-01'),
      p('Enables cross-border e-commerce merchants to present item prices in shoppers’ local currencies while settling proceeds into merchant bank accounts in their domestic currency (USD, EUR, GBP) without FX volatility exposure.'),
      {
        type: 'callout',
        attrs: {intent: 'info'},
        content: [p('Eliminates unexpected foreign exchange surcharge fees for international buyers at checkout.')],
      },

      sectionHeading('spec-background', 'Background & Context', 's-spec-02'),
      p('International buyers currently experience significant friction when purchasing from domestic merchants due to currency confusion and unpredictability of credit card FX markup rates.'),

      sectionHeading('spec-problem', 'Problem Statement', 's-spec-03'),
      p('Cross-border shoppers abandon checkout when forced to pay in foreign currency due to hidden credit card conversion surcharges and psychological resistance.'),
      {
        type: 'metrics',
        attrs: {
          config: {
            items: [
              {value: '42%', label: 'International checkout abandonment'},
              {value: '3.4%', label: 'Average bank conversion fee'},
              {value: '$1.4M', label: 'Monthly lost GMV'},
            ],
          },
        },
      },

      sectionHeading('spec-objectives', 'Objectives & Non-goals', 's-spec-04'),
      p('Clear separation between release goals and non-goals:'),
      {
        type: 'taskList',
        content: [
          {type: 'taskItem', attrs: {checked: true}, content: [p('Goal: Support dynamic price presentation in 24 major global currencies.')]},
          {type: 'taskItem', attrs: {checked: true}, content: [p('Goal: Guarantee exchange rates for 15 minutes during checkout session.')]},
          {type: 'taskItem', attrs: {checked: false}, content: [p('Non-goal: Multi-currency wallet balances or merchant crypto payouts.')]},
        ],
      },

      sectionHeading('spec-scope', 'Scope & Use Cases', 's-spec-05'),
      p('Functional scope boundaries for the initial release:'),
      {
        type: 'requirementList',
        content: [
          {
            type: 'requirement',
            attrs: {reqId: 'SCOPE-01', priority: 'must'},
            content: [p('Automated geo-IP locale detection with manual currency override selector.')],
          },
          {
            type: 'requirement',
            attrs: {reqId: 'SCOPE-02', priority: 'must'},
            content: [p('Guaranteed exchange rate token generation valid for 900 seconds.')],
          },
        ],
      },

      sectionHeading('spec-target-users', 'Target Users & Personas', 's-spec-06'),
      p('Primary persona: International shoppers on mobile and desktop web. Secondary persona: Merchant financial operations team reconciling daily payouts.'),

      sectionHeading('spec-user-stories', 'User Stories', 's-spec-07'),
      p('Core user stories defining user intent and expected value:'),
      {
        type: 'userStory',
        content: [
          {type: 'storyPart', attrs: {part: 'role'}, content: [{type: 'text', text: 'an international shopper in Germany'}]},
          {type: 'storyPart', attrs: {part: 'goal'}, content: [{type: 'text', text: 'to see the exact price in EUR before confirming checkout'}]},
          {type: 'storyPart', attrs: {part: 'benefit'}, content: [{type: 'text', text: 'my credit card statement matches the checkout amount with no extra bank fees'}]},
        ],
      },

      sectionHeading('spec-functional-requirements', 'Functional Requirements', 's-spec-08'),
      p('System capabilities and behaviors with stable requirement IDs and priorities:'),
      {
        type: 'requirementList',
        content: [
          {
            type: 'requirement',
            attrs: {reqId: 'FR-101', priority: 'must'},
            content: [p('The pricing service shall retrieve real-time FX spot rates from treasury feeds every 60 seconds.')],
          },
          {
            type: 'requirement',
            attrs: {reqId: 'FR-102', priority: 'must'},
            content: [p('Checkout sessions shall bind an immutable FX rate token with a 900-second TTL.')],
          },
          {
            type: 'requirement',
            attrs: {reqId: 'FR-103', priority: 'should'},
            content: [p('The order confirmation email shall display the charged local amount and settled base currency amount.')],
          },
        ],
      },

      sectionHeading('spec-experience', 'UX & User Flow', 's-spec-09'),
      p('The currency selector is positioned unobtrusively in the cart summary and header, allowing seamless switching without clearing cart items.'),

      sectionHeading('spec-edge-cases', 'Edge Cases & Exceptions', 's-spec-10'),
      p('Resilience rules under unexpected network or operational conditions:'),
      {
        type: 'table',
        content: [
          {
            type: 'tableRow',
            content: [
              {type: 'tableHeader', content: [p('Condition')]},
              {type: 'tableHeader', content: [p('System Response')]},
              {type: 'tableHeader', content: [p('User Messaging')]},
            ],
          },
          {
            type: 'tableRow',
            content: [
              {type: 'tableCell', content: [p('FX Token Expired (> 15 min)')]},
              {type: 'tableCell', content: [p('Fetch updated rate and re-prompt user confirmation.')]},
              {type: 'tableCell', content: [p('“Exchange rate updated. Please confirm new total before payment.”')]},
            ],
          },
          {
            type: 'tableRow',
            content: [
              {type: 'tableCell', content: [p('Treasury API Outage')]},
              {type: 'tableCell', content: [p('Fall back to last cached ECB rate with 1% volatility buffer.')]},
              {type: 'tableCell', content: [p('Transparent conversion continues without blocking checkout.')]},
            ],
          },
        ],
      },

      sectionHeading('spec-acceptance-criteria', 'Acceptance Criteria', 's-spec-11'),
      p('Testable Gherkin scenarios linked to functional requirements:'),
      {
        type: 'acceptanceCriteria',
        content: [
          {
            type: 'scenario',
            attrs: {title: 'Guaranteed Rate Expiry Handling', requirementRef: 'FR-102'},
            content: [
              {type: 'scenarioStep', attrs: {keyword: 'given'}, content: [{type: 'text', text: 'a customer has kept their checkout session open for 16 minutes'}]},
              {type: 'scenarioStep', attrs: {keyword: 'when'}, content: [{type: 'text', text: 'the customer clicks Complete Order'}]},
              {type: 'scenarioStep', attrs: {keyword: 'then'}, content: [{type: 'text', text: 'the system rejects the expired token and fetches the current spot rate'}]},
              {type: 'scenarioStep', attrs: {keyword: 'and'}, content: [{type: 'text', text: 'a prompt displays the refreshed price and requests explicit confirmation'}]},
            ],
          },
        ],
      },

      sectionHeading('spec-dependencies', 'Dependencies & Integrations', 's-spec-12'),
      p('This feature depends on Treasury FX Rate Feed v2 and Stripe Multi-Currency Settlement Account integration.'),

      sectionHeading('spec-success-metrics', 'Success Metrics', 's-spec-13'),
      p('Target performance indicators to validate post-launch success:'),
      {
        type: 'metrics',
        attrs: {
          config: {
            items: [
              {value: '+24%', label: 'International conversion increase'},
              {value: '< 40ms', label: 'Rate lookup API latency'},
              {value: '0.0%', label: 'Merchant FX slippage loss'},
            ],
          },
        },
      },

      sectionHeading('spec-risks', 'Risks & Open Questions', 's-spec-14'),
      p('Open risk: Extreme FX volatility spikes during active sessions. Mitigation: Treasury circuit-breaker halts tokens if currency pairs fluctuate > 5% within one hour.'),
    ],
  },
};

/**
 * 3. Release Notes Sample: Write Studio 2.4.0 Release Notes
 */
export const releaseNotesSample: SampleDocument = {
  title: 'Write Studio 2.4.0 — Multi-Vertical Templates & Structured Block Architecture',
  documentType: 'release_notes',
  templateId: 'release-notes',
  templateVersion: 1,
  metadata: {
    product_name: 'Write Studio',
    release_version: 'v2.4.0',
    release_date: '2026-11-12',
    release_channel: 'Stable',
    target_platforms: 'Web, macOS Desktop, Self-Hosted Docker',
  },
  content: {
    type: 'doc',
    content: [
      sectionHeading('rel-header', 'Release Header', 's-rel-01'),
      {
        type: 'callout',
        attrs: {intent: 'info'},
        content: [p('Write Studio 2.4.0 is now live across all environments with four new domain-specific template packs and enhanced structured blocks.')],
      },

      sectionHeading('rel-overview', 'Release Overview', 's-rel-02'),
      p('Write Studio 2.4.0 expands Write Studio beyond design case studies into a universal document creation studio. This release introduces Developer Documentation, Feature Specifications, Release Notes, and Marketing Case Studies powered by the same universal block registry and private workspace engine.'),

      sectionHeading('rel-features', 'New Features', 's-rel-03'),
      p('Major new template packs and structured document editing capabilities:'),
      {
        type: 'bulletList',
        content: [
          {type: 'listItem', content: [p('Developer Documentation: 12 structured sections with codeBlock syntax highlighting, terminal blocks, and parameter tables.')]},
          {type: 'listItem', content: [p('Feature Specifications: Agile user stories, requirement lists with stable IDs, and testable Given/When/Then acceptance criteria.')]},
          {type: 'listItem', content: [p('Release Notes: Structured version changelogs with breaking change callouts and migration runbooks.')]},
          {type: 'listItem', content: [p('Marketing Case Studies: Verified impact metrics, chart visuals, and approved customer testimonials with consent tracking.')]},
        ],
      },
      {
        type: 'codeBlock',
        attrs: {language: 'typescript', title: 'templates.ts', lineNumbers: true, wrap: false},
        content: [
          {
            type: 'text',
            text: `import { getTemplate, templatesFor } from '@studio/shared';

const devDocs = getTemplate('developer-docs', 1);
console.log(devDocs?.name); // 'Developer Documentation'`,
          },
        ],
      },

      sectionHeading('rel-improvements', 'Improvements & Enhancements', 's-rel-04'),
      p('Underlying engine optimizations and reliability enhancements:'),
      {
        type: 'bulletList',
        content: [
          {type: 'listItem', content: [p('B2 schema preservation: documents with newer or unknown blocks open safely with content locked and uncorrupted.')]},
          {type: 'listItem', content: [p('Template-aware review: deterministic checklist verification tailored to each document type.')]},
          {type: 'listItem', content: [p('Design token audit: removed hardcoded HEX colors in favor of theme-consistent semantic tokens.')]},
        ],
      },

      sectionHeading('rel-fixes', 'Bug Fixes', 's-rel-05'),
      p('Resolved issues in this release:'),
      {
        type: 'bulletList',
        content: [
          {type: 'listItem', content: [p('Fixed an issue where code blocks without an explicit language failed validation unexpectedly.')]},
          {type: 'listItem', content: [p('Resolved cursor jumping when toggling taskList items in Safari.')]},
          {type: 'listItem', content: [p('Prevented section key collisions across multi-vertical outline imports.')]},
        ],
      },

      sectionHeading('rel-breaking-changes', 'Breaking Changes', 's-rel-06'),
      {
        type: 'callout',
        attrs: {intent: 'warning'},
        content: [p('Templates now enforce distinct section key prefixes (dev-, spec-, rel-, mkt-). Custom templates or outline generators must adopt prefixed keys.')],
      },

      sectionHeading('rel-migration', 'Migration Instructions', 's-rel-07'),
      p('Follow these steps to upgrade your deployment:'),
      {
        type: 'procedureSteps',
        content: [
          {
            type: 'procedureStep',
            attrs: {owner: 'DevOps / SysAdmin', expected: 'Packages updated.'},
            content: [p('Update @studio/shared and @studio/frontend dependencies to 2.4.0 in package.json.')],
          },
          {
            type: 'procedureStep',
            attrs: {owner: 'Database Administrator', expected: 'Schema updated.'},
            content: [p('Run the Django schema migration 0012 to enable generic document metadata.')],
          },
          {
            type: 'procedureStep',
            attrs: {owner: 'QA Engineer', expected: 'Verification complete.'},
            content: [p('Execute the automated test suite with npm test to verify regression safety.')],
          },
        ],
      },
      {
        type: 'terminal',
        attrs: {shell: 'bash', prompt: '$'},
        content: [
          {type: 'terminalCommand', content: [{type: 'text', text: 'npm run test:offline'}]},
          {type: 'terminalOutput', content: [{type: 'text', text: 'PASS all test suites (45/45 passed)'}]},
        ],
      },

      sectionHeading('rel-deprecations', 'Deprecations', 's-rel-08'),
      p('The legacy caseStudyTemplate() function is deprecated in favor of defaultTemplate("ux_case_study"). It will be removed in v3.0.0.'),

      sectionHeading('rel-known-issues', 'Known Issues', 's-rel-09'),
      {
        type: 'callout',
        attrs: {intent: 'info'},
        content: [p('Exporting terminal blocks with ANSI escape sequence colors to PDF will be added in Phase 6.')],
      },

      sectionHeading('rel-compatibility', 'Compatibility Matrix', 's-rel-10'),
      p('Supported platform and database bounds:'),
      {
        type: 'table',
        content: [
          {
            type: 'tableRow',
            content: [
              {type: 'tableHeader', content: [p('Platform')]},
              {type: 'tableHeader', content: [p('Minimum Version')]},
              {type: 'tableHeader', content: [p('Status')]},
            ],
          },
          {
            type: 'tableRow',
            content: [
              {type: 'tableCell', content: [p('Node.js')]},
              {type: 'tableCell', content: [p('20.x LTS')]},
              {type: 'tableCell', content: [p('Supported')]},
            ],
          },
          {
            type: 'tableRow',
            content: [
              {type: 'tableCell', content: [p('PostgreSQL')]},
              {type: 'tableCell', content: [p('14+')]},
              {type: 'tableCell', content: [p('Supported')]},
            ],
          },
        ],
      },

      sectionHeading('rel-resources', 'Resources & Support', 's-rel-11'),
      p('Helpful links and documentation:'),
      {
        type: 'referenceList',
        content: [
          {
            type: 'reference',
            attrs: {url: 'https://github.com/acme/studio-releases/releases/tag/v2.4.0', kind: 'release'},
            content: [{type: 'text', text: 'GitHub Release v2.4.0'}],
          },
        ],
      },
      // Evidence: metrics block
      {
        type: 'metrics',
        attrs: {
          config: {
            items: [
              {value: '100%', label: 'Backward compatibility'},
              {value: '0', label: 'Data loss regressions'},
              {value: '37', label: 'Universal blocks supported'},
            ],
          },
        },
      },
    ],
  },
};

/**
 * 4. Marketing Case Study Sample: FinPay Global Case Study
 */
export const marketingCaseStudySample: SampleDocument = {
  title: 'FinPay Global — Accelerating Merchant Onboarding by 68% with Write Studio',
  documentType: 'marketing_case_study',
  templateId: 'marketing-case-study',
  templateVersion: 1,
  metadata: {
    client_name: 'FinPay Global Inc.',
    industry: 'Fintech / Payment Processing',
    campaign_name: 'Enterprise Merchant Experience Transformation',
    timeline: 'Q3 2025 (12 weeks)',
    services: 'Write Studio Enterprise, Custom Developer Workflows, API Documentation Engine',
  },
  content: {
    type: 'doc',
    content: [
      sectionHeading('mkt-hero', 'Client & Project Hero', 's-mkt-01'),
      p('FinPay Global partnered with Write Studio to overhaul their enterprise developer onboarding and API documentation suite, reducing merchant time-to-first-payment from 14 days to 4.5 days.'),
      {
        type: 'metrics',
        attrs: {
          config: {
            items: [
              {value: '68%', label: 'Faster merchant onboarding'},
              {value: '+41%', label: 'API activation rate'},
              {value: '$8.2M', label: 'Incremental GMV in Q3'},
            ],
          },
        },
      },

      sectionHeading('mkt-challenge', 'The Business Challenge', 's-mkt-02'),
      p('FinPay’s developer onboarding was previously bottlenecked by fragmented technical documentation scattered across legacy wikis and static PDFs. Developers repeatedly encountered webhook signature errors, requiring manual support engineering calls.'),
      {
        type: 'callout',
        attrs: {intent: 'warning'},
        content: [p('Developer onboarding tickets accounted for 54% of all Tier 2 technical support volume before the project.')],
      },

      sectionHeading('mkt-objectives', 'Objectives & KPIs', 's-mkt-03'),
      p('Specific quantitative benchmarks agreed upon at project inception:'),
      {
        type: 'table',
        content: [
          {
            type: 'tableRow',
            content: [
              {type: 'tableHeader', content: [p('KPI')]},
              {type: 'tableHeader', content: [p('Baseline (Q2 2025)')]},
              {type: 'tableHeader', content: [p('Target Outcome')]},
            ],
          },
          {
            type: 'tableRow',
            content: [
              {type: 'tableCell', content: [p('Time-to-first-payment')]},
              {type: 'tableCell', content: [p('14.2 days')]},
              {type: 'tableCell', content: [p('< 5.0 days')]},
            ],
          },
          {
            type: 'tableRow',
            content: [
              {type: 'tableCell', content: [p('Onboarding ticket rate')]},
              {type: 'tableCell', content: [p('54% of all tickets')]},
              {type: 'tableCell', content: [p('< 15% of all tickets')]},
            ],
          },
        ],
      },

      sectionHeading('mkt-strategy', 'Strategic Approach', 's-mkt-04'),
      p('Rather than publishing another static documentation site, FinPay implemented Write Studio’s developer documentation and release templates to turn documentation into an interactive, copyable product experience with verified code snippets and structured parameter tables.'),

      sectionHeading('mkt-execution', 'Campaign Execution', 's-mkt-05'),
      p('The rollout progressed across three distinct 4-week phases:'),
      {
        type: 'timeline',
        attrs: {
          config: {
            events: [
              {date: 'Weeks 1-4', title: 'Content Audit & Template Adoption', description: 'Consolidated 80+ legacy guides into standardized Developer Documentation templates.'},
              {date: 'Weeks 5-8', title: 'SDK Code Snippet Verification', description: 'Integrated runnable code samples and verified parameter tables for all major payment endpoints.'},
              {date: 'Weeks 9-12', title: 'Beta Rollout & Partner Onboarding', description: 'Piloted the new documentation experience with 40 enterprise fintech partners.'},
            ],
          },
        },
      },

      sectionHeading('mkt-solution', 'Solution Delivered', 's-mkt-06'),
      p('The finished developer documentation hub features syntax-highlighted code tabs, clear terminal commands, structured parameter tables, and explicit error resolution guides.'),

      sectionHeading('mkt-results', 'Results & Verified Impact', 's-mkt-07'),
      p('Measured outcomes against the original baseline figures over a 90-day post-launch window:'),
      {
        type: 'metrics',
        attrs: {
          config: {
            items: [
              {value: '68%', label: 'Reduction in onboarding cycle time'},
              {value: '54% → 12%', label: 'Drop in integration support tickets'},
              {value: '94%', label: 'Developer CSAT satisfaction score'},
            ],
          },
        },
      },
      {
        type: 'chart',
        attrs: {
          config: {
            summary: 'Monthly active developer integrations from July to October 2025',
            points: [
              {id: 'm1', label: 'July', value: 140},
              {id: 'm2', label: 'August', value: 260},
              {id: 'm3', label: 'September', value: 410},
              {id: 'm4', label: 'October', value: 680},
            ],
          },
        },
      },

      sectionHeading('mkt-testimonial', 'Customer Testimonial', 's-mkt-08'),
      {
        type: 'testimonial',
        attrs: {
          person: 'Elena Rostova',
          role: 'VP of Developer Experience',
          organisation: 'FinPay Global Inc.',
          consent: 'approved',
        },
        content: [
          p('“Write Studio transformed our technical documentation from a static handbook into an active product asset. Our partners now integrate in days instead of weeks.”'),
        ],
      },

      sectionHeading('mkt-takeaways', 'Key Takeaways & Lessons', 's-mkt-09'),
      {
        type: 'callout',
        attrs: {intent: 'tip'},
        content: [p('Treating developer documentation as a structured product interface directly accelerates commercial sales velocity and reduces support costs.')],
      },

      sectionHeading('mkt-cta', 'Next Steps & Call to Action', 's-mkt-10'),
      p('Learn how your engineering and product teams can streamline technical documentation with Write Studio:'),
      {
        type: 'referenceList',
        content: [
          {
            type: 'reference',
            attrs: {url: 'https://writestudio.example.com/enterprise', kind: 'website'},
            content: [{type: 'text', text: 'Schedule a Write Studio Enterprise Consultation'}],
          },
        ],
      },

      sectionHeading('mkt-sources', 'Data Sources & Methodology', 's-mkt-11'),
      p('Metrics collected via Mixpanel telemetry, Salesforce CRM pipeline tracking, and Zendesk support ticket analytics from July 1, 2025 to October 31, 2025. Approved for publication by FinPay Global Communications.'),
    ],
  },
};

/**
 * 5. UX Case Study Sample (Retained & Verified): CarePulse Emergency Clinic Booking
 */
export const uxCaseStudySample: SampleDocument = {
  title: 'CarePulse — Emergency Clinic Booking Redesign',
  documentType: 'ux_case_study',
  templateId: 'product-ux',
  templateVersion: 2,
  metadata: {
    role: 'Lead Product Designer',
    team: '2 designers, 4 engineers, 1 PM, 1 clinical advisor',
    timeline: 'March to June 2025 (4 months)',
    platform: 'Responsive Web & Mobile (iOS / Android)',
    objective: 'Reduce drop-off during urgent same-day clinic slot booking.',
    challenge: 'Patients in pain were abandoning the multi-step registration form.',
  },
  content: {
    type: 'doc',
    content: [
      sectionHeading('opening', 'Opening', 's-ux-01'),
      p('CarePulse is an urgent care network serving 240,000 patients annually across London. This redesign tackled emergency appointment booking on mobile devices.'),
      {
        type: 'metrics',
        attrs: {
          config: {
            items: [
              {value: '+32%', label: 'Booking completion rate'},
              {value: '2.1m', label: 'Average booking time (down from 7.5m)'},
              {value: '4.8/5', label: 'Patient satisfaction'},
            ],
          },
        },
      },

      sectionHeading('context', 'The Context', 's-ux-02'),
      p('Before this project, patients seeking immediate clinic slots were forced through an 8-step registration wizard requiring national insurance numbers and full medical history before slot selection was even revealed.'),

      sectionHeading('challenge', 'The Challenge', 's-ux-03'),
      p('High drop-off occurred on mobile devices where anxious patients in physical discomfort simply gave up and called emergency phone lines.'),
      {
        type: 'callout',
        attrs: {intent: 'warning'},
        content: [p('Over 48% of patients abandoned booking at step 3, creating immense call center overload.')],
      },

      sectionHeading('contribution', 'My Contribution', 's-ux-04'),
      p('As Lead Product Designer, I led user research with 18 emergency patients, established the rapid slot reservation architecture, designed all mobile UI components, and collaborated daily with the frontend engineering team.'),

      sectionHeading('decisions', 'Key Decisions', 's-ux-05'),
      p('Decision: Inverted booking funnel — allow patients to pick their time and clinic slot first, holding the reservation for 10 minutes before asking for patient information.'),
      {
        type: 'callout',
        attrs: {intent: 'info'},
        content: [p('Holding the appointment slot immediately relieved patient anxiety and eliminated rush errors.')],
      },

      sectionHeading('outcome', 'Outcome & Impact', 's-ux-06'),
      p('The redesigned booking flow reduced average reservation time from 7.5 minutes to 2.1 minutes and increased total completed bookings by 32%.'),
      {
        type: 'pullQuote',
        content: [{type: 'text', text: '“I was in severe pain with my child and booked a slot in less than two minutes from my phone in the car.” — Verified Patient'}],
      },
    ],
  },
};

/**
 * 6. Product Requirements Document (PRD) Sample: Next-Gen Global Checkout & Localization
 */
export const prdSample: SampleDocument = {
  title: 'Next-Gen Global Checkout & Localization PRD',
  documentType: 'product_requirements_document',
  templateId: 'prd',
  templateVersion: 1,
  metadata: {
    product_or_initiative: 'Global Checkout 2.0',
    owner: 'Marcus Vance (Head of Product)',
    status: 'Approved',
    target_release: 'Q3 2026',
    stakeholders: 'Engineering (Platform & Checkout), UX Research, Data Science, Regional Commercial Leads',
  },
  content: {
    type: 'doc',
    content: [
      sectionHeading('prd-summary', 'Executive Summary', 's-prd-01'),
      p('Global Checkout 2.0 reimagines our cross-border purchasing architecture, replacing rigid single-currency flows with dynamic local currency settlement, native payment methods, and automated tax calculation across 38 international markets.'),
      {
        type: 'callout',
        attrs: {intent: 'info'},
        content: [p('Targeted to deliver an incremental $24M annual GMV by capturing currently abandoned cross-border checkouts.')],
      },

      sectionHeading('prd-background', 'Background & Market Opportunity', 's-prd-02'),
      p('Our merchant base has expanded into Europe, Latin America, and Southeast Asia, but international buyers experience significant friction: 48% checkout abandonment due to lack of localized payment options (e.g. iDEAL, Pix, Klarna).'),
      {
        type: 'metrics',
        attrs: {
          config: {
            items: [
              {value: '48%', label: 'International cart abandonment'},
              {value: '38', label: 'Priority global expansion markets'},
              {value: '$24M', label: 'Projected annualized GMV unlock'},
            ],
          },
        },
      },

      sectionHeading('prd-problem', 'Problem Statement', 's-prd-03'),
      p('International consumers refuse to complete transactions when forced to pay in USD via unfamiliar credit card forms with unexpected cross-border bank fees.'),
      {
        type: 'pullQuote',
        content: [{type: 'text', text: '“When European customers reach our payment step and see only USD credit card fields, more than half drop off immediately.” — Merchant Feedback'}],
      },

      sectionHeading('prd-audience', 'Target Users & Needs', 's-prd-04'),
      p('Primary user groups and their operational requirements:'),
      {
        type: 'table',
        content: [
          {
            type: 'tableRow',
            content: [
              {type: 'tableHeader', content: [p('User Segment')]},
              {type: 'tableHeader', content: [p('Primary Need')]},
              {type: 'tableHeader', content: [p('Current Pain Point')]},
            ],
          },
          {
            type: 'tableRow',
            content: [
              {type: 'tableCell', content: [p('International Shopper')]},
              {type: 'tableCell', content: [p('Transparent pricing in local currency with native payment rails')]},
              {type: 'tableCell', content: [p('Surprise bank FX charges and unfamiliar forms')]},
            ],
          },
          {
            type: 'tableRow',
            content: [
              {type: 'tableCell', content: [p('Merchant Ops')]},
              {type: 'tableCell', content: [p('Single consolidated daily payout in base currency')]},
              {type: 'tableCell', content: [p('Multi-currency reconciliation overhead')]},
            ],
          },
        ],
      },

      sectionHeading('prd-goals', 'Goals & Non-goals', 's-prd-05'),
      p('Core initiative outcomes and explicit out-of-scope boundaries:'),
      {
        type: 'taskList',
        content: [
          {type: 'taskItem', attrs: {checked: true}, content: [p('Goal: Support 24 local payment methods across 38 countries by Q3 2026.')]},
          {type: 'taskItem', attrs: {checked: true}, content: [p('Goal: Reduce international checkout abandonment from 48% to under 25%.')]},
          {type: 'taskItem', attrs: {checked: false}, content: [p('Non-goal: Merchant cryptocurrency wallets or digital asset payouts.')]},
          {type: 'taskItem', attrs: {checked: false}, content: [p('Non-goal: Physical point-of-sale card terminal hardware integration.')]},
        ],
      },

      sectionHeading('prd-solution', 'Proposed Solution Direction', 's-prd-06'),
      p('A modular, SDK-driven checkout architecture that dynamically renders localized payment options, locks real-time foreign exchange rates for 15 minutes, and calculates duty and import tax at checkout.'),
      {
        type: 'callout',
        attrs: {intent: 'tip'},
        content: [p('Hosted checkout modals adapt automatically based on geo-IP, browser locale, and cart contents.')],
      },

      sectionHeading('prd-journeys', 'User Journeys & Workflows', 's-prd-07'),
      p('The buyer experience is streamlined into three low-friction steps: automated currency detection -> localized payment method selection -> instant confirmation.'),

      sectionHeading('prd-requirements', 'Product Requirements', 's-prd-08'),
      p('Prioritized functional and operational requirements:'),
      {
        type: 'requirementList',
        content: [
          {
            type: 'requirement',
            attrs: {reqId: 'PRD-REQ-01', priority: 'must'},
            content: [p('Automatic geo-IP location detection with manual country/currency selector override.')],
          },
          {
            type: 'requirement',
            attrs: {reqId: 'PRD-REQ-02', priority: 'must'},
            content: [p('Dynamic presentation of regional payment rails (iDEAL, Pix, Sofort, Bancontact).')],
          },
          {
            type: 'requirement',
            attrs: {reqId: 'PRD-REQ-03', priority: 'should'},
            content: [p('Real-time cross-border duty and VAT calculation with DDP (Delivered Duty Paid) pricing.')],
          },
        ],
      },

      sectionHeading('prd-success', 'Success Metrics & KPIs', 's-prd-09'),
      p('Quantitative benchmarks tracked across the 90-day post-launch evaluation window:'),
      {
        type: 'metrics',
        attrs: {
          config: {
            items: [
              {value: '+35%', label: 'International conversion rate lift'},
              {value: '< 800ms', label: 'Hosted checkout modal load time'},
              {value: '99.98%', label: 'Payment gateway availability'},
            ],
          },
        },
      },

      sectionHeading('prd-dependencies', 'Dependencies & Cross-functional Alignment', 's-prd-10'),
      p('Critical external integrations and cross-team dependencies:'),
      {
        type: 'table',
        content: [
          {
            type: 'tableRow',
            content: [
              {type: 'tableHeader', content: [p('Dependency')]},
              {type: 'tableHeader', content: [p('Owning Team')]},
              {type: 'tableHeader', content: [p('Target Date')]},
            ],
          },
          {
            type: 'tableRow',
            content: [
              {type: 'tableCell', content: [p('Stripe Elements Custom Rail Engine')]},
              {type: 'tableCell', content: [p('Payments Platform Team')]},
              {type: 'tableCell', content: [p('May 2026')]},
            ],
          },
          {
            type: 'tableRow',
            content: [
              {type: 'tableCell', content: [p('Avalara Cross-Border Tax API')]},
              {type: 'tableCell', content: [p('Finance Engineering')]},
              {type: 'tableCell', content: [p('June 2026')]},
            ],
          },
        ],
      },

      sectionHeading('prd-risks', 'Risks, Assumptions & Mitigations', 's-prd-11'),
      p('Identified operational, technical, and regulatory risks:'),
      {
        type: 'table',
        content: [
          {
            type: 'tableRow',
            content: [
              {type: 'tableHeader', content: [p('Risk / Assumption')]},
              {type: 'tableHeader', content: [p('Severity')]},
              {type: 'tableHeader', content: [p('Mitigation Plan')]},
            ],
          },
          {
            type: 'tableRow',
            content: [
              {type: 'tableCell', content: [p('Foreign exchange volatility during checkout session')]},
              {type: 'tableCell', content: [p('High')]},
              {type: 'tableCell', content: [p('Lock FX rate token for 15 minutes backed by treasury hedging reserve.')]},
            ],
          },
          {
            type: 'tableRow',
            content: [
              {type: 'tableCell', content: [p('Local regulatory changes in regional payment methods')]},
              {type: 'tableCell', content: [p('Medium')]},
              {type: 'tableCell', content: [p('Partner with local payment aggregators with automated compliance updates.')]},
            ],
          },
        ],
      },

      sectionHeading('prd-rollout', 'Rollout, Launch & GTM Strategy', 's-prd-12'),
      p('Four-stage rollout: Internal dogfooding in June -> Alpha with 20 EU merchants in July -> Beta in August -> General Availability in September 2026.'),

      sectionHeading('prd-open-questions', 'Open Questions & Decision Log', 's-prd-13'),
      p('Pending decisions: Whether to support installment payments (BNPL) in phase 1 or defer to Q4. Decision owner: Marcus Vance; deadline: April 30, 2026.'),
    ],
  },
};

/**
 * 7. Technical Design Document Sample: Distributed Event Ingestion & Delivery Engine
 */
export const technicalDesignSample: SampleDocument = {
  title: 'Distributed Event Ingestion & Webhook Delivery Engine',
  documentType: 'technical_design_document',
  templateId: 'technical-design',
  templateVersion: 1,
  metadata: {
    system_or_feature: 'Event Delivery Engine v2',
    author: 'Elena Chernova (Principal Systems Architect)',
    status: 'Accepted',
    reviewers: 'David K. (Staff SRE), Anita P. (Security Lead), Chen W. (Data Platform)',
    related_ticket: 'ARCH-1082',
  },
  content: {
    type: 'doc',
    content: [
      sectionHeading('tech-summary', 'Overview & Summary', 's-tech-01'),
      p('This technical design proposes a distributed, partitioned event ingestion and webhook delivery architecture capable of reliably dispatching 50,000 webhooks per second with sub-second p95 delivery latency and guaranteed at-least-once semantics.'),
      {
        type: 'callout',
        attrs: {intent: 'info'},
        content: [p('Architecture status: Accepted. Target implementation completion: Q3 2026.')],
      },

      sectionHeading('tech-context', 'Problem Context & Current State', 's-tech-02'),
      p('Our v1 webhook system relies on a monolithic Redis list queue and Celery worker pool. Under peak flash-sale loads (12,000 events/sec), Redis memory saturation causes worker starvation, resulting in webhook delivery delays exceeding 45 minutes.'),
      {
        type: 'metrics',
        attrs: {
          config: {
            items: [
              {value: '12k/s', label: 'Current peak throughput limit'},
              {value: '45m', label: 'Worst-case backlog latency during flash sales'},
              {value: '99.4%', label: 'Current delivery success SLA'},
            ],
          },
        },
      },

      sectionHeading('tech-goals', 'Technical Goals & Non-goals', 's-tech-03'),
      p('Explicit performance SLOs and engineering boundaries:'),
      {
        type: 'taskList',
        content: [
          {type: 'taskItem', attrs: {checked: true}, content: [p('Goal: Support 50,000 events/sec sustained ingestion with zero dropped events.')]},
          {type: 'taskItem', attrs: {checked: true}, content: [p('Goal: p95 webhook dispatch latency < 500ms from event publication.')]},
          {type: 'taskItem', attrs: {checked: true}, content: [p('Goal: Automatic exponential backoff retry over 72 hours per endpoint.')]},
          {type: 'taskItem', attrs: {checked: false}, content: [p('Non-goal: Exactly-once delivery semantics (at-least-once is guaranteed; consumers must be idempotent).')]},
        ],
      },

      sectionHeading('tech-constraints', 'Constraints & Assumptions', 's-tech-04'),
      p('System must deploy on existing Kubernetes clusters (EKS) across AWS us-east-1 and eu-west-1 with strict per-tenant data isolation.'),

      sectionHeading('tech-architecture', 'Proposed Architecture', 's-tech-05'),
      p('The architecture separates ingestion from dispatch using an event streaming backbone: API Ingestion Gateway -> Kafka Event Log (partitioned by customerId) -> Dispatch Worker Pool -> Circuit-Breaker HTTP Delivery Client.'),
      {
        type: 'callout',
        attrs: {intent: 'tip'},
        content: [p('Partitioning by customerId guarantees strict sequential event ordering per endpoint while allowing horizontal worker scaling.')],
      },

      sectionHeading('tech-components', 'Component Design', 's-tech-06'),
      p('Core subsystem components and responsibilities:'),
      {
        type: 'table',
        content: [
          {
            type: 'tableRow',
            content: [
              {type: 'tableHeader', content: [p('Component')]},
              {type: 'tableHeader', content: [p('Runtime')]},
              {type: 'tableHeader', content: [p('Responsibility')]},
            ],
          },
          {
            type: 'tableRow',
            content: [
              {type: 'tableCell', content: [p('Ingestion Gateway')]},
              {type: 'tableCell', content: [p('Go (Fiber)')]},
              {type: 'tableCell', content: [p('Validates payloads, checks tenant quotas, writes to Kafka topic')]},
            ],
          },
          {
            type: 'tableRow',
            content: [
              {type: 'tableCell', content: [p('Delivery Workers')]},
              {type: 'tableCell', content: [p('Rust (Tokio)')]},
              {type: 'tableCell', content: [p('Consumes partitions, signs HTTP payloads, executes async delivery')]},
            ],
          },
          {
            type: 'tableRow',
            content: [
              {type: 'tableCell', content: [p('Dead Letter Handler')]},
              {type: 'tableCell', content: [p('Python (AsyncIO)')]},
              {type: 'tableCell', content: [p('Schedules 72h exponential backoff retries and emits alerts')]},
            ],
          },
        ],
      },

      sectionHeading('tech-data-model', 'Data Model & Storage', 's-tech-07'),
      p('Persistent schema for webhook attempt logging and retry state:'),
      {
        type: 'codeBlock',
        attrs: {language: 'sql', title: 'schema.sql', lineNumbers: true, wrap: false},
        content: [
          {
            type: 'text',
            text: `CREATE TABLE webhook_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint_id UUID NOT NULL,
  event_id UUID NOT NULL,
  attempt_number INT NOT NULL DEFAULT 1,
  response_status INT,
  latency_ms INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (created_at);`,
          },
        ],
      },

      sectionHeading('tech-interfaces', 'Interfaces & API Specifications', 's-tech-08'),
      p('Internal RPC interface for publishing events to the dispatch pipeline:'),
      {
        type: 'parameterTable',
        attrs: {showRequired: true, showDefault: true},
        content: [
          {
            type: 'parameter',
            attrs: {name: 'eventId', type: 'string (UUID)', required: true, default: ''},
            content: [p('Unique event identifier for consumer idempotency tracking.')],
          },
          {
            type: 'parameter',
            attrs: {name: 'eventType', type: 'string', required: true, default: ''},
            content: [p('Dot-notated event name (e.g. payment.completed, order.created).')],
          },
          {
            type: 'parameter',
            attrs: {name: 'payload', type: 'object', required: true, default: '{}'},
            content: [p('Arbitrary JSON payload under 256KB.')],
          },
        ],
      },

      sectionHeading('tech-data-flow', 'Data Flow & Sequence', 's-tech-09'),
      p('Requests enter the Ingestion Gateway -> appended to Kafka partition -> read by dedicated partition consumer -> signed with HMAC-SHA256 -> dispatched via HTTP client pool.'),

      sectionHeading('tech-security', 'Security, Privacy & Compliance', 's-tech-10'),
      p('Security controls across the dispatch pipeline:'),
      {
        type: 'taskList',
        content: [
          {type: 'taskItem', attrs: {checked: true}, content: [p('All payloads signed with tenant-specific HMAC-SHA256 secret.')]},
          {type: 'taskItem', attrs: {checked: true}, content: [p('SSRF prevention: Webhook URLs resolving to private RFC 1918 IPs blocked.')]},
          {type: 'taskItem', attrs: {checked: true}, content: [p('TLS 1.3 enforced for all outgoing webhook connections.')]},
        ],
      },

      sectionHeading('tech-performance', 'Performance & Scalability', 's-tech-11'),
      p('Scalability profile under load:'),
      {
        type: 'metrics',
        attrs: {
          config: {
            items: [
              {value: '50,000/s', label: 'Max supported event throughput'},
              {value: '180ms', label: 'Measured p95 dispatch latency'},
              {value: '99.999%', label: 'Delivery success rate'},
            ],
          },
        },
      },

      sectionHeading('tech-failure', 'Failure Modes & Observability', 's-tech-12'),
      p('Fault recovery and circuit-breaker handling:'),
      {
        type: 'table',
        content: [
          {
            type: 'tableRow',
            content: [
              {type: 'tableHeader', content: [p('Failure Condition')]},
              {type: 'tableHeader', content: [p('System Response')]},
              {type: 'tableHeader', content: [p('Alert Threshold')]},
            ],
          },
          {
            type: 'tableRow',
            content: [
              {type: 'tableCell', content: [p('Endpoint 5xx errors > 10 in a row')]},
              {type: 'tableCell', content: [p('Trip circuit breaker; move to exponential retry queue')]},
              {type: 'tableCell', content: [p('Warn merchant via dashboard notification')]},
            ],
          },
          {
            type: 'tableRow',
            content: [
              {type: 'tableCell', content: [p('Kafka partition consumer crash')]},
              {type: 'tableCell', content: [p('Kafka consumer group rebalances partition to standby pod')]},
              {type: 'tableCell', content: [p('PagerDuty alert if rebalance takes > 10s')]},
            ],
          },
        ],
      },

      sectionHeading('tech-testing', 'Testing Strategy', 's-tech-13'),
      p('Comprehensive automated testing strategy covering unit tests, end-to-end integration with mock HTTP receivers, and Chaos Mesh partition failure simulations.'),

      sectionHeading('tech-alternatives', 'Alternatives & Trade-offs', 's-tech-14'),
      p('Architectural alternatives evaluated during the design phase:'),
      {
        type: 'table',
        content: [
          {
            type: 'tableRow',
            content: [
              {type: 'tableHeader', content: [p('Alternative Architecture')]},
              {type: 'tableHeader', content: [p('Advantages')]},
              {type: 'tableHeader', content: [p('Reason for Rejection')]},
            ],
          },
          {
            type: 'tableRow',
            content: [
              {type: 'tableCell', content: [p('AWS SQS + Lambda')]},
              {type: 'tableCell', content: [p('Fully managed, zero cluster maintenance')]},
              {type: 'tableCell', content: [p('Cannot guarantee strict FIFO ordering across millions of tenants cost-effectively')]},
            ],
          },
          {
            type: 'tableRow',
            content: [
              {type: 'tableCell', content: [p('Kafka + Dedicated Rust Workers (Chosen)')]},
              {type: 'tableCell', content: [p('Partition ordering, sub-millisecond overhead, low AWS cost')]},
              {type: 'tableCell', content: [p('Accepted higher operational burden of managing Kafka cluster')]},
            ],
          },
        ],
      },

      sectionHeading('tech-deployment', 'Deployment & Migration Plan', 's-tech-15'),
      p('Blue-green deployment: The new engine will run in shadow mode for two weeks, receiving duplicate event streams and verifying delivery timings before cutover.'),

      sectionHeading('tech-references', 'References & Prior Art', 's-tech-16'),
      p('Related architectural documents and RFCs:'),
      {
        type: 'referenceList',
        content: [
          {
            type: 'reference',
            attrs: {url: 'https://kafka.apache.org/documentation', kind: 'documentation'},
            content: [{type: 'text', text: 'Apache Kafka 3.7 Documentation'}],
          },
          {
            type: 'reference',
            attrs: {url: 'https://github.com/acme/event-engine', kind: 'repository'},
            content: [{type: 'text', text: 'Acme Event Engine Source Repository'}],
          },
        ],
      },
    ],
  },
};

/**
 * 8. Architecture Decision Record (ADR) Sample: ADR-012 Kafka for Cross-Region Streaming
 */
export const adrSample: SampleDocument = {
  title: 'ADR-012: Adoption of Kafka for Cross-Region Event Streaming',
  documentType: 'architecture_decision_record',
  templateId: 'adr',
  templateVersion: 1,
  metadata: {
    decision_title: 'ADR-012: Kafka for Cross-Region Streaming',
    status: 'Accepted',
    author: 'Devon Patel (Principal Infrastructure Architect)',
    decision_date: '2026-11-12',
    supersedes: 'ADR-003: RabbitMQ Cluster',
  },
  content: {
    type: 'doc',
    content: [
      sectionHeading('adr-status', 'Status', 's-adr-01'),
      {
        type: 'callout',
        attrs: {intent: 'info'},
        content: [p('Status: Accepted on 2026-11-12. Supersedes ADR-003 (RabbitMQ Cluster).')],
      },

      sectionHeading('adr-context', 'Context & Problem', 's-adr-02'),
      p('Our current message-broker infrastructure built on RabbitMQ cannot maintain strict ordering across multi-region active-active deployments. As international traffic scales to 50k events/sec, RabbitMQ queue mirroring creates cross-region latency spikes and frequent queue node partition splits.'),

      sectionHeading('adr-drivers', 'Decision Drivers', 's-adr-03'),
      p('Key technical criteria for evaluating broker technologies:'),
      {
        type: 'taskList',
        content: [
          {type: 'taskItem', attrs: {checked: true}, content: [p('Strict partition-level message ordering guaranteed per tenant.')]},
          {type: 'taskItem', attrs: {checked: true}, content: [p('Horizontal scalability to 100,000 writes/sec sustained.')]},
          {type: 'taskItem', attrs: {checked: true}, content: [p('Multi-region replication with low cross-region synchronization overhead.')]},
          {type: 'taskItem', attrs: {checked: true}, content: [p('Persistent replay capability for post-incident recovery.')]},
        ],
      },

      sectionHeading('adr-options', 'Options Considered', 's-adr-04'),
      p('Evaluation of viable streaming broker architectures:'),
      {
        type: 'table',
        content: [
          {
            type: 'tableRow',
            content: [
              {type: 'tableHeader', content: [p('Option')]},
              {type: 'tableHeader', content: [p('Pros')]},
              {type: 'tableHeader', content: [p('Cons')]},
            ],
          },
          {
            type: 'tableRow',
            content: [
              {type: 'tableCell', content: [p('Option 1: Retain RabbitMQ with Sharding')]},
              {type: 'tableCell', content: [p('Existing operational knowledge; zero migration overhead')]},
              {type: 'tableCell', content: [p('Mirroring splits under network partitions; no log replay capability')]},
            ],
          },
          {
            type: 'tableRow',
            content: [
              {type: 'tableCell', content: [p('Option 2: Apache Kafka with Strimzi on Kubernetes (Selected)')]},
              {type: 'tableCell', content: [p('High throughput, durable immutable commit log, consumer group rebalancing, multi-day replay')]},
              {type: 'tableCell', content: [p('Operational complexity; requires KRaft consensus management')]},
            ],
          },
          {
            type: 'tableRow',
            content: [
              {type: 'tableCell', content: [p('Option 3: AWS Kinesis')]},
              {type: 'tableCell', content: [p('Fully managed serverless offering')]},
              {type: 'tableCell', content: [p('Shard management limitations, high cross-region data transfer cost, vendor lock-in')]},
            ],
          },
        ],
      },

      sectionHeading('adr-decision', 'Decision & Rationale', 's-adr-05'),
      p('We will adopt Apache Kafka (managed via Strimzi on Kubernetes) as our standard cross-region event streaming backbone for all asynchronous inter-service communication.'),
      {
        type: 'callout',
        attrs: {intent: 'tip'},
        content: [p('Kafka’s partitioned commit log guarantees strict FIFO ordering per customer ID and allows consumer workers to replay events after outages.')],
      },

      sectionHeading('adr-consequences', 'Consequences & Trade-offs', 's-adr-06'),
      p('Accepted technical trade-offs and operational impacts:'),
      {
        type: 'table',
        content: [
          {
            type: 'tableRow',
            content: [
              {type: 'tableHeader', content: [p('Consequence Type')]},
              {type: 'tableHeader', content: [p('Impact Description')]},
            ],
          },
          {
            type: 'tableRow',
            content: [
              {type: 'tableCell', content: [p('Positive')]},
              {type: 'tableCell', content: [p('Scales to 100k+ events/sec; enables 7-day event retention and replay; eliminates broker memory exhaustion.')]},
            ],
          },
          {
            type: 'tableRow',
            content: [
              {type: 'tableCell', content: [p('Negative / Debt')]},
              {type: 'tableCell', content: [p('Requires training team on Strimzi operator; developers must handle rebalances and consumer lag monitoring.')]},
            ],
          },
        ],
      },

      sectionHeading('adr-references', 'References & Related Docs', 's-adr-07'),
      p('Supporting architectural documentation and benchmark findings:'),
      {
        type: 'referenceList',
        content: [
          {
            type: 'reference',
            attrs: {url: 'https://strimzi.io/docs', kind: 'documentation'},
            content: [{type: 'text', text: 'Strimzi Kafka Operator Documentation'}],
          },
        ],
      },
      // Evidence: metrics block
      {
        type: 'metrics',
        attrs: {
          config: {
            items: [
              {value: '100k/s', label: 'Kafka write throughput headroom'},
              {value: '< 4ms', label: 'Average broker append latency'},
              {value: '7 days', label: 'Event retention replay window'},
            ],
          },
        },
      },
    ],
  },
};

/**
 * 9. Standard Operating Procedure (SOP) Sample: Production Database Failover Runbook
 */
export const sopSample: SampleDocument = {
  title: 'SOP-OPS-042: Production Database Failover and Recovery Procedure',
  documentType: 'standard_operating_procedure',
  templateId: 'sop',
  templateVersion: 1,
  metadata: {
    process_name: 'Production Database Failover Runbook',
    process_owner: 'Site Reliability Engineering (SRE)',
    department: 'Infrastructure Operations',
    sop_version: 'v3.2',
    effective_date: '2026-11-12',
  },
  content: {
    type: 'doc',
    content: [
      sectionHeading('sop-info', 'Document Information', 's-sop-01'),
      p('Operational governance metadata for this procedure:'),
      {
        type: 'table',
        content: [
          {
            type: 'tableRow',
            content: [
              {type: 'tableHeader', content: [p('Field')]},
              {type: 'tableHeader', content: [p('Value')]},
            ],
          },
          {
            type: 'tableRow',
            content: [
              {type: 'tableCell', content: [p('Procedure ID')]},
              {type: 'tableCell', content: [p('SOP-OPS-042')]},
            ],
          },
          {
            type: 'tableRow',
            content: [
              {type: 'tableCell', content: [p('Process Owner')]},
              {type: 'tableCell', content: [p('Site Reliability Engineering (SRE)')]},
            ],
          },
          {
            type: 'tableRow',
            content: [
              {type: 'tableCell', content: [p('Effective Date')]},
              {type: 'tableCell', content: [p('2026-11-12')]},
            ],
          },
          {
            type: 'tableRow',
            content: [
              {type: 'tableCell', content: [p('Review Frequency')]},
              {type: 'tableCell', content: [p('Quarterly')]},
            ],
          },
        ],
      },

      sectionHeading('sop-purpose', 'Purpose & Objective', 's-sop-02'),
      p('This procedure defines the exact execution sequence for promoting a standby replica to primary database during a catastrophic primary node failure, ensuring data integrity with an RTO of under 5 minutes and zero data loss (RPO = 0s).'),

      sectionHeading('sop-scope', 'Scope & Applicability', 's-sop-03'),
      {
        type: 'callout',
        attrs: {intent: 'warning'},
        content: [p('Applies exclusively to production PostgreSQL clusters in AWS us-east-1 and eu-west-1. For staging database resets, refer to SOP-DEV-018.')],
      },
      {
        type: 'taskList',
        content: [
          {type: 'taskItem', attrs: {checked: true}, content: [p('Trigger: Primary database node unreachable or reporting hardware degradation.')]},
          {type: 'taskItem', attrs: {checked: true}, content: [p('Trigger: Automated Patroni health check failure persisting > 60 seconds.')]},
          {type: 'taskItem', attrs: {checked: false}, content: [p('Excluded: Planned routine schema migrations (refer to SOP-OPS-031).')]},
        ],
      },

      sectionHeading('sop-roles', 'Roles & Responsibilities', 's-sop-04'),
      p('RACI accountability matrix for execution:'),
      {
        type: 'table',
        content: [
          {
            type: 'tableRow',
            content: [
              {type: 'tableHeader', content: [p('Role')]},
              {type: 'tableHeader', content: [p('RACI')]},
              {type: 'tableHeader', content: [p('Responsibility')]},
            ],
          },
          {
            type: 'tableRow',
            content: [
              {type: 'tableCell', content: [p('Incident Commander (IC)')]},
              {type: 'tableCell', content: [p('Accountable')]},
              {type: 'tableCell', content: [p('Authorizes manual failover and coordinates team communications')]},
            ],
          },
          {
            type: 'tableRow',
            content: [
              {type: 'tableCell', content: [p('Primary SRE On-Call')]},
              {type: 'tableCell', content: [p('Responsible')]},
              {type: 'tableCell', content: [p('Executes failover commands and verifies replication stream health')]},
            ],
          },
          {
            type: 'tableRow',
            content: [
              {type: 'tableCell', content: [p('Engineering Lead')]},
              {type: 'tableCell', content: [p('Consulted')]},
              {type: 'tableCell', content: [p('Verifies application layer reconnection and query performance')]},
            ],
          },
        ],
      },

      sectionHeading('sop-prerequisites', 'Prerequisites & Tooling', 's-sop-05'),
      p('Required tooling and credentials before executing failover:'),
      {
        type: 'taskList',
        content: [
          {type: 'taskItem', attrs: {checked: true}, content: [p('Active AWS VPN session with production bastion access.')]},
          {type: 'taskItem', attrs: {checked: true}, content: [p('kubectl configured with cluster admin context on prod-eks-cluster.')]},
          {type: 'taskItem', attrs: {checked: true}, content: [p('patronictl CLI tool installed and authenticated.')]},
        ],
      },

      sectionHeading('sop-overview', 'Process Overview & Flow', 's-sop-06'),
      p('The failover process executes in four distinct phases: Verify Primary Failure (1 min) -> Promote Standby Replica (1 min) -> Switch Application DNS (1 min) -> Validate Cluster Health (2 min).'),

      sectionHeading('sop-procedure', 'Step-by-Step Procedure', 's-sop-07'),
      p('Execute the following numbered commands sequentially:'),
      {
        type: 'procedureSteps',
        content: [
          {
            type: 'procedureStep',
            attrs: {owner: 'Primary SRE On-Call', expected: 'Cluster topology shows primary node unhealthy.'},
            content: [p('Run patronictl -c /etc/patroni.yml list to inspect node health and replication lag across all members.')],
          },
          {
            type: 'procedureStep',
            attrs: {owner: 'Primary SRE On-Call', expected: 'Replica with 0 lag is promoted to leader.'},
            content: [p('Execute patronictl failover --candidate postgres-replica-02 to trigger manual promotion.')],
          },
          {
            type: 'procedureStep',
            attrs: {owner: 'Primary SRE On-Call', expected: 'App connection pool reconnects to new leader.'},
            content: [p('Verify that PgBouncer connection pool router redirects write traffic to the new leader within 15 seconds.')],
          },
        ],
      },
      {
        type: 'terminal',
        attrs: {shell: 'bash', prompt: '$'},
        content: [
          {type: 'terminalCommand', content: [{type: 'text', text: 'patronictl -c /etc/patroni.yml failover --candidate pg-replica-02'}]},
          {type: 'terminalOutput', content: [{type: 'text', text: 'Candidate: pg-replica-02\nPromoting pg-replica-02 to leader...\nPromotion successful.'}]},
        ],
      },

      sectionHeading('sop-decisions', 'Decision Points & Branching', 's-sop-08'),
      p('If replication lag on the candidate exceeds 10MB: Pause promotion and execute wal-g fetch to replay missing WAL segments before promotion to prevent data loss.'),

      sectionHeading('sop-exceptions', 'Exceptions & Escalation Paths', 's-sop-09'),
      {
        type: 'callout',
        attrs: {intent: 'warning'},
        content: [p('If split-brain condition is detected (two leaders active), immediately isolate old primary by revoking its security group before proceeding.')],
      },

      sectionHeading('sop-quality', 'Quality Verification Checklist', 's-sop-10'),
      p('Verification steps before declaring recovery complete:'),
      {
        type: 'taskList',
        content: [
          {type: 'taskItem', attrs: {checked: true}, content: [p('Read and write transaction tests succeed with response latency < 20ms.')]},
          {type: 'taskItem', attrs: {checked: true}, content: [p('Secondary replicas are actively replicating from the new leader.')]},
          {type: 'taskItem', attrs: {checked: true}, content: [p('Application error rate on DataDog dashboard returns to baseline < 0.01%.')]},
        ],
      },

      sectionHeading('sop-sla', 'Service Levels & Timelines', 's-sop-11'),
      p('Operational SLA commitments during database incident recovery:'),
      {
        type: 'metrics',
        attrs: {
          config: {
            items: [
              {value: '< 5m', label: 'Recovery Time Objective (RTO)'},
              {value: '0s', label: 'Recovery Point Objective (RPO)'},
              {value: '< 15s', label: 'PgBouncer connection pool switchover'},
            ],
          },
        },
      },

      sectionHeading('sop-related', 'Related Documents & References', 's-sop-12'),
      p('Upstream architecture and operations runbooks:'),
      {
        type: 'referenceList',
        content: [
          {
            type: 'reference',
            attrs: {url: 'https://patroni.readthedocs.io', kind: 'documentation'},
            content: [{type: 'text', text: 'Patroni High Availability Documentation'}],
          },
        ],
      },

      sectionHeading('sop-revision', 'Revision History & Change Log', 's-sop-13'),
      p('Log of past revisions and approvals:'),
      {
        type: 'table',
        content: [
          {
            type: 'tableRow',
            content: [
              {type: 'tableHeader', content: [p('Version')]},
              {type: 'tableHeader', content: [p('Date')]},
              {type: 'tableHeader', content: [p('Author')]},
              {type: 'tableHeader', content: [p('Changes')]},
            ],
          },
          {
            type: 'tableRow',
            content: [
              {type: 'tableCell', content: [p('v3.2')]},
              {type: 'tableCell', content: [p('2026-11-12')]},
              {type: 'tableCell', content: [p('Devon Patel')]},
              {type: 'tableCell', content: [p('Updated Patroni CLI failover flags for Kubernetes environment')]},
            ],
          },
          {
            type: 'tableRow',
            content: [
              {type: 'tableCell', content: [p('v3.1')]},
              {type: 'tableCell', content: [p('2026-04-15')]},
              {type: 'tableCell', content: [p('Sarah Lin')]},
              {type: 'tableCell', content: [p('Added PgBouncer connection drain verification step')]},
            ],
          },
        ],
      },
    ],
  },
};

export const SAMPLES: readonly SampleDocument[] = [
  developerDocsSample,
  featureSpecSample,
  releaseNotesSample,
  marketingCaseStudySample,
  uxCaseStudySample,
  prdSample,
  technicalDesignSample,
  adrSample,
  sopSample,
];
