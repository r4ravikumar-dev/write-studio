"""
Live Stage 5 test: section progress on the dashboard (database-generated columns) and the restyled
private preview (sections, contents, facts, nothing private leaking). Export runs in the owner's
browser and is checked by hand (see docs/stage-5-report.md).
Needs Django :8000 (console email), Express :4000, Next :3000 and the staging DB. Creates throwaway
@example.test accounts and removes them at the end.

    backend/django/.venv/bin/python -I supabase/tests/test_studio_review_live.py "$PWD" <django-console-log>
"""
import json, sys, uuid

root, log = sys.argv[1:3]
helpers = open(f'{root}/supabase/tests/test_studio_storage_live.py').read().split('PNG = base64')[0]
ns = {'__name__': 'helpers'}; sys.argv = ['x', root, log]; exec(helpers, ns)
call, API, WEB, ok, sign_in, results = ns['call'], ns['API'], ns['WEB'], ns['ok'], ns['sign_in'], ns['results']
import psycopg
j = lambda b: json.loads(b or b'{}')
tag = uuid.uuid4().hex[:6]
A, B = sign_in(f'review-a-{tag}@example.test'), sign_in(f'review-b-{tag}@example.test')
ta, tb = A['access'], B['access']
ca, cb = f'studio_access={ta}', f'studio_access={tb}'
CS = '/api/app/documents'
db = psycopg.connect(ns['dj']['DATABASE_URL'], autocommit=True)

setup = {'step': 'outline', 'start': 'framework', 'project_type': 'redesign', 'title': 'Clinic booking', 'summary': 'A faster way to book.',
         'role': 'Lead product designer', 'team': '', 'timeline': 'March to June 2025', 'platform': 'iOS', 'objective': '', 'challenge': '',
         'template_id': 'product-ux', 'template_version': 1, 'cover_path': None, 'cover_alt': '',
         'outline': [{'id': f'x{i}', 'key': k, 'title': ''} for i, k in enumerate(['overview', 'challenge', 'decisions', 'outcome'])]}
s, b, _ = API(ta, 'POST', CS, {'setup': setup, 'finish': True}); cid = j(b)['id']
s, b, _ = API(ta, 'GET', CS); card = next(x for x in j(b)['documents'] if x['id'] == cid)
ok('a new case study lists 4 sections, 0 complete', (card.get('sections_total'), card.get('sections_complete')) == (4, 0), card.get('sections_total'))

s, b, _ = API(ta, 'GET', f'{CS}/{cid}'); st = j(b)['document']
doc = st['content']
heads = [n for n in doc['content'] if n['type'] == 'heading']
heads[0]['attrs']['sectionStatus'] = 'complete'
heads[1]['attrs']['sectionStatus'] = 'complete'
doc['content'][1] = {'type': 'paragraph', 'content': [{'type': 'text', 'text': 'Booking a clinic took four minutes.'}]}
doc['content'][3] = {'type': 'paragraph', 'content': [{'type': 'text', 'text': 'Half of patients gave up.'}]}
draft = {k: st[k] for k in ['slug', 'title', 'subtitle', 'label', 'area', 'tags', 'summary', 'focus', 'thumbnail_path', 'thumbnail_alt', 'thumbnail_focus', 'cover_path', 'layout', 'project_type', 'role', 'team', 'timeline', 'platform', 'objective', 'challenge']}
s, _, _ = API(ta, 'PUT', f'{CS}/{cid}', {**draft, 'content': doc}); ok('A saves two sections as complete', s == 200, s)
s, b, _ = API(ta, 'GET', CS); card = next(x for x in j(b)['documents'] if x['id'] == cid)
ok('the card now shows 2 of 4 complete (worked out by the database)', (card['sections_total'], card['sections_complete']) == (4, 2))
row = db.execute("select sections_total, sections_complete from public.studio_documents where id = %s", (cid,)).fetchone()
ok('the generated columns agree', row == (4, 2), row)
s, html, _ = WEB('/studio', ca); ok('the dashboard card says "2 of 4 sections complete"', s == 200 and b'2 of 4 sections complete' in html, s)
try:
    db.execute("update public.studio_documents set sections_complete = 9 where id = %s", (cid,))
    ok('progress can only come from the document (columns are generated)', False)
except psycopg.Error:
    ok('progress can only come from the document (columns are generated)', True)

s, html, _ = WEB(f'/studio/documents/{cid}/preview', ca)
page = html.decode('utf-8', 'replace')
ok('the preview opens for A', s == 200, s)
ok('it has one <h1>: the title', page.count('<h1') == 1 and 'Clinic booking' in page)
ok('the project facts are shown (role, timeline, platform), empty ones are not', 'Lead product designer' in page and 'March to June 2025' in page and '<dt>Team</dt>' not in page)
ok('written sections read under their framework titles; empty ones are left out', '>Overview<' in page and '>The challenge<' in page and '>Key decisions<' not in page)
ok('each written section is a <section> with an anchored heading', page.count('class="cs-section"') == 2 and f'id="section-{heads[0]["attrs"]["sectionId"]}"' in page)
ok('no section metadata or private notes leak into the page', 'sectionStatus' not in page and 'data-section-id' not in page)
ok('it offers Export (PDF and HTML)', 'Export' in page)
s, _, _ = WEB(f'/studio/documents/{cid}/preview', cb); ok("B gets 404 for A's preview", s == 404, s)
s, b, _ = API(tb, 'GET', CS); ok("B's dashboard has no progress from A's work", all(x['id'] != cid for x in j(b)['documents']))

db.execute("delete from django.accounts_user where email in (%s, %s)", (A['user']['email'], B['user']['email']))
left = db.execute("select count(*) from public.studio_documents where owner_id = any(%s::uuid[])", ([A['user']['id'], B['user']['id']],)).fetchone()[0]
ok('everything created by the test is gone', left == 0, left)
print(f'\n{sum(results)}/{len(results)} passed')
sys.exit(0 if all(results) else 1)
