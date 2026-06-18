'use client';

import PrivateValue from '@/components/PrivateValue';

interface CompactMetricItem {
  label: string;
  value: string;
}

interface DashboardCompactMetricsProps {
  items: CompactMetricItem[];
  spendingProgressPercent?: number | null;
  spendingProgressColor?: string;
}

export default function DashboardCompactMetrics({
  items,
  spendingProgressPercent,
  spendingProgressColor,
}: DashboardCompactMetricsProps) {
  return (
    <section
      className="themed-card mb-4 grid grid-cols-3 gap-1 rounded-[14px] bg-white p-1.5 animate-fade-up delay-3 min-[390px]:gap-1.5"
      aria-label="Resumo financeiro do ciclo"
    >
      {items.map((item, index) => (
        <div
          key={item.label}
          className="relative min-w-0 overflow-hidden rounded-[10px] px-1.5 py-1.5 text-center min-[390px]:px-2"
        >
          {index < 2 && (
            <span className="absolute right-0 top-1/2 h-4 w-px -translate-y-1/2 bg-[var(--color-border)]" aria-hidden />
          )}
          <p className="mb-1 min-w-0 truncate text-center text-[8.5px] font-semibold uppercase tracking-[0.05em] text-[var(--color-text-tertiary)] min-[390px]:text-[9.5px]">
            {item.label}
          </p>
          <p className="whitespace-nowrap text-center text-xs font-bold leading-none tabular-nums text-[var(--color-text-primary)] min-[390px]:text-[13px] sm:text-sm">
            <PrivateValue value={item.value} />
          </p>
          {item.label === 'Gasto' && spendingProgressPercent !== null && (
            <div
              className="mt-2 flex h-3 items-center justify-center"
              aria-hidden
            >
              <div className="h-1 w-[46%] overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--color-border)_30%,transparent)]">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${spendingProgressPercent}%`,
                    backgroundColor: spendingProgressColor,
                  }}
                />
              </div>
            </div>
          )}
        </div>
      ))}
    </section>
  );
}
