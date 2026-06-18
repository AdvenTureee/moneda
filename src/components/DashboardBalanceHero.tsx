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
type HeroTone = 'neutral' | 'warning' | 'success';
type HeroActionVariant = 'primary' | 'secondary';
type HeroActionIcon = 'arrow' | 'search' | 'plus';

const TIP_WIDTH = 256;
const VIEWPORT_MARGIN = 16;

interface HeroAction {
  href: string;
  label: string;
  variant: HeroActionVariant;
  icon: HeroActionIcon;
  ariaLabel?: string;
}

interface HeroModel {
  label: string;
  amount: number;
  ariaLabel: string;
  tone: HeroTone;
  description: string;
  badge?: {
    label: string;
    variant: 'warning' | 'success';
  };
  actions: HeroAction[];
}

const MO_SPEAKING_MS = 500;

function actionIcon(icon: HeroActionIcon) {
  if (icon === 'search') return <MagnifyingGlass size={14} weight="bold" className="shrink-0 opacity-75" />;
  if (icon === 'plus') return <Plus size={14} weight="bold" className="shrink-0 opacity-80" />;
  return <ArrowRight size={14} weight="bold" className="shrink-0" />;
}


function actionClassName(variant: HeroActionVariant, hasMultipleActions: boolean) {
  const layout = hasMultipleActions
    ? 'inline-flex flex-[0_0_auto]'
    : 'inline-flex';
  const base = `${layout} min-h-11 min-w-0 items-center justify-center gap-1.5 rounded-[14px] px-2.5 py-2 text-center text-xs font-semibold transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)] focus-visible:ring-offset-2 min-[390px]:px-3 sm:text-sm`;

  return `${base} border border-transparent px-1.5 text-[var(--color-text-secondary)] hover:bg-[color-mix(in_srgb,var(--color-surface)_64%,transparent)] hover:text-[var(--color-text-primary)] active:text-[var(--color-text-primary)] min-[390px]:px-2`;
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
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
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

  const heroModel: HeroModel = useMemo(() => {
    if (budgetState === 'overBudget') {
      return {
        label: 'Acima do orçamento',
        amount: Math.abs(remaining),
        ariaLabel: `Acima do orçamento: ${formatCurrency(Math.abs(remaining))}`,
        tone: 'warning',
        description: 'Revise os gastos acima da meta ou registre uma entrada.',
        badge: { label: 'Acima do orçamento', variant: 'warning' },
        actions: [
          {
            href: `/feed?period=${period}&focus=overspend`,
            label: 'Revisar gastos',
            variant: 'primary',
            icon: 'search',
          },
          {
            href: '/perfil/ganhos?modal=add',
            label: 'Cadastrar ganho',
            variant: 'secondary',
            icon: 'plus',
            ariaLabel: 'Cadastrar ganho para abater o orçamento',
          },
        ],
      };
    }

    if (budgetState === 'recovered') {
      return {
        label: 'Saldo do mês',
        amount: effectiveBalance,
        ariaLabel: `Saldo: ${formatCurrency(effectiveBalance)}`,
        tone: 'success',
        description: 'Uma entrada compensou o excesso deste mês.',
        badge: { label: 'Orçamento reequilibrado', variant: 'success' },
        actions: [
          {
            href: `/feed?period=${period}`,
            label: 'Ver impacto da entrada',
            variant: 'primary',
            icon: 'arrow',
          },
        ],
      };
    }

    if (budgetState === 'warning') {
      return {
        label: 'Dinheiro restante',
        amount: remaining,
        ariaLabel: `Restante: ${formatCurrency(remaining)}`,
        tone: 'neutral',
        description: 'Revise os extras antes de passar da meta.',
        badge: { label: 'Cuidado', variant: 'warning' },
        actions: [
          {
            href: `/feed?period=${period}`,
            label: 'Revisar gastos',
            variant: 'primary',
            icon: 'arrow',
          },
        ],
      };
    }

    return {
      label: 'Dinheiro restante',
      amount: remaining,
      ariaLabel: `Restante: ${formatCurrency(remaining)}`,
      tone: 'neutral',
      description: 'Você ainda tem margem neste mês.',
      actions: [
        {
          href: `/feed?period=${period}`,
          label: 'Ver gastos do mês',
          variant: 'primary',
          icon: 'arrow',
        },
      ],
    };
  }, [budgetState, effectiveBalance, period, remaining]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updateCoords = () => {
    if (buttonRef.current && showTip) {
      const rect = buttonRef.current.getBoundingClientRect();
      const preferredLeft = rect.left + rect.width / 2 - TIP_WIDTH + 26;
      const maxLeft = window.innerWidth - TIP_WIDTH - VIEWPORT_MARGIN;
      setCoords({
        top: Math.max(VIEWPORT_MARGIN, rect.top - 10),
        left: Math.max(VIEWPORT_MARGIN, Math.min(preferredLeft, maxLeft)),
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
    <section className="mt-5 mb-4 px-2 animate-fade-up delay-1" aria-label="Status do orçamento">
      <div className="dashboard-balance-hero">
        <div className="flex items-center justify-between">
          <div className="themed-card bg-white rounded-[14px] p-4 w-fit">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-tertiary)]">
              {heroModel.badge ? (
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                    heroModel.badge.variant === 'success'
                      ? 'bg-[var(--color-success)]'
                      : 'bg-[var(--color-warning)]'
                  }`}
                  aria-hidden
                />
              ) : null}
              {heroModel.label}
            </p>
            <p
              className={`min-w-0 text-[32px] font-extrabold leading-none tabular-nums tracking-tight text-[var(--color-text-primary)] min-[390px]:text-[34px] lg:text-[36px]`}
              aria-label={heroModel.ariaLabel}
              style={{ textShadow: '0 1px 2px rgba(0,0,0,0.06)' }}
            >
              {formatCurrency(heroModel.amount)}
            </p>
          </div>
          <div className="dashboard-balance-hero__mo-zone">
            <button
              ref={buttonRef}
              type="button"
              onClick={handleMoClick}
              className="dashboard-balance-hero__mo-button relative block rounded-full outline-none transition-transform duration-150 active:scale-95 focus-visible:ring-2 focus-visible:ring-[#A8C5E0] focus-visible:ring-offset-2"
              aria-label="Mostrar dica da Mo"
            >
              <TrackedMascot
                variant={budgetState === 'healthy' || budgetState === 'recovered' ? 'happy' : 'idle'}
                speaking={moSpeaking}
                className="dashboard-balance-hero__mo drop-shadow-[0_10px_18px_rgba(15,23,42,0.16)]"
              />
            </button>
          </div>
        </div>
        <div className="dashboard-balance-hero__actions mt-6 flex flex-nowrap items-center justify-center gap-2">
          {heroModel.actions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className={actionClassName(action.variant, heroModel.actions.length > 1)}
              aria-label={action.ariaLabel}
            >
              {actionIcon(action.icon)}
              <span className="truncate">{action.label}</span>
            </Link>
          ))}
        </div>

        {/* ── PORTAL DA DICA DA MO (Centralização Corrigida) ── */}
        {mounted && showTip && coords && createPortal(
          <div
            className="dashboard-balance-hero__tip fixed"
            style={{
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              transform: 'translateY(-100%)',
              width: `${TIP_WIDTH}px`,
              maxWidth: `calc(100vw - ${VIEWPORT_MARGIN * 2}px)`,
            }}
          >
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
          </div>,
          document.body
        )}

      </div>
    </section>
  );
}
