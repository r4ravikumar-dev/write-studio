/**
 * Marketing site accessibility + motion audit (Phase 5).
 *   node scripts/e2e/marketing-a11y.mjs [baseUrl]      (default http://localhost:3000)
 * For every public route, at desktop (1440) and phone (375) widths:
 *   - axe-core (installed locally) with WCAG 2.0/2.1/2.2 A + AA rules
 *   - structure: one h1, no heading-level skips, main landmark, unique title, no horizontal overflow
 * Then, with prefers-reduced-motion emulated: nothing hidden for reveal, no movement transforms.
 * Exit code 1 if any check fails. Nothing is written anywhere.
 */
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {launch, evaluate, navigate} from './chrome.mjs';

const BASE = (process.argv[2] ?? 'http://localhost:3000').replace(/\/+$/, '');
const require = createRequire(import.meta.url);
const AXE = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

const ROUTES = [
  '/', '/product', '/how-it-works', '/templates', '/use-cases', '/resources', '/security', '/about', '/faq',
  '/contact', '/pricing', '/privacy', '/terms', '/cookies', '/accessibility',
  '/templates/developer-documentation', '/templates/feature-specification', '/templates/release-notes',
  '/templates/marketing-case-study', '/templates/ux-case-study', '/templates/product-requirements',
  '/templates/technical-design', '/templates/adr', '/templates/sop',
  '/use-cases/product-engineering', '/use-cases/marketing-growth', '/use-cases/design-research', '/use-cases/operations',
];

const STRUCTURE = `(() => {
  const problems = [];
  const hs = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].filter(h => h.getClientRects().length || h.classList.contains('sr-only'));
  const h1s = hs.filter(h => h.tagName === 'H1');
  if (h1s.length !== 1) problems.push('h1 count ' + h1s.length);
  let last = 0;
  for (const h of hs) {
    const level = +h.tagName[1];
    if (last && level > last + 1) problems.push('heading skip h' + last + '→h' + level + ' "' + h.textContent.trim().slice(0, 40) + '"');
    last = level;
  }
  if (document.querySelectorAll('main').length !== 1) problems.push('main count ' + document.querySelectorAll('main').length);
  if (document.documentElement.scrollWidth > innerWidth + 1) problems.push('horizontal overflow ' + document.documentElement.scrollWidth);
  if (/Write Studio.*Write Studio.*Write Studio/.test(document.title)) problems.push('title repeats brand: ' + document.title);
  return {title: document.title, problems};
})()`;

async function settle(page) {
  // Reveal everything so axe sees final colours, then let transitions finish.
  await evaluate(page, `document.querySelectorAll('[data-reveal]').forEach(e => e.dataset.reveal = 'done'); new Promise(r => setTimeout(r, 400))`);
}

async function runAxe(page) {
  await evaluate(page, `window.axe || (0, eval)(${JSON.stringify(AXE)}); true`);
  return evaluate(page, `axe.run(document, {runOnly: {type: 'tag', values: ['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']}, resultTypes: ['violations']})
    .then(r => r.violations.map(v => ({id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.slice(0, 3).map(n => n.target.join(' ') + (n.any[0]?.message ? ' — ' + n.any[0].message : ''))})))`);
}

const {page, close} = await launch({width: 1440, height: 900});
let failures = 0;
const titles = new Map();
try {
  for (const [label, width, height, mobile] of [['desktop', 1440, 900, false], ['phone', 375, 812, true]]) {
    await page.send('Emulation.setDeviceMetricsOverride', {width, height, deviceScaleFactor: 1, mobile});
    for (const route of ROUTES) {
      await navigate(page, BASE + route);
      await new Promise(r => setTimeout(r, 300));
      await settle(page);
      const structure = await evaluate(page, STRUCTURE);
      const violations = await runAxe(page);
      if (label === 'desktop') {
        if (titles.has(structure.title)) structure.problems.push('duplicate title with ' + titles.get(structure.title));
        titles.set(structure.title, route);
      }
      if (structure.problems.length || violations.length) {
        failures += 1;
        console.log(`✗ ${label} ${route}`);
        for (const p of structure.problems) console.log('    structure: ' + p);
        for (const v of violations) console.log(`    axe ${v.impact} ${v.id}: ${v.help}\n      ${v.nodes.join('\n      ')}`);
      } else {
        console.log(`✓ ${label} ${route}`);
      }
    }
  }

  // Keyboard: Tab through the first 60 stops. Every stop must be visible, show a focus
  // indicator, and not sit inside an inert/hidden panel. The first stop is the skip link.
  await page.send('Emulation.setDeviceMetricsOverride', {width: 1440, height: 900, deviceScaleFactor: 1, mobile: false});
  for (const route of ['/', '/how-it-works', '/templates', '/templates/sop', '/faq', '/contact']) {
    await navigate(page, BASE + route);
    await new Promise(r => setTimeout(r, 400));
    const problems = [];
    for (let i = 0; i < 60; i += 1) {
      await page.send('Input.dispatchKeyEvent', {type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9});
      await page.send('Input.dispatchKeyEvent', {type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9});
      const stop = await evaluate(page, `(() => {
        const el = document.activeElement;
        // End of the page (or the Next.js dev overlay, which only exists in development).
        if (!el || el === document.body || el.tagName === 'NEXTJS-PORTAL') return null;
        const cs = getComputedStyle(el);
        const ring = (parseFloat(cs.outlineWidth) > 0 && cs.outlineStyle !== 'none') || cs.boxShadow !== 'none'
          || !!el.closest('.m-card')?.matches(':has(.m-card-stretch:focus-visible)');
        const box = el.getBoundingClientRect();
        return {name: (el.getAttribute('aria-label') || el.textContent || el.id || el.tagName).trim().slice(0, 40),
          ring, visible: box.width > 0 && box.height > 0 && cs.visibility !== 'hidden',
          hidden: !!el.closest('[inert],[aria-hidden="true"],[data-hidden]')};
      })()`);
      if (!stop) break;
      if (i === 0 && !/skip/i.test(stop.name)) problems.push('first stop is not the skip link: ' + stop.name);
      if (!stop.ring) problems.push('no focus indicator: ' + stop.name);
      if (!stop.visible) problems.push('focus on invisible element: ' + stop.name);
      if (stop.hidden) problems.push('focus inside hidden panel: ' + stop.name);
    }
    if (problems.length) {
      failures += 1;
      console.log(`✗ keyboard ${route}\n    ${[...new Set(problems)].join('\n    ')}`);
    } else console.log(`✓ keyboard ${route}`);
  }

  // Reduced motion: content visible, nothing moves.
  await page.send('Emulation.setDeviceMetricsOverride', {width: 1440, height: 900, deviceScaleFactor: 1, mobile: false});
  await page.send('Emulation.setEmulatedMedia', {features: [{name: 'prefers-reduced-motion', value: 'reduce'}]});
  for (const route of ['/', '/how-it-works', '/templates/sop']) {
    await navigate(page, BASE + route);
    await new Promise(r => setTimeout(r, 600));
    const result = await evaluate(page, `(() => {
      const problems = [];
      const pending = document.querySelectorAll('[data-reveal="pending"]').length;
      if (pending) problems.push(pending + ' elements hidden for reveal');
      for (const el of document.querySelectorAll('.m-story-panel, .m-hero-showcase-wrap, .m-float-toolbar')) {
        const cs = getComputedStyle(el);
        if (cs.transform !== 'none' && cs.transform !== 'matrix(1, 0, 0, 1, 0, 0)') problems.push(el.className + ' transform ' + cs.transform);
        if (cs.animationName !== 'none') problems.push(el.className + ' animation ' + cs.animationName);
      }
      return problems;
    })()`);
    if (result.length) {
      failures += 1;
      console.log(`✗ reduced-motion ${route}\n    ${result.join('\n    ')}`);
    } else console.log(`✓ reduced-motion ${route}`);
  }
} finally {
  await close();
}
console.log(failures ? `\n${failures} failing checks` : '\nAll marketing accessibility checks passed');
process.exit(failures ? 1 : 0);
