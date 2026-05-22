'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { WarningCircle, Sparkle } from '@phosphor-icons/react';
import Icon from '@/components/Icon';
import Mo from '@/components/Mo';
import { formatCurrency } from '@/lib/utils';
import { completeOnboardingAction, type OnboardingBudgetItem } from './actions';
import type { Category } from '@/types';

interface OnboardingViewProps {
  categories: Category[];
  period: string;
  firstName: string;
}

function formatPeriod(p: string): string {
  const [year, month] = p.split('-').map(Number);
  const date = new Date(year, month - 1, 1);
  const formatted = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

// Approximate weights for typical Brazilian household spending. Categories not
// listed fall back to a small share so custom user categories still get budget.
const SUGGESTED_WEIGHTS: Record<string, number> = {
  casa: 0.30,
  alimentacao: 0.25,
  transporte: 0.12,
  lazer: 0.10,
  saude: 0.10,
  educacao: 0.08,
  outros: 0.05,
};
const FALLBACK_WEIGHT = 0.05;

function getNormalizedWeights(categories: Category[]): Record<string, number> {
  if (categories.length === 0) return {};
  const raw: Record<string, number> = {};
  for (const cat of categories) {
    raw[cat.id] = SUGGESTED_WEIGHTS[cat.id] ?? FALLBACK_WEIGHT;
  }
  const sum = Object.values(raw).reduce((s, v) => s + v, 0);
  if (sum === 0) return raw;
  const out: Record<string, number> = {};
  for (const id of Object.keys(raw)) out[id] = raw[id] / sum;
  return out;
}

function distribute(totalCents: number, categories: Category[]): Record<string, number> {
  if (categories.length === 0) return {};
  const weights = getNormalizedWeights(categories);
  const result: Record<string, number> = {};
  let allocated = 0;
  for (let i = 0; i < categories.length; i++) {
    const cat = categories[i];
    if (i === categories.length - 1) {
      result[cat.id] = Math.max(0, totalCents - allocated);
    } else {
      const cents = Math.round(totalCents * (weights[cat.id] ?? 0));
      result[cat.id] = cents;
      allocated += cents;
    }
  }
  return result;
}

const SLIDER_MIN = 0;          // R$ 0
const SLIDER_MAX = 1500000;    // R$ 15.000
const SLIDER_STEP = 5000;      // R$ 50

export default function OnboardingView({ categories, period, firstName }: OnboardingViewProps) {
  const router = useRouter();
  const [budgets, setBudgets] = useState<Record<string, number>>({});
  const [sliderValue, setSliderValue] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const totalPlanned = useMemo(
    () => Object.values(budgets).reduce((sum, v) => sum + v, 0),
    [budgets],
  );

  // If user manually edits a category after using the slider, the total can
  // diverge from the slider position. Show that drift in the helper text.
  const drift = totalPlanned - sliderValue;
  const hasDrift = sliderValue > 0 && Math.abs(drift) > 100;

  function handleChange(catId: string, raw: string) {
    const digits = raw.replace(/\D/g, '');
    const cents = digits ? parseInt(digits, 10) : 0;
    setBudgets((prev) => ({ ...prev, [catId]: cents }));
    setError(null);
  }

  function handleSliderChange(e: React.ChangeEvent<HTMLInputElement>) {
    const total = parseInt(e.target.value, 10);
    setSliderValue(total);
    setBudgets(distribute(total, categories));
    setError(null);
  }

  function persist(items: OnboardingBudgetItem[]) {
    setError(null);
    startTransition(async () => {
      const result = await completeOnboardingAction(items, period);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push('/');
      router.refresh();
    });
  }

  function handleSave() {
    const items: OnboardingBudgetItem[] = categories.map((cat) => ({
      categoryId: cat.id,
      amountCents: budgets[cat.id] ?? 0,
    }));
    persist(items);
  }

  function handleSkip() {
    persist([]);
  }

  return (
    <main
      className="min-h-screen flex flex-col"
      style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom, 0px))' }}
    >
      <div className="max-w-lg mx-auto px-4 w-full flex-1 flex flex-col">
        {/* Welcome header */}
        <header className="pt-8 pb-6 text-center animate-fade-up delay-0">
          <Mo variant="happy" size={120} className="mx-auto animate-bounce-in" />
          <h1 className="text-2xl font-heading text-[#1A1D23] mt-3">
            Olá, {firstName}! 👋
          </h1>
          <p className="text-sm text-[#6B7280] mt-2 max-w-[300px] mx-auto leading-relaxed">
            Vamos começar definindo quanto você quer gastar em cada categoria neste mês.
          </p>
        </header>

        {/* Total + auto-distribute slider */}
        <div
          className="bg-gradient-to-br from-[#5BBF8E] to-[#4AA77C] text-white rounded-[20px] p-5 mb-6 animate-fade-up delay-1"
          style={{ boxShadow: '0 8px 24px rgba(91, 191, 142, 0.25)' }}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider opacity-85">
              Orçamento de {formatPeriod(period)}
            </p>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-white/20 rounded-full px-2 py-0.5">
              <Sparkle size={10} weight="fill" /> Com pressa?
            </span>
          </div>
          <p className="text-3xl font-extrabold mt-1.5 tabular-nums">
            {formatCurrency(totalPlanned)}
          </p>
          <p className="text-xs opacity-85 mt-1 min-h-[16px]">
            {sliderValue === 0 && 'Arraste o controle para distribuir entre as categorias.'}
            {sliderValue > 0 && !hasDrift && 'Distribuído automaticamente entre as categorias.'}
            {sliderValue > 0 && hasDrift && (
              drift > 0
                ? `${formatCurrency(Math.abs(drift))} acima do controle.`
                : `${formatCurrency(Math.abs(drift))} abaixo do controle.`
            )}
          </p>

          <div className="mt-4">
            <input
              type="range"
              min={SLIDER_MIN}
              max={SLIDER_MAX}
              step={SLIDER_STEP}
              value={sliderValue}
              onChange={handleSliderChange}
              className="budget-slider"
              aria-label="Definir orçamento total e distribuir automaticamente"
              aria-valuetext={formatCurrency(sliderValue)}
            />
            <div className="flex items-center justify-between mt-2 text-[10px] font-semibold uppercase tracking-wider opacity-70 tabular-nums">
              <span>R$ 0</span>
              <span>R$ {(SLIDER_MAX / 100).toLocaleString('pt-BR')}</span>
            </div>
          </div>
        </div>

        {/* Category list */}
        <div className="space-y-2.5 mb-6 animate-fade-up delay-2">
          {categories.map((cat) => {
            const cents = budgets[cat.id] ?? 0;
            const display = cents > 0
              ? new Intl.NumberFormat('pt-BR', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }).format(cents / 100)
              : '';

            return (
              <div
                key={cat.id}
                className="bg-white rounded-[14px] p-3.5 flex items-center justify-between gap-3 border border-[#F1F3F7]"
                style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${cat.color}18`, color: cat.color }}
                  >
                    <Icon name={cat.icon} size={20} />
                  </div>
                  <p className="text-sm font-semibold text-[#1A1D23] truncate">
                    {cat.name}
                  </p>
                </div>

                <div className="w-32 shrink-0">
                  <div className="flex items-center gap-1 border border-[#E5E7EB] rounded-[10px] px-3 py-2 bg-[#F8F9FB] focus-within:border-[#A8C5E0] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#A8C5E0]/15 transition-all">
                    <span className="text-xs font-bold text-[#9CA3AF]">R$</span>
                    <input
                      type="tel"
                      inputMode="numeric"
                      value={display}
                      onChange={(e) => handleChange(cat.id, e.target.value)}
                      placeholder="0,00"
                      className="w-full text-right text-sm font-semibold text-[#1A1D23] bg-transparent outline-none tabular-nums placeholder:text-[#9CA3AF]"
                      aria-label={`Orçamento para ${cat.name}`}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {error && (
          <div
            role="alert"
            className="mb-4 flex items-center gap-2 px-4 py-3 rounded-[12px] bg-[#FDF0F0] text-[#B14C4C] border border-[#F4D7D7]"
          >
            <WarningCircle size={18} className="shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="mt-auto pt-2 space-y-3 animate-fade-up delay-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={pending}
            className="w-full bg-[#1A1D23] hover:bg-[#2A2E37] text-white font-bold py-4 rounded-full transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            style={{ boxShadow: '0 6px 20px rgba(26, 29, 35, 0.15)' }}
          >
            {pending ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Salvando...
              </>
            ) : (
              'Continuar'
            )}
          </button>
          <button
            type="button"
            onClick={handleSkip}
            disabled={pending}
            className="w-full py-3 text-sm font-medium text-[#6B7280] hover:text-[#1A1D23] transition-colors disabled:opacity-40"
          >
            Pular por agora
          </button>
        </div>
      </div>
    </main>
  );
}
