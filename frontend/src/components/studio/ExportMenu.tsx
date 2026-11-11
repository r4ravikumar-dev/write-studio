'use client';

import {useState} from 'react';
import {DropdownMenu} from '@astryxdesign/core/DropdownMenu';
import {Button} from '@astryxdesign/core/Button';
import {Icon} from '@astryxdesign/core/Icon';
import {Download, FileCode2, FileText} from 'lucide-react';

/** Files bigger than this aren't embedded in the HTML export (it would be unwieldy to open). */
const MAX_EMBED_BYTES = 20 * 1024 * 1024;

const toDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

/** Fetches a same-origin file (the owner's own session) as a data URL, or null if too big or missing. */
async function embed(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {credentials: 'same-origin'});
    if (!response.ok) return null;
    const blob = await response.blob();
    return blob.size > MAX_EMBED_BYTES ? null : toDataUrl(blob);
  } catch {
    return null;
  }
}

/** The page's own stylesheets as text, with fonts and other same-origin files inlined. */
async function collectCss(): Promise<string> {
  let css = '';
  for (const sheet of Array.from(document.styleSheets)) {
    let text = '';
    try {
      text = Array.from(sheet.cssRules, rule => rule.cssText).join('\n');
    } catch {
      continue; // A stylesheet from another origin: not readable, and not needed for the case study.
    }
    // url(...) inside a stylesheet is relative to that stylesheet (fonts are "../media/x.woff2"):
    // make every same-origin one absolute so it can be fetched and inlined below.
    const base = sheet.href ?? location.href;
    text = text.replace(/url\((['"]?)([^'")]+)\1\)/g, (match, quote: string, url: string) => {
      if (/^(data:|https?:|#)/.test(url) && !url.startsWith(location.origin)) return match;
      const absolute = new URL(url, base);
      return absolute.origin === location.origin ? `url("${absolute.pathname}${absolute.search}")` : match;
    });
    css += text + '\n';
  }
  const urls = new Set(Array.from(css.matchAll(/url\("(\/[^"]+)"\)/g), match => match[1]));
  for (const url of urls) {
    const data = await embed(url);
    css = css.split(`url("${url}")`).join(data ? `url("${data}")` : 'none');
  }
  return css;
}

/** Keeps the comparison slider working in the exported file (the app's React code isn't there). */
const SLIDER_SCRIPT = `document.querySelectorAll('.vb-slider').forEach(function(s){var i=s.querySelector('input[type=range]');if(i)i.addEventListener('input',function(){s.style.setProperty('--vb-reveal',i.value+'%')})})`;

/**
 * Export (Stage 5), owner-only by construction: it runs in the owner's browser on their private
 * preview and reads files through their own session. Nothing is uploaded or made public.
 *  - PDF: the browser's print dialog, with a print stylesheet (A4, no app chrome, no split blocks).
 *  - HTML: one self-contained file (styles, fonts and pictures embedded) that opens anywhere.
 */
export function ExportMenu({title}: {title: string}) {
  const [isWorking, setIsWorking] = useState(false);
  const [message, setMessage] = useState('');

  const exportHtml = async () => {
    const page = document.querySelector<HTMLElement>('.preview-page');
    if (!page) return;
    setIsWorking(true);
    setMessage('Preparing the HTML file…');
    try {
      const clone = page.cloneNode(true) as HTMLElement;
      let skipped = 0;
      for (const element of Array.from(clone.querySelectorAll<HTMLImageElement | HTMLVideoElement | HTMLSourceElement>('img[src], video[src], source[src]'))) {
        const source = element.getAttribute('src') ?? '';
        if (!source.startsWith('/')) continue;
        const data = await embed(source);
        if (data) element.setAttribute('src', data);
        else {
          skipped += 1;
          element.removeAttribute('src');
        }
        element.removeAttribute('srcset');
        element.removeAttribute('loading');
      }
      for (const link of Array.from(clone.querySelectorAll<HTMLAnchorElement>('a[href^="/studio/files/"]'))) {
        const data = await embed(link.getAttribute('href')!);
        if (data) link.setAttribute('href', data);
        else link.removeAttribute('href');
      }
      const css = await collectCss();
      const root = document.documentElement;
      const html = `<!doctype html>
<html lang="${root.lang || 'en'}" class="${root.className}" data-astryx-theme="${root.dataset.astryxTheme ?? 'stone'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title.replace(/[<&]/g, ch => (ch === '<' ? '&lt;' : '&amp;'))}</title>
<style>${css.replace(/<\/style/gi, '<\\/style')}</style>
</head>
<body class="${document.body.className}">
<div class="preview">${clone.outerHTML}</div>
<script>${SLIDER_SCRIPT}</script>
</body>
</html>`;
      const url = URL.createObjectURL(new Blob([html], {type: 'text/html'}));
      const link = document.createElement('a');
      link.href = url;
      link.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'case-study'}.html`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      setMessage(skipped ? `HTML file downloaded. ${skipped} file${skipped === 1 ? ' was' : 's were'} too large to include.` : 'HTML file downloaded.');
    } catch {
      setMessage('We couldn’t make the HTML file. Reload the page and try again.');
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <>
      <DropdownMenu
        renderTrigger={props => <Button {...props} label="Export" size="sm" variant="ghost" isLoading={isWorking} icon={<Icon icon={Download} size="sm" color="inherit" />} />}
        items={[
          {
            label: 'Save as PDF',
            description: 'Opens the print dialog: choose Save as PDF',
            icon: <Icon icon={FileText} size="sm" color="inherit" />,
            onClick: () => window.print(),
          },
          {
            label: 'Download HTML',
            description: 'One file with the pictures included',
            icon: <Icon icon={FileCode2} size="sm" color="inherit" />,
            onClick: () => void exportHtml(),
          },
        ]}
        menuWidth={280}
      />
      <span className="sr-only" aria-live="polite">
        {message}
      </span>
    </>
  );
}
