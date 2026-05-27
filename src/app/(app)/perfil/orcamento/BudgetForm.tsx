'use client';

import { useState, useTransition, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, MagnifyingGlass } from '@phosphor-icons/react';
import { useToast } from '@/components/ToastProvider';
import Icon from '@/components/Icon';
import { formatCurrency } from '@/lib/utils';
import { saveCategoryBudgetAction } from '../actions-finance';
import type { Budget, Category } from '@/types';

interface BudgetFormProps {
  initialBudgets: Budget[];
  period: string;
  initialCategories: Category[];
}

export default function BudgetForm({ initialBudgets, period, initialCategories }: BudgetFormProps) {
  const [categories] = useState<Category[]>(initialCategories);

  const [budgetsMap, setBudgetsMap] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    initialCategories.forEach((cat) => {
      const b = initialBudgets.find((x) => x.categoryId === cat.id);
      initial[cat.id] = b ? b.amountCents : 0;
    });
    return initial;
  });

  const [search, setSearch] = useState('');
  const filteredCategories = useMemo(
    () => categories.filter((cat) => cat.name.toLowerCase().includes(search.toLowerCase())),
    [categories, search]
  );

  const [hasChanges, setHasChanges] = useState(false);
  const { showToast } = useToast();
  const [saving, startSaving] = useTransition();

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
  };

  const totalPlanned = Object.values(budgetsMap).reduce((sum, val) => sum + val, 0);

  const handleSaveAll = () => {
    startSaving(async () => {
      try {
        const promises = categories.map((cat) => {
          const cents = budgetsMap[cat.id] ?? 0;
          return saveCategoryBudgetAction(cat.id, cents, period);
        });

        const results = await Promise.all(promises);
        const errorResult = results.find((r) => !r.ok);

        if (errorResult && 'error' in errorResult) {
          showToast('error', errorResult.error);
        } else {
          showToast('success', 'Orçamentos salvos com sucesso!');
          setHasChanges(false);
        }
      } catch (err: any) {
        showToast('error', err.message || 'Erro inesperado ao salvar.');
      }
    });
  };

  return (
    <div className="max-w-lg mx-auto px-4 pb-8 [scrollbar-gutter:stable]">
      {/* Header */}
      <div className="flex items-center gap-3 py-5 mb-2 animate-fade-up delay-0">
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
        className="ai-insight-banner text-white rounded-[20px] p-5 mb-6 shadow-md transition-all duration-300 animate-fade-up delay-1"
      >
        <p className="text-xs font-semibold uppercase tracking-wider opacity-85">Limite Planejado Total</p>
        <p className="text-3xl font-extrabold mt-1.5 tabular-nums">
          {formatCurrency(totalPlanned)}
        </p>
        <p className="text-xs opacity-75 mt-2">
          Esta é a soma total planejada dos orçamentos de todas as categorias.
        </p>
      </div>

      {/* Search Bar */}
      <div className="relative mb-4 animate-fade-up delay-2">
        <MagnifyingGlass
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]"
          aria-hidden
        />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar categoria..."
          className="themed-field w-full pl-9 pr-4 py-2.5 rounded-[10px] bg-white border border-[#E5E7EB] text-sm text-[#1A1D23] placeholder:text-[#9CA3AF] outline-none focus:border-[#A8C5E0] transition-colors"
          aria-label="Buscar categorias"
        />
      </div>

      {/* Category List */}
      <div className="space-y-3 mb-8 animate-fade-up delay-3">
        {filteredCategories.map((cat) => {
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
              className="themed-card bg-white rounded-[16px] p-4 flex items-center justify-between gap-4 border border-[#F1F3F7] transition-all hover:border-[#E5E7EB]"
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
                <div className="themed-field flex items-center gap-1 border border-[#E5E7EB] rounded-[12px] px-3 py-2 bg-[#F8F9FB] focus-within:border-[#A8C5E0] focus-within:ring-2 focus-within:ring-[#A8C5E0]/15 transition-all">
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

      {/* Empty search state */}
      {search && filteredCategories.length === 0 && (
        <div className="flex flex-col items-center py-12 text-center">
          <MagnifyingGlass size={36} className="text-[#9CA3AF] mb-3 opacity-40" />
          <p className="text-sm font-semibold text-[#1A1D23]">Nenhuma categoria encontrada</p>
          <p className="text-xs text-[#6B7280] mt-1">Tente buscar por outro termo.</p>
        </div>
      )}

      {/* Bottom Actions */}
      <div className="mt-6 animate-fade-up delay-4">
        <button
          onClick={handleSaveAll}
          disabled={saving || !hasChanges}
          className="w-full bg-[#5BBF8E] hover:bg-[#4AA77C] active:bg-[#3FA876] text-white font-bold py-4 rounded-full transition-colors duration-150 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          style={{
            boxShadow: '0 6px 20px rgba(91, 191, 142, 0.35)',
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
  );
}
