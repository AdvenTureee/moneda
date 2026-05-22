'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { MagnifyingGlass } from '@phosphor-icons/react';
import AppShell from '@/components/AppShell';
import ExpenseCard from '@/components/ExpenseCard';
import AddExpenseModal from '@/components/AddExpenseModal';
import ConfirmDialog from '@/components/ConfirmDialog';
import CategoryChip from '@/components/CategoryChip';
import DateRangePicker, { buildPreset, type DateRange } from '@/components/DateRangePicker';
import Icon from '@/components/Icon';
import GranaMascot from '@/components/GranaMascot';
import { groupExpensesByDate, formatCurrency } from '@/lib/utils';
import type { Expense, Category, ExpenseInput } from '@/types';

export default function FeedPage() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState<DateRange>(() => buildPreset('all'));
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);

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

  useEffect(() => {
    fetch('/api/categories')
      .then((res) => res.ok ? res.json() : null)
      .then((json) => {
        if (json?.data) setCategories(json.data);
      })
      .catch(() => { });
  }, []);

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
    <AppShell>
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <header className="px-4 pt-5 pb-3 bg-[#F8F9FB] sticky top-0 z-30 animate-fade-up delay-0">
          <h1 className="text-xl font-heading text-[#1A1D23] mb-3">Feed de Gastos</h1>

          {/* Search bar */}
          <div className="flex items-center gap-2 mb-3">
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
                className="w-full pl-9 pr-4 py-2.5 rounded-[10px] bg-white border border-[#E5E7EB] text-sm text-[#1A1D23] placeholder:text-[#9CA3AF] outline-none focus:border-[#A8C5E0] transition-colors"
                aria-label="Buscar gastos"
              />
            </div>
            <DateRangePicker value={dateRange} onChange={setDateRange} />
          </div>

          {/* Category filter chips */}
          <div
            className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4"
            style={{ scrollbarWidth: 'none' }}
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
        </header>

        {/* Expense list grouped by date */}
        <div className="px-4">
          {loading ? (
            <div className="flex flex-col items-center py-16 text-center">
              <GranaMascot variant="thinking" size={128} className="mb-4 animate-bounce-in" />
              <p className="text-base font-semibold text-[#1A1D23]">Carregando...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center py-16 text-center">
              <Icon name="Warning" size={48} className="mb-4 opacity-30" />
              <p className="text-base font-semibold text-[#B14C4C]">{error}</p>
              <button
                onClick={fetchExpenses}
                className="mt-2 px-4 py-2 bg-[#A8C5E0] text-white rounded-[10px] text-sm font-semibold"
              >
                Tentar novamente
              </button>
            </div>
          ) : groups.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center">
              {search || activeCategory || dateRange.presetId !== 'all' ? (
                <>
                  <GranaMascot variant="thinking" size={128} className="mb-4 animate-bounce-in" />
                  <p className="text-base font-semibold text-[#1A1D23]">
                    Nenhum gasto encontrado
                  </p>
                  <p className="text-sm text-[#6B7280] mt-1">
                    Tente ajustar os filtros.
                  </p>
                </>
              ) : (
                <>
                  <GranaMascot variant="idle" size={128} className="mb-4 animate-bounce-in" />
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
                    className="flex items-center justify-between py-2 mb-2 sticky border-b border-[#E5E7EB]"
                    style={{ top: '160px', background: '#F8F9FB', zIndex: 20 }}
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

          <div className="h-6" />
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
    </AppShell>
  );
}
