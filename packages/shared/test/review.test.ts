/**
 * Offline checks for the story review engine (Stage 5). Run: npx tsx packages/shared/test/review.test.ts
 * (scripts/security-suite.sh runs it).
 */
import assert from 'node:assert/strict';
import {caseStudyTemplate, normaliseSections, progressLabel, reviewCaseStudy} from '../src/index';

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
console.log(`\n${passed}/${passed} passed`);
