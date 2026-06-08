'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { ArrowUUpLeft, CaretDown } from '@phosphor-icons/react';
import { formatBillingCycleLabel, getCurrentBillingPeriod, shiftPeriod } from '@/lib/billingCycle';
import { setStoredDashboardPeriod } from '@/lib/navigationState';

interface MonthPickerProps {
  value: string;
  monthsBack?: number;
  closingDay?: number;
  fullWidth?: boolean;
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

export default function MonthPicker({
  value,
  monthsBack = 12,
  closingDay = 10,
  fullWidth = false,
}: MonthPickerProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const filterRef = useRef<HTMLDivElement | null>(null);
  const dragStartYRef = useRef(0);
  const dragStartTimeRef = useRef(0);
  const isDraggingRef = useRef(false);
  const dragYRef = useRef(0);
  const router = useRouter();
  const menuWidth = 280;

  const currentLabel = formatBillingCycleLabel(value, closingDay);
  const current = splitCycleLabel(currentLabel);
  const currentPeriod = getCurrentBillingPeriod(closingDay);
  const isViewingCurrentPeriod = value === currentPeriod;

  const options = buildOptions(monthsBack, closingDay);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    setStoredDashboardPeriod(value);
  }, [value]);

  const closeMenu = useCallback(() => {
    setOpen(false);
    setDragY(0);
    dragYRef.current = 0;
    isDraggingRef.current = false;
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (!open) {
      setDragY(0);
      dragYRef.current = 0;
      isDraggingRef.current = false;
      setIsDragging(false);
    }
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      const filter = filterRef.current;
      if (!filter) return;
      const rect = filter.getBoundingClientRect();
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
    closeMenu();
    setStoredDashboardPeriod(period);
    router.push(`/?period=${period}`);
    router.refresh();
  }

  const handleGrabPointerDown = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    dragStartYRef.current = e.clientY;
    dragStartTimeRef.current = performance.now();
    dragYRef.current = 0;
    isDraggingRef.current = true;
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  }, []);

  const handleGrabPointerMove = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    if (!isDraggingRef.current) return;
    e.preventDefault();
    const nextDragY = Math.max(0, e.clientY - dragStartYRef.current);
    dragYRef.current = nextDragY;
    setDragY(nextDragY);
  }, []);

  const handleGrabPointerUp = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    if (!isDraggingRef.current) return;
    e.preventDefault();
    const finalDragY = dragYRef.current;
    const elapsed = Math.max(performance.now() - dragStartTimeRef.current, 1);
    const velocity = finalDragY / elapsed;
    isDraggingRef.current = false;
    dragYRef.current = 0;
    setIsDragging(false);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }

    if (finalDragY > 72 || velocity > 0.6) {
      closeMenu();
      return;
    }

    setDragY(0);
  }, [closeMenu]);

  const cancelGrab = useCallback(() => {
    isDraggingRef.current = false;
    dragYRef.current = 0;
    setIsDragging(false);
    setDragY(0);
  }, []);

  return (
    <div className={`relative w-full ${fullWidth ? '' : 'sm:w-auto'}`}>
      <div
        ref={filterRef}
        className={`dashboard-cycle-filter themed-card flex min-h-[54px] w-full items-center justify-between gap-3 rounded-[14px] border border-[color-mix(in_srgb,var(--color-border)_76%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_88%,transparent)] px-3.5 py-2 text-left shadow-sm outline-none transition-[border-color,background-color,box-shadow,transform] hover:border-[#A8C5E0]/70 hover:bg-[color-mix(in_srgb,var(--color-surface-alt)_72%,var(--color-surface)_28%)] active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-[#A8C5E0] focus-visible:ring-offset-1 sm:min-h-10 sm:px-3 ${
          fullWidth ? '' : 'sm:w-auto sm:min-w-[184px]'
        }`}
        aria-expanded={open}
      >
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="min-w-0 flex-1 text-left outline-none"
          aria-label={`Ciclo: ${currentLabel}. Clique para trocar.`}
          aria-expanded={open}
        >
          <span className="mb-0.5 block text-[11px] font-bold leading-none text-[var(--color-text-tertiary)]">
            Ciclo financeiro
          </span>
          <span className="block text-sm font-extrabold leading-tight text-[var(--color-text-primary)]">
            {current.month}
          </span>
          <span className="mt-0.5 block truncate text-xs font-semibold leading-tight text-[var(--color-text-secondary)]">
            {current.range}
          </span>
        </button>
        <span className="flex shrink-0 items-center gap-1.5">
          {!isViewingCurrentPeriod && (
            <button
              type="button"
              onClick={() => pick(currentPeriod)}
              className="grid h-8 w-8 place-items-center rounded-full border border-[color-mix(in_srgb,var(--color-brand-green)_30%,transparent)] bg-[color-mix(in_srgb,var(--color-brand-green)_12%,var(--color-surface)_88%)] text-[var(--color-brand-green-dark)] shadow-[0_6px_14px_color-mix(in_srgb,var(--color-brand-green)_14%,transparent)] outline-none transition-[background-color,border-color,box-shadow,transform] hover:border-[color-mix(in_srgb,var(--color-brand-green)_46%,transparent)] hover:bg-[color-mix(in_srgb,var(--color-brand-green)_18%,var(--color-surface)_82%)] active:scale-95 focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--color-brand-green)_44%,transparent)] focus-visible:ring-offset-1"
              aria-label="Voltar para o ciclo atual"
              title="Voltar para o ciclo atual"
            >
              <ArrowUUpLeft size={15} weight="bold" aria-hidden />
            </button>
          )}
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="grid h-8 w-8 place-items-center rounded-full bg-[color-mix(in_srgb,var(--color-surface-alt)_80%,transparent)] text-[var(--color-text-secondary)] outline-none transition-[background-color,transform] hover:bg-[color-mix(in_srgb,var(--color-surface-alt)_92%,transparent)] active:scale-95 focus-visible:ring-2 focus-visible:ring-[#A8C5E0] focus-visible:ring-offset-1"
            aria-label="Abrir filtro de ciclo"
            aria-expanded={open}
          >
            <CaretDown
              size={13}
              weight="bold"
              className={open ? 'rotate-180 transition-transform' : 'transition-transform'}
              aria-hidden
            />
          </button>
        </span>
      </div>

      {mounted && open && position && createPortal(
        <>
          <div
            className={`fixed inset-0 z-[100] ${isMobile ? 'bg-black/20 backdrop-blur-[2px]' : ''}`}
            onClick={closeMenu}
            aria-hidden
          />
          <div
            className={`date-range-menu fixed z-[101] overflow-hidden rounded-[18px] p-2 backdrop-blur-xl ${
              isMobile
                ? 'bottom-3 left-3 right-3 max-h-[min(520px,calc(100dvh_-_24px_-_env(safe-area-inset-bottom)))] pb-[calc(0.5rem_+_env(safe-area-inset-bottom))]'
                : 'max-h-[min(360px,calc(100dvh_-_16px))] w-[min(280px,calc(100vw_-_16px))]'
            }`}
            style={
              isMobile
                ? {
                    transform: `translateY(${dragY}px)`,
                    transition: isDragging ? 'none' : 'transform 180ms cubic-bezier(0.22, 1, 0.36, 1)',
                  }
                : { top: position.top, left: position.left }
            }
            data-dragging={isDragging ? 'true' : undefined}
            role="listbox"
            aria-label="Filtro de ciclo"
          >
            {isMobile && (
              <div className="px-2 pb-2">
                <button
                  type="button"
                  className="cycle-filter-grab flex min-h-11 w-full touch-none select-none items-center justify-center cursor-grab active:cursor-grabbing"
                  aria-label="Arraste para baixo para fechar o filtro de ciclo"
                  onPointerDown={handleGrabPointerDown}
                  onPointerMove={handleGrabPointerMove}
                  onPointerUp={handleGrabPointerUp}
                  onPointerCancel={cancelGrab}
                  onLostPointerCapture={cancelGrab}
                  onContextMenu={(e) => e.preventDefault()}
                >
                  <span className="cycle-filter-grab__bar h-1.5 w-14 rounded-full" />
                </button>
                <p className="text-sm font-extrabold text-[var(--color-text-primary)]">Escolher ciclo</p>
                <p className="mt-0.5 text-xs font-medium text-[var(--color-text-secondary)]">Período financeiro pelo fechamento do cartão</p>
              </div>
            )}
            <div className="cycle-menu-scroll-shell max-h-[min(340px,calc(100dvh_-_124px))] overflow-hidden rounded-[14px]">
              <div className="cycle-menu-scroll max-h-[min(340px,calc(100dvh_-_124px))] overflow-y-auto overflow-x-hidden overscroll-contain pr-0.5">
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
          </div>
        </>,
        document.body,
      )}
    </div>
  );
}
