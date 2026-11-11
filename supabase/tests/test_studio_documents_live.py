"""
Live Phase 4 test: private Studio case studies (SEC-004, 005, 006, 011, 012, 013, 014, 015, 016).
Needs Django :8000 (console email), Express :4000, Next :3000 and the staging DB. Creates throwaway
@example.test accounts and removes them at the end. Also checks that the old portfolio routes, APIs
and data are gone (SEC-014/015).

    backend/django/.venv/bin/python -I supabase/tests/test_studio_documents_live.py "$PWD" <django-console-log>
"""
import copy, json, re, sys, uuid

root, log = sys.argv[1:3]
helpers = open(f'{root}/supabase/tests/test_studio_storage_live.py').read().split('PNG = base64')[0]
ns = {'__name__': 'helpers'}; sys.argv = ['x', root, log]; exec(helpers, ns)
call, API, WEB, upload, ok, sign_in, results = ns['call'], ns['API'], ns['WEB'], ns['upload'], ns['ok'], ns['sign_in'], ns['results']
import base64
PNG = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==')
j = lambda b: json.loads(b or b'{}')
tag = uuid.uuid4().hex[:6]
A, B = sign_in(f'docs-a-{tag}@example.test'), sign_in(f'docs-b-{tag}@example.test')
ta, tb = A['access'], B['access']
ca, cb = f'studio_access={ta}', f'studio_access={tb}'

# --- create -------------------------------------------------------------------
s, b, _ = API(ta, 'POST', '/api/app/case-studies', {'title': 'Checkout redesign'}); cid = j(b).get('id'); ok('A creates a private case study', s == 201 and cid, s)
s, b, _ = API(ta, 'GET', f'/api/app/case-studies/{cid}'); study = j(b)['study']
ok('it starts as a draft from the 20-block template, slug from the title', study['status'] == 'draft' and len(study['content']['content']) == 20 and study['slug'].startswith('checkout-redesign-'))
ok('owner and workspace were set by the server', study['owner_id'] == A['user']['id'])

# --- every block type, with A's own private media --------------------------------
_, img, _ = upload(ta, PNG, 'image/png', case_study_id=cid)
_, lib, _ = upload(ta, PNG, 'image/png')
_, vid, _ = upload(ta, bytes(range(256)) * 8, 'video/mp4', case_study_id=cid)
_, pdf, _ = upload(ta, b'%PDF-1.4\n%test\n', 'application/pdf', case_study_id=cid)
ref = lambda a, alt='Alt': {'path': a['path'], 'kind': 'video' if a['kind'] == 'video' else 'image', 'mime': a['mime'], 'width': 1, 'height': 1, 'alt': alt}
p = lambda t: {'type': 'paragraph', 'content': [{'type': 'text', 'text': t}]}
doc = {'type': 'doc', 'content': [
    {'type': 'heading', 'attrs': {'level': 2}, 'content': [{'type': 'text', 'text': 'Overview'}]},
    p('data: we started with research.'),
    {'type': 'image', 'attrs': {'src': img['path'], 'alt': 'Checkout', 'width': 1, 'height': 1}},
    {'type': 'videoFile', 'attrs': {'src': vid['path'], 'caption': 'Flow'}},
    {'type': 'fileAttachment', 'attrs': {'src': pdf['path'], 'name': 'deck.pdf', 'size': 16, 'mime': 'application/pdf', 'preview': False}},
    {'type': 'embed', 'attrs': {'src': 'https://youtu.be/dQw4w9WgXcQ', 'caption': ''}},
    {'type': 'imageGrid', 'attrs': {'config': {'columns': 2, 'arrangement': 'even', 'ratio': '4:3', 'gap': 'md', 'items': [ref(img), ref(lib)], 'caption': 'Grid'}}},
    {'type': 'comparison', 'attrs': {'config': {'mode': 'before-after', 'split': '50-50', 'ratio': 'auto', 'left': {'media': ref(img), 'label': 'Before', 'text': ''}, 'right': {'media': ref(lib), 'label': 'After', 'text': ''}, 'caption': ''}}},
    {'type': 'showcase', 'attrs': {'config': {'media': ref(vid), 'ratio': '16:9', 'focus': 'center', 'width': 'content', 'surface': 'none', 'inset': 'none', 'caption': ''}}},
    {'type': 'deviceMockup', 'attrs': {'config': {'preset': 'single', 'devices': [{'id': 'd1', 'type': 'phone', 'media': ref(img), 'x': 50, 'y': 50, 'scale': 1.2, 'rotate': 0, 'z': 1}], 'stageRatio': '16:9', 'shadow': True, 'spacing': 'normal', 'surface': 'muted', 'mobile': 'composition', 'caption': ''}}},
    {'type': 'splitLayout', 'attrs': {'config': {'media': ref(lib), 'order': 'media-text', 'proportion': '50-50', 'align': 'center', 'ratio': 'auto'}}, 'content': [p('Beside the picture.')]},
    {'type': 'pullQuote', 'attrs': {'config': {'style': 'serif', 'attribution': 'Ada', 'role': 'PM'}}, 'content': [{'type': 'text', 'text': 'It just works.'}]},
    {'type': 'callout', 'attrs': {'tone': 'brand', 'icon': 'lightbulb'}, 'content': [p('Note.')]},
    {'type': 'metrics', 'attrs': {'config': {'items': [{'value': '32%', 'label': 'Faster', 'detail': ''}], 'style': 'plain', 'columns': 3, 'caption': ''}}},
    {'type': 'spacer', 'attrs': {'size': 'md'}},
]}
draft = {k: study[k] for k in ['slug', 'title', 'subtitle', 'label', 'area', 'tags', 'summary', 'focus', 'thumbnail_path', 'thumbnail_alt', 'thumbnail_focus', 'cover_path', 'layout']}
draft.update(content=doc, summary='A private test.', thumbnail_path=img['path'], cover_path=lib['path'], thumbnail_alt='Checkout')
s, b, _ = API(ta, 'PUT', f'/api/app/case-studies/{cid}', {**draft, 'expected_updated_at': study['updated_at']}); saved = j(b)
ok('A saves every block type with private media', s == 200 and saved.get('updatedAt'), f"{s} {saved.get('error', '')[:90]}")
s, b, _ = API(ta, 'GET', f'/api/app/case-studies/{cid}'); back = j(b)['study']
# Since Stage 2 the server gives every section heading (level 2) an id and a status; nothing else changes.
first = back['content']['content'][0]['attrs']
expected = copy.deepcopy(doc); expected['content'][0]['attrs'].update(sectionId=first.get('sectionId'), sectionStatus=None)
ok('reload returns the document exactly as saved, plus a section id (SEC-011)', back['content'] == expected and re.match(r'^s[a-z0-9]{6,24}$', first.get('sectionId') or '') and back['thumbnail_path'] == img['path'] and back['cover_path'] == lib['path'])
ok('stored JSON holds raw storage paths, never URLs', '/studio/files/' not in json.dumps(back['content']) and 'http' not in json.dumps(back['content']).replace('https://youtu.be', ''))

# --- concurrency ----------------------------------------------------------------
s, b, _ = API(ta, 'PUT', f'/api/app/case-studies/{cid}', {**draft, 'expected_updated_at': study['updated_at']}); ok('a save based on an old version is refused (another tab)', s == 409 and j(b).get('code') == 'conflict', s)

# --- only the owner's own files can be referenced ---------------------------------
_, bimg, _ = upload(tb, PNG, 'image/png')
def with_src(src):
    d = copy.deepcopy(draft); d['content'] = {'type': 'doc', 'content': [{'type': 'image', 'attrs': {'src': src, 'alt': 'x'}}]}; return d
for name, src in [("B's private file", bimg['path']), ('an old-style (non-Studio) path', f"{cid}/1700000000-x.png"), ('an external URL', 'https://evil.test/x.png'), ('inline data', 'data:image/png;base64,AAAA')]:
    s, _, _ = API(ta, 'PUT', f'/api/app/case-studies/{cid}', with_src(src)); ok(f'saving a document that points at {name} is refused', s == 422, s)
d = copy.deepcopy(draft); d['thumbnail_path'] = bimg['path']
s, _, _ = API(ta, 'PUT', f'/api/app/case-studies/{cid}', d); ok("a thumbnail that is B's file is refused", s == 422, s)
d = copy.deepcopy(draft); d['content'] = {'type': 'doc', 'content': [p('x' * 2_200_000)]}
s, _, _ = API(ta, 'PUT', f'/api/app/case-studies/{cid}', d); ok('a document over 2 MB is refused', s in (413, 422), s)

# --- B can't see or touch A's case study (SEC-005/006) ------------------------------
for method, path, body in [('GET', f'/api/app/case-studies/{cid}', None), ('PUT', f'/api/app/case-studies/{cid}', draft), ('POST', f'/api/app/case-studies/{cid}/archive', None), ('DELETE', f'/api/app/case-studies/{cid}', None)]:
    s, _, _ = API(tb, method, path, body); ok(f'B: {method} on A\'s case study gets 404', s == 404, s)
s, b, _ = API(tb, 'GET', '/api/app/case-studies'); ok("B's list doesn't include A's case study", all(x['id'] != cid for x in j(b)['studies']))
s, _, _ = API(None, 'GET', '/api/app/case-studies'); ok('no token: 401', s == 401, s)

# --- no publishing at all (SEC-013) -----------------------------------------------------
s, _, _ = API(ta, 'POST', f'/api/app/case-studies/{cid}/publish', draft); ok('there is no Studio publish endpoint', s == 404, s)
s, _, _ = WEB(f'/work/{back["slug"]}'); ok('the case study has no public page', s == 404, s)

# --- pages ---------------------------------------------------------------------------
s, html, _ = WEB('/studio', ca); ok("A's dashboard lists the draft", s == 200 and b'Checkout redesign' in html, s)
s, html, _ = WEB(f'/studio/case-studies/{cid}', ca); ok('A opens the editor (SEC-012)', s == 200 and b'Archive' in html and b'Publish' not in html, s)
s, html, _ = WEB(f'/studio/case-studies/{cid}/preview', ca)
ok('A opens the private preview, media via /studio/files', s == 200 and b'/studio/files/' in html, s)
ok('preview has no public media URLs', b'/storage/v1/object/public/' not in html)
s, _, _ = WEB(f'/studio/case-studies/{cid}', cb); ok("B gets 404 for A's editor", s == 404, s)
s, _, _ = WEB(f'/studio/case-studies/{cid}/preview', cb); ok("B gets 404 for A's preview", s == 404, s)
s, _, h = WEB(f'/studio/case-studies/{cid}'); ok('signed out: redirected to sign in, nothing rendered (SEC-004)', s == 307 and '/studio/login' in h.get('Location', ''), s)

# --- archive / restore ------------------------------------------------------------------
s, b, _ = API(ta, 'POST', f'/api/app/case-studies/{cid}/archive'); ok('A archives it', s == 200 and j(b)['status'] == 'archived', s)
s, _, _ = API(ta, 'PUT', f'/api/app/case-studies/{cid}', draft); ok('an archived case study is read-only', s == 409, s)
s, b, _ = API(ta, 'GET', '/api/app/case-studies?status=archived'); ok('it shows under Archived', any(x['id'] == cid for x in j(b)['studies']))
s, b, _ = API(ta, 'POST', f'/api/app/case-studies/{cid}/restore'); ok('A restores it', s == 200 and j(b)['status'] == 'draft', s)
s, b, _ = API(ta, 'PUT', f'/api/app/case-studies/{cid}', draft); ok('and can edit again', s == 200, s)

# --- delete keeps the library (SEC-016) -----------------------------------------------------
s, _, _ = API(ta, 'DELETE', f'/api/app/case-studies/{cid}'); ok('A deletes the case study', s == 200, s)
s, b, _ = API(ta, 'GET', '/api/app/assets'); mine = {x['id']: x for x in j(b)['assets']}
ok('its uploads stay in A\'s library, detached', img['id'] in mine and mine[img['id']]['case_study_id'] is None)
s, _, _ = WEB(f"/studio/files/{img['path']}", ca); ok('and still open for A', s == 200, s)

# --- the old portfolio is gone (SEC-014/015) -------------------------------------------------
for path in ['/work', '/work/some-project', '/write', '/write/login', '/write/side-work', f'/write/{cid}', f'/write/{cid}/preview']:
    s, _, _ = WEB(path, ca); ok(f'{path} is gone (404)', s == 404, s)
for path in ['/api/public/case-studies', '/api/public/side-work', '/api/studio/case-studies', '/api/studio/me']:
    s, _, _ = API(ta, 'GET', path); ok(f'API {path} is gone (404)', s == 404, s)
s, _, h = WEB('/'); ok('/ sends visitors to the Studio', s == 307 and h.get('Location', '').endswith('/studio'), s)
K = {'apikey': ns['SKEY'], 'Authorization': 'Bearer ' + ns['SKEY']}
for table in ['case_studies', 'assets', 'side_work']:
    s, _, _ = call('GET', f"{ns['SUPA']}/rest/v1/{table}?select=id", headers=K); ok(f'old table public.{table} no longer exists', s == 404, s)
s, b, _ = call('GET', f"{ns['SUPA']}/storage/v1/bucket", headers=K); ok('the old public bucket is gone; only the private one remains', [x['id'] for x in j(b)] == ['studio-private-media'] and not j(b)[0]['public'], [x['id'] for x in j(b)])
S2 = {'X-Service-Key': ns['dj']['AUTH_SERVICE_KEY'], 'X-Client-IP': '203.0.113.42'}
s, b, _ = call('POST', 'http://localhost:8000/api/auth/request-code', {'email': A['user']['email'], 'purpose': 'portfolio'}, S2)
ok("the old 'portfolio' sign-in purpose changes nothing", s == 200)
s, b, _ = API(ta, 'GET', '/api/app/workspace'); ok('every account is an ordinary user with its own workspace', s == 200 and j(b)['workspace']['owner_id'] == A['user']['id'])

# --- clean up -------------------------------------------------------------------------------
import psycopg
paths = [a['path'] for a in (img, lib, vid, pdf, bimg)]
call('DELETE', f"{ns['SUPA']}/storage/v1/object/studio-private-media", {'prefixes': paths}, {'apikey': ns['SKEY'], 'Authorization': 'Bearer ' + ns['SKEY']})
with psycopg.connect(ns['dj']['DATABASE_URL']) as c:
    c.execute("delete from django.accounts_user where email in (%s, %s)", (A['user']['email'], B['user']['email']))
    ids = (A['user']['id'], B['user']['id'])
    left = c.execute("select (select count(*) from public.studio_case_studies where owner_id = any(%s::uuid[])) + (select count(*) from public.studio_assets where owner_id = any(%s::uuid[]))", (list(ids), list(ids))).fetchone()[0]
ok('everything created by the test is gone', left == 0, left)
print(f'\n{sum(results)}/{len(results)} passed')
sys.exit(0 if all(results) else 1)
