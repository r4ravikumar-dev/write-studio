"""
Live Stage 2 test: story sections (schema v2 migration with backup, section ids on save) and
private section notes (owner-only, never in the document or preview).
Needs Django :8000 (console email), Express :4000, Next :3000 and the staging DB. Creates throwaway
@example.test accounts and removes them at the end.

    backend/django/.venv/bin/python -I supabase/tests/test_studio_sections_live.py "$PWD" <django-console-log>
"""
import json, re, sys, uuid

root, log = sys.argv[1:3]
helpers = open(f'{root}/supabase/tests/test_studio_storage_live.py').read().split('PNG = base64')[0]
ns = {'__name__': 'helpers'}; sys.argv = ['x', root, log]; exec(helpers, ns)
call, API, WEB, ok, sign_in, results = ns['call'], ns['API'], ns['WEB'], ns['ok'], ns['sign_in'], ns['results']
import psycopg
j = lambda b: json.loads(b or b'{}')
tag = uuid.uuid4().hex[:6]
A, B = sign_in(f'sections-a-{tag}@example.test'), sign_in(f'sections-b-{tag}@example.test')
ta, tb = A['access'], B['access']
ca = f'studio_access={ta}'
CS = '/api/app/documents'
db = psycopg.connect(ns['dj']['DATABASE_URL'], autocommit=True)
SID = re.compile(r'^s[a-z0-9]{6,24}$')
heads = lambda doc: [n for n in doc['content'] if n['type'] == 'heading' and n.get('attrs', {}).get('level') == 2]
p = lambda t: {'type': 'paragraph', 'content': [{'type': 'text', 'text': t}]}

# --- new documents start in schema v2 with section ids ------------------------------------------
s, b, _ = API(ta, 'POST', CS, {'title': 'Template'}); tid = j(b)['id']
s, b, _ = API(ta, 'GET', f'{CS}/{tid}'); t = j(b)['document']
ids = [h['attrs']['sectionId'] for h in heads(t['content'])]
ok('a new case study is in the current schema (v3), every section heading has a unique id', t['content_schema_version'] == 3 and len(ids) == 10 and len(set(ids)) == 10 and all(SID.match(i) for i in ids))
ok('statuses start empty', all(h['attrs'].get('sectionStatus') is None for h in heads(t['content'])))

# --- an old (v1) document is migrated on read, with a backup -------------------------------------
v1 = {'type': 'doc', 'content': [
    {'type': 'heading', 'attrs': {'level': 2}, 'content': [{'type': 'text', 'text': 'Overview'}]}, p('What the project is about, in a few sentences.'),
    {'type': 'heading', 'attrs': {'level': 2}, 'content': [{'type': 'text', 'text': 'The challenge'}]}, p('Real text the user wrote.'),
    {'type': 'heading', 'attrs': {'level': 3}, 'content': [{'type': 'text', 'text': 'A sub-heading'}]},
]}
db.execute("update public.studio_documents set content = %s, content_schema_version = 1 where id = %s", (json.dumps(v1), tid))
s, b, _ = API(ta, 'GET', f'{CS}/{tid}'); m = j(b)['document']
hs = heads(m['content'])
ok('reading a v1 document returns it migrated to the current schema (v3)', s == 200 and m['content_schema_version'] == 3)
ok('untouched template hints became placeholders; the user’s text is kept', hs[0]['attrs'].get('section') == 'overview' and 'content' not in hs[0] and m['content']['content'][1] == {'type': 'paragraph'} and m['content']['content'][3] == p('Real text the user wrote.'))
ok('section headings got ids; the level-3 heading is not a section', all(SID.match(h['attrs']['sectionId']) for h in hs) and 'sectionId' not in m['content']['content'][4]['attrs'])
rows = db.execute("select from_version, to_version, content from public.studio_content_backups where document_id = %s", (tid,)).fetchall()
ok('the original v1 document was backed up first (recoverable)', len(rows) == 1 and rows[0][0] == 1 and rows[0][1] == 3 and rows[0][2] == v1)
API(ta, 'GET', f'{CS}/{tid}')
ok('reading again does not migrate or back up again', db.execute("select count(*) from public.studio_content_backups where document_id = %s", (tid,)).fetchone()[0] == 1)

# --- saving keeps section metadata valid -----------------------------------------------------------
draft = {k: m[k] for k in ['slug', 'title', 'subtitle', 'label', 'area', 'tags', 'summary', 'focus', 'thumbnail_path', 'thumbnail_alt', 'thumbnail_focus', 'cover_path', 'layout']}
dup = hs[0]['attrs']['sectionId']
messy = {'type': 'doc', 'content': [
    {'type': 'heading', 'attrs': {'level': 2, 'sectionId': dup, 'sectionStatus': 'complete'}, 'content': [{'type': 'text', 'text': 'One'}]}, p('a'),
    {'type': 'heading', 'attrs': {'level': 2, 'sectionId': dup, 'sectionStatus': 'published'}, 'content': [{'type': 'text', 'text': 'Two'}]},
    {'type': 'heading', 'attrs': {'level': 2}, 'content': [{'type': 'text', 'text': 'Three'}]},
    {'type': 'heading', 'attrs': {'level': 3, 'sectionId': 'sabcdefgh', 'sectionStatus': 'review'}, 'content': [{'type': 'text', 'text': 'Sub'}]},
]}
s, b, _ = API(ta, 'PUT', f'{CS}/{tid}', {**draft, 'content': messy}); ok('a save with repeated, missing and stray section ids is accepted', s == 200, s)
s, b, _ = API(ta, 'GET', f'{CS}/{tid}'); saved = j(b)['document']['content']
sh = heads(saved)
ok('stored: every section id is unique and valid', len({h['attrs']['sectionId'] for h in sh}) == 3 and all(SID.match(h['attrs']['sectionId']) for h in sh))
ok('stored: the first keeps its id and status; an unknown status is dropped', sh[0]['attrs']['sectionId'] == dup and sh[0]['attrs']['sectionStatus'] == 'complete' and sh[1]['attrs']['sectionStatus'] is None)
ok('stored: a non-section heading loses section metadata', 'sectionId' not in saved['content'][-1]['attrs'] and 'sectionStatus' not in saved['content'][-1]['attrs'])
ok('stored in the current schema (v3)', j(b)['document']['content_schema_version'] == 3)

# --- private notes ----------------------------------------------------------------------------------
sid = sh[0]['attrs']['sectionId']
s, _, _ = API(ta, 'PUT', f'{CS}/{tid}/notes/{sid}', {'body': 'Ask for the drop-off numbers.'}); ok('A saves a private note for a section', s == 200, s)
s, b, _ = API(ta, 'GET', f'{CS}/{tid}/notes'); notes = j(b)['notes']
ok('A reads it back', len(notes) == 1 and notes[0]['section_id'] == sid and notes[0]['body'] == 'Ask for the drop-off numbers.')
s, _, _ = API(ta, 'PUT', f'{CS}/{tid}/notes/{sid}', {'body': 'Updated.'})
s, b, _ = API(ta, 'GET', f'{CS}/{tid}/notes'); ok('saving again updates the same note', [n['body'] for n in j(b)['notes']] == ['Updated.'])
s, b, _ = API(ta, 'GET', f'{CS}/{tid}'); ok('the note is not in the document', 'Updated.' not in json.dumps(j(b)['document']))
s, html, _ = WEB(f'/studio/documents/{tid}/preview', ca); ok('the note is not in the preview', s == 200 and b'Updated.' not in html, s)
ok('the preview renders each section as a <section>', html.count(b'class="cs-section"') == 3)
s, _, _ = API(ta, 'PUT', f'{CS}/{tid}/notes/not-a-section', {'body': 'x'}); ok('an invalid section id is refused', s == 400, s)
s, _, _ = API(ta, 'PUT', f'{CS}/{tid}/notes/{sid}', {'body': 'x' * 5001}); ok('a note over 5,000 characters is refused', s == 422, s)
for method, body in [('GET', None), ('PUT', {'body': 'B was here'})]:
    path = f'{CS}/{tid}/notes' + (f'/{sid}' if method == 'PUT' else '')
    s, _, _ = API(tb, method, path, body); ok(f"B: {method} on A's notes gets 404", s == 404, s)
ok("B's attempt changed nothing", db.execute("select body from public.studio_section_notes where document_id = %s", (tid,)).fetchall() == [('Updated.',)])
s, b, _ = API(ta, 'POST', f'{CS}/{tid}/duplicate', {}); did = j(b)['id']
s, b, _ = API(ta, 'GET', f'{CS}/{did}/notes'); ok("a copy doesn't take the notes with it", j(b)['notes'] == [])
s, _, _ = API(ta, 'PUT', f'{CS}/{tid}/notes/{sid}', {'body': '   '}); s, b, _ = API(ta, 'GET', f'{CS}/{tid}/notes'); ok('an empty note is deleted', j(b)['notes'] == [])
API(ta, 'PUT', f'{CS}/{tid}/notes/{sid}', {'body': 'Kept until the case study goes.'})
API(ta, 'DELETE', f'{CS}/{tid}')
ok('deleting the case study deletes its notes and backups', db.execute("select (select count(*) from public.studio_section_notes where document_id = %s) + (select count(*) from public.studio_content_backups where document_id = %s)", (tid, tid)).fetchone()[0] == 0)

# --- lockdown -----------------------------------------------------------------------------------------
for table in ['studio_section_notes', 'studio_content_backups']:
    rls, anon, auth = db.execute("select c.relrowsecurity, has_table_privilege('anon', c.oid, 'select'), has_table_privilege('authenticated', c.oid, 'select') from pg_class c where c.relname = %s", (table,)).fetchone()
    ok(f'{table}: RLS on, no anon/authenticated access', rls and not anon and not auth)
try:
    db.execute("insert into public.studio_section_notes (document_id, owner_id, section_id, body) values (%s, %s, 'sabcdefgh', 'x')", (did, B['user']['id']))
    ok("the database refuses a note whose owner isn't the case study's owner", False)
except psycopg.Error:
    ok("the database refuses a note whose owner isn't the case study's owner", True)

# --- clean up -------------------------------------------------------------------------------------------
db.execute("delete from django.accounts_user where email in (%s, %s)", (A['user']['email'], B['user']['email']))
ids = [A['user']['id'], B['user']['id']]
left = db.execute("select (select count(*) from public.studio_documents where owner_id = any(%s::uuid[])) + (select count(*) from public.studio_section_notes where owner_id = any(%s::uuid[]))", (ids, ids)).fetchone()[0]
ok('everything created by the test is gone', left == 0, left)
print(f'\n{sum(results)}/{len(results)} passed')
sys.exit(0 if all(results) else 1)
