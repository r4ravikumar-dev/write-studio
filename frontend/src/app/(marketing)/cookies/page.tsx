import type {Metadata} from 'next';

export const metadata: Metadata = {
  title: 'Cookie Policy',
  description: 'Understand how Write Studio uses essential authentication cookies and privacy-preserving metrics.',
  alternates: {
    canonical: '/cookies',
  },
};

export default function CookiePolicyPage() {
  return (
    <div className="m-legal">
      <section className="m-section-hero">
        <div className="m-container-reading">
          <header className="m-doc-head">
            <span className="m-eyebrow">Cookie Policy</span>
            <h1 className="m-title-h1">Cookie Policy</h1>
            <p className="m-caption">Last updated: November 2026</p>
          </header>

          <div className="m-prose">
            <h2>1. What Cookies We Use</h2>
            <p>
              Write Studio uses only strictly necessary cookies essential for authentication, security verification,
              and session management. We do not use third-party behavioral advertising cookies or cross-site tracking
              beacons.
            </p>

            <h2>2. Essential Authentication Cookies</h2>
            <p>
              When you log in, we set secure, <code>httpOnly</code> session tokens that verify your identity on
              subsequent requests to your workspace. These tokens are sent only to your workspace pages. The access token expires after 15 minutes and the refresh token after 30 days; signing out revokes them.
            </p>

            <h2>3. Privacy-Preserving Telemetry</h2>
            <p>
              We count page views with Vercel Web Analytics. It does not set cookies or build cross-site profiles, and it does not record the content of your documents or your credentials.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
