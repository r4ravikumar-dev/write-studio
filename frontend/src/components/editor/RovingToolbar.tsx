'use client';

import {useRef, type ComponentProps} from 'react';
import {HStack} from '@astryxdesign/core/Layout';
import {useRovingFocus} from './rovingFocus';

/** An `HStack` with `role="toolbar"` and the ARIA toolbar keyboard pattern (one tab stop, arrows). */
export function RovingToolbar({label, ...props}: Omit<ComponentProps<typeof HStack>, 'role' | 'ref'> & {label: string}) {
  const ref = useRef<HTMLDivElement | null>(null);
  useRovingFocus(ref);
  return <HStack {...props} ref={ref} role="toolbar" aria-label={label} />;
}
