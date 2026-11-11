"""
Live T7 test: version history (automatic, named, before a restore), restore, owner isolation and the
deny-all access model of studio_case_study_revisions; new frameworks through project setup.
Needs Django :8000 (console email), Express :4000, Next :3000 and the staging DB. Creates throwaway
@example.test accounts and removes them at the end.

    backend/django/.venv/bin/python -I supabase/tests/test_studio_history_live.py "$PWD" <django-console-log>
"""
import json, sys, uuid

root, log = sys.argv[1:3]
helpers = open(f'{root}/supabase/tests/test_studio_storage_live.py').read().split('PNG = base64')[0]
ns = {'__name__': 'helpers'}; sys.argv = ['x', root, log]; exec(helpers, ns)
API, ok, sign_in, results = ns['API'], ns['ok'], ns['sign_in'], ns['results']
import psycopg
j = lambda b: json.loads(b or b'{}')
tag = uuid.uuid4().hex[:6]
A, B = sign_in(f'history-a-{tag}@example.test'), sign_in(f'history-b-{tag}@example.test')
ta, tb = A['access'], B['access']
CS = '/api/app/case-studies'
db = psycopg.connect(ns['dj']['DATABASE_URL'], autocommit=True)
p = lambda text: {'type': 'paragraph', 'content': [{'type': 'text', 'text': text}]}

s, b, _ = API(ta, 'POST', CS, {'title': 'History test'}); cid = j(b)['id']
s, b, _ = API(ta, 'GET', f'{CS}/{cid}'); st = j(b)['study']
draft = {k: st[k] for k in ['slug', 'title', 'subtitle', 'label', 'area', 'tags', 'summary', 'focus', 'thumbnail_path', 'thumbnail_alt', 'thumbnail_focus', 'cover_path', 'layout', 'project_type', 'role', 'team', 'timeline', 'platform', 'objective', 'challenge']}
first = st['content']

def save(text, title='History test'):
    doc = {'type': 'doc', 'content': [p(text)]}
    s, b, _ = API(ta, 'PUT', f'{CS}/{cid}', {**draft, 'title': title, 'content': doc})
    return s

ok('the first save works', save('Version one.', 'History test') == 200)
s, b, _ = API(ta, 'GET', f'{CS}/{cid}/revisions'); revs = j(b).get('revisions', [])
ok('it kept the state it replaced as an automatic version', s == 200 and len(revs) == 1 and revs[0]['kind'] == 'auto', revs)
ok('the list has no documents in it', all('content' not in r for r in revs))
save('Version two.')
s, b, _ = API(ta, 'GET', f'{CS}/{cid}/revisions')
ok('another save within 10 minutes adds no automatic version', len(j(b)['revisions']) == 1)

s, b, _ = API(ta, 'POST', f'{CS}/{cid}/revisions', {'name': ''}); ok('a named version needs a name', s == 422, s)
s, b, _ = API(ta, 'POST', f'{CS}/{cid}/revisions', {'name': 'Sent to the hiring manager'}); named = j(b).get('revision', {})
ok('A saves a named version', s == 201 and named.get('kind') == 'named', s)
save('Version three.', 'Renamed')

s, b, _ = API(tb, 'GET', f'{CS}/{cid}/revisions'); ok("B can't list A's versions", s == 404, s)
s, b, _ = API(tb, 'GET', f'{CS}/{cid}/revisions/{named["id"]}'); ok("B can't open A's version", s == 404, s)
s, b, _ = API(tb, 'POST', f'{CS}/{cid}/revisions/{named["id"]}/restore'); ok("B can't restore A's version", s == 404, s)
s, b, _ = API(tb, 'DELETE', f'{CS}/{cid}/revisions/{named["id"]}'); ok("B can't delete A's version", s == 404, s)
s, b, _ = API(tb, 'POST', CS, {'title': 'B own'}); bid = j(b)['id']
s, b, _ = API(tb, 'POST', f'{CS}/{bid}/revisions/{named["id"]}/restore'); ok("B can't restore A's version into B's own case study", s == 404, s)

s, b, _ = API(ta, 'GET', f'{CS}/{cid}/revisions/{named["id"]}'); rev = j(b).get('revision', {})
ok('A opens the named version: it holds "Version two."', s == 200 and 'Version two.' in json.dumps(rev.get('content')), s)
s, b, _ = API(ta, 'POST', f'{CS}/{cid}/revisions/{named["id"]}/restore'); ok('A restores it', s == 200 and j(b).get('updatedAt'), s)
s, b, _ = API(ta, 'GET', f'{CS}/{cid}'); now = j(b)['study']
ok('the document and title are back to that version', 'Version two.' in json.dumps(now['content']) and now['title'] == 'History test', now['title'])
s, b, _ = API(ta, 'GET', f'{CS}/{cid}/revisions'); kinds = [r['kind'] for r in j(b)['revisions']]
ok('what A had before the restore is kept ("before a restore")', kinds[0] == 'before_restore', kinds)
before = j(b)['revisions'][0]
s, b, _ = API(ta, 'GET', f'{CS}/{cid}/revisions/{before["id"]}')
ok('so the restore can be undone: it holds "Version three." and the old title', 'Version three.' in json.dumps(j(b)['revision']['content']) and j(b)['revision']['title'] == 'Renamed')

s, _, _ = API(ta, 'POST', f'{CS}/{cid}/archive')
s, b, _ = API(ta, 'POST', f'{CS}/{cid}/revisions/{named["id"]}/restore'); ok('an archived case study refuses a restore', s == 409, s)
API(ta, 'POST', f'{CS}/{cid}/restore')
s, _, _ = API(ta, 'DELETE', f'{CS}/{cid}/revisions/{named["id"]}'); ok('A deletes the named version', s == 200, s)

anon = db.execute("select has_table_privilege('anon', 'public.studio_case_study_revisions', 'select'), has_table_privilege('authenticated', 'public.studio_case_study_revisions', 'select')").fetchone()
ok('anon and authenticated have no access to versions', anon == (False, False), anon)
pol = db.execute("select relrowsecurity, (select count(*) from pg_policies where tablename = 'studio_case_study_revisions') from pg_class where oid = 'public.studio_case_study_revisions'::regclass").fetchone()
ok('row-level security is on with no policies', pol == (True, 0), pol)
try:
    db.execute("insert into public.studio_case_study_revisions (case_study_id, owner_id, kind, content) values (%s, %s, 'auto', '{}'::jsonb)", (cid, B['user']['id']))
    ok("a version can't belong to someone other than the case study's owner", False)
except psycopg.Error:
    ok("a version can't belong to someone other than the case study's owner", True)

# New frameworks through project setup (T7)
setup = {'step': 'outline', 'start': 'framework', 'project_type': 'research', 'title': 'Night bookings study', 'summary': '', 'role': '', 'team': '', 'timeline': '',
         'platform': '', 'objective': '', 'challenge': '', 'framework_id': 'ux-research', 'framework_version': 1, 'cover_path': None, 'cover_alt': '',
         'outline': [{'id': f'x{i}', 'key': k, 'title': ''} for i, k in enumerate(['research-context', 'research-question', 'research-findings'])]}
s, b, _ = API(ta, 'POST', CS, {'setup': setup, 'finish': True}); rid = j(b).get('id')
s, b, _ = API(ta, 'GET', f'{CS}/{rid}'); rs = j(b).get('study', {})
heads = [n['attrs'].get('section') for n in rs.get('content', {}).get('content', []) if n['type'] == 'heading']
ok('a UX research case study is created with its framework and sections', (rs.get('framework_id'), rs.get('framework_version')) == ('ux-research', 1) and heads == ['research-context', 'research-question', 'research-findings'], (rs.get('framework_id'), heads))

db.execute("delete from django.accounts_user where email in (%s, %s)", (A['user']['email'], B['user']['email']))
left = db.execute("select (select count(*) from public.studio_case_studies where owner_id = any(%s::uuid[])) + (select count(*) from public.studio_case_study_revisions where owner_id = any(%s::uuid[]))", ([A['user']['id'], B['user']['id']],) * 2).fetchone()[0]
ok('everything created by the test is gone (versions cascade)', left == 0, left)
print(f'\n{sum(results)}/{len(results)} passed')
sys.exit(0 if all(results) else 1)
