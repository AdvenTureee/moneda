'use client';

import { useState, useMemo, useEffect, useCallback, useRef, useLayoutEffect, Suspense, type ComponentType } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'next/navigation';
import { CalendarBlank, CaretDown, CreditCard, FunnelSimple, MagnifyingGlass, Tag, Wallet, X } from '@phosphor-icons/react';
import ExpenseCard from '@/components/ExpenseCard';
import AddExpenseModal from '@/components/AddExpenseModal';
import ConfirmDialog from '@/components/ConfirmDialog';
import { buildPreset, type DateRange } from '@/components/DateRangePicker';
import Icon from '@/components/Icon';
import Mo from '@/components/Mo';
import { useToast } from '@/components/ToastProvider';
import { groupExpensesByDate, formatCurrency } from '@/lib/utils';
import { useCategories } from '@/hooks/useCategories';
import type { Expense, ExpenseInput, ExpensePaymentMethod } from '@/types';

type FilterTab = 'date' | 'category' | 'payment';

const PAYMENT_FILTERS: Array<{ value: ExpensePaymentMethod; label: string; icon: string }> = [
  { value: 'pix', label: 'PIX', icon: 'CurrencyDollar' },
  { value: 'debit', label: 'Débito', icon: 'Bank' },
  { value: 'credit', label: 'Crédito', icon: 'CreditCard' },
];

const DATE_FILTERS = [
  { id: 'all', label: 'Tudo' },
  { id: 'this-month', label: 'Este mês' },
  { id: 'last-month', label: 'Mês passado' },
  { id: 'last-30', label: 'Últimos 30 dias' },
];

function parseDateInputToIso(input: string, end: boolean): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) return null;
  const [y, m, d] = input.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  if (end) date.setHours(23, 59, 59, 999);
  else date.setHours(0, 0, 0, 0);
  return date.toISOString();
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

function dateFilterLabel(range: DateRange): string {
  const preset = DATE_FILTERS.find((item) => item.id === range.presetId);
  if (preset) return preset.label;
  return 'Personalizado';
}

function paymentFilterLabel(method: ExpensePaymentMethod | null): string {
  return PAYMENT_FILTERS.find((item) => item.value === method)?.label ?? 'Todos';
}

function FeedPageInner() {
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activePaymentMethod, setActivePaymentMethod] = useState<ExpensePaymentMethod | null>(null);
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState<DateRange>(() => buildPreset('all'));
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [activeFilterTab, setActiveFilterTab] = useState<FilterTab>('date');
  const [filtersPosition, setFiltersPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const filtersButtonRef = useRef<HTMLButtonElement | null>(null);

  // Read date range from URL after mount to avoid SSR/CSR hydration mismatch.
  useEffect(() => {
    const range = rangeFromSearchParams(new URLSearchParams(searchParams.toString()));
    if (range) setDateRange(range);
    // Run only on initial mount; further filter changes come from the picker.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const { data: categories } = useCategories();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => setMounted(true), []);

  useLayoutEffect(() => {
    if (!filtersOpen) return;
    const update = () => {
      const button = filtersButtonRef.current;
      if (!button) return;
      const rect = button.getBoundingClientRect();
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
      setLoading(false);
    }
  }, [activeCategory, activePaymentMethod, search, dateRange]);

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

    return result.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [allExpenses, activeCategory, activePaymentMethod, search]);

  const groups = groupExpensesByDate(filtered);
  const categoryLabel = activeCategory
    ? categories.find((category) => category.id === activeCategory)?.name ?? 'Categoria'
    : 'Todas';
  const activeFilterCount =
    (dateRange.presetId !== 'all' ? 1 : 0) + (activeCategory ? 1 : 0) + (activePaymentMethod ? 1 : 0);
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
      value: dateFilterLabel(dateRange),
      icon: CalendarBlank,
      active: dateRange.presetId !== 'all',
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
    setDateRange(buildPreset('all'));
    setActiveCategory(null);
    setActivePaymentMethod(null);
  }, []);

  const handleDelete = useCallback(async (expense: Expense) => {
    setDeletingExpense(expense);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deletingExpense) return;
    try {
      const res = await fetch(`/api/expenses?id=${deletingExpense.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Erro ao excluir gasto');
      setDeletingExpense(null);
      showToast('success', 'Gasto excluído com sucesso');
      fetchExpenses();
    } catch {
      setDeletingExpense(null);
    }
  }, [deletingExpense, fetchExpenses, showToast]);

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
      setEditingExpense(null);
      showToast('success', 'Gasto atualizado com sucesso');
      fetchExpenses();
      return data?.data;
    } catch {
      // ignore
    }
  }, [editingExpense, fetchExpenses, showToast]);

  return (
    <>
      <div className="max-w-lg mx-auto px-4 pb-24 [scrollbar-gutter:stable]">
        {/* Header */}
        <header className="py-6 animate-fade-up delay-0">
          <h1 className="text-2xl font-heading text-[#1A1D23]">Feed de Gastos</h1>
        </header>

        <div
          className="themed-card bg-white rounded-[14px] p-3 space-y-3 mb-4 animate-fade-up delay-1"
        >
            {/* Search bar */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <MagnifyingGlass
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]"
                  aria-hidden
                />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar gasto..."
                  className="themed-field w-full pl-9 pr-4 py-2.5 rounded-[10px] bg-[#F4F6FA] border border-transparent text-sm text-[#1A1D23] placeholder:text-[#9CA3AF] outline-none focus:border-[#A8C5E0] transition-colors"
                  aria-label="Buscar gastos"
                />
              </div>
              <button
                ref={filtersButtonRef}
                type="button"
                onClick={() => setFiltersOpen((open) => !open)}
                className="themed-field inline-flex min-h-[42px] shrink-0 items-center gap-2 rounded-[10px] border border-[#E5E7EB] bg-[#F4F6FA] px-3 py-2.5 text-sm font-semibold text-[#1A1D23] outline-none transition-[border-color,background-color,box-shadow] hover:bg-[#EEF2F7] focus:border-[#A8C5E0] focus:shadow-[0_0_0_2px_rgba(168,197,224,0.28)] active:bg-[#E8EDF4]"
                aria-label={`Filtros: data ${dateFilterLabel(dateRange)}, categoria ${categoryLabel}, método ${paymentFilterLabel(activePaymentMethod)}`}
                aria-expanded={filtersOpen}
              >
                <FunnelSimple size={16} weight="bold" className="text-[#6B7280]" />
                <span>Filtros</span>
                {activeFilterCount > 0 && (
                  <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[#5BBF8E] px-1.5 text-[11px] font-bold leading-none text-white">
                    {activeFilterCount}
                  </span>
                )}
                <CaretDown
                  size={10}
                  weight="bold"
                  className={`text-[#6B7280] transition-transform ${filtersOpen ? 'rotate-180' : ''}`}
                />
              </button>
            </div>

          <div className="grid grid-cols-3 gap-1.5 text-[11px] font-semibold text-[#6B7280]">
            <span className="truncate rounded-[8px] bg-[#F4F6FA] px-2.5 py-1.5">
              Data: {dateFilterLabel(dateRange)}
            </span>
            <span className="truncate rounded-[8px] bg-[#F4F6FA] px-2.5 py-1.5">
              Categoria: {categoryLabel}
            </span>
            <span className="truncate rounded-[8px] bg-[#F4F6FA] px-2.5 py-1.5">
              Método: {paymentFilterLabel(activePaymentMethod)}
            </span>
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
                  <p className="text-xs font-medium text-[#9CA3AF]">Data, categoria e método</p>
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

              <div className="rounded-[14px] border border-[color-mix(in_srgb,var(--color-border)_76%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_86%,transparent)] p-1.5">
                <div className="grid grid-cols-3 gap-1" role="tablist" aria-label="Tipo de filtro">
                  {filterTabs.map((tab) => {
                    const TabIcon = tab.icon;
                    const selected = activeFilterTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        role="tab"
                        aria-selected={selected}
                        onClick={() => setActiveFilterTab(tab.id)}
                        className={`min-w-0 rounded-[11px] px-2.5 py-2 text-left transition-colors ${
                          selected
                            ? 'bg-[#5BBF8E] text-white'
                            : 'text-[#6B7280] hover:bg-[#F1F3F7] dark:text-[#CBD5E1] dark:hover:bg-white/8'
                        }`}
                      >
                        <span className="flex items-center gap-1.5 text-[12px] font-bold leading-none">
                          <TabIcon size={13} weight="bold" className="shrink-0" />
                          <span className="truncate">{tab.label}</span>
                          {tab.active && (
                            <span
                              className={`ml-auto h-1.5 w-1.5 shrink-0 rounded-full ${
                                selected ? 'bg-white' : 'bg-[#5BBF8E]'
                              }`}
                              aria-hidden
                            />
                          )}
                        </span>
                        <span
                          className={`mt-1 block truncate text-[10px] font-semibold leading-tight ${
                            selected ? 'text-white/80' : 'text-[#9CA3AF]'
                          }`}
                        >
                          {tab.value}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-2 max-h-[min(360px,calc(100dvh-180px))] overflow-y-auto rounded-[14px] border border-[color-mix(in_srgb,var(--color-border)_76%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_86%,transparent)] p-2">
                {activeFilterTab === 'date' && (
                  <div className="grid grid-cols-2 gap-1.5" role="tabpanel" aria-label="Filtro de data">
                    {DATE_FILTERS.map((item) => {
                      const selected = dateRange.presetId === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setDateRange(buildPreset(item.id))}
                          className={`date-range-option min-h-11 rounded-[11px] px-3 text-left text-sm font-semibold transition-colors ${
                            selected ? 'date-range-option--selected' : ''
                          }`}
                        >
                          {item.label}
                        </button>
                      );
                    })}
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
                        <Icon name={method.icon} size={15} aria-hidden />
                        {method.label}
                      </button>
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
            style={{ opacity: loading ? 1 : 0 }}
            aria-hidden={!loading}
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
            style={{ opacity: loading ? 0 : 1 }}
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
                  {search || activeCategory || activePaymentMethod || dateRange.presetId !== 'all' ? (
                    <>
                      <Mo variant="thinking" size={128} className="mb-4 animate-bounce-in" />
                      <p className="text-base font-semibold text-[#1A1D23]">
                        Nenhum gasto encontrado
                      </p>
                      <p className="text-sm text-[#6B7280] mt-1">
                        Tente ajustar os filtros.
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
      <ConfirmDialog
        isOpen={!!deletingExpense}
        title="Excluir gasto"
        message={`Tem certeza que deseja excluir "${deletingExpense?.description}"?`}
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeletingExpense(null)}
      />
    </>
  );
}

export default function FeedPage() {
  return (
    <Suspense fallback={null}>
      <FeedPageInner />
    </Suspense>
  );
}
