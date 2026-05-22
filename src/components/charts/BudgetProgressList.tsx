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
  /** centavos budgeted for the period, or null if no budget set */
  budget: number | null;
}

interface BudgetProgressListProps {
  items: BudgetProgressItem[];
}

function statusColor(pct: number): string {
  if (pct > 1) return '#E07070';
  if (pct >= 0.7) return '#F0A855';
  return '#5BBF8E';
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
            const hasBudget = item.budget !== null && item.budget > 0;
            const rawPct = hasBudget ? item.spent / (item.budget as number) : 0;
            const fillPct = Math.min(rawPct, 1) * 100;
            const overflowPct = rawPct > 1 ? Math.min((rawPct - 1) * 100, 100) : 0;
            const color = hasBudget ? statusColor(rawPct) : '#A8C5E0';

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
                    {hasBudget && (
                      <span className="text-[#9CA3AF]">
                        {' / '}
                        {formatCurrency(item.budget as number)}
                      </span>
                    )}
                  </span>
                </div>
                <div
                  className="relative h-2 rounded-full bg-[#F1F3F7] overflow-hidden"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={hasBudget ? (item.budget as number) : item.spent}
                  aria-valuenow={item.spent}
                  aria-label={`${item.categoryName}: ${formatCurrency(item.spent)}${
                    hasBudget ? ` de ${formatCurrency(item.budget as number)}` : ''
                  }`}
                >
                  <div
                    className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-500 ease-out"
                    style={{ width: `${fillPct}%`, background: color }}
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
                {hasBudget && rawPct > 1 && (
                  <p className="text-[10px] font-medium text-[#E07070]">
                    {formatCurrency(item.spent - (item.budget as number))} acima do orçamento
                  </p>
                )}
                {!hasBudget && (
                  <p className="text-[10px] text-[#9CA3AF]">Sem orçamento definido</p>
                )}
              </li>
            );
          })}
        </ul>
      </ChartCard>
    </div>
  );
}
