'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { House, List, PlusCircle, ChartPieSlice, User } from '@phosphor-icons/react';

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
  { label: 'Insights', icon: ChartPieSlice, href: '/insights' },
  { label: 'Perfil', icon: User, href: '/perfil' },
];

interface BottomNavProps {
  onAddExpense?: () => void;
}

export default function BottomNav({ onAddExpense }: BottomNavProps) {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E5E7EB] z-40"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      aria-label="Navegação principal"
    >
      <div className="flex items-center justify-around h-14 max-w-lg mx-auto px-2">
        {NAV_ITEMS.map((item) => {
          if (item.isAction) {
            return (
              <button
                key={item.label}
                onClick={onAddExpense}
                aria-label="Adicionar gasto"
                className="flex flex-col items-center justify-center w-12 h-12 rounded-full bg-[#5BBF8E] text-white -mt-3 active:scale-95 transition-transform duration-75"
                style={{ boxShadow: '0 4px 20px rgba(91, 191, 142, 0.35)' }}
              >
                <item.icon size={22} />
              </button>
            );
          }

          const isActive = item.href === '/'
            ? pathname === '/'
            : pathname.startsWith(item.href);

          return (
            <Link
              key={item.label}
              href={item.href}
              className={`relative flex flex-col items-center justify-center gap-0.5 min-w-[44px] min-h-[44px] rounded-lg transition-colors duration-150 ${
                isActive
                  ? 'text-[#A8C5E0]'
                  : 'text-[#9CA3AF] hover:text-[#6B7280]'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              <item.icon size={20} />
              <span className="text-[10px] font-medium leading-none">{item.label}</span>
              {isActive && (
                <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full bg-[#A8C5E0] animate-scale-in" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
