'use client';

import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { MagnifyingGlass, X } from '@phosphor-icons/react';
import Icon from '@/components/Icon';
import ExpenseCard from '@/components/ExpenseCard';
import Mo from '@/components/Mo';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Expense } from '@/types';

interface CategoryDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  total: number;
  expenses: Expense[];
  wafflePreview?: ReactNode;
}

export default function CategoryDetailModal({
  isOpen,
  onClose,
  categoryName,
  categoryIcon,
  categoryColor,
  total,
  expenses,
  wafflePreview,
}: CategoryDetailModalProps) {
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (isOpen) setSearch('');
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const filteredExpenses = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return expenses;
    return expenses.filter((expense) => {
      const date = new Date(expense.createdAt);
      const category = expense.categoryData?.name ?? categoryName;
      return (
        expense.description.toLowerCase().includes(q) ||
        category.toLowerCase().includes(q) ||
        formatDate(date).toLowerCase().includes(q)
      );
    });
  }, [categoryName, expenses, search]);

  const filteredTotal = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6"
      style={{ background: 'rgba(0,0,0,0.32)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="flex w-full max-w-sm animate-scale-in flex-col overflow-hidden rounded-[20px] bg-white"
        style={{ maxHeight: '85vh' }}
        role="dialog"
        aria-modal
        aria-label={`Gastos em ${categoryName}`}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center gap-3 border-b border-[#F1F3F7] px-5 pt-5 pb-4">
          <span
            className="flex items-center justify-center shrink-0 rounded-full"
            style={{
              width: 44,
              height: 44,
              backgroundColor: `${categoryColor}22`,
            }}
            aria-hidden
          >
            <Icon name={categoryIcon} size={22} color={categoryColor} />
          </span>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-[#1A1D23] truncate">
              {categoryName}
            </h3>
            <p className="text-sm font-bold tabular-nums text-[#1A1D23] mt-0.5">
              {formatCurrency(total)}
              <span className="ml-1.5 text-xs font-normal text-[#6B7280]">
                · {expenses.length} {expenses.length === 1 ? 'gasto' : 'gastos'}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-[#F1F3F7] transition-colors shrink-0"
          >
            <X size={18} className="text-[#6B7280]" />
          </button>
        </div>

        {/* Search */}
        <div className="shrink-0 px-5 py-3">
          <div className="relative">
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
              className="themed-field w-full rounded-[10px] border border-[#E5E7EB] bg-white py-2.5 pl-9 pr-3 text-sm text-[#1A1D23] outline-none placeholder:text-[#9CA3AF] transition-colors focus:border-[#A8C5E0]"
              aria-label={`Buscar gastos em ${categoryName}`}
            />
          </div>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">
          {wafflePreview && <div className="mb-3">{wafflePreview}</div>}

          {expenses.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <Mo variant="sad" size={96} className="mb-3" />
              <p className="text-sm text-[#6B7280]">
                Nenhum gasto nessa categoria.
              </p>
            </div>
          ) : filteredExpenses.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <Mo variant="thinking" size={96} className="mb-3" />
              <p className="text-sm font-semibold text-[#1A1D23]">Nenhum gasto encontrado</p>
              <p className="mt-1 max-w-[220px] text-xs text-[#6B7280]">
                Tente buscar por outro termo.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredExpenses.map((expense) => (
                <ExpenseCard key={expense.id} expense={expense} variant="compact" />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-[#F1F3F7] px-5 py-3">
          <span className="text-xs font-medium text-[#6B7280]">
            {search.trim()
              ? `${filteredExpenses.length} de ${expenses.length}`
              : `${expenses.length} ${expenses.length === 1 ? 'gasto' : 'gastos'}`}
          </span>
          <span className="text-sm font-bold tabular-nums text-[#1A1D23]">
            {formatCurrency(search.trim() ? filteredTotal : total)}
          </span>
        </div>
      </div>

      <style>{`
        @keyframes scale-in {
          from { transform: scale(0.92); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-scale-in {
          animation: scale-in 0.18s cubic-bezier(0, 0, 0.2, 1);
        }
      `}</style>
    </div>,
    document.body,
  );
}
