'use client';

import {IconButton} from '@astryxdesign/core/IconButton';
import {Icon} from '@astryxdesign/core/Icon';
import {ArrowLeft} from 'lucide-react';

/** Icon-only "back" button placed before a page title (client: the icon is a component). */
export function BackButton({href, label}: {href: string; label: string}) {
  return <IconButton label={label} tooltip={label} variant="ghost" size="md" className="back-cta" href={href} icon={<Icon icon={ArrowLeft} size="md" color="inherit" />} />;
}
