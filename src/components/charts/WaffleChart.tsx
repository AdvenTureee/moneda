'use client';

import { useEffect, useMemo, useState } from 'react';
import PrivateValue from '@/components/PrivateValue';
import { formatCurrency } from '@/lib/utils';

interface TopCategory {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  amount: number;
  percentage: number;
}

interface WaffleChartProps {
  categories: TopCategory[];
  total: number;
  onCategoryClick?: (categoryId: string | null) => void;
}

interface Cell {
  index: number;
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  amount: number;
  percentage: number;
  isOthers: boolean;
  isMixedOthers: boolean;
}

interface WaffleSelectionPreviewProps {
  categories: TopCategory[];
  total: number;
  selectedCategoryIds: string[];
}

type WaffleGroup = TopCategory & {
  isMixedOthers: boolean;
};

const GRID = 10;
const CELL_COUNT = GRID * GRID;
const MIN_PCT = 0.03;
const OTHERS_COLOR = '#6B7280';

export default function WaffleChart({
  categories,
  total,
  onCategoryClick,
}: WaffleChartProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (hoveredId) setPreviewId(hoveredId);
  }, [hoveredId]);

  const groups = useMemo(() => {
    if (total <= 0) return [];

    const visible: TopCategory[] = [];
    const grouped: TopCategory[] = [];
    for (const cat of categories) {
      if (cat.amount / total < MIN_PCT) grouped.push(cat);
      else visible.push(cat);
    }

    const result: WaffleGroup[] = visible.map((category) => ({
      ...category,
      isMixedOthers: false,
    }));
    if (grouped.length > 0) {
      const amount = grouped.reduce((sum, cat) => sum + cat.amount, 0);
      const percentage = total > 0 ? (amount / total) * 100 : 0;
      const isMixedOthers = grouped.length > 1;
      result.push({
        categoryId: '__others__',
        categoryName: isMixedOthers ? 'Outros' : grouped[0].categoryName,
        categoryIcon: isMixedOthers ? 'Package' : grouped[0].categoryIcon,
        categoryColor: isMixedOthers ? OTHERS_COLOR : grouped[0].categoryColor,
        amount,
        percentage,
        isMixedOthers,
      });
    }

    return result;
  }, [categories, total]);

  const cells = useMemo<Cell[]>(() => {
    if (groups.length === 0 || total <= 0) return [];

    const raw = groups.map((group) => ({
      group,
      exact: (group.amount / total) * CELL_COUNT,
      count: Math.floor((group.amount / total) * CELL_COUNT),
    }));
    let used = raw.reduce((sum, item) => sum + item.count, 0);
    const byRemainder = [...raw].sort((a, b) => (b.exact - b.count) - (a.exact - a.count));
    for (const item of byRemainder) {
      if (used >= CELL_COUNT) break;
      item.count += 1;
      used += 1;
    }

    const byId = new Map(byRemainder.map((item) => [item.group.categoryId, item.count]));
    const out: Cell[] = [];
    for (const group of groups) {
      const count = byId.get(group.categoryId) ?? 0;
      for (let i = 0; i < count; i++) {
        out.push({
          index: out.length,
          categoryId: group.categoryId,
          categoryName: group.categoryName,
          categoryColor: group.categoryColor,
          amount: group.amount,
          percentage: total > 0 ? (group.amount / total) * 100 : 0,
          isOthers: group.categoryId === '__others__',
          isMixedOthers: group.isMixedOthers,
        });
      }
    }

    return out.slice(0, CELL_COUNT);
  }, [groups, total]);

  if (total <= 0 || cells.length === 0) {
    return (
      <div className="py-4 text-center text-sm text-[#6B7280]">
        Nenhuma categoria para exibir.
      </div>
    );
  }

  const hovered = hoveredId ? groups.find((group) => group.categoryId === hoveredId) : null;
  const preview = (previewId ? groups.find((group) => group.categoryId === previewId) : null) ?? hovered;
  const showPreview = Boolean(hovered && preview);

  function handleGridPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.min(Math.max(event.clientX - rect.left, 0), rect.width - 1);
    const y = Math.min(Math.max(event.clientY - rect.top, 0), rect.height - 1);
    const col = Math.min(GRID - 1, Math.max(0, Math.floor((x / rect.width) * GRID)));
    const row = Math.min(GRID - 1, Math.max(0, Math.floor((y / rect.height) * GRID)));
    const cell = cells[row * GRID + col];
    if (cell && cell.categoryId !== hoveredId) setHoveredId(cell.categoryId);
  }

  return (
    <div className="grid grid-cols-[minmax(168px,192px)_minmax(0,1fr)] items-center gap-5 max-[420px]:grid-cols-1 max-[420px]:gap-3">
      <div
        className="relative ml-3 mr-auto aspect-square w-full max-w-[192px] max-[420px]:mx-auto max-[420px]:max-w-[188px]"
        role="img"
        aria-label="Gráfico waffle de gastos por categoria"
      >
        <div
          className="grid grid-cols-10 gap-1"
          onPointerMove={handleGridPointerMove}
          onPointerLeave={() => setHoveredId(null)}
        >
          {cells.map((cell) => {
            const isHovered = hoveredId === cell.categoryId;
            const isDimmed = hoveredId !== null && !isHovered;
            return (
              <button
                key={`${cell.categoryId}-${cell.index}`}
                type="button"
                className="aspect-square rounded-[4px] border focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A8C5E0] focus-visible:ring-offset-2"
                style={{
                  backgroundColor: cell.isMixedOthers ? 'transparent' : cell.categoryColor,
                  borderColor: cell.isMixedOthers ? 'var(--color-border)' : 'transparent',
                  opacity: isDimmed ? 0.28 : 1,
                  transform: ready ? (isHovered ? 'scale(1.08)' : 'scale(1)') : 'scale(0.65)',
                  transition:
                    'border-color 160ms ease-out, opacity 160ms ease-out, transform 180ms cubic-bezier(0.2, 0.8, 0.2, 1)',
                  transitionDelay: ready ? '0ms' : `${Math.min(cell.index * 8, 420)}ms`,
                }}
                onFocus={() => setHoveredId(cell.categoryId)}
                onBlur={() => setHoveredId(null)}
                onClick={() => onCategoryClick?.(cell.isOthers ? null : cell.categoryId)}
                aria-label={`${cell.categoryName}: ${formatCurrency(cell.amount)}, ${cell.percentage.toFixed(0)}%`}
              />
            );
          })}
        </div>
      </div>

      <div className="flex min-h-[152px] min-w-0 flex-col items-center justify-center text-center max-[420px]:min-h-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#6B7280]">Distribuição</p>
        <p className="mt-1 text-[28px] font-extrabold leading-tight tabular-nums text-[#1A1D23] max-[420px]:text-2xl">
          <PrivateValue value={formatCurrency(total)} animate animationKey="waffle-distribution-total" />
        </p>
        <div
          className={`mt-3 grid w-full max-w-[220px] overflow-hidden transition-[grid-template-rows,opacity,transform] duration-220 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            showPreview ? 'grid-rows-[1fr] opacity-100 translate-y-0' : 'grid-rows-[0fr] opacity-0 translate-y-1'
          }`}
          aria-hidden={!showPreview}
        >
          <div className="min-h-0 overflow-hidden">
            <div className="rounded-[10px] border border-[#E5E7EB] bg-[#F8F9FB] px-3 py-2 transition-[background-color,border-color]">
              <p className="truncate text-sm font-semibold text-[#1A1D23]">{preview?.categoryName}</p>
              <p className="text-xs text-[#6B7280] tabular-nums mt-0.5">
                {preview ? <><PrivateValue value={formatCurrency(preview.amount)} /> · {((preview.amount / total) * 100).toFixed(0)}%</> : ''}
                {preview ? `${((preview.amount / total) * 100).toFixed(0)}%` : ''}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function buildCells(categories: TopCategory[], total: number): Cell[] {
  if (total <= 0) return [];

  const visible: TopCategory[] = [];
  const grouped: TopCategory[] = [];
  for (const cat of categories) {
    if (cat.amount / total < MIN_PCT) grouped.push(cat);
    else visible.push(cat);
  }

  const groups: WaffleGroup[] = visible.map((category) => ({
    ...category,
    isMixedOthers: false,
  }));
  if (grouped.length > 0) {
    const amount = grouped.reduce((sum, cat) => sum + cat.amount, 0);
    const percentage = total > 0 ? (amount / total) * 100 : 0;
    const isMixedOthers = grouped.length > 1;
    groups.push({
      categoryId: '__others__',
      categoryName: isMixedOthers ? 'Outros' : grouped[0].categoryName,
      categoryIcon: isMixedOthers ? 'Package' : grouped[0].categoryIcon,
      categoryColor: isMixedOthers ? OTHERS_COLOR : grouped[0].categoryColor,
      amount,
      percentage,
      isMixedOthers,
    });
  }

  const raw = groups.map((group) => ({
    group,
    exact: (group.amount / total) * CELL_COUNT,
    count: Math.floor((group.amount / total) * CELL_COUNT),
  }));
  let used = raw.reduce((sum, item) => sum + item.count, 0);
  const byRemainder = [...raw].sort((a, b) => (b.exact - b.count) - (a.exact - a.count));
  for (const item of byRemainder) {
    if (used >= CELL_COUNT) break;
    item.count += 1;
    used += 1;
  }

  const byId = new Map(byRemainder.map((item) => [item.group.categoryId, item.count]));
  const out: Cell[] = [];
  for (const group of groups) {
    const count = byId.get(group.categoryId) ?? 0;
    for (let i = 0; i < count; i++) {
      out.push({
        index: out.length,
        categoryId: group.categoryId,
        categoryName: group.categoryName,
        categoryColor: group.categoryColor,
        amount: group.amount,
        percentage: total > 0 ? (group.amount / total) * 100 : 0,
        isOthers: group.categoryId === '__others__',
        isMixedOthers: group.isMixedOthers,
      });
    }
  }
  return out.slice(0, CELL_COUNT);
}

export function WaffleSelectionPreview({
  categories,
  total,
  selectedCategoryIds,
}: WaffleSelectionPreviewProps) {
  const selected = new Set(selectedCategoryIds);
  const groupedIds = categories
    .filter((cat) => total > 0 && cat.amount / total < MIN_PCT)
    .map((cat) => cat.categoryId);
  const cells = buildCells(categories, total);
  if (cells.length === 0) return null;

  return (
    <div className="flex justify-center rounded-[12px] border border-[#E5E7EB] bg-[#F8F9FB] p-3">
      <div
        className="grid w-full max-w-[150px] grid-cols-10 gap-1"
        role="img"
        aria-label="Parte selecionada no waffle de categorias"
      >
        {cells.map((cell) => {
          const isSelected =
            selected.has(cell.categoryId) ||
            (cell.categoryId === '__others__' && groupedIds.some((id) => selected.has(id)));
          return (
            <span
              key={`${cell.categoryId}-${cell.index}`}
              className="aspect-square rounded-[3px]"
              style={{
                backgroundColor:
                  isSelected && !cell.isMixedOthers ? cell.categoryColor : 'var(--color-surface-alt)',
                border:
                  isSelected && !cell.isMixedOthers ? '0' : '1px solid var(--color-border)',
                opacity: isSelected ? 1 : 0.72,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
