"""
Live Stage 1 test: guided project creation (project setup, frameworks, resume, duplicate).
Needs Django :8000 (console email), Express :4000, Next :3000 and the staging DB. Creates throwaway
@example.test accounts and removes them at the end.

    backend/django/.venv/bin/python -I supabase/tests/test_studio_setup_live.py "$PWD" <django-console-log>
"""
import json, sys, uuid

root, log = sys.argv[1:3]
helpers = open(f'{root}/supabase/tests/test_studio_storage_live.py').read().split('PNG = base64')[0]
ns = {'__name__': 'helpers'}; sys.argv = ['x', root, log]; exec(helpers, ns)
call, API, WEB, upload, ok, sign_in, results = ns['call'], ns['API'], ns['WEB'], ns['upload'], ns['ok'], ns['sign_in'], ns['results']
import base64
PNG = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==')
j = lambda b: json.loads(b or b'{}')
tag = uuid.uuid4().hex[:6]
A, B = sign_in(f'setup-a-{tag}@example.test'), sign_in(f'setup-b-{tag}@example.test')
ta, tb = A['access'], B['access']
ca, cb = f'studio_access={ta}', f'studio_access={tb}'
CS = '/api/app/case-studies'

FRAMEWORK_KEYS = ['opening', 'overview', 'context', 'challenge', 'contribution', 'exploration', 'decisions', 'experience', 'outcome', 'reflection']
def setup(**over):
    base = {'step': 'details', 'start': 'framework', 'project_type': 'redesign', 'title': 'Clinic booking', 'summary': 'A redesign.',
            'role': 'Lead designer', 'team': '2 designers', 'timeline': '2025', 'platform': 'iOS', 'objective': 'Faster booking', 'challenge': 'Drop-off',
            'framework_id': 'product-ux', 'framework_version': 1, 'cover_path': None, 'cover_alt': '',
            'outline': [{'id': f's{i}', 'key': k, 'title': ''} for i, k in enumerate(FRAMEWORK_KEYS)]}
    base.update(over); return base

# --- finished setup: the document comes from the outline -------------------------------------
outline = [{'id': 'a', 'key': 'opening', 'title': 'Opening'}, {'id': 'b', 'key': 'challenge', 'title': 'The problem'}, {'id': 'c', 'key': None, 'title': 'Accessibility'}, {'id': 'd', 'key': None, 'title': '  '}]
s, b, _ = API(ta, 'POST', CS, {'setup': setup(outline=outline), 'finish': True}); cid = j(b).get('id'); ok('A creates a case study from setup', s == 201 and cid, f'{s} {b[:120]}')
s, b, _ = API(ta, 'GET', f'{CS}/{cid}'); st = j(b)['study']
ok('project details, framework id and version are stored', (st['project_type'], st['role'], st['framework_id'], st['framework_version'], st['setup_state']) == ('redesign', 'Lead designer', 'product-ux', 1, None))
heads = [n for n in st['content']['content'] if n['type'] == 'heading']
ok('an unchanged framework section is an empty tagged heading (title shown as placeholder)', heads[0] == {'type': 'heading', 'attrs': {'level': 2, 'section': 'opening'}})
ok('a renamed section keeps its key and the new title as text', heads[1]['attrs'].get('section') == 'challenge' and heads[1]['content'][0]['text'] == 'The problem')
ok("the user's own section is a heading with their title; blank rows are dropped", len(heads) == 3 and 'section' not in heads[2]['attrs'] and heads[2]['content'][0]['text'] == 'Accessibility')
ok('every section is followed by an empty paragraph to write in', len(st['content']['content']) == 6 and all(n['type'] == 'paragraph' and 'content' not in n for n in st['content']['content'][1::2]))
ok('no guidance (hints, prompts) is stored in the document', 'Grabs attention' not in json.dumps(st['content']) and 'The project title and one strong visual' not in json.dumps(st['content']))

s, b, _ = API(ta, 'POST', CS, {'setup': setup(framework_id='blank', framework_version=1, start='blank', outline=[]), 'finish': True}); bid = j(b).get('id')
s, b, _ = API(ta, 'GET', f'{CS}/{bid}'); ok('a blank setup starts as one empty paragraph', j(b)['study']['content'] == {'type': 'doc', 'content': [{'type': 'paragraph'}]})

# --- validation (the server never trusts the wizard) ---------------------------------------------
for name, body in [
    ('an unknown framework', setup(framework_id='made-up', framework_version=1)),
    ('a framework version that does not exist', setup(framework_version=99)),
    ('a section key from outside the framework', setup(framework_id='blank', framework_version=1, outline=[{'id': 'x', 'key': 'opening', 'title': 'Opening'}])),
    ('more than 40 sections', setup(outline=[{'id': f'n{i}', 'key': None, 'title': f'S{i}'} for i in range(41)])),
]:
    s, _, _ = API(ta, 'POST', CS, {'setup': body, 'finish': True}); ok(f'setup with {name} is refused', s == 422, s)
_, bimg, _ = upload(tb, PNG, 'image/png')
s, _, _ = API(ta, 'POST', CS, {'setup': setup(cover_path=bimg['path']), 'finish': True}); ok("a cover that is B's file is refused", s == 422, s)
s, _, _ = API(ta, 'POST', CS, {'setup': setup(cover_path='https://evil.test/x.png'), 'finish': True}); ok('a cover URL is refused', s == 422, s)
s, b, _ = API(ta, 'POST', CS, {'setup': setup(title='x' * 400, project_type='hacker', owner_id=B['user']['id'], workspace_id=str(uuid.uuid4())), 'finish': True}); vid = j(b).get('id')
s, b, _ = API(ta, 'GET', f'{CS}/{vid}'); v = j(b)['study']
ok('long text is capped, an unknown project type is dropped, owner and workspace come from the token', len(v['title']) == 300 and v['project_type'] is None and v['owner_id'] == A['user']['id'])

# --- own cover ---------------------------------------------------------------------------------
_, lib, _ = upload(ta, PNG, 'image/png')
s, b, _ = API(ta, 'POST', CS, {'setup': setup(cover_path=lib['path'], cover_alt='The new booking screen'), 'finish': True}); kid = j(b).get('id')
s, b, _ = API(ta, 'GET', f'{CS}/{kid}'); k = j(b)['study']
ok("A's own library picture becomes the cover and the card thumbnail", k['cover_path'] == lib['path'] and k['thumbnail_path'] == lib['path'] and k['thumbnail_alt'] == 'The new booking screen')

# --- save and finish later, then resume --------------------------------------------------------
s, b, _ = API(ta, 'POST', CS, {'setup': setup(step='cover'), 'finish': False}); rid = j(b).get('id'); ok('A saves an unfinished setup', s == 201 and rid, s)
s, b, _ = API(ta, 'GET', f'{CS}/{rid}'); r = j(b)['study']
ok('it keeps the step and outline, with no document yet', r['setup_state']['step'] == 'cover' and len(r['setup_state']['outline']) == 10 and r['content'] == {'type': 'doc', 'content': []})
s, b, _ = API(ta, 'GET', CS); card = next((x for x in j(b)['studies'] if x['id'] == rid), {})
ok('the list shows it as unfinished, with its type', card.get('setup_state', {}).get('step') == 'cover' and card.get('project_type') == 'redesign')
s, _, _ = API(ta, 'PUT', f'{CS}/{rid}', {'title': 'x', 'content': {'type': 'doc', 'content': []}}); ok('an unfinished setup cannot be autosaved as a document', s == 409, s)
s, _, h = WEB(f'/studio/case-studies/{rid}', ca); ok('the editor sends A back to the setup', s == 307 and h.get('Location', '').endswith(f'/studio/case-studies/{rid}/setup'), s)
s, html, _ = WEB(f'/studio/case-studies/{rid}/setup', ca); ok('the setup page resumes it', s == 200 and b'Continue setting up' in html, s)
s, _, _ = API(tb, 'PUT', f'{CS}/{rid}/setup', {'setup': setup(), 'finish': True}); ok("B can't finish A's setup (404)", s == 404, s)
s, _, _ = WEB(f'/studio/case-studies/{rid}/setup', cb); ok("B gets 404 for A's setup page", s == 404, s)
s, b, _ = API(ta, 'PUT', f'{CS}/{rid}/setup', {'setup': setup(step='outline', title='Clinic booking, finished'), 'finish': True}); ok('A finishes the setup', s == 200, s)
s, b, _ = API(ta, 'GET', f'{CS}/{rid}'); r = j(b)['study']
ok('the case study is created from the outline', r['setup_state'] is None and r['title'] == 'Clinic booking, finished' and len(r['content']['content']) == 20)
s, _, _ = API(ta, 'PUT', f'{CS}/{rid}/setup', {'setup': setup(), 'finish': True}); ok('setup cannot be run again on a created case study (it would replace the document)', s == 409, s)

# --- duplicate ---------------------------------------------------------------------------------
s, b, _ = API(ta, 'POST', f'{CS}/{cid}/duplicate', {'title': ''}); did = j(b).get('id'); ok('A copies a case study', s == 201 and did and did != cid, s)
s, b, _ = API(ta, 'GET', f'{CS}/{did}'); d = j(b)['study']
ok('the copy has the same document and details, a new slug, and is a draft', d['content'] == st['content'] and d['role'] == st['role'] and d['slug'] != st['slug'] and d['status'] == 'draft' and d['title'] == 'Copy of Clinic booking')
s, _, _ = API(tb, 'POST', f'{CS}/{cid}/duplicate', {}); ok("B can't copy A's case study (404)", s == 404, s)
s, b, _ = API(tb, 'GET', CS); ok("B's list has none of A's case studies", not j(b)['studies'])

# --- pages ---------------------------------------------------------------------------------------
s, html, _ = WEB('/studio/case-studies/new', ca); ok('the setup page opens and creates nothing', s == 200 and b'How do you want to start?' in html, s)
s, b, _ = API(ta, 'GET', CS); before = len(j(b)['studies'])
WEB('/studio/case-studies/new', ca)
s, b, _ = API(ta, 'GET', CS); ok('loading the setup page again still creates nothing (GET is safe)', len(j(b)['studies']) == before)
s, _, h = WEB('/studio/case-studies/new'); ok('signed out: redirected to sign in', s == 307 and '/studio/login' in h.get('Location', ''), s)

# --- clean up -------------------------------------------------------------------------------------
import psycopg
call('DELETE', f"{ns['SUPA']}/storage/v1/object/studio-private-media", {'prefixes': [bimg['path'], lib['path']]}, {'apikey': ns['SKEY'], 'Authorization': 'Bearer ' + ns['SKEY']})
with psycopg.connect(ns['dj']['DATABASE_URL']) as c:
    c.execute("delete from django.accounts_user where email in (%s, %s)", (A['user']['email'], B['user']['email']))
    ids = [A['user']['id'], B['user']['id']]
    left = c.execute("select (select count(*) from public.studio_case_studies where owner_id = any(%s::uuid[])) + (select count(*) from public.studio_assets where owner_id = any(%s::uuid[]))", (ids, ids)).fetchone()[0]
ok('everything created by the test is gone', left == 0, left)
print(f'\n{sum(results)}/{len(results)} passed')
sys.exit(0 if all(results) else 1)
