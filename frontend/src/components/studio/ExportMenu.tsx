'use client';

import {useEffect, useRef, useState} from 'react';
import {useRouter} from 'next/navigation';
import {DropdownMenu} from '@astryxdesign/core/DropdownMenu';
import {Button} from '@astryxdesign/core/Button';
import {IconButton} from '@astryxdesign/core/IconButton';
import {Icon} from '@astryxdesign/core/Icon';
import {Download, FileCode2, FileDown, FileJson, FileText} from 'lucide-react';
import {CONTENT_SCHEMA_VERSION, documentMediaPaths, exportStudyMarkdown, type StudioCaseStudy} from '@studio/shared';

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
export function ExportMenu({
  title,
  previewHref,
  beforeOpen,
  isIconOnly = false,
  study,
}: {
  title: string;
  /** From the editor: export opens the private preview in a new tab and runs there. */
  previewHref?: string;
  /** Runs before the preview opens (the editor saves first). */
  beforeOpen?: () => Promise<unknown>;
  isIconOnly?: boolean;
  study?: StudioCaseStudy;
}) {
  const [isWorking, setIsWorking] = useState(false);
  const [message, setMessage] = useState('');
  const hasAutoRun = useRef(false);
  const router = useRouter();

  const getFileBase = () => {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'document';
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  };

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
      const blob = new Blob([html], {type: 'text/html'});
      downloadBlob(blob, `${getFileBase()}.html`);
      setMessage(skipped ? `HTML file downloaded. ${skipped} file${skipped === 1 ? ' was' : 's were'} too large to include.` : 'HTML file downloaded.');
    } catch {
      setMessage('We couldn’t make the HTML file. Reload the page and try again.');
    } finally {
      setIsWorking(false);
    }
  };

  const exportMarkdown = () => {
    if (!study) return;
    setIsWorking(true);
    setMessage('Preparing Markdown file…');
    try {
      const md = exportStudyMarkdown(study);
      const blob = new Blob([md], {type: 'text/markdown;charset=utf-8'});
      downloadBlob(blob, `${getFileBase()}.md`);
      setMessage('Markdown file downloaded.');
    } catch {
      setMessage('We couldn’t make the Markdown file.');
    } finally {
      setIsWorking(false);
    }
  };

  const exportJson = () => {
    if (!study) return;
    setIsWorking(true);
    setMessage('Preparing JSON backup…');
    try {
      const backup = {
        schema_version: CONTENT_SCHEMA_VERSION,
        exported_at: new Date().toISOString(),
        document: study,
        asset_manifest: documentMediaPaths(study.content),
      };
      const json = JSON.stringify(backup, null, 2);
      const blob = new Blob([json], {type: 'application/json;charset=utf-8'});
      downloadBlob(blob, `${getFileBase()}-backup.json`);
      setMessage('Backup JSON downloaded.');
    } catch {
      setMessage('We couldn’t make the backup file.');
    } finally {
      setIsWorking(false);
    }
  };

  /**
   * From the editor: open the tab straight away (inside the click, so it isn't blocked as a
   * pop-up), save, then point it at the preview with ?export=pdf|html|markdown|json.
   */
  const openPreview = (kind: 'pdf' | 'html' | 'markdown' | 'json') => {
    const tab = window.open('', '_blank');
    void Promise.resolve(beforeOpen?.()).finally(() => {
      const url = `${previewHref}?export=${kind}`;
      if (tab) tab.location.href = url;
      else router.push(url);
    });
  };

  // On the preview page, ?export=pdf|html|markdown|json (from the editor) runs that export once everything has
  // loaded, then removes the parameter so a reload doesn't repeat it.
  useEffect(() => {
    if (previewHref || hasAutoRun.current) return;
    const kind = new URLSearchParams(window.location.search).get('export');
    if (kind !== 'pdf' && kind !== 'html' && kind !== 'markdown' && kind !== 'json') return;
    hasAutoRun.current = true;
    const run = async () => {
      await document.fonts.ready;
      await Promise.all(
        Array.from(document.images, image => (image.complete ? null : new Promise(resolve => image.addEventListener('load', resolve, {once: true})))),
      );
      const url = new URL(window.location.href);
      url.searchParams.delete('export');
      window.history.replaceState(null, '', url);
      if (kind === 'pdf') window.print();
      else if (kind === 'html') await exportHtml();
      else if (kind === 'markdown') exportMarkdown();
      else if (kind === 'json') exportJson();
    };
    void run();
    // exportHtml/exportMarkdown reads only the DOM and study; running once on load is intended.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewHref, study]);

  return (
    <>
      <DropdownMenu
        renderTrigger={props =>
          isIconOnly ? (
            <IconButton {...props} label="Export" tooltip="Export" size="sm" variant="ghost" isLoading={isWorking} icon={<Icon icon={Download} size="sm" color="inherit" />} />
          ) : (
            <Button {...props} label="Export" size="sm" variant="ghost" isLoading={isWorking} icon={<Icon icon={Download} size="sm" color="inherit" />} />
          )
        }
        items={[
          {
            label: 'Save as PDF',
            description: 'Opens the print dialog: choose Save as PDF',
            icon: <Icon icon={FileText} size="sm" color="inherit" />,
            onClick: () => (previewHref ? openPreview('pdf') : window.print()),
          },
          {
            label: 'Download HTML',
            description: 'One file with the pictures included',
            icon: <Icon icon={FileCode2} size="sm" color="inherit" />,
            onClick: () => (previewHref ? openPreview('html') : void exportHtml()),
          },
          {
            label: 'Download Markdown',
            description: 'GitHub-flavoured Markdown document',
            icon: <Icon icon={FileDown} size="sm" color="inherit" />,
            onClick: () => (previewHref ? openPreview('markdown') : exportMarkdown()),
          },
          {
            label: 'Backup (JSON)',
            description: 'Full document data and asset manifest',
            icon: <Icon icon={FileJson} size="sm" color="inherit" />,
            onClick: () => (previewHref ? openPreview('json') : exportJson()),
          },
        ]}
        menuWidth={300}
      />
      <span className="sr-only" aria-live="polite">
        {message}
      </span>
    </>
  );
}
