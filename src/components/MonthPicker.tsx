'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { CaretDown } from '@phosphor-icons/react';
import { formatBillingCycleLabel, getCurrentBillingPeriod, shiftPeriod } from '@/lib/billingCycle';

interface MonthPickerProps {
  value: string;
  monthsBack?: number;
  closingDay?: number;
}

function buildOptions(monthsBack: number, closingDay: number): { period: string; label: string }[] {
  const currentPeriod = getCurrentBillingPeriod(closingDay);
  const opts: { period: string; label: string }[] = [];
  for (let i = 0; i < monthsBack; i++) {
    const period = shiftPeriod(currentPeriod, -i);
    const label = formatBillingCycleLabel(period, closingDay);
    opts.push({ period, label });
  }
  return opts;
}

export default function MonthPicker({ value, monthsBack = 12, closingDay = 10 }: MonthPickerProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const router = useRouter();
  const menuWidth = 224;

  const currentLabel = formatBillingCycleLabel(value, closingDay);

  const options = buildOptions(monthsBack, closingDay);

  useEffect(() => setMounted(true), []);

  useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      const btn = buttonRef.current;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      const width = Math.min(menuWidth, window.innerWidth - 16);
      setPosition({
        top: rect.bottom + 6,
        left: Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8)),
      });
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open]);

  function pick(period: string) {
    setOpen(false);
    router.push(`/?period=${period}`);
    router.refresh();
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 capitalize text-sm font-semibold text-[#6B7280] hover:text-[#1A1D23] transition-colors"
        aria-label={`Ciclo: ${currentLabel}. Clique para trocar.`}
        aria-expanded={open}
      >
        {currentLabel}
        <CaretDown
          size={12}
          weight="bold"
          className={open ? 'rotate-180 transition-transform' : 'transition-transform'}
        />
      </button>

      {mounted && open && position && createPortal(
        <>
          <div
            className="fixed inset-0 z-[100]"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div
            className="date-range-menu fixed z-[101] max-h-[min(288px,calc(100dvh-16px))] w-[min(224px,calc(100vw-16px))] overflow-y-auto rounded-[18px] p-1.5 backdrop-blur-xl"
            style={{
              top: position.top,
              left: position.left,
            }}
            role="listbox"
            aria-label="Filtro de mês"
          >
            {options.map((opt) => (
              <button
                key={opt.period}
                type="button"
                onClick={() => pick(opt.period)}
                className={`date-range-option w-full rounded-[11px] px-3.5 py-2 text-left text-sm capitalize transition-colors ${
                  opt.period === value
                    ? 'date-range-option--selected font-semibold'
                    : ''
                }`}
                role="option"
                aria-selected={opt.period === value}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </>,
        document.body,
      )}
    </div>
  );
}
