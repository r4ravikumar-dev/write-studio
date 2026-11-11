/**
 * A very small Chrome DevTools Protocol client for the end-to-end tests: no dependency, just the
 * installed Chrome and Node's built-in WebSocket (Node 22+). Launches a throwaway headless Chrome
 * with its own profile, which is deleted afterwards.
 */
import {spawn} from 'node:child_process';
import {mkdtempSync, rmSync, existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const CANDIDATES = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean);

export async function launch({width = 1280, height = 900} = {}) {
  const binary = CANDIDATES.find(path => existsSync(path));
  if (!binary) throw new Error('Chrome not found. Set CHROME_PATH.');
  const profile = mkdtempSync(join(tmpdir(), 'studio-e2e-'));
  const chrome = spawn(binary, [
    '--headless=new',
    '--remote-debugging-port=0',
    `--user-data-dir=${profile}`,
    `--window-size=${width},${height}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    '--autoplay-policy=no-user-gesture-required',
    'about:blank',
  ]);
  const wsUrl = await new Promise((resolve, reject) => {
    let text = '';
    const timer = setTimeout(() => reject(new Error('Chrome did not start')), 20000);
    chrome.stderr.on('data', chunk => {
      text += chunk;
      const match = /DevTools listening on (ws:\/\/\S+)/.exec(text);
      if (match) {
        clearTimeout(timer);
        resolve(match[1]);
      }
    });
  });
  const port = new URL(wsUrl).port;
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const pageTarget = targets.find(target => target.type === 'page');
  const browser = await connect(wsUrl);
  const page = await connect(pageTarget.webSocketDebuggerUrl);
  await page.send('Page.enable');
  await page.send('Runtime.enable');
  await page.send('Network.enable');
  return {
    browser,
    page,
    profile,
    async close() {
      try {
        await browser.send('Browser.close');
      } catch {
        chrome.kill('SIGKILL');
      }
      await new Promise(resolve => setTimeout(resolve, 300));
      rmSync(profile, {recursive: true, force: true});
    },
  };
}

function connect(url) {
  const socket = new WebSocket(url);
  let id = 0;
  const pending = new Map();
  const listeners = new Map();
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const {resolve, reject} = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(`${message.error.message} ${message.error.data ?? ''}`));
      else resolve(message.result);
    } else if (message.method) {
      for (const listener of listeners.get(message.method) ?? []) listener(message.params);
    }
  });
  const open = new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, {once: true});
    socket.addEventListener('error', reject, {once: true});
  });
  const client = {
    async send(method, params = {}) {
      await open;
      id += 1;
      const current = id;
      socket.send(JSON.stringify({id: current, method, params}));
      return new Promise((resolve, reject) => pending.set(current, {resolve, reject}));
    },
    on(method, listener) {
      listeners.set(method, [...(listeners.get(method) ?? []), listener]);
    },
    once(method, timeout = 30000) {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`Timed out waiting for ${method}`)), timeout);
        client.on(method, params => {
          clearTimeout(timer);
          resolve(params);
        });
      });
    },
  };
  return open.then(() => client);
}

/** Runs an expression in the page (awaiting promises) and returns its JSON value. */
export async function evaluate(page, expression) {
  const result = await page.send('Runtime.evaluate', {expression, awaitPromise: true, returnByValue: true});
  if (result.exceptionDetails) throw new Error(`In the page: ${result.exceptionDetails.exception?.description ?? result.exceptionDetails.text}`);
  return result.result.value;
}

/** Waits until an expression in the page is truthy. */
export async function waitFor(page, expression, {timeout = 30000, interval = 200, label = expression} = {}) {
  const start = Date.now();
  for (;;) {
    try {
      const value = await evaluate(page, expression);
      if (value) return value;
    } catch {
      // The page may be navigating; try again.
    }
    if (Date.now() - start > timeout) throw new Error(`Timed out waiting for: ${label}`);
    await new Promise(resolve => setTimeout(resolve, interval));
  }
}

export async function navigate(page, url) {
  const loaded = page.once('Page.loadEventFired', 60000);
  await page.send('Page.navigate', {url});
  await loaded;
}
