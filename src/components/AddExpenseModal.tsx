'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, ArrowsClockwise } from '@phosphor-icons/react';
import Icon from '@/components/Icon';
import ConfirmDialog from '@/components/ConfirmDialog';
import DatePicker from '@/components/DatePicker';
import { formatCurrency } from '@/lib/utils';
import { toLocalDateInput, todayLocalDate, currentTimeHHmm, timeHHmmFromDate, localDateTimeToIso } from '@/lib/date';
import { useCategories } from '@/hooks/useCategories';
import type { Expense, ExpenseInput } from '@/types';

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (input: ExpenseInput) => void;
  editExpense?: Expense;
}

export default function AddExpenseModal({
  isOpen,
  onClose,
  onSave,
  editExpense,
}: AddExpenseModalProps) {
  const [mounted, setMounted] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [amountCents, setAmountCents] = useState(0);
  const [amountDisplay, setAmountDisplay] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [occurredAtInput, setOccurredAtInput] = useState(todayLocalDate());
  const [timeInput, setTimeInput] = useState(currentTimeHHmm());
  const [isRecurring, setIsRecurring] = useState(false);
  const { data: categories } = useCategories();
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const closeTimerRef = useRef<number | null>(null);
  const openFrameRef = useRef<number | null>(null);
  const dragStartYRef = useRef(0);
  const dragStartTimeRef = useRef(0);
  const isEditing = !!editExpense;

  useEffect(() => setMounted(true), []);

  const finishClose = useCallback(() => {
    setIsClosing(true);
    setConfirmDiscard(false);
    setDragY(0);
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = window.setTimeout(() => {
      setShouldRender(false);
      setIsClosing(false);
      closeTimerRef.current = null;
      onClose();
    }, 220);
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      setIsClosing(false);
      setDragY(window.innerHeight);
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
      if (openFrameRef.current) window.cancelAnimationFrame(openFrameRef.current);
      openFrameRef.current = window.requestAnimationFrame(() => {
        setDragY(0);
        openFrameRef.current = null;
      });
      return;
    }

    if (!closeTimerRef.current) setShouldRender(false);
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
      if (openFrameRef.current) window.cancelAnimationFrame(openFrameRef.current);
    };
  }, []);

  useEffect(() => {
    if (isOpen && !editExpense) {
      setAmountCents(0);
      setAmountDisplay('');
      setDescription('');
      setSelectedCategory('');
      setOccurredAtInput(todayLocalDate());
      setTimeInput(currentTimeHHmm());
      setIsRecurring(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    } else if (isOpen && editExpense) {
      setAmountCents(editExpense.amount);
      setAmountDisplay(
        new Intl.NumberFormat('pt-BR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(editExpense.amount / 100)
      );
      setDescription(editExpense.description);
      setSelectedCategory(editExpense.category);
      const editDate = new Date(editExpense.createdAt);
      setOccurredAtInput(toLocalDateInput(editDate));
      setTimeInput(timeHHmmFromDate(editDate));
      setIsRecurring(editExpense.isRecurring ?? false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, editExpense]);

  const handleAmountChange = useCallback((raw: string) => {
    // Accept only digits
    const digits = raw.replace(/\D/g, '');
    if (!digits) {
      setAmountCents(0);
      setAmountDisplay('');
      return;
    }
    const cents = parseInt(digits, 10);
    setAmountCents(cents);
    setAmountDisplay(
      new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(cents / 100)
    );
  }, []);

  const handleSave = useCallback(() => {
    if (amountCents <= 0 || !selectedCategory) return;
    onSave({
      amount: amountCents,
      category: selectedCategory,
      description: description.trim() || (categories.find((c) => c.id === selectedCategory)?.name ?? 'Gasto'),
      source: 'manual',
      tags: [],
      occurredAt: localDateTimeToIso(occurredAtInput, timeInput),
      isRecurring,
    });
    onClose();
  }, [amountCents, description, selectedCategory, occurredAtInput, timeInput, isRecurring, categories, onSave, onClose]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) {
        if (amountCents > 0 || !!editExpense) {
          setConfirmDiscard(true);
        } else {
          finishClose();
        }
      }
    },
    [amountCents, finishClose, editExpense]
  );

  const handleHandlePointerDown = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    dragStartYRef.current = e.clientY;
    dragStartTimeRef.current = performance.now();
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  }, []);

  const handleHandlePointerMove = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    if (!isDragging) return;
    setDragY(Math.max(0, e.clientY - dragStartYRef.current));
  }, [isDragging]);

  const handleHandlePointerUp = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    if (!isDragging) return;
    const elapsed = Math.max(performance.now() - dragStartTimeRef.current, 1);
    const velocity = dragY / elapsed;
    setIsDragging(false);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }

    if (dragY > 80 || velocity > 0.65) {
      finishClose();
      return;
    }

    setDragY(0);
  }, [dragY, finishClose, isDragging]);

  const handleHandlePointerCancel = useCallback(() => {
    setIsDragging(false);
    setDragY(0);
  }, []);

  if (!shouldRender || !mounted) return null;

  const sheetTransform = isClosing
    ? 'translateY(100%)'
    : dragY > 0
      ? `translateY(${dragY}px)`
      : 'translateY(0)';

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center transition-opacity duration-200"
      style={{
        background: 'rgba(0,0,0,0.32)',
        opacity: isClosing ? 0 : 1,
      }}
      onClick={handleBackdropClick}
    >
      <div
        className="w-full max-w-lg bg-white rounded-t-[24px] flex max-h-[92dvh] flex-col overflow-hidden"
        style={{
          boxShadow: 'var(--shadow-overlay)',
          transform: sheetTransform,
          transition: isDragging ? 'none' : 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
        role="dialog"
        aria-modal
        aria-label={isEditing ? 'Editar gasto' : 'Adicionar gasto'}
      >
        {/* Drag handle */}
        <button
          type="button"
          className="flex touch-none select-none justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing"
          aria-label="Arraste para baixo para fechar"
          onPointerDown={handleHandlePointerDown}
          onPointerMove={handleHandlePointerMove}
          onPointerUp={handleHandlePointerUp}
          onPointerCancel={handleHandlePointerCancel}
        >
          <span className="w-10 h-1 rounded-full bg-[#E5E7EB]" />
        </button>

        {/* Header */}
        <div className="flex shrink-0 items-center justify-between px-5 py-3">
          <h2 className="text-lg font-semibold text-[#1A1D23]">{isEditing ? 'Editar Gasto' : 'Adicionar Gasto'}</h2>
          <button
            onClick={finishClose}
            aria-label="Fechar"
            className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-[#F1F3F7] transition-colors"
          >
            <X size={18} className="text-[#6B7280]" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {/* Amount input */}
          <div className="mx-5 mb-5">
            <div
              className={`flex items-center gap-2 border-2 rounded-[10px] px-4 py-4 transition-colors ${
                amountCents > 0 ? 'themed-field-active' : 'themed-field'
              }`}
              style={{
                borderColor: amountCents > 0 ? 'var(--color-success)' : 'var(--color-border)',
              }}
            >
              <span className="text-2xl font-bold text-[#9CA3AF]">R$</span>
              <input
                ref={inputRef}
                type="tel"
                inputMode="numeric"
                value={amountDisplay}
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder="0,00"
                className="min-w-0 flex-1 text-4xl font-extrabold bg-transparent outline-none tabular-nums text-[#1A1D23] placeholder:text-[#9CA3AF]"
                aria-label="Valor do gasto em reais"
              />
            </div>
          </div>

          {/* Category selection */}
          <div className="px-5 mb-5">
            <p className="text-sm font-semibold text-[#6B7280] mb-3">Categoria</p>
            <div className="grid grid-cols-2 min-[380px]:grid-cols-3 sm:grid-cols-4 gap-2">
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  aria-pressed={isSelected}
                  className={`flex flex-col items-center gap-1 rounded-[10px] py-2.5 px-1 border transition-all duration-75 active:scale-95 ${
                    isSelected
                      ? 'border-[#5BBF8E] bg-[#EEF9F4]'
                      : 'border-[#E5E7EB] bg-white hover:border-[#A8C5E0]'
                  }`}
                  style={{
                    background: isSelected ? 'var(--field-active-bg)' : 'var(--color-surface)',
                    borderColor: isSelected ? 'var(--color-success)' : 'var(--color-border)',
                  }}
                >
                  <Icon name={cat.icon} size={20} aria-hidden />
                  <span
                    className={`text-[10px] font-medium leading-tight text-center ${
                      isSelected ? 'text-[#3FA876]' : 'text-[#6B7280]'
                    }`}
                  >
                    {cat.name}
                  </span>
                </button>
              );
            })}
            </div>
          </div>

          {/* Description */}
          <div className="px-5 mb-4">
            <p className="text-sm font-semibold text-[#6B7280] mb-2">
              Descrição{' '}
              <span className="font-normal text-[#9CA3AF]">(opcional)</span>
            </p>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: iFood, Posto Shell..."
              className="themed-field w-full border border-[#E5E7EB] rounded-[10px] px-4 py-3 text-[15px] text-[#1A1D23] outline-none placeholder:text-[#9CA3AF] focus:border-[#A8C5E0] transition-colors"
              maxLength={120}
            />
          </div>

          {/* Date + Recorrente */}
          <div className="px-5 mb-6">
            <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-2">
              <div>
                <p className="text-sm font-semibold text-[#6B7280] mb-2">Data do gasto</p>
                <DatePicker
                  value={occurredAtInput}
                  onChange={setOccurredAtInput}
                  timeValue={timeInput}
                  onTimeChange={setTimeInput}
                  max={todayLocalDate()}
                  ariaLabel="Data e horário do gasto"
                />
              </div>
              <div className="flex flex-col justify-end">
                <button
                  type="button"
                  onClick={() => setIsRecurring((v) => !v)}
                  aria-pressed={isRecurring}
                  className={`flex items-center gap-2 justify-center border rounded-[10px] px-4 py-3 text-[15px] font-semibold transition-colors duration-75 active:scale-95 ${
                    isRecurring
                      ? 'border-[#5BBF8E] bg-[#EEF9F4] text-[#3FA876]'
                      : 'border-[#E5E7EB] bg-white text-[#6B7280] hover:border-[#A8C5E0]'
                  }`}
                >
                  <ArrowsClockwise size={16} className={isRecurring ? 'animate-spin-slow' : ''} />
                  <span>Recorrente</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Save button */}
        <div
          className="shrink-0 px-5 pt-3"
          style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
        >
          <button
            onClick={handleSave}
            disabled={amountCents <= 0 || !selectedCategory}
            className="w-full rounded-full py-4 text-[15px] font-semibold text-white transition-all duration-75 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background:
                amountCents > 0 && selectedCategory ? '#5BBF8E' : '#9CA3AF',
            }}
          >
            {isEditing
              ? 'Atualizar'
              : amountCents > 0
                ? `Salvar — ${formatCurrency(amountCents)}`
                : 'Salvar Gasto'}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
      `}</style>
      <ConfirmDialog
        isOpen={confirmDiscard}
        title={isEditing ? 'Descartar alterações?' : 'Descartar gasto?'}
        message="As informações preenchidas serão perdidas."
        confirmLabel="Descartar"
        cancelLabel="Continuar editando"
        variant="danger"
        onConfirm={finishClose}
        onCancel={() => setConfirmDiscard(false)}
      />
    </div>,
    document.body
  );
}
