import { formatCurrency, formatDate, formatTime } from '@/lib/utils';
import { getCategoryById } from '@/lib/expenses';
import type { Expense } from '@/types';

interface ExpenseCardProps {
  expense: Expense;
  variant?: 'compact' | 'full';
  onClick?: () => void;
}

export default function ExpenseCard({
  expense,
  variant = 'full',
  onClick,
}: ExpenseCardProps) {
  const category = getCategoryById(expense.category);
  const isCompact = variant === 'compact';

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 bg-white rounded-[10px] text-left transition-all duration-75 active:scale-[0.98] ${
        isCompact ? 'px-3 py-2.5' : 'px-4 py-3'
      }`}
      style={{ boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)' }}
      aria-label={`${expense.description}, ${formatCurrency(expense.amount)}`}
    >
      {/* Category icon */}
      <div
        className="flex items-center justify-center shrink-0 rounded-full text-lg"
        style={{
          width: isCompact ? 36 : 40,
          height: isCompact ? 36 : 40,
          backgroundColor: category ? `${category.color}22` : '#6B728022',
        }}
        aria-hidden
      >
        {category?.icon ?? '📦'}
      </div>

      {/* Description & category */}
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

      {/* Date + Amount */}
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
  );
}
