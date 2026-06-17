'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { House, List, PlusCircle, Sparkle, User } from '@phosphor-icons/react';
import {
  DASHBOARD_PERIOD_CHANGED_EVENT,
  dashboardHrefWithStoredPeriod,
} from '@/lib/navigationState';

interface NavItem {
  label: string;
  icon: React.ComponentType<{ size?: number; weight?: 'regular' | 'fill' | 'bold' | 'light' | 'thin' | 'duotone'; className?: string }>;
  href: string;
  isAction?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', icon: House, href: '/app' },
  { label: 'Feed', icon: List, href: '/feed' },
  { label: 'Adicionar', icon: PlusCircle, href: '#add', isAction: true },
  { label: 'Insights', icon: Sparkle, href: '/insights' },
  { label: 'Perfil', icon: User, href: '/perfil' },
];

const NAV_TRANSITION_TIMEOUT_MS = 520;

function scrollPageToTop() {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.scrollTo({
    top: 0,
    left: 0,
    behavior: reduceMotion ? 'auto' : 'smooth',
  });
}

function isModifiedClick(event: React.MouseEvent<HTMLAnchorElement>) {
  return (
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  );
}

function resetTabScroll() {
  window.dispatchEvent(new CustomEvent('moneda:tab-scroll-reset'));
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
}

interface BottomNavProps {
  onAddExpense?: () => void;
}

export default function BottomNav({ onAddExpense }: BottomNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [dashboardHref, setDashboardHref] = useState('/app');
  const shouldResetScrollRef = useRef(false);
  const previousPathnameRef = useRef(pathname);
  const resetScrollTimeoutRef = useRef<number | null>(null);
  const navTransitionTimeoutRef = useRef<number | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const [transitioningHref, setTransitioningHref] = useState<string | null>(null);

  const prefetchRoute = useCallback(
    (href: string) => {
      router.prefetch(href);
    },
    [router],
  );

  const clearPendingScrollReset = useCallback(() => {
    shouldResetScrollRef.current = false;
    if (resetScrollTimeoutRef.current) {
      window.clearTimeout(resetScrollTimeoutRef.current);
      resetScrollTimeoutRef.current = null;
    }
  }, []);

  const scheduleScrollReset = useCallback(() => {
    shouldResetScrollRef.current = true;
    if (resetScrollTimeoutRef.current) {
      window.clearTimeout(resetScrollTimeoutRef.current);
    }

    resetScrollTimeoutRef.current = window.setTimeout(() => {
      shouldResetScrollRef.current = false;
      resetScrollTimeoutRef.current = null;
    }, 3000);
  }, []);

  useLayoutEffect(() => {
    if (previousPathnameRef.current === pathname) return;

    previousPathnameRef.current = pathname;
    if (!shouldResetScrollRef.current) return;

    clearPendingScrollReset();
    resetTabScroll();
  }, [clearPendingScrollReset, pathname]);

  useEffect(() => clearPendingScrollReset, [clearPendingScrollReset]);

  const clearNavTransitionTimer = useCallback(() => {
    if (navTransitionTimeoutRef.current) {
      window.clearTimeout(navTransitionTimeoutRef.current);
      navTransitionTimeoutRef.current = null;
    }
  }, []);

  const clearNavTransition = useCallback(() => {
    setTransitioningHref(null);
    clearNavTransitionTimer();
  }, [clearNavTransitionTimer]);

  const showNavTransition = useCallback((href: string) => {
    setTransitioningHref(href);
    if (navTransitionTimeoutRef.current) {
      window.clearTimeout(navTransitionTimeoutRef.current);
    }
    navTransitionTimeoutRef.current = window.setTimeout(() => {
      setTransitioningHref(null);
      navTransitionTimeoutRef.current = null;
    }, NAV_TRANSITION_TIMEOUT_MS);
  }, []);

  useEffect(() => {
    clearNavTransition();
  }, [clearNavTransition, pathname]);

  useEffect(() => clearNavTransitionTimer, [clearNavTransitionTimer]);

  useEffect(() => {
    const updateDashboardHref = () => setDashboardHref(dashboardHrefWithStoredPeriod());
    updateDashboardHref();
    window.addEventListener(DASHBOARD_PERIOD_CHANGED_EVENT, updateDashboardHref);
    window.addEventListener('storage', updateDashboardHref);
    return () => {
      window.removeEventListener(DASHBOARD_PERIOD_CHANGED_EVENT, updateDashboardHref);
      window.removeEventListener('storage', updateDashboardHref);
    };
  }, []);

  useEffect(() => {
    const flushBackdrop = () => {
      const el = navRef.current;
      if (!el) return;
      const s = el.style as any;
      s.webkitBackdropFilter = 'none';
      s.backdropFilter = 'none';
      void el.offsetHeight;
      s.webkitBackdropFilter = '';
      s.backdropFilter = '';
    };

    const observer = new MutationObserver(() => {
      flushBackdrop();
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme'],
    });

    return () => observer.disconnect();
  }, []);

  return (
    <nav
      ref={navRef}
      className="bottom-nav"
      aria-label="Navegação principal"
    >
      <div className="bottom-nav__inner">
        {NAV_ITEMS.map((item) => {
          if (item.isAction) {
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => onAddExpense?.()}
                aria-label="Adicionar gasto"
                className="bottom-nav-action-btn"
              >
                <PlusCircle size={28} weight="bold" />
              </button>
            );
          }

          const href = item.href === '/app' ? dashboardHref : item.href;
          const isActive = item.href === '/app'
            ? pathname === '/app'
            : pathname.startsWith(item.href);
          const isSamePath = pathname === item.href;
          const isTransitioning = transitioningHref === href;

          return (
            <Link
              key={item.label}
              href={href}
              prefetch
              scroll={false}
              onMouseEnter={() => prefetchRoute(href)}
              onClick={(event) => {
                if (isModifiedClick(event)) return;

                if (!isSamePath) {
                  showNavTransition(href);
                  return;
                }

                event.preventDefault();
                clearPendingScrollReset();
                scrollPageToTop();
              }}
              onNavigate={() => {
                showNavTransition(href);
                resetTabScroll();
                scheduleScrollReset();
              }}
              onFocus={() => prefetchRoute(href)}
              className={`bottom-nav-link ${isActive ? 'bottom-nav-link--active' : ''} ${isTransitioning ? 'bottom-nav-link--transitioning' : ''}`}
              aria-current={isActive ? 'page' : undefined}
              aria-busy={isTransitioning || undefined}
            >
              <item.icon
                size={isActive ? 25 : 23}
                weight={isActive ? 'fill' : 'regular'}
                className="bottom-nav-link__icon"
              />
              <span className="bottom-nav-link__label">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
