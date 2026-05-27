'use client';

import { useEffect, useMemo, useState } from 'react';
import { formatCurrency } from '@/lib/utils';

interface TopCategory {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  amount: number;
  percentage: number;
}

interface DonutChartProps {
  categories: TopCategory[];
  total: number;
  size?: number;
  onCategoryClick?: (categoryId: string | null) => void;
}

const MIN_PCT = 0.03;
const OTHERS_COLOR = '#6B7280';
const GAP_PX = 2;

interface Arc extends TopCategory {
  displayArc: number;
  offset: number;
}

export default function DonutChart({
  categories,
  total,
  size = 180,
  onCategoryClick,
}: DonutChartProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [animReady, setAnimReady] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setAnimReady(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const radius = size * 0.38;
  const strokeWidth = radius * 0.22;
  const innerR = Math.max(1, radius - strokeWidth / 2);
  const circumference = 2 * Math.PI * innerR;
  const center = size / 2;

  const arcs = useMemo<Arc[]>(() => {
    if (total <= 0 || categories.length === 0) return [];

    const visible: TopCategory[] = [];
    const grouped: TopCategory[] = [];
    for (const cat of categories) {
      if (cat.amount / total < MIN_PCT) grouped.push(cat);
      else visible.push(cat);
    }

    const result: Arc[] = [];
    let cumulative = 0;

    for (const cat of visible) {
      const segmentArc = (cat.percentage / 100) * circumference;
      const displayArc = Math.max(0.5, segmentArc - GAP_PX);
      result.push({ ...cat, displayArc, offset: cumulative });
      cumulative += segmentArc;
    }

    if (grouped.length > 0) {
      const groupedAmount = grouped.reduce((s, c) => s + c.amount, 0);
      const groupedPercentage = grouped.reduce((s, c) => s + c.percentage, 0);
      const segmentArc = (groupedPercentage / 100) * circumference;
      const displayArc = Math.max(0.5, segmentArc - GAP_PX);
      const name = grouped.length === 1 ? grouped[0].categoryName : 'Outros';
      const groupedColor = grouped.length === 1 ? grouped[0].categoryColor : OTHERS_COLOR;
      result.push({
        categoryId: '__others__',
        categoryName: name,
        categoryIcon: grouped.length === 1 ? grouped[0].categoryIcon : 'Package',
        categoryColor: groupedColor,
        amount: groupedAmount,
        percentage: groupedPercentage,
        displayArc,
        offset: cumulative,
      });
    }

    return result;
  }, [categories, total, circumference]);

  if (total === 0 || arcs.length === 0) {
    return (
      <div className="flex justify-center py-2">
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          role="img"
          aria-label="Gastos por categoria"
        >
          <circle
            cx={center}
            cy={center}
            r={innerR}
            fill="none"
            stroke="var(--color-border)"
            strokeWidth={strokeWidth}
          />
        </svg>
      </div>
    );
  }

  return (
    <div className="flex justify-center py-2">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label="Gastos por categoria"
      >
        {arcs.map((arc, i) => {
          const isHovered = hoveredId === arc.categoryId;
          const isDimmed = hoveredId !== null && !isHovered;
          const scale = isHovered ? 1.04 : 1;

          return (
            <g
              key={arc.categoryId}
              opacity={isDimmed ? 0.4 : 1}
              style={{
                cursor: 'pointer',
                transform: `scale(${scale})`,
                transformOrigin: `${center}px ${center}px`,
                transition: 'transform 150ms ease-out, opacity 200ms ease-out',
              }}
              onMouseEnter={() => setHoveredId(arc.categoryId)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => onCategoryClick?.(arc.categoryId !== '__others__' ? arc.categoryId : null)}
              role="button"
              aria-label={`${arc.categoryName}: ${formatCurrency(arc.amount)}, ${arc.percentage.toFixed(0)}%`}
            >
              <circle
                cx={center}
                cy={center}
                r={innerR}
                fill="none"
                stroke={arc.categoryColor}
                strokeWidth={strokeWidth}
                strokeLinecap="butt"
                strokeDasharray={`${Math.max(arc.displayArc, 0.5)} ${Math.max(circumference - arc.displayArc, 0.5)}`}
                strokeDashoffset={-arc.offset}
                transform={`rotate(-90 ${center} ${center})`}
                style={
                  animReady
                    ? {
                        animation: `donut-fill 400ms cubic-bezier(0, 0, 0.2, 1) both`,
                        animationDelay: `${i * 50}ms`,
                      }
                    : undefined
                }
              />
            </g>
          );
        })}

        <text
          x={center}
          y={center - 6}
          textAnchor="middle"
          className="tabular-nums"
          style={{
            fontSize: Math.round(size * 0.1),
            fontWeight: 700,
            fill: 'var(--color-text-primary)',
          }}
        >
          {formatCurrency(total)}
        </text>
        <text
          x={center}
          y={center + 13}
          textAnchor="middle"
          style={{
            fontSize: Math.round(size * 0.065),
            fill: 'var(--color-text-secondary)',
          }}
        >
          Total
        </text>
      </svg>
    </div>
  );
}
