import type { ReactNode } from 'react';

interface ChartCardProps {
  title?: string;
  headerRight?: ReactNode;
  className?: string;
  children: ReactNode;
  ariaLabel?: string;
}

export default function ChartCard({
  title,
  headerRight,
  className = '',
  children,
  ariaLabel,
}: ChartCardProps) {
  return (
    <section
      className={`bg-white rounded-[16px] p-5 ${className}`}
      style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
      aria-label={ariaLabel}
    >
      {(title || headerRight) && (
        <div className="flex items-center justify-between mb-4">
          {title && <h2 className="text-base font-heading text-[#1A1D23]">{title}</h2>}
          {headerRight}
        </div>
      )}
      {children}
    </section>
  );
}
