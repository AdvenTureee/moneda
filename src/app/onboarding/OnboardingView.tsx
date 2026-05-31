'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  WarningCircle,
  Trash,
  Plus,
  CaretLeft,
  Minus,
  Moon,
  Sun,
  Calculator,
  WhatsappLogo,
} from '@phosphor-icons/react';
import Icon, { AVAILABLE_ICONS } from '@/components/Icon';
import Mo from '@/components/Mo';
import { useTheme, type ThemePreference } from '@/components/ThemeProvider';
import { formatCurrency } from '@/lib/utils';
import { distributeBudgetByPreset } from '@/lib/budgetPresets';
import { formatWhatsappPhone, normalizeWhatsappPhone } from '@/lib/phone';
import {
  completeOnboardingAction,
  type OnboardingPayload,
  type OnboardingRecurringExpense,
  type OnboardingCustomCategory,
} from './actions';
import type { Category } from '@/types';

interface OnboardingViewProps {
  defaultCategories: Category[];
  firstName: string;
}

type Step = 'balance' | 'budget' | 'categoryBudget' | 'whatsapp' | 'theme' | 'closing' | 'pet' | 'expenses' | 'categories';
const STEP_ORDER: Step[] = ['balance', 'budget', 'categoryBudget', 'whatsapp', 'theme', 'closing', 'pet', 'expenses', 'categories'];

interface ExpenseRow {
  tempId: string;
  description: string;
  amountCents: number;
  amountDisplay: string;
  categoryId: string;
}

const SWATCHES = [
  '#F59E0B', '#EF4444', '#10B981', '#3B82F6',
  '#8B5CF6', '#EC4899', '#06B6D4', '#6B7280',
];

function newRow(defaultCategoryId: string): ExpenseRow {
  return {
    tempId: `r-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    description: '',
    amountCents: 0,
    amountDisplay: '',
    categoryId: defaultCategoryId,
  };
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

export default function OnboardingView({ defaultCategories, firstName }: OnboardingViewProps) {
  const router = useRouter();
  const { theme, isDark, setTheme } = useTheme();
  const [stepIdx, setStepIdx] = useState(0);
  const step: Step = STEP_ORDER[stepIdx];

  // Q1
  const [currentBalanceCents, setCurrentBalanceCents] = useState(0);
  const [currentBalanceDisplay, setCurrentBalanceDisplay] = useState('');

  // Q2
  const [monthlyBudgetCents, setMonthlyBudgetCents] = useState(0);
  const [monthlyBudgetDisplay, setMonthlyBudgetDisplay] = useState('');

  // Q3
  const budgetCategories = useMemo(
    () => defaultCategories.filter((c) => c.id !== 'pet'),
    [defaultCategories],
  );
  const [categoryBudgetsMap, setCategoryBudgetsMap] = useState<Record<string, number>>({});
  const [categoryBudgetTouched, setCategoryBudgetTouched] = useState(false);
  const [categoryBudgetSkipped, setCategoryBudgetSkipped] = useState(false);
  const [categoryBudgetManual, setCategoryBudgetManual] = useState(false);

  // Q4
  const [whatsappPhone, setWhatsappPhone] = useState('');

  // Q5
  // Theme preference is saved locally through ThemeProvider.

  // Q6
  const [closingDay, setClosingDay] = useState(10);

  // Q7
  const [hasPet, setHasPet] = useState<boolean | null>(null);

  // Q8
  const visibleCategories = useMemo(
    () => defaultCategories.filter((c) => (hasPet ? true : c.id !== 'pet')),
    [defaultCategories, hasPet],
  );
  const firstCategoryId = visibleCategories[0]?.id ?? '';
  const [expenseRows, setExpenseRows] = useState<ExpenseRow[]>([]);

  // Q9
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customDraft, setCustomDraft] = useState<OnboardingCustomCategory>({
    name: '',
    icon: 'Tag',
    color: SWATCHES[0],
  });
  const [customCategories, setCustomCategories] = useState<OnboardingCustomCategory[]>([]);

  // Submit
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const canNext = (() => {
    switch (step) {
      case 'balance': return currentBalanceCents > 0;
      case 'budget': return monthlyBudgetCents > 0;
      case 'categoryBudget': return true;
      case 'whatsapp': return !whatsappPhone.trim() || normalizeWhatsappPhone(whatsappPhone) !== null;
      case 'theme': return true;
      case 'closing': return closingDay >= 1 && closingDay <= 28;
      case 'pet': return hasPet !== null;
      case 'expenses': return expenseRows.every(
        (r) => r.description.trim() && r.amountCents > 0 && r.categoryId,
      );
      case 'categories': return true;
    }
  })();

  function handleCurrentBalanceChange(raw: string) {
    const cents = parseCentsInput(raw);
    setCurrentBalanceCents(cents);
    setCurrentBalanceDisplay(formatCentsInput(cents));
  }

  function handleMonthlyBudgetChange(raw: string) {
    const cents = parseCentsInput(raw);
    setMonthlyBudgetCents(cents);
    setMonthlyBudgetDisplay(formatCentsInput(cents));
    if (!categoryBudgetTouched) {
      setCategoryBudgetsMap(distributeBudgetByPreset(budgetCategories, cents, 'balanced'));
    }
  }

  function useSuggestedCategoryBudget() {
    setCategoryBudgetsMap(distributeBudgetByPreset(budgetCategories, monthlyBudgetCents, 'balanced'));
    setCategoryBudgetTouched(true);
    setCategoryBudgetSkipped(false);
  }

  function updateCategoryBudget(categoryId: string, raw: string) {
    const cents = parseCentsInput(raw);
    setCategoryBudgetsMap((prev) => ({ ...prev, [categoryId]: cents }));
    setCategoryBudgetTouched(true);
    setCategoryBudgetSkipped(false);
  }

  function skipCategoryBudget() {
    setCategoryBudgetSkipped(true);
    setError(null);
    setStepIdx((i) => Math.min(i + 1, STEP_ORDER.length - 1));
  }

  function adjustClosing(delta: number) {
    setClosingDay((d) => Math.max(1, Math.min(28, d + delta)));
  }

  function addExpenseRow() {
    if (!firstCategoryId) return;
    setExpenseRows((rows) => [...rows, newRow(firstCategoryId)]);
  }

  function updateRow(tempId: string, patch: Partial<ExpenseRow>) {
    setExpenseRows((rows) => rows.map((r) => (r.tempId === tempId ? { ...r, ...patch } : r)));
  }

  function removeRow(tempId: string) {
    setExpenseRows((rows) => rows.filter((r) => r.tempId !== tempId));
  }

  function saveCustomCategory() {
    if (!customDraft.name.trim()) return;
    setCustomCategories((cs) => [...cs, customDraft]);
    setCustomDraft({ name: '', icon: 'Tag', color: SWATCHES[0] });
    setShowCustomForm(false);
  }

  function removeCustomCategory(idx: number) {
    setCustomCategories((cs) => cs.filter((_, i) => i !== idx));
  }

  function goNext() {
    setError(null);
    if (stepIdx < STEP_ORDER.length - 1) {
      setStepIdx((i) => i + 1);
    } else {
      submit();
    }
  }

  function goBack() {
    setError(null);
    if (stepIdx > 0) setStepIdx((i) => i - 1);
  }

  function submit() {
    setError(null);
    const payload: OnboardingPayload = {
      currentBalanceCents,
      monthlyBudgetCents,
      billingClosingDay: closingDay,
      hasPet: hasPet === true,
      recurringExpenses: expenseRows.map<OnboardingRecurringExpense>((r) => ({
        description: r.description.trim(),
        amountCents: r.amountCents,
        categoryId: r.categoryId,
      })),
      customCategories,
      whatsappPhone: normalizeWhatsappPhone(whatsappPhone),
      categoryBudgets: categoryBudgetSkipped
        ? []
        : budgetCategories
            .map((category) => ({
              categoryId: category.id,
              amountCents: categoryBudgetsMap[category.id] ?? 0,
            }))
            .filter((entry) => entry.amountCents > 0),
    };
    startTransition(async () => {
      const result = await completeOnboardingAction(payload);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push('/');
      router.refresh();
    });
  }

  const categoryBudgetTotal = budgetCategories.reduce(
    (sum, category) => sum + (categoryBudgetsMap[category.id] ?? 0),
    0,
  );
  const categoryBudgetDifference = monthlyBudgetCents - categoryBudgetTotal;
  const whatsappNormalizedPhone = normalizeWhatsappPhone(whatsappPhone);

  return (
    <main
      className="min-h-screen flex flex-col"
      style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom, 0px))' }}
    >
      <div className="max-w-lg mx-auto px-4 w-full flex-1 flex flex-col">
        {/* Top bar: back + progress dots */}
        <div className="flex items-center gap-3 pt-6 pb-4">
          <button
            type="button"
            onClick={goBack}
            disabled={stepIdx === 0 || pending}
            aria-label="Voltar"
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#F1F3F7] transition-colors disabled:opacity-30"
          >
            <CaretLeft size={18} weight="bold" className="text-[#1A1D23]" />
          </button>
          <div className="flex-1 flex items-center justify-center gap-1.5">
            {STEP_ORDER.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === stepIdx
                    ? 'w-6 bg-[#5BBF8E]'
                    : i < stepIdx
                      ? 'w-3 bg-[#5BBF8E]/40'
                      : 'w-3 bg-[#E5E7EB]'
                }`}
              />
            ))}
          </div>
          <div className="w-9 h-9" />
        </div>

        {step === 'balance' && (
          <section className="flex-1">
            <Mo variant="happy" size={96} className="mx-auto" />
            <h1 className="text-2xl font-heading text-center text-[#1A1D23] mt-3">
              Olá, {firstName}!
            </h1>
            <p className="text-sm text-[#6B7280] text-center mt-2 mb-6 max-w-[320px] mx-auto">
              Quanto dinheiro você tem disponível hoje? Usamos isso para mostrar quanto sobra depois dos gastos, sem julgamento.
            </p>
            <div
              className="flex items-center gap-2 rounded-[16px] px-5 py-5 transition-all"
              style={{
                border: `1.5px solid ${
                  currentBalanceCents > 0
                    ? 'var(--color-success)'
                    : isDark
                      ? 'rgba(255,255,255,0.08)'
                      : '#E5E7EB'
                }`,
                background:
                  currentBalanceCents > 0
                    ? isDark
                      ? 'rgba(111, 212, 162, 0.08)'
                      : '#EEF9F4'
                    : isDark
                      ? 'rgba(255,255,255,0.04)'
                      : '#fff',
                boxShadow:
                  currentBalanceCents > 0
                    ? 'none'
                    : isDark
                      ? '0 1px 0 0 rgba(255,255,255,0.04)'
                      : '0 1px 2px 0 rgba(0,0,0,0.04)',
              }}
            >
              <span className="text-2xl font-bold text-[#9CA3AF]">R$</span>
              <input
                type="tel"
                inputMode="numeric"
                value={currentBalanceDisplay}
                onChange={(e) => handleCurrentBalanceChange(e.target.value)}
                placeholder="0,00"
                className="flex-1 text-4xl font-extrabold bg-transparent outline-none tabular-nums text-[#1A1D23] placeholder:text-[#9CA3AF]"
                aria-label="Saldo atual disponível em reais"
              />
            </div>
          </section>
        )}

        {step === 'budget' && (
          <section className="flex-1">
            <Mo variant="happy" size={96} className="mx-auto" />
            <h2 className="text-xl font-heading text-center text-[#1A1D23] mt-3">
              Quanto você imagina gastar neste mês?
            </h2>
            <p className="text-sm text-[#6B7280] text-center mt-2 mb-6 max-w-[320px] mx-auto">
              Esse valor vira seu teto mensal para comparar com os gastos reais ao longo do mês.
            </p>
            <div
              className="flex items-center gap-2 rounded-[16px] px-5 py-5 transition-all"
              style={{
                border: `1.5px solid ${
                  monthlyBudgetCents > 0
                    ? 'var(--color-success)'
                    : isDark
                      ? 'rgba(255,255,255,0.08)'
                      : '#E5E7EB'
                }`,
                background:
                  monthlyBudgetCents > 0
                    ? isDark
                      ? 'rgba(111, 212, 162, 0.08)'
                      : '#EEF9F4'
                    : isDark
                      ? 'rgba(255,255,255,0.04)'
                      : '#fff',
                boxShadow:
                  monthlyBudgetCents > 0
                    ? 'none'
                    : isDark
                      ? '0 1px 0 0 rgba(255,255,255,0.04)'
                      : '0 1px 2px 0 rgba(0,0,0,0.04)',
              }}
            >
              <span className="text-2xl font-bold text-[#9CA3AF]">R$</span>
              <input
                type="tel"
                inputMode="numeric"
                value={monthlyBudgetDisplay}
                onChange={(e) => handleMonthlyBudgetChange(e.target.value)}
                placeholder="0,00"
                className="flex-1 text-4xl font-extrabold bg-transparent outline-none tabular-nums text-[#1A1D23] placeholder:text-[#9CA3AF]"
                aria-label="Orçamento mensal em reais"
              />
            </div>
          </section>
        )}

        {step === 'categoryBudget' && (
          <section className="flex-1">
            <Mo variant="happy" size={86} className="mx-auto" />
            <h2 className="text-xl font-heading text-center text-[#1A1D23] mt-3">
              Quer dividir por categoria?
            </h2>
            <p className="text-sm text-[#6B7280] text-center mt-2 mb-5 max-w-[340px] mx-auto">
              Eu posso transformar seu orçamento mensal em limites por categoria. É só uma sugestão inicial, você ajusta depois.
            </p>

            <div className="themed-card rounded-[16px] bg-white p-4 mb-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-[12px] bg-[#F8F9FB] px-2 py-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-[#9CA3AF]">Total</p>
                  <p className="mt-0.5 text-xs font-bold text-[#1A1D23] tabular-nums">{formatCurrency(monthlyBudgetCents)}</p>
                </div>
                <div className="rounded-[12px] bg-[#F8F9FB] px-2 py-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-[#9CA3AF]">Distribuído</p>
                  <p className="mt-0.5 text-xs font-bold text-[#1A1D23] tabular-nums">{formatCurrency(categoryBudgetTotal)}</p>
                </div>
                <div className="rounded-[12px] bg-[#F8F9FB] px-2 py-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-[#9CA3AF]">
                    {categoryBudgetDifference < 0 ? 'Acima' : 'Restante'}
                  </p>
                  <p
                    className="mt-0.5 text-xs font-bold tabular-nums"
                    style={{ color: categoryBudgetDifference < 0 ? '#B14C4C' : '#2E8F67' }}
                  >
                    {formatCurrency(Math.abs(categoryBudgetDifference))}
                  </p>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={useSuggestedCategoryBudget}
                  className="flex items-center justify-center gap-2 rounded-[12px] bg-[#EEF9F4] px-3 py-3 text-sm font-bold text-[#2E8F67] transition-colors hover:bg-[#DDF4EA] active:scale-[0.98]"
                >
                  <Calculator size={16} weight="bold" />
                  Usar sugestão
                </button>
                <button
                  type="button"
                  onClick={() => {
                    useSuggestedCategoryBudget();
                    setCategoryBudgetManual(true);
                  }}
                  className="rounded-[12px] border border-[#E5E7EB] bg-white px-3 py-3 text-sm font-bold text-[#6B7280] transition-colors hover:border-[#A8C5E0] hover:bg-[#F8F9FB] active:scale-[0.98]"
                >
                  Ajustar valores
                </button>
              </div>
            </div>

            {(categoryBudgetManual || categoryBudgetTotal > 0) && (
              <div className="space-y-2 mb-3">
                {budgetCategories.map((category) => {
                  const amount = categoryBudgetsMap[category.id] ?? 0;
                  return (
                    <div
                      key={category.id}
                      className="themed-card grid grid-cols-[1fr_auto] items-center gap-3 rounded-[12px] bg-white p-3"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                          style={{ backgroundColor: `${category.color}18`, color: category.color }}
                        >
                          <Icon name={category.icon} size={16} />
                        </span>
                        <p className="truncate text-sm font-bold text-[#1A1D23]">{category.name}</p>
                      </div>
                      <div className="flex w-28 items-center gap-1 rounded-[10px] border border-[#E5E7EB] bg-[#F8F9FB] px-2.5 py-2">
                        <span className="text-xs font-bold text-[#9CA3AF]">R$</span>
                        <input
                          type="tel"
                          inputMode="numeric"
                          value={formatCentsInput(amount)}
                          onChange={(event) => updateCategoryBudget(category.id, event.target.value)}
                          placeholder="0,00"
                          className="min-w-0 flex-1 bg-transparent text-right text-sm font-semibold tabular-nums text-[#1A1D23] outline-none"
                          aria-label={`Orçamento para ${category.name}`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {step === 'whatsapp' && (
          <section className="flex-1">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#EEF9F4] text-[#2E8F67]">
              <WhatsappLogo size={40} weight="fill" />
            </div>
            <h2 className="text-xl font-heading text-center text-[#1A1D23] mt-5">
              Quer lançar gastos pelo WhatsApp?
            </h2>
            <p className="text-sm text-[#6B7280] text-center mt-2 mb-6 max-w-[340px] mx-auto">
              Seu telefone identifica suas mensagens com segurança. É opcional, mas sem ele não conseguimos associar os gastos enviados pelo WhatsApp à sua conta.
            </p>

            <label className="block text-xs font-bold uppercase tracking-[0.08em] text-[#9CA3AF] mb-2">
              Telefone com DDD
            </label>
            <div className="themed-card flex items-center gap-2 rounded-[16px] border border-[#E5E7EB] bg-white px-4 py-4 transition-colors focus-within:border-[#5BBF8E]">
              <WhatsappLogo size={20} weight="fill" className="shrink-0 text-[#2E8F67]" />
              <input
                type="tel"
                inputMode="tel"
                value={whatsappPhone}
                onChange={(event) => setWhatsappPhone(event.target.value)}
                placeholder="(11) 99999-9999"
                className="min-w-0 flex-1 bg-transparent text-lg font-semibold text-[#1A1D23] outline-none placeholder:text-[#9CA3AF]"
                aria-label="Telefone do WhatsApp"
              />
            </div>

            {whatsappPhone.trim() && !whatsappNormalizedPhone && (
              <p className="mt-2 text-sm font-medium text-[#B14C4C]">
                Informe um telefone válido com DDD.
              </p>
            )}
            {whatsappNormalizedPhone && (
              <p className="mt-2 text-sm font-medium text-[#2E8F67]">
                Vamos salvar como {formatWhatsappPhone(whatsappPhone)}.
              </p>
            )}
            <p className="mt-3 rounded-[12px] bg-[#FFF7E8] px-3 py-2 text-sm leading-relaxed text-[#8A5A12]">
              O lançamento pelo WhatsApp ainda não está ativo. Quando o WhatsApp Business estiver pronto, o código de confirmação será enviado pelo número do Moneda.
            </p>

            <button
              type="button"
              onClick={() => {
                setWhatsappPhone('');
                setError(null);
                setStepIdx((i) => Math.min(i + 1, STEP_ORDER.length - 1));
              }}
              className="mt-4 w-full rounded-full bg-[#F1F3F7] py-3 text-sm font-bold text-[#6B7280] transition-colors hover:bg-[#E5E7EB] active:scale-[0.98]"
            >
              Pular por enquanto
            </button>
          </section>
        )}

        {step === 'theme' && (
          <section className="flex-1">
            <Mo variant="happy" size={96} className="mx-auto" />
            <h2 className="text-xl font-heading text-center text-[#1A1D23] mt-3">
              Escolha seu visual
            </h2>
            <p className="text-sm text-[#6B7280] text-center mt-2 mb-6 max-w-[320px] mx-auto">
              Você pode começar no modo claro ou escuro e mudar depois em Perfil.
            </p>
            <div className="grid grid-cols-2 gap-3" role="group" aria-label="Preferência de tema">
              {[
                {
                  value: 'light' as ThemePreference,
                  label: 'Claro',
                  description: 'Leve e aberto',
                  icon: Sun,
                  previewBg: '#F8F9FB',
                  previewSurface: '#FFFFFF',
                  previewText: '#1A1D23',
                },
                {
                  value: 'dark' as ThemePreference,
                  label: 'Escuro',
                  description: 'Calmo à noite',
                  icon: Moon,
                  previewBg: '#10151C',
                  previewSurface: '#171E27',
                  previewText: '#F5F7FA',
                },
              ].map((opt) => {
                const active = theme === opt.value;
                const OptionIcon = opt.icon;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setTheme(opt.value)}
                    aria-pressed={active}
                    className={`rounded-[18px] border-2 p-3 text-left transition-[background-color,border-color,box-shadow,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.98] ${
                      active
                        ? 'border-[#5BBF8E] bg-[#EEF9F4] shadow-[0_10px_24px_rgba(91,191,142,0.16)]'
                        : 'border-[#E5E7EB] bg-white hover:border-[#A8C5E0]'
                    }`}
                  >
                    <div
                      className="h-28 rounded-[14px] p-3 border overflow-hidden transition-[border-color,background-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
                      style={{
                        background: opt.previewBg,
                        borderColor: active ? '#5BBF8E' : '#E5E7EB',
                      }}
                    >
                      <div
                        className="h-full rounded-[10px] p-3 flex flex-col justify-between transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
                        style={{ background: opt.previewSurface }}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className="w-7 h-7 rounded-full flex items-center justify-center"
                            style={{
                              background: opt.value === 'dark' ? '#202A35' : '#EEF9F4',
                              color: opt.value === 'dark' ? '#6FD4A2' : '#5BBF8E',
                            }}
                          >
                            <OptionIcon size={15} weight="bold" />
                          </span>
                          <span
                            className="w-10 h-2 rounded-full"
                            style={{ background: opt.value === 'dark' ? '#303B49' : '#E5E7EB' }}
                          />
                        </div>
                        <div className="space-y-2">
                          <span
                            className="block h-2.5 w-16 rounded-full"
                            style={{ background: opt.previewText, opacity: 0.9 }}
                          />
                          <span
                            className="block h-2 w-24 rounded-full"
                            style={{ background: opt.previewText, opacity: 0.32 }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold text-[#1A1D23]">{opt.label}</p>
                        <p className="text-xs text-[#6B7280]">{opt.description}</p>
                      </div>
                      <span
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-[border-color,background-color,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                          active ? 'border-[#5BBF8E]' : 'border-[#D1D9E6]'
                        }`}
                        aria-hidden
                      >
                        {active && <span className="w-2.5 h-2.5 rounded-full bg-[#5BBF8E] animate-scale-in" />}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {step === 'closing' && (
          <section className="flex-1">
            <Mo variant="happy" size={96} className="mx-auto" />
            <h2 className="text-xl font-heading text-center text-[#1A1D23] mt-3">
              Fechamento do cartão
            </h2>
            <p className="text-sm text-[#6B7280] text-center mt-2 mb-6 max-w-[320px] mx-auto">
              Em qual dia a fatura do seu cartão fecha? Vamos usar para insights de ciclo de cobrança.
            </p>
            <div className="bg-white border border-[#E5E7EB] rounded-[16px] p-6">
              <p className="text-xs uppercase tracking-wider text-[#9CA3AF] font-semibold text-center mb-4">
                Dia do mês
              </p>
              <div className="flex items-center justify-center gap-6">
                <button
                  type="button"
                  onClick={() => adjustClosing(-1)}
                  aria-label="Diminuir"
                  className="w-12 h-12 rounded-full border border-[#E5E7EB] flex items-center justify-center hover:bg-[#F1F3F7] active:scale-95 transition-all"
                >
                  <Minus size={20} weight="bold" className="text-[#6B7280]" />
                </button>
                <div className="text-5xl font-extrabold text-[#1A1D23] tabular-nums w-20 text-center">
                  {closingDay}
                </div>
                <button
                  type="button"
                  onClick={() => adjustClosing(1)}
                  aria-label="Aumentar"
                  className="w-12 h-12 rounded-full border border-[#E5E7EB] flex items-center justify-center hover:bg-[#F1F3F7] active:scale-95 transition-all"
                >
                  <Plus size={20} weight="bold" className="text-[#6B7280]" />
                </button>
              </div>
              <p className="text-[11px] text-[#9CA3AF] text-center mt-4">
                Encontre na fatura do seu cartão (entre 1 e 28).
              </p>
            </div>
          </section>
        )}

        {step === 'pet' && (
          <section className="flex-1">
            <Mo variant="happy" size={96} className="mx-auto" />
            <h2 className="text-xl font-heading text-center text-[#1A1D23] mt-3">
              Você tem pet?
            </h2>
            <p className="text-sm text-[#6B7280] text-center mt-2 mb-6 max-w-[320px] mx-auto">
              Se sim, ativamos a categoria <strong>Pet</strong> para você acompanhar esses gastos.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: true, label: 'Sim 🐾' },
                { value: false, label: 'Não' },
              ].map((opt) => {
                const active = hasPet === opt.value;
                return (
                  <button
                    key={String(opt.value)}
                    type="button"
                    onClick={() => setHasPet(opt.value)}
                    className={`py-8 rounded-[16px] border-2 text-lg font-bold transition-all active:scale-[0.98] ${
                      active
                        ? 'border-[#5BBF8E] bg-[#EEF9F4] text-[#1A1D23]'
                        : 'border-[#E5E7EB] bg-white text-[#6B7280] hover:border-[#A8C5E0]'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {step === 'expenses' && (
          <section className="flex-1">
            <h2 className="text-xl font-heading text-[#1A1D23]">Gastos recorrentes</h2>
            <p className="text-sm text-[#6B7280] mt-1 mb-4">
              Cadastre seus gastos mensais (aluguel, assinaturas...). Você pode pular e adicionar depois.
            </p>

            <div className="space-y-3 mb-4">
              {expenseRows.map((row) => (
                <div
                  key={row.tempId}
                  className="bg-white border border-[#E5E7EB] rounded-[12px] p-3 space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={row.description}
                      onChange={(e) => updateRow(row.tempId, { description: e.target.value })}
                      placeholder="Ex: Aluguel, Netflix..."
                      className="flex-1 border border-[#E5E7EB] rounded-[8px] px-3 py-2 text-sm outline-none focus:border-[#A8C5E0] transition-colors"
                      maxLength={80}
                    />
                    <button
                      type="button"
                      onClick={() => removeRow(row.tempId)}
                      aria-label="Remover gasto"
                      className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#FDF0F0] transition-colors"
                    >
                      <Trash size={16} className="text-[#B14C4C]" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 border border-[#E5E7EB] rounded-[8px] px-3 py-2 bg-[#F8F9FB] flex-1 focus-within:border-[#A8C5E0] focus-within:bg-white transition-all">
                      <span className="text-xs font-bold text-[#9CA3AF]">R$</span>
                      <input
                        type="tel"
                        inputMode="numeric"
                        value={row.amountDisplay}
                        onChange={(e) => {
                          const cents = parseCentsInput(e.target.value);
                          updateRow(row.tempId, {
                            amountCents: cents,
                            amountDisplay: formatCentsInput(cents),
                          });
                        }}
                        placeholder="0,00"
                        className="w-full text-right text-sm font-semibold bg-transparent outline-none tabular-nums"
                        aria-label="Valor"
                      />
                    </div>
                    <select
                      value={row.categoryId}
                      onChange={(e) => updateRow(row.tempId, { categoryId: e.target.value })}
                      className="border border-[#E5E7EB] rounded-[8px] px-3 py-2 text-sm bg-white outline-none focus:border-[#A8C5E0] transition-colors"
                      aria-label="Categoria"
                    >
                      {visibleCategories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addExpenseRow}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-[12px] border-2 border-dashed border-[#E5E7EB] text-sm font-semibold text-[#6B7280] hover:border-[#A8C5E0] hover:text-[#1A1D23] transition-colors"
            >
              <Plus size={16} weight="bold" /> Adicionar gasto
            </button>
          </section>
        )}

        {step === 'categories' && (
          <section className="flex-1">
            <h2 className="text-xl font-heading text-[#1A1D23]">Suas categorias</h2>
            <p className="text-sm text-[#6B7280] mt-1 mb-4">
              Estas são as categorias que você terá disponíveis. Não se preocupe, você pode mudar depois.
            </p>

            <div className="grid grid-cols-3 gap-2 mb-4">
              {visibleCategories.map((cat) => (
                <div
                  key={cat.id}
                  className="flex flex-col items-center gap-1 rounded-[12px] py-3 px-2 border border-[#E5E7EB] bg-white"
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: `${cat.color}18`, color: cat.color }}
                  >
                    <Icon name={cat.icon} size={20} />
                  </div>
                  <span className="text-[11px] font-medium text-[#1A1D23] text-center leading-tight">
                    {cat.name}
                  </span>
                </div>
              ))}

              {customCategories.map((cat, idx) => (
                <div
                  key={`custom-${idx}`}
                  className="relative flex flex-col items-center gap-1 rounded-[12px] py-3 px-2 border border-[#5BBF8E]/40 bg-[#EEF9F4]"
                >
                  <button
                    type="button"
                    onClick={() => removeCustomCategory(idx)}
                    className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center rounded-full bg-white/80 hover:bg-white"
                    aria-label={`Remover ${cat.name}`}
                  >
                    <Trash size={10} className="text-[#B14C4C]" />
                  </button>
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: `${cat.color}18`, color: cat.color }}
                  >
                    <Icon name={cat.icon} size={20} />
                  </div>
                  <span className="text-[11px] font-medium text-[#1A1D23] text-center leading-tight">
                    {cat.name}
                  </span>
                </div>
              ))}
            </div>

            {!showCustomForm ? (
              <button
                type="button"
                onClick={() => setShowCustomForm(true)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-[12px] border-2 border-dashed border-[#E5E7EB] text-sm font-semibold text-[#6B7280] hover:border-[#A8C5E0] hover:text-[#1A1D23] transition-colors"
              >
                <Plus size={16} weight="bold" /> Criar categoria personalizada
              </button>
            ) : (
              <div className="bg-white border border-[#E5E7EB] rounded-[16px] p-4 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#6B7280] uppercase mb-1.5">Nome</label>
                  <input
                    type="text"
                    value={customDraft.name}
                    onChange={(e) => setCustomDraft((d) => ({ ...d, name: e.target.value }))}
                    placeholder="Ex: Investimentos"
                    className="w-full border border-[#E5E7EB] rounded-[8px] px-3 py-2 text-sm outline-none focus:border-[#A8C5E0]"
                    maxLength={40}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#6B7280] uppercase mb-1.5">Ícone</label>
                  <div className="grid grid-cols-8 gap-1.5 max-h-32 overflow-y-auto">
                    {AVAILABLE_ICONS.map((iconName) => {
                      const selected = customDraft.icon === iconName;
                      return (
                        <button
                          key={iconName}
                          type="button"
                          onClick={() => setCustomDraft((d) => ({ ...d, icon: iconName }))}
                          aria-pressed={selected}
                          className={`aspect-square flex items-center justify-center rounded-[8px] transition-colors ${
                            selected
                              ? 'bg-[#1A1D23] text-white'
                              : 'bg-[#F8F9FB] text-[#6B7280] hover:bg-[#F1F3F7]'
                          }`}
                        >
                          <Icon name={iconName} size={16} />
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#6B7280] uppercase mb-1.5">Cor</label>
                  <div className="flex gap-2">
                    {SWATCHES.map((color) => {
                      const selected = customDraft.color === color;
                      return (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setCustomDraft((d) => ({ ...d, color }))}
                          aria-label={`Cor ${color}`}
                          className={`w-8 h-8 rounded-full transition-transform ${
                            selected ? 'ring-2 ring-offset-2 ring-[#1A1D23] scale-110' : ''
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      );
                    })}
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCustomForm(false);
                      setCustomDraft({ name: '', icon: 'Tag', color: SWATCHES[0] });
                    }}
                    className="flex-1 py-2.5 rounded-full text-sm font-semibold text-[#6B7280] hover:bg-[#F1F3F7] transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={saveCustomCategory}
                    disabled={!customDraft.name.trim()}
                    className="flex-1 py-2.5 rounded-full text-sm font-semibold text-white bg-[#5BBF8E] hover:bg-[#4AA77C] disabled:opacity-40 transition-colors"
                  >
                    Adicionar
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {error && (
          <div
            role="alert"
            className="mt-4 flex items-center gap-2 px-4 py-3 rounded-[12px] bg-[#FDF0F0] text-[#B14C4C] border border-[#F4D7D7]"
          >
            <WarningCircle size={18} className="shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {/* CTA */}
        <div className="mt-auto pt-6 space-y-2">
          <button
            type="button"
            onClick={goNext}
            disabled={!canNext || pending}
            className="w-full bg-[#5BBF8E] hover:bg-[#4AA77C] active:bg-[#3FA876] text-white font-bold py-4 rounded-full transition-colors duration-150 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            style={{ boxShadow: '0 6px 20px rgba(91, 191, 142, 0.35)' }}
          >
            {pending ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Salvando...
              </>
            ) : step === 'categories' ? (
              'Concluir'
            ) : step === 'theme' ? (
              theme === 'dark' ? 'Continuar no modo escuro' : 'Continuar no modo claro'
            ) : step === 'balance' && currentBalanceCents > 0 ? (
              `Continuar — ${formatCurrency(currentBalanceCents)}`
            ) : step === 'budget' && monthlyBudgetCents > 0 ? (
              `Continuar — ${formatCurrency(monthlyBudgetCents)}/mês`
            ) : step === 'categoryBudget' ? (
              categoryBudgetTotal > 0 ? 'Continuar com distribuição' : 'Continuar sem distribuir'
            ) : (
              'Continuar'
            )}
          </button>
          {step === 'categoryBudget' && (
            <button
              type="button"
              onClick={skipCategoryBudget}
              disabled={pending}
              className="w-full py-2 text-sm font-medium text-[#6B7280] hover:text-[#1A1D23] transition-colors disabled:opacity-40"
            >
              Pular esta etapa
            </button>
          )}
          {step === 'expenses' && expenseRows.length === 0 && (
            <button
              type="button"
              onClick={goNext}
              disabled={pending}
              className="w-full py-2 text-sm font-medium text-[#6B7280] hover:text-[#1A1D23] transition-colors disabled:opacity-40"
            >
              Pular esta etapa
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
