'use client';

import {isUntitledTitle} from '@studio/shared';
import {useLayoutEffect, useRef} from 'react';
import type {Editor} from '@tiptap/react';

/** Grows a text area to fit its text (for browsers without `field-sizing: content`). */
function useAutoHeight(ref: React.RefObject<HTMLTextAreaElement | null>, value: string) {
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || CSS.supports('field-sizing', 'content')) return;
    element.style.blockSize = 'auto';
    element.style.blockSize = `${element.scrollHeight}px`;
  }, [ref, value]);
}

/**
 * The title and subtitle, on the page above the story (Stage 3: write without leaving the
 * canvas). Plain text fields, so they can't take formatting; Enter moves on, to the subtitle,
 * then into the story. *Asterisks* mark the word shown in the accent font, as before.
 */
export function TitleFields({
  editor,
  title,
  subtitle,
  isEditable,
  onChange,
}: {
  editor: Editor | null;
  title: string;
  subtitle: string;
  isEditable: boolean;
  onChange: (patch: {title?: string; subtitle?: string}) => void;
}) {
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const subtitleRef = useRef<HTMLTextAreaElement>(null);
  useAutoHeight(titleRef, title);
  useAutoHeight(subtitleRef, subtitle);
  const oneLine = (value: string) => value.replace(/\s*\n+\s*/g, ' ');
  const shown = isUntitledTitle(title) ? '' : title;

  return (
    <div className="write-titles">
      <textarea
        ref={titleRef}
        className="write-title"
        rows={1}
        aria-label="Title"
        placeholder="Title"
        value={shown}
        maxLength={300}
        readOnly={!isEditable}
        onChange={event => onChange({title: oneLine(event.target.value)})}
        onKeyDown={event => {
          if (event.key === 'Enter' || (event.key === 'ArrowDown' && event.currentTarget.selectionStart === event.currentTarget.value.length)) {
            event.preventDefault();
            subtitleRef.current?.focus();
          }
        }}
      />
      <textarea
        ref={subtitleRef}
        className="write-subtitle"
        rows={1}
        aria-label="Subtitle"
        placeholder="Subtitle"
        value={subtitle}
        maxLength={500}
        readOnly={!isEditable}
        onChange={event => onChange({subtitle: oneLine(event.target.value)})}
        onKeyDown={event => {
          const atStart = event.currentTarget.selectionStart === 0 && event.currentTarget.selectionEnd === 0;
          const atEnd = event.currentTarget.selectionStart === event.currentTarget.value.length;
          if (event.key === 'Enter' || (event.key === 'ArrowDown' && atEnd)) {
            event.preventDefault();
            editor?.commands.focus('start');
          } else if ((event.key === 'ArrowUp' && atStart) || (event.key === 'Backspace' && !event.currentTarget.value)) {
            event.preventDefault();
            titleRef.current?.focus();
          }
        }}
      />
    </div>
  );
}
