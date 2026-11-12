/**
 * Marketing site final QA (Phase 6). Run against a production build (`next start`):
 *   node scripts/e2e/marketing-qa.mjs [baseUrl]      (default http://localhost:3100)
 * 1. Crawl every internal link reachable from / (marketing pages), plus sitemap URLs:
 *    status 200, no console errors or uncaught exceptions, title + description + canonical +
 *    one h1, no "lorem"/"TODO"/"coming soon" text, no links to private /studio/files or media.
 * 2. Every internal href found on those pages resolves (200, or a redirect to an allowed place).
 * 3. Layout at 1024 and 768 (tablet): no horizontal overflow, sticky story pinned only ≥1024.
 * 4. Sign-up / sign-in hand-off: every "Use this template" link carries the template to the
 *    Studio's new-document page via the form's hidden `next`; signed-out /studio redirects to sign-in.
 * 5. Client-side navigation: header links work without reloads, the menu closes, reveal runs
 *    on the new page, no errors.
 * Nothing is submitted and no account is created.
 */
import {launch, evaluate, navigate} from './chrome.mjs';

const BASE = (process.argv[2] ?? 'http://localhost:3100').replace(/\/+$/, '');
const problems = [];
const fail = (where, what) => problems.push(`${where}: ${what}`);

const {page, close} = await launch({width: 1440, height: 900});
const consoleErrors = [];
page.on('Runtime.exceptionThrown', e => consoleErrors.push(e.exceptionDetails?.exception?.description ?? e.exceptionDetails?.text));
page.on('Runtime.consoleAPICalled', e => { if (e.type === 'error') consoleErrors.push(e.args.map(a => a.value ?? a.description).join(' ')); });
// Vercel Analytics' script only exists on Vercel; locally it 404s, which isn't a site defect.
page.on('Log.entryAdded', e => { if (e.entry.level === 'error' && !/favicon|\/_vercel\/insights\//.test(e.entry.url ?? '')) consoleErrors.push(`${e.entry.text} ${e.entry.url ?? ''}`); });
await page.send('Log.enable');

try {
  // ── 1 + 2. Crawl ────────────────────────────────────────────────────────────
  const sitemap = await (await fetch(`${BASE}/sitemap.xml`)).text();
  const fromSitemap = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => new URL(m[1]).pathname);
  const queue = ['/', ...fromSitemap];
  const seen = new Set();
  const hrefs = new Set();
  let pages = 0;
  while (queue.length) {
    const route = queue.shift();
    if (seen.has(route)) continue;
    seen.add(route);
    if (/^\/(studio|login|signup|forgot-password)\b/.test(route)) continue; // app pages: checked in step 4
    consoleErrors.length = 0;
    await navigate(page, BASE + route);
    await new Promise(r => setTimeout(r, 300));
    pages += 1;
    const info = await evaluate(page, `(() => ({
      title: document.title,
      description: document.querySelector('meta[name=description]')?.content ?? '',
      canonical: document.querySelector('link[rel=canonical]')?.href ?? '',
      h1: document.querySelectorAll('h1').length,
      text: document.body.innerText,
      links: [...document.querySelectorAll('a[href]')].map(a => a.getAttribute('href')),
      notFound: /could not be found|404/.test(document.title),
    }))()`);
    if (info.notFound) fail(route, 'renders a not-found page');
    if (!info.title) fail(route, 'no title');
    if (info.description.length < 50) fail(route, `meta description missing/short (${info.description.length})`);
    if (!info.canonical) fail(route, 'no canonical link');
    if (info.h1 !== 1) fail(route, `${info.h1} h1 elements`);
    const placeholder = /lorem ipsum|\bTODO\b|coming soon|placeholder text/i.exec(info.text);
    if (placeholder) fail(route, `placeholder text "${placeholder[0]}"`);
    for (const href of info.links) {
      if (/\/studio\/files|\/api\/app\/media|supabase\.co/.test(href)) fail(route, `links to private media: ${href}`);
      if (!href.startsWith('/')) continue;
      hrefs.add(href);
      const path = href.split(/[?#]/)[0];
      if (!seen.has(path)) queue.push(path);
    }
    if (consoleErrors.length) fail(route, `console errors: ${[...new Set(consoleErrors)].join(' | ').slice(0, 300)}`);
  }
  for (const href of hrefs) {
    const response = await fetch(BASE + href, {redirect: 'manual'});
    const ok = response.status === 200 || (response.status >= 300 && response.status < 400 && /\/studio\/login/.test(response.headers.get('location') ?? ''));
    if (!ok) fail('link', `${href} → ${response.status} ${response.headers.get('location') ?? ''}`);
    const hash = href.split('#')[1];
    if (hash && response.status === 200) {
      const html = await response.text();
      if (!html.includes(`id="${hash}"`)) fail('link', `${href}: anchor #${hash} not on the page`);
    }
  }
  console.log(`crawled ${pages} pages, checked ${hrefs.size} distinct internal links`);

  // ── 3. Tablet layouts ───────────────────────────────────────────────────────
  for (const width of [1024, 768]) {
    await page.send('Emulation.setDeviceMetricsOverride', {width, height: 1000, deviceScaleFactor: 1, mobile: false});
    for (const route of ['/', '/product', '/how-it-works', '/templates', '/templates/sop', '/use-cases/operations', '/resources', '/privacy', '/contact', '/faq']) {
      await navigate(page, BASE + route);
      await new Promise(r => setTimeout(r, 300));
      const r = await evaluate(page, `({sw: document.documentElement.scrollWidth, w: innerWidth,
        stage: document.querySelector('.m-story-stage') ? getComputedStyle(document.querySelector('.m-story-stage')).display : null,
        navLinks: getComputedStyle(document.querySelector('.marketing-nav-links')).display,
        toggle: getComputedStyle(document.querySelector('.marketing-mobile-toggle')).display})`);
      if (r.sw > r.w + 1) fail(`${width}px ${route}`, `horizontal overflow (${r.sw}px)`);
      if (r.stage && (width >= 1024) !== (r.stage !== 'none')) fail(`${width}px ${route}`, `sticky stage display ${r.stage}`);
      if ((width >= 1024) !== (r.navLinks !== 'none') || (width >= 1024) === (r.toggle !== 'none')) fail(`${width}px ${route}`, `nav: links ${r.navLinks}, menu button ${r.toggle}`);
    }
  }
  console.log('checked tablet layouts at 1024 and 768');

  // ── 4. Auth hand-off ────────────────────────────────────────────────────────
  await page.send('Emulation.setDeviceMetricsOverride', {width: 1440, height: 900, deviceScaleFactor: 1, mobile: false});
  const ids = {
    'developer-documentation': 'developer-docs', 'feature-specification': 'feature-spec', 'release-notes': 'release-notes',
    'marketing-case-study': 'marketing-case-study', 'ux-case-study': 'product-ux', 'product-requirements': 'prd',
    'technical-design': 'technical-design', adr: 'adr', sop: 'sop',
  };
  for (const [slug, id] of Object.entries(ids)) {
    const html = await (await fetch(`${BASE}/templates/${slug}`)).text();
    if (!html.includes(`href="/signup?template=${slug}"`)) fail(`/templates/${slug}`, 'no "Use this template" sign-up link');
    for (const entry of ['signup', 'login']) {
      await navigate(page, `${BASE}/${entry}?template=${slug}`);
      const next = await evaluate(page, `[...document.querySelectorAll('input[name=next]')].map(i => i.value)`);
      const expected = `/studio/documents/new?template=${id}`;
      if (!next.length || next.some(v => v !== expected)) fail(`/${entry}?template=${slug}`, `next = ${JSON.stringify(next)}, expected ${expected}`);
    }
  }
  for (const [path, expect] of [['/studio', '/studio/login'], ['/studio/documents', '/studio/login'], ['/studio/files/x/y.png', null]]) {
    const r = await fetch(BASE + path, {redirect: 'manual'});
    if (expect && !(r.status >= 300 && r.status < 400 && (r.headers.get('location') ?? '').includes(expect))) fail(path, `signed out: ${r.status} ${r.headers.get('location')}`);
    if (!expect && r.status !== 404) fail(path, `signed-out file request should 404, got ${r.status}`);
  }
  const unsafe = '/login?next=' + encodeURIComponent('https://evil.example/');
  await navigate(page, BASE + unsafe);
  const unsafeNext = await evaluate(page, `[...document.querySelectorAll('input[name=next]')].map(i => i.value)`);
  if (unsafeNext.some(v => !v.startsWith('/studio'))) fail(unsafe, `unsafe next kept: ${unsafeNext}`);
  console.log('checked sign-up/sign-in hand-off for 9 templates and signed-out redirects');

  // ── 5. Client-side navigation ───────────────────────────────────────────────
  consoleErrors.length = 0;
  await navigate(page, BASE + '/');
  await evaluate(page, `window.__noReload = true; true`);
  for (const label of ['Templates', 'How it works', 'Product', 'Resources', 'Use cases']) {
    await evaluate(page, `[...document.querySelectorAll('.marketing-nav-link')].find(a => a.textContent === ${JSON.stringify(label)}).click(); new Promise(r => setTimeout(r, 1200))`);
    const r = await evaluate(page, `({kept: window.__noReload === true, current: document.querySelector('.marketing-nav-link[aria-current=page]')?.textContent,
      pendingAbove: [...document.querySelectorAll('[data-reveal=pending]')].filter(e => e.getBoundingClientRect().bottom < innerHeight * 0.8).length,
      h1: document.querySelectorAll('h1').length})`);
    if (!r.kept) fail(`client nav → ${label}`, 'full page reload');
    if (r.current !== label) fail(`client nav → ${label}`, `active nav item is ${r.current}`);
    if (r.pendingAbove) fail(`client nav → ${label}`, `${r.pendingAbove} visible elements stuck hidden`);
    if (r.h1 !== 1) fail(`client nav → ${label}`, `${r.h1} h1`);
  }
  // Phone menu: open, navigate, menu closed on the new page.
  await page.send('Emulation.setDeviceMetricsOverride', {width: 375, height: 812, deviceScaleFactor: 1, mobile: true});
  await navigate(page, BASE + '/');
  await evaluate(page, `document.querySelector('.marketing-mobile-toggle').click(); new Promise(r => setTimeout(r, 300))`);
  await evaluate(page, `document.querySelector('#marketing-mobile-menu a[href="/templates"]').click(); new Promise(r => setTimeout(r, 1200))`);
  const menu = await evaluate(page, `({open: !!document.querySelector('#marketing-mobile-menu'), path: location.pathname, expanded: document.querySelector('.marketing-mobile-toggle').getAttribute('aria-expanded')})`);
  if (menu.open || menu.path !== '/templates' || menu.expanded !== 'false') fail('phone menu', JSON.stringify(menu));
  if (consoleErrors.length) fail('client navigation', `console errors: ${[...new Set(consoleErrors)].join(' | ').slice(0, 300)}`);
  console.log('checked client-side navigation and the phone menu');
} finally {
  await close();
}

if (problems.length) {
  console.log(`\n${problems.length} problems:\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
console.log('\nAll QA checks passed');
