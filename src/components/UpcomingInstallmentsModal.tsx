'use client';

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CreditCard, X } from '@phosphor-icons/react';
import { formatCurrency, formatDateFull } from '@/lib/utils';
import { getUpcomingInstallments } from '@/lib/installments';
import { PAYMENT_METHOD_BADGES } from '@/lib/paymentMethods';
import type { Expense } from '@/types';

interface UpcomingInstallmentsModalProps {
  isOpen: boolean;
  expense: Expense | null;
  billingClosingDay: number;
  onClose: () => void;
}

export default function UpcomingInstallmentsModal({
  isOpen,
  expense,
  billingClosingDay,
  onClose,
}: UpcomingInstallmentsModalProps) {
  const [mounted, setMounted] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      setIsClosing(false);
      return;
    }
    if (!shouldRender) return;
    setIsClosing(true);
    const timer = window.setTimeout(() => {
      setShouldRender(false);
      setIsClosing(false);
    }, 180);
    return () => window.clearTimeout(timer);
  }, [isOpen, shouldRender]);

  const requestClose = useCallback(() => {
    setIsClosing(true);
    window.setTimeout(onClose, 180);
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') requestClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, requestClose]);

  if (!shouldRender || !mounted || !expense) return null;

  const installments = getUpcomingInstallments(expense, billingClosingDay);
  const paymentBadge = PAYMENT_METHOD_BADGES[expense.paymentMethod];
  const primaryColor = paymentBadge?.color ?? '#2E8F67';
  const circleBg = paymentBadge?.bg ?? '#EEF9F4';
  const circleBgDark = paymentBadge?.bgDark ?? circleBg;

  return createPortal(
    <div
      className="modal-wave-backdrop fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6"
      data-state={isClosing ? 'closing' : 'open'}
      onClick={(event) => {
        if (event.target === event.currentTarget) requestClose();
      }}
    >
      <div
        className="modal-panel-pop w-full max-w-sm flex max-h-[85vh] flex-col overflow-hidden rounded-[20px] bg-white dark:bg-[var(--color-surface)]"
        role="dialog"
        aria-modal
        aria-label="Próximas parcelas"
      >
        <div className="flex items-center gap-3 border-b border-[#F1F3F7] bg-white px-5 py-4 dark:border-[var(--color-border)] dark:bg-[var(--color-surface)]">
          <span
            className="flex h-11 w-11 items-center justify-center rounded-full bg-[color:var(--payment-bg)] text-[color:var(--payment-color)] dark:bg-[color:var(--payment-bg-dark)]"
            style={
              {
                '--payment-bg': circleBg,
                '--payment-bg-dark': circleBgDark,
                '--payment-color': primaryColor,
              } as React.CSSProperties
            }
          >
            <CreditCard size={20} weight="bold" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--color-text-primary)] truncate">Próximas parcelas</p>
            <p className="mt-0.5 text-xs text-[var(--color-text-secondary)] truncate">
              {expense.description}
            </p>
          </div>
          <button
            type="button"
            onClick={requestClose}
            aria-label="Fechar"
            className="ml-auto flex h-9 w-9 items-center justify-center rounded-full text-[#6B7280] transition-colors hover:bg-[#F1F3F7] dark:text-white dark:hover:bg-white/10"
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {installments.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <p className="text-sm font-semibold text-[#1A1D23] dark:text-[#F8FAFC]">Nenhuma parcela futura encontrada</p>
              <p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">Este item já é a última parcela ou não tem série de parcelamento.</p>
            </div>
          ) : (
            <div className="space-y-3 pb-2">
              {installments.map((installment) => (
                <div
                  key={installment.index}
                  className="themed-card rounded-[16px] p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-[#1A1D23] dark:text-[var(--color-text-primary)]">
                          Parcela
                        </p>
                        <span className="shrink-0 rounded-full bg-[#FEF1D6] px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-[#B57922] dark:bg-[#B57922]/18 dark:text-[#F0B45F]">
                          {installment.index}/{installment.total}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-[#6B7280] dark:text-[var(--color-text-tertiary)]">
                        {formatDateFull(installment.date)}
                      </p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-[#E07070] shadow-sm dark:bg-[var(--color-surface)] dark:text-[#E07070]">
                      {formatCurrency(installment.amount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
