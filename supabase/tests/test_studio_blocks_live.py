"""
Live multi-vertical Phase 3 test: the block contract against the running app.

  B2  a document holding a block this version doesn't know opens with that block locked, previews
      without failing, and is never saved over; a document written by a newer content schema opens
      read-only; a document that can't be read at all isn't opened; the API refuses unknown types
      and the editor-only placeholder.
  B3  report-only cleaning keeps what was sent for existing blocks (enforcement is per block).

Needs Django :8000 (console email), Express :4000, Next :3000 and the staging DB. Creates throwaway
@example.test accounts and removes them at the end.

    backend/django/.venv/bin/python -I supabase/tests/test_studio_blocks_live.py "$PWD" <django-console-log>
"""
import hashlib, json, os, subprocess, sys, tempfile, uuid

root, log = sys.argv[1:3]
helpers = open(f'{root}/supabase/tests/test_studio_storage_live.py').read().split('PNG = base64')[0]
ns = {'__name__': 'helpers'}; sys.argv = ['x', root, log]; exec(helpers, ns)
call, API, WEB, ok, sign_in, results = ns['call'], ns['API'], ns['WEB'], ns['ok'], ns['sign_in'], ns['results']
import psycopg
from psycopg.types.json import Jsonb
j = lambda b: json.loads(b or b'{}')
tag = uuid.uuid4().hex[:6]
A, B = sign_in(f'blocks-a-{tag}@example.test'), sign_in(f'blocks-b-{tag}@example.test')
ta, tb = A['access'], B['access']
ca, cb = f'studio_access={ta}', f'studio_access={tb}'
DOCS = '/api/app/documents'
db = psycopg.connect(ns['dj']['DATABASE_URL'], autocommit=True)
FIELDS = ['slug', 'title', 'subtitle', 'label', 'area', 'tags', 'summary', 'focus', 'thumbnail_path', 'thumbnail_alt', 'thumbnail_focus', 'cover_path',
          'layout', 'project_type', 'role', 'team', 'timeline', 'platform', 'objective', 'challenge']

p = lambda text: {'type': 'paragraph', 'content': [{'type': 'text', 'text': text}]}
FUTURE = {'type': 'apiEndpoint', 'attrs': {'config': {'method': 'GET', 'path': '/v1/bookings', 'auth': 'bearer'}}}
FUTURE_LIST = {'type': 'bulletList', 'content': [{'type': 'listItem', 'content': [{'type': 'paragraph', 'content': [{'type': 'text', 'text': 'Marked up later', 'marks': [{'type': 'futureMark'}]}]}]}]}
content = {'type': 'doc', 'content': [
    {'type': 'heading', 'attrs': {'level': 2, 'sectionId': 'sfuture01', 'sectionStatus': None, 'section': None, 'textAlign': None}, 'content': [{'type': 'text', 'text': 'Kept section'}]},
    p('Written by the user before the update.'),
    FUTURE,
    FUTURE_LIST,
    p('And after it.'),
]}


def new_document(title):
    s, b, _ = API(ta, 'POST', DOCS, {'title': title})
    return j(b)['id']


def stored(doc_id):
    row = db.execute('select content, md5(content::text), updated_at from public.studio_documents where id = %s', (doc_id,)).fetchone()
    return row


# ---- B2: a block from the future ---------------------------------------------------------------------
future_id = new_document('From the future')
db.execute('update public.studio_documents set content = %s where id = %s', (Jsonb(content), future_id))
_, before_md5, before_at = stored(future_id)

s, html, _ = WEB(f'/studio/documents/{future_id}/edit', ca)
page = html.decode('utf-8', 'replace')
ok('the editor page opens (not an error) for a document with unknown blocks', s == 200, s)
ok('…and says two blocks need a newer version and are kept as they are', '2 blocks need a newer version' in page and 'kept exactly as they are' in page)
s, html, _ = WEB(f'/studio/documents/{future_id}/preview', ca)
page = html.decode('utf-8', 'replace')
ok('the preview renders instead of failing', s == 200, s)
ok('…with a short notice in place of each unknown block, and every other block shown', page.count('class="cs-unknown-block" role="note"') == 2 and 'Written by the user before the update.' in page and 'And after it.' in page)

doc = j(API(ta, 'GET', f'{DOCS}/{future_id}')[1])['document']
draft = {k: doc[k] for k in FIELDS}
s, b, _ = API(ta, 'PUT', f'{DOCS}/{future_id}', {**draft, 'content': content})
ok('saving a document with a type the API doesn’t know is refused (422), naming the type', s == 422 and 'apiEndpoint' in j(b).get('error', ''), (s, j(b).get('error', '')[:120]))
s, _, _ = API(ta, 'PUT', f'{DOCS}/{future_id}', {**draft, 'content': {'type': 'doc', 'content': [{'type': 'unknownBlock', 'attrs': {'original': FUTURE}}]}})
ok('the editor-only placeholder can never be stored (422)', s == 422, s)
ok('…and the document is unchanged', stored(future_id)[1] == before_md5)

# ---- B2: in a real browser ---------------------------------------------------------------------------
locked_id = new_document('From a newer schema')
db.execute("update public.studio_documents set content = %s, content_schema_version = 99 where id = %s", (Jsonb({'type': 'doc', 'content': [p('Saved by a newer version.')]}), locked_id))
_, locked_md5, _ = stored(locked_id)
work = tempfile.mkdtemp(prefix='studio-blocks-')
spec = os.path.join(work, 'input.json')
new_id = new_document('Phase 3 blocks')
API(ta, 'PUT', f'{DOCS}/{new_id}', {**{k: j(API(ta, 'GET', f'{DOCS}/{new_id}')[1])['document'][k] for k in FIELDS}, 'content': {'type': 'doc', 'content': [{'type': 'paragraph'}]}})
json.dump({'origin': 'http://localhost:3000', 'access': ta, 'refresh': A['refresh'], 'futureId': future_id, 'lockedId': locked_id, 'newId': new_id}, open(spec, 'w'))
done = subprocess.run(['node', f'{root}/scripts/e2e/blocks.mjs', spec], capture_output=True, text=True, timeout=300)
r = json.loads(done.stdout.strip().splitlines()[-1]) if done.stdout.strip() else {'failure': done.stderr[-1500:]}
ok('the browser run finished', not r.get('failure'), (r.get('failure') or '')[:400])
opened = r.get('futureOpened') or {}
ok('in the editor, the unknown blocks are locked placeholders in their places, and nothing else is lost',
   opened.get('types') == ['heading', 'paragraph', 'unknownBlock', 'unknownBlock', 'paragraph'] and opened.get('placeholders') == 2
   and 'Written by the user before the update.' in opened.get('text', '') and 'And after it.' in opened.get('text', ''), opened)
ok('…the rest of the document stays editable', opened.get('editable') is True)
ok('an edit is never saved over the document: the save is refused with a message saying what to do', 'doesn’t know' in (r.get('futureError') or '') and 'Reload the page' in (r.get('futureError') or ''), (r.get('futureError'), r.get('futureAfterTyping')))
ok('…and the stored document is byte for byte what it was', stored(future_id)[1] == before_md5 and stored(future_id)[2] == before_at)
locked = r.get('lockedOpened') or {}
ok('a document from a newer content schema opens read-only, saying why', locked.get('editable') is False and any('read-only' in text for text in locked.get('banners') or []), locked)
ok('…typing changes nothing and nothing is sent to be saved', (r.get('lockedAfterTyping') or {}).get('text') == 'Saved by a newer version.' and r.get('lockedSaves') == 0, (r.get('lockedAfterTyping'), r.get('lockedSaves')))
ok('…and it is unchanged in the database', stored(locked_id)[1] == locked_md5)
ok('no errors in the page', not r.get('errors'), (r.get('errors') or [])[:2])

# ---- The Phase 3 blocks in a real browser (contract §3.3 checks 5–10) --------------------------------
ok('inserting from the Insert menu works, and the menu has a Specialised category', 'Specialised' in ' '.join(r.get('insertMenuGroups') or []), r.get('insertMenuGroups'))
ok('the on-page fields can be typed into (parameter name, who said it, link)', r.get('fields') == {'name': True, 'person': True, 'link': True}, r.get('fields'))
ok('a code block’s settings open in the inspector', r.get('inspectorTitle') == 'Code block', r.get('inspectorTitle'))
ok('every on-page control in the new blocks has a name (keyboard and screen reader)', r.get('unnamedControls') == 0, r.get('unnamedControls'))
ok('the autosave finishes', (r.get('newSave') or '').startswith('Saved ·'), r.get('newSave'))
saved_doc = stored(new_id)[0]
strip = lambda v: {k: strip(x) for k, x in v.items() if x is not None} if isinstance(v, dict) else [strip(x) for x in v] if isinstance(v, list) else v
ok('the stored document is exactly what the editor had', strip(saved_doc) == strip(r.get('newEditorDoc') or {}), json.dumps(saved_doc)[:300])
ok('…and the editor shows the same after a reload', strip(saved_doc) == strip(r.get('newReloadedDoc') or {}))
types = [n['type'] for n in saved_doc['content']]
ok('all nine blocks are stored, in order', [t for t in types if t != 'paragraph'] == ['terminal', 'requirementList', 'acceptanceCriteria', 'userStory', 'procedureSteps', 'testimonial', 'referenceList', 'parameterTable', 'codeBlock'], types)
block = lambda name: next(n for n in saved_doc['content'] if n['type'] == name)
ok('terminal: a command and its output stay separate lines', [c['type'] for c in block('terminal')['content']] == ['terminalCommand', 'terminalOutput'])
ok('requirements: Enter made a second requirement, and each got its own id', [c['attrs']['reqId'] for c in block('requirementList')['content']] == ['R-1', 'R-2'])
ok('acceptance criteria: Given, When, Then, and Enter added an And step', [c['attrs']['keyword'] for c in block('acceptanceCriteria')['content'][0]['content']] == ['given', 'when', 'then', 'and'])
ok('user story: Enter moved through As / I want / so that', [''.join(t.get('text', '') for t in c.get('content', [])) for c in block('userStory')['content']] == ['a parent with a sick child', 'to book the earliest slot tonight', 'my child is seen before morning'])
ok('procedure: Enter made a second step', len(block('procedureSteps')['content']) == 2)
ok('testimonial: the quote and who said it; not yet approved for quoting', block('testimonial')['attrs']['person'] == 'Dr Asha Rao' and block('testimonial')['attrs']['consent'] == 'none')
ok('reference: title and a safe link', block('referenceList')['content'][0]['attrs']['url'] == 'https://developers.google.com/style')
ok('parameter: its name typed on the page', block('parameterTable')['content'][0]['attrs']['name'] == 'clinicId')
pv = r.get('preview') or {}
ok('preview: the command is a command, the output is output (the prompt is drawn, not stored)', pv.get('terminalCommands') == ['npm install @clinic/sdk'] and pv.get('terminalOutputs') == ['added 12 packages'], (pv.get('terminalCommands'), pv.get('terminalOutputs')))
ok('preview: requirements as a numbered list with their ids', pv.get('requirements') == ['R-1 Patients can book without an account.', 'R-2 The price is shown before the slot is chosen.'], pv.get('requirements'))
ok('preview: scenario steps read Given / When / Then / And', [s.split(' ')[0] for s in pv.get('scenario') or []] == ['Given', 'When', 'Then', 'And'], pv.get('scenario'))
ok('preview: the story reads as a sentence', pv.get('story') == 'As a parent with a sick child I want to book the earliest slot tonight so that my child is seen before morning', pv.get('story'))
ok('preview: procedure, testimonial and reference render semantically', pv.get('steps') == 2 and pv.get('quote') == 'Our evening appointments filled up within a week.' and 'Dr Asha Rao' in (pv.get('quoteBy') or '') and pv.get('referenceHref') == 'https://developers.google.com/style', pv)
ok('preview: the parameter table is a real table with column and row headers', pv.get('paramHeaders') == ['Name', 'Type', 'Required', 'Default', 'Description'] and pv.get('paramRowHeader') == 'clinicId', (pv.get('paramHeaders'), pv.get('paramRowHeader')))
ok('preview: code is highlighted, and its text is exactly what was typed', pv.get('codeTokens', 0) >= 2 and pv.get('codeText') == "const booking = await client.bookings.create({clinicId: 'c1'});", (pv.get('codeTokens'), pv.get('codeText')))
ok('preview: no page-wide overflow on a desktop', pv.get('overflow') == 0, pv.get('overflow'))
ok('print (A4): nothing is clipped or wider than the page', (r.get('print') or {}).get('overflow') == 0 and (r.get('print') or {}).get('tooWide') == [], r.get('print'))
ok('phone (375px): no page-wide overflow, parameters stacked as rows', (r.get('phone') or {}).get('overflow') == 0 and (r.get('phone') or {}).get('paramsAsRows') == 'none', r.get('phone'))
s, html, _ = WEB(f'/studio/documents/{new_id}/preview', cb); ok('B gets 404 for this preview', s == 404, s)

# ---- B3: the new blocks are cleaned on save (enforced) -----------------------------------------------
doc = j(API(ta, 'GET', f'{DOCS}/{new_id}')[1])['document']
hostile = {'type': 'doc', 'content': [
    {'type': 'referenceList', 'content': [{'type': 'reference', 'attrs': {'url': 'javascript:alert(1)', 'kind': 'exploit'}, 'content': [{'type': 'text', 'text': 'Click'}]}]},
    {'type': 'testimonial', 'attrs': {'person': 'P' * 400, 'role': '', 'organisation': '', 'consent': 'yes please', 'photo': 'https://evil.example/x.png', 'onload': 'x'}, 'content': [p('Quote')]},
    {'type': 'terminal', 'attrs': {'shell': 'fish', 'prompt': '<img src=x>'}, 'content': [{'type': 'terminalCommand', 'content': [{'type': 'text', 'text': 'ls'}]}]},
    {'type': 'requirementList', 'content': [{'type': 'requirement', 'attrs': {'reqId': 'R 1"><b>', 'priority': 'urgent'}, 'content': [p('A requirement')]}]},
]}
s, _, _ = API(ta, 'PUT', f'{DOCS}/{new_id}', {**{k: doc[k] for k in FIELDS}, 'content': hostile})
clean = stored(new_id)[0]['content']
ref, quote, term, req = clean[0]['content'][0]['attrs'], clean[1]['attrs'], clean[2]['attrs'], clean[3]['content'][0]['attrs']
ok('an unsafe reference link and an unknown kind are replaced, the title kept', s == 200 and ref == {'url': '', 'kind': 'document'} and clean[0]['content'][0]['content'][0]['text'] == 'Click', ref)
ok('a testimonial: name shortened, consent reset to "not asked", a non-private photo and unknown attributes removed', len(quote['person']) == 300 and quote['consent'] == 'none' and quote['photo'] is None and 'onload' not in quote, {k: (v if k != 'person' else len(v)) for k, v in quote.items()})
ok('a terminal: unknown shell and an unsafe prompt are replaced', term == {'shell': 'bash', 'prompt': '$'}, term)
ok('a requirement: an id with markup and an unknown priority are replaced', req == {'reqId': '', 'priority': 'should'}, req)

# ---- B2: a document that can't be read at all --------------------------------------------------------
broken_id = new_document('Unreadable')
db.execute("update public.studio_documents set content = %s where id = %s", (Jsonb({'type': 'doc', 'content': [{'type': 'paragraph', 'content': [{'type': 'text'}]}]}), broken_id))
s, html, _ = WEB(f'/studio/documents/{broken_id}/edit', ca)
ok('a document that can’t be read isn’t opened in the editor; the page says it is safe and unchanged', s == 200 and b'can\xe2\x80\x99t be opened here' in html and b'ProseMirror' not in html, s)
s, html, _ = WEB(f'/studio/documents/{broken_id}/preview', ca)
ok('…and its preview shows a notice instead of failing', s == 200 and b'can\xe2\x80\x99t be shown by this version' in html, s)

# ---- Privacy is unchanged ------------------------------------------------------------------------------
for path in [f'/studio/documents/{future_id}/edit', f'/studio/documents/{future_id}/preview', f'/studio/documents/{broken_id}/edit']:
    s, _, _ = WEB(path, cb); ok(f'B gets 404 for {path.split("/")[-1]} of A’s document', s == 404, s)

# ---- B3: existing blocks are cleaned in report-only mode -------------------------------------------------
plain_id = new_document('Report only')
doc = j(API(ta, 'GET', f'{DOCS}/{plain_id}')[1])['document']
sent = {'type': 'doc', 'content': [{'type': 'callout', 'attrs': {'tone': 'neon', 'icon': 'lightbulb'}, 'content': [p('A note')]}]}
s, _, _ = API(ta, 'PUT', f'{DOCS}/{plain_id}', {**{k: doc[k] for k in FIELDS}, 'content': sent})
kept = stored(plain_id)[0]['content'][0]['attrs']['tone']
ok('an existing block with a value its rules don’t allow is saved as sent (report-only until enforced)', s == 200 and kept == 'neon', (s, kept))

b_space = db.execute('select id::text from public.studio_workspaces where owner_id = %s', (B['user']['id'],)).fetchone()[0]
foreign_photo = f"{B['user']['id']}/{b_space}/library/{uuid.uuid4()}.png"
s, b, _ = API(ta, 'PUT', f'{DOCS}/{new_id}', {**{k: doc[k] for k in FIELDS}, 'content': {'type': 'doc', 'content': [{'type': 'testimonial', 'attrs': {'person': 'X', 'role': '', 'organisation': '', 'consent': 'none', 'photo': foreign_photo}, 'content': [p('Quote')]}]}})
ok('a testimonial photo from another account’s folder is refused (422)', s == 422 and 'uploads' in j(b).get('error', ''), (s, j(b).get('error', '')[:100]))

db.execute("delete from django.accounts_user where email in (%s, %s)", (A['user']['email'], B['user']['email']))
left = db.execute("select count(*) from public.studio_documents where owner_id = any(%s::uuid[])", ([A['user']['id'], B['user']['id']],)).fetchone()[0]
ok('everything created by the test is gone', left == 0, left)
print(f'\n{sum(results)}/{len(results)} passed')
sys.exit(0 if all(results) else 1)
