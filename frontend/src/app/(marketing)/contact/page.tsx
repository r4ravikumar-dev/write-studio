import type {Metadata} from 'next';
import {ContactForm} from '@/components/marketing/ContactForm';
import {supportEmail} from '@/lib/marketing/supportEmail';

export const metadata: Metadata = {
  title: 'Contact & Support',
  description:
    'Have a question about templates, document creation, or managing your personal Write Studio workspace? Contact our team.',
  alternates: {
    canonical: '/contact',
  },
};

export default function ContactPage() {
  return (
    <div className="marketing-contact">
      <section className="m-section-hero">
        <div className="m-container-reading">
          <div className="m-section-head m-section-head--center">
            <span className="m-eyebrow">Get In Touch</span>
            <h1 className="m-title-display">Need help with Write Studio?</h1>
            <p className="m-subtitle">
              Have a question about templates, document creation or your workspace? Tell us what you need help with and
              we’ll open a draft email for you to send.
            </p>
          </div>

          <ContactForm to={supportEmail()} />
        </div>
      </section>
    </div>
  );
}
