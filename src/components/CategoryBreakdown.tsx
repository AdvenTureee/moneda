'use client';

import { useMemo, useState } from 'react';
import DonutChart from '@/components/charts/DonutChart';
import CategoryBarList from '@/components/charts/CategoryBarList';
import CategoryDetailModal from '@/components/CategoryDetailModal';
import type { Expense } from '@/types';

interface TopCategory {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  amount: number;
  percentage: number;
}

interface CategoryBreakdownProps {
  categories: TopCategory[];
  total: number;
  expensesByCategory: Record<string, Expense[]>;
}

type Selection =
  | { kind: 'single'; categoryId: string }
  | { kind: 'others' }
  | null;

const OTHERS_COLOR = '#6B7280';
const MIN_PCT = 0.03;

export default function CategoryBreakdown({
  categories,
  total,
  expensesByCategory,
}: CategoryBreakdownProps) {
  const [selection, setSelection] = useState<Selection>(null);

  const groupedIds = useMemo(
    () =>
      total > 0
        ? categories.filter((c) => c.amount / total < MIN_PCT).map((c) => c.categoryId)
        : [],
    [categories, total],
  );

  const modalData = useMemo(() => {
    if (!selection) return null;

    if (selection.kind === 'single') {
      const cat = categories.find((c) => c.categoryId === selection.categoryId);
      if (!cat) return null;
      return {
        name: cat.categoryName,
        icon: cat.categoryIcon,
        color: cat.categoryColor,
        total: cat.amount,
        expenses: expensesByCategory[cat.categoryId] ?? [],
      };
    }

    // "Outros" — agrega categorias < 3%
    const grouped = categories.filter((c) => groupedIds.includes(c.categoryId));
    const aggregatedExpenses = grouped
      .flatMap((c) => expensesByCategory[c.categoryId] ?? [])
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const aggregatedTotal = grouped.reduce((sum, c) => sum + c.amount, 0);
    const isSingle = grouped.length === 1;
    return {
      name: isSingle ? grouped[0].categoryName : 'Outros',
      icon: isSingle ? grouped[0].categoryIcon : 'Package',
      color: isSingle ? grouped[0].categoryColor : OTHERS_COLOR,
      total: aggregatedTotal,
      expenses: aggregatedExpenses,
    };
  }, [selection, categories, groupedIds, expensesByCategory]);

  function handleClick(categoryId: string | null) {
    if (categoryId === null) setSelection({ kind: 'others' });
    else setSelection({ kind: 'single', categoryId });
  }

  return (
    <>
      <DonutChart
        categories={categories}
        total={total}
        onCategoryClick={handleClick}
      />
      <CategoryBarList
        categories={categories}
        total={total}
        onCategoryClick={handleClick}
      />
      <CategoryDetailModal
        isOpen={modalData !== null}
        onClose={() => setSelection(null)}
        categoryName={modalData?.name ?? ''}
        categoryIcon={modalData?.icon ?? 'Package'}
        categoryColor={modalData?.color ?? OTHERS_COLOR}
        total={modalData?.total ?? 0}
        expenses={modalData?.expenses ?? []}
      />
    </>
  );
}
