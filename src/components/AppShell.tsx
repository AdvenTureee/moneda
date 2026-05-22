'use client';

import { useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import BottomNav from '@/components/BottomNav';
import AddExpenseModal from '@/components/AddExpenseModal';
import CoinDropAnimation from '@/components/CoinDropAnimation';
import ScrollFadeIndicator from '@/components/ScrollFadeIndicator';
import type { ExpenseInput } from '@/types';

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [showCoinDrop, setShowCoinDrop] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const handleSave = useCallback(
    async (input: ExpenseInput) => {
      await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }).catch(() => {});
      setShowCoinDrop(true);
    },
    []
  );

  const handleCoinDropComplete = useCallback(() => {
    setShowCoinDrop(false);
    router.refresh();
  }, [router]);

  return (
    <>
      <main className="pb-16 min-h-screen">
        <div key={pathname} className="animate-fade-in-fast">
          {children}
        </div>
      </main>
      <ScrollFadeIndicator />
      <BottomNav onAddExpense={() => setModalOpen(true)} />
      <AddExpenseModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
      />
      {showCoinDrop && <CoinDropAnimation onComplete={handleCoinDropComplete} />}
    </>
  );
}
