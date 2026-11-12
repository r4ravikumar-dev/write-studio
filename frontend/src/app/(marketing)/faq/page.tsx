import type {Metadata} from 'next';
import NextLink from 'next/link';
import {ArrowRight} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Frequently Asked Questions',
  description:
    'Find answers about creating documents, using templates, privacy, and managing your personal Write Studio workspace.',
  alternates: {
    canonical: '/faq',
  },
};

const FAQS = [
  {
    q: 'What is Write Studio?',
    a: 'Write Studio is a guided document creation workspace. It helps you structure, write and visually compose professional documents using purpose-built templates, contextual writing guidance, and rich visual content blocks.',
  },
  {
    q: 'What types of documents can I create?',
    a: 'Depending on your needs, Write Studio supports Developer Documentation, Feature Specifications, Release Notes, Marketing Case Studies, Product Requirements Documents (PRDs), Technical Design Documents, Architecture Decision Records (ADRs), Standard Operating Procedures (SOPs), and UX Case Studies.',
  },
  {
    q: 'Is Write Studio only for designers?',
    a: 'No. While Write Studio offers comprehensive support for design storytelling and UX case studies, it is built for cross-functional professionals including software engineers, technical writers, product managers, marketing strategists, and operations leads.',
  },
  {
    q: 'How do templates work?',
    a: 'Templates provide an initial suggested document structure, contextual section-level writing prompts, and relevant block recommendations. You can adapt, reorder, rename or delete any section to fit your exact project requirements.',
  },
  {
    q: 'Can I create a document without a template?',
    a: 'Yes. You can choose the blank document option during creation to start with your own custom structure without following a predefined framework.',
  },
  {
    q: 'Can I customise the sections?',
    a: 'Yes. The outline controls allow you to add custom sections, rearrange existing sections via drag-and-drop or keyboard controls, and modify section titles whenever your project scope changes.',
  },
  {
    q: 'Can I add images, videos and diagrams?',
    a: 'Write Studio supports a wide range of rich content and visual blocks, including highlighted code blocks with 23 languages, terminal command outputs, API parameter tables, architecture diagrams, user stories, acceptance criteria, device mockups, metric cards, and customer testimonials.',
  },
  {
    q: 'Are my documents public?',
    a: 'No. Every document you create is private to your authenticated personal workspace. Write Studio does not operate a public publishing directory, and your documents are never made public or indexed by search engines.',
  },
  {
    q: 'Can another user see my documents?',
    a: 'No. Other users cannot access your private documents or uploaded media. Every request is checked on our servers against your signed-in account, and the database refuses all direct access.',
  },
  {
    q: 'Can I use Write Studio on mobile?',
    a: 'You can access the website, review your documents, and manage your account on modern mobile browsers. However, the most complete and comfortable editing experience is designed for larger desktop and tablet screens.',
  },
  {
    q: 'Can I work on a document later?',
    a: 'Yes. All drafts and documents are saved continuously to your personal workspace, allowing you to return and continue writing at any time from any device.',
  },
  {
    q: 'Can I delete my documents?',
    a: 'Yes. You can manage, archive, and permanently delete your own documents and associated media assets at any time through the workspace controls.',
  },
  {
    q: 'How do I get help?',
    a: 'You can contact the Write Studio team directly through our Contact page for questions about document creation, templates, or account management.',
  },
];

export default function FaqPage() {
  return (
    <div className="marketing-faq">
      <section className="m-section-hero">
        <div className="m-container-reading">
          <div className="m-section-head m-section-head--center">
            <span className="m-eyebrow">Help & Knowledge</span>
            <h1 className="m-title-display">Frequently asked questions.</h1>
            <p className="m-subtitle">
              Find answers about creating documents, using templates, privacy, and managing your personal workspace.
            </p>
          </div>

          <div className="m-faq-list">
            {FAQS.map((faq, idx) => (
              <details key={faq.q} className="m-faq-item" open={idx < 3}>
                <summary className="m-faq-summary">{faq.q}</summary>
                <div className="m-faq-content">{faq.a}</div>
              </details>
            ))}
          </div>

          <div className="m-faq-page-foot">
            <p className="m-text">Still have a question? We&apos;re here to help.</p>
            <NextLink href="/contact" className="m-btn m-btn-secondary">
              <span>Contact our team</span>
              <ArrowRight size={16} aria-hidden="true" />
            </NextLink>
          </div>
        </div>
      </section>
    </div>
  );
}
