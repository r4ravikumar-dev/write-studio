/**
 * Block contract checks in a real (headless) Chrome, driven by supabase/tests/test_studio_blocks_live.py.
 *
 *   node scripts/e2e/blocks.mjs <input.json>    {origin, access, refresh, futureId, lockedId, newId}
 *
 * futureId: a document holding a block this version doesn't know. It must open with that block
 * locked, everything else intact, and an edit must never save over it.
 * lockedId: a document saved by a newer content schema. It must open read-only and never save.
 * newId: an empty document. Every Phase 3 block is inserted the way a person would (Insert menu and
 * "/" menu), typed into, saved, reloaded and previewed, then checked in print and at phone width.
 * Prints one JSON object for Python.
 */
import {readFileSync} from 'node:fs';
import {launch, evaluate, waitFor, navigate} from './chrome.mjs';

const {origin, access, refresh, futureId, lockedId, newId} = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const out = {errors: [], puts: []};
const chrome = await launch();
const {page} = chrome;
page.on('Runtime.exceptionThrown', event => out.errors.push(event.exceptionDetails?.exception?.description ?? event.exceptionDetails?.text));
// Server actions are POSTs to the page: count them while a document that must not be saved is open.
await page.send('Network.enable');
page.on('Network.requestWillBeSent', event => {
  if (event.request.method === 'POST' && event.request.headers['Next-Action']) out.puts.push(event.request.url);
});

const editorReady = `Boolean(document.querySelector('.ProseMirror')?.editor)`;
const state = `(() => {
  const ed = document.querySelector('.ProseMirror').editor;
  const types = []; ed.state.doc.forEach(node => types.push(node.type.name));
  return {
    types,
    text: ed.state.doc.textContent,
    editable: ed.isEditable,
    placeholders: document.querySelectorAll('.ProseMirror [data-unknown-block]').length,
    banners: Array.from(document.querySelectorAll('[role=alert], .astryx-banner, section')).map(el => el.textContent.trim()).filter(text => /newer version|read-only/.test(text)).slice(0, 3),
    save: Array.from(document.querySelectorAll('.studio-bar-save')).map(el => el.textContent.trim()).join(' | '),
  };
})()`;

try {
  for (const [name, value] of [['studio_access', access], ['studio_refresh', refresh]]) {
    await page.send('Network.setCookie', {name, value, url: `${origin}/studio`, path: '/studio', httpOnly: true, sameSite: 'Lax'});
  }

  // ---- A block from the future: locked, the rest editable, never saved over --------------------
  await navigate(page, `${origin}/studio/documents/${futureId}/edit`);
  await waitFor(page, editorReady, {label: 'the editor', timeout: 60000});
  out.futureOpened = await evaluate(page, state);
  // Type into the first paragraph, as a person would, and let the autosave run.
  await evaluate(page, `(() => {
    const ed = document.querySelector('.ProseMirror').editor;
    let pos = null; ed.state.doc.forEach((node, offset) => { if (pos === null && node.type.name === 'paragraph') pos = offset + node.nodeSize - 1; });
    ed.chain().focus().setTextSelection(pos).run();
  })()`);
  await page.send('Input.insertText', {text: ' Typed later.'});
  out.futureAfterTyping = await waitFor(page, `(() => { const s = ${state}; return /Not saved|couldn|doesn’t know/i.test(s.save + document.body.textContent) ? s : null; })()`, {label: 'the refused save', timeout: 60000}).catch(() => null);
  out.futureError = await evaluate(page, `Array.from(document.querySelectorAll('[role=alert], .astryx-banner')).map(el => el.textContent.trim()).find(text => /doesn’t know/.test(text)) ?? ''`);

  // ---- Written by a newer version: read-only, nothing saved --------------------------------------
  out.puts = [];
  await navigate(page, `${origin}/studio/documents/${lockedId}/edit`);
  await waitFor(page, editorReady, {label: 'the locked editor', timeout: 60000});
  out.lockedOpened = await evaluate(page, state);
  await evaluate(page, `document.querySelector('.ProseMirror').focus()`);
  await page.send('Input.insertText', {text: 'Should not appear.'});
  await new Promise(resolve => setTimeout(resolve, 3000));
  out.lockedAfterTyping = await evaluate(page, state);
  out.lockedSaves = out.puts.length;

  // ---- The Phase 3 blocks, inserted and written in as a person would --------------------------
  out.puts = [];
  await navigate(page, `${origin}/studio/documents/${newId}/edit`);
  await waitFor(page, editorReady, {label: 'the new document', timeout: 60000});
  const toEnd = `(() => { const ed = document.querySelector('.ProseMirror').editor; ed.chain().focus().setTextSelection(ed.state.doc.content.size - 1).run(); return true; })()`;
  const key = async (name, modifiers = 0) => {
    const codes = {Enter: 13, ArrowDown: 40, Tab: 9, Escape: 27};
    for (const type of ['keyDown', 'keyUp']) await page.send('Input.dispatchKeyEvent', {type, key: name, code: name, windowsVirtualKeyCode: codes[name], modifiers, ...(type === 'keyDown' && name === 'Enter' ? {text: '\r'} : {})});
  };
  const typeText = text => page.send('Input.insertText', {text});
  const slash = async query => {
    await evaluate(page, toEnd);
    await typeText(`/${query}`);
    await waitFor(page, `Boolean(document.querySelector('.write-slash [role="option"]'))`, {label: `the "/" menu for ${query}`, timeout: 10000});
    await key('Enter');
    await new Promise(resolve => setTimeout(resolve, 200));
  };
  // From the Insert menu (the toolbar button), by its visible label.
  await evaluate(page, toEnd);
  await evaluate(page, `Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Insert')?.click()`);
  await waitFor(page, `Array.from(document.querySelectorAll('[role="menuitem"]')).some(el => el.textContent.includes('Terminal'))`, {label: 'the Insert menu', timeout: 10000});
  out.insertMenuGroups = await evaluate(page, `Array.from(document.querySelectorAll('[role="menu"] [role="presentation"], [role="menu"] [role="group"] > :first-child')).map(el => el.textContent.trim()).filter(Boolean)`);
  await evaluate(page, `Array.from(document.querySelectorAll('[role="menuitem"]')).find(el => el.textContent.trim().startsWith('Terminal'))?.click()`);
  await new Promise(resolve => setTimeout(resolve, 300));
  await typeText('npm install @clinic/sdk');
  await key('Enter', process.platform === 'darwin' ? 4 : 2);
  await typeText('added 12 packages');

  await slash('requirements');
  await typeText('Patients can book without an account.');
  await key('Enter');
  await typeText('The price is shown before the slot is chosen.');

  await slash('acceptance');
  await typeText('I am not signed in');
  await key('ArrowDown');
  await typeText('I choose a free slot');
  await key('ArrowDown');
  await typeText('the slot is held for 10 minutes');
  await key('Enter');
  await typeText('I am asked for a phone number');

  await slash('story');
  await typeText('a parent with a sick child');
  await key('Enter');
  await typeText('to book the earliest slot tonight');
  await key('Enter');
  await typeText('my child is seen before morning');

  await slash('procedure');
  await typeText('Check the booking in the admin panel.');
  await key('Enter');
  await typeText('Call the clinic if the slot was lost.');

  await slash('testimonial');
  await typeText('Our evening appointments filled up within a week.');
  await slash('references');
  await typeText('Google developer documentation style guide');
  await slash('parameter');
  await typeText('The clinic to book at.');
  await slash('code');
  await typeText("const booking = await client.bookings.create({clinicId: 'c1'});");

  // The on-page fields (B6), typed into like any form field: parameter name, testimonial person, reference link.
  const fill = async (label, text) => {
    const found = await evaluate(page, `(() => { const input = Array.from(document.querySelectorAll('.ProseMirror input')).find(el => el.getAttribute('aria-label') === ${JSON.stringify(label)} || Array.from(el.labels ?? []).some(l => l.textContent.trim() === ${JSON.stringify(label)})); if (!input) return false; input.focus(); input.select(); return true; })()`);
    if (found) await typeText(text);
    return found;
  };
  out.fields = {
    name: await fill('Parameter name', 'clinicId'),
    person: await fill('Who said it', 'Dr Asha Rao'),
    link: await fill('Link', 'https://developers.google.com/style'),
  };
  // The code block's language: the inspector's control, used the way it is wired (setBlockAttrs on the block).
  await evaluate(page, `(() => { const ed = document.querySelector('.ProseMirror').editor; let pos = null; ed.state.doc.forEach((n, o) => { if (n.type.name === 'codeBlock') pos = o; }); ed.view.dispatch(ed.state.tr.setNodeMarkup(pos, undefined, {...ed.state.doc.nodeAt(pos).attrs, language: 'typescript'})); return true; })()`);
  // Settings from the inspector (B6): the code block's inspector opens with the cursor in it.
  await evaluate(page, `(() => { const ed = document.querySelector('.ProseMirror').editor; let pos = null; ed.state.doc.forEach((n, o) => { if (n.type.name === 'codeBlock') pos = o; }); ed.chain().focus().setTextSelection(pos + 2).run(); return true; })()`);
  out.inspectorTitle = await waitFor(page, `(() => { const h = Array.from(document.querySelectorAll('.write-panel h2, [role=tabpanel] h2, h2')).map(e => e.textContent.trim()).find(t => t === 'Code block'); return h ?? ''; })()`, {label: 'the code block inspector', timeout: 10000}).catch(() => '');

  // Keyboard: every on-page control in the new blocks has a name.
  out.unnamedControls = await evaluate(page, `Array.from(document.querySelectorAll('.ProseMirror :is(input, button, select, [role=combobox], [role=switch])')).filter(el => !(el.getAttribute('aria-label') || el.labels?.[0]?.textContent?.trim() || el.textContent.trim() || el.getAttribute('aria-labelledby'))).length`);

  const LABEL = `Array.from(document.querySelectorAll('.studio-bar-save')).map(e => e.textContent ?? '').find(t => /^(Saved|Saving|Unsaved|Not saved)/.test(t)) ?? ''`;
  await waitFor(page, `/^(Saving|Unsaved)/.test(${LABEL})`, {timeout: 8000, label: 'the save to start'}).catch(() => null);
  out.newSave = await waitFor(page, `(() => { const t = ${LABEL}; return t.startsWith('Saved ·') ? t : ''; })()`, {timeout: 60000, label: 'the autosave'});
  out.newEditorDoc = await evaluate(page, `JSON.parse(JSON.stringify(document.querySelector('.ProseMirror').editor.getJSON()))`);
  await navigate(page, `${origin}/studio/documents/${newId}/edit`);
  await waitFor(page, editorReady, {label: 'the new document after reload', timeout: 60000});
  out.newReloadedDoc = await evaluate(page, `JSON.parse(JSON.stringify(document.querySelector('.ProseMirror').editor.getJSON()))`);

  // Preview: semantic HTML for each block, no page-wide overflow.
  await navigate(page, `${origin}/studio/documents/${newId}/preview`);
  await waitFor(page, `Boolean(document.querySelector('.cs-article, .cs-prose'))`, {label: 'the preview', timeout: 60000});
  const previewFacts = `({
    terminalCommands: Array.from(document.querySelectorAll('.cs-terminal .cs-terminal-command')).map(e => e.textContent),
    terminalOutputs: Array.from(document.querySelectorAll('.cs-terminal .cs-terminal-output')).map(e => e.textContent),
    requirements: Array.from(document.querySelectorAll('ol.cs-requirements > li')).map(e => e.textContent.replace(/\\s+/g, ' ').trim()),
    scenario: Array.from(document.querySelectorAll('.cs-scenario-step')).map(e => e.textContent.replace(/\\s+/g, ' ').trim()),
    story: Array.from(document.querySelectorAll('.cs-story .cs-story-part')).map(e => e.textContent.replace(/\\s+/g, ' ').trim()).join(' '),
    steps: document.querySelectorAll('ol.cs-procedure > li').length,
    quote: document.querySelector('figure.cs-testimonial blockquote')?.textContent.trim(),
    quoteBy: document.querySelector('figure.cs-testimonial figcaption')?.textContent.trim(),
    referenceHref: document.querySelector('.cs-references a')?.getAttribute('href'),
    paramHeaders: Array.from(document.querySelectorAll('.cs-params-table th[scope=col]')).map(e => e.textContent),
    paramRowHeader: document.querySelector('.cs-params-table tbody th[scope=row]')?.textContent,
    codeTokens: document.querySelectorAll('.cs-code code .hljs-keyword').length,
    codeText: document.querySelector('.cs-code code')?.textContent,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  })`;
  out.preview = await evaluate(page, previewFacts);
  // Print: A4 width (desktop layout in print), nothing wider than the page.
  await page.send('Emulation.setEmulatedMedia', {media: 'print'});
  await page.send('Emulation.setDeviceMetricsOverride', {width: 794, height: 1123, deviceScaleFactor: 1, mobile: false});
  out.print = await evaluate(page, `({overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth, tooWide: Array.from(document.querySelectorAll('.cs-code, .cs-terminal, .cs-params-wrap, .cs-requirements, .cs-criteria, .cs-procedure, .cs-story, .cs-testimonial, .cs-references')).filter(el => el.scrollWidth > el.clientWidth + 1).map(el => el.className)})`);
  await page.send('Emulation.setEmulatedMedia', {media: ''});
  // Phone: 375px wide.
  await page.send('Emulation.setDeviceMetricsOverride', {width: 375, height: 812, deviceScaleFactor: 2, mobile: true});
  await navigate(page, `${origin}/studio/documents/${newId}/preview`);
  await waitFor(page, `Boolean(document.querySelector('.cs-article, .cs-prose'))`, {label: 'the preview at phone width', timeout: 60000});
  out.phone = await evaluate(page, `({overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth, paramsAsRows: getComputedStyle(document.querySelector('.cs-params-table thead')).display})`);
  await page.send('Emulation.clearDeviceMetricsOverride');
} catch (error) {
  out.failure = String(error?.stack ?? error);
} finally {
  await chrome.close();
}
console.log(JSON.stringify(out));
