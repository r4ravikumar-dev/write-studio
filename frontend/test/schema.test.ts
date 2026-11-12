/**
 * Offline checks that the editor and the server agree on what a document is (block contract §3.3
 * check 1, and B2). Run: (cd frontend && npx tsx --tsconfig tsconfig.json test/schema.test.ts)
 * (scripts/security-suite.sh runs it).
 */
import assert from 'node:assert/strict';
import {getSchema} from '@tiptap/core';
import {
  BLOCK_FIXTURES,
  BLOCK_NAMES,
  MARK_ATTRIBUTES,
  NODE_ATTRIBUTES,
  UNKNOWN_BLOCK,
  cleanDocument,
  unwrapUnknownBlocks,
  type JSONContent,
} from '@studio/shared';
import {caseStudyExtensions} from '../src/components/caseStudy/schema';
import {checkDocument} from '../src/components/caseStudy/documentCheck';

let passed = 0;
const check = (name: string, run: () => void) => {
  run();
  passed += 1;
  console.log(`PASS ${name}`);
};
const schema = getSchema(caseStudyExtensions);
/** ProseMirror's resolved attributes (not in its public types). */
const attrsOf = (type: unknown) => (type as {attrs: Record<string, {default?: unknown}>}).attrs;
const sorted = (values: Iterable<string>) => [...values].sort();

check('the editor and the server know the same node types (the placeholder is editor-only)', () => {
  assert.deepEqual(sorted(Object.keys(schema.nodes).filter(name => name !== UNKNOWN_BLOCK)), sorted(Object.keys(NODE_ATTRIBUTES)));
});

check('…and the same attributes on every node', () => {
  for (const [name, type] of Object.entries(schema.nodes)) {
    if (name === UNKNOWN_BLOCK) continue;
    assert.deepEqual(sorted(Object.keys(attrsOf(type))), sorted(Object.keys(NODE_ATTRIBUTES[name])), name);
  }
});

check('…and the same marks with the same attributes', () => {
  assert.deepEqual(sorted(Object.keys(schema.marks)), sorted(Object.keys(MARK_ATTRIBUTES)));
  for (const [name, type] of Object.entries(schema.marks)) assert.deepEqual(sorted(Object.keys(attrsOf(type))), sorted(Object.keys(MARK_ATTRIBUTES[name])), name);
});

check('every catalogue block is a node the editor can hold', () => {
  for (const name of BLOCK_NAMES) assert.ok(schema.nodes[name], name);
});

check('every block fixture loads in the editor schema and comes back unchanged', () => {
  for (const name of BLOCK_NAMES) {
    for (const fixture of Object.values(BLOCK_FIXTURES[name])) {
      const doc: JSONContent = {type: 'doc', content: [fixture]};
      const loaded = schema.nodeFromJSON(doc);
      loaded.check();
      // ProseMirror fills in attributes left out; every attribute a fixture sets must survive.
      const back = JSON.parse(JSON.stringify(loaded.toJSON())) as JSONContent;
      assert.deepEqual(stripNullsAndDefaults(back.content![0]), stripNullsAndDefaults(fixture), name);
    }
  }
});

const future = {type: 'apiEndpoint', attrs: {config: {method: 'GET', path: '/v1/bookings', auth: 'bearer'}}};
const withFuture: JSONContent = {
  type: 'doc',
  content: [
    {type: 'heading', attrs: {level: 2, section: null, sectionId: 'sabcdef12', sectionStatus: null, textAlign: null}, content: [{type: 'text', text: 'Written by the user'}]},
    {type: 'paragraph', content: [{type: 'text', text: 'Three paragraphs of real work.'}]},
    future,
    {type: 'bulletList', content: [{type: 'listItem', content: [{type: 'paragraph', content: [{type: 'text', text: 'A list with a ', marks: [{type: 'futureMark'}]}]}]}]},
  ],
};

check('B2: a document with a block this version doesn’t know opens, with that block locked, and nothing else changed', () => {
  const result = checkDocument(withFuture);
  assert.ok(result.ok);
  if (!result.ok) return;
  assert.equal(result.wrapped, 2, 'the unknown block and the list with an unknown mark');
  const content = result.content.content!;
  assert.deepEqual(content.map(node => node.type), ['heading', 'paragraph', UNKNOWN_BLOCK, UNKNOWN_BLOCK]);
  assert.deepEqual(content.slice(0, 2), withFuture.content!.slice(0, 2), 'what the editor knows is untouched');
});

check('B2: through the real schema and back, the wrapped blocks are restored byte for byte', () => {
  const result = checkDocument(withFuture);
  if (!result.ok) throw new Error('not ok');
  const loaded = schema.nodeFromJSON(result.content);
  const saved = unwrapUnknownBlocks(JSON.parse(JSON.stringify(loaded.toJSON())));
  assert.deepEqual(saved.content![2], future);
  assert.deepEqual(saved.content![3], withFuture.content![3]);
  assert.deepEqual(JSON.stringify(saved.content![2]), JSON.stringify(future));
});

check('B2: a document this version can’t read at all is refused, not opened empty', () => {
  assert.equal(checkDocument(null).ok, false);
  assert.equal(checkDocument({type: 'paragraph'}).ok, false);
  const broken = checkDocument({type: 'doc', content: [{type: 'paragraph', content: [{type: 'text'}]}]});
  assert.equal(broken.ok, false, 'a text node without text can’t be read');
});

check('B2: the server refuses unknown types, including the editor-only placeholder', () => {
  assert.deepEqual(cleanDocument(withFuture, () => false).unknown.sort(), ['apiEndpoint', 'mark:futureMark']);
  assert.deepEqual(cleanDocument({type: 'doc', content: [{type: UNKNOWN_BLOCK, attrs: {original: future}}]}, () => false).unknown, [UNKNOWN_BLOCK]);
});

/** Attributes equal to their schema default, or null, are what ProseMirror fills in: compare without them. */
function stripNullsAndDefaults(node: JSONContent): JSONContent {
  const type = schema.nodes[node.type ?? ''];
  const attrs = Object.fromEntries(
    Object.entries(node.attrs ?? {}).filter(([key, value]) => value !== null && JSON.stringify(value) !== JSON.stringify(type ? attrsOf(type)[key]?.default : undefined)),
  );
  const {attrs: _drop, ...rest} = node;
  void _drop;
  return {...rest, ...(Object.keys(attrs).length ? {attrs} : {}), ...(node.content ? {content: node.content.map(stripNullsAndDefaults)} : {})};
}

console.log(`${passed}/${passed} passed`);
