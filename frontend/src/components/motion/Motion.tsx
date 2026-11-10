'use client';

import {motion} from 'framer-motion';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {Card} from '@astryxdesign/core/Card';
import {ClickableCard} from '@astryxdesign/core/ClickableCard';

/**
 * Astryx layout primitives that Framer Motion can animate. Astryx components
 * forward `ref` and `style`, so motion.create() drives them directly without
 * extra wrapper elements.
 */
export const MotionVStack = motion.create(VStack);
export const MotionHStack = motion.create(HStack);
export const MotionCard = motion.create(Card);
export const MotionClickableCard = motion.create(ClickableCard);
