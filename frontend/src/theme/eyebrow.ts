/**
 * The eyebrow above headings: typography spec "overline/lg" (primary face,
 * 600, UPPERCASE, 12px, +6% tracking, LH 1.2), in text/brand/primary.
 */
export const EYEBROW_STYLE = {
  fontFamily: 'var(--font-primary)',
  fontWeight: 600,
  fontSize: 'var(--overline-lg-size)',
  lineHeight: 'var(--overline-leading)',
  textTransform: 'uppercase',
  letterSpacing: 'var(--overline-lg-tracking)',
  color: 'var(--text-brand-primary)',
} as const;
