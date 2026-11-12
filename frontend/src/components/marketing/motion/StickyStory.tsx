'use client';

import {useEffect, useRef, useState, type ReactNode} from 'react';

export type StoryStep = {
  id: string;
  eyebrow: string;
  title: string;
  body: ReactNode;
  /** The product state for this step. Shown pinned beside the text on desktop, inline below it elsewhere. */
  visual: ReactNode;
};

/**
 * Scroll storytelling: on desktop the visual stays pinned while the steps scroll past,
 * and the step nearest the middle of the screen is active. Normal browser scrolling
 * throughout (no hijacking). Below 1024px it becomes a plain list with inline visuals.
 */
export function StickyStory({steps, label}: {steps: StoryStep[]; label: string}) {
  const [active, setActive] = useState(0);
  const stepRefs = useRef<(HTMLLIElement | null)[]>([]);

  // The active step is the one crossing the middle of the viewport (or the nearest one).
  // Checked at most once per frame while scrolling; reads layout only, never writes it.
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const middle = window.innerHeight / 2;
      let best = 0;
      let bestDistance = Infinity;
      stepRefs.current.forEach((el, index) => {
        if (!el) return;
        const box = el.getBoundingClientRect();
        const distance = box.top > middle ? box.top - middle : box.bottom < middle ? middle - box.bottom : 0;
        if (distance < bestDistance) {
          bestDistance = distance;
          best = index;
        }
      });
      setActive(current => (current === best ? current : best));
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, {passive: true});
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [steps.length]);

  const goTo = (index: number) => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    stepRefs.current[index]?.scrollIntoView({block: 'center', behavior: reduce ? 'auto' : 'smooth'});
  };

  return (
    <div className="m-story">
      <ol className="m-story-steps" aria-label={label}>
        {steps.map((step, index) => (
          <li
            key={step.id}
            id={step.id}
            ref={el => {
              stepRefs.current[index] = el;
            }}
            className="m-story-step"
            data-active={index === active ? '' : undefined}
            data-no-reveal>
            <span className="m-meta">{step.eyebrow}</span>
            <h3 className="m-title-h3">{step.title}</h3>
            <div className="m-text">{step.body}</div>
            <div className="m-story-step-visual">{step.visual}</div>
          </li>
        ))}
      </ol>

      <div className="m-story-stage">
        <div className="m-story-frame">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className="m-story-panel"
              data-active={index === active ? '' : undefined}
              aria-hidden={index === active ? undefined : true}
              inert={index !== active}>
              {step.visual}
            </div>
          ))}
        </div>
        <nav className="m-story-progress" aria-label={`${label}: jump to step`}>
          {steps.map((step, index) => (
            <button
              key={step.id}
              type="button"
              aria-current={index === active ? 'step' : undefined}
              onClick={() => goTo(index)}>
              <span className="sr-only">
                Step {index + 1}: {step.title}
              </span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
