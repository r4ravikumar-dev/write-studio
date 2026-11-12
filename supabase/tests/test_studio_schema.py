"""
Studio schema tests (Phase 1): provisioning, ownership integrity and lockdown.

Runs against the database in backend/django/.env (DATABASE_URL) inside ONE
transaction that is always rolled back, so it leaves nothing behind.
STAGING ONLY. Run from the repo root:

    backend/django/.venv/bin/python supabase/tests/test_studio_schema.py
"""
import os
import sys
import uuid
from pathlib import Path

import psycopg
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[2] / 'backend/django/.env')

results: list[tuple[bool, str]] = []


def check(name: str, ok: bool, detail: str = '') -> None:
    results.append((ok, name))
    print(('PASS ' if ok else 'FAIL ') + name + (f'  [{detail}]' if detail else ''))


def rejected(cur, name: str, sql: str, params=()) -> None:
    """The statement must fail (inside a savepoint, so the test carries on)."""
    cur.execute('savepoint t')
    try:
        cur.execute(sql, params)
    except psycopg.Error as error:
        cur.execute('rollback to savepoint t')
        check(name, True, type(error).__name__)
        return
    cur.execute('rollback to savepoint t')
    check(name, False, 'was allowed')


def new_user(cur, email: str) -> uuid.UUID:
    user_id = uuid.uuid4()
    cur.execute(
        """insert into django.accounts_user (id, password, is_superuser, email, display_name, is_active, is_staff, date_joined, session_version)
           values (%s, '!', false, %s, '', true, false, now(), 0)""",
        (user_id, email),
    )
    return user_id


def doc(slug='alpha'):
    return slug


with psycopg.connect(os.environ['DATABASE_URL']) as conn:
    cur = conn.cursor()
    tag = uuid.uuid4().hex[:8]

    # --- Provisioning -------------------------------------------------------
    a = new_user(cur, f'a-{tag}@test.invalid')
    b = new_user(cur, f'b-{tag}@test.invalid')
    ws = dict(cur.execute('select owner_id, id from public.studio_workspaces where owner_id = any(%s)', ([a, b],)).fetchall())
    check('signup trigger creates exactly one workspace per account', len(ws) == 2)
    wa, wb = ws[a], ws[b]
    cur.execute('insert into public.studio_workspaces (owner_id) values (%s) on conflict (owner_id) do nothing', (a,))
    n = cur.execute('select count(*) from public.studio_workspaces where owner_id = %s', (a,)).fetchone()[0]
    check('provisioning is idempotent (still one workspace)', n == 1)
    rejected(cur, 'a second workspace for the same owner is refused',
             'insert into public.studio_workspaces (owner_id) values (%s)', (a,))
    rejected(cur, 'workspace ownership cannot be transferred',
             'update public.studio_workspaces set owner_id = %s where id = %s', (b, wa))
    cur.execute("update public.studio_workspaces set name = 'Renamed' where id = %s", (wa,))
    check('workspace display name can change', cur.rowcount == 1)

    # --- Case studies -------------------------------------------------------
    cs_a = cur.execute(
        "insert into public.studio_documents (workspace_id, owner_id, slug) values (%s, %s, 'my-app') returning id",
        (wa, a)).fetchone()[0]
    check('owner can create a case study in their workspace', cs_a is not None)
    cur.execute("insert into public.studio_documents (workspace_id, owner_id, slug) values (%s, %s, 'my-app')", (wb, b))
    check('same slug allowed in a different workspace', cur.rowcount == 1)
    rejected(cur, 'duplicate slug in the same workspace is refused',
             "insert into public.studio_documents (workspace_id, owner_id, slug) values (%s, %s, 'my-app')", (wa, a))
    rejected(cur, "case study claiming another user's workspace is refused (SEC-006)",
             "insert into public.studio_documents (workspace_id, owner_id, slug) values (%s, %s, 'sneaky')", (wa, b))
    rejected(cur, "moving a case study to another user's workspace is refused (SEC-007)",
             'update public.studio_documents set workspace_id = %s where id = %s', (wb, cs_a))
    rejected(cur, 'changing a case study owner is refused',
             'update public.studio_documents set owner_id = %s where id = %s', (b, cs_a))
    rejected(cur, "status 'published' is refused (private-only release)",
             "update public.studio_documents set status = 'published' where id = %s", (cs_a,))
    cur.execute("update public.studio_documents set status = 'archived' where id = %s", (cs_a,))
    check('status archived is allowed', cur.rowcount == 1)
    rejected(cur, 'content that is not a Tiptap doc is refused',
             """update public.studio_documents set content = '{"type":"paragraph"}' where id = %s""", (cs_a,))
    rejected(cur, 'content over the size cap is refused',
             """update public.studio_documents set content = jsonb_build_object('type','doc','x', repeat(md5(random()::text), 70000)) where id = %s""",
             (cs_a,))
    rejected(cur, 'a URL as thumbnail path is refused',
             "update public.studio_documents set thumbnail_path = 'https://evil.test/x.png' where id = %s", (cs_a,))
    rejected(cur, 'an unsafe slug is refused',
             "insert into public.studio_documents (workspace_id, owner_id, slug) values (%s, %s, '../etc')", (wa, a))

    # --- Assets -------------------------------------------------------------
    def path(owner, workspace, folder='library'):
        return f'{owner}/{workspace}/{folder}/{uuid.uuid4()}.png'

    asset = cur.execute(
        "insert into public.studio_assets (workspace_id, owner_id, document_id, path, kind) values (%s, %s, %s, %s, 'image') returning id",
        (wa, a, cs_a, path(a, wa, cs_a))).fetchone()[0]
    check('owner can record an asset for their case study', asset is not None)
    rejected(cur, "asset in another user's folder is refused",
             "insert into public.studio_assets (workspace_id, owner_id, path, kind) values (%s, %s, %s, 'image')", (wa, a, path(b, wb)))
    rejected(cur, 'asset path with traversal or a free-form name is refused',
             "insert into public.studio_assets (workspace_id, owner_id, path, kind) values (%s, %s, %s, 'image')",
             (wa, a, f'{a}/{wa}/library/../../x.png'))
    cs_b = cur.execute("select id from public.studio_documents where workspace_id = %s", (wb,)).fetchone()[0]
    rejected(cur, "asset attached to another user's case study is refused",
             "insert into public.studio_assets (workspace_id, owner_id, document_id, path, kind) values (%s, %s, %s, %s, 'image')",
             (wa, a, cs_b, path(a, wa)))
    rejected(cur, "moving an asset to another user's workspace is refused",
             'update public.studio_assets set workspace_id = %s where id = %s', (wb, asset))
    rejected(cur, 'an unknown asset kind is refused',
             "insert into public.studio_assets (workspace_id, owner_id, path, kind) values (%s, %s, %s, 'script')", (wa, a, path(a, wa)))
    cur.execute('delete from public.studio_documents where id = %s', (cs_a,))
    kept = cur.execute('select document_id from public.studio_assets where id = %s', (asset,)).fetchone()
    check('deleting a case study keeps its asset in the library, detached (SEC-016)', kept is not None and kept[0] is None)

    # --- Lockdown: Supabase's public API roles see nothing ------------------
    for role in ('anon', 'authenticated'):
        for table in ('studio_workspaces', 'studio_documents', 'studio_assets'):
            cur.execute('savepoint r')
            cur.execute(f'set local role {role}')
            try:
                cur.execute(f'select count(*) from public.{table}')
                check(f'{role} cannot read {table} (SEC-005)', False, 'readable')
            except psycopg.errors.InsufficientPrivilege:
                check(f'{role} cannot read {table} (SEC-005)', True)
            cur.execute('rollback to savepoint r')
    rls = cur.execute(
        "select relname, relrowsecurity from pg_class where relname in ('studio_workspaces','studio_documents','studio_assets')").fetchall()
    check('row-level security is enabled on every studio table', len(rls) == 3 and all(on for _, on in rls))
    pols = cur.execute("select count(*) from pg_policies where tablename like 'studio\\_%'").fetchone()[0]
    check('no access policies exist on studio tables (deny by default)', pols == 0, pols)

    # --- Account deletion cascades only that account -------------------------
    cur.execute('delete from django.accounts_user where id = %s', (a,))
    left_a = cur.execute(
        """select (select count(*) from public.studio_workspaces where owner_id = %s)
                + (select count(*) from public.studio_documents where owner_id = %s)
                + (select count(*) from public.studio_assets where owner_id = %s)""", (a, a, a)).fetchone()[0]
    left_b = cur.execute('select count(*) from public.studio_documents where owner_id = %s', (b,)).fetchone()[0]
    check("deleting an account removes its studio rows and nobody else's", left_a == 0 and left_b == 1)

    conn.rollback()

failed = [name for ok, name in results if not ok]
print(f'\n{len(results) - len(failed)}/{len(results)} passed' + (f'; FAILED: {failed}' if failed else ''))
sys.exit(1 if failed else 0)
