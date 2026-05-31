'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ArrowsClockwise, Eye, Paperclip, Trash, X } from '@phosphor-icons/react';
import Icon from '@/components/Icon';
import ConfirmDialog from '@/components/ConfirmDialog';
import DatePicker from '@/components/DatePicker';
import { useToast } from '@/components/ToastProvider';
import { formatCurrency } from '@/lib/utils';
import { toLocalDateInput, todayLocalDate, currentTimeHHmm, timeHHmmFromDate, localDateTimeToIso } from '@/lib/date';
import { useCategories } from '@/hooks/useCategories';
import type { Expense, ExpenseInput, ExpensePaymentMethod } from '@/types';

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (input: ExpenseInput) => void | Expense | Promise<void | Expense>;
  editExpense?: Expense;
  optimisticSave?: boolean;
}

const CATEGORY_PREVIEW_LIMIT = 8;
const PAYMENT_OPTIONS: Array<{ value: ExpensePaymentMethod; label: string }> = [
  { value: 'pix', label: 'PIX' },
  { value: 'debit', label: 'Débito' },
  { value: 'credit', label: 'Crédito' },
];

export default function AddExpenseModal({
  isOpen,
  onClose,
  onSave,
  editExpense,
  optimisticSave = false,
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
  const [paymentMethod, setPaymentMethod] = useState<ExpensePaymentMethod>('other');
  const [creditPurchaseType, setCreditPurchaseType] = useState<'single' | 'installment'>('single');
  const [installmentCurrent, setInstallmentCurrent] = useState(1);
  const [installmentTotal, setInstallmentTotal] = useState(2);
  const [occurredAtInput, setOccurredAtInput] = useState(todayLocalDate());
  const [timeInput, setTimeInput] = useState(currentTimeHHmm());
  const [isRecurring, setIsRecurring] = useState(false);
  const [categoriesExpanded, setCategoriesExpanded] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptBusy, setReceiptBusy] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const { data: categories } = useCategories();
  const { showToast } = useToast();
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const receiptInputRef = useRef<HTMLInputElement>(null);
  const closeTimerRef = useRef<number | null>(null);
  const openFrameRef = useRef<number | null>(null);
  const dragStartYRef = useRef(0);
  const dragStartTimeRef = useRef(0);
  const isDraggingRef = useRef(false);
  const dragYRef = useRef(0);
  const isEditing = !!editExpense;

  useEffect(() => setMounted(true), []);

  const finishClose = useCallback(() => {
    setIsClosing(true);
    setConfirmDiscard(false);
    setDragY(0);
    dragYRef.current = 0;
    isDraggingRef.current = false;
    setIsDragging(false);
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
      setPaymentMethod('other');
      setCreditPurchaseType('single');
      setInstallmentCurrent(1);
      setInstallmentTotal(2);
      setOccurredAtInput(todayLocalDate());
      setTimeInput(currentTimeHHmm());
      setIsRecurring(false);
      setCategoriesExpanded(false);
      setReceiptFile(null);
      setSaveBusy(false);
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
      setPaymentMethod(editExpense.paymentMethod ?? 'other');
      setCreditPurchaseType(editExpense.creditDetails?.purchaseType ?? 'single');
      setInstallmentCurrent(editExpense.creditDetails?.installmentCurrent ?? 1);
      setInstallmentTotal(editExpense.creditDetails?.installmentTotal ?? 2);
      const editDate = new Date(editExpense.createdAt);
      setOccurredAtInput(toLocalDateInput(editDate));
      setTimeInput(timeHHmmFromDate(editDate));
      setIsRecurring(editExpense.isRecurring ?? false);
      setCategoriesExpanded(false);
      setReceiptFile(null);
      setSaveBusy(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, editExpense]);

  useEffect(() => {
    if (!isOpen || !selectedCategory) return;
    const selectedIndex = categories.findIndex((cat) => cat.id === selectedCategory);
    if (selectedIndex >= CATEGORY_PREVIEW_LIMIT) setCategoriesExpanded(true);
  }, [categories, isOpen, selectedCategory]);

  const visibleCategories = useMemo(
    () => (categoriesExpanded ? categories : categories.slice(0, CATEGORY_PREVIEW_LIMIT)),
    [categories, categoriesExpanded],
  );
  const hasHiddenCategories = categories.length > CATEGORY_PREVIEW_LIMIT;
  const hiddenCategoryCount = Math.max(categories.length - CATEGORY_PREVIEW_LIMIT, 0);

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

  const creditDetails = useMemo<ExpenseInput['creditDetails']>(() => {
    if (paymentMethod !== 'credit') return null;
    if (creditPurchaseType === 'single') return { purchaseType: 'single' };
    return {
      purchaseType: 'installment',
      installmentCurrent,
      installmentTotal,
    };
  }, [creditPurchaseType, installmentCurrent, installmentTotal, paymentMethod]);

  const hasValidInstallments =
    paymentMethod !== 'credit' ||
    creditPurchaseType === 'single' ||
    (
      Number.isInteger(installmentCurrent) &&
      Number.isInteger(installmentTotal) &&
      installmentCurrent >= 1 &&
      installmentTotal >= 2 &&
      installmentCurrent <= installmentTotal
    );

  const uploadReceiptForExpense = useCallback(async (expenseId: string, file: File) => {
    const formData = new FormData();
    formData.set('expenseId', expenseId);
    formData.set('file', file);
    const res = await fetch('/api/expenses/receipt', { method: 'POST', body: formData });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error ?? 'Não foi possível anexar o comprovante.');
    }
  }, []);

  const openExistingReceipt = useCallback(async () => {
    if (!editExpense?.receipt) return;
    setReceiptBusy(true);
    try {
      const res = await fetch(`/api/expenses/receipt?expenseId=${editExpense.id}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) throw new Error(data.error ?? 'Não foi possível abrir.');
      window.open(data.url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'Erro ao abrir comprovante');
    } finally {
      setReceiptBusy(false);
    }
  }, [editExpense, showToast]);

  const removeExistingReceipt = useCallback(async () => {
    if (!editExpense?.receipt) return;
    setReceiptBusy(true);
    try {
      const res = await fetch(`/api/expenses/receipt?expenseId=${editExpense.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Não foi possível remover o comprovante.');
      window.dispatchEvent(new CustomEvent('expense-mutated'));
      setReceiptFile(null);
      showToast('success', 'Comprovante removido');
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'Erro ao remover comprovante');
    } finally {
      setReceiptBusy(false);
    }
  }, [editExpense, showToast]);

  const handleSave = useCallback(async () => {
    if (amountCents <= 0 || !selectedCategory || saveBusy || !hasValidInstallments) return;
    const input: ExpenseInput = {
      amount: amountCents,
      category: selectedCategory,
      description: description.trim() || (categories.find((c) => c.id === selectedCategory)?.name ?? 'Gasto'),
      source: 'manual',
      paymentMethod,
      creditDetails,
      tags: [],
      occurredAt: localDateTimeToIso(occurredAtInput, timeInput),
      isRecurring,
    };
    const pendingReceiptFile = receiptFile;

    if (optimisticSave && !isEditing) {
      setSaveBusy(true);
      showToast('info', 'Salvando gasto...');
      finishClose();
      Promise.resolve(onSave(input))
        .then(async (saved) => {
          const expenseId = saved?.id;
          if (pendingReceiptFile && expenseId) {
            await uploadReceiptForExpense(expenseId, pendingReceiptFile);
            showToast('success', 'Comprovante anexado');
            window.dispatchEvent(new CustomEvent('expense-mutated'));
          }
        })
        .catch((error) => {
          showToast('error', error instanceof Error ? error.message : 'Erro ao salvar gasto');
        });
      return;
    }

    setSaveBusy(true);
    try {
      const saved = await onSave(input);
      const expenseId = editExpense?.id ?? saved?.id;
      if (pendingReceiptFile && expenseId) {
        await uploadReceiptForExpense(expenseId, pendingReceiptFile);
        showToast('success', 'Comprovante anexado');
        window.dispatchEvent(new CustomEvent('expense-mutated'));
      }
      finishClose();
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'Erro ao salvar gasto');
    } finally {
      setSaveBusy(false);
    }
  }, [amountCents, selectedCategory, saveBusy, hasValidInstallments, description, categories, paymentMethod, creditDetails, occurredAtInput, timeInput, isRecurring, receiptFile, optimisticSave, isEditing, showToast, finishClose, onSave, uploadReceiptForExpense, editExpense]);

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

  const handleHandlePointerMove = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    if (!isDraggingRef.current) return;
    e.preventDefault();
    const nextDragY = Math.max(0, e.clientY - dragStartYRef.current);
    dragYRef.current = nextDragY;
    setDragY(nextDragY);
  }, []);

  const handleHandlePointerUp = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
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

    if (finalDragY > 80 || velocity > 0.65) {
      finishClose();
      return;
    }

    setDragY(0);
  }, [finishClose]);

  const handleHandlePointerCancel = useCallback(() => {
    isDraggingRef.current = false;
    dragYRef.current = 0;
    setIsDragging(false);
    setDragY(0);
  }, []);

  const handleHandleLostPointerCapture = useCallback(() => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    dragYRef.current = 0;
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
      className="modal-wave-backdrop fixed inset-0 z-50 flex items-end justify-center"
      data-state={isClosing ? 'closing' : 'open'}
      onClick={handleBackdropClick}
    >
      <div
        className="modal-sheet w-full max-w-lg bg-white rounded-t-[24px] flex max-h-[84dvh] flex-col overflow-hidden"
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
          className="flex w-full touch-none select-none justify-center pt-2.5 pb-1.5 cursor-grab active:cursor-grabbing"
          aria-label="Arraste para baixo para fechar"
          onPointerDown={handleHandlePointerDown}
          onPointerMove={handleHandlePointerMove}
          onPointerUp={handleHandlePointerUp}
          onPointerCancel={handleHandlePointerCancel}
          onLostPointerCapture={handleHandleLostPointerCapture}
          onContextMenu={(e) => e.preventDefault()}
        >
          <span className="w-10 h-1 rounded-full bg-[#E5E7EB]" />
        </button>

        {/* Header */}
        <div className="flex shrink-0 items-center justify-between px-5 py-2.5">
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
            {visibleCategories.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              const categoryBg = `${cat.color}${isSelected ? '26' : '14'}`;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  aria-pressed={isSelected}
                  className="flex flex-col items-center gap-1 rounded-[10px] border py-2.5 px-1 transition-all duration-75 hover:brightness-[0.98] active:scale-95"
                  style={{
                    background: categoryBg,
                    borderColor: isSelected ? cat.color : `${cat.color}40`,
                    boxShadow: isSelected ? `0 0 0 1px ${cat.color}55` : undefined,
                  }}
                >
                  <Icon name={cat.icon} size={20} color={cat.color} aria-hidden />
                  <span
                    className="text-center text-[10px] font-semibold leading-tight"
                    style={{ color: isSelected ? cat.color : 'var(--color-text-secondary)' }}
                  >
                    {cat.name}
                  </span>
                </button>
              );
            })}
            </div>
            {hasHiddenCategories && (
              <button
                type="button"
                onClick={() => setCategoriesExpanded((prev) => !prev)}
                className="mt-2 w-full rounded-[10px] border border-[#E5E7EB] bg-white px-4 py-2.5 text-sm font-semibold text-[#6B7280] transition-colors hover:border-[#A8C5E0] hover:bg-[#F8F9FB] active:scale-[0.98]"
              >
                {categoriesExpanded ? 'Recolher' : `Ver mais (${hiddenCategoryCount})`}
              </button>
            )}
          </div>

          {/* Payment method */}
          <div className="px-5 mb-4">
            <p className="text-sm font-semibold text-[#6B7280] mb-2">
              Pagamento{' '}
              <span className="font-normal text-[#9CA3AF]">(opcional)</span>
            </p>
            <div className="grid grid-cols-3 gap-2" role="group" aria-label="Método de pagamento">
              {PAYMENT_OPTIONS.map((option) => {
                const isSelected = paymentMethod === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setPaymentMethod(isSelected ? 'other' : option.value)}
                    aria-pressed={isSelected}
                    className={`min-h-10 rounded-[10px] border px-2 text-sm font-semibold transition-all duration-100 active:scale-[0.98] ${
                      isSelected
                        ? 'border-[#5BBF8E] bg-[#EEF9F4] text-[#2E8F67] shadow-[0_0_0_1px_rgba(91,191,142,0.18)]'
                        : 'border-[#E5E7EB] bg-white text-[#6B7280] hover:border-[#A8C5E0] hover:bg-[#F8F9FB]'
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          {paymentMethod === 'credit' && (
            <div className="px-5 mb-4">
              <div className="themed-card rounded-[12px] bg-white p-3">
                <p className="text-sm font-semibold text-[#6B7280] mb-2">Crédito</p>
                <div className="grid grid-cols-2 gap-2" role="group" aria-label="Tipo de compra no crédito">
                  {[
                    { value: 'single' as const, label: 'À vista' },
                    { value: 'installment' as const, label: 'Parcelado' },
                  ].map((option) => {
                    const isSelected = creditPurchaseType === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setCreditPurchaseType(option.value)}
                        aria-pressed={isSelected}
                        className={`min-h-10 rounded-[10px] border px-2 text-sm font-semibold transition-all duration-100 active:scale-[0.98] ${
                          isSelected
                            ? 'border-[#5BBF8E] bg-[#EEF9F4] text-[#2E8F67] shadow-[0_0_0_1px_rgba(91,191,142,0.18)]'
                            : 'border-[#E5E7EB] bg-white text-[#6B7280] hover:border-[#A8C5E0] hover:bg-[#F8F9FB]'
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>

                {creditPurchaseType === 'installment' && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-semibold text-[#6B7280]">
                        Parcela atual
                      </span>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={installmentTotal}
                        value={installmentCurrent}
                        onChange={(event) => {
                          const next = Number(event.target.value);
                          setInstallmentCurrent(Number.isFinite(next) ? next : 1);
                        }}
                        className="themed-field w-full rounded-[10px] border border-[#E5E7EB] px-3 py-2.5 text-sm font-semibold text-[#1A1D23] outline-none focus:border-[#A8C5E0]"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-semibold text-[#6B7280]">
                        Total de parcelas
                      </span>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={2}
                        value={installmentTotal}
                        onChange={(event) => {
                          const next = Number(event.target.value);
                          setInstallmentTotal(Number.isFinite(next) ? next : 2);
                        }}
                        className="themed-field w-full rounded-[10px] border border-[#E5E7EB] px-3 py-2.5 text-sm font-semibold text-[#1A1D23] outline-none focus:border-[#A8C5E0]"
                      />
                    </label>
                    {!hasValidInstallments && (
                      <p className="col-span-2 text-xs font-medium text-[#B14C4C]">
                        A parcela atual precisa estar entre 1 e o total de parcelas.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

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

          {/* Receipt */}
          <div className="px-5 mb-4">
            <p className="text-sm font-semibold text-[#6B7280] mb-2">
              Comprovante{' '}
              <span className="font-normal text-[#9CA3AF]">(opcional)</span>
            </p>
            <input
              ref={receiptInputRef}
              type="file"
              className="hidden"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf"
              onChange={(event) => setReceiptFile(event.target.files?.[0] ?? null)}
            />
            <div className="themed-card flex items-center gap-2 rounded-[10px] bg-white p-2.5">
              <button
                type="button"
                onClick={() => receiptInputRef.current?.click()}
                className="flex min-w-0 flex-1 items-center gap-2 rounded-[8px] px-2 py-1.5 text-left transition-colors hover:bg-[#F8F9FB]"
              >
                <Paperclip size={17} className="shrink-0 text-[#7AAECF]" />
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-[#1A1D23]">
                  {receiptFile?.name ?? editExpense?.receipt?.fileName ?? 'Adicionar comprovante'}
                </span>
              </button>
              {editExpense?.receipt && !receiptFile && (
                <button
                  type="button"
                  onClick={openExistingReceipt}
                  disabled={receiptBusy}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[#EEF9F4] text-[#5BBF8E] transition-colors hover:bg-[#DDF4EA] disabled:opacity-50"
                  aria-label="Ver comprovante"
                >
                  <Eye size={16} />
                </button>
              )}
              {(editExpense?.receipt || receiptFile) && (
                <button
                  type="button"
                  onClick={() => {
                    if (receiptFile) setReceiptFile(null);
                    else removeExistingReceipt();
                  }}
                  disabled={receiptBusy}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[#FDF0F0] text-[#E07070] transition-colors hover:bg-[#FBE2E2] disabled:opacity-50"
                  aria-label="Remover comprovante"
                >
                  <Trash size={16} />
                </button>
              )}
            </div>
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
            disabled={amountCents <= 0 || !selectedCategory || saveBusy || !hasValidInstallments}
            className="w-full rounded-full py-4 text-[15px] font-semibold text-white transition-all duration-75 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background:
                amountCents > 0 && selectedCategory && hasValidInstallments ? '#5BBF8E' : '#9CA3AF',
            }}
          >
            {saveBusy
              ? 'Salvando...'
              : isEditing
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
