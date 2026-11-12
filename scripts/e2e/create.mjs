/**
 * The template library and the Create Document flow in a real (headless) Chrome, driven by
 * supabase/tests/test_studio_templates_live.py (multi-vertical Phase 2, plan A01-A03).
 *
 *   node scripts/e2e/create.mjs <input.json>     {origin, access, refresh, outDir}
 *
 * Browses the library (categories, search, a no-match search, a template's preview), follows
 * "Use this template" into Create Document, checks the required title, that Back keeps what was
 * typed, skips the optional cover, reviews the outline and creates the document. Saves a
 * screenshot of the library and of the outline step. Prints one JSON object for Python.
 */
import {readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {launch, evaluate, waitFor, navigate} from './chrome.mjs';

const input = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const {origin, access, refresh, outDir} = input;
const out = {errors: []};
const chrome = await launch();
const {page} = chrome;
page.on('Runtime.exceptionThrown', event => out.errors.push(event.exceptionDetails?.exception?.description ?? event.exceptionDetails?.text));
page.on('Runtime.consoleAPICalled', event => {
  if (event.type === 'error') out.errors.push(event.args.map(a => a.value ?? a.description ?? '').join(' ').slice(0, 300));
});

const shot = async name => {
  const {data} = await page.send('Page.captureScreenshot', {format: 'png'});
  writeFileSync(join(outDir, name), Buffer.from(data, 'base64'));
};
/** Clicks the first button or link whose visible text is exactly `text`. */
const click = text =>
  evaluate(page, `(() => {
    const el = Array.from(document.querySelectorAll('button, a')).find(node => node.textContent.trim() === ${JSON.stringify(text)} && !node.disabled);
    if (!el) return false;
    el.click();
    return true;
  })()`);
/** Replaces what is in a field with real text input (React sees it as typing). */
const type = async (selector, text) => {
  await evaluate(page, `(() => { const el = document.querySelector(${JSON.stringify(selector)}); el.focus(); el.select(); })()`);
  if (text) await page.send('Input.insertText', {text});
  else for (const kind of ['keyDown', 'keyUp']) await page.send('Input.dispatchKeyEvent', {type: kind, key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8});
};
const cards = `Array.from(document.querySelectorAll('.template-groups .setup-choice .setup-choice-label')).map(el => el.firstChild.textContent.trim())`;
const heading = `document.querySelector('.setup-heading')?.textContent.trim()`;

try {
  for (const [name, value] of [['studio_access', access], ['studio_refresh', refresh]]) {
    await page.send('Network.setCookie', {name, value, url: `${origin}/studio`, path: '/studio', httpOnly: true, sameSite: 'Lax'});
  }

  // ---- 1. The template library ----------------------------------------------------------------
  await navigate(page, `${origin}/studio/templates`);
  await waitFor(page, `document.querySelectorAll('.template-groups .setup-choice').length > 0`, {label: 'the template library', timeout: 60000});
  out.library = await evaluate(page, `({
    title: document.title,
    categories: Array.from(document.querySelectorAll('.template-cat')).map(el => el.textContent.trim()),
    groups: Array.from(document.querySelectorAll('.template-group h3')).map(el => el.textContent.trim()),
    cards: ${cards},
    comingLater: Array.from(document.querySelectorAll('.template-planned li > span:first-child')).map(el => el.textContent.trim()),
    preview: document.querySelector('.template-preview')?.textContent.trim().slice(0, 80),
  })`);

  await type('.template-search input', 'research');
  await waitFor(page, `${cards}.length === 1`, {label: 'the search to narrow the list', timeout: 10000}).catch(() => null);
  out.searchResearch = await evaluate(page, cards);
  await type('.template-search input', 'findings');
  out.searchBySection = await evaluate(page, cards);
  await type('.template-search input', 'zzzz');
  out.searchNothing = await evaluate(page, `({cards: ${cards}, message: Array.from(document.querySelectorAll('.template-gallery-list p, .template-gallery-list span')).map(el => el.textContent).find(text => text.startsWith('No template matches')) ?? ''})`);
  await type('.template-search input', '');

  // A category chip narrows the list to that category (a native radio: click its label).
  await evaluate(page, `Array.from(document.querySelectorAll('.template-cat')).find(el => el.textContent.trim() === 'Operations & Knowledge').click()`);
  out.categoryOperations = await evaluate(page, `({groups: Array.from(document.querySelectorAll('.template-group h3')).map(el => el.textContent.trim()), cards: ${cards}})`);
  await evaluate(page, `Array.from(document.querySelectorAll('.template-cat')).find(el => el.textContent.trim() === 'All').click()`);

  // Choosing a template shows what it is before it is used.
  await evaluate(page, `Array.from(document.querySelectorAll('.template-groups .setup-choice')).find(el => el.textContent.includes('Feature development')).click()`);
  await waitFor(page, `document.querySelector('.template-preview h3')?.textContent.trim() === 'Feature development'`, {label: 'the template preview', timeout: 10000});
  out.preview = await evaluate(page, `({
    name: document.querySelector('.template-preview h3').textContent.trim(),
    facts: Object.fromEntries(Array.from(document.querySelectorAll('.template-preview .template-facts > div')).map(el => [el.querySelector('dt').textContent.trim(), el.querySelector('dd').textContent.trim()])),
    sections: Array.from(document.querySelectorAll('.template-preview .setup-preview-title')).map(el => el.firstChild.textContent.trim()),
    useHref: Array.from(document.querySelectorAll('.template-preview a')).find(el => el.textContent.trim() === 'Use this template')?.getAttribute('href') ?? '',
  })`);
  await shot('library.png');

  // ---- 2. Create Document ---------------------------------------------------------------------
  await navigate(page, `${origin}${out.preview.useHref}`);
  await waitFor(page, `${heading} === 'What are you creating?'`, {label: 'Create Document', timeout: 60000});
  out.preselected = await evaluate(page, `document.querySelector('.template-groups input[type=radio]:checked')?.value`);
  out.steps = await evaluate(page, `Array.from(document.querySelectorAll('.setup-steps .setup-step')).map(el => el.textContent.replace(/\\(done\\)/, '').replace(/^\\d+/, '').trim())`);

  await click('Continue');
  await waitFor(page, `${heading} === 'Tell us about the case study'`, {label: 'the details step', timeout: 10000});
  out.detailFields = await evaluate(page, `Array.from(document.querySelectorAll('.setup-panel label')).map(el => el.textContent.replace(/\\s*[·∙•].*$/, '').trim()).filter(Boolean)`);
  // The title is the only required answer.
  await click('Continue');
  out.titleRequired = await evaluate(page, `({stillOnDetails: ${heading} === 'Tell us about the case study', error: document.body.textContent.includes('Enter a working title')})`);
  await type('.setup-panel input', 'Saved searches');
  // Back and forward keep what was typed.
  await click('Back');
  await waitFor(page, `${heading} === 'What are you creating?'`, {label: 'back to the template step', timeout: 10000});
  out.templateKept = await evaluate(page, `document.querySelector('.template-groups input[type=radio]:checked')?.value`);
  await click('Continue');
  await waitFor(page, `${heading} === 'Tell us about the case study'`, {label: 'the details step again', timeout: 10000});
  out.titleKept = await evaluate(page, `document.querySelector('.setup-panel input').value`);

  await click('Continue');
  await waitFor(page, `${heading} === 'Add a cover picture'`, {label: 'the cover step', timeout: 10000});
  out.coverSkippable = await click('Skip this step');
  await waitFor(page, `${heading} === 'Review your outline'`, {label: 'the outline step', timeout: 10000});
  out.outline = await evaluate(page, `Array.from(document.querySelectorAll('.setup-outline-row input')).map(el => el.value)`);
  await shot('outline.png');
  out.createLabel = await evaluate(page, `Array.from(document.querySelectorAll('.setup-actions button')).map(el => el.textContent.trim())`);
  await click('Create case study');
  out.editorUrl = await waitFor(page, `/\\/studio\\/documents\\/[0-9a-f-]{36}\\/edit$/.test(location.pathname) && Boolean(document.querySelector('.ProseMirror')?.editor) ? location.pathname : ''`, {label: 'the editor to open', timeout: 90000});
  out.editorTitle = await evaluate(page, 'document.title');
  out.editorHeadings = await evaluate(page, `(() => { const d = document.querySelector('.ProseMirror').editor.state.doc; const keys = []; d.forEach(n => { if (n.type.name === 'heading') keys.push(n.attrs.section); }); return keys; })()`);
} catch (error) {
  out.failure = String(error?.stack ?? error);
} finally {
  await chrome.close();
}
console.log(JSON.stringify(out));
