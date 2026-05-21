'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from '@phosphor-icons/react';
import Icon from '@/components/Icon';
import ConfirmDialog from '@/components/ConfirmDialog';
import { formatCurrency } from '@/lib/utils';
import type { Expense, ExpenseInput, Category } from '@/types';

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
  const [amountCents, setAmountCents] = useState(0);
  const [amountDisplay, setAmountDisplay] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const isEditing = !!editExpense;

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (isOpen && !editExpense) {
      setAmountCents(0);
      setAmountDisplay('');
      setDescription('');
      setSelectedCategory('');
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
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, editExpense]);

  useEffect(() => {
    fetch('/api/categories')
      .then((res) => res.ok ? res.json() : null)
      .then((json) => {
        if (json?.data) setCategories(json.data);
      })
      .catch(() => {})
      .finally(() => setCategoriesLoaded(true));
  }, []);

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
    });
    onClose();
  }, [amountCents, description, selectedCategory, onSave, onClose]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) {
        if (amountCents > 0 || !!editExpense) {
          setConfirmDiscard(true);
        } else {
          onClose();
        }
      }
    },
    [amountCents, onClose, editExpense]
  );

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.32)' }}
      onClick={handleBackdropClick}
    >
      <div
        className="w-full max-w-lg bg-white rounded-t-[24px] pb-8 animate-slide-up"
        style={{
          paddingBottom: 'calc(2rem + env(safe-area-inset-bottom, 0px))',
          animation: 'slideUp 0.25s cubic-bezier(0, 0, 0.2, 1)',
        }}
        role="dialog"
        aria-modal
        aria-label={isEditing ? 'Editar gasto' : 'Adicionar gasto'}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-[#E5E7EB]" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3">
          <h2 className="text-lg font-semibold text-[#1A1D23]">{isEditing ? 'Editar Gasto' : 'Adicionar Gasto'}</h2>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-[#F1F3F7] transition-colors"
          >
            <X size={18} className="text-[#6B7280]" />
          </button>
        </div>

        {/* Amount input */}
        <div className="mx-5 mb-5">
          <div
            className="flex items-center gap-2 border-2 rounded-[10px] px-4 py-4 transition-colors"
            style={{
              borderColor: amountCents > 0 ? '#5BBF8E' : '#E5E7EB',
              background: amountCents > 0 ? '#EEF9F4' : '#fff',
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
              className="flex-1 text-4xl font-extrabold bg-transparent outline-none tabular-nums text-[#1A1D23] placeholder:text-[#9CA3AF]"
              aria-label="Valor do gasto em reais"
            />
          </div>
        </div>

        {/* Category selection */}
        <div className="px-5 mb-5">
          <p className="text-sm font-semibold text-[#6B7280] mb-3">Categoria</p>
          <div className="grid grid-cols-4 gap-2">
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
        <div className="px-5 mb-6">
          <p className="text-sm font-semibold text-[#6B7280] mb-2">
            Descrição{' '}
            <span className="font-normal text-[#9CA3AF]">(opcional)</span>
          </p>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex: iFood, Posto Shell..."
            className="w-full border border-[#E5E7EB] rounded-[10px] px-4 py-3 text-[15px] text-[#1A1D23] outline-none placeholder:text-[#9CA3AF] focus:border-[#A8C5E0] transition-colors"
            maxLength={120}
          />
        </div>

        {/* Save button */}
        <div className="px-5">
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
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
      <ConfirmDialog
        isOpen={confirmDiscard}
        title={isEditing ? 'Descartar alterações?' : 'Descartar gasto?'}
        message="As informações preenchidas serão perdidas."
        confirmLabel="Descartar"
        cancelLabel="Continuar editando"
        variant="danger"
        onConfirm={() => { setConfirmDiscard(false); onClose(); }}
        onCancel={() => setConfirmDiscard(false)}
      />
    </div>,
    document.body
  );
}
