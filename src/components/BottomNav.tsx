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

const NAV_TRANSITION_TIMEOUT_MS = 5000;

function getAppShellElement() {
  return document.querySelector<HTMLElement>('.app-shell');
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

function resetTabScroll(behavior: ScrollBehavior = 'auto') {
  window.dispatchEvent(new CustomEvent('moneda:tab-scroll-reset'));
  getAppShellElement()?.scrollTo({ top: 0, left: 0, behavior });
}

interface BottomNavProps {
  onAddExpense?: () => void;
}

export default function BottomNav({ onAddExpense }: BottomNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [dashboardHref, setDashboardHref] = useState('/app');
  const previousPathnameRef = useRef(pathname);
  const navTransitionTimeoutRef = useRef<number | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const tabsPillRef = useRef<HTMLSpanElement>(null);
  const [transitioningHref, setTransitioningHref] = useState<string | null>(null);
  const [isCompact, setIsCompact] = useState(false);

  const prefetchRoute = useCallback(
    (href: string) => {
      router.prefetch(href);
    },
    [router],
  );

  useEffect(() => {
    if (previousPathnameRef.current === pathname) return;

    previousPathnameRef.current = pathname;
    resetTabScroll('auto');
  }, [pathname]);

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

  useEffect(() => {
    const shell = getAppShellElement();
    if (!shell) return;

    let ticking = false;
    let lastTop = shell.scrollTop;
    let current = false;
    const THRESHOLD_DOWN = 120;
    const THRESHOLD_UP = 40;
    const MIN_UP_DELTA = 4;

    const update = () => {
      ticking = false;
      const top = shell.scrollTop;
      const delta = top - lastTop;
      const goingDown = delta > 0;
      const goingUp = delta < -MIN_UP_DELTA;
      let next = current;
      if (goingDown && top > THRESHOLD_DOWN) next = true;
      else if (top <= THRESHOLD_UP || goingUp) next = false;
      lastTop = top;
      if (next !== current) {
        current = next;
        setIsCompact(next);
      }
    };

    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(update);
      }
    };

    shell.addEventListener('scroll', onScroll, { passive: true });
    return () => shell.removeEventListener('scroll', onScroll);
  }, []);

  const moveTabsPill = useCallback((animate: boolean) => {
    const nav = navRef.current;
    const pill = tabsPillRef.current;
    if (!nav || !pill) return;

    const activeTab = nav.querySelector<HTMLElement>('.t-tab[aria-selected="true"]');
    if (!activeTab) {
      pill.style.width = '0px';
      return;
    }

    if (!animate) {
      const previousTransition = pill.style.transition;
      pill.style.transition = 'none';
      pill.style.transform = `translateX(${activeTab.offsetLeft}px)`;
      pill.style.width = `${activeTab.offsetWidth}px`;
      void pill.offsetWidth;
      pill.style.transition = previousTransition;
      return;
    }

    pill.style.transform = `translateX(${activeTab.offsetLeft}px)`;
    pill.style.width = `${activeTab.offsetWidth}px`;
  }, []);

  useLayoutEffect(() => {
    const frame = window.requestAnimationFrame(() => moveTabsPill(false));
    const handleResize = () => moveTabsPill(false);

    window.addEventListener('resize', handleResize);
    window.visualViewport?.addEventListener('resize', handleResize);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', handleResize);
      window.visualViewport?.removeEventListener('resize', handleResize);
    };
  }, [moveTabsPill]);

  useLayoutEffect(() => {
    moveTabsPill(true);
  }, [dashboardHref, moveTabsPill, pathname, transitioningHref]);

  useEffect(() => {
    if (isCompact === undefined) return;
    let raf = 0;
    let frames = 0;
    const maxFrames = 22;
    const tick = () => {
      moveTabsPill(false);
      frames += 1;
      if (frames < maxFrames) {
        raf = window.requestAnimationFrame(tick);
      }
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [isCompact, moveTabsPill]);

  return (
    <nav
      ref={navRef}
      className={`bottom-nav${isCompact ? ' is-compact' : ''}`}
      aria-label="Navegação principal"
    >
      <div className="bottom-nav__inner t-tabs">
        <span ref={tabsPillRef} className="t-tabs-pill bottom-nav-tabs-pill" aria-hidden="true" />
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
                <Plus size={26} weight="bold" />
              </button>
            );
          }

          const href = item.href === '/app' ? dashboardHref : item.href;
          const isActive = item.href === '/app'
            ? pathname === '/app'
            : pathname.startsWith(item.href);
          const isSamePath = pathname === item.href;
          const isTransitioning = transitioningHref === href;
          const isSelected = transitioningHref ? isTransitioning : isActive;

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
                resetTabScroll('smooth');
              }}
              onNavigate={() => {
                showNavTransition(href);
              }}
              onFocus={() => prefetchRoute(href)}
              className={`t-tab bottom-nav-link ${isSelected ? 'bottom-nav-link--active' : ''} ${isTransitioning ? 'bottom-nav-link--transitioning' : ''}`}
              aria-current={isActive ? 'page' : undefined}
              aria-selected={isSelected ? 'true' : 'false'}
              aria-busy={isTransitioning || undefined}
            >
              <span
                className="t-icon-swap bottom-nav-link__icon"
                data-state={isSelected ? 'b' : 'a'}
                aria-hidden="true"
              >
                <span className="t-icon" data-icon="a">
                  <item.icon size={24} weight="regular" />
                </span>
                <span className="t-icon" data-icon="b">
                  <item.icon size={24} weight="fill" />
                </span>
              </span>
              <span className="bottom-nav-link__label">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
