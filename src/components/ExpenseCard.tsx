'use client';

import { PencilSimple, Trash } from '@phosphor-icons/react';
import Icon from '@/components/Icon';
import { formatCurrency, formatDate, formatTime } from '@/lib/utils';
import type { Expense } from '@/types';

interface ExpenseCardProps {
  expense: Expense;
  variant?: 'compact' | 'full';
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export default function ExpenseCard({
  expense,
  variant = 'full',
  onClick,
  onEdit,
  onDelete,
}: ExpenseCardProps) {
  const category = expense.categoryData;
  const isCompact = variant === 'compact';

  return (
    <div
      className={`w-full flex items-center gap-3 bg-white rounded-[10px] transition-all duration-75 ${
        isCompact ? 'px-3 py-2.5' : 'px-4 py-3'
      }`}
      style={{ boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)' }}
      role="group"
      aria-label={`${expense.description}, ${formatCurrency(expense.amount)}`}
    >
      <button
        onClick={onClick}
        className="flex items-center gap-3 flex-1 min-w-0 text-left"
      >
        <div
          className="flex items-center justify-center shrink-0 rounded-full text-lg"
          style={{
            width: isCompact ? 36 : 40,
            height: isCompact ? 36 : 40,
            backgroundColor: category ? `${category.color}22` : '#6B728022',
          }}
          aria-hidden
        >
          <Icon name={category?.icon ?? 'Package'} size={20} />
        </div>

        <div className="flex-1 min-w-0">
          <p
            className={`font-medium text-[#1A1D23] truncate ${
              isCompact ? 'text-sm' : 'text-[15px]'
            }`}
          >
            {expense.description}
          </p>
          <p className="text-xs text-[#6B7280] mt-0.5">
            {category?.name ?? 'Outros'} · {formatTime(new Date(expense.createdAt))}
          </p>
        </div>

        <div className="flex flex-col items-end shrink-0">
          {isCompact && (
            <span className="text-[11px] text-[#9CA3AF] mb-0.5">
              {formatDate(new Date(expense.createdAt))}
            </span>
          )}
          <span
            className={`font-semibold tabular-nums ${
              isCompact ? 'text-sm' : 'text-[15px]'
            } text-[#E07070]`}
          >
            −{formatCurrency(expense.amount)}
          </span>
        </div>
      </button>

      {!isCompact && (onEdit || onDelete) && (
        <div className="flex items-center gap-0.5 shrink-0">
          {onEdit && (
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="p-1.5 rounded-md hover:bg-[#F1F3F7] transition-colors active:scale-90"
              aria-label="Editar gasto"
            >
              <PencilSimple size={14} className="text-[#9CA3AF] hover:text-[#6B7280]" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="p-1.5 rounded-md hover:bg-[#FDF0F0] transition-colors active:scale-90"
              aria-label="Excluir gasto"
            >
              <Trash size={14} className="text-[#9CA3AF] hover:text-[#E07070]" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
