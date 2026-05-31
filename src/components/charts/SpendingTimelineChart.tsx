'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from '@phosphor-icons/react';
import ChartCard from './ChartCard';
import DatePicker from '@/components/DatePicker';
import { formatCurrency } from '@/lib/utils';
import { parseLocalDate } from '@/lib/date';
import type { SpendingTimelineBucket, SpendingTimelineData, SpendingTimelineMode } from '@/types';

interface SpendingTimelineChartProps {
  data: SpendingTimelineData;
}

interface Point extends SpendingTimelineBucket {
  index: number;
  spent: number;
  plannedAmount: number;
  spentCumulative: number;
  plannedCumulative: number;
  x: number;
  ySpent: number;
  yPlanned: number;
}

const HEIGHT = 190;
const PAD = { top: 18, right: 12, bottom: 34, left: 42 };
const MODES: Array<{ value: SpendingTimelineMode; label: string }> = [
  { value: 'year', label: 'Ano' },
  { value: 'month', label: 'Mês' },
  { value: 'day', label: 'Dia' },
];

function compactCurrency(centavos: number): string {
  const value = centavos / 100;
  if (value >= 1000) return `R$ ${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`;
  return `R$ ${value.toFixed(0)}`;
}

function chartCeiling(centavos: number): number {
  if (centavos <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(centavos));
  const normalized = centavos / magnitude;
  const niceNormalized = normalized <= 1
    ? 1
    : normalized <= 2
      ? 2
      : normalized <= 5
        ? 5
        : 10;
  return niceNormalized * magnitude;
}

function dateLabel(dateKey: string): string {
  return parseLocalDate(dateKey).toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'short',
  });
}

function modeTitle(mode: SpendingTimelineMode): string {
  if (mode === 'year') return 'Gastos por ano';
  if (mode === 'month') return 'Gastos por mês';
  return 'Gastos por dia';
}

function plannedForMode(
  mode: SpendingTimelineMode,
  bucket: SpendingTimelineBucket,
  index: number,
  count: number,
  data: SpendingTimelineData,
): number {
  if (mode === 'year') return bucket.planned ?? data.annualPlanned / Math.max(count, 1);
  if (mode === 'month') return data.monthlyPlanned / Math.max(count, 1);
  return data.monthlyPlanned / Math.max(data.month.length, 1) / 24;
}

function plannedCeilingForMode(
  mode: SpendingTimelineMode,
  data: SpendingTimelineData,
): number {
  if (mode === 'year') return 0;
  if (mode === 'month') return data.monthlyPlanned;
  return data.monthlyPlanned / Math.max(data.month.length, 1);
}

function buildPath(points: Point[], key: 'ySpent' | 'yPlanned'): string {
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p[key]}`).join(' ');
}

function signedCurrency(centavos: number): string {
  const rounded = Math.round(centavos);
  const sign = rounded > 0 ? '+' : rounded < 0 ? '-' : '';
  return `${sign}${formatCurrency(Math.abs(rounded))}`;
}

function todayLocalKey(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function defaultSelectedDay(data: SpendingTimelineData): string {
  const today = todayLocalKey();
  if (data.hourlyByDate[today]) return today;
  if (data.hourlyByDate[data.selectedDay]) return data.selectedDay;
  return data.month[0]?.key ?? data.selectedDay;
}

export default function SpendingTimelineChart({ data }: SpendingTimelineChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(360);
  const [mode, setMode] = useState<SpendingTimelineMode>('year');
  const [selectedDay, setSelectedDay] = useState(() => defaultSelectedDay(data));
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const nextWidth = Math.round(entry.contentRect.width);
        if (nextWidth > 0) setWidth(nextWidth);
      }
    });
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const buckets = useMemo(() => {
    if (mode === 'year') return data.year;
    if (mode === 'month') return data.month;
    return data.hourlyByDate[selectedDay] ?? [];
  }, [data, mode, selectedDay]);

  const chartW = Math.max(width - PAD.left - PAD.right, 220);
  const chartH = HEIGHT - PAD.top - PAD.bottom;
  const totalWidth = chartW + PAD.left + PAD.right;

  const points = useMemo<Point[]>(() => {
    let spentCumulative = 0;
    const fixedPlannedCeiling = plannedCeilingForMode(mode, data);
    const prepared = buckets.map((bucket, index) => {
      const plannedAmount = plannedForMode(mode, bucket, index, buckets.length, data);
      const plannedCumulative =
        mode === 'year'
          ? plannedAmount
          : fixedPlannedCeiling;
      if (mode === 'year') {
        spentCumulative = bucket.amount;
      } else {
        spentCumulative += bucket.amount;
      }
      return {
        ...bucket,
        index,
        spent: bucket.amount,
        plannedAmount,
        spentCumulative,
        plannedCumulative,
        x: 0,
        ySpent: 0,
        yPlanned: 0,
      };
    });

    const spentMax = Math.max(...prepared.map((p) => p.spentCumulative), 0);
    const plannedMax = Math.max(...prepared.map((p) => p.plannedCumulative), 0);
    const max = chartCeiling(Math.max(fixedPlannedCeiling, spentMax, plannedMax));

    return prepared.map((point, index) => {
      const x = PAD.left + (prepared.length === 1 ? chartW / 2 : (index / (prepared.length - 1)) * chartW);
      const spentRatio = Math.min(point.spentCumulative / max, 1);
      const plannedRatio = Math.min(point.plannedCumulative / max, 1);
      return {
        ...point,
        x,
        ySpent: PAD.top + chartH * (1 - spentRatio),
        yPlanned: PAD.top + chartH * (1 - plannedRatio),
      };
    });
  }, [buckets, chartH, chartW, data, mode]);

  const fixedPlannedCeiling = plannedCeilingForMode(mode, data);
  const maxValue = chartCeiling(
    Math.max(
      fixedPlannedCeiling,
      ...points.map((p) => Math.max(p.spentCumulative, p.plannedCumulative)),
    ),
  );
  const spentPath = buildPath(points, 'ySpent');
  const plannedPath = buildPath(points, 'yPlanned');
  const hasSpending = points.some((p) => p.spentCumulative > 0);
  const plannedTotal = mode === 'year'
    ? points.reduce((sum, point) => sum + point.plannedAmount, 0)
    : points.at(-1)?.plannedCumulative ?? 0;

  const tickIndexes = useMemo(() => {
    if (points.length <= 8) return points.map((p) => p.index);
    if (mode === 'day') return [0, 6, 12, 18, 23].filter((i) => i < points.length);
    if (mode === 'month') return points.map((p) => p.index).filter((i) => i === 0 || i === points.length - 1 || (i + 1) % 5 === 0);
    return points.map((p) => p.index).filter((i) => i % 2 === 0 || i === points.length - 1);
  }, [mode, points]);

  useEffect(() => {
    setSelectedPointIndex(null);
  }, [mode, selectedDay]);

  useEffect(() => {
    setSelectedDay(defaultSelectedDay(data));
  }, [data]);

  const handleModeChange = (nextMode: SpendingTimelineMode) => {
    setMode(nextMode);
    if (nextMode === 'day') setSelectedDay(defaultSelectedDay(data));
  };

  return (
    <div ref={containerRef}>
      <ChartCard
        title={modeTitle(mode)}
        ariaLabel={mode === 'year' ? 'Comparativo de gasto mensal e teto planejado' : 'Comparativo de gasto acumulado e planejado'}
        headerRight={
          <span className="text-xs text-[#6B7280]">
            Planejado:{' '}
            <span className="font-semibold text-[#1A1D23] tabular-nums">
              {formatCurrency(Math.round(plannedTotal))}
            </span>
          </span>
        }
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-[10px] bg-[#F1F3F7] p-1" role="group" aria-label="Modo do gráfico">
            {MODES.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => handleModeChange(item.value)}
                className={`min-w-14 rounded-[8px] px-3 py-1.5 text-xs font-bold transition-colors ${
                  mode === item.value
                    ? 'bg-white text-[#1A1D23] shadow-sm'
                    : 'text-[#6B7280] hover:text-[#1A1D23]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {mode === 'day' && (
            <div className="flex w-full justify-start sm:w-auto sm:justify-end">
              <DatePicker
                value={selectedDay}
                min={data.month[0]?.key}
                max={data.month.at(-1)?.key}
                onChange={setSelectedDay}
                placeholder="Selecionar dia"
                ariaLabel="Selecionar dia do gráfico"
                className="themed-field inline-flex h-9 w-auto min-w-[146px] items-center gap-2 rounded-[10px] border border-[#E5E7EB] bg-[#F4F6FA] px-3 text-left text-sm font-semibold text-[#1A1D23] outline-none transition-[border-color,background-color,box-shadow] hover:bg-[#EEF2F7] focus:border-[#A8C5E0] focus:shadow-[0_0_0_2px_rgba(168,197,224,0.28)] disabled:cursor-not-allowed disabled:opacity-50 [&_span]:text-[#1A1D23] [&_svg]:text-[#6B7280]"
              />
            </div>
          )}
        </div>

        {points.length === 0 || (!hasSpending && plannedTotal <= 0) ? (
          <div className="py-8 text-center">
            <p className="text-sm text-[#6B7280]">Sem gastos ou planejamento para este período.</p>
          </div>
        ) : (
          <div className="relative select-none touch-none">
            <svg
              viewBox={`0 0 ${totalWidth} ${HEIGHT}`}
              className="w-full h-auto touch-none"
              preserveAspectRatio="none"
              style={{ overflow: 'visible' }}
              role="img"
              aria-label={mode === 'year' ? 'Linhas de gasto mensal e teto planejado' : 'Linhas acumuladas de gasto e valor planejado'}
            >
              {[0.25, 0.5, 0.75, 1].map((f) => (
                <line
                  key={f}
                  x1={PAD.left}
                  y1={PAD.top + chartH * (1 - f)}
                  x2={totalWidth - PAD.right}
                  y2={PAD.top + chartH * (1 - f)}
                  stroke="var(--chart-grid)"
                  strokeWidth={1}
                  strokeDasharray={f === 0.5 ? '0' : '4 4'}
                />
              ))}

              <text x={PAD.left - 7} y={PAD.top + 3} textAnchor="end" className="text-[10px] font-medium fill-[#9CA3AF]">
                {compactCurrency(maxValue)}
              </text>
              <text x={PAD.left - 7} y={PAD.top + chartH + 3} textAnchor="end" className="text-[10px] font-medium fill-[#9CA3AF]">
                R$ 0
              </text>

              {plannedPath && (
                <path
                  d={plannedPath}
                  fill="none"
                  stroke="var(--chart-success)"
                  strokeWidth={2.25}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray="7 5"
                />
              )}
              {spentPath && (
                <path
                  d={spentPath}
                  fill="none"
                  stroke="var(--chart-primary-strong)"
                  strokeWidth={2.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {points.map((point) => (
                <g key={point.key}>
                  <circle cx={point.x} cy={point.yPlanned} r={4.2} fill="var(--chart-point-ring)" />
                  <circle cx={point.x} cy={point.yPlanned} r={3.2} fill="var(--chart-success)" />
                  <circle cx={point.x} cy={point.ySpent} r={5} fill="var(--chart-point-ring)" />
                  <circle cx={point.x} cy={point.ySpent} r={3.8} fill="var(--chart-primary-strong)" />
                  <rect
                    x={point.x - chartW / Math.max(points.length, 1) / 2}
                    y={PAD.top}
                    width={chartW / Math.max(points.length, 1)}
                    height={chartH + 16}
                    fill="transparent"
                    className="cursor-pointer touch-none"
                    onPointerDown={(event) => {
                      event.preventDefault();
                      setSelectedPointIndex(point.index);
                    }}
                    onClick={() => setSelectedPointIndex(point.index)}
                  >
                    <title>{`${point.label}: gasto ${formatCurrency(Math.round(point.spentCumulative))}, planejado ${formatCurrency(Math.round(point.plannedCumulative))}`}</title>
                  </rect>
                </g>
              ))}

              {tickIndexes.map((index) => {
                const point = points[index];
                if (!point) return null;
                return (
                  <text key={`tick-${point.key}`} x={point.x} y={HEIGHT - 7} textAnchor="middle" className="text-[10px] font-medium fill-[#9CA3AF]">
                    {point.label}
                  </text>
                );
              })}
            </svg>

            <div className="mt-3 flex items-center gap-4 text-xs text-[#6B7280]">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-0.5 w-5 rounded-full bg-[#7AAECF]" />
                Gasto
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-0.5 w-5 rounded-full bg-[#5BBF8E]" />
                Planejado
              </span>
            </div>

            <SpendingTimelineDetailModal
              isOpen={selectedPointIndex !== null}
              onClose={() => setSelectedPointIndex(null)}
              title={modeTitle(mode)}
              mode={mode}
              points={points}
              selectedIndex={selectedPointIndex ?? 0}
            />
          </div>
        )}
      </ChartCard>
    </div>
  );
}

interface SpendingTimelineDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  mode: SpendingTimelineMode;
  points: Point[];
  selectedIndex: number;
}

function SpendingTimelineDetailModal({
  isOpen,
  onClose,
  title,
  mode,
  points,
  selectedIndex,
}: SpendingTimelineDetailModalProps) {
  const [mounted, setMounted] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      setIsClosing(false);
      return;
    }
    if (!shouldRender) return;
    setIsClosing(true);
    const timer = window.setTimeout(() => {
      setShouldRender(false);
      setIsClosing(false);
    }, 180);
    return () => window.clearTimeout(timer);
  }, [isOpen, shouldRender]);

  useEffect(() => {
    if (!isOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsClosing(true);
        window.setTimeout(onClose, 180);
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const selected = points[selectedIndex];
  if (!mounted || !shouldRender || !selected) return null;

  const close = () => {
    setIsClosing(true);
    window.setTimeout(onClose, 180);
  };

  const difference = selected.plannedCumulative - selected.spentCumulative;
  const isOverPlan = difference < 0;
  const periodLabel = mode === 'month' ? dateLabel(selected.key) : selected.label;
  const totalSpent = mode === 'year'
    ? points.reduce((sum, point) => sum + point.spent, 0)
    : points.at(-1)?.spentCumulative ?? 0;
  const totalPlanned = mode === 'year'
    ? points.reduce((sum, point) => sum + point.plannedAmount, 0)
    : points.at(-1)?.plannedCumulative ?? 0;

  return createPortal(
    <div
      className="modal-wave-backdrop fixed inset-0 z-[65] flex items-center justify-center p-4 sm:p-6"
      data-state={isClosing ? 'closing' : 'open'}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div
        className="modal-panel-pop themed-card flex w-full max-w-md flex-col overflow-hidden rounded-[22px] bg-white"
        style={{ maxHeight: 'min(82dvh, 640px)', boxShadow: 'var(--shadow-overlay)' }}
        role="dialog"
        aria-modal
        aria-label={`Detalhes de ${title}`}
      >
        <div className="flex shrink-0 items-start gap-3 border-b border-[color-mix(in_srgb,var(--color-border)_74%,transparent)] px-5 pb-4 pt-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--chart-primary)_24%,var(--color-surface)_76%)]">
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--chart-primary-strong)] shadow-[0_0_0_6px_color-mix(in_srgb,var(--chart-primary)_22%,transparent)]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-text-tertiary)]">
              {title}
            </p>
            <h3 className="mt-0.5 truncate text-xl font-extrabold text-[var(--color-text-primary)]">
              {periodLabel}
            </h3>
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
              Total do gráfico: {formatCurrency(Math.round(totalSpent))} gasto de {formatCurrency(Math.round(totalPlanned))} planejado
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Fechar detalhes do gráfico"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-alt)]"
          >
            <X size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
          <div className="grid grid-cols-1 gap-2.5 min-[380px]:grid-cols-3">
            <MetricPill label="Gasto" value={formatCurrency(Math.round(selected.spentCumulative))} color="var(--chart-primary-strong)" />
            <MetricPill label="Planejado" value={formatCurrency(Math.round(selected.plannedCumulative))} color="var(--chart-success)" />
            <MetricPill
              label={isOverPlan ? 'Acima' : 'Saldo'}
              value={signedCurrency(difference)}
              color={isOverPlan ? 'var(--color-error)' : 'var(--color-success)'}
            />
          </div>

          <div className="mt-3 rounded-[14px] border border-[color-mix(in_srgb,var(--color-border)_70%,transparent)] bg-[var(--color-surface)] px-3.5 py-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--color-text-tertiary)]">
              Neste período
            </p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-[var(--color-text-secondary)]">
              <span className="inline-flex items-center gap-1.5 tabular-nums">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--chart-primary-strong)]" />
                Gasto: <strong className="text-[var(--color-text-primary)]">{formatCurrency(Math.round(selected.spent))}</strong>
              </span>
              <span className="inline-flex items-center gap-1.5 tabular-nums">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--chart-success)]" />
                Planejado: <strong className="text-[var(--color-text-primary)]">{formatCurrency(Math.round(selected.plannedAmount))}</strong>
              </span>
            </div>
          </div>

          <div className="mt-4 rounded-[16px] border border-[color-mix(in_srgb,var(--color-border)_72%,transparent)] bg-[color-mix(in_srgb,var(--color-surface-alt)_64%,transparent)] p-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-sm font-bold text-[var(--color-text-primary)]">Períodos</p>
              <div className="flex items-center gap-3 text-[11px] text-[var(--color-text-secondary)]">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--chart-primary-strong)]" />
                  Gasto
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--chart-success)]" />
                  Planejado
                </span>
              </div>
            </div>

            <div className="max-h-[280px] space-y-2 overflow-y-auto pr-1">
              {points.map((point) => {
                const active = point.index === selected.index;
                const rowDifference = point.plannedCumulative - point.spentCumulative;
                return (
                  <div
                    key={point.key}
                    className={`rounded-[12px] border px-3 py-2.5 transition-colors ${
                      active
                        ? 'border-[color-mix(in_srgb,var(--chart-primary)_64%,var(--color-border)_36%)] bg-[color-mix(in_srgb,var(--chart-primary)_16%,var(--color-surface)_84%)]'
                        : 'border-transparent bg-[var(--color-surface)]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-bold text-[var(--color-text-primary)]">
                        {mode === 'month' ? dateLabel(point.key) : point.label}
                      </p>
                      <p
                        className="text-xs font-bold tabular-nums"
                        style={{ color: rowDifference < 0 ? 'var(--color-error)' : 'var(--color-success)' }}
                      >
                        {signedCurrency(rowDifference)}
                      </p>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-[var(--color-text-secondary)]">
                      <span className="tabular-nums">
                        Gasto: <strong className="text-[var(--color-text-primary)]">{formatCurrency(Math.round(point.spentCumulative))}</strong>
                      </span>
                      <span className="tabular-nums">
                        Planejado: <strong className="text-[var(--color-text-primary)]">{formatCurrency(Math.round(point.plannedCumulative))}</strong>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function MetricPill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-[14px] border border-[color-mix(in_srgb,var(--color-border)_70%,transparent)] bg-[var(--color-surface-alt)] p-3">
      <div className="mb-2 flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
        <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--color-text-tertiary)]">
          {label}
        </p>
      </div>
      <p className="truncate text-sm font-extrabold tabular-nums text-[var(--color-text-primary)]">
        {value}
      </p>
    </div>
  );
}
