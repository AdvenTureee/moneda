'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import BottomNav from '@/components/BottomNav';
import AddExpenseModal from '@/components/AddExpenseModal';
import type { ExpenseInput } from '@/types';

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const router = useRouter();

  const handleSave = useCallback(
    async (input: ExpenseInput) => {
      await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }).catch(() => {});
      // Refresh server components so new expense appears
      router.refresh();
    },
    [router]
  );

  return (
    <>
      <main className="pb-16 min-h-screen">
        {children}
      </main>
      <BottomNav onAddExpense={() => setModalOpen(true)} />
      <AddExpenseModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
      />
    </>
  );
}
