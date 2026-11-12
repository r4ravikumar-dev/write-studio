'use client';

import {useRef, useState} from 'react';
import {AlertCircle, Mail} from 'lucide-react';

const TOPICS = [
  'Account and login',
  'Document creation',
  'Templates',
  'Media and uploads',
  'Technical issue',
  'Other',
];

/** Long mailto: links get cut off by some email apps; this keeps the draft intact. */
const MAX_MESSAGE = 1500;

function draftLink(to: string, topic: string, message: string, name: string) {
  const subject = `Write Studio: ${topic}`;
  const body = name.trim() ? `${message.trim()}\n\n${name.trim()}` : message.trim();
  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/**
 * Contact form that drafts an email in the visitor's own email app. Nothing is sent
 * from our servers, so the copy never claims a message was received.
 */
export function ContactForm({to}: {to: string | null}) {
  const [name, setName] = useState('');
  const [topic, setTopic] = useState(TOPICS[0]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<string | null>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);

  if (!to) {
    return (
      <div className="m-card m-card--lg m-card--raised m-contact-done" role="status">
        <h2 className="m-title-h3">The contact form isn’t available yet</h2>
        <p className="m-text">Please try again later. Answers to common questions are in the FAQ.</p>
        <a className="m-btn m-btn-secondary m-btn-sm" href="/faq">
          Read the FAQ
        </a>
      </div>
    );
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (message.trim().length < 10) {
      setError('Enter a message of at least 10 characters.');
      messageRef.current?.focus();
      return;
    }
    setError(null);
    const link = draftLink(to, topic, message, name);
    setDraft(link);
    window.location.href = link;
  };

  if (draft) {
    return (
      <div className="m-card m-card--lg m-card--raised m-contact-done" role="status">
        <span className="m-contact-done-icon" aria-hidden="true">
          <Mail size={28} />
        </span>
        <h2 className="m-title-h3">Finish in your email app</h2>
        <p className="m-text">
          Your email app should now show a draft with your message. Send it from there. If nothing opened, email us at{' '}
          <a className="m-link" href={draft}>
            {to}
          </a>
          .
        </p>
        <button type="button" className="m-btn m-btn-secondary m-btn-sm" onClick={() => setDraft(null)}>
          Edit the message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="m-card m-card--lg m-card--raised m-form">
      <div className="m-field">
        <label htmlFor="contact-topic" className="m-label">
          Topic
        </label>
        <select id="contact-topic" className="m-select" value={topic} onChange={e => setTopic(e.target.value)}>
          {TOPICS.map(t => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div className="m-field">
        <label htmlFor="contact-message" className="m-label">
          Message
        </label>
        <textarea
          ref={messageRef}
          id="contact-message"
          className="m-textarea"
          rows={6}
          maxLength={MAX_MESSAGE}
          value={message}
          onChange={e => setMessage(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'contact-message-error' : 'contact-message-help'}
        />
        {error ? (
          <p id="contact-message-error" className="m-error-text">
            <AlertCircle size={14} aria-hidden="true" />
            <span>{error}</span>
          </p>
        ) : (
          <p id="contact-message-help" className="m-help">
            Up to {MAX_MESSAGE} characters. Don’t include passwords.
          </p>
        )}
      </div>

      <div className="m-field">
        <label htmlFor="contact-name" className="m-label">
          Your name <span className="m-label-optional">(optional)</span>
        </label>
        <input
          id="contact-name"
          className="m-input"
          type="text"
          autoComplete="name"
          value={name}
          onChange={e => setName(e.target.value)}
        />
      </div>

      <div className="m-actions">
        <button type="submit" className="m-btn m-btn-primary">
          <span>Open email draft</span>
          <Mail size={16} aria-hidden="true" />
        </button>
        <p className="m-caption">Opens your email app. We reply to the address you send from.</p>
      </div>
    </form>
  );
}
