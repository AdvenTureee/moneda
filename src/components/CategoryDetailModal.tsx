'use client';

import { type ReactNode, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from '@phosphor-icons/react';
import Icon from '@/components/Icon';
import ExpenseCard from '@/components/ExpenseCard';
import Mo from '@/components/Mo';
import { formatCurrency } from '@/lib/utils';
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

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-6"
      style={{ background: 'rgba(0,0,0,0.32)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-sm bg-white rounded-[20px] animate-scale-in flex flex-col"
        style={{ maxHeight: '85vh' }}
        role="dialog"
        aria-modal
        aria-label={`Gastos em ${categoryName}`}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 pt-5 pb-4">
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

        {/* Body */}
        <div className="px-5 pb-5 overflow-y-auto">
          {wafflePreview && <div className="mb-3">{wafflePreview}</div>}

          {expenses.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <Mo variant="sad" size={96} className="mb-3" />
              <p className="text-sm text-[#6B7280]">
                Nenhum gasto nessa categoria.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {expenses.map((expense) => (
                <ExpenseCard key={expense.id} expense={expense} variant="compact" />
              ))}
            </div>
          )}
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
