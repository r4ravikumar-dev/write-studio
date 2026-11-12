'use client';

import {useEffect, useRef, useState} from 'react';
import {Text} from '@astryxdesign/core/Text';

/**
 * Cloudflare Turnstile inside a form. The widget writes its single-use token to a
 * hidden `cf-turnstile-response` field, which the server action checks
 * (lib/auth/turnstile.ts). Most people never see a puzzle: it only asks for a
 * click when Cloudflare isn't sure ("interaction-only").
 *
 * Renders nothing when `siteKey` is empty (the check is off).
 * Change `resetKey` after each submission: a token can't be used twice.
 */
type TurnstileApi = {
  render: (element: HTMLElement, options: Record<string, unknown>) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
let loading: Promise<TurnstileApi> | null = null;

function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  loading ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error('turnstile missing')));
    script.onerror = () => {
      loading = null;
      script.remove();
      reject(new Error('turnstile failed to load'));
    };
    document.head.appendChild(script);
  });
  return loading;
}

export function Turnstile({siteKey, resetKey, action}: {siteKey: string; resetKey?: unknown; action?: string}) {
  const box = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  const [problem, setProblem] = useState('');

  useEffect(() => {
    if (!siteKey || !box.current) return;
    let cancelled = false;
    loadTurnstile()
      .then(api => {
        if (cancelled || !box.current) return;
        widget.current = api.render(box.current, {
          sitekey: siteKey,
          action,
          theme: 'light',
          size: 'flexible',
          appearance: 'interaction-only',
          'error-callback': () => {
            setProblem('The security check couldn’t run. Reload the page, or turn off any blocker for this site.');
            return true;
          },
          callback: () => setProblem(''),
        });
      })
      .catch(() => {
        if (!cancelled) setProblem('The security check couldn’t load. Reload the page, or turn off any blocker for this site.');
      });
    return () => {
      cancelled = true;
      if (widget.current) window.turnstile?.remove(widget.current);
      widget.current = null;
    };
  }, [siteKey, action]);

  useEffect(() => {
    if (resetKey !== undefined && widget.current) window.turnstile?.reset(widget.current);
  }, [resetKey]);

  if (!siteKey) return null;
  return (
    <div className="studio-turnstile">
      <div ref={box} />
      {problem && (
        <Text type="supporting" color="secondary">
          {problem}
        </Text>
      )}
    </div>
  );
}
