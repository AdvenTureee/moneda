'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { House, List, PlusCircle, Sparkle, User } from '@phosphor-icons/react';

interface NavItem {
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  href: string;
  isAction?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', icon: House, href: '/' },
  { label: 'Feed', icon: List, href: '/feed' },
  { label: 'Adicionar', icon: PlusCircle, href: '#add', isAction: true },
  { label: 'Insights', icon: Sparkle, href: '/insights' },
  { label: 'Perfil', icon: User, href: '/perfil' },
];

interface BottomNavProps {
  onAddExpense?: () => void;
}

export default function BottomNav({ onAddExpense }: BottomNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  const prefetchRoute = useCallback(
    (href: string) => {
      router.prefetch(href);
    },
    [router],
  );

  useEffect(() => {
    for (const item of NAV_ITEMS) {
      if (!item.isAction) prefetchRoute(item.href);
    }
  }, [prefetchRoute]);

  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-white z-40"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      aria-label="Navegação principal"
    >
      <div className="grid grid-cols-5 items-center h-14 max-w-lg mx-auto px-2">
        {NAV_ITEMS.map((item) => {
          if (item.isAction) {
            return (
              <button
                key={item.label}
                onPointerDown={() => setPendingHref(item.href)}
                onClick={() => {
                  setPendingHref(null);
                  onAddExpense?.();
                }}
                aria-label="Adicionar gasto"
                className={`bottom-nav-action justify-self-center flex flex-col items-center justify-center w-[60px] h-[60px] rounded-full bg-[#5BBF8E] text-white -mt-5 active:scale-90 transition-transform duration-75 ${pendingHref === item.href ? 'bottom-nav-action--pending' : ''}`}
                style={{ boxShadow: 'var(--shadow-nav-action)' }}
              >
                <item.icon size={28} />
              </button>
            );
          }

          const isActive = item.href === '/'
            ? pathname === '/'
            : pathname.startsWith(item.href);
          const isPending = pendingHref === item.href && !isActive;

          return (
            <Link
              key={item.label}
              href={item.href}
              prefetch
              onMouseEnter={() => prefetchRoute(item.href)}
              onPointerDown={() => {
                prefetchRoute(item.href);
                if (!isActive) setPendingHref(item.href);
              }}
              onFocus={() => prefetchRoute(item.href)}
              className={`bottom-nav-link relative justify-self-center flex flex-col items-center justify-center gap-0.5 w-full min-w-[44px] min-h-[44px] rounded-lg transition-colors duration-150 ${
                isActive || isPending
                  ? 'text-[#A8C5E0]'
                  : 'text-[#9CA3AF] hover:text-[#6B7280]'
              } ${isPending ? 'bottom-nav-link--pending' : ''}`}
              aria-current={isActive ? 'page' : undefined}
            >
              <item.icon size={20} />
              <span className="text-[10px] font-medium leading-none">{item.label}</span>
              {(isActive || isPending) && (
                <span className={`bottom-nav-indicator absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full bg-[#A8C5E0] ${isPending ? 'bottom-nav-indicator--pending' : 'animate-scale-in'}`} />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
