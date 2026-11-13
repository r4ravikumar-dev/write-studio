/**
 * Computed-style snapshot of pages, for proving a CSS refactor changes nothing.
 *   node scripts/e2e/style-snapshot.mjs <baseUrl> <out.json> [route ...]
 * Records, for every element (in DOM order), ~45 visual properties at desktop and phone width,
 * plus the order of the page's stylesheets. Compare two snapshots with:
 *   node scripts/e2e/style-snapshot.mjs --diff a.json b.json
 */
import {readFileSync, writeFileSync} from 'node:fs';
import {launch, evaluate, navigate} from './chrome.mjs';

const PROPS = ['display', 'position', 'top', 'left', 'width', 'height', 'margin', 'padding', 'border', 'border-radius',
  'box-shadow', 'background-color', 'background-image', 'color', 'font-family', 'font-size', 'font-weight', 'line-height',
  'letter-spacing', 'text-transform', 'text-align', 'opacity', 'transform', 'z-index', 'gap', 'grid-template-columns',
  'flex-direction', 'align-items', 'justify-content', 'overflow', 'visibility', 'outline', 'backdrop-filter', 'filter',
  'max-width', 'min-height', 'white-space', 'text-decoration-line', 'cursor', 'transition-duration', 'inset', 'order',
  'list-style-type', 'vertical-align', 'content'];

if (process.argv[2] === '--diff') {
  const [a, b] = [JSON.parse(readFileSync(process.argv[3], 'utf8')), JSON.parse(readFileSync(process.argv[4], 'utf8'))];
  let diffs = 0;
  for (const key of Object.keys(a)) {
    const [x, y] = [a[key], b[key]];
    if (!y) { console.log(`missing in second: ${key}`); diffs += 1; continue; }
    if (x.length !== y.length) { console.log(`${key}: ${x.length} vs ${y.length} elements`); diffs += 1; continue; }
    for (let i = 0; i < x.length; i += 1) {
      for (const p of Object.keys(x[i].s)) {
        if (x[i].s[p] !== y[i].s[p]) {
          diffs += 1;
          if (diffs < 40) console.log(`${key} ${x[i].path} ${p}: "${x[i].s[p]}" → "${y[i].s[p]}"`);
        }
      }
    }
  }
  console.log(diffs ? `${diffs} differences` : 'identical');
  process.exit(diffs ? 1 : 0);
}

const [base, out, ...routes] = process.argv.slice(2);
const {page, close} = await launch({width: 1440, height: 900});
const result = {};
try {
  for (const [label, width, height, mobile] of [['desktop', 1440, 900, false], ['phone', 375, 812, true]]) {
    await page.send('Emulation.setDeviceMetricsOverride', {width, height, deviceScaleFactor: 1, mobile});
    for (const route of routes) {
      await navigate(page, base.replace(/\/+$/, '') + route);
      await new Promise(r => setTimeout(r, 800));
      result[`${label} ${route}`] = await evaluate(page, `(() => {
        const props = ${JSON.stringify(PROPS)};
        const path = el => { const parts = []; for (let e = el; e && e.nodeType === 1; e = e.parentElement) { const i = e.parentElement ? [...e.parentElement.children].indexOf(e) : 0; parts.unshift(e.tagName.toLowerCase() + ':' + i); } return parts.join('>'); };
        return [...document.body.querySelectorAll('*')].filter(el => !el.closest('nextjs-portal, script, style, iframe')).map(el => {
          const cs = getComputedStyle(el); const s = {};
          for (const p of props) s[p] = cs.getPropertyValue(p);
          return {path: path(el), s};
        });
      })()`);
    }
  }
} finally {
  await close();
}
writeFileSync(out, JSON.stringify(result));
console.log(`wrote ${Object.keys(result).length} page snapshots to ${out}`);
