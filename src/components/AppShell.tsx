'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import BottomNav from '@/components/BottomNav';
import AddExpenseModal from '@/components/AddExpenseModal';
import Toast from '@/components/Toast';
import ScrollFadeIndicator from '@/components/ScrollFadeIndicator';
import type { ExpenseInput } from '@/types';

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [toastText, setToastText] = useState<string | null>(null);
  const router = useRouter();

  const handleSave = useCallback(
    async (input: ExpenseInput) => {
      await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }).catch(() => {});
      setToastText('Gasto adicionado com sucesso');
      router.refresh();
    },
    [router]
  );

  return (
    <>
      <main
        className="app-shell"
        style={{ paddingBottom: 'calc(56px + env(safe-area-inset-bottom, 0px))' }}
      >
        {children}
      </main>
      <ScrollFadeIndicator />
      <BottomNav onAddExpense={() => setModalOpen(true)} />
      <AddExpenseModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
      />
      {toastText && (
        <Toast
          kind="success"
          text={toastText}
          onClose={() => setToastText(null)}
        />
      )}
    </>
  );
}
