'use client';

import {useState} from 'react';
import {BookOpen, CheckCircle2, Circle, CircleDot} from 'lucide-react';

type View = 'editor' | 'outline' | 'preview';
type Status = 'complete' | 'active' | 'todo';

/** The real Developer documentation v1 sections (packages/shared/src/templates/developerDocumentation.ts). */
const SECTIONS: {title: string; status: Status}[] = [
  {title: 'Overview', status: 'complete'},
  {title: 'Prerequisites', status: 'complete'},
  {title: 'Quick Start', status: 'complete'},
  {title: 'Installation and Setup', status: 'complete'},
  {title: 'Core Concepts', status: 'active'},
  {title: 'Implementation Guide', status: 'todo'},
  {title: 'Code Examples', status: 'todo'},
  {title: 'Configuration Reference', status: 'todo'},
  {title: 'API / Interface Reference', status: 'todo'},
  {title: 'Error Handling', status: 'todo'},
  {title: 'Troubleshooting & FAQs', status: 'todo'},
  {title: 'Additional Resources', status: 'todo'},
];

const STATUS_LABEL: Record<Status, string> = {complete: 'Complete', active: 'In progress', todo: 'Not started'};

const CODE = `const signature = req.headers['acme-signature'];
const event = acme.webhooks.constructEvent(
  req.rawBody,
  signature,
  process.env.ACME_WEBHOOK_SECRET
);`;

function StatusIcon({status}: {status: Status}) {
  if (status === 'complete') return <CheckCircle2 size={14} aria-hidden="true" className="m-sc-ok" />;
  if (status === 'active') return <CircleDot size={14} aria-hidden="true" className="m-sc-active" />;
  return <Circle size={14} aria-hidden="true" className="m-sc-todo" />;
}

function SectionBody({withToolbar}: {withToolbar?: boolean}) {
  return (
    <>
      <p className="m-sc-kicker">Section 5 · Core Concepts</p>
      <p className="m-sc-title">Webhook signature verification</p>
      <p className="m-sc-text">
        Every webhook event from Acme carries a timestamp and an HMAC-SHA256 signature in the{' '}
        <code>Acme-Signature</code> header. <mark className="m-sc-mark">Verify each payload before you run any business logic.</mark>
      </p>
      {withToolbar && (
        <div className="m-float-toolbar m-glass" aria-hidden="true">
          <span data-on>B</span>
          <span>I</span>
          <span>U</span>
          <hr />
          <span>Link</span>
          <span>Highlight</span>
        </div>
      )}
      <div className="m-block-demo">
        <div className="m-sc-codebar">
          <span>TypeScript</span>
          <span>Node.js 20+</span>
        </div>
        <pre>{CODE}</pre>
      </div>
      <table className="m-demo-table">
        <thead>
          <tr>
            <th scope="col">Header</th>
            <th scope="col">Type</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>Acme-Signature</code>
            </td>
            <td>string (t=timestamp, v1=hex HMAC)</td>
          </tr>
        </tbody>
      </table>
    </>
  );
}

export function HeroShowcase() {
  const [view, setView] = useState<View>('editor');
  const done = SECTIONS.filter(s => s.status === 'complete').length;

  return (
    <div className="m-hero-showcase-wrap">
      <figure className="m-hero-showcase" aria-label="Write Studio editor, showing a developer documentation draft">
        <div className="m-hero-showcase-bar">
          <div className="m-hero-dots" aria-hidden="true">
            <span className="m-hero-dot" />
            <span className="m-hero-dot" />
            <span className="m-hero-dot" />
          </div>
          <p className="m-sc-doc only-wide">
            Acme webhook integration guide · Developer documentation
            <span className="m-badge m-badge--brand">Ready for review</span>
          </p>
          <div className="m-segmented" role="group" aria-label="Showcase view">
            {(['editor', 'outline', 'preview'] as const).map(option => (
              <button key={option} type="button" aria-pressed={view === option} onClick={() => setView(option)}>
                {option[0].toUpperCase() + option.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {view === 'editor' && (
          <div key="editor" className="m-hero-grid m-showcase-view">
            <div className="m-hero-sidebar">
              <p className="m-demo-heading">Story outline</p>
              <ul className="m-sc-outline">
                {SECTIONS.slice(0, 9).map(section => (
                  <li key={section.title} data-active={section.status === 'active' ? '' : undefined}>
                    <StatusIcon status={section.status} />
                    <span>{section.title}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="m-hero-canvas">
              <div className="m-sc-sheet">
                <SectionBody withToolbar />
              </div>
            </div>

            <div className="m-hero-aside">
              <p className="m-demo-heading m-demo-heading--brand m-sc-guide-title">
                <BookOpen size={14} aria-hidden="true" /> Guide
              </p>
              <p className="m-sc-text m-sc-strong">What this section should explain</p>
              <ul className="m-sc-bullets">
                <li>How events are delivered and retried.</li>
                <li>How timestamps stop replay attacks.</li>
                <li>A verification snippet readers can copy.</li>
              </ul>
              <p className="m-demo-heading">Recommended blocks</p>
              <div className="m-cluster m-sc-chips">
                <span className="m-badge">Code block</span>
                <span className="m-badge">Parameter table</span>
                <span className="m-badge">Terminal</span>
              </div>
            </div>
          </div>
        )}

        {view === 'outline' && (
          <div key="outline" className="m-sc-outline-view m-showcase-view">
            <div className="m-sc-progress">
              <p className="m-sc-text m-sc-strong">
                {done} of {SECTIONS.length} sections complete
              </p>
              <div className="m-sc-progress-track" aria-hidden="true">
                <span style={{'--m-progress': done / SECTIONS.length} as React.CSSProperties} />
              </div>
            </div>
            <ol className="m-sc-outline-grid">
              {SECTIONS.map((section, index) => (
                <li key={section.title} className="m-demo-row" data-current={section.status === 'active' ? '' : undefined}>
                  <span className="m-demo-check">
                    <StatusIcon status={section.status} />
                    <span>
                      {index + 1}. {section.title}
                    </span>
                  </span>
                  <span className={section.status === 'complete' ? 'm-badge m-badge--success' : 'm-badge'}>
                    {STATUS_LABEL[section.status]}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {view === 'preview' && (
          <div key="preview" className="m-sc-preview m-showcase-view">
            <article className="m-sc-article">
              <p className="m-meta">Developer documentation · v2.3</p>
              <p className="m-sc-article-title">Acme webhook integration guide</p>
              <p className="m-sc-text">Receive, verify and process Acme events safely in your own service.</p>
              <hr className="m-sc-rule" />
              <SectionBody />
            </article>
          </div>
        )}
      </figure>
    </div>
  );
}
