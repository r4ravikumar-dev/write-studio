"""
Live multi-vertical Phase 2 test: the template library, the Create Document flow (in a real
browser), explicit template updates, the moved page addresses and the My documents filters
(plan A01, A02, A03, A04).
Needs Django :8000 (console email), Express :4000, Next :3000 and the staging DB. Creates throwaway
@example.test accounts and removes them at the end.

    backend/django/.venv/bin/python -I supabase/tests/test_studio_templates_live.py "$PWD" <django-console-log>
"""
import json, os, subprocess, sys, tempfile, uuid

root, log = sys.argv[1:3]
helpers = open(f'{root}/supabase/tests/test_studio_storage_live.py').read().split('PNG = base64')[0]
ns = {'__name__': 'helpers'}; sys.argv = ['x', root, log]; exec(helpers, ns)
call, API, WEB, ok, sign_in, results = ns['call'], ns['API'], ns['WEB'], ns['ok'], ns['sign_in'], ns['results']
import psycopg
j = lambda b: json.loads(b or b'{}')
tag = uuid.uuid4().hex[:6]
A, B = sign_in(f'templates-a-{tag}@example.test'), sign_in(f'templates-b-{tag}@example.test')
ta, tb = A['access'], B['access']
ca, cb = f'studio_access={ta}', f'studio_access={tb}'
DOCS = '/api/app/documents'
db = psycopg.connect(ns['dj']['DATABASE_URL'], autocommit=True)


def setup(**over):
    base = {'step': 'outline', 'start': 'framework', 'document_type': 'ux_case_study', 'project_type': None, 'title': 'Booking flow', 'summary': '',
            'role': '', 'team': '', 'timeline': '', 'platform': '', 'objective': '', 'challenge': '', 'template_id': 'product-ux', 'template_version': 1,
            'metadata': {}, 'cover_path': None, 'cover_alt': '', 'outline': [{'id': 'x1', 'key': 'challenge', 'title': ''}, {'id': 'x2', 'key': 'outcome', 'title': ''}]}
    base.update(over)
    return base


# ---- The library and Create Document, in a real browser (A01, A02) --------------------------------
work = tempfile.mkdtemp(prefix='studio-create-')
spec = os.path.join(work, 'input.json')
json.dump({'origin': 'http://localhost:3000', 'access': ta, 'refresh': A['refresh'], 'outDir': work}, open(spec, 'w'))
done = subprocess.run(['node', f'{root}/scripts/e2e/create.mjs', spec], capture_output=True, text=True, timeout=300)
r = json.loads(done.stdout.strip().splitlines()[-1]) if done.stdout.strip() else {'failure': done.stderr[-1500:]}
ok('the browser run finished', not r.get('failure'), (r.get('failure') or '')[:400])
lib = r.get('library') or {}
ok('the library lists the four categories (and All)', lib.get('categories') == ['All', 'Product & Engineering', 'Marketing & Growth', 'Design & Research', 'Operations & Knowledge'], lib.get('categories'))
ok('the category with templates comes first, then the ones still to come, then Start from scratch',
   (lib.get('groups') or [None])[0] == 'Design & Research' and (lib.get('groups') or [None])[-1] == 'Start from scratch', lib.get('groups'))
ok('every current template is a card', lib.get('cards') == ['Product and UX design', 'UX research', 'Product redesign', 'Feature development', 'Blank'], lib.get('cards'))
ok('document types without a template are named as coming later, and can’t be chosen', 'Developer documentation' in (lib.get('comingLater') or []) and 'Developer documentation' not in (lib.get('cards') or []), lib.get('comingLater'))
ok('searching by name narrows the list', r.get('searchResearch') == ['UX research'], r.get('searchResearch'))
ok('searching by a section title finds the template that has it', r.get('searchBySection') == ['UX research'], r.get('searchBySection'))
nothing = r.get('searchNothing') or {}
ok('a search with no match says so, and how to recover', nothing.get('cards') == [] and 'Check the spelling' in nothing.get('message', ''), nothing)
ops = r.get('categoryOperations') or {}
ok('a category filter shows only that category', ops.get('groups') == ['Operations & Knowledge'] and ops.get('cards') == [], ops)
pv = r.get('preview') or {}
ok('a template’s preview names it, who it is for, its blocks and its exports before it is used (A01)',
   pv.get('name') == 'Feature development' and 'Product designers' in pv.get('facts', {}).get('Made for', '') and 'Screen sequence' in pv.get('facts', {}).get('Recommended blocks', '')
   and pv.get('facts', {}).get('Export as') == 'PDF, Web page (HTML)', pv.get('facts'))
ok('the preview lists the sections the template will create', len(pv.get('sections') or []) == 10 and pv['sections'][0] == 'Opening' and pv['sections'][-1] == 'Reflection', pv.get('sections'))
ok('"Use this template" opens Create Document with it chosen', pv.get('useHref') == '/studio/documents/new?template=feature' and r.get('preselected') == 'feature@1', (pv.get('useHref'), r.get('preselected')))
ok('Create Document has four steps', r.get('steps') == ['Template', 'Details', 'Cover picture', 'Outline'], r.get('steps'))
ok('the details step asks the template’s own questions', (r.get('detailFields') or [])[:2] == ['Working title', 'Overview'] and {'Your role', 'Team', 'Timeline', 'Platform', 'Objective', 'Main challenge'} <= set(r.get('detailFields') or []), r.get('detailFields'))
ok('only the working title is required', r.get('titleRequired') == {'stillOnDetails': True, 'error': True}, r.get('titleRequired'))
ok('Back and Continue keep the chosen template and what was typed', (r.get('templateKept'), r.get('titleKept')) == ('feature@1', 'Saved searches'), (r.get('templateKept'), r.get('titleKept')))
ok('the optional cover step can be skipped', r.get('coverSkippable') is True)
ok('the outline step shows the template’s sections, as the preview promised', r.get('outline') == pv.get('sections'), r.get('outline'))
ok('the document opens in the editor at its new address', '/studio/documents/' in (r.get('editorUrl') or '') and (r.get('editorTitle') or '').startswith('Edit: Saved searches'), (r.get('editorUrl'), r.get('editorTitle')))
ok('no errors in the page', not r.get('errors'), (r.get('errors') or [])[:3])
ok('screenshots of the library and the outline were saved', all(os.path.getsize(os.path.join(work, name)) > 20000 for name in ('library.png', 'outline.png') if os.path.exists(os.path.join(work, name))) and os.path.exists(os.path.join(work, 'library.png')), work)
print('  screenshots:', work)

created = (r.get('editorUrl') or '').split('/')[3] if r.get('editorUrl') else ''
row = db.execute('select owner_id::text, document_type, template_id, template_version, project_type, status, title from public.studio_documents where id = %s', (created,)).fetchone() if created else None
ok('the stored document has the chosen template, its version, the right type and A as owner (A02)',
   row == (A['user']['id'], 'ux_case_study', 'feature', 1, 'feature', 'draft', 'Saved searches'), row)
ok('its sections are the template’s, tagged with their keys', len(r.get('editorHeadings') or []) == 10 and all(str(key).startswith('feature-') for key in r['editorHeadings']), r.get('editorHeadings'))

# ---- Template versions: pinned until the owner updates (A04) ---------------------------------------
s, b, _ = API(ta, 'POST', DOCS, {'setup': setup(), 'finish': True}); old = j(b).get('id')
s, b, _ = API(ta, 'GET', f'{DOCS}/{old}'); before = j(b)['document']
ok('a document made on version 1 stays on version 1 although version 2 exists', (before['template_id'], before['template_version']) == ('product-ux', 1))
draft = {k: before[k] for k in ['slug', 'title', 'subtitle', 'label', 'area', 'tags', 'summary', 'focus', 'thumbnail_path', 'thumbnail_alt', 'thumbnail_focus', 'cover_path', 'layout', 'project_type', 'role', 'team', 'timeline', 'platform', 'objective', 'challenge']}
content = before['content']; content['content'][1] = {'type': 'paragraph', 'content': [{'type': 'text', 'text': 'Written before the update.'}]}
API(ta, 'PUT', f'{DOCS}/{old}', {**draft, 'content': content})
s, b, _ = API(ta, 'GET', f'{DOCS}/{old}'); saved = j(b)['document']
ok('…and saving it doesn’t move it to the newer version', saved['template_version'] == 1)
for name, token, body, want in [
    ('a version that isn’t the newest', ta, {'version': 3}, 422),
    ('no version named', ta, {}, 422),
    ('the version it already has', ta, {'version': 1}, 422),
]:
    s, _, _ = API(token, 'POST', f'{DOCS}/{old}/template', body); ok(f'updating to {name} is refused', s == want, s)
s, b, _ = API(tb, 'POST', f'{DOCS}/{old}/template', {'version': 2}); ok('B can’t update A’s template (404)', s == 404, s)
s, _, _ = call('POST', f'http://localhost:4000{DOCS}/{old}/template', {'version': 2}); ok('signed out, nobody can (401)', s == 401, s)
s, b, _ = API(ta, 'POST', f'{DOCS}/{old}/template', {'version': 2}); ok('A updates to version 2, by name', s == 200 and j(b).get('template_version') == 2, s)
s, b, _ = API(ta, 'GET', f'{DOCS}/{old}'); after = j(b)['document']
ok('only the template version changed: the content is identical', after['template_version'] == 2 and after['content'] == saved['content'] and after['title'] == saved['title'])
s, _, _ = API(ta, 'POST', f'{DOCS}/{old}/template', {'version': 2}); ok('a document on the newest version has nothing to update to (409)', s == 409, s)
s, b, _ = API(ta, 'POST', DOCS, {'setup': setup(title='Archived one'), 'finish': True}); arch = j(b).get('id')
API(ta, 'POST', f'{DOCS}/{arch}/archive')
s, _, _ = API(ta, 'POST', f'{DOCS}/{arch}/template', {'version': 2}); ok('an archived document’s template can’t be updated (409)', s == 409, s)
s, b, _ = API(ta, 'POST', DOCS, {'setup': setup(title='Blank one', template_id='blank', template_version=1, start='blank', outline=[]), 'finish': True}); blank = j(b).get('id')
s, _, _ = API(ta, 'POST', f'{DOCS}/{blank}/template', {'version': 2}); ok('a template with one version has nothing to update to (409)', s == 409, s)
s, b, _ = API(ta, 'POST', DOCS, {'setup': setup(title='Legacy step', step='framework'), 'finish': False}); legacy = j(b).get('id')
s, b, _ = API(ta, 'GET', f'{DOCS}/{legacy}'); ok('a setup saved on a step that no longer exists resumes at the first step', j(b)['document']['setup_state']['step'] == 'start', j(b)['document'].get('setup_state'))

# ---- Addresses: documents live under /studio/documents; old links still work -----------------------
for old_path, new_path in [
    (f'/studio/case-studies/{old}', f'/studio/documents/{old}/edit'),
    (f'/studio/case-studies/{old}/preview', f'/studio/documents/{old}/preview'),
    (f'/studio/case-studies/{legacy}/setup', f'/studio/documents/{legacy}/setup'),
    ('/studio/case-studies/new', '/studio/documents/new'),
    ('/studio/case-studies?status=archived', '/studio/documents?status=archived'),
    (f'/studio/documents/{old}', f'/studio/documents/{old}/edit'),
    ('/studio/dashboard', '/studio'),
]:
    s, _, h = WEB(old_path, ca)
    ok(f'{old_path.replace(old, "<id>").replace(legacy, "<id>")} redirects to its new address', s in (307, 308) and h.get('Location', '').endswith(new_path), (s, h.get('Location')))
s, html, _ = WEB(f'/studio/documents/{old}/edit', ca); ok('the editor opens at /studio/documents/<id>/edit, with the status control', s == 200 and b'Status: Draft' in html, s)
s, _, _ = WEB(f'/studio/documents/{old}/edit', cb); ok('…and is still a 404 for B', s == 404, s)
s, _, h = WEB(f'/studio/case-studies/{old}'); s2, _, h2 = WEB(h.get('Location', '/studio/documents/x/edit').replace('http://localhost:3000', ''))
ok('signed out, an old link still ends at sign-in, with nothing rendered', s2 == 307 and '/studio/login' in h2.get('Location', ''), (s, s2))

# ---- Templates page and My documents -----------------------------------------------------------------
s, html, _ = WEB('/studio/templates', ca); page = html.decode('utf-8', 'replace')
ok('the templates page lists templates and what is coming later', s == 200 and 'Product redesign' in page and 'Coming later' in page and 'Release notes' in page, s)
ok('…and shows none of the user’s own documents (product content only)', 'Booking flow' not in page and 'Saved searches' not in page)
s, _, h = WEB('/studio/templates'); ok('signed out: the templates page redirects to sign in', s == 307 and '/studio/login' in h.get('Location', ''), s)
API(ta, 'POST', f'{DOCS}/{old}/status', {'status': 'in_progress'})
s, html, _ = WEB('/studio', ca); page = html.decode('utf-8', 'replace')
ok('My documents shows each document’s kind, template and status', s == 200 and '<h1' in page and 'My documents' in page and 'UX case study · Product and UX design' in page and 'In progress' in page and 'Setup not finished' in page, s)
ok('…with the status filters and the grid/list switch', all(label in page for label in ['Ready for review', 'Archived', '>Grid<', '>List<']) and 'Create document' in page)
ok('archived documents aren’t in the default view', 'Archived one' not in page)
s, html, _ = WEB('/studio?status=in_progress', ca); page = html.decode('utf-8', 'replace')
ok('the In progress filter shows only documents in progress', s == 200 and 'Booking flow' in page and 'Saved searches' not in page and 'Documents in progress' in page, s)
s, html, _ = WEB('/studio/documents?status=archived&view=list', ca); page = html.decode('utf-8', 'replace')
ok('the Archived filter and the list view work together', s == 200 and 'Archived one' in page and 'Booking flow' not in page and 'data-view="list"' in page, s)
s, html, _ = WEB('/studio', cb); page = html.decode('utf-8', 'replace')
ok('B’s My documents is the first-visit empty state, with none of A’s documents', s == 200 and 'Create your first document' in page and 'Booking flow' not in page and 'Saved searches' not in page, s)

db.execute("delete from django.accounts_user where email in (%s, %s)", (A['user']['email'], B['user']['email']))
left = db.execute("select count(*) from public.studio_documents where owner_id = any(%s::uuid[])", ([A['user']['id'], B['user']['id']],)).fetchone()[0]
ok('everything created by the test is gone', left == 0, left)
print(f'\n{sum(results)}/{len(results)} passed')
sys.exit(0 if all(results) else 1)
