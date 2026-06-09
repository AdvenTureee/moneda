'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import TrackedMascot from '@/components/TrackedMascot';
import MoTipBubble from '@/components/MoTipBubble';
import { getSessionGreeting } from '@/data/moTips';
import { formatCurrency } from '@/lib/utils';

interface DashboardBalanceHeroProps {
  budgetTotal: number;
  expensesTotal: number;
  incomeTotal: number;
  period: string;
  displayName?: string | null;
}

type BudgetState = 'healthy' | 'warning' | 'overBudget' | 'recovered';

const MO_SPEAKING_MS = 500;

function StatusBadge({ label, variant = 'warning' }: { label: string; variant?: 'warning' | 'success' }) {
  const isWarning = variant === 'warning';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${
        isWarning
          ? 'bg-[var(--color-warning-bg)] text-[var(--color-warning)] ring-[color-mix(in_srgb,var(--color-warning)_20%,transparent)]'
          : 'bg-[var(--color-success-bg)] text-[var(--color-success)] ring-[color-mix(in_srgb,var(--color-success)_20%,transparent)]'
      }`}
    >
      <span className="select-none" aria-hidden="true">●</span>
      {label}
    </span>
  );
}

export default function DashboardBalanceHero({
  budgetTotal,
  expensesTotal,
  incomeTotal,
  period,
  displayName,
}: DashboardBalanceHeroProps) {
  const [showTip, setShowTip] = useState(false);
  const [tipMode, setTipMode] = useState<'session' | 'tip'>('tip');
  const [tipAdvanceToken, setTipAdvanceToken] = useState(0);
  const [moSpeaking, setMoSpeaking] = useState(false);
  const speakingTimerRef = useRef<number | null>(null);
  const sessionGreeting = useMemo(() => getSessionGreeting(displayName), [displayName]);

  const remaining = budgetTotal - expensesTotal;
  const effectiveBalance = budgetTotal + incomeTotal - expensesTotal;
  const percentUsed = budgetTotal > 0 ? (expensesTotal / budgetTotal) * 100 : 0;

  const budgetState: BudgetState = remaining < 0 && effectiveBalance < 0
    ? 'overBudget'
    : remaining < 0 && effectiveBalance >= 0
      ? 'recovered'
      : percentUsed >= 80
        ? 'warning'
        : 'healthy';

  useEffect(() => {
    const key = 'moneda:mo-session-greeting-shown';
    if (window.sessionStorage.getItem(key) === '1') return;
    window.sessionStorage.setItem(key, '1');
    setTipMode('session');
    setShowTip(true);
  }, []);

  useEffect(() => {
    return () => {
      if (speakingTimerRef.current !== null) {
        window.clearTimeout(speakingTimerRef.current);
      }
    };
  }, []);

  function handleMoClick() {
    setTipMode('tip');
    setShowTip(true);
    setTipAdvanceToken((current) => current + 1);
    setMoSpeaking(true);
    if (speakingTimerRef.current !== null) {
      window.clearTimeout(speakingTimerRef.current);
    }
    speakingTimerRef.current = window.setTimeout(() => {
      setMoSpeaking(false);
      speakingTimerRef.current = null;
    }, MO_SPEAKING_MS);
  }

  return (
    <section className="mb-4 animate-fade-up delay-1" aria-label="Status do orçamento">
      <div className="dashboard-balance-hero relative grid items-end gap-2 overflow-visible rounded-[18px] py-1">
        <div className={`relative z-10 min-w-0 ${budgetState === 'overBudget' ? '' : 'pb-2'} pt-8`}>
          {budgetState === 'healthy' && (
            <>
              <p className="mb-1 text-xs font-medium text-[#6B7280]">
                Dinheiro restante
              </p>
              <p
                className="text-[36px] min-[390px]:text-[40px] font-extrabold tabular-nums leading-none text-[var(--color-text-primary)]"
                aria-label={`Restante: ${formatCurrency(remaining)}`}
              >
                {formatCurrency(remaining)}
              </p>
              <p className="mt-3 max-w-[30ch] text-sm leading-relaxed text-[var(--color-text-secondary)]">
                Você ainda tem margem neste mês.
              </p>
              <div className="mt-4">
                <Link
                  href={`/feed?period=${period}`}
                  className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full bg-[var(--color-brand-blue)] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[var(--color-brand-blue-dark)]"
                >
                  Ver gastos do mês
                  <span aria-hidden>→</span>
                </Link>
              </div>
            </>
          )}

          {budgetState === 'warning' && (
            <div>
              <p className="mb-1 text-xs font-medium text-[#6B7280]">
                Dinheiro restante
              </p>
              <p
                className="text-[36px] min-[390px]:text-[40px] font-extrabold tabular-nums leading-none text-[var(--color-text-primary)]"
                aria-label={`Restante: ${formatCurrency(remaining)}`}
              >
                {formatCurrency(remaining)}
              </p>
              <div className="mt-3">
                <StatusBadge label="Cuidado — orçamento próximo do limite" />
              </div>
              <p className="mt-3 max-w-[30ch] text-sm leading-relaxed text-[var(--color-text-secondary)]">
                Seus extras estão encostando na meta.
              </p>
              <div className="mt-4">
                <Link
                  href={`/feed?period=${period}`}
                  className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full bg-[var(--color-brand-blue)] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[var(--color-brand-blue-dark)]"
                >
                  Revisar gastos
                  <span aria-hidden>→</span>
                </Link>
              </div>
            </div>
          )}

          {budgetState === 'overBudget' && (
            <div>
              <p className="mb-1 text-xs font-medium text-[#6B7280]">
                Orçamento do mês
              </p>
              <p className="text-[24px] min-[390px]:text-[28px] font-extrabold tabular-nums leading-none text-[var(--color-warning)]">
                {formatCurrency(Math.abs(remaining))}
              </p>
              <div className="mt-3">
                <StatusBadge label="Acima do orçamento" />
              </div>
              <p className="mt-4 max-w-[30ch] text-sm leading-relaxed text-[var(--color-text-secondary)]">
                Seus gastos passaram da meta. Veja onde ajustar ou registre uma entrada.
              </p>
              <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
                <Link
                  href={`/feed?period=${period}`}
                  className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full bg-[var(--color-success)] px-4 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-80"
                >
                  Ver onde estourou
                  <span aria-hidden>→</span>
                </Link>
                <Link
                  href="/perfil/ganhos"
                  className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full bg-transparent px-4 py-2.5 text-sm font-medium text-[var(--color-text-tertiary)] transition-colors hover:text-[var(--color-text-primary)]"
                  aria-label="Cadastrar ganho para abater o estouro"
                >
                  Cadastrar ganho
                </Link>
              </div>
            </div>
          )}

          {budgetState === 'recovered' && (
            <div>
              <p className="mb-1 text-xs font-medium text-[#6B7280]">
                Saldo do mês
              </p>
              <p
                className="text-[36px] min-[390px]:text-[40px] font-extrabold tabular-nums leading-none text-[var(--color-success)]"
                aria-label={`Saldo: ${formatCurrency(effectiveBalance)}`}
              >
                {formatCurrency(effectiveBalance)}
              </p>
              <div className="mt-3">
                <StatusBadge label="Orçamento reequilibrado" variant="success" />
              </div>
              <p className="mt-3 max-w-[30ch] text-sm leading-relaxed text-[var(--color-text-secondary)]">
                A entrada ajudou a compensar o excesso deste mês.
              </p>
              <div className="mt-4">
                <Link
                  href={`/feed?period=${period}`}
                  className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full bg-[var(--color-brand-blue)] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[var(--color-brand-blue-dark)]"
                >
                  Ver impacto da entrada
                  <span aria-hidden>→</span>
                </Link>
              </div>
            </div>
          )}
        </div>

        <div className="dashboard-balance-hero__mo-zone relative">
          {showTip && (
            <div className="dashboard-balance-hero__tip absolute z-20">
              <MoTipBubble
                period={period}
                variant="overlay"
                onDismiss={() => {
                  setShowTip(false);
                  setMoSpeaking(false);
                }}
                advanceToken={tipAdvanceToken}
                autoRotate={false}
                autoDismissMs={tipMode === 'session' ? 9000 : 6800}
                initialTip={tipMode === 'session' ? sessionGreeting : undefined}
                fetchPersonalTips={tipMode !== 'session'}
              />
            </div>
          )}

          <button
            type="button"
            onClick={handleMoClick}
            className="dashboard-balance-hero__mo-button absolute bottom-0 right-0 z-10 rounded-full outline-none transition-transform duration-150 active:scale-95 focus-visible:ring-2 focus-visible:ring-[#A8C5E0] focus-visible:ring-offset-2"
            aria-label="Mostrar dica da Mo"
          >
            <TrackedMascot
              variant={budgetState === 'healthy' || budgetState === 'recovered' ? 'happy' : 'idle'}
              size={budgetState === 'overBudget' ? 60 : 94}
              speaking={moSpeaking}
              className="dashboard-balance-hero__mo drop-shadow-[0_10px_18px_rgba(15,23,42,0.16)]"
            />
          </button>
        </div>
      </div>
    </section>
  );
}
