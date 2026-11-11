import type {Metadata} from 'next';
import './globals.css';
import {displayFont, primaryFont} from './fonts';

/** The app's root layout. The product is the Case Study Studio at /studio. */
export const metadata: Metadata = {
  title: {default: 'Case Study Studio', template: '%s · Case Study Studio'},
  description: 'A private workspace for writing design case studies.',
  robots: {index: false, follow: false},
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" data-astryx-theme="stone" className={`${primaryFont.variable} ${displayFont.variable}`}>
      <body>
        {children}
        
      </body>
    </html>
  );
}
