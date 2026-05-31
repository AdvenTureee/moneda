'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import BottomNav from '@/components/BottomNav';
import AddExpenseModal from '@/components/AddExpenseModal';
import CurrentBalanceModal from '@/components/CurrentBalanceModal';
import TermsModal from '@/components/TermsModal';
import { ToastProvider, useToast } from '@/components/ToastProvider';
import ScrollFadeIndicator from '@/components/ScrollFadeIndicator';
import type { ExpenseInput } from '@/types';

const BALANCE_PROMPT_DISMISSED_KEY = 'moneda:current-balance-prompt-dismissed';

function ShellContent({
  children,
  requiresTermsAcceptance,
  requiresCurrentBalance,
}: {
  children: React.ReactNode;
  requiresTermsAcceptance: boolean;
  requiresCurrentBalance: boolean;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(!requiresTermsAcceptance);
  const [balanceAnswered, setBalanceAnswered] = useState(!requiresCurrentBalance);
  const [balanceDismissed, setBalanceDismissed] = useState(false);
  const [termsLoading, setTermsLoading] = useState(false);
  const [termsError, setTermsError] = useState('');
  const { showToast } = useToast();
  const router = useRouter();
  const isTermsBlocking = !termsAccepted;
  const shouldShowCurrentBalance = termsAccepted && !balanceAnswered && !balanceDismissed;

  useEffect(() => {
    if (!requiresCurrentBalance) return;
    setBalanceDismissed(window.sessionStorage.getItem(BALANCE_PROMPT_DISMISSED_KEY) === '1');
  }, [requiresCurrentBalance]);

  const handleSave = useCallback(
    async (input: ExpenseInput) => {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }).catch(() => null);
      const data = res ? await res.json().catch(() => null) : null;
      if (!res?.ok) {
        throw new Error(data?.error ?? 'Nao foi possivel salvar o gasto.');
      }
      showToast('success', 'Gasto adicionado com sucesso');
      window.dispatchEvent(new CustomEvent('expense-mutated', { detail: { expense: data?.data } }));
      window.setTimeout(() => router.refresh(), 350);
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

  const handleBalanceLater = useCallback(() => {
    window.sessionStorage.setItem(BALANCE_PROMPT_DISMISSED_KEY, '1');
    setBalanceDismissed(true);
  }, []);

  const handleBalanceSaved = useCallback(() => {
    window.sessionStorage.removeItem(BALANCE_PROMPT_DISMISSED_KEY);
    setBalanceAnswered(true);
    setBalanceDismissed(false);
    router.refresh();
  }, [router]);

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
        optimisticSave
      />
      <TermsModal
        isOpen={isTermsBlocking}
        mode="accept"
        onAccept={handleAcceptTerms}
        acceptLoading={termsLoading}
        acceptError={termsError}
      />
      <CurrentBalanceModal
        isOpen={shouldShowCurrentBalance}
        onLater={handleBalanceLater}
        onSaved={handleBalanceSaved}
      />
    </>
  );
}

export default function AppShell({
  children,
  requiresTermsAcceptance = false,
  requiresCurrentBalance = false,
}: AppShellProps) {
  return (
    <ToastProvider>
      <ShellContent
        requiresTermsAcceptance={requiresTermsAcceptance}
        requiresCurrentBalance={requiresCurrentBalance}
      >
        {children}
      </ShellContent>
    </ToastProvider>
  );
}

interface AppShellProps {
  children: React.ReactNode;
  requiresTermsAcceptance?: boolean;
  requiresCurrentBalance?: boolean;
}
