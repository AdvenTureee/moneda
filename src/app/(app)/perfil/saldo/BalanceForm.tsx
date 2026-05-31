'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { ArrowLeft, Check, CurrencyDollar, Info } from '@phosphor-icons/react';
import { useToast } from '@/components/ToastProvider';
import { updateCurrentBalanceCents } from '../actions';
import { formatCurrency, formatDate } from '@/lib/utils';

interface BalanceFormProps {
  initialBalanceCents: number;
  updatedAt: string | null;
}

function formatCentsInput(cents: number): string {
  if (cents <= 0) return '';
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function parseCentsInput(raw: string): number {
  const digits = raw.replace(/\D/g, '');
  return digits ? parseInt(digits, 10) : 0;
}

export default function BalanceForm({ initialBalanceCents, updatedAt }: BalanceFormProps) {
  const [balanceCents, setBalanceCents] = useState(initialBalanceCents);
  const [balanceDisplay, setBalanceDisplay] = useState(formatCentsInput(initialBalanceCents));
  const [savedBalanceCents, setSavedBalanceCents] = useState(initialBalanceCents);
  const [saving, startSaving] = useTransition();
  const { showToast } = useToast();

  const hasChanges = balanceCents !== savedBalanceCents;

  function handleBalanceChange(raw: string) {
    const cents = parseCentsInput(raw);
    setBalanceCents(cents);
    setBalanceDisplay(formatCentsInput(cents));
  }

  function handleSave() {
    if (!hasChanges || balanceCents < 0) return;
    startSaving(async () => {
      const result = await updateCurrentBalanceCents(balanceCents);
      if (result.ok) {
        setSavedBalanceCents(balanceCents);
        showToast('success', result.message ?? 'Saldo atualizado.');
      } else {
        showToast('error', result.error);
      }
    });
  }

  return (
    <div className="max-w-lg mx-auto px-4 pb-24 [scrollbar-gutter:stable]">
      <header className="py-6 animate-fade-up delay-0">
        <Link
          href="/perfil"
          className="inline-flex items-center gap-1 text-sm text-[#6B7280] hover:text-[#1A1D23] transition-colors mb-3"
        >
          <ArrowLeft size={14} weight="bold" />
          Voltar
        </Link>
        <h1 className="text-2xl font-heading text-[#1A1D23]">Dinheiro disponível</h1>
        <p className="text-sm text-[#6B7280] mt-1">
          Atualize quanto você tem hoje para o Moneda recalcular o dinheiro restante.
        </p>
      </header>

      <section className="ai-insight-banner rounded-[20px] p-5 mb-5 text-white shadow-md animate-fade-up delay-1">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/18">
            <CurrencyDollar size={22} weight="bold" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider opacity-85">Saldo atual</p>
            <p className="mt-0.5 truncate text-3xl font-extrabold tabular-nums">
              {formatCurrency(savedBalanceCents)}
            </p>
          </div>
        </div>
        {updatedAt && (
          <p className="mt-3 text-xs opacity-75">
            Última atualização: {formatDate(new Date(updatedAt))}
          </p>
        )}
      </section>

      <section className="themed-card rounded-[20px] border border-[#F1F3F7] bg-white p-5 animate-fade-up delay-2">
        <label className="block text-xs font-bold uppercase tracking-[0.06em] text-[#6B7280] mb-2">
          Quanto você tem disponível agora?
        </label>
        <div className="flex items-center gap-2 rounded-[14px] border-2 border-[#E5E7EB] px-4 py-4 transition-colors focus-within:border-[#5BBF8E]">
          <span className="text-xl font-bold text-[#9CA3AF]">R$</span>
          <input
            type="tel"
            inputMode="numeric"
            value={balanceDisplay}
            onChange={(event) => handleBalanceChange(event.target.value)}
            placeholder="0,00"
            className="min-w-0 flex-1 bg-transparent text-3xl font-extrabold tabular-nums text-[#1A1D23] outline-none placeholder:text-[#9CA3AF]"
            aria-label="Dinheiro disponível em reais"
          />
        </div>

        <div className="mt-4 flex items-start gap-2 rounded-[14px] bg-[#F8F9FB] p-3">
          <Info size={17} weight="bold" className="mt-0.5 shrink-0 text-[#7AAECF]" />
          <p className="text-xs leading-relaxed text-[#6B7280]">
            Isso não cria uma receita. É só uma fotografia do dinheiro que você tem disponível hoje.
          </p>
        </div>
      </section>

      <button
        type="button"
        onClick={handleSave}
        disabled={saving || !hasChanges || balanceCents < 0}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-[#5BBF8E] py-4 text-sm font-bold text-white transition-colors duration-150 hover:bg-[#4AA77C] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 animate-fade-up delay-3"
        style={{ boxShadow: '0 6px 20px rgba(91, 191, 142, 0.35)' }}
      >
        {saving ? (
          <>
            <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            Salvando...
          </>
        ) : (
          <>
            <Check size={16} weight="bold" />
            Salvar saldo
          </>
        )}
      </button>
    </div>
  );
}
