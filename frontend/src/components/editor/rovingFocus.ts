'use client';

import {useEffect, type RefObject} from 'react';

/** Popovers, menus and dialogs opened from the toolbar keep their own keyboard behaviour. */
const LAYERS = '[popover], [role="dialog"], [role="menu"], [role="listbox"]';
const inLayer = (element: Element, root: HTMLElement) => {
  const layer = element.closest(LAYERS);
  return Boolean(layer && layer !== root && root.contains(layer));
};

const CONTROLS = 'button, select, input, [role="button"], [role="combobox"], [tabindex]:not([tabindex="-1"]), [data-roving]';

/**
 * ARIA toolbar keyboard pattern (editor spec §5, T1): the toolbar is ONE tab stop. ←/→ move
 * between its controls (wrapping), Home/End jump to the ends, and Tab leaves the toolbar. The
 * control that last had focus is the one Tab returns to.
 *
 * Works on rendered DOM (Astryx renders the buttons), so it re-applies tabindex when the toolbar's
 * contents change (selection updates, compact mode, disabled states).
 */
export function useRovingFocus(ref: RefObject<HTMLElement | null>, isEnabled = true) {
  useEffect(() => {
    const root = ref.current;
    if (!root || !isEnabled) return;
    let current: HTMLElement | null = null;
    let frame = 0;

    const items = () =>
      Array.from(root.querySelectorAll<HTMLElement>(CONTROLS)).filter(
        element =>
          !element.hasAttribute('disabled') &&
          element.getAttribute('aria-disabled') !== 'true' &&
          element.getClientRects().length > 0 &&
          !inLayer(element, root) &&
          // Only this toolbar's own controls, not those of a toolbar nested inside it.
          element.closest('[role="toolbar"]') === root,
      );

    const apply = () => {
      frame = 0;
      const list = items();
      if (!list.length) return;
      if (!current || !list.includes(current)) current = list[0];
      for (const element of list) {
        const next = element === current ? '0' : '-1';
        if (element.getAttribute('tabindex') !== next) element.setAttribute('tabindex', next);
      }
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(apply);
    };

    const onFocusIn = (event: FocusEvent) => {
      const target = (event.target as HTMLElement).closest<HTMLElement>(CONTROLS);
      if (target && items().includes(target) && target !== current) {
        current = target;
        apply();
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      const target = event.target as HTMLElement;
      if (target.matches('input, textarea, [contenteditable="true"]') || inLayer(target, root)) return;
      const list = items();
      const index = list.indexOf(target.closest<HTMLElement>(CONTROLS) as HTMLElement);
      if (index === -1) return;
      event.preventDefault();
      const next =
        event.key === 'Home' ? 0 : event.key === 'End' ? list.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + list.length) % list.length;
      current = list[next];
      apply();
      current.focus();
    };

    apply();
    root.addEventListener('focusin', onFocusIn);
    root.addEventListener('keydown', onKeyDown);
    const observer = new MutationObserver(schedule);
    observer.observe(root, {childList: true, subtree: true, attributes: true, attributeFilter: ['disabled', 'aria-disabled', 'class', 'hidden']});
    // Floating toolbars (selection bubble, table bar) mount hidden and appear later without any
    // change inside them: re-apply when they get a size.
    const resize = new ResizeObserver(schedule);
    resize.observe(root);
    return () => {
      root.removeEventListener('focusin', onFocusIn);
      root.removeEventListener('keydown', onKeyDown);
      observer.disconnect();
      resize.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [ref, isEnabled]);
}
