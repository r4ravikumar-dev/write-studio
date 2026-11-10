"""
Live Phase 2 test against running services (Django :8000, Express :4000, Next :3000) and the
staging database. Creates two throwaway @example.test accounts and deletes them at the end.
Run from the repo root (Django must use the console email backend, i.e. no SMTP/Gmail set):

    backend/django/.venv/bin/python -I supabase/tests/test_studio_auth_live.py "$PWD" <django-console-log>
"""
import json, re, sys, time, uuid, urllib.request, urllib.error, quopri
root, log = sys.argv[1:3]
env = dict(l.rstrip('\n').split('=', 1) for l in open(f'{root}/backend/django/.env') if '=' in l and not l.startswith('#'))
K = env['AUTH_SERVICE_KEY']; tag = uuid.uuid4().hex[:6]
A, B = f'phase2-a-{tag}@example.test', f'phase2-b-{tag}@example.test'
class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *a, **k): return None
opener = urllib.request.build_opener(NoRedirect)
def call(method, url, body=None, headers=None):
    h = dict(headers or {}); data = None
    if body is not None: data = json.dumps(body).encode(); h['Content-Type'] = 'application/json'
    try:
        with opener.open(urllib.request.Request(url, data, h, method=method), timeout=60) as r: return r.status, r.read(), r.headers
    except urllib.error.HTTPError as e: return e.code, e.read(), e.headers
D = lambda path, body, tok=None: call('POST', f'http://localhost:8000/api/auth/{path}', body, {'X-Service-Key': K, 'X-Client-IP': '203.0.113.7', **({'Authorization': 'Bearer ' + tok} if tok else {})})
results = []
def ok(name, cond, extra=''):
    results.append(cond); print(('PASS ' if cond else 'FAIL ') + name + (f'  [{extra}]' if extra else ''))
def mail_text():
    return quopri.decodestring(open(log, 'rb').read()).decode('utf-8', 'replace')
def last_link(kind):
    return re.findall(rf'http://localhost:3000/studio/{kind}\?[^\s"<]+', mail_text())[-1]
def last_code(email):
    time.sleep(0.5)
    return re.findall(r'sign in to the studio is (\d{6})', mail_text())[-1]

# A: password sign-up + confirm link
s, b, _ = D('signup', {'email': A, 'password': 'a perfectly fine pass 1', 'display_name': 'Alice Test'}); ok('A signs up with a password', s == 200, s)
time.sleep(0.5); token = re.search(r'token=([^&\s]+)', last_link('confirm')).group(1)
token = urllib.parse.unquote(token) if hasattr(urllib, 'parse') else token
import urllib.parse; token = urllib.parse.unquote(token)
s, b, _ = D('login', {'email': A, 'password': 'a perfectly fine pass 1'}); ok('A cannot log in before confirming', s == 403, s)
s, b, _ = D('confirm-email', {'token': token}); pa = json.loads(b); ok('A confirms by link and is signed in', s == 200, s)
# B: email code sign-up
D('request-code', {'email': B}); s, b, _ = D('verify-code', {'email': B, 'code': last_code(B), 'display_name': 'Bob Test'}); pb = json.loads(b)
ok('B signs up with an email code', s == 200, s)
ok('both are ordinary users (the only role)', pa['user']['role'] == 'user' and pb['user']['role'] == 'user')

# Express: each sees only their own workspace
E = lambda tok, path='/api/app/workspace', m='GET', body=None: call(m, 'http://localhost:4000' + path, body, {'Authorization': 'Bearer ' + tok} if tok else {})
s, b, h = E(pa['access']); wa = json.loads(b)['workspace']
s2, b2, _ = E(pb['access']); wb = json.loads(b2)['workspace']
ok('A gets A\'s workspace (owner_id = A)', s == 200 and wa['owner_id'] == pa['user']['id'])
ok('B gets B\'s workspace, a different one', s2 == 200 and wb['owner_id'] == pb['user']['id'] and wb['id'] != wa['id'])
ok('workspace replies are private, no-store', 'no-store' in (h.get('Cache-Control') or ''))
s, _, _ = E(None); ok('workspace API without a token: 401', s == 401, s)
forged = pa['access'][:-4] + ('AAAA' if not pa['access'].endswith('AAAA') else 'BBBB')
s, _, _ = E(forged); ok('tampered token: 401', s == 401, s)
s, _, _ = E(pa['access'], '/api/studio/case-studies'); ok('the old owner-only API is gone (404)', s == 404, s)
s, b, _ = E(pb['access'], '/api/app/workspace', 'PATCH', {'name': 'Bob\'s desk'}); ok('B renames only B\'s workspace', s == 200 and json.loads(b)['workspace']['owner_id'] == pb['user']['id'])
s, b, _ = E(pa['access']); ok('A\'s workspace name unchanged', json.loads(b)['workspace']['name'] == wa['name'])

# Next: pages render each user's own workspace; sessions stay separate
N = lambda path, cookie: call('GET', 'http://localhost:3000' + path, headers={'Cookie': cookie})
s, b, h = N('/studio', f"studio_access={pa['access']}")
ok('A\'s /studio renders A\'s workspace', s == 200 and b'Welcome' in b and b'Alice' in b, s)
ok('signed-in studio page is private, no-store', 'no-store' in (h.get('Cache-Control') or ''), h.get('Cache-Control'))
s, b, _ = N('/studio', f"studio_access={pb['access']}"); ok('B\'s /studio renders B\'s workspace name', s == 200 and (b'Bob&#x27;s desk' in b or b"Bob's desk" in b), s)
s, b, _ = N('/studio/settings', f"studio_access={pb['access']}"); ok('B (code-only account) is offered "Add a password"', s == 200 and b'Add a password' in b)
s, _, h = N('/write', f"studio_access={pa['access']}"); ok('the old /write CMS is gone (404), even signed in', s == 404, s)
s, _, h = N('/studio/login', f"studio_access={pa['access']}"); ok('signed-in user visiting /studio/login goes to /studio', s == 307 and h.get('Location', '').endswith('/studio'))
s, _, h = N('/studio', f"studio_refresh={pa['refresh']}"); ok('expired access + refresh cookie: proxy refreshes and serves', s == 200 and 'studio_access=' in (h.get('Set-Cookie') or ''))

# B adds a password, then both methods give the same account
s, b, _ = D('set-password', {'password': 'bobs new password 22'}, pb['access']); ok('B adds a password to a code account', s == 200, s)
s, b, _ = D('login', {'email': B, 'password': 'bobs new password 22'}); ok('B signs in with the password, same account', s == 200 and json.loads(b)['user']['id'] == pb['user']['id'])

# clean up the two throwaway accounts (cascades their workspaces)
import psycopg
with psycopg.connect(env['DATABASE_URL']) as c:
    c.execute('delete from django.accounts_user where email in (%s, %s)', (A, B))
    left = c.execute('select count(*) from public.studio_workspaces w left join django.accounts_user u on u.id = w.owner_id where u.id is null').fetchone()[0]
ok('test accounts removed; no orphan workspaces', left == 0)
print(f'\n{sum(results)}/{len(results)} passed')
