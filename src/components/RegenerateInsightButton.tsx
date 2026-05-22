'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowsClockwise } from '@phosphor-icons/react';

interface RegenerateInsightButtonProps {
  period: string;
  hasInsight: boolean;
}

export default function RegenerateInsightButton({
  period,
  hasInsight,
}: RegenerateInsightButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleClick() {
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

  return (
    <div className="flex items-center justify-between mb-2">
      <h2 className="text-base font-heading text-[#1A1D23]">Resumo do mês</h2>
      <div className="flex items-center gap-2">
        {error && (
          <span className="text-xs text-[#E07070]" role="alert">
            {error}
          </span>
        )}
        <button
          type="button"
          onClick={handleClick}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-full bg-[#5BBF8E] text-white active:scale-95 transition-all duration-75 disabled:opacity-40 hover:brightness-105"
          style={{ boxShadow: '0 4px 14px rgba(91, 191, 142, 0.3)' }}
          aria-label={hasInsight ? 'Regenerar resumo do mês' : 'Gerar resumo do mês'}
        >
          <ArrowsClockwise
            size={12}
            weight="bold"
            className={loading ? 'animate-spin' : ''}
          />
          {loading ? 'Gerando…' : hasInsight ? 'Regenerar' : 'Gerar'}
        </button>
      </div>
    </div>
  );
}
