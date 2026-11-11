'use client';

import type {ComponentProps} from 'react';
import {VStack} from '@astryxdesign/core/Layout';
import {useParallax} from '@/motion/scroll';

type ParallaxProps = ComponentProps<typeof VStack> & {
  /** Drift, in percent of the element's own height, either side of its place. */
  amount?: number;
};

/**
 * Wraps content (usually an illustration) so it drifts against the scroll,
 * for depth. Put it inside a Reveal, not around one: Reveal's spring and the
 * drift both move the element, so each needs its own.
 */
export function Parallax({amount = 8, ...props}: ParallaxProps) {
  const ref = useParallax<HTMLDivElement>(amount);
  return <VStack ref={ref} {...props} />;
}
