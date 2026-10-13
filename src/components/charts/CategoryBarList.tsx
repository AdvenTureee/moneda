'use client';

import { useEffect, useMemo, useState } from 'react';
import Icon from '@/components/Icon';
import PrivateValue from '@/components/PrivateValue';
import { formatCurrency } from '@/lib/utils';

interface CategoryBarItem {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  amount: number;
}

interface CategoryBarListProps {
  categories: CategoryBarItem[];
  total: number;
  /** Recebe o id da categoria, ou `null` para o item agrupado "Outros". */
  onCategoryClick?: (categoryId: string | null) => void;
}

interface DisplayItem extends CategoryBarItem {
  isOthers: boolean;
  groupedIds: string[];
}

const MIN_PCT = 0.03;
const OTHERS_COLOR = '#6B7280';

export default function CategoryBarList({
  categories,
  total,
  onCategoryClick,
}: CategoryBarListProps) {
  const items = useMemo<DisplayItem[]>(() => {
    if (total <= 0 || categories.length === 0) return [];

    const visible: DisplayItem[] = [];
    const grouped: CategoryBarItem[] = [];
    for (const cat of categories) {
      if (cat.amount / total < MIN_PCT) grouped.push(cat);
      else visible.push({ ...cat, isOthers: false, groupedIds: [] });
    }

    if (grouped.length > 0) {
      const groupedAmount = grouped.reduce((sum, c) => sum + c.amount, 0);
      visible.push({
        categoryId: '__others__',
        categoryName: grouped.length === 1 ? grouped[0].categoryName : 'Outros',
        categoryIcon: grouped.length === 1 ? grouped[0].categoryIcon : 'Package',
        categoryColor: grouped.length === 1 ? grouped[0].categoryColor : OTHERS_COLOR,
        amount: groupedAmount,
        isOthers: grouped.length > 1,
        groupedIds: grouped.map((c) => c.categoryId),
      });
    }

    return visible;
  }, [categories, total]);

  const [expanded, setExpanded] = useState(false);
  const showLimit = 3;
  const visible = expanded ? items : items.slice(0, showLimit);
  const hasMore = items.length > showLimit;

  // Largura das barras inicia em 0 e cresce após mount para animação suave.
  const [animateIn, setAnimateIn] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setAnimateIn(true));
    return () => cancelAnimationFrame(id);
  }, [items.length]);

  if (items.length === 0) return null;

  return (
    <ul className="category-focus-panel space-y-1.5">
      {visible.map((item, i) => {
        const percentage = (item.amount / total) * 100;
        const fillWidth = animateIn ? `${Math.max(percentage, 1.5)}%` : '0%';
        const bgColor = `${item.categoryColor}26`; // 15% alpha
        const ariaLabel = `${item.categoryName}: ${formatCurrency(item.amount)}, ${percentage.toFixed(0)}%${
          item.isOthers ? ` (${item.groupedIds.length} categorias agrupadas)` : ''
        }`;

        return (
          <li key={item.categoryId}>
            <button
              type="button"
              onClick={() => onCategoryClick?.(item.categoryId === '__others__' ? null : item.categoryId)}
              className="category-focus-row group grid w-full cursor-pointer grid-cols-[36px_minmax(0,1fr)] gap-3 rounded-[12px] px-3 py-2.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A8C5E0] focus-visible:ring-offset-2"
              aria-label={ariaLabel}
            >
              <span
                className="category-focus-icon flex h-9 w-9 items-center justify-center rounded-full transition-transform duration-150 ease-out group-hover:scale-105 group-active:scale-95"
                style={{ backgroundColor: bgColor }}
                aria-hidden
              >
                <Icon name={item.categoryIcon} size={18} color={item.categoryColor} />
              </span>

              <span className="min-w-0 self-center">
                <span className="flex min-w-0 items-baseline gap-2">
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-[#1A1D23]">
                    {item.categoryName}
                    {item.isOthers && (
                      <span className="ml-1.5 text-[10px] font-normal text-[#9CA3AF]">
                        · {item.groupedIds.length} categorias
                      </span>
                    )}
                  </span>

                  <span className="shrink-0 text-sm font-bold tabular-nums text-[#1A1D23]">
                    <PrivateValue value={formatCurrency(item.amount)} />
                  </span>
                </span>

                <span className="mt-1.5 grid grid-cols-[minmax(0,1fr)_34px] items-center gap-2">
                  <span
                    className="category-focus-track h-2 overflow-hidden rounded-full"
                    style={{ backgroundColor: bgColor }}
                  >
                    <span
                      className="category-focus-fill block h-full rounded-full"
                      style={{
                        width: fillWidth,
                        backgroundColor: item.categoryColor,
                        transitionDelay: `${i * 60}ms, 0ms`,
                      }}
                    />
                  </span>
                  <span className="text-right text-[10px] leading-none text-[#6B7280] tabular-nums">
                    {percentage.toFixed(0)}%
                  </span>
                </span>
              </span>
            </button>
          </li>
        );
      })}
      {hasMore && (
        <li>
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="w-full rounded-[10px] bg-[#F1F3F7] py-2.5 text-sm font-semibold text-[#6B7280] transition-colors hover:bg-[#E5E7EB] active:scale-[0.98]"
          >
            {expanded ? 'Recolher' : `Ver mais (${items.length - showLimit} restantes)`}
          </button>
        </li>
      )}
    </ul>
  );
}
