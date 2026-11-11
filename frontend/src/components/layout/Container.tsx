'use client';

import type {ComponentProps} from 'react';
import {VStack} from '@astryxdesign/core/Layout';

/** Side gutter between the content column and the edge of the screen (fluid, spaceScale.ts). */
export const CONTENT_GUTTER = 'var(--space-gutter)';

/** Widest the site's content gets, gutters included. The header uses it too, so everything lines up. */
export const CONTENT_MAX_WIDTH = `calc(var(--content-max) + 2 * ${CONTENT_GUTTER})`;

const widths = {
  narrow: `calc(760px + 2 * ${CONTENT_GUTTER})`,
  /** Comfortable reading measure for long-form text. */
  reading: `calc(680px + 2 * ${CONTENT_GUTTER})`,
  default: CONTENT_MAX_WIDTH,
} as const;

type ContainerProps = ComponentProps<typeof VStack> & {
  size?: keyof typeof widths;
};

/**
 * Caps and centres page content. Below the cap, content fills the screen
 * minus the fluid gutters, so it grows with the screen from mobile to wide.
 */
export function Container({size = 'default', style, ...props}: ContainerProps) {
  return (
    <VStack
      width="100%"
      style={{
        maxInlineSize: widths[size],
        marginInline: 'auto',
        // The gutter puts the content edge on the frame lines; the frame
        // padding (16px desktop, 6px phones) keeps content off the lines.
        paddingInline: `calc(${CONTENT_GUTTER} + var(--frame-padding))`,
        boxSizing: 'border-box',
        ...style,
      }}
      {...props}
    />
  );
}
