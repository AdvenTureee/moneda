'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarBlank, CaretDown } from '@phosphor-icons/react';
import DatePicker from '@/components/DatePicker';

export interface DateRange {
  /** ISO timestamp at the start of the local day, e.g. "2026-05-01T03:00:00.000Z" in GMT-3. */
  from: string | null;
  /** ISO timestamp at the end of the local day, inclusive. */
  to: string | null;
  presetId: string;
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

function startOfDay(d: Date): string {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c.toISOString();
}

function endOfDay(d: Date): string {
  const c = new Date(d);
  c.setHours(23, 59, 59, 999);
  return c.toISOString();
}

function parseLocalDateInput(value: string): Date {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function isoToDateInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function buildPreset(id: string): DateRange {
  const now = new Date();
  switch (id) {
    case 'this-month': {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { from: startOfDay(from), to: endOfDay(to), presetId: id };
    }
    case 'last-month': {
      const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const to = new Date(now.getFullYear(), now.getMonth(), 0);
      return { from: startOfDay(from), to: endOfDay(to), presetId: id };
    }
    case 'last-30': {
      const from = new Date(now);
      from.setDate(from.getDate() - 30);
      return { from: startOfDay(from), to: endOfDay(now), presetId: id };
    }
    case 'all':
    default:
      return { from: null, to: null, presetId: 'all' };
  }
}

const PRESETS: { id: string; label: string }[] = [
  { id: 'all', label: 'Tudo' },
  { id: 'this-month', label: 'Este mês' },
  { id: 'last-month', label: 'Mês passado' },
  { id: 'last-30', label: 'Últimos 30 dias' },
];

function labelFor(range: DateRange): string {
  const preset = PRESETS.find((p) => p.id === range.presetId);
  if (preset) return preset.label;
  if (range.from && range.to) {
    const fmt = (iso: string) =>
      new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    return `${fmt(range.from)} – ${fmt(range.to)}`;
  }
  return 'Período';
}

export default function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const [customFrom, setCustomFrom] = useState(isoToDateInput(value.from));
  const [customTo, setCustomTo] = useState(isoToDateInput(value.to));
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const pickerWidth = 280;

  useEffect(() => setMounted(true), []);

  useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      const btn = buttonRef.current;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      const width = Math.min(pickerWidth, window.innerWidth - 16);
      setPosition({
        top: rect.bottom + 4,
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

  function pickPreset(id: string) {
    onChange(buildPreset(id));
    setOpen(false);
  }

  function applyCustom() {
    if (!customFrom || !customTo) return;
    onChange({
      from: startOfDay(parseLocalDateInput(customFrom)),
      to: endOfDay(parseLocalDateInput(customTo)),
      presetId: 'custom',
    });
    setOpen(false);
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2 rounded-[12px] border border-white/[0.07] bg-[linear-gradient(180deg,rgba(23,30,39,0.98)_0%,rgba(14,19,26,0.98)_100%)] px-3 py-2.5 text-sm font-semibold text-[#F5F7FA] shadow-[0_10px_22px_rgba(2,6,23,0.14),inset_0_1px_0_rgba(255,255,255,0.04)] transition-[border-color,box-shadow,transform] hover:border-white/12 hover:shadow-[0_12px_26px_rgba(2,6,23,0.18),inset_0_1px_0_rgba(255,255,255,0.06)] active:scale-[0.985]"
        aria-label={`Período: ${labelFor(value)}`}
        aria-expanded={open}
      >
        <CalendarBlank size={16} weight="bold" className="text-[#9FB0C4]" />
        <span>{labelFor(value)}</span>
        <CaretDown
          size={10}
          weight="bold"
          className={`text-[#9FB0C4] transition-transform ${open ? 'rotate-180' : ''}`}
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
            className="fixed z-[101] max-h-[calc(100dvh-16px)] w-[min(280px,calc(100vw-16px))] overflow-y-auto rounded-[18px] border border-white/[0.07] bg-[linear-gradient(180deg,rgba(23,30,39,0.98)_0%,rgba(14,19,26,0.98)_100%)] p-1.5 shadow-[0_16px_34px_rgba(2,6,23,0.32),inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-xl"
            style={{
              top: position.top,
              left: position.left,
            }}
            role="dialog"
            aria-label="Filtro de data"
          >
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => pickPreset(p.id)}
                className={`w-full rounded-[11px] px-3.5 py-2 text-left text-sm transition-colors ${
                  value.presetId === p.id
                    ? 'bg-white/[0.09] text-[#F5F7FA] font-semibold'
                    : 'text-[#C6D0DC] hover:bg-white/[0.075] hover:text-[#F5F7FA]'
                }`}
              >
                {p.label}
              </button>
            ))}

            <div className="mt-1.5 border-t border-white/[0.075] px-2 pb-2 pt-3">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#8FA0B4]">
                Personalizado
              </p>
              <div className="space-y-2">
                <div>
                  <span className="mb-1 block text-[11px] text-[#9FB0C4]">De</span>
                  <DatePicker
                    value={customFrom}
                    onChange={setCustomFrom}
                    max={customTo || undefined}
                    ariaLabel="Data inicial"
                    placeholder="Início"
                    className="flex w-full items-center gap-1.5 rounded-[9px] border border-white/[0.08] bg-white/[0.045] px-2.5 py-2 text-left text-xs outline-none transition-colors hover:border-white/12 focus:border-white/18 [&_span]:text-[#F5F7FA] [&_svg]:text-[#9FB0C4]"
                  />
                </div>
                <div>
                  <span className="mb-1 block text-[11px] text-[#9FB0C4]">Até</span>
                  <DatePicker
                    value={customTo}
                    onChange={setCustomTo}
                    min={customFrom || undefined}
                    ariaLabel="Data final"
                    placeholder="Fim"
                    className="flex w-full items-center gap-1.5 rounded-[9px] border border-white/[0.08] bg-white/[0.045] px-2.5 py-2 text-left text-xs outline-none transition-colors hover:border-white/12 focus:border-white/18 [&_span]:text-[#F5F7FA] [&_svg]:text-[#9FB0C4]"
                  />
                </div>
                <button
                  type="button"
                  onClick={applyCustom}
                  disabled={!customFrom || !customTo}
                  className="mt-1 w-full rounded-[10px] bg-[#5BBF8E] px-3 py-2 text-xs font-semibold text-white transition-colors duration-150 hover:bg-[#4AA77C] active:bg-[#3FA876] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Aplicar
                </button>
              </div>
            </div>
          </div>
        </>,
        document.body,
      )}
    </>
  );
}
