import type {Metadata} from 'next';
import '../studio.css';

/**
 * The Case Study Studio: anyone can register; everything inside a
 * workspace is private to the account that owns it. Never indexed.
 */
export const metadata: Metadata = {
  title: {default: 'Case Study Studio', template: '%s · Case Study Studio'},
  robots: {index: false, follow: false, nocache: true},
};

export default function StudioLayout({children}: {children: React.ReactNode}) {
  return children;
}
