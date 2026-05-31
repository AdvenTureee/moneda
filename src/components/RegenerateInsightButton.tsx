'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowsClockwise } from '@phosphor-icons/react';
import { isClosedMonthlyPeriod } from '@/lib/utils';

interface RegenerateInsightButtonProps {
  period: string;
  hasInsight: boolean;
  hideHeading?: boolean;
  variant?: 'default' | 'card';
}

export default function RegenerateInsightButton({
  period,
  hasInsight,
  hideHeading = false,
  variant = 'default',
}: RegenerateInsightButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const isClosed = isClosedMonthlyPeriod(period);

  async function handleClick() {
    if (!isClosed) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? 'Erro ao gerar análise.');
        return;
      }
      router.refresh();
    } catch {
      setError('Erro ao conectar com o servidor.');
    } finally {
      setLoading(false);
    }
  }

  const btnClass = variant === 'card'
    ? 'inline-flex min-h-8 min-w-[118px] items-center justify-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-extrabold text-[#2E7D5B] transition-all duration-150 hover:bg-white active:scale-95 disabled:cursor-not-allowed disabled:opacity-75 sm:min-h-9 sm:min-w-[136px] sm:gap-2 sm:px-3.5 sm:py-2 sm:text-sm'
    : 'inline-flex min-h-11 items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-full bg-[#5BBF8E] text-white active:scale-95 transition-all duration-75 disabled:opacity-40 hover:brightness-105';

  const btnShadow = variant === 'card'
    ? '0 4px 14px rgba(0,0,0,0.12)'
    : '0 4px 14px rgba(91, 191, 142, 0.3)';

  const contentClass = variant === 'card'
    ? 'flex min-w-0 flex-wrap items-center justify-end gap-x-2 gap-y-1.5'
    : 'flex flex-wrap items-center justify-end gap-2';

  const buttonLabel = loading
    ? 'Gerando…'
    : !isClosed
      ? 'Mês aberto'
      : hasInsight
        ? 'Regenerar'
        : 'Gerar';

  const content = (
    <div className={contentClass}>
      {error && (
        <span className="text-xs text-[#E07070]" role="alert">
          {error}
        </span>
      )}
      {!isClosed && variant !== 'card' && (
        <span className="text-xs text-[#6B7280]">
          Disponível quando o mês fechar.
        </span>
      )}
      <button
        type="button"
        onClick={handleClick}
        disabled={loading || !isClosed}
        className={btnClass}
        style={{ boxShadow: btnShadow }}
        aria-label={
          isClosed
            ? hasInsight ? 'Regenerar resumo do mês' : 'Gerar resumo do mês'
            : 'Resumo do mês disponível quando o mês fechar'
        }
      >
        <ArrowsClockwise
          size={16}
          weight="bold"
          className={loading ? 'animate-spin' : ''}
        />
        {buttonLabel}
      </button>
    </div>
  );

  if (hideHeading) return content;

  return (
    <div className="flex items-center justify-between mb-2">
      <h2 className="text-base font-heading text-[#1A1D23]">Resumo do mês</h2>
      {content}
    </div>
  );
}
