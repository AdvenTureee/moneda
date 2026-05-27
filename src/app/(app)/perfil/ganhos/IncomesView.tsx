'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { ArrowLeft, Trash, Check, Plus, ArrowsClockwise } from '@phosphor-icons/react';
import { useToast } from '@/components/ToastProvider';
import Icon from '@/components/Icon';
import DatePicker from '@/components/DatePicker';
import { formatCurrency, formatDate } from '@/lib/utils';
import { saveIncomeAction, deleteIncomeAction } from '../actions-finance';
import type { Income, IncomeSource } from '@/types';

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

export default function IncomesView({ initialIncomes }: IncomesViewProps) {
  const [amountCents, setAmountCents] = useState(0);
  const [amountDisplay, setAmountDisplay] = useState('');
  const [description, setDescription] = useState('');
  const [selectedSource, setSelectedSource] = useState<IncomeSource>('salary');
  const [isRecurring, setIsRecurring] = useState(false);
  const [receivedAtDate, setReceivedAtDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0]; // YYYY-MM-DD
  });

  const { showToast } = useToast();
  const [isAdding, startAdding] = useTransition();
  const [isDeleting, startDeleting] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleAmountChange = (raw: string) => {
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
  };

  const handleAddIncome = (e: React.FormEvent) => {
    e.preventDefault();
    if (amountCents <= 0 || !description.trim()) return;

    startAdding(async () => {
      try {
        const result = await saveIncomeAction(
          description,
          amountCents,
          selectedSource,
          isRecurring,
          receivedAtDate
        );

        if (result.ok) {
          showToast('success', 'Receita lançada com sucesso!');
          // Reset form fields
          setAmountCents(0);
          setAmountDisplay('');
          setDescription('');
          setSelectedSource('salary');
          setIsRecurring(false);
          setReceivedAtDate(new Date().toISOString().split('T')[0]);
        } else {
          showToast('error', result.error);
        }
      } catch (err: any) {
        showToast('error', err.message || 'Erro inesperado ao salvar.');
      }
    });
  };

  const handleDeleteIncome = (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta receita?')) return;
    setDeletingId(id);
    startDeleting(async () => {
      try {
        const result = await deleteIncomeAction(id);
        if (result.ok) {
          showToast('success', 'Receita excluída.');
        } else {
          showToast('error', result.error);
        }
      } catch (err: any) {
        showToast('error', err.message || 'Erro ao deletar.');
      } finally {
        setDeletingId(null);
      }
    });
  };

  const totalIncomes = initialIncomes.reduce((sum, item) => sum + item.amount, 0);

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
          <h1 className="text-xl font-bold text-[#1A1D23]">Ganhos e Receitas</h1>
          <p className="text-xs text-[#6B7280]">Gerencie suas entradas financeiras</p>
        </div>
      </div>

      {/* Summary Card */}
      <div
        className="ai-insight-banner text-white rounded-[20px] p-5 mb-6 shadow-md transition-all animate-fade-up delay-1"
        style={{
          background: 'linear-gradient(135deg, #D4A34A, #B8860B)',
          boxShadow: '0 8px 24px rgba(180, 130, 30, 0.25)',
        }}
      >
        <p className="text-xs font-semibold uppercase tracking-wider opacity-85">Total de Entradas</p>
        <p className="text-3xl font-extrabold mt-1.5 tabular-nums">
          {formatCurrency(totalIncomes)}
        </p>
        <p className="text-xs opacity-75 mt-2">
          Soma de todas as suas receitas ativas cadastradas.
        </p>
      </div>

      {/* Form Card */}
      <section
        className="themed-card bg-white rounded-[20px] p-5 border border-[#F1F3F7] mb-8 animate-fade-up delay-2"
      >
        <h2 className="text-sm font-bold text-[#1A1D23] mb-4">Lançar Nova Receita</h2>
        <form onSubmit={handleAddIncome} className="space-y-4">
          
          {/* Amount input */}
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
                className="w-full text-2xl font-extrabold bg-transparent outline-none tabular-nums text-[#1A1D23] placeholder:text-[#9CA3AF]"
                required
                aria-label="Valor em reais"
              />
            </div>
          </div>

          {/* Description input */}
          <div>
            <label className="block text-xs font-bold text-[#6B7280] uppercase mb-1.5">Descrição</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Salário Mensal, Projeto Web..."
              className="w-full border border-[#E5E7EB] rounded-[12px] px-4 py-3 text-sm text-[#1A1D23] bg-[#F8F9FB] outline-none focus:border-[#A8C5E0] focus:bg-white transition-colors"
              required
              maxLength={80}
            />
          </div>

          {/* Date & Recurrent Grid */}
          <div className="grid grid-cols-2 gap-3">
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

          {/* Source grid selection */}
          <div>
            <label className="block text-xs font-bold text-[#6B7280] uppercase mb-2">Origem da Receita</label>
            <div className="grid grid-cols-3 gap-2">
              {INCOME_SOURCES.map((src) => {
                const isSelected = selectedSource === src.id;
                return (
                  <button
                    key={src.id}
                    type="button"
                    onClick={() => setSelectedSource(src.id)}
                    className={`flex flex-col items-center gap-1 py-2.5 px-1 rounded-[12px] border-2 transition-all duration-75 active:scale-95 ${
                      isSelected
                        ? 'border-[#10B981] bg-[#EEF9F4]'
                        : 'border-[#E5E7EB] bg-white hover:border-[#A8C5E0]'
                    }`}
                  >
                    <Icon name={src.icon} size={18} className={isSelected ? 'text-[#047857]' : 'text-[#6B7280]'} />
                    <span
                      className={`text-[10px] font-bold ${
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

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isAdding || amountCents <= 0 || !description.trim()}
            className="w-full bg-[#5BBF8E] hover:bg-[#4AA77C] active:bg-[#3FA876] text-white font-bold py-4 rounded-full transition-colors duration-150 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            style={{ boxShadow: '0 6px 20px rgba(91, 191, 142, 0.35)' }}
          >
            {isAdding ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Lançando...
              </span>
            ) : (
              <>
                <Plus size={16} />
                <span>Adicionar Receita</span>
              </>
            )}
          </button>
        </form>
      </section>

      {/* History section */}
      <section className="animate-fade-up delay-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF] mb-3 px-1">
          Histórico de Receitas ({initialIncomes.length})
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
                  className={`flex items-center justify-between p-4 gap-4 transition-all duration-300 ${
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

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-bold text-[#10B981] tabular-nums">
                      + {formatCurrency(item.amount)}
                    </span>
                    <button
                      onClick={() => handleDeleteIncome(item.id)}
                      disabled={isDeleting}
                      className="p-2 text-[#9CA3AF] hover:text-[#EF4444] hover:bg-[#FDF0F0] rounded-full transition-all shrink-0 active:scale-95 disabled:opacity-40"
                      aria-label="Excluir ganho"
                    >
                      <Trash size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

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
