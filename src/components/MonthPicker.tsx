'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CaretDown } from '@phosphor-icons/react';

interface MonthPickerProps {
  value: string;
  monthsBack?: number;
}

function buildOptions(monthsBack: number): { period: string; label: string }[] {
  const today = new Date();
  const opts: { period: string; label: string }[] = [];
  for (let i = 0; i < monthsBack; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const period = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
    opts.push({ period, label });
  }
  return opts;
}

export default function MonthPicker({ value, monthsBack = 12 }: MonthPickerProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const [year, month] = value.split('-').map(Number);
  const currentLabel = new Date(year, month - 1).toLocaleString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });

  const options = buildOptions(monthsBack);

  function pick(period: string) {
    setOpen(false);
    router.push(`/?period=${period}`);
    router.refresh();
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 capitalize text-sm font-semibold text-[#6B7280] hover:text-[#1A1D23] transition-colors"
        aria-label={`Mês: ${currentLabel}. Clique para trocar.`}
        aria-expanded={open}
      >
        {currentLabel}
        <CaretDown
          size={12}
          weight="bold"
          className={open ? 'rotate-180 transition-transform' : 'transition-transform'}
        />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div
            className="absolute left-0 top-full mt-1 z-50 w-44 max-h-72 overflow-y-auto bg-white rounded-[10px] py-1"
            style={{ boxShadow: 'var(--shadow-overlay)' }}
            role="listbox"
          >
            {options.map((opt) => (
              <button
                key={opt.period}
                type="button"
                onClick={() => pick(opt.period)}
                className={`w-full text-left px-3 py-2 text-sm capitalize transition-colors ${
                  opt.period === value
                    ? 'bg-[#F1F3F7] text-[#1A1D23] font-semibold'
                    : 'text-[#6B7280] hover:bg-[#F8F9FB]'
                }`}
                role="option"
                aria-selected={opt.period === value}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
