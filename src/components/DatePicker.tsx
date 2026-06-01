'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarBlank, CaretLeft, CaretRight, Clock } from '@phosphor-icons/react';
import {
  toLocalDateInput,
  todayLocalDate,
  parseLocalDate,
  formatLocalDateBr,
} from '@/lib/date';

export interface DatePickerProps {
  /** Data em `YYYY-MM-DD` local. String vazia = sem seleção. */
  value: string;
  onChange: (value: string) => void;
  /** Horário em `HH:mm`. Quando fornecido, exibe o seletor de horário no popup. */
  timeValue?: string;
  onTimeChange?: (time: string) => void;
  /** `YYYY-MM-DD` mínimo aceito (inclusivo). */
  min?: string;
  /** `YYYY-MM-DD` máximo aceito (inclusivo). */
  max?: string;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
  disabled?: boolean;
}

const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function parseTime(value?: string): { hour: number; minute: number } {
  const [rawHour, rawMinute] = (value || '12:00').split(':').map(Number);
  const hour = Number.isFinite(rawHour) ? Math.max(0, Math.min(23, rawHour)) : 12;
  const minute = Number.isFinite(rawMinute) ? Math.max(0, Math.min(59, rawMinute)) : 0;
  return { hour, minute };
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function monthLabel(date: Date): string {
  return capitalize(
    date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
  );
}

function sameYMD(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function startOfMonthGrid(viewMonth: Date): Date {
  const first = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
  const out = new Date(first);
  out.setDate(first.getDate() - first.getDay()); // back to Sunday
  return out;
}

export default function DatePicker({
  value,
  onChange,
  timeValue,
  onTimeChange,
  min,
  max,
  placeholder = 'Selecionar data',
  ariaLabel,
  className,
  disabled,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);

  const [viewMonth, setViewMonth] = useState<Date>(() => {
    if (value) return parseLocalDate(value);
    return new Date();
  });

  useEffect(() => setMounted(true), []);

  // Realinhar viewMonth quando o valor externo muda enquanto fechado.
  useEffect(() => {
    if (!open && value) {
      const d = parseLocalDate(value);
      setViewMonth(new Date(d.getFullYear(), d.getMonth(), 1));
    }
  }, [value, open]);

  useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      const btn = buttonRef.current;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      const popupHeight = onTimeChange ? 408 : 352;
      const spaceBelow = window.innerHeight - rect.bottom;
      const top = spaceBelow < popupHeight && rect.top > popupHeight
        ? rect.top - popupHeight - 4
        : rect.bottom + 4;
      setPosition({
        top,
        left: Math.max(8, Math.min(rect.left, window.innerWidth - 296 - 8)),
        width: Math.max(rect.width, 280),
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

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (buttonRef.current?.contains(target)) return;
      if (popupRef.current?.contains(target)) return;
      setOpen(false);
    };
    window.addEventListener('pointerdown', onPointerDown, true);
    return () => window.removeEventListener('pointerdown', onPointerDown, true);
  }, [open]);

  const todayLocal = todayLocalDate();
  const today = parseLocalDate(todayLocal);
  const minDate = min ? parseLocalDate(min) : null;
  const maxDate = max ? parseLocalDate(max) : null;
  const selectedDate = value ? parseLocalDate(value) : null;

  const days = useMemo(() => {
    const start = startOfMonthGrid(viewMonth);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [viewMonth]);

  const isOutOfRange = (d: Date) => {
    if (minDate && d < new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate())) return true;
    if (maxDate && d > new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate())) return true;
    return false;
  };

  const goPrev = () => setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1));
  const goNext = () => setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1));

  const displayDate = value ? formatLocalDateBr(value) : '';
  const displayText = displayDate
    ? (timeValue ? `${displayDate}  ·  ${timeValue}` : displayDate)
    : '';
  const selectedSummary = displayText || 'Nenhuma data selecionada';
  const selectedTime = parseTime(timeValue);

  function updateTime(part: 'hour' | 'minute', delta: number) {
    if (!onTimeChange) return;
    const next = { ...selectedTime };
    if (part === 'hour') next.hour = (next.hour + delta + 24) % 24;
    else next.minute = (next.minute + delta + 60) % 60;
    onTimeChange(`${pad2(next.hour)}:${pad2(next.minute)}`);
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
        aria-label={ariaLabel ?? placeholder}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={
          className ??
          'themed-field w-full flex items-center gap-2 border border-[#E5E7EB] rounded-[10px] px-4 py-3 text-[15px] text-left outline-none focus:border-[#A8C5E0] disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-white'
        }
      >
        <CalendarBlank size={16} weight="bold" className="text-[#6B7280] shrink-0" />
        <span
          className={`flex-1 tabular-nums ${displayText ? 'text-[#1A1D23]' : 'text-[#9CA3AF]'}`}
        >
          {displayText || placeholder}
        </span>
      </button>

      {mounted && open && position && createPortal(
        <>
          <div
            ref={popupRef}
            className="fixed z-[101] bg-white rounded-[12px] p-3"
            style={{
              top: position.top,
              left: position.left,
              width: 280,
              boxShadow: 'var(--shadow-overlay)',
            }}
            role="dialog"
            aria-label="Selecionar data"
          >
            {/* Cabeçalho mês/ano + nav */}
            <div className="flex items-center justify-between mb-2 px-1">
              <button
                type="button"
                onClick={goPrev}
                aria-label="Mês anterior"
                className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#F1F3F7] transition-colors"
              >
                <CaretLeft size={14} weight="bold" className="text-[#6B7280]" />
              </button>
              <span className="text-sm font-semibold text-[#1A1D23]">
                {monthLabel(viewMonth)}
              </span>
              <button
                type="button"
                onClick={goNext}
                aria-label="Próximo mês"
                className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#F1F3F7] transition-colors"
              >
                <CaretRight size={14} weight="bold" className="text-[#6B7280]" />
              </button>
            </div>

            <div className="mb-2 flex justify-center px-1">
              <div className="max-w-full rounded-full bg-[#EEF9F4] px-3 py-1.5 text-center text-[12px] font-bold tabular-nums text-[#2E8F67] ring-1 ring-[#5BBF8E]/25">
                <span className="text-[#6B7280]">Selecionado:</span>{' '}
                <span>{selectedSummary}</span>
              </div>
            </div>

            {/* Linha de dias da semana */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {WEEKDAYS.map((wd, i) => (
                <div
                  key={`${wd}-${i}`}
                  className="text-[10px] font-semibold text-center text-[#9CA3AF] py-1"
                >
                  {wd}
                </div>
              ))}
            </div>

            {/* Grid de dias */}
            <div className="grid grid-cols-7 gap-1">
              {days.map((d, idx) => {
                const inMonth = d.getMonth() === viewMonth.getMonth();
                const isSelected = selectedDate ? sameYMD(d, selectedDate) : false;
                const isToday = sameYMD(d, today);
                const out = isOutOfRange(d);
                const disabledDay = out;
                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={disabledDay}
                    onClick={() => {
                      onChange(toLocalDateInput(d));
                      if (!onTimeChange) setOpen(false);
                    }}
                    className={`h-8 rounded-full text-[12px] tabular-nums transition-colors ${
                      isSelected
                        ? 'bg-[#5BBF8E] text-white font-semibold'
                        : disabledDay
                          ? 'text-[#D1D5DB] cursor-not-allowed'
                          : inMonth
                            ? 'text-[#1A1D23] hover:bg-[#F1F3F7]'
                            : 'text-[#9CA3AF] hover:bg-[#F8F9FB]'
                    } ${isToday && !isSelected ? 'ring-1 ring-[#A8C5E0]' : ''}`}
                    aria-pressed={isSelected}
                    aria-label={d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  >
                    {d.getDate()}
                  </button>
                );
              })}
            </div>

            {/* Seletor de horário */}
            {onTimeChange && (
              <div className="mt-3 pt-2 border-t border-[#F1F3F7] px-1">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5">
                    <Clock size={13} weight="bold" className="text-[#6B7280]" />
                    <span className="text-[11px] font-semibold text-[#6B7280]">Horário</span>
                  </div>
                  <span className="rounded-full bg-[#EEF9F4] px-2.5 py-1 text-[12px] font-bold tabular-nums text-[#3FA876]">
                    {pad2(selectedTime.hour)}:{pad2(selectedTime.minute)}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2" aria-label="Selecionar horário">
                  {[
                    { label: 'Hora', value: selectedTime.hour, part: 'hour' as const },
                    { label: 'Minuto', value: selectedTime.minute, part: 'minute' as const },
                  ].map((item) => (
                    <div
                      key={item.part}
                      className="themed-field rounded-[10px] border border-[#E5E7EB] bg-white p-2"
                    >
                      <p className="mb-1 text-center text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF]">
                        {item.label}
                      </p>
                      <div className="flex items-center justify-between gap-1">
                        <button
                          type="button"
                          onClick={() => updateTime(item.part, -1)}
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F1F3F7] text-sm font-bold text-[#6B7280] transition-colors hover:bg-[#E5EAF1] active:scale-95"
                          aria-label={`Diminuir ${item.label.toLowerCase()}`}
                        >
                          −
                        </button>
                        <span className="min-w-9 text-center text-lg font-bold tabular-nums text-[#1A1D23]">
                          {pad2(item.value)}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateTime(item.part, 1)}
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F1F3F7] text-sm font-bold text-[#6B7280] transition-colors hover:bg-[#E5EAF1] active:scale-95"
                          aria-label={`Aumentar ${item.label.toLowerCase()}`}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Atalho "Hoje" */}
            <div className="flex justify-between items-center mt-3 pt-2 border-t border-[#F1F3F7] px-1">
              <button
                type="button"
                onClick={() => {
                  if (!isOutOfRange(today)) {
                    onChange(todayLocal);
                    if (!onTimeChange) setOpen(false);
                  }
                }}
                disabled={isOutOfRange(today)}
                className="text-[11px] font-semibold text-[#5BBF8E] hover:text-[#3FA876] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Hoje
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-[11px] font-medium text-[#6B7280] hover:text-[#1A1D23]"
              >
                {onTimeChange ? 'Confirmar' : 'Fechar'}
              </button>
            </div>
          </div>
        </>,
        document.body,
      )}
    </>
  );
}
