'use client';

import {useEffect, useRef} from 'react';
import NextLink from 'next/link';
import {ArrowRight} from 'lucide-react';

/**
 * A glass call-to-action pinned to the bottom of the screen. It appears once the page's
 * own CTA (`watchId`) has scrolled out of view and hides again near the footer, so it
 * never covers the content it repeats. Hidden from assistive tech while hidden.
 */
export function FloatingCta({watchId, label, cta, href}: {watchId: string; label: string; cta: string; href: string}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bar = ref.current;
    const watched = document.getElementById(watchId);
    const footer = document.querySelector('.marketing-footer');
    if (!bar || !watched || !('IntersectionObserver' in window)) return;

    let pastHero = false;
    let nearFooter = false;
    const apply = () => {
      const hidden = !pastHero || nearFooter;
      bar.toggleAttribute('data-hidden', hidden);
      bar.toggleAttribute('inert', hidden);
    };
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.target === watched) pastHero = !entry.isIntersecting && entry.boundingClientRect.top < 0;
        else nearFooter = entry.isIntersecting;
      }
      apply();
    });
    observer.observe(watched);
    if (footer) observer.observe(footer);
    return () => observer.disconnect();
  }, [watchId]);

  return (
    <div ref={ref} className="m-floating-cta m-glass--elevated" data-hidden="" inert>
      <span className="m-floating-cta-label">{label}</span>
      <NextLink href={href} className="m-btn m-btn-primary m-btn-sm">
        <span>{cta}</span>
        <ArrowRight size={16} aria-hidden="true" />
      </NextLink>
    </div>
  );
}
