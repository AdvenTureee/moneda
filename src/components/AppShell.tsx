'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import BottomNav from '@/components/BottomNav';
import AddExpenseModal from '@/components/AddExpenseModal';
import TermsModal from '@/components/TermsModal';
import { ToastProvider, useToast } from '@/components/ToastProvider';
import ScrollFadeIndicator from '@/components/ScrollFadeIndicator';
import type { ExpenseInput } from '@/types';

function ShellContent({
  children,
  requiresTermsAcceptance,
}: {
  children: React.ReactNode;
  requiresTermsAcceptance: boolean;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(!requiresTermsAcceptance);
  const [termsLoading, setTermsLoading] = useState(false);
  const [termsError, setTermsError] = useState('');
  const { showToast } = useToast();
  const router = useRouter();
  const isTermsBlocking = !termsAccepted;

  const handleSave = useCallback(
    async (input: ExpenseInput) => {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }).catch(() => {});
      showToast('success', 'Gasto adicionado com sucesso');
      router.refresh();
      window.dispatchEvent(new CustomEvent('expense-mutated'));
      const data = res ? await res.json().catch(() => null) : null;
      return data?.data;
    },
    [router, showToast]
  );

  const handleAcceptTerms = useCallback(async () => {
    setTermsError('');
    setTermsLoading(true);
    const res = await fetch('/api/terms/accept', { method: 'POST' }).catch(() => null);
    const data = res ? await res.json().catch(() => null) : null;
    setTermsLoading(false);

    if (!res?.ok || data?.ok !== true) {
      setTermsError(data?.error ?? 'Nao foi possivel registrar seu aceite. Tente novamente.');
      return;
    }

    setTermsAccepted(true);
    showToast('success', 'Termos aceitos. Obrigado!');
    router.refresh();
  }, [router, showToast]);

  return (
    <>
      <main
        className="app-shell"
        style={{ paddingBottom: 'calc(56px + env(safe-area-inset-bottom, 0px))' }}
      >
        {children}
      </main>
      <ScrollFadeIndicator />
      <BottomNav onAddExpense={() => { if (!isTermsBlocking) setModalOpen(true); }} />
      <AddExpenseModal
        isOpen={modalOpen && !isTermsBlocking}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
      />
      <TermsModal
        isOpen={isTermsBlocking}
        mode="accept"
        onAccept={handleAcceptTerms}
        acceptLoading={termsLoading}
        acceptError={termsError}
      />
    </>
  );
}

export default function AppShell({
  children,
  requiresTermsAcceptance = false,
}: AppShellProps) {
  return (
    <ToastProvider>
      <ShellContent requiresTermsAcceptance={requiresTermsAcceptance}>{children}</ShellContent>
    </ToastProvider>
  );
}

interface AppShellProps {
  children: React.ReactNode;
  requiresTermsAcceptance?: boolean;
}
