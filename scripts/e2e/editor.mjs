/**
 * End-to-end checks in a real (headless) Chrome, driven by supabase/tests/test_studio_editor_e2e.py.
 *
 *   node scripts/e2e/editor.mjs video <out.webm>      records a short real WebM (canvas + MediaRecorder)
 *   node scripts/e2e/editor.mjs editor <input.json>   the editor save path and the exports
 *
 * Editor mode signs in with the owner's session cookies, types into the editor, adds blocks whose
 * attributes were once lost on save (heading levels, media paths, link targets, block configs),
 * waits for the autosave, reloads, and then exports: the PDF through Chrome's print path and the
 * standalone HTML file through the app's own Download HTML. Prints one JSON object for Python.
 */
import {readFileSync, writeFileSync, readdirSync, statSync} from 'node:fs';
import {join} from 'node:path';
import {launch, evaluate, waitFor, navigate} from './chrome.mjs';

const [mode, arg] = process.argv.slice(2);

if (mode === 'video') {
  const chrome = await launch();
  try {
    const base64 = await evaluate(
      chrome.page,
      `(async () => {
        const canvas = document.createElement('canvas'); canvas.width = 320; canvas.height = 180;
        document.body.append(canvas);
        const g = canvas.getContext('2d');
        const recorder = new MediaRecorder(canvas.captureStream(25), {mimeType: 'video/webm;codecs=vp8'});
        const chunks = [];
        recorder.ondataavailable = e => e.data.size && chunks.push(e.data);
        const done = new Promise(r => (recorder.onstop = r));
        recorder.start(100);
        const start = performance.now();
        await new Promise(resolve => {
          const draw = () => {
            const t = (performance.now() - start) / 1500;
            g.fillStyle = '#714FFF'; g.fillRect(0, 0, 320, 180);
            g.fillStyle = '#ffffff'; g.fillRect(20 + t * 240, 70, 40, 40);
            if (t < 1) requestAnimationFrame(draw); else resolve();
          };
          draw();
        });
        recorder.stop(); await done;
        const blob = new Blob(chunks, {type: 'video/webm'});
        const bytes = new Uint8Array(await blob.arrayBuffer());
        let text = ''; for (const b of bytes) text += String.fromCharCode(b);
        return btoa(text);
      })()`,
    );
    writeFileSync(arg, Buffer.from(base64, 'base64'));
    console.log(JSON.stringify({ok: true, bytes: Buffer.from(base64, 'base64').length}));
  } finally {
    await chrome.close();
  }
  process.exit(0);
}

if (mode !== 'editor') throw new Error('Usage: editor.mjs video <out> | editor <input.json>');

const input = JSON.parse(readFileSync(arg, 'utf8'));
const {origin, access, refresh, caseStudyId, imagePath, videoPath, outDir} = input;
const out = {errors: []};
const chrome = await launch();
const {page, browser} = chrome;
page.on('Runtime.exceptionThrown', event => out.errors.push(event.exceptionDetails?.exception?.description ?? event.exceptionDetails?.text));
page.on('Runtime.consoleAPICalled', event => {
  if (event.type === 'error') out.errors.push(event.args.map(a => a.value ?? a.description ?? '').join(' ').slice(0, 300));
});

try {
  // The owner's session, exactly as the sign-in page sets it (httpOnly, path /studio).
  for (const [name, value] of [['studio_access', access], ['studio_refresh', refresh]]) {
    await page.send('Network.setCookie', {name, value, url: `${origin}/studio`, path: '/studio', httpOnly: true, sameSite: 'Lax'});
  }

  // ---- 1. Editor: type, add blocks, autosave ---------------------------------------------------
  const editorUrl = `${origin}/studio/documents/${caseStudyId}/edit`;
  await navigate(page, editorUrl);
  await waitFor(page, `Boolean(document.querySelector('.ProseMirror')?.editor)`, {label: 'the editor', timeout: 60000});
  out.loadedTitle = await evaluate(page, 'document.title');

  // Real typing: cursor into the paragraph under the first section, then keyboard text input.
  await evaluate(page, `(() => {
    const ed = document.querySelector('.ProseMirror').editor;
    const pos = ed.state.doc.child(0).nodeSize + 1;
    ed.chain().focus().setTextSelection(pos).run();
    return pos;
  })()`);
  await page.send('Input.insertText', {text: 'Typed by the end-to-end test.'});
  // Enter and more typing, through key events (ProseMirror's own keymap).
  for (const type of ['keyDown', 'keyUp']) await page.send('Input.dispatchKeyEvent', {type, key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, ...(type === 'keyDown' ? {text: '\r'} : {})});
  await page.send('Input.insertText', {text: 'A second paragraph.'});

  // Smart Insert is document-aware: "/" in an empty paragraph of a template section recommends that
  // section's blocks; in a section of the user's own, the blocks recommended for this kind of document.
  const slashAt = async where => {
    await evaluate(page, `(() => {
      const ed = document.querySelector('.ProseMirror').editor;
      const end = ed.state.doc.content.size;
      ${where === 'own'
        ? `ed.chain().insertContentAt(end, [{type: 'heading', attrs: {level: 2}, content: [{type: 'text', text: 'My own section'}]}, {type: 'paragraph'}]).run();
           ed.chain().focus().setTextSelection(ed.state.doc.content.size - 1).run();`
        : `ed.chain().insertContentAt(end, {type: 'paragraph'}).run(); ed.chain().focus().setTextSelection(ed.state.doc.content.size - 1).run();`}
    })()`);
    await page.send('Input.insertText', {text: '/'});
    await waitFor(page, `Boolean(document.querySelector('.write-slash [role="option"]'))`, {label: 'the slash menu', timeout: 10000});
    const menu = await evaluate(page, `(() => {
      const groups = Array.from(document.querySelectorAll('.write-slash .write-slash-group')).map(e => e.textContent.trim());
      const first = document.querySelector('.write-slash .write-slash-group');
      const options = [];
      for (let el = first?.nextElementSibling; el && el.getAttribute('role') === 'option'; el = el.nextElementSibling) options.push(el.textContent.trim());
      return {groups, options};
    })()`);
    // Take the "/" (and the scratch blocks) out again: the document must end as it started.
    await evaluate(page, `(() => {
      const ed = document.querySelector('.ProseMirror').editor;
      const doc = ed.state.doc;
      let from = doc.content.size - doc.lastChild.nodeSize;
      ${where === 'own' ? 'from -= doc.child(doc.childCount - 2).nodeSize;' : ''}
      ed.chain().deleteRange({from, to: doc.content.size}).run();
    })()`);
    return menu;
  };
  out.slashInSection = await slashAt('template');
  out.slashInOwnSection = await slashAt('own');
  out.docAfterSlash = await evaluate(page, `(() => { const d = document.querySelector('.ProseMirror').editor.state.doc; return {blocks: d.childCount, ownSections: d.textContent.includes('My own section')}; })()`);

  // Blocks with the attributes that must survive the save (as the editor's own commands add them).
  await evaluate(page, `(() => {
    const ed = document.querySelector('.ProseMirror').editor;
    const end = ed.state.doc.content.size;
    const media = (path, kind) => ({path, kind, alt: kind === 'image' ? 'A purple test picture' : '', width: 400, height: 250, caption: ''});
    ed.chain().insertContentAt(end, [
      {type: 'heading', attrs: {level: 3, textAlign: 'center'}, content: [{type: 'text', text: 'A level-three heading'}]},
      {type: 'paragraph', attrs: {textRole: 'lead'}, content: [
        {type: 'text', text: 'A link', marks: [{type: 'link', attrs: {href: 'https://example.com/case', target: '_blank'}}, {type: 'bold'}]},
        {type: 'text', text: ' and plain text.'},
      ]},
      {type: 'image', attrs: {src: ${JSON.stringify(imagePath)}, alt: 'A purple test picture', width: 400, height: 250, size: 'medium', align: 'left', ratio: '4/3', focus: 'top', credit: 'Test credit', radius: 'md'}},
      {type: 'callout', attrs: {tone: 'warning', icon: 'alert'}, content: [{type: 'paragraph', content: [{type: 'text', text: 'The problem in one sentence.'}]}]},
      {type: 'imageGrid', attrs: {config: {items: [media(${JSON.stringify(imagePath)}, 'image'), media(${JSON.stringify(imagePath)}, 'image')], columns: 3, arrangement: 'even', ratio: '1:1', gap: 'sm', caption: 'Grid caption', mobileColumns: 1, responsive: {tablet: {columns: 2}}}}},
      {type: 'deviceMockup', attrs: {config: {preset: 'custom', stageRatio: '16:9', spacing: 'loose', surface: 'muted', shadow: true, mobile: 'stack', caption: '',
        devices: [
          {id: 'dA', type: 'laptop', media: media(${JSON.stringify(imagePath)}, 'image'), x: 30.5, y: 50, scale: 1, rotate: 0, z: 1, groupId: 'g1'},
          {id: 'dB', type: 'phone', media: null, x: 70, y: 55.5, scale: 0.9, rotate: -15, z: 2, locked: true, groupId: 'g1'}]}}},
      {type: 'chart', attrs: {config: {kind: 'line', title: 'Weekly bookings', unit: '', points: [{id: 'c1', label: 'Week 1', value: 120}, {id: 'c2', label: 'Week 2', value: 180.5}], target: 100, summary: 'Bookings rose.', caption: '', source: 'Analytics'}}},
      {type: 'researchInsights', attrs: {config: {insights: [{id: 'i1', finding: 'People book at night.', evidence: '6 of 8', source: 'Interviews'}], layout: 'list', columns: 2, numbered: false, caption: ''}}},
      {type: 'videoFile', attrs: {src: ${JSON.stringify(videoPath)}, caption: 'A test video'}},
      {type: 'table', attrs: {tableStyle: 'rows', striped: true, density: 'compact', mobile: 'fit'}, content: [
        {type: 'tableRow', content: [{type: 'tableHeader', content: [{type: 'paragraph', content: [{type: 'text', text: 'Metric'}]}]}, {type: 'tableHeader', content: [{type: 'paragraph', content: [{type: 'text', text: 'Value'}]}]}]},
        {type: 'tableRow', content: [{type: 'tableCell', content: [{type: 'paragraph', content: [{type: 'text', text: 'Bookings'}]}]}, {type: 'tableCell', content: [{type: 'paragraph', content: [{type: 'text', text: '180'}]}]}]}]},
    ]).run();
    // A section status (stored on the heading, never rendered).
    // The second section heading (the first one is above the typed text).
    let headingPos = null; let seen = 0;
    ed.state.doc.forEach((node, offset) => { if (node.type.name === 'heading' && node.attrs.level === 2 && (seen += 1) === 2) headingPos = offset; });
    const heading = ed.state.doc.nodeAt(headingPos);
    ed.view.dispatch(ed.state.tr.setNodeMarkup(headingPos, undefined, {...heading.attrs, sectionStatus: 'complete'}));
  })()`);

  // The autosave runs 1.2 s after the last change; wait for "Saved · <time>" (calls to Sydney can be slow).
  // The save status (not the "Private draft" label beside it, which has the same class).
  const LABEL = `Array.from(document.querySelectorAll('.studio-bar-save')).map(e => e.textContent ?? '').find(t => /^(Saved|Saving|Unsaved|Not saved)/.test(t)) ?? ''`;
  await waitFor(page, `/^(Saving|Unsaved)/.test(${LABEL})`, {timeout: 10000, label: 'the save to start'}).catch(() => null);
  out.saveLabel = await waitFor(page, `(() => { const t = ${LABEL}; return t.startsWith('Saved ·') ? t : ''; })()`, {timeout: 60000, label: 'the autosave'});
  out.editorDoc = await evaluate(page, `JSON.parse(JSON.stringify(document.querySelector('.ProseMirror').editor.getJSON()))`);

  // ---- 2. Reload: what the editor shows is what was stored ------------------------------------
  await navigate(page, editorUrl);
  await waitFor(page, `Boolean(document.querySelector('.ProseMirror')?.editor)`, {label: 'the editor after reload', timeout: 60000});
  out.reloadedDoc = await evaluate(page, `JSON.parse(JSON.stringify(document.querySelector('.ProseMirror').editor.getJSON()))`);

  // ---- 3. PDF: the preview through Chrome's print path (the print stylesheet) -------------------
  const previewUrl = `${origin}/studio/documents/${caseStudyId}/preview`;
  await navigate(page, previewUrl);
  await waitFor(page, `document.fonts.status === 'loaded' && Array.from(document.images).every(i => i.complete)`, {label: 'the preview to load', timeout: 60000});
  out.previewImages = await evaluate(page, `Array.from(document.querySelectorAll('.preview-page img')).map(i => ({w: i.naturalWidth, src: i.getAttribute('src')}))`);
  // How the print stylesheet lays the page out at A4 width (210 mm − 2 × 16 mm margins ≈ 673 px).
  await page.send('Emulation.setEmulatedMedia', {media: 'print'});
  await page.send('Emulation.setDeviceMetricsOverride', {width: 673, height: 950, deviceScaleFactor: 1, mobile: false});
  out.print = await evaluate(page, `(() => {
    const grid = document.querySelector('.preview-page .vb-grid');
    const image = document.querySelector('.preview-page img[data-size="medium"]');
    const video = document.querySelector('.preview-page video');
    const note = document.querySelector('.preview-page .cs-video-note');
    const device = document.querySelector('.preview-page .vb-device');
    return {
      gridColumns: grid ? getComputedStyle(grid).gridTemplateColumns.split(' ').length : null,
      imageShare: image ? Math.round((image.getBoundingClientRect().width / image.parentElement.getBoundingClientRect().width) * 100) : null,
      videoShown: video ? getComputedStyle(video).display !== 'none' : null,
      noteShown: note ? getComputedStyle(note).display !== 'none' : null,
      background: getComputedStyle(document.body).backgroundColor,
      deviceShadow: device ? getComputedStyle(device).boxShadow : null,
      contents: Array.from(document.querySelectorAll('.preview-contents li')).map(li => li.textContent.trim()),
    };
  })()`);
  await page.send('Emulation.clearDeviceMetricsOverride');
  await page.send('Emulation.setEmulatedMedia', {media: ''});
  const pdf = await page.send('Page.printToPDF', {printBackground: true, preferCSSPageSize: true});
  const pdfBytes = Buffer.from(pdf.data, 'base64');
  writeFileSync(join(outDir, 'case-study.pdf'), pdfBytes);
  const pdfText = pdfBytes.toString('latin1');
  out.pdf = {bytes: pdfBytes.length, pages: (pdfText.match(/\/Type\s*\/Page[^s]/g) ?? []).length, images: (pdfText.match(/\/Subtype\s*\/Image/g) ?? []).length};

  // ---- 4. HTML: the app's own Download HTML (?export=html runs it on load) ----------------------
  await browser.send('Browser.setDownloadBehavior', {behavior: 'allow', downloadPath: outDir, eventsEnabled: true});
  const finished = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('The HTML download did not finish')), 90000);
    browser.on('Browser.downloadProgress', event => {
      if (event.state === 'completed') {
        clearTimeout(timer);
        resolve(event);
      } else if (event.state === 'canceled') reject(new Error('The HTML download was cancelled'));
    });
  });
  await navigate(page, `${previewUrl}?export=html`);
  await finished;
  const file = readdirSync(outDir).filter(name => name.endsWith('.html')).map(name => join(outDir, name)).sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)[0];
  const html = readFileSync(file, 'utf8');
  out.html = {
    file,
    bytes: html.length,
    hasTitle: html.includes('<title>End-to-end test</title>'),
    hasTypedText: html.includes('Typed by the end-to-end test.'),
    imageDataUrls: (html.match(/src="data:image\/png;base64,/g) ?? []).length,
    videoDataUrls: (html.match(/src="data:video\/webm;base64,/g) ?? []).length,
    fontDataUrls: (html.match(/url\("data:font\//g) ?? []).length + (html.match(/url\("data:application\/(font|octet-stream)/g) ?? []).length,
    privateLinks: (html.match(/\/studio\/files\//g) ?? []).length,
    sessionLeak: html.includes(access.slice(0, 40)) || html.includes('studio_access'),
    scripts: (html.match(/<script/g) ?? []).length,
  };

  // ---- 5. The downloaded file on its own, with the network off --------------------------------
  await page.send('Network.emulateNetworkConditions', {offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1});
  await navigate(page, `file://${file}`);
  await waitFor(page, `Array.from(document.images).every(i => i.complete)`, {timeout: 20000, label: 'the offline images'});
  out.offline = await evaluate(page, `(async () => {
    const video = document.querySelector('video');
    if (video && video.readyState < 1) await new Promise(r => { video.addEventListener('loadedmetadata', r, {once: true}); setTimeout(r, 5000); });
    await document.fonts.ready;
    return {
      images: Array.from(document.images).map(i => i.naturalWidth),
      video: video ? {readyState: video.readyState, duration: video.duration} : null,
      fontsLoaded: Array.from(document.fonts).filter(f => f.status === 'loaded').length,
      title: document.title,
    };
  })()`);
  await page.send('Network.emulateNetworkConditions', {offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1});
} catch (error) {
  out.failure = String(error?.stack ?? error);
  out.lastLabel = await evaluate(page, `[Array.from(document.querySelectorAll('.studio-bar-save')).map(e => e.textContent), document.querySelector('[role=alert]')?.textContent]`).catch(() => null);
} finally {
  await chrome.close();
}
console.log(JSON.stringify(out));
