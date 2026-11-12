'use client';

import {useEffect} from 'react';
import {usePathname} from 'next/navigation';

/**
 * Fades marketing content up as it scrolls into view (motion.css does the animation).
 * Targets section heads and the items of shared grids/splits, so pages need no markup;
 * add data-no-reveal to opt an element out. Only elements that start below the fold are
 * hidden, so nothing flickers and nothing is hidden without JavaScript.
 */
const TARGETS = [
  '.m-section-head',
  '.m-grid-2 > *',
  '.m-grid-3 > *',
  '.m-grid-4 > *',
  '.m-split > *',
  '.m-faq-item',
  '.m-banner-cta',
  '[data-reveal-item]',
].map(selector => `.marketing-main ${selector}:not([data-no-reveal])`);

export function RevealObserver() {
  const pathname = usePathname();

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!('IntersectionObserver' in window)) return;

    const fold = window.innerHeight;
    const elements = Array.from(document.querySelectorAll<HTMLElement>(TARGETS.join(','))).filter(
      el => !el.dataset.reveal && el.getBoundingClientRect().top > fold * 0.9,
    );

    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;
          el.dataset.reveal = 'shown';
          observer.unobserve(el);
          // Once it has arrived, hand transitions back to the element (e.g. card hover).
          const settle = () => {
            if (el.dataset.reveal === 'shown') el.dataset.reveal = 'done';
          };
          el.addEventListener('transitionend', settle, {once: true});
          window.setTimeout(settle, 1500);
        }
      },
      {rootMargin: '0px 0px -8% 0px'},
    );

    for (const el of elements) {
      const siblings = el.parentElement ? Array.from(el.parentElement.children) : [];
      el.style.setProperty('--m-reveal-i', String(Math.max(0, siblings.indexOf(el))));
      el.dataset.reveal = 'pending';
      observer.observe(el);
    }

    return () => {
      observer.disconnect();
      // Leave nothing hidden: unrevealed elements return to their plain state, so a
      // re-run (route change, React strict mode) can pick them up again.
      for (const el of elements) if (el.dataset.reveal === 'pending') delete el.dataset.reveal;
    };
  }, [pathname]);

  return null;
}
