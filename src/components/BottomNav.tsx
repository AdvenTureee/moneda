'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { House, List, Plus, Sparkle, User } from '@phosphor-icons/react';
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
  { label: 'Adicionar', icon: Plus, href: '#add', isAction: true },
  { label: 'Insights', icon: Sparkle, href: '/insights' },
  { label: 'Perfil', icon: User, href: '/perfil' },
];

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
  const navRef = useRef<HTMLElement>(null);

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
      <div className="grid h-[72px] grid-cols-5 items-center px-3">
        {NAV_ITEMS.map((item) => {
          if (item.isAction) {
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => onAddExpense?.()}
                aria-label="Adicionar gasto"
                className="bottom-nav-action-btn justify-self-center flex items-center justify-center h-[50px] w-[50px] rounded-full bg-[var(--color-brand-green)] text-white touch-manipulation active:scale-[0.72] active:brightness-75 active:shadow-[0_0px_0px_rgba(91,191,142,0)] hover:shadow-[0_6px_20px_rgba(91,191,142,0.5)] hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-green)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--nav-glass-bg)] transition-all duration-[200ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] shadow-[0_4px_12px_rgba(91,191,142,0.35)] will-change-transform"
              >
                <Plus size={28} weight="bold" />
              </button>
            );
          }

          const href = item.href === '/app' ? dashboardHref : item.href;
          const isActive = item.href === '/app'
            ? pathname === '/app'
            : pathname.startsWith(item.href);
          const isSamePath = pathname === item.href;

          return (
            <Link
              key={item.label}
              href={href}
              prefetch
              scroll={false}
              onMouseEnter={() => prefetchRoute(href)}
              onClick={(event) => {
                if (!isSamePath || isModifiedClick(event)) return;

                event.preventDefault();
                clearPendingScrollReset();
                scrollPageToTop();
              }}
              onNavigate={() => {
                resetTabScroll();
                scheduleScrollReset();
              }}
              onFocus={() => prefetchRoute(href)}
              className={`bottom-nav-link relative justify-self-center flex flex-col items-center justify-center gap-1 w-full min-w-[56px] min-h-[56px] rounded-xl touch-manipulation transition-all duration-[200ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-[0.82] active:opacity-60 will-change-transform ${
                isActive
                  ? 'text-[var(--color-brand-green)] font-bold'
                  : 'text-slate-400 dark:text-slate-400/70'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              <item.icon size={isActive ? 26 : 24} weight={isActive ? 'fill' : 'regular'} className="transition-transform duration-150" />
              <span className="text-[10px] font-medium tracking-wide leading-none">{item.label}</span>
              {isActive && (
                <span className="absolute -bottom-[2px] h-[3px] w-4 rounded-full bg-[var(--color-brand-green)] animate-fade-in" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
