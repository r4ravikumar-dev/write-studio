import {Bricolage_Grotesque, Outfit} from 'next/font/google';

/**
 * The Studio's two typefaces, self-hosted by next/font (downloaded at build
 * time; no request to Google from the browser).
 *   primary   Outfit               everything: headings, body, labels, captions, overlines
 *   secondary Bricolage Grotesque  display text only (hero titles), SemiBold
 */
export const primaryFont = Outfit({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-primary-face',
  display: 'swap',
});

export const displayFont = Bricolage_Grotesque({
  subsets: ['latin'],
  weight: ['600'],
  variable: '--font-display-face',
  display: 'swap',
});
