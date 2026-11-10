import type {CSSProperties} from 'react';

/**
 * Inline type styles for components that pick a size by role (the preview's
 * hero and article headings). Sizes and line heights come from the Studio
 * typography tokens (src/theme/typography.css), which switch between the web
 * and mobile scales by themselves.
 */
export type TypeRole =
  | 'hero-title'
  | 'display-xxl'
  | 'display-xl'
  | 'display-l'
  | 'display-m'
  | 'display-s'
  | 'section-title'
  | 'headline-xl'
  | 'headline-l'
  | 'headline-m'
  | 'headline-s'
  | 'body-l'
  | 'body-m'
  | 'body-s'
  | 'label-l'
  | 'label-m'
  | 'caption-m';

const display = (size: string): CSSProperties => ({
  fontFamily: 'var(--font-display)',
  fontWeight: 600,
  fontSize: `var(--display-${size}-size)`,
  lineHeight: 'var(--display-leading)',
  letterSpacing: 'var(--display-tracking)',
});
const heading = (size: string): CSSProperties => ({
  fontFamily: 'var(--font-primary)',
  fontWeight: 600,
  fontSize: `var(--heading-${size}-size)`,
  lineHeight: 'var(--heading-leading)',
  letterSpacing: 'var(--heading-tracking)',
});

const ROLES: Record<TypeRole, CSSProperties> = {
  'hero-title': display('xl'),
  'display-xxl': display('xl'),
  'display-xl': display('xl'),
  'display-l': display('lg'),
  'display-m': display('md'),
  'display-s': display('sm'),
  'section-title': {...heading('xxl'), letterSpacing: 'var(--heading-xxl-tracking)'},
  'headline-xl': {...heading('xxl'), letterSpacing: 'var(--heading-xxl-tracking)'},
  'headline-l': heading('xl'),
  'headline-m': heading('lg'),
  'headline-s': heading('md'),
  'body-l': {fontSize: 'var(--body-xxl-size)', lineHeight: 'var(--body-xxl-leading)'},
  'body-m': {fontSize: 'var(--body-xl-size)', lineHeight: 'var(--body-leading)'},
  'body-s': {fontSize: 'var(--body-lg-size)', lineHeight: 'var(--body-leading)'},
  'label-l': {fontSize: 'var(--label-xl-size)', lineHeight: 'var(--label-leading-tight)', fontWeight: 500, letterSpacing: 'var(--label-tracking)'},
  'label-m': {fontSize: 'var(--label-md-size)', lineHeight: 'var(--label-leading)', fontWeight: 500, letterSpacing: 'var(--label-tracking)'},
  'caption-m': {fontSize: 'var(--caption-md-size)', lineHeight: 'var(--caption-leading)'},
};

/** The style for a role (font, size, line height, tracking where the spec sets it). */
export function typeRole(role: TypeRole): CSSProperties {
  return ROLES[role] ?? ROLES['body-m'];
}
