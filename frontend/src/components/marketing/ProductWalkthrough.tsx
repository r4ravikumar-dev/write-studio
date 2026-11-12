import {CheckCircle2, Lightbulb} from 'lucide-react';
import {StickyStory, type StoryStep} from './motion/StickyStory';

/** Curated product states. Each mirrors a real Studio surface; nothing here is a feature the Studio lacks. */

function OutlineVisual() {
  const items = [
    {name: 'Overview & business goals', status: 'Done'},
    {name: 'User personas & pain points', status: 'Done'},
    {name: 'Technical architecture & data flows', status: 'In progress'},
    {name: 'API contracts & endpoint schemas', status: 'To do'},
    {name: 'Security & compliance', status: 'To do'},
  ];
  return (
    <div className="m-demo">
      <p className="m-demo-heading">Story outline</p>
      <ul className="m-demo-list">
        {items.map(item => (
          <li key={item.name} className="m-demo-row" data-current={item.status === 'In progress' ? '' : undefined}>
            <span>{item.name}</span>
            <span className={item.status === 'Done' ? 'm-badge m-badge--success' : 'm-badge'}>
              {item.status}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function GuidanceVisual() {
  const questions = [
    'What latency thresholds must the new architecture meet?',
    'Which services talk synchronously, and which through queues?',
    'How does the system fail gracefully when a third-party API times out?',
  ];
  return (
    <div className="m-demo">
      <p className="m-demo-heading m-demo-heading--brand">Guide · Technical architecture</p>
      <ul className="m-demo-list">
        {questions.map(question => (
          <li key={question} className="m-demo-row m-demo-row--text">
            {question}
          </li>
        ))}
      </ul>
      <p className="m-demo-tip">
        <Lightbulb size={16} aria-hidden="true" />
        Add a sequence diagram and a parameter table.
      </p>
    </div>
  );
}

function BlocksVisual() {
  const params = [
    {name: 'dry_run', type: 'boolean', desc: 'Validate without saving the draft'},
    {name: 'format', type: 'string', desc: 'pdf | html_zip | markdown'},
  ];
  return (
    <div className="m-demo">
      <div className="m-demo-titlebar">
        <p className="m-demo-heading">API endpoint block</p>
        <span className="m-badge m-badge--success">POST</span>
      </div>
      <code className="m-demo-code">/api/v1/documents/:id/export</code>
      <table className="m-demo-table">
        <thead>
          <tr>
            <th scope="col">Parameter</th>
            <th scope="col">Type</th>
            <th scope="col">Description</th>
          </tr>
        </thead>
        <tbody>
          {params.map(p => (
            <tr key={p.name}>
              <td>
                <code>{p.name}</code>
              </td>
              <td>{p.type}</td>
              <td>{p.desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReviewVisual() {
  const rules = [
    'Context and problem definition',
    'Technical architecture diagrams',
    'API schemas with error handling',
    'Image descriptions for accessibility',
  ];
  return (
    <div className="m-demo">
      <p className="m-demo-heading">Review checklist</p>
      <ul className="m-demo-list">
        {rules.map(rule => (
          <li key={rule} className="m-demo-row">
            <span className="m-demo-check">
              <CheckCircle2 size={16} aria-hidden="true" />
              {rule}
            </span>
            <span className="m-badge m-badge--success">Done</span>
          </li>
        ))}
      </ul>
      <p className="m-caption">Export to PDF, HTML, Markdown or a JSON backup.</p>
    </div>
  );
}

const STEPS: StoryStep[] = [
  {
    id: 'walkthrough-structure',
    eyebrow: '1 · Structure',
    title: 'Start with purpose-built sections, not an empty cursor',
    body: 'Every template gives you a table of contents designed for that document type. Reorder, rename or remove sections as your project needs.',
    visual: <OutlineVisual />,
  },
  {
    id: 'walkthrough-guidance',
    eyebrow: '2 · Guidance',
    title: 'Know what belongs in each section',
    body: 'Section guidance shows the questions your readers need answered, so you can draft without second-guessing.',
    visual: <GuidanceVisual />,
  },
  {
    id: 'walkthrough-blocks',
    eyebrow: '3 · Composition',
    title: 'Insert blocks made for technical and product writing',
    body: 'Syntax-highlighted code, terminal commands, Given/When/Then scenarios, parameter tables and device mock-ups sit right in the flow of your document.',
    visual: <BlocksVisual />,
  },
  {
    id: 'walkthrough-review',
    eyebrow: '4 · Review & output',
    title: 'Check the draft, then export',
    body: 'The review checklist confirms sections are filled in, evidence is attached and images have descriptions before you export to PDF, HTML or Markdown.',
    visual: <ReviewVisual />,
  },
];

export function ProductWalkthrough() {
  return <StickyStory steps={STEPS} label="How a document comes together" />;
}
