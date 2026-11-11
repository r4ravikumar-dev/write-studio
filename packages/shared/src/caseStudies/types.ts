/** How a case study's opening is laid out. */
export type CaseStudyLayout = 'wide' | 'split' | 'split-reverse';

/** "Checkout: three taps!" → "checkout-three-taps". */
export function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\*/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}
