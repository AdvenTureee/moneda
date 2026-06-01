'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { ArrowLeft, Trash, Check, Plus, ArrowsClockwise, PencilSimple, X, DotsThree } from '@phosphor-icons/react';
import { useToast } from '@/components/ToastProvider';
import Icon from '@/components/Icon';
import DatePicker from '@/components/DatePicker';
import { formatCurrency, formatDate } from '@/lib/utils';
import { saveIncomeAction, deleteIncomeAction, updateIncomeAction } from '../actions-finance';
import type { Income, IncomeSource } from '@/types';
import type { MouseEvent } from 'react';

interface IncomesViewProps {
  initialIncomes: Income[];
}

const INCOME_SOURCES = [
  { id: 'salary' as IncomeSource, name: 'Salário', icon: 'Briefcase', color: '#10B981' },
  { id: 'freelance' as IncomeSource, name: 'Freelance', icon: 'Rocket', color: '#8B5CF6' },
  { id: 'investment' as IncomeSource, name: 'Investimento', icon: 'TrendUp', color: '#3B82F6' },
  { id: 'rent' as IncomeSource, name: 'Aluguel', icon: 'House', color: '#EC4899' },
  { id: 'gift' as IncomeSource, name: 'Presente', icon: 'Gift', color: '#F59E0B' },
  { id: 'other' as IncomeSource, name: 'Outro', icon: 'Package', color: '#6B7280' },
];

function centsToDisplay(cents: number) {
  if (cents <= 0) return '';
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function IncomesView({ initialIncomes }: IncomesViewProps) {
  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null);
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
  const [amountCents, setAmountCents] = useState(0);
  const [amountDisplay, setAmountDisplay] = useState('');
  const [description, setDescription] = useState('');
  const [selectedSource, setSelectedSource] = useState<IncomeSource>('salary');
  const [isRecurring, setIsRecurring] = useState(false);
  const [receivedAtDate, setReceivedAtDate] = useState(() => {
    return toDateInputValue(new Date());
  });
  const [mounted, setMounted] = useState(false);

  const { showToast } = useToast();
  const [isAdding, startAdding] = useTransition();
  const [isDeleting, startDeleting] = useTransition();
  const [isUpdating, startUpdating] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const menuButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [menuIncome, setMenuIncome] = useState<Income | null>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    setMounted(true);
  }, []);

  const resetForm = () => {
    setAmountCents(0);
    setAmountDisplay('');
    setDescription('');
    setSelectedSource('salary');
    setIsRecurring(false);
    setReceivedAtDate(toDateInputValue(new Date()));
  };

  const handleAmountChange = (raw: string) => {
    const digits = raw.replace(/\D/g, '');
    if (!digits) {
      setAmountCents(0);
      setAmountDisplay('');
      return;
    }
    const cents = parseInt(digits, 10);
    setAmountCents(cents);
    setAmountDisplay(centsToDisplay(cents));
  };

  const openAddModal = () => {
    setEditingIncome(null);
    resetForm();
    setModalMode('add');
  };

  const openEditModal = (income: Income) => {
    setEditingIncome(income);
    setAmountCents(income.amount);
    setAmountDisplay(centsToDisplay(income.amount));
    setDescription(income.description);
    setSelectedSource(income.source);
    setIsRecurring(income.isRecurring);
    setReceivedAtDate(toDateInputValue(income.receivedAt));
    setModalMode('edit');
  };

  const closeIncomeModal = () => {
    if (isAdding || isUpdating) return;
    setModalMode(null);
    setEditingIncome(null);
  };

  const handleSubmitIncome = (e: React.FormEvent) => {
    e.preventDefault();
    if (amountCents <= 0 || !description.trim()) return;

    const save = async () => {
      try {
        const result = modalMode === 'edit' && editingIncome
          ? await updateIncomeAction(
              editingIncome.id,
              description,
              amountCents,
              selectedSource,
              isRecurring,
              receivedAtDate
            )
          : await saveIncomeAction(
              description,
              amountCents,
              selectedSource,
              isRecurring,
              receivedAtDate
            );

        if (result.ok) {
          showToast('success', modalMode === 'edit' ? 'Ganho atualizado com sucesso!' : 'Ganho lançado com sucesso!');
          setModalMode(null);
          setEditingIncome(null);
          resetForm();
        } else {
          showToast('error', result.error);
        }
      } catch (err: any) {
        showToast('error', err.message || 'Erro inesperado ao salvar.');
      }
    };

    if (modalMode === 'edit') {
      startUpdating(save);
    } else {
      startAdding(save);
    }
  };

  const handleDeleteIncome = (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este ganho?')) return;
    setMenuIncome(null);
    setDeletingId(id);
    startDeleting(async () => {
      try {
        const result = await deleteIncomeAction(id);
        if (result.ok) {
          showToast('success', 'Ganho excluído.');
        } else {
          showToast('error', result.error);
        }
      } catch (err: any) {
        showToast('error', err.message || 'Erro ao excluir.');
      } finally {
        setDeletingId(null);
      }
    });
  };

  const totalIncomes = initialIncomes.reduce((sum, item) => sum + item.amount, 0);
  const isSaving = isAdding || isUpdating;
  const isEditing = modalMode === 'edit';
  const menuItemClass =
    'expense-action-item group flex min-h-10 w-full items-center gap-3 rounded-[11px] px-3.5 text-left text-sm font-medium transition-[background,color,transform] duration-150 active:scale-[0.985] disabled:opacity-50';
  const menuItemDangerClass =
    'expense-action-item expense-action-item--danger group flex min-h-10 w-full items-center gap-3 rounded-[11px] px-3.5 text-left text-sm font-medium transition-[background,color,transform] duration-150 active:scale-[0.985] disabled:opacity-50';
  const menuIconClass = 'expense-action-icon shrink-0 transition-colors';
  const menuDangerIconClass = 'expense-action-danger-icon shrink-0 transition-colors';

  const placeMenu = (incomeId: string) => {
    const trigger = menuButtonRefs.current[incomeId];
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const width = Math.min(264, window.innerWidth - 16);
    const estimatedHeight = 92;
    const left = Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8));
    const below = rect.bottom + 8;
    const top =
      below + estimatedHeight > window.innerHeight - 8
        ? Math.max(8, rect.top - estimatedHeight - 8)
        : below;

    setMenuPosition({ top, left });
  };

  const openActionMenu = (event: MouseEvent<HTMLButtonElement>, income: Income) => {
    event.stopPropagation();
    placeMenu(income.id);
    setMenuIncome(income);
  };

  const closeActionMenu = () => {
    setMenuIncome(null);
  };

  const runMenuAction = (action: () => void) => {
    closeActionMenu();
    action();
  };

  useEffect(() => {
    if (!menuIncome) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') closeActionMenu();
    }

    function handleViewportChange() {
      if (menuIncome) placeMenu(menuIncome.id);
    }

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
    };
  }, [menuIncome]);

  return (
    <div className="max-w-lg mx-auto px-4 pb-24 [scrollbar-gutter:stable]">
      {/* Header */}
      <div className="flex items-center gap-3 py-5 mb-2 animate-fade-up delay-0">
        <Link
          href="/perfil"
          className="p-2 hover:bg-[#F1F3F7] rounded-full transition-colors"
          aria-label="Voltar para Perfil"
        >
          <ArrowLeft size={20} className="text-[#1A1D23]" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-[#1A1D23]">Ganhos</h1>
          <p className="text-xs text-[#6B7280]">Registre valores que ajudam a abater estouros do orçamento.</p>
        </div>
      </div>

      {/* Summary Card */}
      <div
        className="ai-insight-banner text-white rounded-[20px] p-5 mb-3 shadow-md transition-all animate-fade-up delay-1"
      >
        <p className="text-xs font-semibold uppercase tracking-wider opacity-85">Total de ganhos</p>
        <p className="text-3xl font-extrabold mt-1.5 tabular-nums">
          {formatCurrency(totalIncomes)}
        </p>
        <p className="text-xs opacity-75 mt-2">
          Ganhos abatem estouros no mês em que foram recebidos.
        </p>
      </div>

      <button
        type="button"
        onClick={openAddModal}
        className="mb-6 flex w-full items-center justify-center gap-2 rounded-full bg-[#5BBF8E] px-5 py-4 text-sm font-bold text-white shadow-[0_6px_20px_rgba(91,191,142,0.28)] transition-colors duration-150 active:scale-[0.98] hover:bg-[#4AA77C] animate-fade-up delay-2"
      >
        <Plus size={17} weight="bold" />
        <span>Adicionar ganho</span>
      </button>

      {/* History section */}
      <section className="animate-fade-up delay-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF] mb-3 px-1">
          Histórico de ganhos ({initialIncomes.length})
        </h2>

        {initialIncomes.length === 0 ? (
          <div className="bg-white rounded-[20px] py-12 px-6 border border-[#F1F3F7] text-center" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.01)' }}>
            <div className="w-12 h-12 rounded-full bg-[#EEF9F4] text-[#10B981] flex items-center justify-center mx-auto mb-3">
              <Check size={24} />
            </div>
            <p className="text-sm font-bold text-[#1A1D23]">Nenhum ganho cadastrado</p>
            <p className="text-xs text-[#6B7280] mt-1 max-w-[260px] mx-auto">
              Seus ganhos serão listados aqui assim que forem adicionados.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-[20px] border border-[#F1F3F7] overflow-hidden divide-y divide-[#F1F2F4]" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            {initialIncomes.map((item) => {
              const srcMeta = INCOME_SOURCES.find((s) => s.id === item.source) ?? INCOME_SOURCES[5];
              const isItemDeleting = deletingId === item.id;
              
              return (
                <div
                  key={item.id}
                  className={`flex items-start min-[380px]:items-center justify-between p-4 gap-3 transition-all duration-300 ${
                    isItemDeleting ? 'opacity-45 bg-[#FDF0F0]' : 'hover:bg-[#F8F9FB]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                      style={{
                        backgroundColor: `${srcMeta.color}15`,
                        color: srcMeta.color,
                      }}
                    >
                      <Icon name={srcMeta.icon} size={20} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-bold text-[#1A1D23] truncate leading-tight">
                          {item.description}
                        </p>
                        {item.isRecurring && (
                          <span
                            className="bg-[#EBF3FE] text-[#2563EB] text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                            title="Recorrente"
                          >
                            Recorr.
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#9CA3AF] mt-0.5">
                        {srcMeta.name} · {formatDate(item.receivedAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-1.5 shrink-0">
                    <span className="mr-1 text-right text-sm font-bold text-[#10B981] tabular-nums whitespace-nowrap">
                      + {formatCurrency(item.amount)}
                    </span>
                    <button
                      ref={(node) => {
                        menuButtonRefs.current[item.id] = node;
                      }}
                      type="button"
                      onClick={(event) => openActionMenu(event, item)}
                      disabled={isDeleting || isSaving}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F1F3F7]/70 text-[#6B7280] transition-colors hover:bg-[#E9EDF3] active:scale-95 disabled:opacity-50 dark:bg-white/8 dark:text-[#CBD5E1] dark:hover:bg-white/12"
                      aria-label="Mais opções do ganho"
                      aria-haspopup="menu"
                      aria-expanded={menuIncome?.id === item.id}
                    >
                      <DotsThree size={22} weight="bold" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {menuIncome && typeof document !== 'undefined' && createPortal(
        <>
          <button
            type="button"
            className="fixed inset-0 z-[80] cursor-default bg-transparent"
            aria-label="Fechar menu de opções"
            onClick={closeActionMenu}
          />
          <div
            role="menu"
            className="expense-action-menu fixed z-[81] max-h-[calc(100dvh-16px)] w-[min(264px,calc(100vw-16px))] overflow-y-auto rounded-[18px] p-1.5 backdrop-blur-xl"
            style={{ top: menuPosition.top, left: menuPosition.left }}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => runMenuAction(() => openEditModal(menuIncome))}
              className={menuItemClass}
            >
              <PencilSimple size={17} className={menuIconClass} />
              Editar ganho
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => runMenuAction(() => handleDeleteIncome(menuIncome.id))}
              className={menuItemDangerClass}
            >
              <Trash size={17} className={menuDangerIconClass} />
              Excluir ganho
            </button>
          </div>
        </>,
        document.body
      )}

      {mounted && modalMode && createPortal(
        <div
          className="modal-wave-backdrop fixed inset-0 z-[70] flex items-end justify-center sm:items-center p-0 sm:p-4"
          onClick={closeIncomeModal}
        >
          <div
            role="dialog"
            aria-modal
            aria-label={isEditing ? 'Editar ganho' : 'Adicionar ganho'}
            className="w-full max-w-lg max-h-[88dvh] overflow-y-auto rounded-t-[24px] sm:rounded-[24px] bg-white shadow-[var(--shadow-overlay)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 bg-white border-b border-[#F1F3F7] px-5 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-[#1A1D23]">{isEditing ? 'Editar ganho' : 'Adicionar ganho'}</h2>
                <p className="text-xs text-[#6B7280] mt-0.5">
                  {isEditing ? 'Ajuste o valor que entra no orçamento do mês.' : 'Registre um valor recebido para abater o orçamento do mês.'}
                </p>
              </div>
              <button
                type="button"
                onClick={closeIncomeModal}
                disabled={isSaving}
                aria-label="Fechar"
                className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-[#F1F3F7] transition-colors disabled:opacity-40"
              >
                <X size={18} className="text-[#6B7280]" />
              </button>
            </div>

            <form onSubmit={handleSubmitIncome} className="p-5 space-y-4">
              <div>
                <div
                  className={`flex items-center gap-2 border-2 rounded-[12px] px-4 py-3.5 transition-all focus-within:border-[#10B981] ${
                    amountCents > 0 ? 'themed-field-active' : 'themed-field'
                  }`}
                  style={{
                    borderColor: amountCents > 0 ? '#10B981' : 'var(--color-border)',
                  }}
                >
                  <span className="text-xl font-bold text-[#9CA3AF]">R$</span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={amountDisplay}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    placeholder="0,00"
                    className="min-w-0 w-full text-2xl font-extrabold bg-transparent outline-none tabular-nums text-[#1A1D23] placeholder:text-[#9CA3AF]"
                    required
                    aria-label="Valor em reais"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#6B7280] uppercase mb-1.5">Descrição</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex.: salário mensal, projeto web..."
                  className="w-full border border-[#E5E7EB] rounded-[12px] px-4 py-3 text-sm text-[#1A1D23] bg-[#F8F9FB] outline-none focus:border-[#A8C5E0] focus:bg-white transition-colors"
                  required
                  maxLength={80}
                />
              </div>

              <div className="grid grid-cols-1 min-[380px]:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#6B7280] uppercase mb-1.5">Recebido em</label>
                  <DatePicker
                    value={receivedAtDate}
                    onChange={setReceivedAtDate}
                    ariaLabel="Data de recebimento"
                    className="w-full flex items-center gap-2 border border-[#E5E7EB] rounded-[12px] px-3 py-3 text-sm text-left bg-[#F8F9FB] outline-none focus:border-[#A8C5E0] transition-colors"
                  />
                </div>

                <div className="flex flex-col justify-end">
                  <button
                    type="button"
                    onClick={() => setIsRecurring(!isRecurring)}
                    aria-pressed={isRecurring}
                    className={`flex items-center gap-2.5 justify-center border rounded-[12px] py-3 text-sm font-semibold select-none touch-manipulation transition-colors duration-75 active:scale-95 overflow-hidden ${
                      isRecurring
                        ? 'border-[#D4A34A] bg-[#FEF8E7] text-[#B8860B]'
                        : 'border-[#E5E7EB] bg-[#F8F9FB] text-[#6B7280] hover:border-[#A8C5E0]'
                    }`}
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                  >
                    <ArrowsClockwise size={16} className={`shrink-0 ${isRecurring ? 'animate-spin-slow' : ''}`} />
                    <span className="truncate">Recorrente</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#6B7280] uppercase mb-2">Origem do ganho</label>
                <div className="grid grid-cols-2 min-[380px]:grid-cols-3 gap-2">
                  {INCOME_SOURCES.map((src) => {
                    const isSelected = selectedSource === src.id;
                    return (
                      <button
                        key={src.id}
                        type="button"
                        onClick={() => setSelectedSource(src.id)}
                        aria-pressed={isSelected}
                        className={`flex items-center min-[380px]:flex-col justify-center gap-2 min-[380px]:gap-1 py-2.5 px-2 rounded-[12px] border-2 transition-all duration-75 active:scale-95 ${
                          isSelected
                            ? 'border-[#10B981] bg-[#EEF9F4]'
                            : 'border-[#E5E7EB] bg-white hover:border-[#A8C5E0]'
                        }`}
                      >
                        <Icon name={src.icon} size={18} className={isSelected ? 'text-[#047857]' : 'text-[#6B7280]'} />
                        <span
                          className={`text-[10px] font-bold truncate ${
                            isSelected ? 'text-[#047857]' : 'text-[#6B7280]'
                          }`}
                        >
                          {src.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 min-[380px]:grid-cols-[0.8fr_1.2fr] gap-3 pt-1">
                <button
                  type="button"
                  onClick={closeIncomeModal}
                  disabled={isSaving}
                  className="w-full border border-[#E5E7EB] bg-white text-[#6B7280] font-bold py-3.5 rounded-full transition-colors duration-150 active:scale-[0.98] disabled:opacity-40"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving || amountCents <= 0 || !description.trim()}
                  className="w-full bg-[#5BBF8E] hover:bg-[#4AA77C] active:bg-[#3FA876] text-white font-bold py-3.5 rounded-full transition-colors duration-150 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  style={{ boxShadow: '0 6px 20px rgba(91, 191, 142, 0.35)' }}
                >
                  {isSaving ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {isEditing ? 'Salvando...' : 'Lançando...'}
                    </span>
                  ) : (
                    <>
                      {isEditing ? <Check size={16} /> : <Plus size={16} />}
                      <span>{isEditing ? 'Salvar alterações' : 'Adicionar ganho'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      <style jsx global>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
      `}</style>
    </div>
  );
}
