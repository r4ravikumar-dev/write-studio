"""
Live multi-vertical Phase 1 test: the generic document model. Document type and template reference
on every document, the private status lifecycle and its allowed moves, list filters, and that none
of it is reachable by another account or without signing in (plan A02, A03, A15).
Needs Django :8000 (console email), Express :4000, Next :3000 and the staging DB, with migration
0014 applied. Creates throwaway @example.test accounts and removes them at the end.

    backend/django/.venv/bin/python -I supabase/tests/test_studio_document_model_live.py "$PWD" <django-console-log>
"""
import json, sys, uuid

root, log = sys.argv[1:3]
helpers = open(f'{root}/supabase/tests/test_studio_storage_live.py').read().split('PNG = base64')[0]
ns = {'__name__': 'helpers'}; sys.argv = ['x', root, log]; exec(helpers, ns)
call, API, WEB, ok, sign_in, results = ns['call'], ns['API'], ns['WEB'], ns['ok'], ns['sign_in'], ns['results']
import psycopg
j = lambda b: json.loads(b or b'{}')
tag = uuid.uuid4().hex[:6]
A, B = sign_in(f'docmodel-a-{tag}@example.test'), sign_in(f'docmodel-b-{tag}@example.test')
ta, tb = A['access'], B['access']
ca = f'studio_access={ta}'
DOCS = '/api/app/documents'
db = psycopg.connect(ns['dj']['DATABASE_URL'], autocommit=True)
FIELDS = ['slug', 'title', 'subtitle', 'label', 'area', 'tags', 'summary', 'focus', 'thumbnail_path', 'thumbnail_alt', 'thumbnail_focus', 'cover_path',
          'layout', 'project_type', 'role', 'team', 'timeline', 'platform', 'objective', 'challenge']


def setup(**over):
    base = {'step': 'outline', 'start': 'framework', 'document_type': 'ux_case_study', 'project_type': 'research', 'title': 'Onboarding study',
            'summary': '', 'role': 'Researcher', 'team': '', 'timeline': '', 'platform': '', 'objective': '', 'challenge': '',
            'template_id': 'ux-research', 'template_version': 1, 'metadata': {}, 'cover_path': None, 'cover_alt': '',
            'outline': [{'id': 'x1', 'key': 'research-question', 'title': ''}, {'id': 'x2', 'key': 'research-findings', 'title': ''}]}
    base.update(over)
    return base


# ---- Creation: type and template are explicit, and decided by the server -------------------------------
s, b, _ = API(ta, 'POST', DOCS, {'setup': setup(), 'finish': True}); ok('A creates a document from a template', s == 201, s)
did = j(b)['id']
s, b, _ = API(ta, 'GET', f'{DOCS}/{did}'); doc = j(b)['document']
ok('it stores its document type and the template id and version it was made with (A02)',
   (doc['document_type'], doc['template_id'], doc['template_version']) == ('ux_case_study', 'ux-research', 1), (doc.get('document_type'), doc.get('template_id')))
ok('it starts as a private draft with empty template metadata', (doc['status'], doc['metadata']) == ('draft', {}))
ok('its sections come from the outline, tagged with the template section keys',
   [n['attrs'].get('section') for n in doc['content']['content'] if n['type'] == 'heading'] == ['research-question', 'research-findings'])
row = db.execute('select owner_id::text, workspace_id::text, document_type, template_id, template_version from public.studio_documents where id = %s', (did,)).fetchone()
ok('the row is in studio_documents, owned by A, in A’s workspace', row is not None and row[0] == A['user']['id'] and row[2:] == ('ux_case_study', 'ux-research', 1), row)

s, b, _ = API(ta, 'POST', DOCS, {'title': 'Quick one'}); quick = j(b).get('id')
s, b, _ = API(ta, 'GET', f'{DOCS}/{quick}'); q = j(b)['document']
ok('without a wizard, a document gets the default type and its default template', (q['document_type'], q['template_id'], q['template_version']) == ('ux_case_study', 'product-ux', 2))
ok('…with one empty, tagged section per template section', len([n for n in q['content']['content'] if n['type'] == 'heading']) == 10)

s, b, _ = API(ta, 'POST', DOCS, {'setup': setup(template_id='blank', template_version=1, start='blank', outline=[]), 'finish': True})
blank = j(b).get('id'); s2, b2, _ = API(ta, 'GET', f'{DOCS}/{blank}'); bd = j(b2)['document']
ok('a blank document is a valid document of the default type (A03)', s == 201 and (bd['document_type'], bd['template_id']) == ('ux_case_study', 'blank') and bd['content']['content'] == [{'type': 'paragraph'}])

for name, body in [
    ('a document type that doesn’t exist', {'title': 'x', 'document_type': 'blog_post'}),
    ('a document type that has no template yet', {'title': 'x', 'document_type': 'standard_operating_procedure'}),
    ('a template of one type claimed as another type', {'setup': setup(document_type='release_notes'), 'finish': True}),
    ('a made-up document type in setup', {'setup': setup(document_type='anything'), 'finish': True}),
    ('an unknown template', {'setup': setup(template_id='made-up'), 'finish': True}),
    ('a template version that was never released', {'setup': setup(template_version=99), 'finish': True}),
]:
    s, _, _ = API(ta, 'POST', DOCS, body); ok(f'creating with {name} is refused', s == 422, s)

s, b, _ = API(ta, 'POST', DOCS, {'setup': {**setup(title='Mine'), 'owner_id': B['user']['id'], 'workspace_id': str(uuid.uuid4())}, 'finish': True, 'owner_id': B['user']['id']})
forged = j(b).get('id')
owner = db.execute('select owner_id::text from public.studio_documents where id = %s', (forged,)).fetchone()
ok('an owner or workspace sent by the browser is ignored: the document is A’s', s == 201 and owner == (A['user']['id'],), owner)

s, b, _ = API(ta, 'POST', f'{DOCS}/{did}/duplicate', {}); copy = j(b).get('id')
s, b, _ = API(ta, 'GET', f'{DOCS}/{copy}'); cp = j(b)['document']
ok('a copy keeps the type and the template version', (cp['document_type'], cp['template_id'], cp['template_version'], cp['status']) == ('ux_case_study', 'ux-research', 1, 'draft'))

# ---- Saving: the type and template can't be changed by a save -----------------------------------------
draft = {k: doc[k] for k in FIELDS}
s, _, _ = API(ta, 'PUT', f'{DOCS}/{did}', {**draft, 'content': doc['content'], 'document_type': 'release_notes', 'template_id': 'blank', 'template_version': 1,
                                             'metadata': {'product': 'Sneaked in', 'role': 'x'}, 'owner_id': B['user']['id'], 'status': 'archived'})
s2, b, _ = API(ta, 'GET', f'{DOCS}/{did}'); after = j(b)['document']
ok('a save can’t change the type, template, owner or status, and unknown metadata keys are dropped',
   s == 200 and (after['document_type'], after['template_id'], after['template_version'], after['status'], after['metadata'], after['owner_id']) ==
   ('ux_case_study', 'ux-research', 1, 'draft', {}, A['user']['id']), s)

# ---- Status lifecycle ---------------------------------------------------------------------------------
def move(token, doc_id, status):
    s, b, _ = API(token, 'POST', f'{DOCS}/{doc_id}/status', {'status': status})
    return s, j(b).get('status')

ok('draft → in progress', move(ta, did, 'in_progress') == (200, 'in_progress'))
ok('in progress → ready for review', move(ta, did, 'ready_for_review') == (200, 'ready_for_review'))
s, _, _ = API(ta, 'PUT', f'{DOCS}/{did}', {**draft, 'content': doc['content']}); ok('a document that is ready for review can still be edited', s == 200, s)
ok('…and a save doesn’t change its status', db.execute('select status from public.studio_documents where id = %s', (did,)).fetchone() == ('ready_for_review',))
ok('ready for review → in progress', move(ta, did, 'in_progress') == (200, 'in_progress'))
ok('setting the status it already has is accepted, unchanged', move(ta, did, 'in_progress') == (200, 'in_progress'))
for bad in ['published', 'public', 'archived', '', None, 5]:
    ok(f'status {bad!r} is refused by the status route (no public state; archiving has its own route)', move(ta, did, bad)[0] == 422)
s, b, _ = API(ta, 'POST', f'{DOCS}/{did}/archive'); ok('in progress → archived', s == 200 and j(b)['status'] == 'archived', s)
ok('archived → in progress is refused', move(ta, did, 'in_progress')[0] == 409)
ok('archived → ready for review is refused', move(ta, did, 'ready_for_review')[0] == 409)
s, _, _ = API(ta, 'PUT', f'{DOCS}/{did}', {**draft, 'content': doc['content']}); ok('an archived document can’t be saved', s == 409, s)
s, b, _ = API(ta, 'POST', f'{DOCS}/{did}/restore'); ok('archived → draft (restore)', s == 200 and j(b)['status'] == 'draft', s)
try:
    db.execute("update public.studio_documents set status = 'published' where id = %s", (did,))
    ok("the database itself refuses a 'published' status", False)
except psycopg.Error:
    ok("the database itself refuses a 'published' status", True)

s, b, _ = API(ta, 'POST', DOCS, {'setup': setup(title='Unfinished', step='details'), 'finish': False}); unfinished = j(b).get('id')
ok('a document whose setup isn’t finished can’t be marked in progress', move(ta, unfinished, 'in_progress')[0] == 409)

# ---- Lists --------------------------------------------------------------------------------------------
move(ta, did, 'ready_for_review'); move(ta, quick, 'in_progress'); API(ta, 'POST', f'{DOCS}/{blank}/archive')
ids = lambda query: {x['id'] for x in j(API(ta, 'GET', f'{DOCS}{query}')[1])['documents']}
ok('?status=active lists everything that isn’t archived', {did, quick, copy, forged, unfinished} <= ids('?status=active') and blank not in ids('?status=active'))
ok('?status=ready_for_review, ?status=in_progress and ?status=archived each list their own', (ids('?status=ready_for_review'), ids('?status=in_progress'), ids('?status=archived')) == ({did}, {quick}, {blank}))
ok('?type=ux_case_study lists A’s case studies; a type with no documents lists nothing', did in ids('?type=ux_case_study') and ids('?type=release_notes') == set())
ok('an unknown status or type is refused', API(ta, 'GET', f'{DOCS}?status=published')[0] == 400 and API(ta, 'GET', f'{DOCS}?type=blog_post')[0] == 400)
cards = j(API(ta, 'GET', DOCS)[1])['documents']
ok('cards carry the document type, template and status, and never the body', all('document_type' in c and 'template_id' in c and 'content' not in c for c in cards))
s, html, _ = WEB('/studio', ca)
ok('the dashboard shows documents in every working status, not only drafts', s == 200 and b'Onboarding study' in html and b'Quick one' in html, s)

# ---- Privacy: another account, and nobody at all (A15) ------------------------------------------------
ok('B’s list has none of A’s documents', not ({did, quick, copy, blank, forged, unfinished} & {x['id'] for x in j(API(tb, 'GET', DOCS)[1])['documents']}))
denied = [
    ('read', 'GET', f'{DOCS}/{did}', None),
    ('save', 'PUT', f'{DOCS}/{did}', {**draft, 'content': doc['content']}),
    ('change the status of', 'POST', f'{DOCS}/{did}/status', {'status': 'in_progress'}),
    ('archive', 'POST', f'{DOCS}/{did}/archive', None),
    ('copy', 'POST', f'{DOCS}/{did}/duplicate', {}),
    ('list the versions of', 'GET', f'{DOCS}/{did}/revisions', None),
    ('read the notes of', 'GET', f'{DOCS}/{did}/notes', None),
    ('finish the setup of', 'PUT', f'{DOCS}/{unfinished}/setup', {'setup': setup(), 'finish': True}),
    ('delete', 'DELETE', f'{DOCS}/{did}', None),
]
for what, method, path, body in denied:
    s, b, _ = API(tb, method, path, body); ok(f'B can’t {what} A’s document (404, nothing returned)', s == 404 and b'Onboarding' not in b, s)
    s, _, _ = call(method, f'http://localhost:4000{path}', body); ok(f'signed out, nobody can {what} it (401)', s == 401, s)
ok('A’s document is exactly as A left it', db.execute('select status, title from public.studio_documents where id = %s', (did,)).fetchone() == ('ready_for_review', 'Onboarding study'))
s, _, _ = API(ta, 'GET', '/api/app/case-studies'); ok('the old /api/app/case-studies path is gone (no second way in)', s == 404, s)

db.execute("delete from django.accounts_user where email in (%s, %s)", (A['user']['email'], B['user']['email']))
left = db.execute("select count(*) from public.studio_documents where owner_id = any(%s::uuid[])", ([A['user']['id'], B['user']['id']],)).fetchone()[0]
ok('everything created by the test is gone', left == 0, left)
print(f'\n{sum(results)}/{len(results)} passed')
sys.exit(0 if all(results) else 1)
