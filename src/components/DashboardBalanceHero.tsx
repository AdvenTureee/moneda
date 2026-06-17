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
      <svg width="6" height="6" viewBox="0 0 6 6" className="shrink-0" aria-hidden="true">
        <circle cx="3" cy="3" r="3" fill="currentColor" />
      </svg>
      {label}
    </span>
  );
}

function actionIcon(icon: HeroActionIcon) {
  if (icon === 'search') return <MagnifyingGlass size={14} weight="bold" className="shrink-0 opacity-75" />;
  if (icon === 'plus') return <Plus size={14} weight="bold" className="shrink-0 opacity-80" />;
  return <ArrowRight size={14} weight="bold" className="shrink-0" />;
}

function amountToneClass(tone: HeroTone) {
  if (tone === 'warning') return 'text-[var(--color-warning)]';
  if (tone === 'success') return 'text-[var(--color-success)]';
  return 'text-[var(--color-text-primary)]';
}

function actionClassName(variant: HeroActionVariant, hasMultipleActions: boolean) {
  const layout = hasMultipleActions ? 'flex flex-1' : 'inline-flex';
  const base = `${layout} min-h-11 min-w-0 items-center justify-center gap-1.5 rounded-[14px] border px-2.5 py-2 text-center text-xs font-semibold transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)] focus-visible:ring-offset-2 min-[390px]:px-3 sm:text-sm`;

  if (variant === 'primary') {
    return `${base} border-[color-mix(in_srgb,var(--color-brand-blue)_48%,var(--color-border)_52%)] bg-[color-mix(in_srgb,var(--color-brand-blue)_18%,var(--color-surface)_82%)] text-[var(--color-text-primary)] hover:bg-[color-mix(in_srgb,var(--color-brand-blue)_24%,var(--color-surface)_76%)] active:bg-[color-mix(in_srgb,var(--color-brand-blue)_30%,var(--color-surface)_70%)]`;
  }

  return `${base} border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-focus)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text-primary)] active:bg-[var(--color-surface-alt)]`;
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
        badge: { label: 'Acima', variant: 'warning' },
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
        badge: { label: 'Cuidado: orçamento próximo do limite', variant: 'warning' },
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
    <section className="mt-1 mb-3 animate-fade-up delay-1" aria-label="Status do orçamento">
      <div className="dashboard-balance-hero">
        <div className="dashboard-balance-hero__content relative z-10 min-w-0">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-tertiary)]">
            {heroModel.label}
          </p>
          <p
            className={`text-[30px] font-extrabold leading-none tabular-nums min-[390px]:text-[34px] lg:text-[36px] ${amountToneClass(heroModel.tone)}`}
            aria-label={heroModel.ariaLabel}
          >
            {formatCurrency(heroModel.amount)}
          </p>
          {heroModel.badge ? (
            <div className="mt-1.5">
              <StatusBadge label={heroModel.badge.label} variant={heroModel.badge.variant} />
            </div>
          ) : null}
          <div className="dashboard-balance-hero__middle">
            <p className="min-w-0 max-w-[27ch] text-sm leading-snug text-[var(--color-text-secondary)]">
              {heroModel.description}
            </p>
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
          <div className="dashboard-balance-hero__actions mt-2 flex flex-nowrap gap-2">
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
