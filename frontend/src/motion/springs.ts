import type {Transition} from 'framer-motion';

/**
 * Material Design 3 Expressive motion scheme, expressed as Framer Motion springs.
 *
 * M3 specifies springs by damping ratio (ζ) and stiffness (k). Framer Motion
 * takes a damping coefficient, so with mass = 1: damping = 2 · ζ · √k.
 *
 * - Spatial springs move things (position, size, rotation). Expressive spatial
 *   springs are underdamped, so they overshoot slightly and settle.
 * - Effects springs change appearance (opacity, colour). They are critically
 *   damped, so they never bounce.
 *
 * Reference: https://m3.material.io/styles/motion/overview/how-it-works
 */

function m3Spring(dampingRatio: number, stiffness: number): Transition {
  return {
    type: 'spring',
    stiffness,
    damping: 2 * dampingRatio * Math.sqrt(stiffness),
    mass: 1,
  };
}

export const springs = {
  spatial: {
    fast: m3Spring(0.6, 800),
    default: m3Spring(0.8, 380),
    slow: m3Spring(0.8, 200),
  },
  effects: {
    fast: m3Spring(1, 3800),
    default: m3Spring(1, 1600),
    slow: m3Spring(1, 800),
  },
} as const;

/** Spatial spring for movement, paired with an effects spring for opacity. */
export function expressive(speed: 'fast' | 'default' | 'slow' = 'default', delay = 0): Transition {
  return {
    ...springs.spatial[speed],
    delay,
    opacity: {...springs.effects[speed], delay},
  };
}
