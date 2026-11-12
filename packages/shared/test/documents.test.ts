/**
 * Offline checks for the multi-vertical foundation: document types and statuses, the template
 * registry and the block catalogue. Run: npx tsx packages/shared/test/documents.test.ts
 * (scripts/security-suite.sh runs it).
 */
import assert from 'node:assert/strict';
import {
  BLOCK_CATALOG,
  BLOCK_NAMES,
  BLOCK_SCHEMAS,
  CURRENT_TEMPLATES,
  DEFAULT_DOCUMENT_TYPE,
  DOCUMENT_TYPES,
  EXPORTS_READY,
  SETUP_STEPS,
  STUDIO_STATUSES,
  TEMPLATES,
  TEMPLATE_CATEGORIES,
  blocksFor,
  canChangeStatus,
  catalogProblems,
  cleanMetadata,
  cleanSetup,
  defaultTemplate,
  documentNoun,
  documentTypeOf,
  getTemplate,
  isAvailableDocumentType,
  isStudioStatus,
  isUntitledTitle,
  newerTemplate,
  projectTypeFor,
  templateChanges,
  templateLibrary,
  templateMatches,
  universalTemplates,
  newSetup,
  outlineDocument,
  outlineFor,
  recommendBlocks,
  reviewCaseStudy,
  templateProblems,
  templateSection,
  templatesFor,
  untitledTitle,
  type DocumentTemplate,
  type StudioStatus,
} from '../src/index';

let passed = 0;
const check = (name: string, run: () => void) => {
  run();
  passed += 1;
  console.log(`PASS ${name}`);
};

// ---- Document types -------------------------------------------------------------------------------
check('every document type has a category, a noun and a presentation; ids are storable', () => {
  for (const [id, type] of Object.entries(DOCUMENT_TYPES)) {
    assert.match(id, /^[a-z][a-z0-9_]{1,59}$/, id);
    assert.ok(type.category in TEMPLATE_CATEGORIES, id);
    assert.ok(type.label && type.noun && type.description && type.presentation, id);
  }
  assert.equal(DEFAULT_DOCUMENT_TYPE, 'ux_case_study');
});

check('a type can be created only when it has a current template of its own', () => {
  assert.equal(isAvailableDocumentType('ux_case_study'), true);
  for (const id of Object.keys(DOCUMENT_TYPES)) {
    assert.equal(isAvailableDocumentType(id), CURRENT_TEMPLATES.some(template => template.documentType === id), id);
  }
  assert.equal(isAvailableDocumentType('blog_post'), false);
  assert.equal(isAvailableDocumentType(null), false);
});

check('nouns and untitled titles follow the type; unknown types read as "document"', () => {
  assert.equal(documentNoun('ux_case_study'), 'case study');
  assert.equal(untitledTitle('ux_case_study'), 'Untitled case study');
  assert.equal(untitledTitle('nonsense'), 'Untitled document');
});

// ---- Status lifecycle -----------------------------------------------------------------------------
check('statuses: four private states, no published or public one', () => {
  assert.deepEqual([...STUDIO_STATUSES], ['draft', 'in_progress', 'ready_for_review', 'archived']);
  assert.equal(isStudioStatus('published'), false);
  assert.equal(isStudioStatus('public'), false);
  assert.equal(isStudioStatus('ready_for_review'), true);
});

check('status moves: working states in any order, anything to archived, archived only back to draft', () => {
  const working: StudioStatus[] = ['draft', 'in_progress', 'ready_for_review'];
  for (const from of working) {
    for (const to of working) assert.equal(canChangeStatus(from, to), from !== to, `${from} -> ${to}`);
    assert.equal(canChangeStatus(from, 'archived'), true);
  }
  assert.equal(canChangeStatus('archived', 'draft'), true);
  assert.equal(canChangeStatus('archived', 'in_progress'), false);
  assert.equal(canChangeStatus('archived', 'ready_for_review'), false);
  assert.equal(canChangeStatus('archived', 'archived'), false);
  assert.equal(canChangeStatus('draft', 'published' as StudioStatus), false);
});

// ---- Template registry ----------------------------------------------------------------------------
check('the template registry is valid (ids, versions, section keys, blocks, rules, export profiles)', () => {
  assert.deepEqual(templateProblems(), []);
});

check('an invalid template is reported, not accepted', () => {
  const good = getTemplate('product-ux', 2)!;
  const bad: DocumentTemplate = {
    ...good,
    id: 'Bad Id',
    version: 0,
    exportProfiles: [],
    recommendedBlocks: ['notABlock' as never],
    sections: [
      {...good.sections[0], key: 'x-one', act: 'nowhere', covers: 'no-such-rule', suggestedBlocks: ['alsoNotABlock' as never]},
      {...good.sections[1], key: 'x-one'},
    ],
  };
  const problems = templateProblems([bad]);
  for (const expected of ['lowercase words', 'whole number', 'export profile', 'unknown block, notABlock', 'used twice', 'unknown act', 'unknown validation rule', 'unknown block, alsoNotABlock']) {
    assert.ok(problems.some(problem => problem.includes(expected)), `expected a problem mentioning "${expected}" in ${JSON.stringify(problems)}`);
  }
});

check('a section key can’t be reused by another template or change its title', () => {
  const ux = getTemplate('product-ux', 2)!;
  const thief: DocumentTemplate = {...ux, id: 'other', sections: [{...ux.sections[0]}]};
  assert.ok(templateProblems([ux, thief]).some(problem => problem.includes('already belongs to product-ux')));
  const retitled: DocumentTemplate = {...ux, version: 3, sections: ux.sections.map((section, index) => (index ? section : {...section, title: 'Something else'}))};
  assert.ok(templateProblems([ux, retitled]).some(problem => problem.includes('can’t change its title')));
});

check('released versions stay resolvable; a document keeps the version it was made with (A04)', () => {
  const v1 = getTemplate('product-ux', 1)!;
  const v2 = getTemplate('product-ux', 2)!;
  assert.ok(v1 && v2 && v1 !== v2);
  assert.ok(TEMPLATES.includes(v1), 'v1 is still registered');
  assert.ok(!CURRENT_TEMPLATES.includes(v1), 'v1 is no longer offered');
  assert.notDeepEqual(templateSection('outcome', v1)?.suggestedBlocks, templateSection('outcome', v2)?.suggestedBlocks);
  assert.equal(getTemplate('product-ux', 99), undefined);
  assert.equal(getTemplate('gone', 1), undefined);
  assert.equal(templateSection('no-such-key'), undefined);
});

check('every template describes itself: purpose, audience, document type, export profiles', () => {
  for (const template of TEMPLATES) {
    assert.ok(template.description && template.purpose, template.id);
    assert.ok(template.exportProfiles.length, template.id);
    assert.ok(template.documentType === 'any' || template.documentType in DOCUMENT_TYPES, template.id);
  }
  assert.equal(getTemplate('blank', 1)?.documentType, 'any');
});

check('templates for a type: its own first, then the ones that fit any type; the default is the first', () => {
  const ux = templatesFor('ux_case_study');
  assert.deepEqual(ux.map(template => template.id), ['product-ux', 'ux-research', 'redesign', 'feature', 'blank']);
  assert.equal(defaultTemplate('ux_case_study')?.id, 'product-ux');
  assert.equal(defaultTemplate()?.version, 2);
  assert.equal(documentTypeOf(getTemplate('ux-research', 1)), 'ux_case_study');
  assert.equal(documentTypeOf(getTemplate('blank', 1)), 'ux_case_study');
  assert.equal(documentTypeOf(getTemplate('blank', 1), 'not_a_type'), 'ux_case_study');
});

// ---- Template library, search and versions (Phase 2) ----------------------------------------------
check('the library: four categories in order, every document type in one, current templates only', () => {
  const library = templateLibrary();
  assert.deepEqual(library.map(group => group.category), ['product_engineering', 'marketing_growth', 'design_research', 'operations_knowledge']);
  const types = library.flatMap(group => group.types.map(type => type.type));
  assert.deepEqual([...types].sort(), Object.keys(DOCUMENT_TYPES).sort());
  const listed = library.flatMap(group => group.types.flatMap(type => type.templates));
  assert.deepEqual([...listed, ...universalTemplates()].sort((a, b) => a.id.localeCompare(b.id)), [...CURRENT_TEMPLATES].sort((a, b) => a.id.localeCompare(b.id)));
  assert.ok(!listed.includes(getTemplate('product-ux', 1)!), 'superseded versions are not offered');
  assert.deepEqual(universalTemplates().map(template => template.id), ['blank']);
});

check('search: every word must match the name, purpose, audience, type or a section title', () => {
  const research = getTemplate('ux-research', 1)!;
  const blank = getTemplate('blank', 1)!;
  assert.equal(templateMatches(research, ''), true);
  assert.equal(templateMatches(research, 'Research'), true);
  assert.equal(templateMatches(research, 'findings'), true, 'a section title');
  assert.equal(templateMatches(getTemplate('redesign', 1)!, 'research'), false, 'a category name alone is not a match');
  assert.equal(templateMatches(research, 'researchers'), true, 'the audience');
  assert.equal(templateMatches(research, 'research invoice'), false, 'every word must match');
  assert.equal(templateMatches(blank, 'blank'), true);
  assert.equal(templateMatches(blank, 'findings'), false);
});

check('versions: a document on an old version is offered the newest, with exactly what would change', () => {
  const v1 = getTemplate('product-ux', 1)!;
  const v2 = getTemplate('product-ux', 2)!;
  assert.equal(newerTemplate(v1), v2);
  assert.equal(newerTemplate(v2), undefined);
  assert.equal(newerTemplate(getTemplate('blank', 1)), undefined);
  assert.equal(newerTemplate(undefined), undefined);
  const changes = templateChanges(v1, v2);
  assert.deepEqual([changes.added, changes.removed, changes.requiredChanged, changes.guidanceChanged], [[], [], [], []]);
  assert.ok(changes.recommendationsChanged.some(section => section.key === 'outcome'));
  const invented = {...v2, version: 3, sections: [...v2.sections.slice(1).map(section => (section.key === 'context' ? {...section, purpose: 'Reworded.', required: false} : section)), {...v2.sections[0], key: 'x-new', title: 'New'}]};
  const next = templateChanges(v2, invented);
  assert.deepEqual([next.added.map(s => s.key), next.removed.map(s => s.key), next.requiredChanged.map(s => s.key), next.guidanceChanged.map(s => s.key)], [['x-new'], ['opening'], ['context'], ['context']]);
});

check('only formats that can be exported today are offered', () => {
  assert.deepEqual([...EXPORTS_READY], ['pdf', 'html_zip']);
  for (const template of CURRENT_TEMPLATES) assert.ok(template.exportProfiles.some(profile => EXPORTS_READY.includes(profile)), template.id);
});

check('placeholder titles are recognised for every document type', () => {
  for (const title of ['Untitled case study', 'Untitled guide', 'Untitled document', ' Untitled procedure ']) assert.equal(isUntitledTitle(title), true, title);
  for (const title of ['Untitled', 'Untitled thing', 'My case study', '', null]) assert.equal(isUntitledTitle(title), false, String(title));
});

// ---- Setup ----------------------------------------------------------------------------------------
check('setup: the document type comes from the template, never from the browser', () => {
  const setup = {...newSetup(), title: 'Checkout', document_type: 'developer_documentation'};
  const {setup: clean, problems} = cleanSetup(setup);
  assert.equal(clean.document_type, 'ux_case_study');
  assert.equal(clean.template_id, 'product-ux');
  assert.equal(clean.template_version, 2);
  assert.ok(problems.some(problem => problem.includes('different kind of document')), JSON.stringify(problems));
  assert.deepEqual(cleanSetup(newSetup()).problems, []);
  assert.ok(cleanSetup({...newSetup(), template_id: 'nope'}).problems.length);
});

check('setup: four steps; an old saved step resumes at the start; the project type follows the template', () => {
  assert.deepEqual([...SETUP_STEPS], ['start', 'details', 'cover', 'outline']);
  for (const step of ['type', 'framework', 'nonsense']) assert.equal(cleanSetup({...newSetup(), step}).setup.step, 'start');
  assert.equal(cleanSetup({...newSetup(), step: 'cover'}).setup.step, 'cover');
  assert.deepEqual(['product-ux', 'ux-research', 'redesign', 'feature'].map(id => projectTypeFor(CURRENT_TEMPLATES.find(template => template.id === id))), ['product-ux', 'research', 'redesign', 'feature']);
  assert.equal(projectTypeFor(getTemplate('blank', 1)), null);
  const research = CURRENT_TEMPLATES.find(template => template.id === 'ux-research')!;
  assert.equal(cleanSetup({...newSetup(), template_id: research.id, template_version: research.version, outline: []}).setup.project_type, 'research');
  assert.equal(cleanSetup({...newSetup(), project_type: 'redesign'}).setup.project_type, 'redesign', 'an explicit answer is kept');
  assert.equal(cleanSetup({...newSetup(), project_type: 'made-up'}).setup.project_type, null, 'an unknown answer is dropped, not guessed');
});

check('setup: template metadata is cleaned against the template (unknown keys dropped, text capped)', () => {
  const template: DocumentTemplate = {
    ...getTemplate('blank', 1)!,
    metadataFields: [
      {key: 'product', label: 'Product', kind: 'text', max: 10, storage: 'metadata'},
      {key: 'role', label: 'Role', kind: 'text', max: 200, storage: 'column'},
    ],
  };
  assert.deepEqual(cleanMetadata(template, {product: '  Payments API, version two  ', role: 'x', evil: '<script>', empty: ''}), {product: 'Payments A'});
  assert.deepEqual(cleanMetadata(template, 'nonsense'), {});
  assert.deepEqual(cleanMetadata(undefined, {product: 'x'}), {});
  assert.deepEqual(cleanMetadata(template, {product: 42}), {});
});

check('a new document from a template: one tagged, empty section per template section', () => {
  const template = defaultTemplate('ux_case_study')!;
  const doc = outlineDocument(outlineFor(template), template);
  const headings = (doc.content ?? []).filter(node => node.type === 'heading');
  assert.equal(headings.length, template.sections.length);
  assert.deepEqual(headings.map(heading => heading.attrs?.section), template.sections.map(section => section.key));
  assert.ok(headings.every(heading => !heading.content), 'titles are placeholders, never stored text');
});

// ---- Block catalogue ------------------------------------------------------------------------------
check('the block catalogue is valid (ids, versions, names)', () => {
  assert.deepEqual(catalogProblems(), []);
  assert.ok(BLOCK_NAMES.length >= 29);
});

check('every block with a schema is in the catalogue, at the same version', () => {
  for (const [type, schema] of Object.entries(BLOCK_SCHEMAS)) {
    assert.ok(type in BLOCK_CATALOG, `${type} has review rules but no catalogue entry`);
    assert.equal(schema.schemaVersion, BLOCK_CATALOG[type as keyof typeof BLOCK_CATALOG].version, type);
  }
});

check('recommendations: the section first, then the template, then blocks made for the type; no repeats', () => {
  const template = getTemplate('product-ux', 2)!;
  const inSection = recommendBlocks({template, sectionKey: 'outcome'});
  assert.deepEqual(inSection.slice(0, 4), ['resultsHighlights', 'metrics', 'chart', 'pullQuote']);
  assert.equal(new Set(inSection).size, inSection.length);
  const outside = recommendBlocks({template, sectionKey: null});
  assert.deepEqual(outside.slice(0, template.recommendedBlocks.length), template.recommendedBlocks);
  assert.ok(blocksFor('ux_case_study').every(block => outside.includes(block)));
  assert.deepEqual(recommendBlocks({}), []);
  assert.ok(blocksFor('developer_documentation').includes('codeBlock'));
  assert.ok(!blocksFor('developer_documentation').includes('deviceMockup'));
});

// ---- Review uses the document's own template ------------------------------------------------------
check('review: the checklist comes from the template’s validation rules, and names the document by its type', () => {
  const template = getTemplate('ux-research', 1)!;
  const review = reviewCaseStudy({title: '', content: outlineDocument(outlineFor(template), template), framework: template});
  assert.deepEqual(review.checklist.map(item => item.key), template.validationRules.map(rule => rule.key));
  assert.ok(review.checklist.every(item => !item.done));
  assert.ok(review.warnings.some(warning => warning.message === 'The case study has no title.'));
});

console.log(`${passed}/${passed} passed`);
