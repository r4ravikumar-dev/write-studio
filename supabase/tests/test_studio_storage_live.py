"""
Live Phase 3 test: private Studio storage and isolation (SEC-008, SEC-009, SEC-010).
Needs Django :8000 (console email), Express :4000, Next :3000 running, and the staging DB.
Creates two throwaway @example.test accounts and removes them (and their files) at the end.

    backend/django/.venv/bin/python -I supabase/tests/test_studio_storage_live.py "$PWD" <django-console-log>
"""
import base64, json, quopri, re, sys, time, uuid, urllib.error, urllib.request

root, log = sys.argv[1:3]
def envfile(p):
    return dict(l.rstrip('\n').split('=', 1) for l in open(p) if '=' in l and not l.startswith('#'))
dj = envfile(f'{root}/backend/django/.env'); ex = envfile(f'{root}/backend/express/.env')
SUPA, SKEY = ex['SUPABASE_URL'], ex['SUPABASE_SERVICE_ROLE_KEY']
BUCKET = 'studio-private-media'
results = []

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *a, **k): return None
opener = urllib.request.build_opener(NoRedirect)

def call(method, url, body=None, headers=None, raw=None):
    h = dict(headers or {}); data = raw
    if body is not None: data = json.dumps(body).encode(); h['Content-Type'] = 'application/json'
    try:
        with opener.open(urllib.request.Request(url, data, h, method=method), timeout=60) as r: return r.status, r.read(), r.headers
    except urllib.error.HTTPError as e: return e.code, e.read(), e.headers

def ok(name, cond, extra=''):
    cond = bool(cond); results.append(cond); print(('PASS ' if cond else 'FAIL ') + name + (f'  [{extra}]' if extra else ''))

def sign_in(email):
    S = {'X-Service-Key': dj['AUTH_SERVICE_KEY'], 'X-Client-IP': '203.0.113.40'}
    call('POST', 'http://localhost:8000/api/auth/request-code', {'email': email}, S); time.sleep(0.6)
    code = re.findall(r'is (\d{6})', quopri.decodestring(open(log, 'rb').read()).decode('utf-8', 'replace'))[-1]
    s, b, _ = call('POST', 'http://localhost:8000/api/auth/verify-code', {'email': email, 'code': code}, S)
    return json.loads(b)

API = lambda tok, method, path, body=None, headers=None: call(method, 'http://localhost:4000' + path, body, {**({'Authorization': 'Bearer ' + tok} if tok else {}), **(headers or {})})
WEB = lambda path, cookie=None, headers=None: call('GET', 'http://localhost:3000' + path, headers={**({'Cookie': cookie} if cookie else {}), **(headers or {})})

def put(signed_url, data, mime):
    bnd = 'b' + uuid.uuid4().hex
    body = (f'--{bnd}\r\nContent-Disposition: form-data; name="cacheControl"\r\n\r\nno-store\r\n'
            f'--{bnd}\r\nContent-Disposition: form-data; name=""; filename="f"\r\nContent-Type: {mime}\r\n\r\n').encode() + data + f'\r\n--{bnd}--\r\n'.encode()
    return call('PUT', signed_url, raw=body, headers={'Content-Type': f'multipart/form-data; boundary={bnd}', 'x-upsert': 'false'})

def upload(tok, data, mime, record=True, put_mime=None, case_study_id=None):
    s, b, _ = API(tok, 'POST', '/api/app/assets/upload-url', {'mime': mime, 'size': len(data), 'case_study_id': case_study_id})
    if s != 200: return s, json.loads(b), None
    t = json.loads(b); ps, pb, _ = put(t['signedUrl'], data, put_mime or mime)
    if ps != 200: return ps, {'put': pb[:120]}, t
    if not record: return 200, t, t
    s, b, _ = API(tok, 'POST', '/api/app/assets', {'path': t['path'], 'width': 1, 'height': 1, 'alt': 'x', 'original_name': 'pixel.png', 'case_study_id': case_study_id})
    reply = json.loads(b)
    return s, reply.get('asset', reply), t

def stored(path):
    s, _, _ = call('HEAD', f'{SUPA}/storage/v1/object/authenticated/{BUCKET}/{path}', headers={'apikey': SKEY, 'Authorization': 'Bearer ' + SKEY})
    return s == 200

PNG = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==')
tag = uuid.uuid4().hex[:6]
A, B = sign_in(f'storage-a-{tag}@example.test'), sign_in(f'storage-b-{tag}@example.test')
ca, cb = f"studio_access={A['access']}", f"studio_access={B['access']}"
_, wb, _ = API(A['access'], 'GET', '/api/app/workspace'); wsa = json.loads(wb)['workspace']['id']

# --- upload ---------------------------------------------------------------------
s, asset, t = upload(A['access'], PNG, 'image/png'); ok('A uploads an image (signed upload + record)', s == 201, s)
path = asset['path']
ok('stored under A/A-workspace/library/<uuid>.png', path.startswith(f"{A['user']['id']}/{wsa}/library/") and re.search(r'/[0-9a-f-]{36}\.png$', path) is not None, path)
ok('kind, mime and size come from storage, not the client', (asset['kind'], asset['mime'], asset['size']) == ('image', 'image/png', len(PNG)))

# --- owner can view; nobody else can ------------------------------------------------
s, body, h = WEB(f'/studio/files/{path}', ca)
ok('A opens the file at /studio/files/... (SEC-010)', s == 200 and body == PNG, s)
ok('file response is private, no-store, nosniff', 'no-store' in (h.get('Cache-Control') or '') and h.get('X-Content-Type-Options') == 'nosniff')
s, _, _ = WEB(f'/studio/files/{path}', cb); ok('B gets 404 for A\'s file through the app (SEC-008/010)', s == 404, s)
s, _, h = WEB(f'/studio/files/{path}'); ok('signed-out visitor gets 404, not a redirect (SEC-009)', s == 404 and not h.get('Location'), s)
s, _, _ = API(B['access'], 'GET', f'/api/app/media?path={path}'); ok('B gets 404 for A\'s file through the API', s == 404, s)
s, _, _ = API(None, 'GET', f'/api/app/media?path={path}'); ok('API without a token: 401', s == 401, s)
s, _, _ = call('GET', f'{SUPA}/storage/v1/object/public/{BUCKET}/{path}'); ok('no public URL for the private bucket (SEC-009)', s >= 400, s)
s, _, _ = call('GET', f'{SUPA}/storage/v1/object/authenticated/{BUCKET}/{path}'); ok('raw storage read without a key refused', s >= 400, s)
s, _, _ = call('POST', f'{SUPA}/storage/v1/object/list/{BUCKET}', {'prefix': A['user']['id']}); ok('listing the bucket without a key refused', s >= 400, s)
s, _, _ = call('POST', f'{SUPA}/storage/v1/object/sign/{BUCKET}/{path}', {'expiresIn': 60}); ok('creating a signed read link without a key refused', s >= 400, s)

# --- B can't touch A's library ---------------------------------------------------------
s, b, _ = API(B['access'], 'GET', '/api/app/assets'); ok('B\'s library doesn\'t list A\'s file', s == 200 and all(x['id'] != asset['id'] for x in json.loads(b)['assets']))
s, _, _ = API(B['access'], 'PATCH', f"/api/app/assets/{asset['id']}", {'alt': 'pwned'}); ok('B can\'t edit A\'s alt text', s == 404, s)
s, _, _ = API(B['access'], 'DELETE', f"/api/app/assets/{asset['id']}"); ok('B can\'t delete A\'s file (SEC-008)', s == 404 and stored(path), s)
s, _, _ = API(B['access'], 'POST', '/api/app/assets', {'path': path}); ok('B can\'t claim A\'s uploaded path', s == 404, s)
s, _, _ = API(B['access'], 'POST', '/api/app/assets/upload-url', {'mime': 'image/png', 'size': 10, 'case_study_id': str(uuid.uuid4())})
ok('B can\'t upload into a case study that isn\'t B\'s', s == 404, s)
ps, _, _ = put(t['signedUrl'], PNG, 'image/png'); ok('an upload link works once (no overwrite)', ps >= 400 and stored(path), ps)

# --- upload safety ---------------------------------------------------------------------
s, b, _ = API(A['access'], 'POST', '/api/app/assets/upload-url', {'mime': 'image/svg+xml', 'size': 100}); ok('SVG refused', s == 400, s)
s, b, _ = API(A['access'], 'POST', '/api/app/assets/upload-url', {'mime': 'image/png', 'size': 60 * 1024 * 1024}); ok('over 50 MB refused', s == 400, s)
s, b, _ = upload(A['access'], b'<svg onload=alert(1)>', 'image/png', put_mime='image/svg+xml'); ok('the bucket refuses a disallowed type even with a valid link', s >= 400 and s != 201, s)
s, b, t2 = upload(A['access'], PNG, 'image/png', put_mime='image/jpeg'); ok('type mismatch is refused when recording…', s == 400, s)
ok('…and the stray file is deleted (cleanup)', t2 is not None and not stored(t2['path']))
s, b, t3 = upload(A['access'], PNG, 'image/png', record=False); ok('an unrecorded upload is not viewable', WEB(f"/studio/files/{t3['path']}", ca)[0] == 404)

# --- video with byte ranges --------------------------------------------------------------
VIDEO = bytes(range(256)) * 64
s, vasset, _ = upload(A['access'], VIDEO, 'video/mp4'); ok('A uploads a video', s == 201, s)
s, body, h = WEB(f"/studio/files/{vasset['path']}", ca, {'Range': 'bytes=10-19'})
ok('video byte ranges pass through (206)', s == 206 and body == VIDEO[10:20] and (h.get('Content-Range') or '').startswith('bytes 10-19/'), f"{s} {h.get('Content-Range')}")

# --- delete ------------------------------------------------------------------------------
s, _, _ = API(A['access'], 'DELETE', f"/api/app/assets/{asset['id']}"); ok('A deletes the image: row and file gone', s == 200 and not stored(path), s)
ok('deleted file no longer opens', WEB(f'/studio/files/{path}', ca)[0] == 404)

# --- clean up ----------------------------------------------------------------------------
import psycopg
leftover = [t3['path'], vasset['path']]
call('DELETE', f'{SUPA}/storage/v1/object/{BUCKET}', {'prefixes': leftover}, {'apikey': SKEY, 'Authorization': 'Bearer ' + SKEY})
with psycopg.connect(dj['DATABASE_URL']) as c:
    c.execute("delete from django.accounts_user where email in (%s, %s)", (A['user']['email'], B['user']['email']))
ok('test accounts and files removed', not any(stored(p) for p in leftover))
print(f'\n{sum(results)}/{len(results)} passed')
sys.exit(0 if all(results) else 1)
