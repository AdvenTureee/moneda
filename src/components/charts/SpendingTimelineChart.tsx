'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import ChartCard from './ChartCard';
import ChartTooltip from './ChartTooltip';
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
const TOOLTIP_W = 168;
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

function buildPath(points: Point[], key: 'ySpent' | 'yPlanned'): string {
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p[key]}`).join(' ');
}

export default function SpendingTimelineChart({ data }: SpendingTimelineChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(360);
  const [mode, setMode] = useState<SpendingTimelineMode>('year');
  const [selectedDay, setSelectedDay] = useState(data.selectedDay);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

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
    let plannedCumulative = 0;
    const prepared = buckets.map((bucket, index) => {
      const plannedAmount = plannedForMode(mode, bucket, index, buckets.length, data);
      spentCumulative += bucket.amount;
      plannedCumulative += plannedAmount;
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

    const max = Math.max(
      ...prepared.map((p) => Math.max(p.spentCumulative, p.plannedCumulative)),
      1,
    );

    return prepared.map((point, index) => {
      const x = PAD.left + (prepared.length === 1 ? chartW / 2 : (index / (prepared.length - 1)) * chartW);
      return {
        ...point,
        x,
        ySpent: PAD.top + chartH * (1 - point.spentCumulative / max),
        yPlanned: PAD.top + chartH * (1 - point.plannedCumulative / max),
      };
    });
  }, [buckets, chartH, chartW, data, mode]);

  const maxValue = Math.max(
    ...points.map((p) => Math.max(p.spentCumulative, p.plannedCumulative)),
    1,
  );
  const spentPath = buildPath(points, 'ySpent');
  const plannedPath = buildPath(points, 'yPlanned');
  const hovered = hoveredIndex !== null ? points[hoveredIndex] : null;
  const tooltipLeft = hovered
    ? Math.min(Math.max(hovered.x, TOOLTIP_W / 2 + 4), totalWidth - TOOLTIP_W / 2 - 4)
    : 0;
  const tooltipTop = hovered
    ? Math.max(Math.min(hovered.ySpent, hovered.yPlanned), PAD.top + 26)
    : 0;
  const hasSpending = points.some((p) => p.spentCumulative > 0);
  const plannedTotal = points.at(-1)?.plannedCumulative ?? 0;

  const tickIndexes = useMemo(() => {
    if (points.length <= 8) return points.map((p) => p.index);
    if (mode === 'day') return [0, 6, 12, 18, 23].filter((i) => i < points.length);
    if (mode === 'month') return points.map((p) => p.index).filter((i) => i === 0 || i === points.length - 1 || (i + 1) % 5 === 0);
    return points.map((p) => p.index).filter((i) => i % 2 === 0 || i === points.length - 1);
  }, [mode, points]);

  return (
    <div ref={containerRef}>
      <ChartCard
        title={modeTitle(mode)}
        ariaLabel="Comparativo de gasto acumulado e planejado"
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
                onClick={() => setMode(item.value)}
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
            {hovered && (
              <ChartTooltip left={`${(tooltipLeft / totalWidth) * 100}%`} top={tooltipTop} anchor="center" direction="up">
                <p className="font-semibold">
                  {mode === 'month' ? dateLabel(hovered.key) : hovered.label}
                </p>
                <p className="mt-1 text-[11px] text-[#7AAECF] tabular-nums">
                  Gasto: {formatCurrency(Math.round(hovered.spentCumulative))}
                </p>
                <p className="text-[11px] text-[#5BBF8E] tabular-nums">
                  Planejado: {formatCurrency(Math.round(hovered.plannedCumulative))}
                </p>
              </ChartTooltip>
            )}

            <svg
              viewBox={`0 0 ${totalWidth} ${HEIGHT}`}
              className="w-full h-auto touch-none"
              preserveAspectRatio="none"
              style={{ overflow: 'visible' }}
              onPointerLeave={() => setHoveredIndex(null)}
              role="img"
              aria-label="Linhas acumuladas de gasto e valor planejado"
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
                    onPointerEnter={() => setHoveredIndex(point.index)}
                    onPointerMove={() => setHoveredIndex(point.index)}
                    onPointerDown={(event) => {
                      event.preventDefault();
                      setHoveredIndex(point.index);
                    }}
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
          </div>
        )}
      </ChartCard>
    </div>
  );
}
