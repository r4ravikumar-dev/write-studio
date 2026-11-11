'use client';

import {useEffect, useRef} from 'react';

/** Grid spacing and dot size, in CSS pixels (the site's dot grid). */
const STEP = 24;
const DOT = 1.1;
/** The grid drifts one step diagonally every 8 seconds (seamless). */
const DRIFT_MS = 8000;

/** Ripples: how fast the ring travels, how wide it is, how long it lives. */
const RIPPLE_SPEED = 0.42; // px per ms
const RIPPLE_WIDTH = 46;
const RIPPLE_LIFE = 1300; // ms
const RIPPLE_PUSH = 11; // px a dot is pushed at the crest
/** A new ripple at most every so often, and only once the pointer has moved this far. */
const RIPPLE_GAP_MS = 110;
const RIPPLE_GAP_PX = 36;
/** Dots near the pointer lift a little. */
const HOVER_RADIUS = 90;

type Ripple = {x: number; y: number; born: number};

/** Hero mode: below this share of the height the mask has faded the dots out. */
const HERO_FADE_END = 0.7;
/** Hero mode: how far the wave lifts a dot (px) and swings its hue (degrees). */
const WAVE_LIFT = 3.5;
const WAVE_HUE = 70;

/** [r, g, b] (0 to 255) as [hue, saturation, lightness] (0 to 360, 0 to 100, 0 to 100). */
function toHsl([r, g, b]: [number, number, number]): [number, number, number] {
  const [rn, gn, bn] = [r / 255, g / 255, b / 255];
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const light = (max + min) / 2;
  if (max === min) return [0, 0, light * 100];
  const delta = max - min;
  const sat = light > 0.5 ? delta / (2 - max - min) : delta / (max + min);
  const hue =
    max === rn ? (gn - bn) / delta + (gn < bn ? 6 : 0) : max === gn ? (bn - rn) / delta + 2 : (rn - gn) / delta + 4;
  return [hue * 60, sat * 100, light * 100];
}

/**
 * The wave field behind the hero, like a slow shader: a few sine waves
 * crossing each other and drifting over time. Returns -1 to 1.
 */
function wave(x: number, y: number, t: number) {
  return (
    (Math.sin(x * 0.011 + t * 0.0011) * Math.cos(y * 0.017 - t * 0.0008) +
      0.6 * Math.sin((x + y) * 0.007 - t * 0.0014) +
      0.4 * Math.sin(Math.hypot(x - 300, y + 200) * 0.012 - t * 0.0019)) /
    2
  );
}

/** A CSS colour (any syntax the browser knows) as [r, g, b]. */
function toRgb(color: string, probe: HTMLElement): [number, number, number] {
  probe.style.color = color;
  const match = getComputedStyle(probe).color.match(/[\d.]+/g) ?? ['128', '128', '128'];
  return [Number(match[0]), Number(match[1]), Number(match[2])];
}

/**
 * The site's dot grid, drawn on a canvas so each dot can react: it drifts
 * slowly, fades towards the edges, and as the pointer moves over it ripples
 * spread from the pointer, pushing the dots outward as the ring passes; the
 * dots swell and tint brand blue at the crest. Dots near the pointer lift a
 * little. Used behind the first-visit welcome and the hero's design story,
 * and (variant "hero") behind the Work, About and Contact heroes.
 *
 * It fills its parent (give the parent position: relative). It only draws
 * while on screen, and ripples only start while the pointer is over it.
 * With reduced motion it is a still grid and the pointer does nothing.
 * Decorative.
 */
export function RippleGrid({
  className,
  variant = 'vignette',
}: {
  className?: string;
  /**
   * "vignette": faded towards every edge (welcome, design story, Contact
   * sign-off). "hero": behind an inner page's hero, 40% at the top fading to
   * nothing by about 70% down, with a slow colour-shifting wave running
   * through it.
   */
  variant?: 'vignette' | 'hero';
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Theme colours, read once when it mounts.
    const probe = document.createElement('span');
    probe.style.display = 'none';
    canvas.parentElement?.appendChild(probe);
    const styles = getComputedStyle(canvas);
    const ink = toRgb(styles.getPropertyValue('--color-text-secondary').trim(), probe);
    const brand = toRgb(styles.getPropertyValue('--color-brand-text').trim(), probe);
    probe.remove();
    const isHero = variant === 'hero';
    const [brandHue, brandSat, brandLight] = toHsl(brand);

    let width = 0;
    let height = 0;
    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    resize();
    const sizeObserver = new ResizeObserver(resize);
    sizeObserver.observe(canvas);

    const ripples: Ripple[] = [];
    const pointer = {x: -1e4, y: -1e4};
    let lastRipple = {x: -1e4, y: -1e4, at: 0};

    const onLeave = () => {
      pointer.x = -1e4;
      pointer.y = -1e4;
    };
    const onMove = (event: PointerEvent) => {
      const box = canvas.getBoundingClientRect();
      pointer.x = event.clientX - box.left;
      pointer.y = event.clientY - box.top;
      // Only over the grid itself.
      if (pointer.x < 0 || pointer.y < 0 || pointer.x > box.width || pointer.y > box.height) {
        onLeave();
        return;
      }
      const now = performance.now();
      const moved = Math.hypot(pointer.x - lastRipple.x, pointer.y - lastRipple.y);
      if (now - lastRipple.at > RIPPLE_GAP_MS && moved > RIPPLE_GAP_PX) {
        ripples.push({x: pointer.x, y: pointer.y, born: now});
        lastRipple = {x: pointer.x, y: pointer.y, at: now};
      }
    };
    if (!reduceMotion) {
      window.addEventListener('pointermove', onMove, {passive: true});
      window.addEventListener('pointerleave', onLeave);
    }

    let frame = 0;
    const draw = (now: number) => {
      context.clearRect(0, 0, width, height);
      // Drop ripples that have faded out.
      while (ripples.length && now - ripples[0].born > RIPPLE_LIFE) ripples.shift();

      const drift = reduceMotion ? 0 : ((now % DRIFT_MS) / DRIFT_MS) * STEP;
      const cx = width / 2;
      const cy = height / 2;
      const rx = width * 0.62;
      const ry = height * 0.62;

      for (let gy = -STEP + drift; gy < height + STEP; gy += STEP) {
        for (let gx = -STEP + drift; gx < width + STEP; gx += STEP) {
          // Hero: strongest at the top, gone by about 70% down. Otherwise
          // faded towards every edge (an ellipse, like a vignette).
          // (The hero's fade is a mask on the canvas, .ripple-grid-hero, so
          // here it only skips the dots the mask hides anyway.)
          const fade = isHero
            ? gy > height * HERO_FADE_END
              ? 0
              : 1
            : Math.max(0, Math.min(1, (1.15 - Math.hypot((gx - cx) / rx, (gy - cy) / ry)) / 0.6));
          if (fade <= 0) continue;

          let x = gx;
          let y = gy;
          let lift = 0;
          // Hero: the wave lifts each dot a little and sets how bright it is.
          const swell = isHero && !reduceMotion ? wave(gx, gy, now) : 0;
          y -= swell * WAVE_LIFT;
          for (const ripple of ripples) {
            const age = now - ripple.born;
            const dx = gx - ripple.x;
            const dy = gy - ripple.y;
            const distance = Math.hypot(dx, dy) || 1;
            const band = Math.abs(distance - age * RIPPLE_SPEED);
            if (band > RIPPLE_WIDTH) continue;
            const strength =
              Math.cos((band / RIPPLE_WIDTH) * (Math.PI / 2)) * (1 - age / RIPPLE_LIFE);
            x += (dx / distance) * RIPPLE_PUSH * strength;
            y += (dy / distance) * RIPPLE_PUSH * strength;
            lift = Math.max(lift, strength);
          }
          const near = Math.hypot(gx - pointer.x, gy - pointer.y);
          if (near < HOVER_RADIUS) lift = Math.max(lift, (1 - near / HOVER_RADIUS) * 0.55);

          if (isHero) {
            // Brand blue, its hue swinging with the wave (towards violet on
            // one side, cyan on the other), brighter on the crests. Ripples
            // brighten it further.
            const crest = (swell + 1) / 2;
            context.globalAlpha = Math.min(1, 0.6 + 0.4 * crest + lift);
            context.fillStyle = `hsl(${brandHue + swell * WAVE_HUE} ${brandSat}% ${brandLight + lift * 8}%)`;
            context.beginPath();
            context.arc(x, y, DOT * (1.1 + crest * 0.6) + lift * 2.2, 0, Math.PI * 2);
            context.fill();
            continue;
          }
          const [r, g, b] = lift
            ? ink.map((value, i) => Math.round(value + (brand[i] - value) * lift))
            : ink;
          context.globalAlpha = fade * (0.42 + 0.58 * lift);
          context.fillStyle = `rgb(${r} ${g} ${b})`;
          context.beginPath();
          context.arc(x, y, DOT + lift * 2.2, 0, Math.PI * 2);
          context.fill();
        }
      }
      if (!reduceMotion && isVisible) frame = requestAnimationFrame(draw);
    };
    // Draw only while on screen.
    let isVisible = false;
    const visibility = new IntersectionObserver(([entry]) => {
      const wasVisible = isVisible;
      isVisible = entry.isIntersecting;
      if (isVisible && !wasVisible) frame = requestAnimationFrame(draw);
    });
    visibility.observe(canvas);

    return () => {
      cancelAnimationFrame(frame);
      sizeObserver.disconnect();
      visibility.disconnect();
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerleave', onLeave);
    };
  }, [variant]);

  return (
    <canvas
      ref={ref}
      className={['ripple-grid', variant === 'hero' && 'ripple-grid-hero', className].filter(Boolean).join(' ')}
      aria-hidden
    />
  );
}
