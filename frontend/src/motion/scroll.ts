'use client';

import {useRef} from 'react';
import {
  EASE,
  gsap,
  ScrollTrigger,
  SplitText,
  prefersReducedMotion,
  useGSAP,
  whenUncovered,
} from './gsap';

/**
 * Scroll effects, as hooks: each returns a ref to put on the element it
 * animates. All of them are GSAP ScrollTriggers, cleaned up with the
 * component (useGSAP), and all do nothing with reduced motion, leaving the
 * element as it is.
 */

type TextRevealOptions = {
  /** Seconds before the first line rises. */
  delay?: number;
  /** Seconds between one line and the next. */
  stagger?: number;
  /** When it plays: the element's top crossing this point of the screen. */
  start?: string;
};

/**
 * Masked line reveal: the text splits into its lines and each rises out of
 * its own mask, one after another, the first time it scrolls into view.
 * For display headlines (ChapterHeader, BigStatement, EditorialHero).
 *
 * The lines re-split when the text reflows (resize, fonts), without playing
 * again. Screen readers read the original text (SplitText labels the
 * element and hides the pieces). Until it is split, the element is hidden
 * by `[data-text-reveal]` in globals.css so it doesn't flash.
 */
export function useTextReveal<T extends HTMLElement = HTMLHeadingElement>({
  delay = 0,
  stagger = 0.09,
  start = 'top 88%',
}: TextRevealOptions = {}) {
  const ref = useRef<T>(null);

  useGSAP(
    (_, contextSafe) => {
      const element = ref.current;
      if (!element) return;
      const markSplit = () => element.setAttribute('data-split', 'true');
      if (prefersReducedMotion()) {
        markSplit();
        return;
      }

      let hasPlayed = false;
      let isCancelled = false;
      // Split once the fonts are in, so the lines match what the reader sees,
      // and once no loader covers the page, so a headline already on screen
      // rises where the visitor can see it.
      const split = contextSafe!(() => {
        if (isCancelled) return;
        SplitText.create(element, {
          type: 'lines',
          mask: 'lines',
          linesClass: 'text-reveal-line',
          autoSplit: true,
          onSplit(self) {
            markSplit();
            if (hasPlayed) return;
            return gsap.from(self.lines, {
              yPercent: 110,
              duration: 1.2,
              ease: EASE.arrive,
              stagger,
              delay,
              onStart: () => {
                hasPlayed = true;
              },
              scrollTrigger: {trigger: element, start, once: true},
            });
          },
        });
      });
      Promise.resolve(document.fonts?.ready).then(whenUncovered).then(split);

      return () => {
        isCancelled = true;
      };
    },
    {scope: ref},
  );

  return ref;
}

/**
 * Parallax: the element drifts against the scroll, from `amount`% of its own
 * height above its place to `amount`% below, while it crosses the screen.
 * Subtle values (6–12) read as depth; larger ones as motion.
 */
export function useParallax<T extends HTMLElement = HTMLDivElement>(amount = 8) {
  const ref = useRef<T>(null);

  useGSAP(
    () => {
      const element = ref.current;
      if (!element || prefersReducedMotion()) return;
      gsap.fromTo(
        element,
        {yPercent: -amount},
        {
          yPercent: amount,
          ease: 'none',
          scrollTrigger: {trigger: element, start: 'top bottom', end: 'bottom top', scrub: true},
        },
      );
    },
    {scope: ref},
  );

  return ref;
}

/**
 * Picture reveal for a frame holding one image: the frame wipes open from
 * the bottom while the image settles from a slight zoom, then the image keeps
 * drifting inside the frame (parallax) as the page scrolls. The frame needs
 * overflow: hidden; the image is kept scaled up so the drift never shows an
 * edge.
 */
export function useMediaReveal<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);

  useGSAP(
    () => {
      const frame = ref.current;
      if (!frame || prefersReducedMotion()) return;
      const media = frame.querySelector('img, svg, video');

      const reveal = gsap
        .timeline({scrollTrigger: {trigger: frame, start: 'top 85%', once: true}})
        .fromTo(
          frame,
          {clipPath: 'inset(100% 0% 0% 0%)'},
          {clipPath: 'inset(0% 0% 0% 0%)', duration: 1.4, ease: EASE.wipe},
        );

      if (media) {
        // Held at 1.15 afterwards: enough overscan for the ±6% drift below.
        reveal.fromTo(media, {scale: 1.4}, {scale: 1.15, duration: 1.8, ease: EASE.arrive}, 0);
        gsap.fromTo(
          media,
          {yPercent: -6},
          {
            yPercent: 6,
            ease: 'none',
            scrollTrigger: {trigger: frame, start: 'top bottom', end: 'bottom top', scrub: true},
          },
        );
      }
    },
    {scope: ref},
  );

  return ref;
}

/**
 * Rise into place, scrubbed: the element climbs from `distance`% below and
 * fades up as it enters, tied to the scroll (not played once). For sign-offs
 * like the footer wordmark, where the end of the page should feel like it
 * is arriving.
 */
export function useScrubRise<T extends HTMLElement = HTMLDivElement>(distance = 40) {
  const ref = useRef<T>(null);

  useGSAP(
    () => {
      const element = ref.current;
      if (!element || prefersReducedMotion()) return;
      gsap.fromTo(
        element,
        {yPercent: distance, opacity: 0.2},
        {
          yPercent: 0,
          opacity: 1,
          ease: 'none',
          scrollTrigger: {trigger: element, start: 'top bottom', end: 'bottom bottom', scrub: 0.6},
        },
      );
    },
    {scope: ref},
  );

  return ref;
}

/**
 * Skews the element with the scroll's speed, then lets it settle back
 * upright: fast flicks lean it further (up to `max` degrees). For lines that
 * already move sideways, like the Marquee, so speed reads as momentum.
 */
export function useVelocitySkew<T extends HTMLElement = HTMLDivElement>(max = 6) {
  const ref = useRef<T>(null);

  useGSAP(
    () => {
      const element = ref.current;
      if (!element || prefersReducedMotion()) return;
      const proxy = {skew: 0};
      const setSkew = gsap.quickSetter(element, 'skewX', 'deg');
      const clamp = gsap.utils.clamp(-max, max);

      ScrollTrigger.create({
        trigger: element,
        start: 'top bottom',
        end: 'bottom top',
        onUpdate: self => {
          const skew = clamp(self.getVelocity() / -400);
          if (Math.abs(skew) <= Math.abs(proxy.skew)) return;
          proxy.skew = skew;
          gsap.to(proxy, {
            skew: 0,
            duration: 0.8,
            ease: 'power3',
            overwrite: true,
            onUpdate: () => setSkew(proxy.skew),
          });
        },
      });
    },
    {scope: ref},
  );

  return ref;
}
