'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import ChartCard from './ChartCard';
import ChartTooltip from './ChartTooltip';
import { formatCurrency } from '@/lib/utils';

interface DailyHistogramProps {
  data: Array<{ date: string; amount: number }>;
  period: string;
}

function formatFullDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

function isWeekend(dateStr: string): boolean {
  const d = new Date(dateStr + 'T12:00:00');
  const dow = d.getDay();
  return dow === 0 || dow === 6;
}

function compactCurrency(centavos: number): string {
  const value = centavos / 100;
  if (value >= 1000) {
    return `R$ ${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`;
  }
  return `R$ ${value.toFixed(0)}`;
}

const HEIGHT = 170;
const PAD = { top: 12, right: 8, bottom: 28, left: 36 };
const COMPACT_PAD_LEFT = 8;

export default function DailyHistogram({ data, period }: DailyHistogramProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [containerWidth, setContainerWidth] = useState(360);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = Math.round(entry.contentRect.width);
        if (width > 0) setContainerWidth(width);
      }
    });
    ro.observe(el);
    setContainerWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const bars = useMemo(() => {
    const [year, month] = period.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    const map = new Map(data.map((d) => [d.date, d.amount]));

    const result: { date: string; day: number; amount: number; weekend: boolean }[] = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      result.push({
        date: dateStr,
        day,
        amount: map.get(dateStr) ?? 0,
        weekend: isWeekend(dateStr),
      });
    }
    return result;
  }, [data, period]);

  const maxAmount = useMemo(() => Math.max(...bars.map((b) => b.amount), 1), [bars]);
  const total = useMemo(() => bars.reduce((s, b) => s + b.amount, 0), [bars]);
  const daysWithSpend = bars.filter((b) => b.amount > 0).length;
  const avg = daysWithSpend > 0 ? total / daysWithSpend : 0;

  const compact = containerWidth < 360;
  const padLeft = compact ? COMPACT_PAD_LEFT : PAD.left;
  const width = Math.max(containerWidth, 280);
  const chartW = width - padLeft - PAD.right;
  const chartH = HEIGHT - PAD.top - PAD.bottom;
  const slotW = chartW / bars.length;
  const barW = Math.max(3, slotW - 2);

  const hoveredBar = hovered ? bars.find((b) => b.date === hovered) : null;
  const hoveredIndex = hoveredBar ? bars.indexOf(hoveredBar) : -1;

  const yAxisLabels = compact
    ? []
    : [
        { value: maxAmount, y: PAD.top },
        { value: maxAmount / 2, y: PAD.top + chartH / 2 },
        { value: 0, y: PAD.top + chartH },
      ];

  const xAxisDays = useMemo(() => {
    if (bars.length === 0) return [] as number[];
    if (compact) {
      return [0, Math.floor(bars.length / 2), bars.length - 1];
    }
    const result: number[] = [];
    for (let i = 0; i < bars.length; i++) {
      if (i === 0 || i === bars.length - 1 || (i + 1) % 5 === 0) {
        result.push(i);
      }
    }
    return result;
  }, [bars.length, compact]);

  function handleBarClick(dateStr: string) {
    router.push(`/feed?from=${dateStr}&to=${dateStr}`);
  }

  const allZero = bars.every((b) => b.amount === 0);

  return (
    <div ref={containerRef} className="animate-fade-up delay-3">
      <ChartCard
        title="Gastos diários"
        ariaLabel="Histograma de gastos diários"
        headerRight={
          total > 0 ? (
            <span className="text-xs text-[#6B7280]">
              Média:{' '}
              <span className="font-semibold text-[#1A1D23] tabular-nums">
                {formatCurrency(Math.round(avg))}
              </span>
              /dia
            </span>
          ) : undefined
        }
      >
        {allZero ? (
          <div className="flex flex-col items-center py-8 text-center">
            <p className="text-sm text-[#6B7280]">Nenhum gasto diário registrado neste período.</p>
          </div>
        ) : (
          <div className="relative">
            {hoveredBar && hoveredBar.amount > 0 && (
              <ChartTooltip
                left={padLeft + (hoveredIndex + 0.5) * slotW}
                top={PAD.top + chartH * (1 - hoveredBar.amount / maxAmount)}
                anchor="center"
                direction="up"
              >
                <p className="font-semibold capitalize">{formatFullDate(hoveredBar.date)}</p>
                <p className="text-[#A8C5E0] tabular-nums mt-0.5">
                  {formatCurrency(hoveredBar.amount)}
                </p>
                <p className="text-[10px] text-[#9CA3AF] mt-1">Toque para filtrar feed</p>
              </ChartTooltip>
            )}

            <svg
              viewBox={`0 0 ${width} ${HEIGHT}`}
              className="w-full h-auto"
              preserveAspectRatio="none"
              style={{ overflow: 'visible' }}
              role="img"
              aria-label="Histograma de gastos diários"
            >
              {/* Weekend background tint */}
              {bars.map((bar, i) =>
                bar.weekend ? (
                  <rect
                    key={`wkd-${bar.date}`}
                    x={padLeft + i * slotW - 1}
                    y={PAD.top}
                    width={slotW}
                    height={chartH}
                    fill="#F8F9FB"
                    pointerEvents="none"
                  />
                ) : null
              )}

              {/* Y-axis reference lines */}
              {[0.25, 0.5, 0.75, 1].map((f) => (
                <line
                  key={`ref-${f}`}
                  x1={padLeft}
                  y1={PAD.top + chartH * (1 - f)}
                  x2={width - PAD.right}
                  y2={PAD.top + chartH * (1 - f)}
                  stroke="#F1F3F7"
                  strokeWidth={1}
                  strokeDasharray={f === 0.5 ? '0' : '4 4'}
                />
              ))}

              {/* Y-axis labels */}
              {yAxisLabels.map((lbl) => (
                <text
                  key={`yl-${lbl.value}`}
                  x={padLeft - 6}
                  y={lbl.y + 3}
                  textAnchor="end"
                  className="text-[10px] font-medium fill-[#9CA3AF]"
                >
                  {compactCurrency(lbl.value)}
                </text>
              ))}

              {/* Average line */}
              {avg > 0 && (
                <line
                  x1={padLeft}
                  y1={PAD.top + chartH * (1 - avg / maxAmount)}
                  x2={width - PAD.right}
                  y2={PAD.top + chartH * (1 - avg / maxAmount)}
                  stroke="#A8C5E0"
                  strokeWidth={1.5}
                  strokeDasharray="6 3"
                  strokeLinecap="round"
                />
              )}

              {/* Bars */}
              {bars.map((bar, i) => {
                const isPeak = bar.amount === maxAmount && bar.amount > 0;
                const isHovered = hovered === bar.date;
                const h = (bar.amount / maxAmount) * chartH;
                const x = padLeft + i * slotW + (slotW - barW) / 2;
                const y = PAD.top + chartH - h;

                return (
                  <g key={bar.date}>
                    {/* Wider invisible hit target */}
                    <rect
                      x={padLeft + i * slotW - 1}
                      y={PAD.top}
                      width={slotW + 2}
                      height={chartH}
                      fill="transparent"
                      className="cursor-pointer"
                      onMouseEnter={() => setHovered(bar.date)}
                      onMouseLeave={() => setHovered(null)}
                      onTouchStart={() => setHovered(bar.date)}
                      onClick={() => bar.amount > 0 && handleBarClick(bar.date)}
                    >
                      <title>{bar.amount > 0 ? `${bar.day}: ${formatCurrency(bar.amount)}` : `${bar.day}: sem gastos`}</title>
                    </rect>
                    {/* Visible bar */}
                    {bar.amount > 0 && (
                      <rect
                        x={x}
                        y={y}
                        width={barW}
                        height={h}
                        rx={2}
                        fill={isPeak ? '#5BBF8E' : isHovered ? '#7AAECF' : '#A8C5E0'}
                        className="animate-bar-grow pointer-events-none"
                        style={{
                          transformBox: 'fill-box',
                          transformOrigin: 'bottom',
                          animationDelay: `${Math.min(i * 14, 600)}ms`,
                          filter: isPeak ? 'drop-shadow(0 2px 6px rgba(91,191,142,0.35))' : 'none',
                          transition: 'fill 150ms ease-out',
                        }}
                      />
                    )}
                  </g>
                );
              })}

              {/* X-axis day labels */}
              {xAxisDays.map((i) => {
                const bar = bars[i];
                const x = padLeft + (i + 0.5) * slotW;
                return (
                  <text
                    key={`xl-${bar.date}`}
                    x={x}
                    y={HEIGHT - 6}
                    textAnchor="middle"
                    className="text-[10px] font-medium fill-[#9CA3AF]"
                  >
                    {bar.day}
                  </text>
                );
              })}
            </svg>
          </div>
        )}
      </ChartCard>
    </div>
  );
}
