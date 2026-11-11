"""
End-to-end test in a real (headless) Chrome: the editor's save path and the exports.

The live API tests send documents straight to Express, so they skip the path that once lost data
(the editor → server action → Express: ProseMirror attributes were dropped). This drives the real
editor: it types, adds blocks with the attributes that matter, waits for the autosave, and checks
that the stored document is exactly what the editor had, and still is after a reload. Then it
exports the preview as PDF (Chrome's print path) and as the standalone HTML file, with a real
picture and a real video, and opens the HTML file with the network off.

Needs Django :8000 (console email), Express :4000, Next :3000, the staging DB, Node 22+ and Chrome
(or CHROME_PATH). Creates a throwaway @example.test account and removes it (and its files) at the end.

    backend/django/.venv/bin/python -I supabase/tests/test_studio_editor_e2e.py "$PWD" <django-console-log>

Set E2E_KEEP=1 to keep the exported PDF and HTML file for a look (the path is printed).
"""
import json, os, shutil, struct, subprocess, sys, tempfile, uuid, zlib

root, log = sys.argv[1:3]
helpers = open(f'{root}/supabase/tests/test_studio_storage_live.py').read().split('PNG = base64')[0]
ns = {'__name__': 'helpers'}; sys.argv = ['x', root, log]; exec(helpers, ns)
API, ok, sign_in, upload, results, call = ns['API'], ns['ok'], ns['sign_in'], ns['upload'], ns['results'], ns['call']
SUPA, SKEY, BUCKET = ns['SUPA'], ns['SKEY'], ns['BUCKET']
import psycopg
j = lambda b: json.loads(b or b'{}')
CS = '/api/app/case-studies'


def png(width, height):
    """A real 400×250 PNG: a purple-to-white gradient, written by hand (no imaging library)."""
    rows = b''.join(b'\x00' + bytes(v for x in range(width) for v in (113 + (142 * x) // width, 79 + (176 * y) // height, 255)) for y in range(height))
    chunk = lambda kind, data: struct.pack('>I', len(data)) + kind + data + struct.pack('>I', zlib.crc32(kind + data) & 0xffffffff)
    return b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(rows, 9)) + chunk(b'IEND', b'')


def node(*args, timeout=240):
    done = subprocess.run(['node', f'{root}/scripts/e2e/editor.mjs', *args], capture_output=True, text=True, timeout=timeout)
    if done.returncode != 0:
        print(done.stderr[-2000:])
    return json.loads(done.stdout.strip().splitlines()[-1]) if done.stdout.strip() else {'failure': done.stderr[-2000:]}


def diff(a, b, path='doc'):
    """Where two JSON values first differ (for the failure message)."""
    if type(a) is not type(b) and not (isinstance(a, (int, float)) and isinstance(b, (int, float))):
        return [f'{path}: {json.dumps(a)[:120]} != {json.dumps(b)[:120]}']
    if isinstance(a, dict):
        out = []
        for key in sorted(set(a) | set(b)):
            if key not in a or key not in b:
                out.append(f'{path}.{key}: {"missing in stored" if key not in a else "missing in editor"} ({json.dumps(a.get(key, b.get(key)))[:80]})')
            else:
                out += diff(a[key], b[key], f'{path}.{key}')
        return out
    if isinstance(a, list):
        if len(a) != len(b): return [f'{path}: {len(a)} items != {len(b)}']
        return [d for i, (x, y) in enumerate(zip(a, b)) for d in diff(x, y, f'{path}[{i}]')]
    return [] if a == b else [f'{path}: {json.dumps(a)[:120]} != {json.dumps(b)[:120]}']


def without_nulls(value):
    """Attributes set to null mean "not set": the editor lists them, the server leaves them out
    (normaliseSections drops empty section attributes on sub-headings). Everything else must match."""
    if isinstance(value, dict):
        return {key: without_nulls(item) for key, item in value.items() if not (key != 'media' and item is None)}
    if isinstance(value, list):
        return [without_nulls(item) for item in value]
    return value


def find(doc, predicate):
    """Every node in a document (depth first) that matches."""
    found, stack = [], [doc]
    while stack:
        current = stack.pop()
        if predicate(current): found.append(current)
        stack.extend(reversed(current.get('content') or []))
    return found


tag = uuid.uuid4().hex[:6]
A = sign_in(f'e2e-a-{tag}@example.test')
ta = A['access']
db = psycopg.connect(ns['dj']['DATABASE_URL'], autocommit=True)
work = tempfile.mkdtemp(prefix='studio-e2e-out-')
try:
    s, b, _ = API(ta, 'POST', CS, {'title': 'End-to-end test'}); cid = j(b)['id']
    ok('a case study to edit', s == 201, s)
    s, image, _ = upload(ta, png(400, 250), 'image/png', case_study_id=cid); ok('a real picture is uploaded (400 × 250 PNG)', s == 201, s)
    webm = os.path.join(work, 'clip.webm')
    made = node('video', webm, timeout=120)
    ok('Chrome records a real video (WebM)', made.get('ok') and made.get('bytes', 0) > 1000, made)
    s, video, _ = upload(ta, open(webm, 'rb').read(), 'video/webm', case_study_id=cid); ok('the video is uploaded', s == 201, s)

    spec = os.path.join(work, 'input.json')
    json.dump({'origin': 'http://localhost:3000', 'access': ta, 'refresh': A['refresh'], 'caseStudyId': cid, 'imagePath': image['path'], 'videoPath': video['path'], 'outDir': work}, open(spec, 'w'))
    r = node('editor', spec)
    ok('the browser run finished', not r.get('failure'), ((r.get('failure') or '')[:400], r.get('lastLabel')))

    # ---- the editor save path ----
    ok('the editor opened with the case study', r.get('loadedTitle', '').startswith('Edit: End-to-end test'), r.get('loadedTitle'))
    ok('the autosave finished ("Saved · <time>")', (r.get('saveLabel') or '').startswith('Saved ·'), r.get('saveLabel'))
    s, b, _ = API(ta, 'GET', f'{CS}/{cid}'); stored = j(b)['study']['content']
    editor_doc = r.get('editorDoc') or {}
    ok('the stored document is exactly what the editor had (every node, attribute and mark; null = not set)', not diff(without_nulls(stored), without_nulls(editor_doc)), diff(without_nulls(stored), without_nulls(editor_doc))[:6])
    ok('…and the editor shows the same after a reload', not diff(without_nulls(stored), without_nulls(r.get('reloadedDoc') or {})), diff(without_nulls(stored), without_nulls(r.get('reloadedDoc') or {}))[:6])
    typed = find(stored, lambda n: n.get('type') == 'text' and n.get('text') in ('Typed by the end-to-end test.', 'A second paragraph.'))
    ok('typed text (with Enter between) is stored as two paragraphs', len(typed) == 2, len(typed))
    h3 = find(stored, lambda n: n.get('type') == 'heading' and n.get('attrs', {}).get('level') == 3)
    ok('the heading level and alignment survive (the attribute once lost)', h3 and h3[0]['attrs'].get('textAlign') == 'center', h3[:1])
    lead = find(stored, lambda n: n.get('type') == 'paragraph' and n.get('attrs', {}).get('textRole') == 'lead')
    link = [m for t in find(stored, lambda n: n.get('type') == 'text') for m in (t.get('marks') or []) if m['type'] == 'link']
    ok('text role, link target and bold survive', lead and link and link[0]['attrs'].get('target') == '_blank' and link[0]['attrs'].get('href') == 'https://example.com/case')
    img = find(stored, lambda n: n.get('type') == 'image')
    ok('the picture keeps its path and layout (size, align, shape, focus, credit, corners)', img and {k: img[0]['attrs'].get(k) for k in ('src', 'size', 'align', 'ratio', 'focus', 'credit', 'radius')} == {'src': image['path'], 'size': 'medium', 'align': 'left', 'ratio': '4/3', 'focus': 'top', 'credit': 'Test credit', 'radius': 'md'}, img[:1])
    dev = find(stored, lambda n: n.get('type') == 'deviceMockup')
    devices = dev[0]['attrs']['config']['devices'] if dev else []
    ok('device mockups keep groups, lock, rotation and decimal positions', [(d['id'], d.get('groupId'), bool(d.get('locked')), d['rotate'], d['x']) for d in devices] == [('dA', 'g1', False, 0, 30.5), ('dB', 'g1', True, -15, 70)], devices)
    grid = find(stored, lambda n: n.get('type') == 'imageGrid')
    ok('image grid keeps its tablet override and phone columns', grid and grid[0]['attrs']['config'].get('responsive') == {'tablet': {'columns': 2}} and grid[0]['attrs']['config'].get('mobileColumns') == 1)
    chart = find(stored, lambda n: n.get('type') == 'chart')
    ok('the chart keeps its kind and values (including 180.5)', chart and chart[0]['attrs']['config']['kind'] == 'line' and [p['value'] for p in chart[0]['attrs']['config']['points']] == [120, 180.5])
    table = find(stored, lambda n: n.get('type') == 'table')
    ok('table settings survive', table and {k: table[0]['attrs'].get(k) for k in ('tableStyle', 'striped', 'density', 'mobile')} == {'tableStyle': 'rows', 'striped': True, 'density': 'compact', 'mobile': 'fit'})
    status = find(stored, lambda n: n.get('type') == 'heading' and n.get('attrs', {}).get('sectionStatus') == 'complete')
    ok('a section status is stored on its heading', len(status) == 1)
    ok('no errors in the page while editing, saving and exporting', not r.get('errors'), (r.get('errors') or [])[:3])

    # ---- PDF ----
    pdf = r.get('pdf') or {}
    imgs = r.get('previewImages') or []
    ok('the preview shows the picture before printing', imgs and all(i['w'] > 0 for i in imgs), imgs)
    ok('the PDF prints (pages, size)', 1 <= pdf.get('pages', 0) <= 5 and pdf.get('bytes', 0) > 20000, pdf)
    ok('the PDF contains the pictures', pdf.get('images', 0) >= 1, pdf)
    pr = r.get('print') or {}
    ok('on paper the grid keeps its 3 columns (not the phone layout)', pr.get('gridColumns') == 3, pr.get('gridColumns'))
    ok('…a medium picture stays about half the width', pr.get('imageShare') and 45 <= pr['imageShare'] <= 55, pr.get('imageShare'))
    ok('…a video gives way to a note', pr.get('videoShown') is False and pr.get('noteShown') is True, (pr.get('videoShown'), pr.get('noteShown')))
    ok('…the paper is white and devices print without shadows', pr.get('background') == 'rgb(255, 255, 255)' and pr.get('deviceShadow') == 'none', (pr.get('background'), pr.get('deviceShadow')))
    # Two sections are shown, and the contents only appear for three or more: what matters is that
    # the empty "Overview" (marked complete) isn't listed.
    ok('the contents list only the sections shown (not an empty one marked complete)', 'Overview' not in (pr.get('contents') or []), pr.get('contents'))

    # ---- HTML ----
    html = r.get('html') or {}
    ok('Download HTML produced a file with the title and the text', html.get('hasTitle') and html.get('hasTypedText'), {k: html.get(k) for k in ('file', 'bytes')})
    ok('the pictures are embedded in it', html.get('imageDataUrls', 0) >= 3, html.get('imageDataUrls'))
    ok('the video is embedded in it', html.get('videoDataUrls', 0) == 1, html.get('videoDataUrls'))
    ok('the fonts are embedded in it', html.get('fontDataUrls', 0) >= 1, html.get('fontDataUrls'))
    ok('it has no links back to private files and no session', html.get('privateLinks') == 0 and not html.get('sessionLeak'), (html.get('privateLinks'), html.get('sessionLeak')))
    off = r.get('offline') or {}
    ok('opened on its own with the network off, every picture shows', off.get('images') and all(w > 0 for w in off['images']), off.get('images'))
    ok('…the video loads', off.get('video') and off['video']['readyState'] >= 1, off.get('video'))
    ok('…and the fonts load', off.get('fontsLoaded', 0) >= 1, off.get('fontsLoaded'))
finally:
    # Files first (the API purges the owner's folder), then the account (the database cascades).
    API(ta, 'DELETE', '/api/app/account/storage')
    db.execute("delete from django.accounts_user where email = %s", (A['user']['email'],))
    left = db.execute("select count(*) from public.studio_case_studies where owner_id = %s", (A['user']['id'],)).fetchone()[0]
    s, b, _ = call('POST', f'{SUPA}/storage/v1/object/list/{BUCKET}', {'prefix': A['user']['id'], 'limit': 10}, {'apikey': SKEY, 'Authorization': 'Bearer ' + SKEY})
    ok('everything created by the test is gone (rows and files)', left == 0 and s == 200 and json.loads(b) == [], (left, b[:80]))
    # The exported PDF and HTML stay only when asked for (E2E_KEEP=1), to look at by hand.
    if os.environ.get('E2E_KEEP'):
        print(f'Exports kept in {work}')
    else:
        shutil.rmtree(work, ignore_errors=True)
print(f'\n{sum(results)}/{len(results)} passed')
sys.exit(0 if all(results) else 1)
