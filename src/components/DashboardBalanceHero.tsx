'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import TrackedMascot from '@/components/TrackedMascot';
import MoTipBubble from '@/components/MoTipBubble';
import { getSessionGreeting } from '@/data/moTips';
import { formatCurrency } from '@/lib/utils';
import { ArrowRight, MagnifyingGlass, Plus } from '@phosphor-icons/react';

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

  const buttonRef = useRef<HTMLButtonElement>(null);
  const [coords, setCoords] = useState<{ top: number; right: number } | null>(null);
  const [mounted, setMounted] = useState(false);

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
    setMounted(true);
  }, []);

  const updateCoords = () => {
    if (buttonRef.current && showTip) {
      const rect = buttonRef.current.getBoundingClientRect();
      setCoords({
        top: rect.top - 8,
        right: window.innerWidth - rect.right,
      });
    }
  };

  useEffect(() => {
    if (showTip) {
      updateCoords();
      window.addEventListener('resize', updateCoords);
      window.addEventListener('scroll', updateCoords);
    }
    return () => {
      window.removeEventListener('resize', updateCoords);
      window.removeEventListener('scroll', updateCoords);
    };
  }, [showTip, budgetState]);

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
    <section className="mt-1 mb-4 animate-fade-up delay-1" aria-label="Status do orçamento">
      <div
        className="dashboard-balance-hero relative overflow-visible rounded-[18px]"
      >
        <div className="dashboard-balance-hero__content relative z-10 min-w-0 pb-2">

          {/* ── HEALTHY ── */}
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
                  className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full bg-[var(--color-brand-blue)] px-4 py-2.5 text-xs sm:text-sm font-bold text-white transition-colors hover:bg-[var(--color-brand-blue-dark)]"
                >
                  <span className="sm:hidden">Ver Gastos</span>
                  <span className="hidden sm:inline">Ver gastos do mês</span>
                  <ArrowRight size={14} weight="bold" className="shrink-0" />
                </Link>
              </div>
            </>
          )}

          {/* ── WARNING ── */}
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
                  className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full bg-[var(--color-brand-blue)] px-4 py-2.5 text-xs sm:text-sm font-bold text-white transition-colors hover:bg-[var(--color-brand-blue-dark)]"
                >
                  <span className="sm:hidden">Revisar Gastos</span>
                  <span className="hidden sm:inline">Revisar gastos</span>
                  <ArrowRight size={14} weight="bold" className="shrink-0" />
                </Link>
              </div>
            </div>
          )}

          {/* ── OVER BUDGET ── */}
          {budgetState === 'overBudget' && (
            <div>
              <div className="dashboard-balance-hero__summary">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <p className="text-xs font-medium text-[#6B7280]">
                    Orçamento do mês
                  </p>
                  <StatusBadge label="Acima" variant="warning" />
                </div>
                <p className="text-[32px] font-extrabold tabular-nums leading-none text-[var(--color-warning)] mb-2">
                  {formatCurrency(Math.abs(remaining))}
                </p>
              </div>
              <p className="mt-3 max-w-[24ch] min-[390px]:max-w-[30ch] sm:max-w-none text-sm leading-relaxed text-[var(--color-text-secondary)]">
                Seus gastos excederam o orçamento. Veja os detalhes ou ajuste.
              </p>
              <div className="dashboard-balance-hero__actions mt-4 flex flex-row gap-1.5">
                <Link
                  href={`/feed?period=${period}&focus=overspend`}
                  className="flex flex-1 min-w-0 min-h-10 items-center justify-center gap-1 rounded-full bg-[#B7CCE4] px-2 py-2.5 text-xs sm:px-4 sm:text-sm font-bold text-[#16324A] transition-colors hover:bg-[#A8BDDB] text-center whitespace-nowrap"
                >
                  <MagnifyingGlass size={13} weight="bold" className="shrink-0 opacity-80" />
                  <span className="sm:hidden">Detalhes</span>
                  <span className="hidden sm:inline">Ver onde estourou</span>
                  <ArrowRight size={13} weight="bold" className="hidden sm:inline shrink-0 opacity-60" />
                </Link>
                <Link
                  href="/perfil/ganhos?modal=add"
                  className="flex flex-1 min-w-0 min-h-10 items-center justify-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-2 py-2.5 text-xs sm:px-4 sm:text-sm font-semibold text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-brand-blue)] hover:bg-[var(--color-surface)] text-center whitespace-nowrap"
                  aria-label="Cadastrar ganho para abater o orçamento"
                >
                  <Plus size={13} weight="bold" className="shrink-0 opacity-80" />
                  <span className="sm:hidden">Ganho</span>
                  <span className="hidden sm:inline">Cadastrar ganho</span>
                </Link>
              </div>
            </div>
          )}

          {/* ── RECOVERED ── */}
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
                  className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full bg-[var(--color-brand-blue)] px-4 py-2.5 text-xs sm:text-sm font-bold text-white transition-colors hover:bg-[var(--color-brand-blue-dark)]"
                >
                  <span className="sm:hidden">Ver Impacto</span>
                  <span className="hidden sm:inline">Ver impacto da entrada</span>
                  <ArrowRight size={14} weight="bold" className="shrink-0" />
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* ── ZONE DA MASCOTE ── */}
        <div className="dashboard-balance-hero__mo-zone absolute bottom-0 right-0 z-20">
          <button
            ref={buttonRef}
            type="button"
            onClick={handleMoClick}
            className="dashboard-balance-hero__mo-button relative block outline-none transition-transform duration-150 active:scale-95 focus-visible:ring-2 focus-visible:ring-[#A8C5E0] focus-visible:ring-offset-2 rounded-full"
            aria-label="Mostrar dica da Mo"
          >
            <TrackedMascot
              variant={budgetState === 'healthy' || budgetState === 'recovered' ? 'happy' : 'idle'}
              size={budgetState === 'overBudget' ? 88 : 130}
              speaking={moSpeaking}
              className="dashboard-balance-hero__mo drop-shadow-[0_10px_18px_rgba(15,23,42,0.16)]"
            />
          </button>
        </div>

        {/* ── PORTAL DA DICA DA MO (Centralização Corrigida) ── */}
        {mounted && showTip && coords && createPortal(
          <div
            className="dashboard-balance-hero__tip fixed"
            style={{
              top: `${coords.top}px`,
              right: `${coords.right}px`,
              transform: 'translate(12px, -100%)',
              width: 'max-content',
              maxWidth: 'calc(100vw - 2rem)',
              zIndex: 99999,
            }}
          >
            <MoTipBubble
              period={period}
              variant="default"
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
          </div>,
          document.body
        )}

      </div>
    </section>
  );
}
