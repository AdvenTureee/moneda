'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import ChartCard from './ChartCard';
import ChartTooltip from './ChartTooltip';
import { formatCurrency } from '@/lib/utils';

export interface MonthlyTrendPoint {
  period: string; // 'YYYY-MM'
  total: number; // centavos
}

interface MonthlyTrendChartProps {
  data: MonthlyTrendPoint[];
  currentPeriod: string;
}

const HEIGHT = 160;
const PAD = { top: 16, right: 16, bottom: 28, left: 36 };

function shortMonth(period: string): string {
  const [year, month] = period.split('-').map(Number);
  const d = new Date(year, month - 1, 1);
  return d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
}

function compactCurrency(centavos: number): string {
  const value = centavos / 100;
  if (value >= 1000) {
    return `R$ ${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`;
  }
  return `R$ ${value.toFixed(0)}`;
}

export default function MonthlyTrendChart({ data, currentPeriod }: MonthlyTrendChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(360);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.round(entry.contentRect.width);
        if (w > 0) setWidth(w);
      }
    });
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const max = useMemo(() => Math.max(...data.map((d) => d.total), 1), [data]);
  const chartW = Math.max(width - PAD.left - PAD.right, 200);
  const chartH = HEIGHT - PAD.top - PAD.bottom;
  const totalWidth = chartW + PAD.left + PAD.right;

  if (data.length === 0) {
    return (
      <ChartCard title="Evolução dos últimos meses" ariaLabel="Evolução mensal">
        <p className="text-sm text-[#6B7280] py-6 text-center">
          Sem dados suficientes para mostrar uma tendência.
        </p>
      </ChartCard>
    );
  }

  const points = data.map((d, i) => {
    const x = PAD.left + (data.length === 1 ? chartW / 2 : (i / (data.length - 1)) * chartW);
    const y = PAD.top + chartH * (1 - d.total / max);
    return { ...d, x, y, index: i };
  });

  const linePath = points
    .map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
    .join(' ');

  const areaPath = `${linePath} L ${points[points.length - 1].x} ${PAD.top + chartH} L ${points[0].x} ${PAD.top + chartH} Z`;

  const hovered = hoveredIndex !== null ? points[hoveredIndex] : null;

  const total = data.reduce((s, d) => s + d.total, 0);
  const avg = Math.round(total / data.length);

  return (
    <div ref={containerRef} className="animate-fade-up delay-3">
      <ChartCard
        title="Evolução dos últimos meses"
        ariaLabel="Evolução de gastos nos últimos meses"
        headerRight={
          <span className="text-xs text-[#6B7280]">
            Média:{' '}
            <span className="font-semibold text-[#1A1D23] tabular-nums">
              {formatCurrency(avg)}
            </span>
          </span>
        }
      >
        <div className="relative">
          {hovered && (
            <ChartTooltip
              left={hovered.x}
              top={hovered.y}
              anchor="center"
              direction="up"
            >
              <p className="font-semibold capitalize">{shortMonth(hovered.period)}</p>
              <p className="text-[#A8C5E0] tabular-nums mt-0.5">
                {formatCurrency(hovered.total)}
              </p>
            </ChartTooltip>
          )}

          <svg
            viewBox={`0 0 ${totalWidth} ${HEIGHT}`}
            className="w-full h-auto"
            preserveAspectRatio="none"
            style={{ overflow: 'visible' }}
            role="img"
            aria-label="Linha de evolução de gastos mensais"
          >
            <defs>
              <linearGradient id="trend-area" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#A8C5E0" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#A8C5E0" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Grid lines */}
            {[0.25, 0.5, 0.75, 1].map((f) => (
              <line
                key={`g-${f}`}
                x1={PAD.left}
                y1={PAD.top + chartH * (1 - f)}
                x2={totalWidth - PAD.right}
                y2={PAD.top + chartH * (1 - f)}
                stroke="#F1F3F7"
                strokeWidth={1}
                strokeDasharray={f === 0.5 ? '0' : '4 4'}
              />
            ))}

            {/* Y-axis labels */}
            <text
              x={PAD.left - 6}
              y={PAD.top + 3}
              textAnchor="end"
              className="text-[10px] font-medium fill-[#9CA3AF]"
            >
              {compactCurrency(max)}
            </text>
            <text
              x={PAD.left - 6}
              y={PAD.top + chartH + 3}
              textAnchor="end"
              className="text-[10px] font-medium fill-[#9CA3AF]"
            >
              R$ 0
            </text>

            {/* Area */}
            <path d={areaPath} fill="url(#trend-area)" />

            {/* Line */}
            <path
              d={linePath}
              fill="none"
              stroke="#7AAECF"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Points + hit targets */}
            {points.map((p) => {
              const isCurrent = p.period === currentPeriod;
              const isHovered = hoveredIndex === p.index;
              const r = isHovered ? 6 : isCurrent ? 5 : 3.5;
              const fill = isCurrent ? '#5BBF8E' : '#7AAECF';

              return (
                <g key={p.period}>
                  <circle cx={p.x} cy={p.y} r={r + 2} fill="#FFFFFF" />
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={r}
                    fill={fill}
                    className="transition-all duration-150"
                    style={
                      isCurrent
                        ? { filter: 'drop-shadow(0 2px 6px rgba(91,191,142,0.35))' }
                        : undefined
                    }
                  />
                  <rect
                    x={p.x - chartW / data.length / 2}
                    y={PAD.top}
                    width={chartW / data.length}
                    height={chartH + 14}
                    fill="transparent"
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredIndex(p.index)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    onTouchStart={() => setHoveredIndex(p.index)}
                    onTouchEnd={() => {
                      setTimeout(() => setHoveredIndex(null), 1500);
                    }}
                  >
                    <title>{`${shortMonth(p.period)}: ${formatCurrency(p.total)}`}</title>
                  </rect>
                </g>
              );
            })}

            {/* X-axis month labels */}
            {points.map((p) => (
              <text
                key={`xl-${p.period}`}
                x={p.x}
                y={HEIGHT - 6}
                textAnchor="middle"
                className={`text-[10px] font-medium ${
                  p.period === currentPeriod ? 'fill-[#1A1D23] font-semibold' : 'fill-[#9CA3AF]'
                }`}
              >
                {shortMonth(p.period)}
              </text>
            ))}
          </svg>
        </div>
      </ChartCard>
    </div>
  );
}
