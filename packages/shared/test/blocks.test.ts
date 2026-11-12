/**
 * Offline checks for the block contract (docs/multi-vertical/phase-3-block-contract.md):
 * attribute cleaning (B3), emptiness, plain text and Markdown for every block, fixtures (B4).
 * Run: npx tsx packages/shared/test/blocks.test.ts (scripts/security-suite.sh runs it).
 */
import assert from 'node:assert/strict';
import {
  BLOCK_CONTRACTS,
  BLOCK_FIXTURES,
  BLOCK_NAMES,
  blockContractProblems,
  cleanDocument,
  documentMarkdown,
  exportStudyMarkdown,
  hasContent,
  isEmptyBlock,
  documentMediaPaths,
  isEnforcedType,
  isSafeHref,
  studioDraftProblems,
  reviewCaseStudy,
  type JSONContent,
} from '../src/index';

let passed = 0;
const check = (name: string, run: () => void) => {
  run();
  passed += 1;
  console.log(`PASS ${name}`);
};
const doc = (...content: JSONContent[]): JSONContent => ({type: 'doc', content});
const fixture = (name: keyof typeof BLOCK_FIXTURES) => structuredClone(BLOCK_FIXTURES[name][1]);
const all = () => true;

check('the contract is complete: every block has rules, a fixture, text and Markdown, and cleaning its fixture changes nothing', () => {
  assert.deepEqual(blockContractProblems(), []);
});

check('cleaning is idempotent and leaves every valid fixture exactly as it was', () => {
  const every = doc(...BLOCK_NAMES.map(name => fixture(name)));
  const once = cleanDocument(every, all);
  assert.deepEqual(once.issues, []);
  assert.deepEqual(once.doc, every);
  assert.deepEqual(cleanDocument(once.doc, all).doc, once.doc);
});

check('cleaning: unknown attributes go, long text is shortened, bad values fall back, numbers are clamped', () => {
  const grid = fixture('imageGrid');
  const config = grid.attrs!.config as Record<string, unknown>;
  Object.assign(config, {columns: 9, gap: 'huge', caption: 'x'.repeat(600), evil: '<script>', mobileColumns: 'two'});
  const device = fixture('deviceMockup');
  ((device.attrs!.config as {devices: {rotate: number}[]}).devices[0]).rotate = 900;
  const report = cleanDocument(doc(grid, device), all);
  const cleaned = report.doc.content![0].attrs!.config as Record<string, unknown>;
  assert.equal(cleaned.columns, 2);
  assert.equal(cleaned.gap, 'md');
  assert.equal((cleaned.caption as string).length, 500);
  assert.equal('evil' in cleaned, false);
  assert.equal('mobileColumns' in cleaned, false, 'an invalid optional value is left out, not replaced');
  assert.equal((report.doc.content![1].attrs!.config as {devices: {rotate: number}[]}).devices[0].rotate, 180);
  assert.deepEqual(
    report.issues.map(issue => `${issue.type} ${issue.path} ${issue.rule}`).sort(),
    [
      'deviceMockup /1.config.devices[0].rotate outside -180–180',
      'imageGrid /0.config.caption longer than 500',
      'imageGrid /0.config.columns not one of the allowed values',
      'imageGrid /0.config.evil unknown attribute',
      'imageGrid /0.config.gap not one of the allowed values',
      'imageGrid /0.config.mobileColumns not one of the allowed values',
    ],
  );
});

check('cleaning: issues name the place and the rule, never the stored text', () => {
  const quote = fixture('pullQuote');
  (quote.attrs!.config as Record<string, unknown>).attribution = 'A secret name '.repeat(40);
  const report = cleanDocument(doc(quote), all);
  assert.ok(report.issues.length === 1);
  assert.equal(JSON.stringify(report.issues).includes('secret'), false);
});

check('cleaning: an unsafe link is removed and its text kept; media must be a private path', () => {
  for (const href of ['javascript:alert(1)', 'data:text/html,x', '//evil.example', 'vbscript:x', ' https://x']) assert.equal(isSafeHref(href), false, href);
  for (const href of ['https://example.com', 'http://example.com', 'mailto:a@example.com', 'tel:+441234', '/studio', '#section-1']) assert.equal(isSafeHref(href), true, href);
  const paragraph: JSONContent = {type: 'paragraph', content: [{type: 'text', text: 'Click', marks: [{type: 'link', attrs: {href: 'javascript:alert(1)'}}, {type: 'bold'}]}]};
  const image = fixture('image');
  image.attrs!.src = 'https://evil.example/x.png';
  const report = cleanDocument(doc(paragraph, image), all);
  assert.deepEqual(report.doc.content![0].content![0], {type: 'text', text: 'Click', marks: [{type: 'bold'}]});
  assert.equal(report.doc.content![1].attrs!.src, null);
});

check('cleaning: report-only types keep what was sent, enforced types get the cleaned form', () => {
  const callout = fixture('callout');
  callout.attrs!.tone = 'neon';
  const reported = cleanDocument(doc(callout), () => false);
  assert.equal(reported.doc.content![0].attrs!.tone, 'neon');
  assert.equal(reported.issues[0].enforced, false);
  const enforced = cleanDocument(doc(callout), all);
  assert.equal(enforced.doc.content![0].attrs!.tone, 'brand');
});

check('enforcement covers every block in the catalogue and all child parts (Phase 6 full enforcement)', () => {
  for (const name of BLOCK_NAMES) {
    assert.equal(isEnforcedType(name), true, `block: ${name}`);
  }
  for (const type of ['terminalCommand', 'terminalOutput', 'parameter', 'requirement', 'storyPart', 'scenario', 'scenarioStep', 'procedureStep', 'reference', 'listItem', 'taskItem', 'detailsSummary', 'detailsContent', 'tableRow', 'tableCell', 'tableHeader', 'doc', 'text', 'hardBreak']) {
    assert.equal(isEnforcedType(type), true, `part or root: ${type}`);
  }
});

check('exportStudyMarkdown preserves title, subtitle, summary, metadata facts table, and body', () => {
  const md = exportStudyMarkdown({
    title: 'Acme Test Doc',
    subtitle: 'A testing guide',
    summary: 'Executive summary text.',
    metadata: {version: 'v1.0.0', status: 'Approved'},
    content: doc(fixture('callout')),
  });
  assert.ok(md.includes('# Acme Test Doc'));
  assert.ok(md.includes('_A testing guide_'));
  assert.ok(md.includes('> **Summary**'));
  assert.ok(md.includes('Executive summary text.'));
  assert.ok(md.includes('| **Version** | v1.0.0 |'));
  assert.ok(md.includes('| **Status** | Approved |'));
  assert.ok(md.includes('> [!WARNING]'));
});

check('every media path in a block is checked for ownership, including a testimonial’s photo', () => {
  const testimonial = fixture('testimonial');
  const photo = String(testimonial.attrs!.photo);
  assert.ok(documentMediaPaths(doc(testimonial)).includes(photo));
  const [owner, space] = photo.split('/');
  assert.deepEqual(studioDraftProblems({content: doc(testimonial), thumbnail_path: null, cover_path: null}, owner, space), []);
  const someoneElse = '00000000-0000-4000-8000-00000000000a';
  assert.ok(studioDraftProblems({content: doc(testimonial), thumbnail_path: null, cover_path: null}, someoneElse, space).length === 1);
});

check('cleaning never changes its input', () => {
  const callout = fixture('callout');
  callout.attrs!.tone = 'neon';
  const input = doc(callout);
  const copy = structuredClone(input);
  cleanDocument(input, all);
  assert.deepEqual(input, copy);
});

check('every block reads as empty when it has nothing a reader would see', () => {
  const empty: Partial<Record<(typeof BLOCK_NAMES)[number], JSONContent>> = {
    paragraph: {type: 'paragraph'},
    heading: {type: 'heading', attrs: {level: 3}},
    image: {type: 'image', attrs: {src: null}},
    imageGrid: {type: 'imageGrid', attrs: {config: {items: []}}},
    metrics: {type: 'metrics', attrs: {config: {items: [{value: '', label: 'Faster', detail: ''}]}}},
    chart: {type: 'chart', attrs: {config: {points: [{id: 'c', label: 'Week', value: null}]}}},
    timeline: {type: 'timeline', attrs: {config: {phases: [{id: 'p', when: '', title: '', text: ''}]}}},
    researchInsights: {type: 'researchInsights', attrs: {config: {insights: [{id: 'i', finding: ' ', evidence: '', source: ''}]}}},
    callout: {type: 'callout', content: [{type: 'paragraph'}]},
    embed: {type: 'embed', attrs: {src: 'https://evil.example/frame'}},
    horizontalRule: {type: 'horizontalRule'},
    spacer: {type: 'spacer', attrs: {size: 'md'}},
  };
  for (const [name, node] of Object.entries(empty)) assert.equal(isEmptyBlock(node), true, name);
  for (const name of BLOCK_NAMES.filter(name => name !== 'horizontalRule' && name !== 'spacer')) assert.equal(isEmptyBlock(fixture(name)), false, name);
  assert.equal(hasContent({type: 'imageGrid', attrs: {config: {items: []}}}), false, 'an empty grid no longer makes a section "in progress"');
  assert.equal(hasContent({type: 'someFutureBlock'}), true, 'an unknown block counts, to be safe');
});

check('plain text: what a reader reads, including alt text, figures and captions', () => {
  assert.equal(BLOCK_CONTRACTS.metrics.toText(fixture('metrics')), '32% Faster booking Median, March');
  assert.equal(BLOCK_CONTRACTS.chart.toText(fixture('chart')), 'Weekly bookings\nBookings rose.\nWeek 1: 120\nWeek 2: 180.5\nAnalytics');
  assert.equal(BLOCK_CONTRACTS.image.toText({type: 'image', attrs: {src: 'x', alt: 'A chart', decorative: true}}), '', 'decorative pictures have no text');
});

check('Markdown: text structure, marks, links and tables', () => {
  const markdown = documentMarkdown(doc(fixture('heading'), fixture('paragraph'), fixture('orderedList'), fixture('taskList'), fixture('codeBlock'), fixture('table'), fixture('horizontalRule')));
  assert.equal(
    markdown,
    [
      '### What we learned',
      '**Booking took** [four minutes](https://example.com/study) on average.',
      '1. Search\n2. Book',
      '- [x] Interview six patients\n- [ ] Test the prototype',
      '```json\n{\n  "status": "booked"\n}\n```',
      '| Metric | Value |\n| --- | --- |\n| Bookings | 180 |',
      '---',
    ].join('\n\n') + '\n',
  );
});

check('Markdown: visual and data blocks become text a reader can still use', () => {
  const media = (path: string) => `media/${path.split('/').pop()}`;
  const md = (name: keyof typeof BLOCK_FIXTURES) => documentMarkdown(doc(fixture(name)), media).trim();
  assert.equal(md('metrics'), '- **32%** Faster booking — Median, March');
  assert.equal(md('chart'), '**Weekly bookings**\n\nBookings rose.\n\n| Label | Value |\n| --- | --- |\n| Week 1 | 120 |\n| Week 2 | 180.5 |\n\nSource: Analytics');
  assert.equal(md('flowDiagram'), '1. Start: Open the app\n2. Decision: Signed in? → _Yes_\n3. End: Booked');
  assert.equal(md('callout'), '> [!WARNING]\n> Half of patients gave up before paying.');
  assert.equal(md('pullQuote'), '> I just want to see a doctor tonight.\n>\n> — A patient, Interview 4');
  assert.ok(md('imageGrid').startsWith('![Sketches](media/00000000-0000-4000-8000-000000000004.png)\n![Wireframes]'));
  assert.equal(md('embed'), '[The prototype walkthrough](https://www.youtube.com/watch?v=dQw4w9WgXcQ)');
});

check('Markdown: text is escaped, unsafe links are dropped, unknown blocks are named, never silently lost', () => {
  const tricky: JSONContent = {type: 'paragraph', content: [{type: 'text', text: '<img src=x> *not bold* [x](javascript:1)', marks: [{type: 'link', attrs: {href: 'javascript:alert(1)'}}]}]};
  const markdown = documentMarkdown(doc(tricky, {type: 'apiEndpoint', attrs: {}}));
  assert.equal(/(^|[^\\])<img/.test(markdown), false, 'the angle bracket is escaped: no HTML');
  assert.equal(/(^|[^\\])\]\(javascript/.test(markdown), false, 'no link to an unsafe address');
  assert.ok(markdown.includes('\\*not bold\\*'));
  assert.ok(markdown.includes('_(apiEndpoint block not available in Markdown)_'));
});

check('review: the new blocks say what is unfinished, and requirement ids must be unique', () => {
  const requirements = fixture('requirementList');
  (requirements.content![1].attrs as Record<string, unknown>).reqId = 'FR-1';
  const criteria = fixture('acceptanceCriteria');
  criteria.content![0].content = criteria.content![0].content!.filter(step => step.attrs?.keyword !== 'then');
  const testimonial = fixture('testimonial');
  Object.assign(testimonial.attrs!, {person: '', consent: 'pending'});
  const code: JSONContent = {type: 'codeBlock', attrs: {language: null}, content: [{type: 'text', text: 'ls -la'}]};
  const story: JSONContent = {type: 'userStory', content: [{type: 'storyPart', attrs: {part: 'role'}, content: [{type: 'text', text: 'a nurse'}]}, {type: 'storyPart', attrs: {part: 'goal'}}, {type: 'storyPart', attrs: {part: 'benefit'}}]};
  const messages = reviewCaseStudy({title: 'Spec', content: doc(requirements, criteria, testimonial, code, story, fixture('terminal'), fixture('parameterTable'))}).warnings.map(warning => warning.message);
  for (const expected of [
    'Two requirements share the id “FR-1”.',
    'An acceptance criteria block has a scenario without a Given, a When or a Then.',
    'A testimonial doesn’t say who said it.',
    'A testimonial isn’t marked as approved by the person quoted.',
    'A code block has no language.',
    'A user story has an entry that isn’t finished.',
  ]) assert.ok(messages.includes(expected), `missing: ${expected} in ${JSON.stringify(messages)}`);
  assert.equal(messages.some(message => /terminal|parameter table/.test(message)), false, 'finished blocks raise nothing');
});

check('Markdown for the new blocks: commands and output apart, ids, Given/When/Then, a real table', () => {
  const md = (name: keyof typeof BLOCK_FIXTURES) => documentMarkdown(doc(fixture(name))).trim();
  assert.equal(md('terminal'), '```console\n$ npm install @clinic/sdk\nadded 12 packages in 2s\n$ npx clinic login\n```');
  assert.equal(md('requirementList'), '- **FR-1** (Must) Patients can book a slot without an account.\n- **FR-2** The price is shown before the slot is chosen.');
  assert.equal(md('acceptanceCriteria'), '**Scenario: Booking without an account** (FR-1)\n- **Given** I am not signed in\n- **When** I choose a free slot\n- **Then** the slot is held for 10 minutes\n- **And** I am asked for a phone number');
  assert.equal(md('userStory'), 'As **a patient with a sick child**, I want **to book the earliest slot tonight**, so that **my child is seen before morning**.');
  assert.equal(md('parameterTable'), '| Name | Type | Required | Default | Description |\n| --- | --- | --- | --- | --- |\n| `clinicId` | string | Yes |  | The clinic to book at. |\n| `timeout` | number | No | `30` | Seconds to wait for a free slot. |');
  assert.equal(documentMarkdown(doc(structuredClone(BLOCK_FIXTURES.codeBlock[2]))).trim(), '**book.ts**\n\n```typescript\nconst booking = await client.bookings.create({clinicId});\nconsole.log(booking.status);\n```');
  assert.ok(md('referenceList').startsWith('- [Google developer documentation style guide](https://developers.google.com/style)\n- Ticket BOOK-412'));
  assert.ok(md('testimonial').endsWith('> — Dr Asha Rao, Practice manager, Northside Clinic'));
});

console.log(`${passed}/${passed} passed`);
