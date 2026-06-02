'use client';

import { useState, useTransition } from 'react';
import { CalendarBlank, Check, Minus, Plus } from '@phosphor-icons/react';
import { updateBillingClosingDay } from '@/app/(app)/perfil/actions';
import { useToast } from '@/components/ToastProvider';
import { normalizeBillingClosingDay } from '@/lib/billingCycle';

interface BillingClosingDayPromptProps {
  open: boolean;
  initialDay: number;
}

export default function BillingClosingDayPrompt({
  open,
  initialDay,
}: BillingClosingDayPromptProps) {
  const [visible, setVisible] = useState(open);
  const [day, setDay] = useState(normalizeBillingClosingDay(initialDay));
  const [saving, startSaving] = useTransition();
  const { showToast } = useToast();

  if (!visible) return null;

  function changeDay(next: number) {
    setDay(Math.min(28, Math.max(1, next)));
  }

  function handleSave() {
    const formData = new FormData();
    formData.set('billingClosingDay', String(day));
    startSaving(async () => {
      const result = await updateBillingClosingDay(formData);
      if (result.ok) {
        showToast('success', result.message ?? 'Fechamento salvo.');
        setVisible(false);
      } else {
        showToast('error', result.error);
      }
    });
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-[#10151C]/45 px-4 pb-4 backdrop-blur-sm sm:items-center sm:pb-0">
      <section
        className="themed-card w-full max-w-sm rounded-[22px] border border-[#E5E7EB] bg-white p-5 shadow-2xl animate-scale-in"
        role="dialog"
        aria-modal="true"
        aria-labelledby="billing-closing-title"
      >
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#EEF9F4] text-[#5BBF8E]">
            <CalendarBlank size={22} weight="bold" />
          </span>
          <div>
            <h2 id="billing-closing-title" className="text-lg font-heading text-[#1A1D23]">
              Dia de fechamento
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-[#6B7280]">
              Para calcular seu mês financeiro, informe em qual dia a fatura do cartão fecha.
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-[16px] border border-[#E5E7EB] bg-[#F8F9FB] p-4">
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
          disabled={saving}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-[#5BBF8E] py-3.5 text-sm font-bold text-white transition-colors hover:bg-[#4AA77C] disabled:opacity-50"
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
