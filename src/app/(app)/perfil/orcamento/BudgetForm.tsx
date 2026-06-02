'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowsClockwise,
  Broom,
  Calculator,
  CheckCircle,
  MagnifyingGlass,
} from '@phosphor-icons/react';
import { useToast } from '@/components/ToastProvider';
import Icon from '@/components/Icon';
import { formatCurrency } from '@/lib/utils';
import { formatBillingCycleLabel } from '@/lib/billingCycle';
import {
  BUDGET_PRESETS,
  distributeBudgetByPreset,
  roundBudgetValues,
  type BudgetPresetId,
} from '@/lib/budgetPresets';
import { saveCategoryBudgetsAction } from '../actions-finance';
import type { Budget, Category } from '@/types';

interface BudgetFormProps {
  initialBudgets: Budget[];
  period: string;
  billingClosingDay: number;
  initialCategories: Category[];
  monthlyBudgetCents: number;
}

function formatCentsInput(cents: number): string {
  if (cents <= 0) return '';
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function parseCentsInput(raw: string): number {
  const digits = raw.replace(/\D/g, '');
  return digits ? parseInt(digits, 10) : 0;
}

export default function BudgetForm({
  initialBudgets,
  period,
  billingClosingDay,
  initialCategories,
  monthlyBudgetCents,
}: BudgetFormProps) {
  const [categories] = useState<Category[]>(initialCategories);
  const initialDistributedCents = initialBudgets.reduce((sum, budget) => sum + budget.amountCents, 0);
  const initialMonthlyTotalCents = monthlyBudgetCents > 0 ? monthlyBudgetCents : initialDistributedCents;
  const [selectedPreset, setSelectedPreset] = useState<BudgetPresetId>('balanced');
  const [monthlyTotalCents, setMonthlyTotalCents] = useState(initialMonthlyTotalCents);
  const [monthlyTotalDisplay, setMonthlyTotalDisplay] = useState(formatCentsInput(initialMonthlyTotalCents));
  const [budgetsMap, setBudgetsMap] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    initialCategories.forEach((cat) => {
      const budget = initialBudgets.find((item) => item.categoryId === cat.id);
      initial[cat.id] = budget ? budget.amountCents : 0;
    });
    return initial;
  });
  const [search, setSearch] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, startSaving] = useTransition();
  const { showToast } = useToast();

  const filteredCategories = useMemo(
    () => categories.filter((cat) => cat.name.toLowerCase().includes(search.toLowerCase())),
    [categories, search],
  );

  const totalDistributed = Object.values(budgetsMap).reduce((sum, val) => sum + val, 0);
  const difference = monthlyTotalCents - totalDistributed;
  const isOver = difference < 0;

  function handleMonthlyTotalChange(raw: string) {
    const cents = parseCentsInput(raw);
    setMonthlyTotalCents(cents);
    setMonthlyTotalDisplay(formatCentsInput(cents));
    setHasChanges(true);
  }

  function handleAmountChange(categoryId: string, raw: string) {
    const cents = parseCentsInput(raw);
    setBudgetsMap((prev) => ({ ...prev, [categoryId]: cents }));
    setHasChanges(true);
  }

  function applyPreset(presetId: BudgetPresetId = selectedPreset) {
    setSelectedPreset(presetId);
    setBudgetsMap(distributeBudgetByPreset(categories, monthlyTotalCents, presetId));
    setHasChanges(true);
  }

  function clearBudgets() {
    setBudgetsMap(Object.fromEntries(categories.map((category) => [category.id, 0])));
    setHasChanges(true);
  }

  function roundBudgets() {
    setBudgetsMap((prev) => roundBudgetValues(prev, monthlyTotalCents));
    setHasChanges(true);
  }

  function handleSaveAll() {
    startSaving(async () => {
      try {
        const entries = categories.map((category) => ({
          categoryId: category.id,
          amountCents: budgetsMap[category.id] ?? 0,
        }));
        const result = await saveCategoryBudgetsAction(entries, period, monthlyTotalCents);

        if (!result.ok) {
          showToast('error', result.error);
          return;
        }

        showToast('success', result.message ?? 'Orçamentos salvos com sucesso!');
        setHasChanges(false);
      } catch (err: unknown) {
        showToast('error', err instanceof Error ? err.message : 'Erro inesperado ao salvar.');
      }
    });
  }

  return (
    <div className="max-w-lg mx-auto px-4 pb-8 [scrollbar-gutter:stable]">
      <div className="flex items-center gap-3 py-5 mb-2 animate-fade-up delay-0">
        <Link
          href="/perfil"
          className="p-2 hover:bg-[#F1F3F7] rounded-full transition-colors"
          aria-label="Voltar para Perfil"
        >
          <ArrowLeft size={20} className="text-[#1A1D23]" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-[#1A1D23]">Orçamento guiado</h1>
          <p className="text-xs text-[#6B7280]">Ciclo de {formatBillingCycleLabel(period, billingClosingDay)}</p>
        </div>
      </div>

      <section className="themed-card mb-4 rounded-[18px] bg-white p-4 animate-fade-up delay-1">
        <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#6B7280]">
          Orçamento mensal total
        </p>
        <div className="mt-3 flex items-center gap-2 rounded-[14px] border-2 border-[#E5E7EB] px-4 py-4 transition-colors focus-within:border-[#5BBF8E]">
          <span className="text-xl font-bold text-[#9CA3AF]">R$</span>
          <input
            type="tel"
            inputMode="numeric"
            value={monthlyTotalDisplay}
            onChange={(event) => handleMonthlyTotalChange(event.target.value)}
            placeholder="0,00"
            className="min-w-0 flex-1 bg-transparent text-3xl font-extrabold tabular-nums text-[#1A1D23] outline-none placeholder:text-[#9CA3AF]"
            aria-label="Orçamento mensal total"
          />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <BudgetStat label="Distribuído" value={formatCurrency(totalDistributed)} />
          <BudgetStat
            label={isOver ? 'Excedeu' : 'Restante'}
            value={formatCurrency(Math.abs(difference))}
            tone={isOver ? 'danger' : 'success'}
          />
          <BudgetStat label="Categorias" value={String(categories.length)} />
        </div>
      </section>

      <section className="mb-4 animate-fade-up delay-2">
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="text-sm font-bold text-[#1A1D23]">Sugestões</p>
          <button
            type="button"
            onClick={() => applyPreset()}
            disabled={monthlyTotalCents <= 0}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#EEF9F4] px-3 py-1.5 text-xs font-bold text-[#2E8F67] transition-colors hover:bg-[#DDF4EA] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Calculator size={14} weight="bold" />
            Distribuir automaticamente
          </button>
        </div>

        <div className="grid grid-cols-1 gap-2">
          {BUDGET_PRESETS.map((preset) => {
            const selected = selectedPreset === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset.id)}
                disabled={monthlyTotalCents <= 0}
                aria-pressed={selected}
                className={`themed-card flex items-center gap-3 rounded-[14px] border p-3 text-left transition-all active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 ${
                  selected
                    ? 'border-[#5BBF8E] bg-[#EEF9F4]'
                    : 'border-[#E5E7EB] bg-white hover:border-[#A8C5E0]'
                }`}
              >
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                  selected ? 'bg-[#5BBF8E] text-white' : 'bg-[#F1F3F7] text-[#6B7280]'
                }`}>
                  <CheckCircle size={18} weight="bold" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-[#1A1D23]">{preset.label}</span>
                  <span className="block text-xs text-[#6B7280]">{preset.description}</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="mb-4 flex flex-wrap gap-2 animate-fade-up delay-3" aria-label="Ações rápidas">
        <button
          type="button"
          onClick={roundBudgets}
          disabled={totalDistributed <= 0}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-[12px] border border-[#E5E7EB] bg-white px-3 py-2.5 text-sm font-bold text-[#6B7280] transition-colors hover:border-[#A8C5E0] hover:bg-[#F8F9FB] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ArrowsClockwise size={16} weight="bold" />
          Arredondar
        </button>
        <button
          type="button"
          onClick={clearBudgets}
          disabled={totalDistributed <= 0}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-[12px] border border-[#F4D7D7] bg-white px-3 py-2.5 text-sm font-bold text-[#B14C4C] transition-colors hover:bg-[#FDF0F0] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Broom size={16} weight="bold" />
          Zerar
        </button>
      </section>

      <div className="relative mb-3 animate-fade-up delay-4">
        <MagnifyingGlass
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]"
          aria-hidden
        />
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar categoria..."
          className="themed-field w-full rounded-[10px] border border-[#E5E7EB] bg-white py-2.5 pl-9 pr-4 text-sm text-[#1A1D23] outline-none transition-colors placeholder:text-[#9CA3AF] focus:border-[#A8C5E0]"
          aria-label="Buscar categorias"
        />
      </div>

      <section className="space-y-2 mb-8 animate-fade-up delay-5" aria-label="Orçamentos por categoria">
        {filteredCategories.map((category) => {
          const valueCents = budgetsMap[category.id] ?? 0;
          const percentage = monthlyTotalCents > 0 ? Math.round((valueCents / monthlyTotalCents) * 100) : 0;

          return (
            <div
              key={category.id}
              className="themed-card grid grid-cols-[1fr_auto] items-center gap-3 rounded-[14px] border border-[#F1F3F7] bg-white p-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: `${category.color}18`, color: category.color }}
                >
                  <Icon name={category.icon} size={18} />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-[#1A1D23]">{category.name}</p>
                  <p className="text-[11px] text-[#9CA3AF]">{percentage}% do total</p>
                </div>
              </div>

              <div className="themed-field flex w-32 items-center gap-1 rounded-[10px] border border-[#E5E7EB] bg-[#F8F9FB] px-3 py-2 transition-all focus-within:border-[#A8C5E0] focus-within:bg-white">
                <span className="text-xs font-bold text-[#9CA3AF]">R$</span>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={formatCentsInput(valueCents)}
                  onChange={(event) => handleAmountChange(category.id, event.target.value)}
                  placeholder="0,00"
                  className="w-full bg-transparent text-right text-sm font-semibold tabular-nums text-[#1A1D23] outline-none placeholder:text-[#9CA3AF]"
                  aria-label={`Limite para ${category.name}`}
                />
              </div>
            </div>
          );
        })}
      </section>

      {search && filteredCategories.length === 0 && (
        <div className="flex flex-col items-center py-12 text-center">
          <MagnifyingGlass size={36} className="text-[#9CA3AF] mb-3 opacity-40" />
          <p className="text-sm font-semibold text-[#1A1D23]">Nenhuma categoria encontrada</p>
          <p className="text-xs text-[#6B7280] mt-1">Tente buscar por outro termo.</p>
        </div>
      )}

      <div className="sticky bottom-[calc(70px+env(safe-area-inset-bottom,0px))] z-20 animate-fade-up delay-6">
        <div className="themed-card rounded-[18px] border border-[#E5E7EB] bg-white/95 p-3 shadow-[0_14px_32px_rgba(26,29,35,0.12)] backdrop-blur">
          <div className="mb-2 flex items-center justify-between gap-3 text-xs">
            <span className="font-semibold text-[#6B7280]">Diferença</span>
            <span className={`font-bold tabular-nums ${isOver ? 'text-[#B14C4C]' : 'text-[#2E8F67]'}`}>
              {isOver ? '+' : ''}{formatCurrency(Math.abs(difference))}
            </span>
          </div>
          <button
            onClick={handleSaveAll}
            disabled={saving || !hasChanges}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-[#5BBF8E] py-4 font-bold text-white transition-colors duration-150 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
            style={{ boxShadow: '0 6px 20px rgba(91, 191, 142, 0.35)' }}
          >
            {saving ? (
              <>
                <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar orçamento'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function BudgetStat({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'success' | 'danger';
}) {
  const color =
    tone === 'success' ? 'var(--color-success)'
    : tone === 'danger' ? 'var(--color-error)'
    : 'var(--color-text-primary)';
  return (
    <div className="rounded-[12px] bg-[#F8F9FB] px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#9CA3AF]">
        {label}
      </p>
      <p className="mt-0.5 truncate text-sm font-bold tabular-nums" style={{ color }}>
        {value}
      </p>
    </div>
  );
}
