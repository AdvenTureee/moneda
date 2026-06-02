'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { ArrowLeft, CalendarBlank, Check, Minus, Plus } from '@phosphor-icons/react';
import { useToast } from '@/components/ToastProvider';
import { updateBillingClosingDay } from '../actions';

interface BillingClosingDayFormProps {
  initialDay: number;
  wasMissing: boolean;
}

export default function BillingClosingDayForm({
  initialDay,
  wasMissing,
}: BillingClosingDayFormProps) {
  const [day, setDay] = useState(initialDay);
  const [saving, startSaving] = useTransition();
  const { showToast } = useToast();
  const dirty = day !== initialDay || wasMissing;

  function changeDay(next: number) {
    setDay(Math.min(28, Math.max(1, next)));
  }

  function handleSave() {
    const formData = new FormData();
    formData.set('billingClosingDay', String(day));
    startSaving(async () => {
      const result = await updateBillingClosingDay(formData);
      if (result.ok) showToast('success', result.message ?? 'Fechamento salvo.');
      else showToast('error', result.error);
    });
  }

  return (
    <div className="max-w-lg mx-auto px-4 pb-24 [scrollbar-gutter:stable]">
      <header className="flex items-center gap-3 py-5 animate-fade-up delay-0">
        <Link
          href="/perfil"
          className="flex h-9 w-9 items-center justify-center rounded-full text-[#1A1D23] transition-colors hover:bg-[#F1F3F7]"
          aria-label="Voltar para Perfil"
        >
          <ArrowLeft size={20} weight="bold" />
        </Link>
        <div>
          <h1 className="text-xl font-heading text-[#1A1D23]">Fechamento do cartão</h1>
          <p className="text-xs text-[#6B7280] mt-0.5">
            Define o ciclo usado no mês financeiro.
          </p>
        </div>
      </header>

      <section className="themed-card rounded-[20px] border border-[#F1F3F7] bg-white p-5 animate-fade-up delay-1">
        <div className="mb-5 flex items-start gap-3 rounded-[14px] bg-[#F8F9FB] p-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EEF9F4] text-[#5BBF8E]">
            <CalendarBlank size={18} weight="bold" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-[#1A1D23]">Dia da fatura</p>
            <p className="mt-0.5 text-xs leading-relaxed text-[#6B7280]">
              Se fecha dia {day}, o ciclo termina nesse dia e o próximo começa no dia seguinte.
            </p>
          </div>
        </div>

        <div className="rounded-[16px] border border-[#E5E7EB] bg-[#F8F9FB] p-4">
          <p className="text-center text-xs font-bold uppercase tracking-[0.08em] text-[#6B7280]">
            Fecha no dia
          </p>
          <div className="mt-3 flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => changeDay(day - 1)}
              disabled={saving || day <= 1}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#1A1D23] shadow-sm transition-colors hover:bg-[#EEF2F7] disabled:opacity-40"
              aria-label="Diminuir dia"
            >
              <Minus size={16} weight="bold" />
            </button>
            <input
              type="number"
              min={1}
              max={28}
              value={day}
              onChange={(event) => changeDay(Number(event.target.value))}
              disabled={saving}
              className="themed-field h-14 w-20 rounded-[14px] border border-[#E5E7EB] bg-white text-center text-2xl font-extrabold tabular-nums text-[#1A1D23] outline-none focus:border-[#A8C5E0]"
              aria-label="Dia de fechamento do cartão"
            />
            <button
              type="button"
              onClick={() => changeDay(day + 1)}
              disabled={saving || day >= 28}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#1A1D23] shadow-sm transition-colors hover:bg-[#EEF2F7] disabled:opacity-40"
              aria-label="Aumentar dia"
            >
              <Plus size={16} weight="bold" />
            </button>
          </div>
          <p className="mt-3 text-center text-xs text-[#6B7280]">
            Use um dia entre 1 e 28.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !dirty}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-[#5BBF8E] py-4 text-sm font-bold text-white transition-colors hover:bg-[#4AA77C] disabled:cursor-not-allowed disabled:opacity-40"
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
              Salvar fechamento
            </>
          )}
        </button>
      </section>
    </div>
  );
}
