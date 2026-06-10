'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import Link, { useLinkStatus } from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { House, List, PlusCircle, Sparkle, User } from '@phosphor-icons/react';
import { DASHBOARD_PERIOD_CHANGED_EVENT } from '@/lib/navigationState';

interface NavItem {
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  href: string;
  isAction?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', icon: House, href: '/feed' },
  { label: 'Feed', icon: List, href: '/feed' },
  { label: 'Adicionar', icon: PlusCircle, href: '#add', isAction: true },
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

function NavPendingHint() {
  const { pending } = useLinkStatus();
  return (
    <span
      className={`bottom-nav-pending-hint ${pending ? 'bottom-nav-pending-hint--visible' : ''}`}
      aria-hidden
    />
  );
}

interface BottomNavProps {
  onAddExpense?: () => void;
}

export default function BottomNav({ onAddExpense }: BottomNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [dashboardHref, setDashboardHref] = useState('/feed');
  const shouldResetScrollRef = useRef(false);
  const previousPathnameRef = useRef(pathname);
  const resetScrollTimeoutRef = useRef<number | null>(null);

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

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-[var(--color-surface)] pb-[env(safe-area-inset-bottom,0px)]"
      aria-label="Navegação principal"
    >
      <div className="grid h-[68px] grid-cols-5 items-center max-w-lg mx-auto px-2">
        {NAV_ITEMS.map((item) => {
          if (item.isAction) {
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => onAddExpense?.()}
                aria-label="Adicionar gasto"
                className="gesture-icon-button bottom-nav-action justify-self-center flex flex-col items-center justify-center h-[68px] w-[68px] rounded-full bg-[#5BBF8E] text-white -mt-6 touch-manipulation active:scale-90 transition-transform duration-75"
                style={{ boxShadow: 'var(--shadow-nav-action)' }}
              >
                <item.icon size={32} />
              </button>
            );
          }

          const href = item.href === '/feed' ? dashboardHref : item.href;
          const isActive = item.href === '/feed'
            ? pathname === '/feed'
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
              className={`bottom-nav-link relative justify-self-center flex flex-col items-center justify-center gap-1 w-full min-w-[50px] min-h-[56px] rounded-xl touch-manipulation transition-[color,transform] duration-150 active:scale-[0.98] ${
                isActive
                  ? 'text-[#A8C5E0]'
                  : 'text-[#9CA3AF] hover:text-[#6B7280]'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              <item.icon size={23} />
              <span className="text-[11px] font-semibold leading-none">{item.label}</span>
              <NavPendingHint />
              {isActive && (
                <span className="bottom-nav-indicator absolute -bottom-0.5 h-0.5 rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
