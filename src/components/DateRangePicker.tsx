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
  const [position, setPosition] = useState<{ top: number; right: number } | null>(null);
  const [customFrom, setCustomFrom] = useState(isoToDateInput(value.from));
  const [customTo, setCustomTo] = useState(isoToDateInput(value.to));
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => setMounted(true), []);

  useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      const btn = buttonRef.current;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 4,
        right: Math.max(8, window.innerWidth - rect.right),
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
        className="inline-flex items-center gap-2 px-3 py-2 rounded-[10px] bg-white border border-[#E5E7EB] text-xs font-medium text-[#1A1D23] hover:bg-[#F8F9FB] transition-colors"
        aria-label={`Período: ${labelFor(value)}`}
        aria-expanded={open}
      >
        <CalendarBlank size={14} weight="bold" className="text-[#6B7280]" />
        <span>{labelFor(value)}</span>
        <CaretDown
          size={10}
          weight="bold"
          className={`text-[#6B7280] transition-transform ${open ? 'rotate-180' : ''}`}
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
            className="fixed z-[101] w-64 bg-white rounded-[10px] py-2"
            style={{
              top: position.top,
              right: position.right,
              boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
            }}
            role="dialog"
            aria-label="Filtro de data"
          >
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => pickPreset(p.id)}
                className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                  value.presetId === p.id
                    ? 'bg-[#F1F3F7] text-[#1A1D23] font-semibold'
                    : 'text-[#6B7280] hover:bg-[#F8F9FB]'
                }`}
              >
                {p.label}
              </button>
            ))}

            <div className="border-t border-[#F1F3F7] mt-1 pt-2 px-3 pb-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#9CA3AF] mb-2">
                Personalizado
              </p>
              <div className="space-y-2">
                <div>
                  <span className="block text-[11px] text-[#6B7280] mb-0.5">De</span>
                  <DatePicker
                    value={customFrom}
                    onChange={setCustomFrom}
                    max={customTo || undefined}
                    ariaLabel="Data inicial"
                    placeholder="Início"
                    className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-[6px] border border-[#E5E7EB] bg-white text-xs text-left outline-none focus:border-[#A8C5E0] transition-colors"
                  />
                </div>
                <div>
                  <span className="block text-[11px] text-[#6B7280] mb-0.5">Até</span>
                  <DatePicker
                    value={customTo}
                    onChange={setCustomTo}
                    min={customFrom || undefined}
                    ariaLabel="Data final"
                    placeholder="Fim"
                    className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-[6px] border border-[#E5E7EB] bg-white text-xs text-left outline-none focus:border-[#A8C5E0] transition-colors"
                  />
                </div>
                <button
                  type="button"
                  onClick={applyCustom}
                  disabled={!customFrom || !customTo}
                  className="w-full mt-1 px-3 py-1.5 rounded-[8px] bg-[#A8C5E0] text-white text-xs font-semibold disabled:opacity-50 hover:bg-[#7AAECF] transition-colors"
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
