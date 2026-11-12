"""
Live Phase 5 test: account deletion (SEC-017) and per-user caching (SEC-018).
Needs Django :8000 (console email), Express :4000, Next :3000 and the staging DB. Creates throwaway
@example.test accounts and removes anything left at the end.

    backend/django/.venv/bin/python -I supabase/tests/test_studio_lifecycle_live.py "$PWD" <django-console-log>
"""
import base64, json, re, sys, time, urllib.parse, uuid, quopri

root, log = sys.argv[1:3]
helpers = open(f'{root}/supabase/tests/test_studio_storage_live.py').read().split('PNG = base64')[0]
ns = {'__name__': 'helpers'}; sys.argv = ['x', root, log]; exec(helpers, ns)
call, API, WEB, upload, ok, sign_in, stored, results = ns['call'], ns['API'], ns['WEB'], ns['upload'], ns['ok'], ns['sign_in'], ns['stored'], ns['results']
dj = ns['dj']
PNG = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==')
S = {'X-Service-Key': dj['AUTH_SERVICE_KEY'], 'X-Client-IP': '203.0.113.50'}
D = lambda path, body, tok=None: call('POST', f'http://localhost:8000/api/auth/{path}', body, {**S, **({'Authorization': 'Bearer ' + tok} if tok else {})})
j = lambda b: json.loads(b or b'{}')
mail = lambda: quopri.decodestring(open(log, 'rb').read()).decode('utf-8', 'replace')
tag = uuid.uuid4().hex[:6]
PASSWORD = 'lifecycle test pass 77'

# A: password account (sign up + confirm link)
ea = f'life-a-{tag}@example.test'
D('signup', {'email': ea, 'password': PASSWORD, 'display_name': 'Ava Lifecycle'}); time.sleep(0.6)
token = urllib.parse.unquote(re.findall(r'confirm\?token=([^\s"<]+)', mail())[-1])
A = j(D('confirm-email', {'token': token})[1]); ta = A['access']
B = sign_in(f'life-b-{tag}@example.test'); tb = B['access']

# A's things: a case study, a recorded upload and an upload that was never recorded (an orphan)
s, b, _ = API(ta, 'POST', '/api/app/documents', {'title': 'Ava secret project'}); acid = j(b)['id']
_, aimg, _ = upload(ta, PNG, 'image/png', document_id=acid)
_, _, orphan = upload(ta, PNG, 'image/png', record=False)
ok('A has a case study, a recorded file and an orphan upload', aimg.get('id') and stored(aimg['path']) and stored(orphan['path']))
# B's things, which must survive A's deletion
s, b, _ = API(tb, 'POST', '/api/app/documents', {'title': 'Ben own project'}); bcid = j(b)['id']
_, bimg, _ = upload(tb, PNG, 'image/png', document_id=bcid)

# --- SEC-018: same browser, A then B ------------------------------------------------------
ca, cb = f'studio_access={ta}', f'studio_access={tb}'
for path in ['/studio', f'/studio/documents/{acid}/edit', f'/studio/documents/{acid}/preview', '/studio/media', '/studio/settings', f"/studio/files/{aimg['path']}"]:
    s, _, h = WEB(path, ca); ok(f'{path.split("/")[2] if path.count("/") > 1 else "/studio"} page is never cached (no-store)', s == 200 and 'no-store' in (h.get('Cache-Control') or ''), f"{s} {h.get('Cache-Control')}")
rsc = {'RSC': '1', 'Next-Router-State-Tree': '%5B%22%22%2C%7B%7D%5D'}
s, html, h = WEB('/studio?_rsc=probe', ca, rsc)
if s == 307:  # Next 16 checks the _rsc hash and redirects to the right one, as a browser would follow
    s, html, h = WEB(h.get('Location'), ca, rsc)
ok('client-navigation (RSC) responses are no-store too', s == 200 and 'no-store' in (h.get('Cache-Control') or ''), h.get('Cache-Control'))
s, html_a, _ = WEB('/studio', ca); s, html_b, _ = WEB('/studio', cb)
ok('after A, B in the same browser sees only B\'s workspace (SEC-018)', b'Ben own project' in html_b and b'Ava' not in html_b and b'Ava secret project' not in html_b)
s, b, h = API(ta, 'GET', '/api/app/documents'); ok('API replies are private, no-store', 'no-store' in (h.get('Cache-Control') or ''))

# --- SEC-017: delete A's account ----------------------------------------------------------
s, b, _ = D('delete-account/confirm', {'password': 'not it'}, ta); ok('deletion needs the real password', s == 400, s)
s, b, _ = D('delete-account', {'deletion_token': 'forged'}, ta); ok('deletion needs a valid confirmation token', s == 400, s)
s, b, _ = D('delete-account/confirm', {'password': PASSWORD}, ta); dtok = j(b).get('deletion_token'); ok('A confirms with their password', s == 200 and dtok, s)
s, b, _ = D('delete-account', {'deletion_token': dtok}, tb); ok("A's confirmation can't delete B", s == 400, s)
s, b, _ = API(ta, 'DELETE', '/api/app/account/storage'); ok("Express removes all of A's files (incl. the orphan)", s == 200 and j(b)['removed'] >= 2, f"{s} {j(b)}")
ok("A's files are gone from storage", not stored(aimg['path']) and not stored(orphan['path']))
ok("B's file is untouched", stored(bimg['path']))
s, b, _ = D('delete-account', {'deletion_token': dtok}, ta); ok("Django deletes A's account", s == 200 and j(b) == {'status': 'deleted'}, s)

import psycopg
with psycopg.connect(dj['DATABASE_URL']) as c:
    q = lambda sql, *a: c.execute(sql, a).fetchone()[0]
    aid = A['user']['id']
    ok("A's account, workspace, case studies and file records are gone (cascade)",
       q('select count(*) from django.accounts_user where id = %s', aid) == 0
       and q('select count(*) from public.studio_workspaces where owner_id = %s', aid) == 0
       and q('select count(*) from public.studio_documents where owner_id = %s', aid) == 0
       and q('select count(*) from public.studio_assets where owner_id = %s', aid) == 0)
    ok("no storage object left under A's folder", q("select count(*) from storage.objects where bucket_id = 'studio-private-media' and name like %s", aid + '/%') == 0)
    ok("B's account, case study and file record are intact",
       q('select count(*) from public.studio_documents where id = %s', bcid) == 1 and q('select count(*) from public.studio_assets where id = %s', bimg['id']) == 1)

s, _, _ = D('refresh', {'refresh': A['refresh']}); ok("A's refresh token no longer works", s == 401, s)
s, _, _ = D('login', {'email': ea, 'password': PASSWORD}); ok('A can no longer sign in with the password', s == 400, s)
s, _, _ = API(ta, 'GET', '/api/app/workspace'); ok("A's still-unexpired access token reaches nothing", s == 404, s)
s, _, _ = API(ta, 'POST', '/api/app/documents', {'title': 'ghost'}); ok('…and cannot create anything', s in (404, 502) and s != 201, s)
s, _, _ = API(ta, 'POST', '/api/app/assets/upload-url', {'mime': 'image/png', 'size': 10}); ok('…or upload anything', s == 404, s)

# --- clean up ---------------------------------------------------------------------------
call('DELETE', f"{ns['SUPA']}/storage/v1/object/studio-private-media", {'prefixes': [bimg['path']]}, {'apikey': ns['SKEY'], 'Authorization': 'Bearer ' + ns['SKEY']})
with psycopg.connect(dj['DATABASE_URL']) as c:
    c.execute("delete from django.accounts_user where email like %s", (f'life-%-{tag}@example.test',))
    ids = [A['user']['id'], B['user']['id']]
    left = c.execute(
        """select (select count(*) from public.studio_documents where owner_id = any(%s::uuid[]))
                + (select count(*) from public.studio_assets where owner_id = any(%s::uuid[]))
                + (select count(*) from storage.objects where bucket_id = 'studio-private-media'
                     and (name like %s or name like %s))""",
        (ids, ids, ids[0] + '/%', ids[1] + '/%')).fetchone()[0]
ok('test data removed', left == 0, left)
print(f'\n{sum(results)}/{len(results)} passed')
sys.exit(0 if all(results) else 1)
