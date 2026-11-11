/**
 * Offline checks for the story review engine (Stage 5). Run: npx tsx packages/shared/test/review.test.ts
 * (scripts/security-suite.sh runs it).
 */
import assert from 'node:assert/strict';
import {CURRENT_FRAMEWORKS, FRAMEWORKS, caseStudyTemplate, chartRows, recommendedFramework, defaultChart, frameworkSection, getFramework, hasContent, normaliseSections, progressLabel, reviewCaseStudy} from '../src/index';

let passed = 0;
const check = (name: string, run: () => void) => {
  run();
  passed += 1;
  console.log(`PASS ${name}`);
};
const p = (text: string) => ({type: 'paragraph', content: [{type: 'text', text}]});

check('a blank template: 10 sections, nothing complete, checklist all open', () => {
  const review = reviewCaseStudy({title: 'Untitled case study', content: caseStudyTemplate()});
  assert.deepEqual(review.progress, {total: 10, complete: 0, review: 0, inProgress: 0, empty: 10});
  assert.ok(review.checklist.every(item => !item.done));
  assert.ok(review.checklist.filter(item => item.key !== 'evidence').every(item => item.sectionId), 'each story item points at its section');
  assert.ok(review.warnings.some(warning => warning.message === 'The case study has no title.'));
});

const doc = normaliseSections({
  type: 'doc',
  content: [
    {type: 'heading', attrs: {level: 2, section: 'challenge'}},
    p('Drop-off was high.'),
    {type: 'heading', attrs: {level: 2, section: 'outcome', sectionStatus: 'complete'}},
    {type: 'metrics', attrs: {config: {items: [{value: '32%', label: 'Faster'}, {value: '', label: 'Drop-off'}]}}},
    {type: 'image', attrs: {src: 'o/w/c/a.png', alt: ''}},
    {type: 'image', attrs: {src: 'o/w/c/b.png', alt: '', decorative: true}},
    {type: 'embed', attrs: {src: 'https://example.com/not-a-provider'}},
    {type: 'heading', attrs: {level: 2}, content: [{type: 'text', text: 'Accessibility'}]},
  ],
});
const review = reviewCaseStudy({title: 'Clinic booking', content: doc, cover_path: 'o/w/library/x.png', thumbnail_alt: ''});
const messages = review.warnings.map(warning => warning.message);

check('progress counts complete / in progress / empty sections', () => {
  assert.deepEqual(review.progress, {total: 3, complete: 1, review: 0, inProgress: 1, empty: 1});
  assert.equal(progressLabel(review.progress), '1 of 3 sections complete');
});
check('checklist: written sections are covered; missing ones offer to add the framework section', () => {
  const byKey = Object.fromEntries(review.checklist.map(item => [item.key, item]));
  assert.equal(byKey.problem.done, true);
  assert.equal(byKey.outcome.done, true);
  assert.equal(byKey.evidence.done, true, 'an image is evidence');
  assert.equal(byKey.decisions.done, false);
  assert.equal(byKey.decisions.addKey, 'decisions');
});
check('a picture without alt text is flagged, a decorative one is not', () => {
  assert.equal(messages.filter(message => message.includes('without alt text')).length, 1);
});
check('figures without a value, an unusable embed and the cover alt text are flagged', () => {
  assert.ok(messages.includes('A metrics block has figures without a value or label.'));
  assert.ok(messages.some(message => message.includes('link that can’t be shown')));
  assert.ok(review.warnings.some(warning => warning.message === 'The cover picture has no alt text.' && warning.inDetails));
});
check('every block warning points at its block and section', () => {
  for (const warning of review.warnings.filter(item => item.nodeIndex !== null)) {
    assert.ok(warning.sectionId, warning.message);
    assert.ok(doc.content![warning.nodeIndex!].type !== 'heading');
  }
});
check('an empty section of your own is a suggestion, not a fix', () => {
  const own = review.warnings.find(warning => warning.message === '“Accessibility” is empty.');
  assert.equal(own?.severity, 'consider');
});
check('no title warning when the case study has one', () => {
  assert.ok(!messages.includes('The case study has no title.'));
});

// ---- T4: content cards, Research insights, Chart ----
const t4 = (nodes: object[]) =>
  reviewCaseStudy({title: 'T4', content: normaliseSections({type: 'doc', content: [{type: 'heading', attrs: {level: 2, section: 'outcome'}}, ...nodes]})});
check('a chart never counts made-up rows: only a label with a number is drawn', () => {
  assert.equal(chartRows(defaultChart()).length, 0, 'a new chart starts with no values');
  assert.equal(chartRows({points: [{id: 'a', label: 'A', value: 3}, {id: 'b', label: '', value: 2}, {id: 'c', label: 'C', value: null}]}).length, 1);
});
check('an empty chart asks for values; a chart with values asks for a summary', () => {
  const empty = t4([{type: 'chart', attrs: {config: defaultChart()}}]).warnings.map(w => w.message);
  assert.ok(empty.includes('A chart has no values yet.'));
  const unsummarised = t4([{type: 'chart', attrs: {config: {...defaultChart(), points: [{id: 'a', label: 'Q1', value: 4}]}}}]).warnings.map(w => w.message);
  assert.ok(unsummarised.includes('A chart has no summary for people who can’t see it.'));
  const done = t4([{type: 'chart', attrs: {config: {...defaultChart(), summary: 'Up.', points: [{id: 'a', label: 'Q1', value: 4}]}}}]);
  assert.ok(!done.warnings.some(w => w.message.startsWith('A chart')));
  assert.ok(done.checklist.find(item => item.key === 'evidence')?.done, 'a filled-in chart is evidence');
});
check('research insights: no findings is a fix; findings without evidence a suggestion', () => {
  const none = t4([{type: 'researchInsights', attrs: {config: {insights: [{id: 'a', finding: '', evidence: '', source: ''}]}}}]).warnings;
  assert.ok(none.some(w => w.message === 'A research insights block has no findings yet.' && w.severity === 'fix'));
  const thin = t4([{type: 'researchInsights', attrs: {config: {insights: [{id: 'a', finding: 'Night bookings', evidence: '', source: ''}]}}}]).warnings;
  assert.ok(thin.some(w => w.message === 'A research insights block has findings without evidence.' && w.severity === 'consider'));
});
check('an empty callout card is not content; framework v2 recommends the T4 cards, v1 is unchanged', () => {
  assert.equal(hasContent({type: 'callout', content: [{type: 'paragraph'}]}), false);
  assert.equal(hasContent({type: 'callout', content: [p('Drop-off was high.')]}), true);
  assert.deepEqual(frameworkSection('outcome', getFramework('product-ux', 2))?.suggestedVisuals, ['resultsHighlights', 'metrics', 'chart', 'pullQuote']);
  assert.deepEqual(frameworkSection('outcome', getFramework('product-ux', 1))?.suggestedVisuals, ['metrics', 'pullQuote']);
  assert.equal(frameworkSection('outcome')?.title, frameworkSection('outcome', getFramework('product-ux', 2))?.title);
});

// ---- T7: frameworks ----
check('a section key means the same section in every framework that uses it', () => {
  const byKey = new Map<string, string>();
  for (const framework of FRAMEWORKS) for (const section of framework.sections) {
    const title = byKey.get(section.key);
    assert.ok(title === undefined || title === section.title, `${section.key} is "${title}" and "${section.title}"`);
    byKey.set(section.key, section.title);
  }
});
check('every project type has its own recommended framework, all offered for new case studies', () => {
  assert.equal(recommendedFramework('research').id, 'ux-research');
  assert.equal(recommendedFramework('redesign').id, 'redesign');
  assert.equal(recommendedFramework('feature').id, 'feature');
  assert.equal(recommendedFramework('product-ux').id, 'product-ux');
  for (const type of ['research', 'redesign', 'feature', 'product-ux'] as const) assert.ok(CURRENT_FRAMEWORKS.includes(recommendedFramework(type)));
});
check('each new framework covers the whole story checklist, and the review uses it', () => {
  for (const id of ['ux-research', 'redesign', 'feature']) {
    const framework = getFramework(id, 1)!;
    const covered = new Set(framework.sections.map(section => section.covers).filter(Boolean));
    assert.deepEqual([...covered].sort(), ['context', 'contribution', 'decisions', 'outcome', 'problem'], id);
  }
  const research = getFramework('ux-research', 1)!;
  const doc = normaliseSections({type: 'doc', content: [{type: 'heading', attrs: {level: 2, section: 'research-question'}}, p('Why do people book at night?')]});
  const review = reviewCaseStudy({title: 'Study', content: doc, framework: research});
  assert.ok(review.checklist.find(item => item.key === 'problem')?.done, 'research questions count as the problem');
  assert.equal(review.checklist.find(item => item.key === 'outcome')?.addKey, 'research-impact', 'Add section offers the framework’s own section');
});
console.log(`\n${passed}/${passed} passed`);
