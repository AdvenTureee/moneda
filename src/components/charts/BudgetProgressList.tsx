import Icon from '@/components/Icon';
import ChartCard from './ChartCard';
import { formatCurrency } from '@/lib/utils';

export interface BudgetProgressItem {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  /** centavos spent in the period */
  spent: number;
  /** centavos budgeted for the period (sempre > 0; categorias sem orçamento não chegam aqui) */
  budget: number;
}

interface BudgetProgressListProps {
  items: BudgetProgressItem[];
}

export default function BudgetProgressList({ items }: BudgetProgressListProps) {
  if (items.length === 0) return null;

  return (
    <div className="animate-fade-up delay-4">
      <ChartCard
        title="Orçamentos por categoria"
        ariaLabel="Acompanhamento de orçamento por categoria"
      >
        <ul className="space-y-3.5">
          {items.map((item) => {
            const rawPct = item.spent / item.budget;
            const fillPct = Math.min(rawPct, 1) * 100;
            const overflowPct = rawPct > 1 ? Math.min((rawPct - 1) * 100, 100) : 0;

            return (
              <li key={item.categoryId} className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span
                    className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                    style={{ background: `${item.categoryColor}22` }}
                    aria-hidden
                  >
                    <Icon
                      name={item.categoryIcon}
                      size={14}
                      color={item.categoryColor}
                    />
                  </span>
                  <span className="flex-1 text-xs font-medium text-[#1A1D23] truncate">
                    {item.categoryName}
                  </span>
                  <span className="text-xs tabular-nums shrink-0">
                    <span className="font-semibold text-[#1A1D23]">
                      {formatCurrency(item.spent)}
                    </span>
                    <span className="text-[#9CA3AF]">
                      {' / '}
                      {formatCurrency(item.budget)}
                    </span>
                  </span>
                </div>
                <div
                  className="relative h-2 rounded-full bg-[#F1F3F7] overflow-hidden"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={item.budget}
                  aria-valuenow={item.spent}
                  aria-label={`${item.categoryName}: ${formatCurrency(item.spent)} de ${formatCurrency(item.budget)}`}
                >
                  <div
                    className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-500 ease-out"
                    style={{ width: `${fillPct}%`, background: item.categoryColor }}
                  />
                  {overflowPct > 0 && (
                    <div
                      className="absolute inset-y-0 right-0 rounded-full"
                      style={{
                        width: `${overflowPct}%`,
                        background:
                          'repeating-linear-gradient(45deg, #E07070, #E07070 4px, #C45A5A 4px, #C45A5A 8px)',
                      }}
                    />
                  )}
                </div>
                {rawPct > 1 && (
                  <p className="text-[10px] font-medium text-[#E07070]">
                    {formatCurrency(item.spent - item.budget)} acima do orçamento
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </ChartCard>
    </div>
  );
}
