import NextLink from 'next/link';
import {PenTool} from 'lucide-react';

/** The Write Studio logo link, shared by the header and footer. */
export function BrandMark() {
  return (
    <NextLink href="/" className="marketing-brand">
      <span className="marketing-brand-icon" aria-hidden="true">
        <PenTool size={16} />
      </span>
      <span>Write Studio</span>
    </NextLink>
  );
}
