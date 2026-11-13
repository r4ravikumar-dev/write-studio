import NextLink from 'next/link';
import {BrandMark} from './BrandMark';

const COLUMNS = [
  {
    heading: 'Product',
    links: [
      {label: 'Overview', href: '/product'},
      {label: 'How it works', href: '/how-it-works'},
      {label: 'Templates', href: '/templates'},
      {label: 'Security & Privacy', href: '/security'},
      {label: 'Pricing', href: '/pricing'},
    ],
  },
  {
    heading: 'Templates',
    links: [
      {label: 'Developer documentation', href: '/templates/developer-documentation'},
      {label: 'Feature specification', href: '/templates/feature-specification'},
      {label: 'Release notes', href: '/templates/release-notes'},
      {label: 'Marketing case study', href: '/templates/marketing-case-study'},
      {label: 'UX case study', href: '/templates/ux-case-study'},
      {label: 'Product requirements', href: '/templates/product-requirements'},
      {label: 'Technical design', href: '/templates/technical-design'},
      {label: 'Architecture decision record', href: '/templates/adr'},
      {label: 'SOP & playbooks', href: '/templates/sop'},
    ],
  },
  {
    heading: 'Resources',
    links: [
      {label: 'Guides', href: '/resources'},
      {label: 'Examples', href: '/resources#examples'},
      {label: 'Writing tips', href: '/resources#insights'},
      {label: 'FAQ', href: '/faq'},
    ],
  },
  {
    heading: 'Company',
    links: [
      {label: 'About', href: '/about'},
      {label: 'Contact', href: '/contact'},
      {label: 'Sign in', href: '/login'},
      {label: 'Create account', href: '/signup'},
    ],
  },
];

const LEGAL = [
  {label: 'Privacy', href: '/privacy'},
  {label: 'Terms', href: '/terms'},
  {label: 'Cookies', href: '/cookies'},
  {label: 'Accessibility', href: '/accessibility'},
];

export function MarketingFooter() {
  return (
    <footer className="marketing-footer">
      <div className="m-container">
        <div className="m-footer-grid">
          <div className="m-footer-brand">
            <BrandMark />
            <p className="m-footer-tagline">
              <strong>Start with a structure. Finish with clarity.</strong>
              Guided document creation for product, engineering, design, marketing and operations.
            </p>
          </div>

          {COLUMNS.map(column => (
            <nav key={column.heading} className="m-footer-col" aria-labelledby={`footer-${column.heading.toLowerCase()}`}>
              <h2 id={`footer-${column.heading.toLowerCase()}`}>{column.heading}</h2>
              <ul>
                {column.links.map(link => (
                  <li key={link.href}>
                    <NextLink href={link.href}>{link.label}</NextLink>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="m-footer-bottom">
          <p>© 2026 Write Studio. All rights reserved.</p>
          <nav aria-label="Legal">
            <ul className="m-footer-legal-links">
              {LEGAL.map(link => (
                <li key={link.href}>
                  <NextLink href={link.href}>{link.label}</NextLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  );
}
