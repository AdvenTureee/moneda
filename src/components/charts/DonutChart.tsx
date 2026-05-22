'use client';

import { useMemo, useState } from 'react';
import Icon from '@/components/Icon';
import ChartTooltip from './ChartTooltip';
import { formatCurrency } from '@/lib/utils';

interface Segment {
  category: string;
  amount: number;
  color: string;
  icon?: string;
}

interface DonutChartProps {
  segments: Segment[];
  size?: 'sm' | 'md' | 'lg';
  centerLabel?: string;
  centerValue?: string;
  onSegmentClick?: (segment: Segment) => void;
  activeSegment?: string | null;
}

interface DisplaySegment extends Segment {
  isOthers: boolean;
  othersCount: number;
}

const SIZE_MAP = { sm: 120, md: 180, lg: 240 };
const MIN_PCT = 0.03;
const OTHERS_COLOR = '#6B7280';

export default function DonutChart({
  segments,
  size = 'md',
  centerLabel,
  centerValue,
  onSegmentClick,
  activeSegment,
}: DonutChartProps) {
  const [expanded, setExpanded] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const px = SIZE_MAP[size];
  const cx = px / 2;
  const cy = px / 2;
  const strokeWidth = px * 0.12;
  const hitStrokeWidth = strokeWidth + 14;
  const r = (px - strokeWidth) / 2 - 4;
  const circumference = 2 * Math.PI * r;

  const total = segments.reduce((sum, s) => sum + s.amount, 0);

  const displaySegments: DisplaySegment[] = useMemo(() => {
    if (total === 0) return [];
    if (expanded) {
      return segments.map((s) => ({ ...s, isOthers: false, othersCount: 0 }));
    }

    const visible: DisplaySegment[] = [];
    let othersAmount = 0;
    let othersCount = 0;

    for (const seg of segments) {
      if (seg.amount / total < MIN_PCT) {
        othersAmount += seg.amount;
        othersCount += 1;
      } else {
        visible.push({ ...seg, isOthers: false, othersCount: 0 });
      }
    }

    if (othersCount > 0) {
      visible.push({
        category: othersCount > 1 ? 'Outros' : segments.find((s) => s.amount / total < MIN_PCT)?.category ?? 'Outros',
        amount: othersAmount,
        color: OTHERS_COLOR,
        icon: 'Package',
        isOthers: othersCount > 1,
        othersCount,
      });
    }

    return visible;
  }, [segments, expanded, total]);

  if (total === 0) return null;

  const groupedTotal = displaySegments.reduce((sum, s) => sum + s.amount, 0);

  let cumulative = 0;
  const arcs = displaySegments.map((seg, i) => {
    const fraction = seg.amount / groupedTotal;
    const startFraction = cumulative;
    cumulative += fraction;
    const midFraction = startFraction + fraction / 2;
    const midAngle = midFraction * Math.PI * 2;

    const dashLength = Math.max(fraction * circumference - 2, 0);
    const dashOffset = circumference - startFraction * circumference;

    // Tooltip anchor: account for -90deg rotation of SVG.
    const tooltipX = cx + r * Math.sin(midAngle);
    const tooltipY = cy - r * Math.cos(midAngle);

    return {
      seg,
      index: i,
      dashLength,
      dashOffset,
      tooltipX,
      tooltipY,
      percentage: (seg.amount / total) * 100,
    };
  });

  const hoveredArc = hoveredIndex !== null ? arcs[hoveredIndex] : null;
  const hasActive = activeSegment != null || hoveredArc !== null;

  function handleSegmentInteraction(arc: (typeof arcs)[number]) {
    if (arc.seg.isOthers) {
      setExpanded((prev) => !prev);
      setHoveredIndex(null);
      return;
    }
    onSegmentClick?.(arc.seg);
  }

  // When hovered, swap center label/value to highlight that segment.
  const centerTopLabel = hoveredArc
    ? hoveredArc.seg.category
    : centerLabel;
  const centerBottomValue = hoveredArc
    ? `${formatCurrency(hoveredArc.seg.amount)} · ${hoveredArc.percentage.toFixed(0)}%`
    : centerValue;

  return (
    <div
      className="relative inline-flex items-center justify-center select-none"
      style={{ width: px, height: px }}
      role="img"
      aria-label="Gráfico de categorias de gastos"
    >
      <svg
        width={px}
        height={px}
        viewBox={`0 0 ${px} ${px}`}
        style={{ transform: 'rotate(-90deg)' }}
      >
        {/* Background ring */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="#F1F3F7"
          strokeWidth={strokeWidth}
        />

        {/* Visible arcs */}
        {arcs.map((arc) => {
          const isHovered = hoveredIndex === arc.index;
          const isActive = activeSegment === arc.seg.category || isHovered;
          const isDimmed = hasActive && !isActive;

          return (
            <circle
              key={`arc-${arc.index}`}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={arc.seg.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${arc.dashLength} ${circumference - arc.dashLength}`}
              strokeDashoffset={arc.dashOffset}
              strokeLinecap="round"
              className="animate-ring-draw"
              style={{
                ['--ring-start' as string]: circumference,
                ['--ring-end' as string]: arc.dashOffset,
                animationDelay: `${arc.index * 60}ms`,
                opacity: isDimmed ? 0.35 : 1,
                transform: isHovered ? 'scale(1.03)' : 'scale(1)',
                transformOrigin: `${cx}px ${cy}px`,
                transition: 'opacity 150ms ease-out, transform 150ms ease-out',
                pointerEvents: 'none',
              }}
            />
          );
        })}

        {/* Hit targets (wider invisible stroke for easier touch) */}
        {arcs.map((arc) => (
          <circle
            key={`hit-${arc.index}`}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="transparent"
            strokeWidth={hitStrokeWidth}
            strokeDasharray={`${arc.dashLength} ${circumference - arc.dashLength}`}
            strokeDashoffset={arc.dashOffset}
            style={{
              cursor: arc.seg.isOthers || onSegmentClick ? 'pointer' : 'default',
              pointerEvents: 'stroke',
            }}
            onMouseEnter={() => setHoveredIndex(arc.index)}
            onMouseLeave={() => setHoveredIndex(null)}
            onClick={() => handleSegmentInteraction(arc)}
            onTouchStart={() => setHoveredIndex(arc.index)}
            onTouchEnd={() => {
              setTimeout(() => setHoveredIndex(null), 1500);
            }}
          >
            <title>{`${arc.seg.category} — ${formatCurrency(arc.seg.amount)} (${arc.percentage.toFixed(0)}%)`}</title>
          </circle>
        ))}
      </svg>

      {/* Center label */}
      {(centerTopLabel || centerBottomValue) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-3 text-center">
          {centerTopLabel && (
            <span
              className={`text-xs font-medium truncate max-w-full ${
                hoveredArc ? 'text-[#1A1D23]' : 'text-[#9CA3AF]'
              }`}
            >
              {centerTopLabel}
            </span>
          )}
          {centerBottomValue && (
            <span
              className={`font-bold text-[#1A1D23] tabular-nums ${
                size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : 'text-base'
              }`}
            >
              {centerBottomValue}
            </span>
          )}
        </div>
      )}

      {/* Tooltip */}
      {hoveredArc && (
        <ChartTooltip
          left={hoveredArc.tooltipX}
          top={hoveredArc.tooltipY}
          anchor="center"
          direction={hoveredArc.tooltipY < cy ? 'up' : 'down'}
        >
          <div className="flex items-center gap-1.5">
            {hoveredArc.seg.icon && (
              <Icon name={hoveredArc.seg.icon} size={12} color="#FFFFFF" />
            )}
            <span className="font-semibold">{hoveredArc.seg.category}</span>
          </div>
          <div className="text-[#A8C5E0] tabular-nums mt-0.5">
            {formatCurrency(hoveredArc.seg.amount)} · {hoveredArc.percentage.toFixed(0)}%
          </div>
          {hoveredArc.seg.isOthers && (
            <div className="text-[10px] text-[#9CA3AF] mt-1">
              Toque para {expanded ? 'agrupar' : `ver ${hoveredArc.seg.othersCount}`}
            </div>
          )}
        </ChartTooltip>
      )}
    </div>
  );
}
