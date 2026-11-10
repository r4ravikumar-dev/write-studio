'use client';

import {gsap} from 'gsap';
import {ScrollTrigger} from 'gsap/ScrollTrigger';
import {SplitText} from 'gsap/SplitText';
import {useGSAP} from '@gsap/react';

/**
 * GSAP, registered once for the whole site. Import gsap and its plugins from
 * here, never from 'gsap' directly, so the plugins are always registered.
 *
 * The split of work between the two motion libraries:
 * - Framer Motion: springs, things that react to state (Reveal, hover,
 *   presence, the pinned rails' scroll-linked springs).
 * - GSAP: scroll choreography (ScrollTrigger scrubs, masked line reveals with
 *   SplitText, parallax, clip wipes) and the ticker that drives Lenis smooth
 *   scrolling (components/motion/SmoothScroll).
 */
gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP);

/**
 * Eases matched to the Material 3 Expressive feel of springs.ts: a long,
 * soft deceleration for things arriving, and a balanced in-out for wipes.
 */
export const EASE = {
  arrive: 'expo.out',
  wipe: 'expo.inOut',
} as const;

/** True when the visitor has asked for reduced motion. Scroll effects then do nothing. */
export function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Attributes the full-screen overlays put on <html> while they cover the page:
 * the first-visit Splash and the PageTransition loader.
 */
export const COVER_ATTRIBUTES = ['data-splash', 'data-page-transition'] as const;

/** Marks the page as covered (or uncovered) by one of the overlays. */
export function setCovered(attribute: (typeof COVER_ATTRIBUTES)[number], isCovered: boolean) {
  document.documentElement.toggleAttribute(attribute, isCovered);
}

/**
 * Resolves once no overlay covers the page, so a reveal that is already on
 * screen plays where the visitor can see it, not underneath the loader.
 */
export function whenUncovered(): Promise<void> {
  const html = document.documentElement;
  const isCovered = () => COVER_ATTRIBUTES.some(attribute => html.hasAttribute(attribute));
  if (!isCovered()) return Promise.resolve();
  return new Promise(resolve => {
    const observer = new MutationObserver(() => {
      if (isCovered()) return;
      observer.disconnect();
      resolve();
    });
    observer.observe(html, {attributes: true, attributeFilter: [...COVER_ATTRIBUTES]});
  });
}

export {gsap, ScrollTrigger, SplitText, useGSAP};
