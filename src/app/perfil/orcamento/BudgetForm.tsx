'use client';

import { useState, useTransition, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, WarningCircle } from '@phosphor-icons/react';
import Icon from '@/components/Icon';
import { CATEGORIES } from '@/data/mock';
import { formatCurrency } from '@/lib/utils';
import { saveCategoryBudgetAction } from '../actions-finance';
import type { Budget } from '@/types';

interface BudgetFormProps {
  initialBudgets: Budget[];
  period: string;
}

type Feedback = { kind: 'success' | 'error'; text: string } | null;

export default function BudgetForm({ initialBudgets, period }: BudgetFormProps) {
  // Map categoryId to cents
  const [budgetsMap, setBudgetsMap] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    CATEGORIES.forEach((cat) => {
      const b = initialBudgets.find((x) => x.categoryId === cat.id);
      initial[cat.id] = b ? b.amountCents : 0;
    });
    return initial;
  });

  const [hasChanges, setHasChanges] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [saving, startSaving] = useTransition();

  // Clear feedback after 3 seconds on success
  useEffect(() => {
    if (feedback?.kind === 'success') {
      const timer = setTimeout(() => setFeedback(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  function formatPeriod(p: string) {
    const [year, month] = p.split('-').map(Number);
    // JS Months are 0-indexed
    const date = new Date(year, month - 1, 1);
    const formatted = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }

  const handleAmountChange = (catId: string, raw: string) => {
    // Only allow digits
    const digits = raw.replace(/\D/g, '');
    const cents = digits ? parseInt(digits, 10) : 0;
    
    setBudgetsMap((prev) => ({
      ...prev,
      [catId]: cents,
    }));
    setHasChanges(true);
    setFeedback(null);
  };

  const totalPlanned = Object.values(budgetsMap).reduce((sum, val) => sum + val, 0);

  const handleSaveAll = () => {
    setFeedback(null);
    startSaving(async () => {
      try {
        const promises = CATEGORIES.map((cat) => {
          const cents = budgetsMap[cat.id] ?? 0;
          return saveCategoryBudgetAction(cat.id, cents, period);
        });

        const results = await Promise.all(promises);
        const errorResult = results.find((r) => !r.ok);

        if (errorResult && 'error' in errorResult) {
          setFeedback({ kind: 'error', text: errorResult.error });
        } else {
          setFeedback({ kind: 'success', text: 'Orçamentos salvos com sucesso!' });
          setHasChanges(false);
        }
      } catch (err: any) {
        setFeedback({ kind: 'error', text: err.message || 'Erro inesperado ao salvar.' });
      }
    });
  };

  return (
    <div className="max-w-lg mx-auto px-4 pb-28">
      {/* Header */}
      <div className="flex items-center gap-3 py-5 mb-2">
        <Link
          href="/perfil"
          className="p-2 hover:bg-[#F1F3F7] rounded-full transition-colors"
          aria-label="Voltar para Perfil"
        >
          <ArrowLeft size={20} className="text-[#1A1D23]" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-[#1A1D23]">Definir Orçamento</h1>
          <p className="text-xs text-[#6B7280]">Período de {formatPeriod(period)}</p>
        </div>
      </div>

      {/* Planned Limit Card */}
      <div
        className="bg-gradient-to-br from-[#5BBF8E] to-[#4AA77C] text-white rounded-[20px] p-5 mb-6 shadow-md transition-all duration-300"
        style={{
          boxShadow: '0 8px 24px rgba(91, 191, 142, 0.25)',
        }}
      >
        <p className="text-xs font-semibold uppercase tracking-wider opacity-85">Limite Planejado Total</p>
        <p className="text-3xl font-extrabold mt-1.5 tabular-nums">
          {formatCurrency(totalPlanned)}
        </p>
        <p className="text-xs opacity-75 mt-2">
          Esta é a soma total planejada dos orçamentos de todas as categorias.
        </p>
      </div>

      {/* Category List */}
      <div className="space-y-3 mb-8">
        {CATEGORIES.map((cat) => {
          const valueCents = budgetsMap[cat.id] ?? 0;
          const displayValue = valueCents > 0
            ? new Intl.NumberFormat('pt-BR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }).format(valueCents / 100)
            : '';

          return (
            <div
              key={cat.id}
              className="bg-white rounded-[16px] p-4 flex items-center justify-between gap-4 border border-[#F1F3F7] transition-all hover:border-[#E5E7EB]"
              style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                  style={{
                    backgroundColor: `${cat.color}18`,
                    color: cat.color,
                  }}
                >
                  <Icon name={cat.icon} size={20} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[#1A1D23] truncate">{cat.name}</p>
                  <p className="text-[11px] text-[#9CA3AF] truncate">Limite planejado</p>
                </div>
              </div>

              {/* Price input field */}
              <div className="w-32 shrink-0">
                <div className="flex items-center gap-1 border border-[#E5E7EB] rounded-[12px] px-3 py-2 bg-[#F8F9FB] focus-within:border-[#A8C5E0] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#A8C5E0]/15 transition-all">
                  <span className="text-xs font-bold text-[#9CA3AF]">R$</span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={displayValue}
                    onChange={(e) => handleAmountChange(cat.id, e.target.value)}
                    placeholder="0,00"
                    className="w-full text-right text-sm font-semibold text-[#1A1D23] bg-transparent outline-none tabular-nums placeholder:text-[#9CA3AF]"
                    aria-label={`Limite para ${cat.name}`}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Sticky Bottom Actions Container */}
      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white to-transparent pt-6 pb-8 px-4 z-40">
        <div className="max-w-lg mx-auto">
          <button
            onClick={handleSaveAll}
            disabled={saving || !hasChanges}
            className="w-full bg-[#1A1D23] hover:bg-[#2A2E37] text-white font-bold py-4 rounded-full transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
            style={{
              boxShadow: '0 6px 20px rgba(26, 29, 35, 0.15)',
            }}
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Salvando...
              </span>
            ) : (
              'Salvar Orçamentos'
            )}
          </button>
        </div>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div
          role={feedback.kind === 'error' ? 'alert' : 'status'}
          className={`fixed bottom-24 left-4 right-4 z-50 rounded-[16px] px-5 py-4 shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-300 ${
            feedback.kind === 'success'
              ? 'bg-[#EEF9F4] text-[#2E7D5B] border border-[#D1EBDD]'
              : 'bg-[#FDF0F0] text-[#B14C4C] border border-[#F4D7D7]'
          }`}
        >
          <div className="flex items-center gap-3">
            {feedback.kind === 'success' ? (
              <Check size={18} className="shrink-0" />
            ) : (
              <WarningCircle size={18} className="shrink-0" />
            )}
            <p className="font-semibold text-sm">{feedback.text}</p>
          </div>
        </div>
      )}
    </div>
  );
}
