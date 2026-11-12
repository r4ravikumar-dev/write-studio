"""
Migration 0014 (case studies -> documents): up, checks, down, checks, in ONE transaction that is
always rolled back. Proves on the real staging data that

  * the migration applies and keeps every row byte for byte (ids, owners, workspaces, content md5,
    timestamps), in the document table and the four tables that point at it;
  * ownership rules, the private lockdown and the new status set work on the renamed schema;
  * the rollback script returns the catalogue (columns, constraints, indexes, triggers, functions,
    grants, RLS) and the data to exactly what they were, and refuses when it would lose a document type.

Run it BEFORE applying 0014 (it expects the pre-0014 schema). STAGING ONLY. It takes a short
exclusive lock on the studio tables, so don't run it while the live suites are running.

    backend/django/.venv/bin/python supabase/tests/migration_0014_dry_run.py
"""
import os
import re
import sys
import uuid
from pathlib import Path

import psycopg
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[2]
load_dotenv(ROOT / 'backend/django/.env')
UP = (ROOT / 'supabase/migrations/0014_studio_documents.sql').read_text()
DOWN = (ROOT / 'supabase/rollback/0014_studio_documents_down.sql').read_text()

results: list[bool] = []


def check(name: str, ok: bool, detail: object = '') -> None:
    results.append(bool(ok))
    print(('PASS ' if ok else 'FAIL ') + name + (f'  [{detail}]' if detail != '' and not ok else ''))


def rejected(cur, name: str, sql: str, params=()) -> None:
    cur.execute('savepoint t')
    try:
        cur.execute(sql, params)
    except psycopg.Error:
        cur.execute('rollback to savepoint t')
        check(name, True)
        return
    cur.execute('rollback to savepoint t')
    check(name, False, 'was allowed')


def squash(text: str) -> str:
    return re.sub(r'\s+', ' ', text or '').strip()


def catalogue(cur) -> dict:
    """Everything structural about the studio tables, as comparable sets."""
    q = lambda sql: set(cur.execute(sql).fetchall())
    return {
        'columns': q("""select table_name, column_name, data_type, coalesce(column_default, ''), is_nullable, coalesce(generation_expression, '')
                        from information_schema.columns where table_schema = 'public' and table_name like 'studio\\_%'"""),
        'constraints': q("""select c.relname, k.conname, pg_get_constraintdef(k.oid) from pg_constraint k
                            join pg_class c on c.oid = k.conrelid join pg_namespace n on n.oid = c.relnamespace
                            where n.nspname = 'public' and c.relname like 'studio\\_%'"""),
        'indexes': q("select tablename, indexname, indexdef from pg_indexes where schemaname = 'public' and tablename like 'studio\\_%'"),
        'triggers': q("""select c.relname, t.tgname, pg_get_triggerdef(t.oid), t.tgenabled::text from pg_trigger t join pg_class c on c.oid = t.tgrelid
                         where not t.tgisinternal and c.relname like 'studio\\_%'"""),
        'functions': {(name, squash(body)) for name, body in cur.execute(
            """select p.proname, pg_get_functiondef(p.oid) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
               where n.nspname = 'public' and p.proname like 'studio\\_%'""").fetchall()},
        'grants': q("""select table_name, grantee, privilege_type from information_schema.role_table_grants
                       where table_schema = 'public' and table_name like 'studio\\_%'"""),
        'rls': q("""select c.relname, c.relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace
                    where n.nspname = 'public' and c.relkind = 'r' and c.relname like 'studio\\_%'"""),
        'comments': q("""select c.relname, coalesce(a.attname, ''), d.description from pg_description d
                         join pg_class c on c.oid = d.objoid join pg_namespace n on n.oid = c.relnamespace
                         left join pg_attribute a on a.attrelid = c.oid and a.attnum = d.objsubid and d.objsubid > 0
                         where n.nspname = 'public' and c.relname like 'studio\\_%'"""),
    }


def data(cur, documents: str, revisions: str, fk: str, template: str) -> dict:
    """Every row of the document table and its children, reduced to what must survive."""
    q = lambda sql: sorted(cur.execute(sql).fetchall())
    return {
        'documents': q(f"""select id, owner_id, workspace_id, slug, title, status, {template}_id, {template}_version, content_schema_version,
                                  md5(content::text), md5(coalesce(setup_state::text, '')), created_at, updated_at, sections_total, sections_complete,
                                  md5(row(subtitle, label, area, tags, summary, focus, thumbnail_path, thumbnail_alt, thumbnail_focus, cover_path, layout,
                                          project_type, role, team, timeline, platform, objective, challenge)::text)
                           from public.{documents}"""),
        'assets': q(f'select id, owner_id, workspace_id, {fk}, path, kind, size, alt from public.studio_assets'),
        'notes': q(f'select id, {fk}, owner_id, section_id, md5(body), updated_at from public.studio_section_notes'),
        'backups': q(f'select id, {fk}, owner_id, from_version, to_version, md5(content::text) from public.studio_content_backups'),
        'revisions': q(f'select id, {fk}, owner_id, kind, name, title, md5(content::text), created_at from public.{revisions}'),
    }


def new_user(cur, email: str) -> uuid.UUID:
    user_id = uuid.uuid4()
    cur.execute(
        """insert into django.accounts_user (id, password, is_superuser, email, display_name, is_active, is_staff, date_joined, session_version)
           values (%s, '!', false, %s, '', true, false, now(), 0)""",
        (user_id, email),
    )
    return user_id


with psycopg.connect(os.environ['DATABASE_URL']) as conn:
    cur = conn.cursor()
    cur.execute("set local lock_timeout = '10s'")
    tag = uuid.uuid4().hex[:8]

    # A little of everything, so the comparison isn't over empty tables: two owners, documents in the
    # old schema with a framework, an unfinished setup, an asset, a note, a backup and a version.
    a = new_user(cur, f'a-{tag}@test.invalid')
    b = new_user(cur, f'b-{tag}@test.invalid')
    ws = dict(cur.execute('select owner_id, id from public.studio_workspaces where owner_id = any(%s)', ([a, b],)).fetchall())
    body = '{"type":"doc","content":[{"type":"heading","attrs":{"level":2,"section":"outcome","sectionId":"sabc1234","sectionStatus":"complete"}},{"type":"paragraph","content":[{"type":"text","text":"Kept."}]}]}'
    doc_a = cur.execute(
        """insert into public.studio_case_studies (workspace_id, owner_id, slug, title, framework_id, framework_version, content, content_schema_version, project_type, role)
           values (%s, %s, 'fixture-a', 'Fixture A', 'product-ux', 2, %s, 2, 'redesign', 'Lead designer') returning id""", (ws[a], a, body)).fetchone()[0]
    cur.execute(
        """insert into public.studio_case_studies (workspace_id, owner_id, slug, setup_state) values (%s, %s, 'fixture-setup', '{"step":"type","start":"framework","outline":[]}')""",
        (ws[a], a))
    doc_b = cur.execute("insert into public.studio_case_studies (workspace_id, owner_id, slug, status) values (%s, %s, 'fixture-b', 'archived') returning id", (ws[b], b)).fetchone()[0]
    asset = cur.execute(
        "insert into public.studio_assets (workspace_id, owner_id, case_study_id, path, kind) values (%s, %s, %s, %s, 'image') returning id",
        (ws[a], a, doc_a, f'{a}/{ws[a]}/{doc_a}/{uuid.uuid4()}.png')).fetchone()[0]
    cur.execute("insert into public.studio_section_notes (case_study_id, owner_id, section_id, body) values (%s, %s, 'sabc1234', 'private note')", (doc_a, a))
    cur.execute("insert into public.studio_content_backups (case_study_id, owner_id, from_version, to_version, content) values (%s, %s, 1, 2, %s)", (doc_a, a, body))
    cur.execute("insert into public.studio_case_study_revisions (case_study_id, owner_id, kind, name, title, content) values (%s, %s, 'named', 'First draft', 'Fixture A', %s)", (doc_a, a, body))

    catalogue_before = catalogue(cur)
    data_before = data(cur, 'studio_case_studies', 'studio_case_study_revisions', 'case_study_id', 'framework')
    print(f"before: {len(data_before['documents'])} documents, {len(data_before['assets'])} assets, {len(data_before['notes'])} notes, "
          f"{len(data_before['backups'])} backups, {len(data_before['revisions'])} versions")

    # ---- Up ------------------------------------------------------------------------------------
    cur.execute(UP)
    check('0014 applies', True)
    data_after = data(cur, 'studio_documents', 'studio_document_revisions', 'document_id', 'template')
    for table in data_before:
        check(f'{table}: every row identical after the migration (ids, owners, content md5, timestamps)', data_after[table] == data_before[table],
              f'{len(data_before[table])} before, {len(data_after[table])} after')
    types = cur.execute('select document_type, metadata::text, count(*) from public.studio_documents group by 1, 2').fetchall()
    check("every existing document is a 'ux_case_study' with empty metadata", len(types) == 1 and types[0][:2] == ('ux_case_study', '{}'), types)
    check('the old table, revisions table and owner function are gone',
          cur.execute("select to_regclass('public.studio_case_studies') is null and to_regclass('public.studio_case_study_revisions') is null "
                      "and not exists (select 1 from pg_proc where proname = 'studio_same_owner_as_case_study')").fetchone()[0])
    stale = cur.execute(
        """select k.conname from pg_constraint k join pg_class c on c.oid = k.conrelid join pg_namespace n on n.oid = c.relnamespace
             where n.nspname = 'public' and c.relname like 'studio\\_%' and (k.conname like '%case_stud%' or k.conname like '%framework%')
           union all select indexname from pg_indexes where schemaname = 'public' and tablename like 'studio\\_%' and (indexname like '%case_stud%' or indexname like '%framework%')
           union all select tgname from pg_trigger where not tgisinternal and tgname like '%case_stud%'
           union all select column_name from information_schema.columns where table_schema = 'public' and table_name like 'studio\\_%'
                     and (column_name like '%case_study%' or column_name like 'framework%')""").fetchall()
    check('no constraint, index, trigger or column still carries the old names', not stale, stale)

    # Behaviour on the new schema
    doc_new = cur.execute(
        "insert into public.studio_documents (workspace_id, owner_id, slug, document_type, template_id, template_version, metadata) "
        "values (%s, %s, 'dev-guide', 'developer_documentation', 'developer-guide', 1, '{\"product\":\"Payments API\"}') returning id", (ws[a], a)).fetchone()[0]
    check('a document of another type can be stored, with template metadata', doc_new is not None)
    check("a new row's title defaults to 'Untitled document'", cur.execute('select title from public.studio_documents where id = %s', (doc_new,)).fetchone()[0] == 'Untitled document')
    for status in ('in_progress', 'ready_for_review', 'archived', 'draft'):
        cur.execute('update public.studio_documents set status = %s where id = %s', (status, doc_new))
    check('statuses draft, in_progress, ready_for_review and archived are accepted', cur.rowcount == 1)
    rejected(cur, "status 'published' is still refused (private only)", "update public.studio_documents set status = 'published' where id = %s", (doc_new,))
    rejected(cur, 'a malformed document type is refused', "update public.studio_documents set document_type = 'Not A Type' where id = %s", (doc_new,))
    rejected(cur, 'metadata that is not an object is refused', "update public.studio_documents set metadata = '[]' where id = %s", (doc_new,))
    rejected(cur, 'a template id without a version is refused', 'update public.studio_documents set template_version = null where id = %s', (doc_new,))
    rejected(cur, "a document claiming another user's workspace is refused", "insert into public.studio_documents (workspace_id, owner_id, slug) values (%s, %s, 'sneaky')", (ws[a], b))
    rejected(cur, 'changing a document owner is refused', 'update public.studio_documents set owner_id = %s where id = %s', (b, doc_a))
    rejected(cur, "moving a document to another user's workspace is refused", 'update public.studio_documents set workspace_id = %s where id = %s', (ws[b], doc_a))
    rejected(cur, "a note on another user's document is refused (owner trigger, new function)",
             "insert into public.studio_section_notes (document_id, owner_id, section_id, body) values (%s, %s, 'sxyz9876', 'x')", (doc_b, a))
    rejected(cur, "a version of another user's document is refused",
             "insert into public.studio_document_revisions (document_id, owner_id, kind, content) values (%s, %s, 'auto', '{\"type\":\"doc\"}')", (doc_b, a))
    rejected(cur, "a backup of another user's document is refused",
             "insert into public.studio_content_backups (document_id, owner_id, from_version, to_version, content) values (%s, %s, 1, 2, '{\"type\":\"doc\"}')", (doc_b, a))
    rejected(cur, "an asset attached to another user's document is refused",
             "insert into public.studio_assets (workspace_id, owner_id, document_id, path, kind) values (%s, %s, %s, %s, 'image')",
             (ws[a], a, doc_b, f'{a}/{ws[a]}/library/{uuid.uuid4()}.png'))
    cur.execute('savepoint own')
    cur.execute("insert into public.studio_section_notes (document_id, owner_id, section_id, body) values (%s, %s, 'sown12345', 'mine')", (doc_new, a))
    check("a note on one's own document is accepted", cur.rowcount == 1)
    before_touch = cur.execute('select updated_at from public.studio_documents where id = %s', (doc_a,)).fetchone()[0]
    cur.execute("update public.studio_documents set title = 'Fixture A, edited' where id = %s", (doc_a,))
    progress = cur.execute('select sections_total, sections_complete from public.studio_documents where id = %s', (doc_a,)).fetchone()
    check('the generated section-progress columns still work (1 of 1 complete)', progress == (1, 1), progress)
    cur.execute('delete from public.studio_documents where id = %s', (doc_a,))
    left = cur.execute(
        """select (select document_id from public.studio_assets where id = %s),
                  (select count(*) from public.studio_section_notes where document_id = %s)
                + (select count(*) from public.studio_content_backups where document_id = %s)
                + (select count(*) from public.studio_document_revisions where document_id = %s)""", (asset, doc_a, doc_a, doc_a)).fetchone()
    check('deleting a document detaches its asset and removes its notes, backups and versions', left == (None, 0), left)
    cur.execute('rollback to savepoint own')

    tables = ('studio_documents', 'studio_document_revisions', 'studio_assets', 'studio_section_notes', 'studio_content_backups', 'studio_workspaces')
    for role in ('anon', 'authenticated'):
        blocked = 0
        for table in tables:
            cur.execute('savepoint r')
            cur.execute(f'set local role {role}')
            try:
                cur.execute(f'select count(*) from public.{table}')
            except psycopg.errors.InsufficientPrivilege:
                blocked += 1
            cur.execute('rollback to savepoint r')
        check(f'{role} cannot read any studio table', blocked == len(tables), f'{blocked} of {len(tables)} blocked')
    rls = cur.execute("select count(*) filter (where relrowsecurity), count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace "
                      "where n.nspname = 'public' and c.relkind = 'r' and c.relname like 'studio\\_%'").fetchone()
    check('row-level security is on for every studio table', rls[0] == rls[1] == len(tables), rls)
    check('no access policies exist (deny by default)', cur.execute("select count(*) from pg_policies where tablename like 'studio\\_%'").fetchone()[0] == 0)
    check('service_role keeps select, insert, update and delete on the renamed tables',
          cur.execute("select count(*) from information_schema.role_table_grants where table_schema = 'public' and grantee = 'service_role' "
                      "and table_name in ('studio_documents', 'studio_document_revisions') and privilege_type in ('SELECT', 'INSERT', 'UPDATE', 'DELETE')").fetchone()[0] == 8)
    rejected(cur, '0014 refuses to run twice', UP)

    # ---- Down ----------------------------------------------------------------------------------
    rejected(cur, 'the rollback refuses while a document of another type exists', DOWN)
    cur.execute('delete from public.studio_documents where id = %s', (doc_new,))
    cur.execute("alter table public.studio_documents disable trigger user")
    cur.execute("update public.studio_documents set status = 'in_progress' where id = %s", (doc_a,))
    cur.execute("alter table public.studio_documents enable trigger user")
    cur.execute(DOWN)
    check('the rollback applies', True)
    check("a document that was 'in_progress' is a draft again, with updated_at untouched",
          cur.execute('select status, updated_at from public.studio_case_studies where id = %s', (doc_a,)).fetchone() == ('draft', before_touch))
    data_down = data(cur, 'studio_case_studies', 'studio_case_study_revisions', 'case_study_id', 'framework')
    for table in data_before:
        check(f'{table}: every row identical after the rollback', data_down[table] == data_before[table])
    catalogue_down = catalogue(cur)
    for part in catalogue_before:
        gone, extra = catalogue_before[part] - catalogue_down[part], catalogue_down[part] - catalogue_before[part]
        check(f'catalogue after the rollback equals the original: {part}', not gone and not extra, {'missing': sorted(map(str, gone))[:4], 'extra': sorted(map(str, extra))[:4]})
    rejected(cur, 'the rollback refuses to run twice', DOWN)

    # ---- Up again: the round trip is repeatable ------------------------------------------------
    cur.execute(UP)
    check('0014 applies again after a rollback', data(cur, 'studio_documents', 'studio_document_revisions', 'document_id', 'template') == data_before)

    conn.rollback()
    print('\n(transaction rolled back: staging is unchanged)')

failed = results.count(False)
print(f'{len(results) - failed} passed, {failed} failed')
sys.exit(1 if failed else 0)
