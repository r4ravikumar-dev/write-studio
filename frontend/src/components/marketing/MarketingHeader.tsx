'use client';

import {useEffect, useRef, useState} from 'react';
import NextLink from 'next/link';
import {usePathname} from 'next/navigation';
import {Menu, X, ArrowRight} from 'lucide-react';
import {BrandMark} from './BrandMark';

const NAV_ITEMS = [
  {label: 'Product', href: '/product'},
  {label: 'Templates', href: '/templates'},
  {label: 'How it works', href: '/how-it-works'},
  {label: 'Use cases', href: '/use-cases'},
  {label: 'Resources', href: '/resources'},
];

function isCurrent(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MarketingHeader() {
  const pathname = usePathname();
  // The menu belongs to the page it was opened on, so navigating closes it.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const isOpen = openOn === pathname;
  const setIsOpen = (open: boolean) => setOpenOn(open ? pathname : null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const headerRef = useRef<HTMLElement>(null);

  // The bar is transparent at the top of the page and turns to glass once content
  // scrolls under it. Written straight to the DOM: no re-render per scroll.
  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      header.toggleAttribute('data-scrolled', window.scrollY > 8);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, {passive: true});
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  // Escape closes the menu and returns focus to its button.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpenOn(null);
      toggleRef.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen]);

  return (
    <header ref={headerRef} className="marketing-header">
      <a className="m-skip-link" href="#main-content">
        Skip to main content
      </a>
      <div className="marketing-nav-shell">
        <div className="marketing-nav-inner m-glass--elevated">
          <BrandMark />

          <nav aria-label="Main">
            <ul className="marketing-nav-links">
              {NAV_ITEMS.map(item => (
                <li key={item.href}>
                  <NextLink
                    href={item.href}
                    className="marketing-nav-link"
                    aria-current={isCurrent(pathname, item.href) ? 'page' : undefined}>
                    {item.label}
                  </NextLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className="marketing-header-actions">
            <NextLink href="/login" className="m-btn m-btn-ghost m-btn-sm marketing-header-signin">
              Sign in
            </NextLink>
            <NextLink href="/signup" className="m-btn m-btn-primary m-btn-sm marketing-header-cta">
              <span>Start creating</span>
              <ArrowRight size={16} aria-hidden="true" />
            </NextLink>
            <button
              ref={toggleRef}
              type="button"
              className="m-btn m-btn-ghost m-btn-icon marketing-mobile-toggle"
              onClick={() => setIsOpen(!isOpen)}
              aria-label="Menu"
              aria-expanded={isOpen}
              aria-controls="marketing-mobile-menu">
              {isOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
            </button>
          </div>
        </div>

        {isOpen && (
          <nav id="marketing-mobile-menu" className="marketing-mobile-menu m-glass--elevated" aria-label="Main">
            <ul>
              {NAV_ITEMS.map(item => (
                <li key={item.href}>
                  <NextLink href={item.href} aria-current={isCurrent(pathname, item.href) ? 'page' : undefined}>
                    {item.label}
                  </NextLink>
                </li>
              ))}
            </ul>
            <div className="marketing-mobile-menu-actions">
              <NextLink href="/login" className="m-btn m-btn-secondary">
                Sign in
              </NextLink>
              <NextLink href="/signup" className="m-btn m-btn-primary">
                Start creating
              </NextLink>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
