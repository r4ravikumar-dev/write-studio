import type {Metadata} from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Terms and conditions governing the use of Write Studio software and services.',
  alternates: {
    canonical: '/terms',
  },
};

export default function TermsOfServicePage() {
  return (
    <div className="m-legal">
      <section className="m-section-hero">
        <div className="m-container-reading">
          <header className="m-doc-head">
            <span className="m-eyebrow">Terms & Conditions</span>
            <h1 className="m-title-h1">Terms of Service</h1>
            <p className="m-caption">Last updated: November 2026</p>
          </header>

          <div className="m-prose">
            <h2>1. Acceptance of Terms</h2>
            <p>
              By creating an account or using Write Studio, you agree to comply with and be bound by these Terms of
              Service. If you do not agree, you must discontinue using the application.
            </p>

            <h2>2. User Accounts & Responsibilities</h2>
            <p>
              You are responsible for maintaining the confidentiality of your authentication credentials and for all
              activities that occur under your account. You agree not to upload malicious payloads, violate applicable
              intellectual property laws, or attempt to bypass security boundaries.
            </p>

            <h2>3. Intellectual Property Ownership</h2>
            <p>
              You retain all rights, title, and ownership in and to the content, text, data, and media you author in
              Write Studio. Write Studio does not claim any ownership over your documents.
            </p>

            <h2>4. Service Availability & Termination</h2>
            <p>
              We strive to maintain continuous platform availability. You may export your work and delete your account
              at any time without penalty.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
