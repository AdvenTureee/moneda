'use client';

import type { CSSProperties, ReactNode } from 'react';

interface ChartTooltipProps {
  /** Horizontal position in CSS (e.g. '50%', '120px'). Anchored from the left edge of the relative container. */
  left: string | number;
  /** Vertical position. Anchored from the top edge of the relative container. */
  top: string | number;
  /** How the tooltip's own bounds align relative to (left, top). 'center' centers it, 'left'/'right' flush. */
  anchor?: 'center' | 'left' | 'right';
  /** Direction the tooltip points from the anchor point. 'up' = tooltip sits above the point. */
  direction?: 'up' | 'down';
  children: ReactNode;
}

export default function ChartTooltip({
  left,
  top,
  anchor = 'center',
  direction = 'up',
  children,
}: ChartTooltipProps) {
  const translateX = anchor === 'center' ? '-50%' : anchor === 'right' ? '-100%' : '0';
  const translateY = direction === 'up' ? '-100%' : '0';
  const offsetY = direction === 'up' ? -6 : 6;

  const style: CSSProperties = {
    left,
    top,
    transform: `translate(${translateX}, calc(${translateY} + ${offsetY}px))`,
  };

  return (
    <div
      role="tooltip"
      className="absolute z-10 bg-[#1A1D23] text-white text-xs rounded-lg px-3 py-2 shadow-lg pointer-events-none whitespace-nowrap animate-fade-in-fast"
      style={style}
    >
      {children}
    </div>
  );
}
