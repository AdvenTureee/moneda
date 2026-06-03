'use client';

import { useState, useMemo, useEffect, useCallback, useRef, useLayoutEffect, Suspense, type ComponentType } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, useSearchParams } from 'next/navigation';
import { CalendarBlank, CreditCard, MagnifyingGlass, Tag, Wallet, X } from '@phosphor-icons/react';
import ExpenseCard from '@/components/ExpenseCard';
import AddExpenseModal from '@/components/AddExpenseModal';
import ConfirmDialog from '@/components/ConfirmDialog';
import DatePicker from '@/components/DatePicker';
import UpcomingInstallmentsModal from '@/components/UpcomingInstallmentsModal';
import { hasUpcomingInstallments } from '@/lib/installments';
import type { DateRange } from '@/components/DateRangePicker';
import Icon from '@/components/Icon';
import Mo from '@/components/Mo';
import { LEGEND_PAYMENT_METHODS, PAYMENT_METHOD_BADGES } from '@/lib/paymentMethods';
import { useToast } from '@/components/ToastProvider';
import { groupExpensesByDate, formatCurrency } from '@/lib/utils';
import {
  formatBillingCycleLabel,
  getBillingCycleForPeriod,
  getCurrentBillingPeriod,
  shiftPeriod,
} from '@/lib/billingCycle';
import { useCategories } from '@/hooks/useCategories';
import type { Expense, ExpenseInput, ExpensePaymentMethod } from '@/types';

type FilterTab = 'date' | 'category' | 'payment';
type FeedView = 'history' | 'scheduled';
type DateFilterItem = {
  id: string;
  label: string;
  description?: string;
  range: DateRange;
};

const PAYMENT_FILTERS: Array<{ value: ExpensePaymentMethod; label: string; icon: string }> =
  LEGEND_PAYMENT_METHODS.map((method) => ({
    value: method,
    label: PAYMENT_METHOD_BADGES[method]?.label ?? method,
    icon: PAYMENT_METHOD_BADGES[method]?.iconName ?? 'CreditCard',
  }));

const DEFAULT_DATE_PRESET = 'current-cycle';

function parseDateInputToIso(input: string, end: boolean): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) return null;
  const [y, m, d] = input.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  if (end) date.setHours(23, 59, 59, 999);
  else date.setHours(0, 0, 0, 0);
  return date.toISOString();
}

function isoToDateInput(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function startOfDay(date: Date): string {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy.toISOString();
}

function endOfDay(date: Date): string {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy.toISOString();
}

function compactCycleRange(period: string, closingDay: number): string {
  return formatBillingCycleLabel(period, closingDay).split(' · ')[1] ?? '';
}

function cycleMonthLabel(period: string): string {
  const [year, month] = period.split('-').map(Number);
  const label = new Date(year, month - 1, 1).toLocaleDateString('pt-BR', { month: 'long' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function buildCycleRange(period: string, closingDay: number, presetId: string): DateRange {
  const cycle = getBillingCycleForPeriod(period, closingDay);
  return {
    from: cycle.start.toISOString(),
    to: cycle.end.toISOString(),
    presetId,
  };
}

function buildPreset(id: string, closingDay: number): DateRange {
  const now = new Date();
  if (id === 'current-cycle') {
    return buildCycleRange(getCurrentBillingPeriod(closingDay), closingDay, id);
  }
  if (/^cycle-[1-6]$/.test(id)) {
    const offset = Number(id.replace('cycle-', ''));
    const period = shiftPeriod(getCurrentBillingPeriod(closingDay), -offset);
    return buildCycleRange(period, closingDay, id);
  }
  if (id === 'last-30') {
    const from = new Date(now);
    from.setDate(from.getDate() - 30);
    return { from: startOfDay(from), to: endOfDay(now), presetId: id };
  }
  return { from: null, to: null, presetId: 'all' };
}

function buildDateFilters(closingDay: number): DateFilterItem[] {
  const currentPeriod = getCurrentBillingPeriod(closingDay);
  const cycles = Array.from({ length: 7 }, (_, index) => {
    const period = shiftPeriod(currentPeriod, -index);
    const id = index === 0 ? 'current-cycle' : `cycle-${index}`;
    return {
      id,
      label: index === 0 ? 'Ciclo atual' : cycleMonthLabel(period),
      description: compactCycleRange(period, closingDay),
      range: buildCycleRange(period, closingDay, id),
    };
  });

  return [
    ...cycles,
    {
      id: 'last-30',
      label: 'Últimos 30 dias',
      range: buildPreset('last-30', closingDay),
    },
    {
      id: 'all',
      label: 'Tudo',
      range: buildPreset('all', closingDay),
    },
  ];
}

function rangeFromSearchParams(params: URLSearchParams): DateRange | null {
  const fromRaw = params.get('from');
  const toRaw = params.get('to');
  if (!fromRaw && !toRaw) return null;
  const from = fromRaw ? parseDateInputToIso(fromRaw, false) : null;
  const to = toRaw ? parseDateInputToIso(toRaw, true) : from;
  if (!from && !to) return null;
  return { from, to, presetId: 'custom' };
}

function dateFilterLabel(range: DateRange, filters: DateFilterItem[]): string {
  const preset = filters.find((item) => item.id === range.presetId);
  if (preset?.id?.startsWith('cycle-')) {
    return `Ciclo · ${preset.description ?? ''}`;
  }
  if (preset) return preset.label;
  return 'Personalizado';
}

function paymentFilterLabel(method: ExpensePaymentMethod | null): string {
  return PAYMENT_FILTERS.find((item) => item.value === method)?.label ?? 'Todos';
}

interface FeedViewProps {
  billingClosingDay: number;
}

function FeedPageInner({ billingClosingDay }: FeedViewProps) {
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const router = useRouter();
  const dateFilters = useMemo(() => buildDateFilters(billingClosingDay), [billingClosingDay]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activePaymentMethod, setActivePaymentMethod] = useState<ExpensePaymentMethod | null>(null);
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState<DateRange>(() => buildPreset(DEFAULT_DATE_PRESET, billingClosingDay));
  const [activeView, setActiveView] = useState<FeedView>('history');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [activeFilterTab, setActiveFilterTab] = useState<FilterTab>('date');
  const [filtersPosition, setFiltersPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const filtersAnchorRef = useRef<HTMLDivElement | null>(null);

  // Read date range from URL after mount to avoid SSR/CSR hydration mismatch.
  useEffect(() => {
    const range = rangeFromSearchParams(new URLSearchParams(searchParams.toString()));
    if (range) setDateRange(range);
    // Run only on initial mount; further filter changes come from the picker.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (dateRange.presetId !== 'custom') return;
    setCustomFrom(isoToDateInput(dateRange.from));
    setCustomTo(isoToDateInput(dateRange.to));
  }, [dateRange]);

  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const { data: categories } = useCategories();
  const [loading, setLoading] = useState(true);
  const [hasLoadedExpenses, setHasLoadedExpenses] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);
  const [selectedInstallmentExpense, setSelectedInstallmentExpense] = useState<Expense | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!filtersOpen) return;

    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousHtmlScrollbarGutter = document.documentElement.style.scrollbarGutter;
    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyOverscroll = document.body.style.overscrollBehavior;

    document.documentElement.style.scrollbarGutter = 'stable';
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'contain';

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.documentElement.style.scrollbarGutter = previousHtmlScrollbarGutter;
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.overscrollBehavior = previousBodyOverscroll;
    };
  }, [filtersOpen]);

  useLayoutEffect(() => {
    if (!filtersOpen) return;
    const update = () => {
      const anchor = filtersAnchorRef.current;
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      const width = Math.min(420, window.innerWidth - 16);
      setFiltersPosition({
        top: rect.bottom + 6,
        left: Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8)),
        width,
      });
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [filtersOpen]);

  const fetchExpenses = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (activeCategory) params.set('category', activeCategory);
      if (activePaymentMethod) params.set('paymentMethod', activePaymentMethod);
      if (search.trim()) params.set('search', search.trim());
      if (dateRange.from) params.set('startDate', dateRange.from);
      if (dateRange.to) params.set('endDate', dateRange.to);
      if (activeView === 'scheduled') params.set('onlyFuture', 'true');
      const url = `/api/expenses${params.size ? '?' + params.toString() : ''}`;
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) {
        if (res.status === 401) {
          window.location.href = '/login';
          return;
        }
        throw new Error('Erro ao buscar despesas');
      }
      const json = await res.json();
      setAllExpenses(json.data ?? []);
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') return;
      setError(e instanceof Error ? e.message : 'Erro desconhecido');
    } finally {
      setHasLoadedExpenses(true);
      setLoading(false);
    }
  }, [activeCategory, activePaymentMethod, search, dateRange, activeView]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  useEffect(() => {
    const handler = (event: Event) => {
      const expense = (event as CustomEvent<{ expense?: Expense }>).detail?.expense;
      if (expense) {
        setAllExpenses((prev) => {
          const exists = prev.some((item) => item.id === expense.id);
          return exists
            ? prev.map((item) => (item.id === expense.id ? expense : item))
            : [expense, ...prev];
        });
      }
      fetchExpenses();
    };
    window.addEventListener('expense-mutated', handler);
    return () => window.removeEventListener('expense-mutated', handler);
  }, [fetchExpenses]);

  const filtered = useMemo(() => {
    let result = allExpenses;

    if (activeCategory) {
      result = result.filter((e) => e.category === activeCategory);
    }

    if (activePaymentMethod) {
      result = result.filter((e) => e.paymentMethod === activePaymentMethod);
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (e) =>
          e.description.toLowerCase().includes(q) ||
          (categories.find((c) => c.id === e.category)?.name.toLowerCase().includes(q) ?? false)
      );
    }

    return result.sort((a, b) => {
      const aTime = new Date(a.createdAt).getTime();
      const bTime = new Date(b.createdAt).getTime();
      return activeView === 'scheduled' ? aTime - bTime : bTime - aTime;
    });
  }, [allExpenses, activeCategory, activePaymentMethod, search, activeView]);

  const groups = activeView === 'scheduled'
    ? [...groupExpensesByDate(filtered)].reverse()
    : groupExpensesByDate(filtered);
  const categoryLabel = activeCategory
    ? categories.find((category) => category.id === activeCategory)?.name ?? 'Categoria'
    : 'Todas';
  const paymentMeta = activePaymentMethod ? PAYMENT_METHOD_BADGES[activePaymentMethod] : null;
  const activeFilterCount =
    (dateRange.presetId !== DEFAULT_DATE_PRESET ? 1 : 0) + (activeCategory ? 1 : 0) + (activePaymentMethod ? 1 : 0);
  const filterTabs: Array<{
    id: FilterTab;
    label: string;
    value: string;
    icon: ComponentType<{ size?: number; weight?: 'regular' | 'bold'; className?: string }>;
    active: boolean;
  }> = [
    {
      id: 'date',
      label: 'Data',
      value: dateFilterLabel(dateRange, dateFilters),
      icon: CalendarBlank,
      active: dateRange.presetId !== DEFAULT_DATE_PRESET,
    },
    {
      id: 'category',
      label: 'Categoria',
      value: categoryLabel,
      icon: Tag,
      active: activeCategory !== null,
    },
    {
      id: 'payment',
      label: 'Método',
      value: paymentFilterLabel(activePaymentMethod),
      icon: CreditCard,
      active: activePaymentMethod !== null,
    },
  ];

  const clearFilters = useCallback(() => {
    setDateRange(buildPreset(DEFAULT_DATE_PRESET, billingClosingDay));
    setCustomFrom('');
    setCustomTo('');
    setActiveCategory(null);
    setActivePaymentMethod(null);
  }, [billingClosingDay]);

  const openFilterTab = useCallback((tabId: FilterTab) => {
    setActiveFilterTab(tabId);
    setFiltersOpen(true);
  }, []);

  const applyCustomDateRange = useCallback(() => {
    const from = parseDateInputToIso(customFrom, false);
    const to = parseDateInputToIso(customTo, true);
    if (!from || !to) return;
    setDateRange({ from, to, presetId: 'custom' });
  }, [customFrom, customTo]);

  const handleViewChange = useCallback((nextView: FeedView) => {
    if (nextView === activeView) return;
    setAllExpenses([]);
    setActiveView(nextView);
  }, [activeView]);

  const handleDelete = useCallback(async (expense: Expense) => {
    setDeletingExpense(expense);
  }, []);

  const handleInstallmentClick = useCallback((expense: Expense) => {
    if (!hasUpcomingInstallments(expense)) return;
    setSelectedInstallmentExpense(expense);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deletingExpense) return;
    try {
      const res = await fetch(`/api/expenses?id=${deletingExpense.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Erro ao excluir gasto');
      window.sessionStorage.setItem('moneda:expense-mutated', '1');
      window.dispatchEvent(new CustomEvent('expense-mutated', { detail: { expense: deletingExpense } }));
      setDeletingExpense(null);
      showToast('success', 'Gasto excluído com sucesso');
      fetchExpenses();
      router.refresh();
    } catch {
      setDeletingExpense(null);
    }
  }, [deletingExpense, fetchExpenses, router, showToast]);

  const handleEditSave = useCallback(async (input: ExpenseInput) => {
    if (!editingExpense) return;
    try {
      const res = await fetch('/api/expenses', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingExpense.id, ...input }),
      });
      if (!res.ok) throw new Error('Erro ao atualizar gasto');
      const data = await res.json().catch(() => null);
      window.sessionStorage.setItem('moneda:expense-mutated', '1');
      window.dispatchEvent(new CustomEvent('expense-mutated', { detail: { expense: data?.data } }));
      setEditingExpense(null);
      showToast('success', 'Gasto atualizado com sucesso');
      fetchExpenses();
      router.refresh();
      return data?.data;
    } catch {
      // ignore
    }
  }, [editingExpense, fetchExpenses, showToast]);

  const showInitialSkeleton = loading && !hasLoadedExpenses;

  return (
    <>
      <div className="max-w-lg mx-auto px-4 pb-24 [scrollbar-gutter:stable]">
        {/* Header */}
        <header className="py-6 animate-fade-up delay-0">
          <h1 className="text-2xl font-heading text-[#1A1D23]">Feed de Gastos</h1>
        </header>

        <div className="themed-card bg-white rounded-[14px] p-2.5 space-y-2.5 mb-4 animate-fade-up delay-1">
          <div className="relative grid grid-cols-2 overflow-hidden rounded-[12px] bg-[#F4F6FA] p-0.5 dark:bg-white/6" role="tablist" aria-label="Visão do feed">
            <span
              className={`absolute bottom-0.5 top-0.5 w-[calc(50%-2px)] rounded-[10px] bg-[#EEF9F4] shadow-sm transition-transform duration-200 ease-out dark:bg-[#5BBF8E]/14 ${
                activeView === 'scheduled' ? 'translate-x-[calc(100%+4px)]' : 'translate-x-0.5'
              }`}
              aria-hidden
            />
            {[
              { id: 'history' as const, label: 'Histórico' },
              { id: 'scheduled' as const, label: 'Agendados' },
            ].map((view) => {
              const selected = activeView === view.id;
              return (
                <button
                  key={view.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => handleViewChange(view.id)}
                  className={`relative z-10 min-h-8 rounded-[10px] px-3 text-[13px] font-bold outline-none transition-[color,transform] duration-150 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-[#A8C5E0] focus-visible:ring-offset-1 ${
                    selected
                      ? 'text-[#2E8F67] dark:text-[#7EE0AE]'
                      : 'text-[#6B7280] hover:text-[#1A1D23] dark:text-[#9CA3AF] dark:hover:text-[#F5F7FA]'
                  }`}
                >
                  {view.label}
                </button>
              );
            })}
            </div>

            {/* Search bar */}
            <div className="relative">
                <MagnifyingGlass
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7C8898] dark:text-[#94A3B8]"
                  aria-hidden
                />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar gasto..."
                  className="themed-field h-9 w-full rounded-[9px] border border-[#E5E7EB] bg-[#F8F9FB] pl-9 pr-3 text-sm text-[#1A1D23] placeholder:text-[#7C8898] outline-none transition-colors focus:border-[#A8C5E0] dark:border-white/10 dark:bg-white/6 dark:text-[#F5F7FA] dark:placeholder:text-[#94A3B8]"
                  aria-label="Buscar gastos"
                />
            </div>

          <div
            ref={filtersAnchorRef}
            className="-mx-0.5 flex gap-1.5 overflow-x-auto px-0.5 pb-0.5 text-[11px] font-semibold text-[#6B7280] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {filterTabs.map((tab) => {
              const TabIcon = tab.icon;
              const PaymentIcon = tab.id === 'payment' ? paymentMeta?.Icon : null;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => openFilterTab(tab.id)}
                  aria-label={`Filtro de ${tab.label.toLowerCase()}: ${tab.value}. Clique para alterar.`}
                  aria-pressed={tab.active}
                  data-active={tab.active ? 'true' : 'false'}
                  className={`group flex h-8 max-w-[180px] shrink-0 items-center justify-center gap-1.5 rounded-full border px-3 text-center outline-none transition-[background-color,border-color,box-shadow,color,transform] duration-150 ease-out active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-[#A8C5E0] focus-visible:ring-offset-1 ${
                    tab.active
                      ? 'border-[#5BBF8E]/45 bg-[#EEF9F4] text-[#2E8F67] hover:border-[#5BBF8E]/70 hover:bg-[#EAF7F0] dark:border-[#5BBF8E]/45 dark:bg-[#5BBF8E]/14 dark:text-[#7EE0AE]'
                      : 'border-[#E5E7EB] bg-[#F8F9FB] text-[#6B7280] hover:border-[#A8C5E0]/70 hover:bg-[#EEF2F7] dark:border-white/10 dark:bg-white/6 dark:text-[#CBD5E1] dark:hover:bg-white/10'
                  }`}
                >
                  {PaymentIcon && paymentMeta ? (
                    <span
                      className="grid h-4 w-4 shrink-0 place-items-center rounded-full text-white"
                      style={{ backgroundColor: paymentMeta.color }}
                      aria-hidden
                    >
                      <PaymentIcon size={9} weight="bold" />
                    </span>
                  ) : (
                    <TabIcon
                      size={13}
                      weight="bold"
                      className={`shrink-0 ${tab.active ? 'text-[#3FA876] dark:text-[#7EE0AE]' : 'text-[#7C8898] dark:text-[#94A3B8]'}`}
                      aria-hidden
                    />
                  )}
                  <span className="min-w-0 truncate">{tab.value}</span>
                  {tab.active && (
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#5BBF8E]" aria-hidden />
                  )}
                </button>
              );
            })}
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={clearFilters}
                className="h-8 shrink-0 rounded-full px-3 text-[11px] font-bold text-[#5BBF8E] outline-none transition-colors hover:bg-[#EEF9F4] focus-visible:ring-2 focus-visible:ring-[#A8C5E0] focus-visible:ring-offset-1 dark:hover:bg-white/8"
              >
                Limpar
              </button>
            )}
          </div>
        </div>

        {mounted && filtersOpen && filtersPosition && createPortal(
          <>
            <button
              type="button"
              className="fixed inset-0 z-[100] cursor-default bg-transparent"
              aria-label="Fechar filtros"
              onClick={() => setFiltersOpen(false)}
            />
            <div
              className="date-range-menu fixed z-[101] max-h-[calc(100dvh-16px)] overflow-hidden rounded-[18px] p-2 backdrop-blur-xl"
              style={{
                top: filtersPosition.top,
                left: filtersPosition.left,
                width: filtersPosition.width,
              }}
              role="dialog"
              aria-label="Filtros do feed"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-3 px-2 pb-2 pt-1">
                <div>
                  <p className="text-sm font-bold text-[#1A1D23] dark:text-[#F5F7FA]">Filtros</p>
                  <p className="text-xs font-medium text-[#9CA3AF]">
                    {filterTabs.find((tab) => tab.id === activeFilterTab)?.label}: {filterTabs.find((tab) => tab.id === activeFilterTab)?.value}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  {activeFilterCount > 0 && (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="rounded-[9px] px-2.5 py-2 text-xs font-semibold text-[#5BBF8E] transition-colors hover:bg-[#EEF9F4] dark:hover:bg-white/8"
                    >
                      Limpar
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setFiltersOpen(false)}
                    className="flex h-8 w-8 items-center justify-center rounded-[9px] text-[#6B7280] transition-colors hover:bg-[#F1F3F7] dark:text-[#CBD5E1] dark:hover:bg-white/8"
                    aria-label="Fechar"
                  >
                    <X size={16} weight="bold" />
                  </button>
                </div>
              </div>

              <div className="mt-2 max-h-[min(360px,calc(100dvh-140px))] overflow-y-auto overscroll-contain rounded-[14px] border border-[color-mix(in_srgb,var(--color-border)_76%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_86%,transparent)] p-2">
                {activeFilterTab === 'date' && (
                  <div className="space-y-2" role="tabpanel" aria-label="Filtro de data">
                    <div className="space-y-1">
                      {dateFilters.slice(0, 1).map((item) => {
                        const selected = dateRange.presetId === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setDateRange(item.range)}
                            className={`date-range-option flex min-h-12 w-full items-center justify-between gap-3 rounded-[11px] px-3 text-left transition-colors ${
                              selected ? 'date-range-option--selected' : ''
                            }`}
                          >
                            <span className="min-w-0">
                              <span className="block text-sm font-bold">{item.label}</span>
                              {item.description && (
                                <span className="block truncate text-[11px] font-semibold opacity-70">{item.description}</span>
                              )}
                            </span>
                            {selected && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#5BBF8E]" aria-hidden />}
                          </button>
                        );
                      })}
                    </div>

                    <div className="date-range-custom border-t px-1 pt-3">
                      <p className="date-range-kicker mb-2 text-[11px] font-semibold uppercase tracking-wider">
                        Ciclos anteriores
                      </p>
                      <div className="space-y-1">
                        {dateFilters.slice(1, 7).map((item) => {
                          const selected = dateRange.presetId === item.id;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => setDateRange(item.range)}
                              className={`date-range-option flex min-h-11 w-full items-center justify-between gap-3 rounded-[11px] px-3 text-left transition-colors ${
                                selected ? 'date-range-option--selected' : ''
                              }`}
                            >
                              <span className="min-w-0">
                                <span className="block text-sm font-semibold">{item.label}</span>
                                {item.description && (
                                  <span className="block truncate text-[11px] font-medium opacity-70">{item.description}</span>
                                )}
                              </span>
                              {selected && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#5BBF8E]" aria-hidden />}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5">
                      {dateFilters.slice(7).map((item) => {
                        const selected = dateRange.presetId === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setDateRange(item.range)}
                            className={`date-range-option min-h-11 rounded-[11px] px-3 text-left text-sm font-semibold transition-colors ${
                              selected ? 'date-range-option--selected' : ''
                            }`}
                          >
                            {item.label}
                          </button>
                        );
                      })}
                    </div>

                    <div className="date-range-custom border-t px-1 pb-1 pt-3">
                      <p className="date-range-kicker mb-2 text-[11px] font-semibold uppercase tracking-wider">
                        Personalizado
                      </p>
                      <div className="grid grid-cols-2 gap-1.5">
                        <div>
                          <span className="date-range-label mb-1 block text-[11px]">De</span>
                          <DatePicker
                            value={customFrom}
                            onChange={setCustomFrom}
                            max={customTo || undefined}
                            ariaLabel="Data inicial"
                            placeholder="Início"
                            className="date-range-input flex w-full items-center gap-1.5 rounded-[9px] border px-2.5 py-2 text-left text-xs outline-none transition-colors"
                          />
                        </div>
                        <div>
                          <span className="date-range-label mb-1 block text-[11px]">Até</span>
                          <DatePicker
                            value={customTo}
                            onChange={setCustomTo}
                            min={customFrom || undefined}
                            ariaLabel="Data final"
                            placeholder="Fim"
                            className="date-range-input flex w-full items-center gap-1.5 rounded-[9px] border px-2.5 py-2 text-left text-xs outline-none transition-colors"
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={applyCustomDateRange}
                        disabled={!customFrom || !customTo}
                        className="mt-2 w-full rounded-[10px] bg-[#5BBF8E] px-3 py-2 text-xs font-semibold text-white transition-colors duration-150 hover:bg-[#4AA77C] active:bg-[#3FA876] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Aplicar período
                      </button>
                    </div>
                  </div>
                )}

                {activeFilterTab === 'category' && (
                  <div className="space-y-1" role="tabpanel" aria-label="Filtro de categoria">
                    <button
                      type="button"
                      onClick={() => setActiveCategory(null)}
                      className={`date-range-option flex min-h-11 w-full items-center gap-2 rounded-[11px] px-3 text-left text-sm font-semibold transition-colors ${
                        activeCategory === null ? 'date-range-option--selected' : ''
                      }`}
                    >
                      <Icon name="Sparkle" size={15} aria-hidden />
                      Todas
                    </button>
                    {categories.filter((category) => category.id !== 'outros').map((category) => (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() =>
                          setActiveCategory((prev) => (prev === category.id ? null : category.id))
                        }
                        className={`date-range-option flex min-h-11 w-full items-center gap-2 rounded-[11px] px-3 text-left text-sm font-semibold transition-colors ${
                          activeCategory === category.id ? 'date-range-option--selected' : ''
                        }`}
                      >
                        <Icon name={category.icon} size={15} color={category.color} aria-hidden />
                        <span className="min-w-0 flex-1 truncate">{category.name}</span>
                      </button>
                    ))}
                  </div>
                )}

                {activeFilterTab === 'payment' && (
                  <div className="grid grid-cols-2 gap-1.5" role="tabpanel" aria-label="Filtro de método de pagamento">
                    <button
                      type="button"
                      onClick={() => setActivePaymentMethod(null)}
                      className={`date-range-option flex min-h-11 items-center gap-2 rounded-[11px] px-3 text-left text-sm font-semibold transition-colors ${
                        activePaymentMethod === null ? 'date-range-option--selected' : ''
                      }`}
                    >
                      <Wallet size={15} aria-hidden />
                      Todos
                    </button>
                    {PAYMENT_FILTERS.map((method) => (
                      (() => {
                        const meta = PAYMENT_METHOD_BADGES[method.value];
                        return (
                          <button
                            key={method.value}
                            type="button"
                            onClick={() =>
                              setActivePaymentMethod((prev) => (prev === method.value ? null : method.value))
                            }
                            className={`date-range-option flex min-h-11 items-center gap-2 rounded-[11px] px-3 text-left text-sm font-semibold transition-colors ${
                              activePaymentMethod === method.value ? 'date-range-option--selected' : ''
                            }`}
                          >
                            <Icon name={method.icon} size={15} color={meta?.color} aria-hidden />
                            {method.label}
                          </button>
                        );
                      })()
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>,
          document.body,
        )}

        {/* Expense list grouped by date */}
        <div className="relative min-h-[500px]">
          {/* Skeleton layer */}
          <div
            className="absolute inset-0 space-y-4 transition-opacity duration-200"
            style={{ opacity: showInitialSkeleton ? 1 : 0 }}
            aria-hidden={!showInitialSkeleton}
          >
            {[0, 1, 2].map((i) => (
              <div key={i}>
                <div className="h-10 bg-[#F4F6FA] rounded-[10px] mb-2" />
                <div className="space-y-2">
                  <div className="h-[76px] bg-[#F4F6FA] rounded-[10px]" />
                  {i < 2 && <div className="h-[76px] bg-[#F4F6FA] rounded-[10px]" />}
                </div>
              </div>
            ))}
          </div>

          {/* Content layer */}
          <div
            className="transition-opacity duration-200"
            style={{ opacity: showInitialSkeleton ? 0 : 1 }}
          >
            {error ? (
                <div className="flex flex-col items-center py-16 text-center">
                  <Icon name="Warning" size={48} className="mb-4 opacity-30" />
                  <p className="text-base font-semibold text-[#B14C4C]">{error}</p>
                  <button
                    onClick={fetchExpenses}
                    className="mt-2 px-4 py-2 bg-[#5BBF8E] hover:bg-[#4AA77C] active:bg-[#3FA876] text-white rounded-[10px] text-sm font-semibold transition-colors duration-150 active:scale-[0.98]"
                  >
                    Tentar novamente
                  </button>
                </div>
              ) : groups.length === 0 ? (
                <div className="flex flex-col items-center py-16 text-center">
                  {search || activeCategory || activePaymentMethod || dateRange.presetId !== DEFAULT_DATE_PRESET ? (
                    <>
                      <Mo variant="thinking" size={128} className="mb-4 animate-bounce-in" />
                      <p className="text-base font-semibold text-[#1A1D23]">
                        Nenhum gasto encontrado
                      </p>
                      <p className="text-sm text-[#6B7280] mt-1">
                        Tente ajustar os filtros.
                      </p>
                    </>
                  ) : activeView === 'scheduled' ? (
                    <>
                      <Mo variant="thinking" size={128} className="mb-4 animate-bounce-in" />
                      <p className="text-base font-semibold text-[#1A1D23]">
                        Nenhum gasto agendado
                      </p>
                      <p className="text-sm text-[#6B7280] mt-1">
                        Sem próximos lançamentos por enquanto.
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-[#6B7280] mt-1">
                      Comece adicionando sua primeira despesa tocando em <strong>+</strong>.
                    </p>
                  )}
                </div>
              ) : (
                groups.map((group, gi) => {
                  const dayTotal = group.items.reduce((sum, e) => sum + e.amount, 0);
                  return (
                    <section
                      key={group.dateKey}
                      className={`mb-7 animate-fade-up delay-${Math.min(gi + 2, 8)}`}
                      aria-labelledby={`feed-date-${group.dateKey}`}
                    >
                      {/* Date section header */}
                      <div
                        className="mb-3 flex items-center gap-3"
                      >
                        <div className="h-px flex-1 bg-[color-mix(in_srgb,var(--color-border)_70%,transparent)]" />
                        <h2
                          id={`feed-date-${group.dateKey}`}
                          className="shrink-0 rounded-full border border-[#E5E7EB] bg-white px-3.5 py-1.5 text-xs font-bold text-[#6B7280] shadow-sm"
                        >
                          {group.label}
                        </h2>
                        <span className="shrink-0 rounded-full bg-[#FDF0F0] px-3 py-1.5 text-xs font-bold text-[#E07070] tabular-nums">
                          −{formatCurrency(dayTotal)}
                        </span>
                      </div>

                      {/* Expense cards */}
                      <div className="space-y-2.5 border-l-2 border-[color-mix(in_srgb,var(--color-border)_72%,transparent)] pl-3">
                        {group.items.map((expense, ei) => (
                          <div key={expense.id}>
                            <ExpenseCard
                              expense={expense}
                              variant="full"
                              onClick={hasUpcomingInstallments(expense) ? () => handleInstallmentClick(expense) : undefined}
                              onEdit={() => setEditingExpense(expense)}
                              onDelete={() => handleDelete(expense)}
                              onReceiptChanged={fetchExpenses}
                            />
                          </div>
                        ))}
                      </div>
                    </section>
                  );
                })
            )}
          </div>
        </div>
      </div>
      <AddExpenseModal
        isOpen={!!editingExpense}
        onClose={() => setEditingExpense(null)}
        onSave={handleEditSave}
        editExpense={editingExpense ?? undefined}
      />
      <UpcomingInstallmentsModal
        isOpen={!!selectedInstallmentExpense}
        expense={selectedInstallmentExpense}
        billingClosingDay={billingClosingDay}
        onClose={() => setSelectedInstallmentExpense(null)}
      />
      <ConfirmDialog
        isOpen={!!deletingExpense}
        title="Excluir gasto"
        message={
          deletingExpense?.seriesId
            ? `Tem certeza que deseja excluir "${deletingExpense.description}" e os lançamentos futuros desta série?`
            : `Tem certeza que deseja excluir "${deletingExpense?.description}"?`
        }
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeletingExpense(null)}
      />
    </>
  );
}

export default function FeedView({ billingClosingDay }: FeedViewProps) {
  return (
    <Suspense fallback={null}>
      <FeedPageInner billingClosingDay={billingClosingDay} />
    </Suspense>
  );
}
