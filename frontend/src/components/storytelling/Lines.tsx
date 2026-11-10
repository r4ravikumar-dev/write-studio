import {Fragment, type ReactNode} from 'react';

/** The one-word headline accent ("*word*"): the display face (Bricolage SemiBold), in brand blue. */
export const accentStyle = {
  fontFamily: 'var(--font-display)',
  color: 'var(--text-brand-primary)',
  fontWeight: 600,
} as const;

/**
 * Inline markup used in content files:
 * - "**text**" → strong emphasis
 * - "*text*"   → accent: the italic serif, used for one word per headline
 */
function Inline({text}: {text: string}): ReactNode {
  return text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/).map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return (
        <em key={index} style={accentStyle}>
          {part.slice(1, -1)}
        </em>
      );
    }
    return <Fragment key={index}>{part}</Fragment>;
  });
}

/**
 * Renders copy from content files: "\n" becomes a line break, "**text**"
 * emphasis and "*text*" the italic serif accent.
 */
export function Lines({text}: {text: string}) {
  const lines = text.split('\n');
  return lines.map((line, index) => (
    <Fragment key={index}>
      <Inline text={line} />
      {index < lines.length - 1 && <br />}
    </Fragment>
  ));
}
