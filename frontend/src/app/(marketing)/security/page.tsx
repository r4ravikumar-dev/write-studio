import type {Metadata} from 'next';
import NextLink from 'next/link';
import {ArrowRight, CheckCircle2, Lock, Database, EyeOff, Server, type LucideIcon} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Privacy & Security',
  description:
    'Learn how Write Studio protects private documents and personal workspaces with ownership checks on every request and private media storage.',
  alternates: {
    canonical: '/security',
  },
};

type Control = {icon: LucideIcon; title: string; body: string; proof: string};

const CONTROLS: Control[] = [
  {
    icon: Lock,
    title: 'Private personal workspaces',
    body: 'Your workspace belongs strictly to your account. There is no public user directory, no public author profiles, and other users cannot browse or discover your private documents.',
    proof: 'Enforced by account-bound sessions',
  },
  {
    icon: Database,
    title: 'Ownership-based access controls',
    body: 'Every request for documents, revisions, notes and uploaded files is checked on our servers against the account that is signed in. You can only read and change what your own account created.',
    proof: 'Enforced by our API on every request; the database refuses all direct access',
  },
  {
    icon: Server,
    title: 'Private media storage',
    body: 'Images, diagrams and documents uploaded to your workspace are kept in a private storage bucket. They are served only to you, through a signed-in route that checks you own each file. There are no public links to your media.',
    proof: 'Enforced by a private bucket and an owner-checked file route',
  },
  {
    icon: EyeOff,
    title: 'Your writing stays yours',
    body: 'Your drafts are not automatically published to a public directory, indexed by search engines, or shared with third-party data brokers. When you export, outputs are downloaded directly to your device.',
    proof: 'Zero automatic indexing or public web publishing',
  },
];

export default function SecurityPage() {
  return (
    <div className="marketing-security">
      {/* Hero */}
      <section className="m-section-hero">
        <div className="m-container">
          <div className="m-hero-head">
            <span className="m-eyebrow">Security & Data Protection</span>
            <h1 className="m-title-display">Your work stays yours.</h1>
            <p className="m-subtitle">
              Write Studio gives every user a personal workspace. Your documents, drafts and uploaded files are private
              to your account. Create and manage your work without making it publicly visible.
            </p>
            <div className="m-actions">
              <NextLink href="/signup" className="m-btn m-btn-primary m-btn-lg">
                <span>Open your private workspace</span>
                <ArrowRight size={18} aria-hidden="true" />
              </NextLink>
            </div>
          </div>
        </div>
      </section>

      {/* Core privacy controls */}
      <section className="m-section m-section--muted">
        <div className="m-container">
          <ul className="m-grid-2 m-plain-list">
            {CONTROLS.map(({icon: Icon, title, body, proof}) => (
              <li key={title} className="m-card m-card--lg">
                <div className="m-card-icon" aria-hidden="true">
                  <Icon />
                </div>
                <h2 className="m-card-title m-sec-title">{title}</h2>
                <p className="m-card-desc m-sec-desc">{body}</p>
                <p className="m-card-footer m-sec-proof">
                  <CheckCircle2 aria-hidden="true" />
                  {proof}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Honest architecture disclosure */}
      <section className="m-section" aria-labelledby="security-commitment-heading">
        <div className="m-container-narrow">
          <div className="m-panel m-panel--card">
            <h2 id="security-commitment-heading" className="m-title-h3">
              Our Commitment to Verifiable Security
            </h2>
            <p className="m-text">We believe security is demonstrated through real architecture, not marketing jargon.</p>
            <ul className="m-bullets m-sec-list">
              <li>All traffic between your browser and Write Studio is encrypted with HTTPS.</li>
              <li>
                Sign-in tokens are kept in <code>httpOnly</code>, <code>SameSite=Lax</code> cookies that scripts on the page cannot read.
              </li>
              <li>Every write and read operation passes server-side authorization checks verifying user ownership.</li>
              <li>
                We do not claim SOC 2 certification or zero-knowledge storage until independent third-party audits are
                formally completed.
              </li>
            </ul>
            <NextLink href="/privacy" className="m-card-link">
              <span>Read the Write Studio Privacy Policy</span>
              <ArrowRight size={14} aria-hidden="true" />
            </NextLink>
          </div>
        </div>
      </section>
    </div>
  );
}
