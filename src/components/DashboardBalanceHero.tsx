'use client';

import { useState } from 'react';
import Link from 'next/link';
import TrackedMascot from '@/components/TrackedMascot';
import MoTipBubble from '@/components/MoTipBubble';
import { formatCurrency } from '@/lib/utils';

interface DashboardBalanceHeroProps {
  remaining: number;
  period: string;
}

export default function DashboardBalanceHero({
  remaining,
  period,
}: DashboardBalanceHeroProps) {
  const [showTip, setShowTip] = useState(false);
  const [tipAdvanceToken, setTipAdvanceToken] = useState(0);
  const isNegative = remaining < 0;

  function handleMoClick() {
    setShowTip(true);
    setTipAdvanceToken((current) => current + 1);
  }

  return (
    <section className="mb-4 animate-fade-up delay-1" aria-label="Dinheiro restante">
      <div className="dashboard-balance-hero relative grid items-end gap-2 overflow-visible rounded-[18px] py-1">
        <div className="relative z-10 min-w-0 pb-2 pt-8">
          <p className="mb-1 text-xs font-medium text-[#6B7280]">
            Dinheiro restante
          </p>
          <p
            className={`font-extrabold tabular-nums leading-none ${
              isNegative
                ? 'text-[34px] min-[390px]:text-[38px]'
                : 'text-[36px] min-[390px]:text-[40px]'
            }`}
            style={{ color: isNegative ? 'var(--color-error)' : 'var(--color-text-primary)' }}
            aria-label={
              isNegative
                ? `Estourou em ${formatCurrency(Math.abs(remaining))}`
                : `Restante: ${formatCurrency(remaining)}`
            }
          >
            {isNegative ? 'Estourou!' : formatCurrency(remaining)}
          </p>
          {isNegative && (
            <div className="mt-2 space-y-2">
              <p className="text-xs font-medium text-[#E07070]">
                -{formatCurrency(Math.abs(remaining))}
              </p>
              <Link
                href="/perfil/ganhos"
                className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-[#FDF0F0] px-3.5 py-2 text-xs font-bold text-[#B14C4C] transition-colors hover:bg-[#F8E4E4]"
                aria-label="Cadastrar ganho para abater o estouro"
              >
                Cadastrar ganho
                <span aria-hidden>›</span>
              </Link>
            </div>
          )}
        </div>

        <div className="dashboard-balance-hero__mo-zone relative">
          {showTip && (
            <div className="dashboard-balance-hero__tip absolute z-20">
              <MoTipBubble
                period={period}
                variant="overlay"
                onDismiss={() => setShowTip(false)}
                advanceToken={tipAdvanceToken}
                autoRotate={false}
                startWithTip
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
              variant={isNegative ? 'sad' : 'happy'}
              size={94}
              className="dashboard-balance-hero__mo drop-shadow-[0_10px_18px_rgba(15,23,42,0.16)]"
            />
          </button>
        </div>
      </div>
    </section>
  );
}
