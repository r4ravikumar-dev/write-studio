'use client';

import type {ComponentProps} from 'react';
import {MotionVStack} from './Motion';
import {expressive} from '@/motion/springs';

type RevealProps = ComponentProps<typeof MotionVStack> & {
  /** Seconds to wait before the spring starts. */
  delay?: number;
  /** Distance travelled on entry, in pixels. */
  distance?: number;
  speed?: 'fast' | 'default' | 'slow';
};

/**
 * Springs content into place the first time it scrolls into view.
 * Reduced-motion users get an instant state change (see MotionConfig in Providers).
 */
export function Reveal({
  delay = 0,
  distance = 24,
  speed = 'default',
  children,
  ...props
}: RevealProps) {
  return (
    <MotionVStack
      initial={{opacity: 0, y: distance}}
      whileInView={{opacity: 1, y: 0}}
      viewport={{once: true, margin: '0px 0px -10% 0px'}}
      transition={expressive(speed, delay)}
      {...props}>
      {children}
    </MotionVStack>
  );
}
