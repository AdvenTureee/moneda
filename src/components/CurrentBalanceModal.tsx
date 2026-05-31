'use client';

import { useEffect, useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { X } from '@phosphor-icons/react';
import { updateCurrentBalanceCents } from '@/app/(app)/perfil/actions';
import { useToast } from '@/components/ToastProvider';

interface CurrentBalanceModalProps {
  isOpen: boolean;
  onSaved: () => void;
  onLater: () => void;
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

export default function CurrentBalanceModal({
  isOpen,
  onSaved,
  onLater,
}: CurrentBalanceModalProps) {
  const [mounted, setMounted] = useState(false);
  const [balanceCents, setBalanceCents] = useState(0);
  const [balanceDisplay, setBalanceDisplay] = useState('');
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();
  const { showToast } = useToast();

  useEffect(() => setMounted(true), []);

  function handleBalanceChange(raw: string) {
    const cents = parseCentsInput(raw);
    setBalanceCents(cents);
    setBalanceDisplay(formatCentsInput(cents));
    if (error) setError('');
  }

  function save() {
    if (balanceCents <= 0 || pending) return;
    setError('');
    startTransition(async () => {
      const result = await updateCurrentBalanceCents(balanceCents);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      showToast('success', result.message ?? 'Saldo atualizado.');
      onSaved();
    });
  }

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div
      className="modal-wave-backdrop fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6"
      role="presentation"
    >
      <div
        className="modal-panel-pop themed-card w-full max-w-sm overflow-hidden rounded-[20px] bg-white shadow-2xl"
        role="dialog"
        aria-modal
        aria-labelledby="current-balance-title"
      >
        <div className="flex items-start justify-between gap-3 px-5 pt-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#6B7280]">
              Atualização rápida
            </p>
            <h2 id="current-balance-title" className="mt-1 text-xl font-heading text-[#1A1D23]">
              Quanto dinheiro você tem disponível hoje?
            </h2>
          </div>
          <button
            type="button"
            onClick={onLater}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#6B7280] transition-colors hover:bg-[#F1F3F7]"
            aria-label="Responder depois"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-5 pb-5 pt-3">
          <p className="text-sm leading-relaxed text-[#6B7280]">
            Agora o Moneda separa o dinheiro que você tem hoje do orçamento que pretende gastar no mês. Isso ajuda a mostrar quanto ainda sobra depois dos gastos, sem julgamento.
          </p>

          <div className="mt-4 flex items-center gap-2 rounded-[14px] border-2 border-[#E5E7EB] px-4 py-4 transition-colors focus-within:border-[#5BBF8E]">
            <span className="text-xl font-bold text-[#9CA3AF]">R$</span>
            <input
              type="tel"
              inputMode="numeric"
              value={balanceDisplay}
              onChange={(event) => handleBalanceChange(event.target.value)}
              placeholder="0,00"
              className="min-w-0 flex-1 bg-transparent text-3xl font-extrabold tabular-nums text-[#1A1D23] outline-none placeholder:text-[#9CA3AF]"
              aria-label="Saldo atual disponível em reais"
              autoFocus
            />
          </div>

          {error && (
            <p className="mt-2 text-sm font-medium text-[#B14C4C]" role="alert">
              {error}
            </p>
          )}

          <div className="mt-5 flex gap-2">
            <button
              type="button"
              onClick={onLater}
              disabled={pending}
              className="flex-1 rounded-full bg-[#F1F3F7] py-3 text-sm font-semibold text-[#6B7280] transition-colors hover:bg-[#E5E7EB] active:scale-[0.98] disabled:opacity-50"
            >
              Responder depois
            </button>
            <button
              type="button"
              onClick={save}
              disabled={balanceCents <= 0 || pending}
              className="flex-1 rounded-full bg-[#5BBF8E] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#4AA77C] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {pending ? 'Salvando...' : 'Salvar saldo'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
