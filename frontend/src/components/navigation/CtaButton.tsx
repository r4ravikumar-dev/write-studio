'use client';

import {Button} from '@astryxdesign/core/Button';
import {Icon} from '@astryxdesign/core/Icon';
import {ArrowDown, ArrowRight, ArrowUpRight} from 'lucide-react';

const arrows = {
  forward: ArrowRight,
  down: ArrowDown,
  out: ArrowUpRight,
};

type CtaButtonProps = {
  label: string;
  href: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'md' | 'lg';
  /**
   * "forward" (→) moves to another page or section, "down" (↓) points further
   * down the page, and "out" (↗) matches the header's Start a project button.
   */
  direction?: keyof typeof arrows;
  /** Opens another website in a new tab. */
  isExternal?: boolean;
};

/** A call to action with a trailing arrow (→, ↓ or ↗). */
export function CtaButton({
  label,
  href,
  variant = 'primary',
  size = 'lg',
  direction = 'forward',
  isExternal = false,
}: CtaButtonProps) {
  return (
    <Button
      label={label}
      href={href}
      variant={variant}
      size={size}
      target={isExternal ? '_blank' : undefined}
      rel={isExternal ? 'noopener noreferrer' : undefined}
      endContent={<Icon icon={arrows[direction]} size="sm" color="inherit" />}
    />
  );
}
