'use client';

import { useState, useMemo, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { MagnifyingGlass } from '@phosphor-icons/react';
import ExpenseCard from '@/components/ExpenseCard';
import AddExpenseModal from '@/components/AddExpenseModal';
import ConfirmDialog from '@/components/ConfirmDialog';
import CategoryChip from '@/components/CategoryChip';
import DateRangePicker, { buildPreset, type DateRange } from '@/components/DateRangePicker';
import Icon from '@/components/Icon';
import Mo from '@/components/Mo';
import PullToRefresh from '@/components/PullToRefresh';
import { groupExpensesByDate, formatCurrency } from '@/lib/utils';
import { useCategories } from '@/hooks/useCategories';
import type { Expense, ExpenseInput } from '@/types';

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

function FeedPageInner() {
  const searchParams = useSearchParams();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState<DateRange>(() => buildPreset('all'));

  // Read date range from URL after mount to avoid SSR/CSR hydration mismatch.
  useEffect(() => {
    const range = rangeFromSearchParams(new URLSearchParams(searchParams.toString()));
    if (range) setDateRange(range);
    // Run only on initial mount; further filter changes come from the picker.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const { data: categories, invalidate: invalidateCategories, refresh: refreshCategories } = useCategories();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);

  const chipsRef = useRef<HTMLDivElement | null>(null);
  const [chipsScroll, setChipsScroll] = useState<{ atStart: boolean; atEnd: boolean }>({
    atStart: true,
    atEnd: true,
  });

  const updateChipsScroll = useCallback(() => {
    const el = chipsRef.current;
    if (!el) return;
    const atStart = el.scrollLeft <= 1;
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1;
    setChipsScroll((prev) =>
      prev.atStart === atStart && prev.atEnd === atEnd ? prev : { atStart, atEnd },
    );
  }, []);

  useEffect(() => {
    updateChipsScroll();
    const el = chipsRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateChipsScroll, { passive: true });
    window.addEventListener('resize', updateChipsScroll);
    return () => {
      el.removeEventListener('scroll', updateChipsScroll);
      window.removeEventListener('resize', updateChipsScroll);
    };
  }, [updateChipsScroll, categories.length]);

  const chipsMask = useMemo(() => {
    const { atStart, atEnd } = chipsScroll;
    if (atStart && atEnd) return undefined;
    if (atStart) {
      return 'linear-gradient(to right, black 0, black calc(100% - 40px), transparent 100%)';
    }
    if (atEnd) {
      return 'linear-gradient(to right, transparent 0, black 40px, black 100%)';
    }
    return 'linear-gradient(to right, transparent 0, black 40px, black calc(100% - 40px), transparent 100%)';
  }, [chipsScroll]);

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (activeCategory) params.set('category', activeCategory);
      if (search.trim()) params.set('search', search.trim());
      if (dateRange.from) params.set('startDate', dateRange.from);
      if (dateRange.to) params.set('endDate', dateRange.to);
      const url = `/api/expenses${params.size ? '?' + params.toString() : ''}`;
      const res = await fetch(url);
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
      setError(e instanceof Error ? e.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }, [activeCategory, search, dateRange]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const filtered = useMemo(() => {
    let result = allExpenses;

    if (activeCategory) {
      result = result.filter((e) => e.category === activeCategory);
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
  }, [allExpenses, activeCategory, search]);

  const groups = groupExpensesByDate(filtered);

  const handleDelete = useCallback(async (expense: Expense) => {
    setDeletingExpense(expense);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deletingExpense) return;
    try {
      await fetch(`/api/expenses?id=${deletingExpense.id}`, { method: 'DELETE' });
      setDeletingExpense(null);
      fetchExpenses();
    } catch {
      setDeletingExpense(null);
    }
  }, [deletingExpense, fetchExpenses]);

  const handleRefresh = useCallback(async () => {
    invalidateCategories();
    await Promise.all([refreshCategories(), fetchExpenses()]);
  }, [invalidateCategories, refreshCategories, fetchExpenses]);

  const handleEditSave = useCallback(async (input: ExpenseInput) => {
    if (!editingExpense) return;
    try {
      await fetch('/api/expenses', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingExpense.id, ...input }),
      });
      setEditingExpense(null);
      fetchExpenses();
    } catch {
      // ignore
    }
  }, [editingExpense, fetchExpenses]);

  return (
    <>
      <PullToRefresh onRefresh={handleRefresh}>
      <div className="max-w-lg mx-auto px-4 pb-24">
        {/* Header */}
        <header className="py-6 animate-fade-up delay-0">
          <h1 className="text-2xl font-heading text-[#1A1D23]">Feed de Gastos</h1>
        </header>

        <div
          className="bg-white rounded-[14px] p-3 space-y-3 mb-4 animate-fade-up delay-1"
          style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}
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
                  className="w-full pl-9 pr-4 py-2.5 rounded-[10px] bg-[#F4F6FA] border border-transparent text-sm text-[#1A1D23] placeholder:text-[#9CA3AF] outline-none focus:border-[#A8C5E0] transition-colors"
                  aria-label="Buscar gastos"
                />
              </div>
              <DateRangePicker value={dateRange} onChange={setDateRange} />
            </div>

            {/* Category filter chips */}
            <div
              ref={chipsRef}
              className="flex gap-2 overflow-x-auto pb-1 -mx-3 px-3"
              style={{
                scrollbarWidth: 'none',
                maskImage: chipsMask,
                WebkitMaskImage: chipsMask,
              }}
              role="group"
              aria-label="Filtrar por categoria"
            >
              <CategoryChip
                icon="Sparkle"
                label="Todos"
                selected={activeCategory === null}
                onClick={() => setActiveCategory(null)}
                size="sm"
              />
              {categories.filter((c) => c.id !== 'outros').map((cat) => (
                <CategoryChip
                  key={cat.id}
                  icon={cat.icon}
                  label={cat.name}
                  selected={activeCategory === cat.id}
                  onClick={() =>
                    setActiveCategory((prev) => (prev === cat.id ? null : cat.id))
                  }
                  size="sm"
                />
              ))}
          </div>
        </div>

        {/* Expense list grouped by date */}
        {loading ? null : error ? (
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
              {search || activeCategory || dateRange.presetId !== 'all' ? (
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
                <>
                  <Mo variant="idle" size={128} className="mb-4 animate-bounce-in" />
                  <p className="text-base font-semibold text-[#1A1D23]">
                    Nada por aqui ainda
                  </p>
                  <p className="text-sm text-[#6B7280] mt-1">
                    Comece adicionando sua primeira despesa tocando em <strong>+</strong>.
                  </p>
                </>
              )}
            </div>
          ) : (
            groups.map((group, gi) => {
              const dayTotal = group.items.reduce((sum, e) => sum + e.amount, 0);
              return (
                <div key={group.dateKey} className={`mb-4 animate-fade-up delay-${Math.min(gi, 6)}`}>
                  {/* Date section header */}
                  <div
                    className="flex items-center justify-between px-4 py-2.5 mb-2 bg-white rounded-[10px]"
                    style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}
                  >
                    <span className="text-xs font-semibold text-[#6B7280]">
                      {group.label}
                    </span>
                    <span className="text-xs font-semibold text-[#E07070] tabular-nums">
                      −{formatCurrency(dayTotal)}
                    </span>
                  </div>

                  {/* Expense cards */}
                  <div className="space-y-2">
                    {group.items.map((expense, ei) => (
                      <div key={expense.id} className={`animate-fade-up delay-${Math.min(gi * 2 + ei + 1, 8)}`}>
                        <ExpenseCard
                          expense={expense}
                          variant="full"
                          onEdit={() => setEditingExpense(expense)}
                          onDelete={() => handleDelete(expense)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
        )}
      </div>
      </PullToRefresh>
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
