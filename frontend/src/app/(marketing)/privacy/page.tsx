import type {Metadata} from 'next';
import NextLink from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Understand how Write Studio collects, uses, and protects your personal account data and private workspace content.',
  alternates: {
    canonical: '/privacy',
  },
};

export default function PrivacyPolicyPage() {
  return (
    <div className="m-legal">
      <section className="m-section-hero">
        <div className="m-container-reading">
          <header className="m-doc-head">
            <span className="m-eyebrow">Legal & Privacy</span>
            <h1 className="m-title-h1">Privacy Policy</h1>
            <p className="m-caption">Last updated: November 2026</p>
          </header>

          <div className="m-prose">
            <h2>1. Our Core Principle: Private by Default</h2>
            <p>
              Write Studio is designed as a private workspace for professionals. Your documents, drafts, notes, and
              uploaded media files are private to your account. We do not publish your work to public directories or
              sell your content to third parties.
            </p>

            <h2>2. Information We Collect</h2>
            <p>
              We collect your email address and display name upon account registration. We store the document text,
              structure metadata, and media assets you explicitly create and upload to your workspace. We count page views with Vercel Web Analytics, which does not use cookies and records page addresses, referrers, and device and country information. It does not record the content of your documents.
            </p>

            <h2>3. How We Store and Protect Your Data</h2>
            <p>
              All data is encrypted in transit over HTTPS. Every request is checked on our servers against your signed-in account, and the database refuses all direct access. Session cookies use the <code>httpOnly</code> and{' '}
              <code>SameSite=Lax</code> flags, so scripts on the page cannot read them.
            </p>

            <h2>4. Your Rights and Data Deletion</h2>
            <p>
              You retain complete intellectual property ownership over all content created in Write Studio. You may
              export your documents to standard formats (PDF, Markdown, HTML, JSON) or delete your documents and account
              permanently at any time from your workspace settings.
            </p>

            <h2>5. Contact Us</h2>
            <p>
              If you have questions regarding this Privacy Policy or data protection, please contact us through our{' '}
              <NextLink href="/contact">Contact page</NextLink>.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
