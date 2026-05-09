'use client';

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

const SIZE_MAP = { sm: 120, md: 180, lg: 240 };

export default function DonutChart({
  segments,
  size = 'md',
  centerLabel,
  centerValue,
  onSegmentClick,
  activeSegment,
}: DonutChartProps) {
  const px = SIZE_MAP[size];
  const cx = px / 2;
  const cy = px / 2;
  const strokeWidth = px * 0.12;
  const r = (px - strokeWidth) / 2 - 4;
  const circumference = 2 * Math.PI * r;

  const total = segments.reduce((sum, s) => sum + s.amount, 0);
  if (total === 0) return null;

  // Group segments < 3% into "Outros"
  const MIN_PCT = 0.03;
  const grouped: Segment[] = [];
  let othersAmount = 0;

  for (const seg of segments) {
    if (seg.amount / total < MIN_PCT) {
      othersAmount += seg.amount;
    } else {
      grouped.push(seg);
    }
  }

  if (othersAmount > 0) {
    grouped.push({ category: 'Outros', amount: othersAmount, color: '#6B7280' });
  }

  const groupedTotal = grouped.reduce((sum, s) => sum + s.amount, 0);

  let cumulative = 0;
  const arcs = grouped.map((seg) => {
    const fraction = seg.amount / groupedTotal;
    const dashLength = fraction * circumference - 2; // 2px gap
    const offset = circumference - cumulative * circumference;
    cumulative += fraction;

    return {
      ...seg,
      dashLength: Math.max(dashLength, 0),
      dashOffset: offset,
    };
  });

  const hasActive = activeSegment != null;

  return (
    <div
      className="relative inline-flex items-center justify-center"
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
        {/* Background circle */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="#F1F3F7"
          strokeWidth={strokeWidth}
        />

        {arcs.map((arc, i) => {
          const isActive = activeSegment === arc.category;
          const isDimmed = hasActive && !isActive;

          return (
            <circle
              key={arc.category}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={arc.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${arc.dashLength} ${circumference - arc.dashLength}`}
              strokeDashoffset={arc.dashOffset}
              strokeLinecap="round"
              onClick={() => onSegmentClick?.(arc)}
              className="transition-all duration-150"
              style={{
                opacity: isDimmed ? 0.3 : 1,
                transform: isActive
                  ? `scale(1.04)`
                  : 'scale(1)',
                transformOrigin: `${cx}px ${cy}px`,
                cursor: onSegmentClick ? 'pointer' : 'default',
              }}
            />
          );
        })}
      </svg>

      {/* Center label */}
      {(centerLabel || centerValue) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          {centerLabel && (
            <span className="text-xs text-[#9CA3AF] font-medium">{centerLabel}</span>
          )}
          {centerValue && (
            <span
              className={`font-bold text-[#1A1D23] tabular-nums ${
                size === 'sm' ? 'text-sm' : size === 'md' ? 'text-base' : 'text-lg'
              }`}
            >
              {centerValue}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
