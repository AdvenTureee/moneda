'use client';

import { useRef, useLayoutEffect, useState } from 'react';
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
  const ref = useRef<HTMLDivElement>(null);
  const [clampX, setClampX] = useState(0);

  const translateX = anchor === 'center' ? '-50%' : anchor === 'right' ? '-100%' : '0';
  const translateY = direction === 'up' ? '-100%' : '0';
  const offsetY = direction === 'up' ? -6 : 6;

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    let offset = 0;
    if (rect.left < 0) offset = -rect.left;
    if (rect.right > window.innerWidth) offset = window.innerWidth - rect.right;
    setClampX(offset);
  }, [left, top, anchor, direction, children]);

  const style: CSSProperties = {
    left,
    top,
    transform: `translate(calc(${translateX} + ${clampX}px), calc(${translateY} + ${offsetY}px))`,
    maxWidth: 'min(220px, calc(100vw - 24px))',
    willChange: 'transform, opacity',
  };

  return (
    <div
      ref={ref}
      role="tooltip"
      className="absolute z-10 min-w-[132px] bg-[#1A1D23] text-white text-xs rounded-lg px-3 py-2 shadow-lg pointer-events-none whitespace-normal animate-fade-in-fast"
      style={style}
    >
      {children}
    </div>
  );
}
