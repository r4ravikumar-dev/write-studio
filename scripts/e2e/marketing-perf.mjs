/**
 * Marketing site load performance (Phase 5). Run against a production build (`next start`):
 *   node scripts/e2e/marketing-perf.mjs [baseUrl]      (default http://localhost:3100)
 * Phone profile: 375×812, 4× CPU slowdown, "fast 3G"-like network (1.6 Mbps down, 150 ms RTT).
 * Reports LCP, CLS (after scrolling the whole page, so reveals and sticky sections count),
 * total blocking time (long tasks over 50 ms) and the number of active backdrop filters.
 * Budgets: LCP ≤ 2.5 s, CLS ≤ 0.1, TBT ≤ 300 ms. Exit 1 if any page misses one.
 */
import {launch, evaluate, navigate} from './chrome.mjs';

const BASE = (process.argv[2] ?? 'http://localhost:3100').replace(/\/+$/, '');
const ROUTES = ['/', '/product', '/how-it-works', '/templates', '/templates/sop', '/use-cases/operations', '/resources', '/privacy', '/contact'];

const OBSERVE = `(() => {
  window.__perf = {lcp: 0, cls: 0, tbt: 0};
  new PerformanceObserver(l => { for (const e of l.getEntries()) __perf.lcp = e.startTime; }).observe({type: 'largest-contentful-paint', buffered: true});
  new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) __perf.cls += e.value; }).observe({type: 'layout-shift', buffered: true});
  new PerformanceObserver(l => { for (const e of l.getEntries()) __perf.tbt += Math.max(0, e.duration - 50); }).observe({type: 'longtask', buffered: true});
})()`;

const {page, close} = await launch({width: 375, height: 812});
let misses = 0;
try {
  await page.send('Emulation.setDeviceMetricsOverride', {width: 375, height: 812, deviceScaleFactor: 2, mobile: true});
  await page.send('Emulation.setCPUThrottlingRate', {rate: 4});
  await page.send('Network.emulateNetworkConditions', {offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8});
  await page.send('Network.setCacheDisabled', {cacheDisabled: true});
  await page.send('Page.addScriptToEvaluateOnNewDocument', {source: OBSERVE});
  console.log('route                       LCP     CLS    TBT   glass');
  for (const route of ROUTES) {
    await navigate(page, BASE + route);
    await new Promise(r => setTimeout(r, 1500));
    // Scroll through the page like a reader, so reveal/sticky/floating behaviour is measured.
    await evaluate(page, `(async () => {
      const step = innerHeight * 0.8;
      for (let y = 0; y < document.documentElement.scrollHeight; y += step) { scrollTo(0, y); await new Promise(r => setTimeout(r, 120)); }
      await new Promise(r => setTimeout(r, 800));
    })()`);
    const m = await evaluate(page, `({...__perf, glass: [...document.querySelectorAll('*')].filter(e => { const s = getComputedStyle(e); return (s.backdropFilter && s.backdropFilter !== 'none') && e.getClientRects().length && s.visibility !== 'hidden' && s.opacity !== '0'; }).length})`);
    const ok = m.lcp <= 2500 && m.cls <= 0.1 && m.tbt <= 300;
    if (!ok) misses += 1;
    console.log(`${ok ? '✓' : '✗'} ${route.padEnd(26)} ${(m.lcp / 1000).toFixed(2)}s  ${m.cls.toFixed(3)}  ${String(Math.round(m.tbt)).padStart(4)}ms  ${m.glass}`);
  }
} finally {
  await close();
}
process.exit(misses ? 1 : 0);
