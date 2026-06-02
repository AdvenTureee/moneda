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

interface CycleOption {
  period: string;
  label: string;
  month: string;
  range: string;
}

function splitCycleLabel(label: string): { month: string; range: string } {
  const [month, range = ''] = label.split(' · ');
  return { month, range };
}

function buildOptions(monthsBack: number, closingDay: number): CycleOption[] {
  const currentPeriod = getCurrentBillingPeriod(closingDay);
  const opts: CycleOption[] = [];
  for (let i = 0; i < monthsBack; i++) {
    const period = shiftPeriod(currentPeriod, -i);
    const label = formatBillingCycleLabel(period, closingDay);
    opts.push({ period, label, ...splitCycleLabel(label) });
  }
  return opts;
}

export default function MonthPicker({ value, monthsBack = 12, closingDay = 10 }: MonthPickerProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const router = useRouter();
  const menuWidth = 280;

  const currentLabel = formatBillingCycleLabel(value, closingDay);
  const current = splitCycleLabel(currentLabel);

  const options = buildOptions(monthsBack, closingDay);

  useEffect(() => setMounted(true), []);

  useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      const btn = buttonRef.current;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      const mobile = window.innerWidth < 640;
      setIsMobile(mobile);
      if (mobile) {
        setPosition({ top: 0, left: 0 });
        return;
      }
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
    <div className="relative w-full sm:w-auto">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="themed-card flex min-h-[50px] w-full items-center justify-between gap-3 rounded-[14px] border border-[color-mix(in_srgb,var(--color-border)_76%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_88%,transparent)] px-3.5 py-2 text-left shadow-sm outline-none transition-[border-color,background-color,box-shadow,transform] hover:border-[#A8C5E0]/70 hover:bg-[color-mix(in_srgb,var(--color-surface-alt)_72%,var(--color-surface)_28%)] active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-[#A8C5E0] focus-visible:ring-offset-1 sm:min-h-10 sm:w-auto sm:min-w-[184px] sm:px-3"
        aria-label={`Ciclo: ${currentLabel}. Clique para trocar.`}
        aria-expanded={open}
      >
        <span className="min-w-0">
          <span className="block text-sm font-extrabold leading-tight text-[var(--color-text-primary)]">
            {current.month}
          </span>
          <span className="mt-0.5 block truncate text-xs font-semibold leading-tight text-[var(--color-text-secondary)]">
            {current.range}
          </span>
        </span>
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[color-mix(in_srgb,var(--color-surface-alt)_80%,transparent)] text-[var(--color-text-secondary)]">
          <CaretDown
            size={13}
            weight="bold"
            className={open ? 'rotate-180 transition-transform' : 'transition-transform'}
          />
        </span>
      </button>

      {mounted && open && position && createPortal(
        <>
          <div
            className={`fixed inset-0 z-[100] ${isMobile ? 'bg-black/20 backdrop-blur-[2px]' : ''}`}
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div
            className={`date-range-menu fixed z-[101] overflow-hidden rounded-[18px] p-2 backdrop-blur-xl ${
              isMobile
                ? 'bottom-3 left-3 right-3 max-h-[min(520px,calc(100dvh_-_24px_-_env(safe-area-inset-bottom)))] pb-[calc(0.5rem_+_env(safe-area-inset-bottom))]'
                : 'max-h-[min(360px,calc(100dvh_-_16px))] w-[min(280px,calc(100vw_-_16px))]'
            }`}
            style={isMobile ? undefined : { top: position.top, left: position.left }}
            role="listbox"
            aria-label="Filtro de ciclo"
          >
            {isMobile && (
              <div className="px-2 pb-2 pt-1">
                <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[color-mix(in_srgb,var(--color-text-tertiary)_42%,transparent)]" />
                <p className="text-sm font-extrabold text-[var(--color-text-primary)]">Escolher ciclo</p>
                <p className="mt-0.5 text-xs font-medium text-[var(--color-text-secondary)]">Período financeiro pelo fechamento do cartão</p>
              </div>
            )}
            <div className="max-h-[min(340px,calc(100dvh_-_124px))] overflow-y-auto overscroll-contain pr-0.5">
              {options.map((opt) => (
                <button
                  key={opt.period}
                  type="button"
                  onClick={() => pick(opt.period)}
                  className={`date-range-option flex min-h-12 w-full items-center justify-between gap-3 rounded-[12px] px-3.5 py-2 text-left transition-colors ${
                    opt.period === value
                      ? 'date-range-option--selected font-semibold'
                      : ''
                  }`}
                  role="option"
                  aria-selected={opt.period === value}
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-[var(--color-text-primary)]">{opt.month}</span>
                    <span className="mt-0.5 block truncate text-xs font-semibold text-[var(--color-text-secondary)]">{opt.range}</span>
                  </span>
                  {opt.period === value && (
                    <span className="h-2 w-2 shrink-0 rounded-full bg-[#5BBF8E]" aria-hidden />
                  )}
                </button>
              ))}
            </div>
          </div>
        </>,
        document.body,
      )}
    </div>
  );
}
