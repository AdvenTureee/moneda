'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import BottomNav from '@/components/BottomNav';
import AddExpenseModal from '@/components/AddExpenseModal';
import { ToastProvider, useToast } from '@/components/ToastProvider';
import ScrollFadeIndicator from '@/components/ScrollFadeIndicator';
import type { ExpenseInput } from '@/types';

function ShellContent({ children }: { children: React.ReactNode }) {
  const [modalOpen, setModalOpen] = useState(false);
  const { showToast } = useToast();
  const router = useRouter();

  const handleSave = useCallback(
    async (input: ExpenseInput) => {
      await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }).catch(() => {});
      showToast('success', 'Gasto adicionado com sucesso');
      router.refresh();
    },
    [router, showToast]
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
    </>
  );
}

export default function AppShell({ children }: AppShellProps) {
  return (
    <ToastProvider>
      <ShellContent>{children}</ShellContent>
    </ToastProvider>
  );
}

interface AppShellProps {
  children: React.ReactNode;
}
