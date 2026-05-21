'use client';

import { useState, useMemo } from 'react';
import { formatCurrency } from '@/lib/utils';

interface DailyHistogramProps {
  data: Array<{ date: string; amount: number }>;
  period: string;
}

function formatShortDay(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('pt-BR', { day: 'numeric', weekday: 'short' }).slice(0, -1);
}

function formatFullDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
}

export default function DailyHistogram({ data, period }: DailyHistogramProps) {
  const [hovered, setHovered] = useState<string | null>(null);

  const bars = useMemo(() => {
    const [year, month] = period.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    const map = new Map(data.map((d) => [d.date, d.amount]));

    const result: { date: string; day: number; amount: number }[] = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      result.push({ date: dateStr, day, amount: map.get(dateStr) ?? 0 });
    }
    return result;
  }, [data, period]);

  const maxAmount = useMemo(() => Math.max(...bars.map((b) => b.amount), 1), [bars]);
  const total = useMemo(() => bars.reduce((s, b) => s + b.amount, 0), [bars]);
  const avg = total / bars.filter((b) => b.amount > 0).length || 0;

  const WIDTH = 600;
  const HEIGHT = 170;
  const PAD = { top: 8, right: 8, bottom: 28, left: 4 };
  const CHART_W = WIDTH - PAD.left - PAD.right;
  const CHART_H = HEIGHT - PAD.top - PAD.bottom;
  const BAR_W = Math.max(4, CHART_W / bars.length - 2);
  const GAP = 2;

  const hoveredBar = hovered ? bars.find((b) => b.date === hovered) : null;

  return (
    <div className="animate-fade-up delay-3">
      <div
        className="bg-white rounded-[16px] p-5"
        style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-heading text-[#1A1D23]">Gastos diários</h2>
          {total > 0 && (
            <span className="text-xs text-[#6B7280]">
              Média: <span className="font-semibold text-[#1A1D23]">{formatCurrency(Math.round(avg))}</span>/dia
            </span>
          )}
        </div>

        {bars.every((b) => b.amount === 0) ? (
          <div className="flex flex-col items-center py-8 text-center">
            <p className="text-sm text-[#6B7280]">Nenhum gasto diário registrado neste período.</p>
          </div>
        ) : (
          <div className="relative">
            {/* Hover tooltip */}
            {hoveredBar && hoveredBar.amount > 0 && (
              <div
                className="absolute z-10 bg-[#1A1D23] text-white text-xs rounded-lg px-3 py-2 shadow-lg pointer-events-none whitespace-nowrap"
                style={{
                  left: `${PAD.left + ((bars.indexOf(hoveredBar) + 0.5) / bars.length) * 100}%`,
                  transform: 'translateX(-50%)',
                  bottom: '100%',
                  marginBottom: '6px',
                }}
              >
                <p className="font-semibold">{formatFullDate(hoveredBar.date)}</p>
                <p className="text-[#A8C5E0] mt-0.5">{formatCurrency(hoveredBar.amount)}</p>
              </div>
            )}

            <svg
              viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
              className="w-full h-auto"
              style={{ overflow: 'visible' }}
              role="img"
              aria-label="Histograma de gastos diários"
            >
              {/* Y-axis reference lines */}
              {[0.25, 0.5, 0.75, 1].map((f) => (
                <line
                  key={f}
                  x1={PAD.left}
                  y1={PAD.top + CHART_H * (1 - f)}
                  x2={WIDTH - PAD.right}
                  y2={PAD.top + CHART_H * (1 - f)}
                  stroke="#F1F3F7"
                  strokeWidth={1}
                  strokeDasharray={f === 0.5 ? '0' : '4 4'}
                />
              ))}

              {/* Average line */}
              {avg > 0 && (
                <line
                  x1={PAD.left}
                  y1={PAD.top + CHART_H * (1 - avg / maxAmount)}
                  x2={WIDTH - PAD.right}
                  y2={PAD.top + CHART_H * (1 - avg / maxAmount)}
                  stroke="#A8C5E0"
                  strokeWidth={1.5}
                  strokeDasharray="6 3"
                  strokeLinecap="round"
                />
              )}

              {/* Bars */}
              {bars.map((bar, i) => {
                if (bar.amount === 0) return null;
                const x = PAD.left + i * (BAR_W + GAP);
                const h = (bar.amount / maxAmount) * CHART_H;
                const y = PAD.top + CHART_H - h;
                const isPeak = bar.amount === maxAmount;
                const isHovered = hovered === bar.date;

                return (
                  <g key={bar.date}>
                    {/* Hover target (invisible wider rect for easier targeting) */}
                    <rect
                      x={PAD.left + i * (BAR_W + GAP) - 2}
                      y={PAD.top}
                      width={BAR_W + 4}
                      height={CHART_H}
                      fill="transparent"
                      className="cursor-pointer"
                      onMouseEnter={() => setHovered(bar.date)}
                      onMouseLeave={() => setHovered(null)}
                    />
                    {/* Visible bar */}
                    <rect
                      x={x}
                      y={y}
                      width={BAR_W}
                      height={h}
                      rx={2}
                      className="transition-all duration-200 cursor-pointer"
                      fill={isPeak ? '#5BBF8E' : isHovered ? '#7AAECF' : '#A8C5E0'}
                      style={{
                        filter: isPeak ? 'drop-shadow(0 2px 6px rgba(91,191,142,0.35))' : 'none',
                      }}
                    />
                  </g>
                );
              })}

              {/* X-axis: day 1 and every 5th day */}
              {bars.filter((_, i) => i === 0 || i === bars.length - 1 || (i + 1) % 5 === 0).map((bar) => {
                const i = bars.indexOf(bar);
                const x = PAD.left + (i + 0.5) * (BAR_W + GAP);
                return (
                  <text
                    key={bar.date}
                    x={x}
                    y={HEIGHT - 6}
                    textAnchor="middle"
                    className="text-[10px] fill-[#9CA3AF] font-medium"
                  >
                    {bar.day}
                  </text>
                );
              })}
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}
