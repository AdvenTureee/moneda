'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { ArrowLeft, Check, Trash, X } from '@phosphor-icons/react';
import Mo from '@/components/Mo';
import { useToast } from '@/components/ToastProvider';
import { deleteAccount } from '../actions';

const REASONS = [
  { code: 'not_using', label: 'Não uso mais' },
  { code: 'hard_to_use', label: 'Muito difícil de usar' },
  { code: 'missing_feature', label: 'Faltou uma funcionalidade' },
  { code: 'technical_issue', label: 'Tive problema técnico' },
  { code: 'privacy_concern', label: 'Preocupação com privacidade' },
  { code: 'other', label: 'Outro' },
] as const;

interface DeleteAccountFormProps {
  confirmationName: string;
}

export default function DeleteAccountForm({ confirmationName }: DeleteAccountFormProps) {
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [otherReason, setOtherReason] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [deleting, startDelete] = useTransition();
  const { showToast } = useToast();

  const otherSelected = selectedReasons.includes('other');
  const canDelete = confirmText.trim() === confirmationName;

  function toggleReason(code: string) {
    setSelectedReasons((current) =>
      current.includes(code)
        ? current.filter((item) => item !== code)
        : [...current, code],
    );
  }

  function handleDelete() {
    if (!canDelete) {
      showToast('error', 'Digite o nome da conta exatamente como indicado.');
      return;
    }

    const formData = new FormData();
    selectedReasons.forEach((reason) => formData.append('reasonCodes', reason));
    if (otherSelected) formData.set('otherReason', otherReason);

    startDelete(async () => {
      const result = await deleteAccount(formData);
      if (!result.ok) showToast('error', result.error);
    });
  }

  return (
    <main className="mx-auto max-w-lg px-4 pb-4">
      <header className="relative py-5 animate-fade-up delay-0">
        <Link
          href="/perfil"
          className="absolute left-0 top-5 flex h-9 w-9 items-center justify-center rounded-full text-[#1A1D23] transition-colors hover:bg-[#F1F3F7]"
          aria-label="Voltar para Perfil"
        >
          <ArrowLeft size={20} weight="bold" />
        </Link>
        <div className="flex flex-col items-center text-center">
          <div className="relative">
            <Mo variant="sad" size={116} className="animate-bounce-in" />
          </div>
          <p className="mt-3 text-xs font-bold uppercase tracking-[0.12em] text-[#C94F4F]">
            Excluir conta
          </p>
          <h1 className="mt-1 text-2xl font-heading text-[#1A1D23]">
            A Mo vai sentir sua falta
          </h1>
          <p className="mt-2 max-w-[360px] text-sm leading-relaxed text-[#6B7280]">
            Antes de ir, conte o que motivou sua saída. Isso é opcional e não será ligado aos seus dados pessoais.
          </p>
        </div>
      </header>

      <section className="themed-card rounded-[18px] border border-[#F1F3F7] bg-white p-5 animate-fade-up delay-1">
        <h2 className="text-sm font-bold text-[#1A1D23]">
          Por que você está deixando o Moneda?
        </h2>
        <div className="mt-4 space-y-2">
          {REASONS.map((reason) => {
            const checked = selectedReasons.includes(reason.code);
            return (
              <label
                key={reason.code}
                className="flex min-h-12 cursor-pointer items-center gap-3 rounded-[12px] border border-[#E5E7EB] bg-[#F8F9FB] px-3 py-2.5 transition-colors hover:border-[#D9DEE7] has-[:checked]:border-[#C94F4F] has-[:checked]:bg-[#FFF3F3]"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleReason(reason.code)}
                  disabled={deleting}
                  className="h-4 w-4 shrink-0 accent-[#C94F4F]"
                />
                <span className="text-sm font-medium text-[#1A1D23]">
                  {reason.label}
                </span>
                {checked && <Check size={16} weight="bold" className="ml-auto text-[#C94F4F]" />}
              </label>
            );
          })}
        </div>

        {otherSelected && (
          <label className="mt-4 block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.08em] text-[#9CA3AF]">
              Especifique o motivo
            </span>
            <textarea
              value={otherReason}
              onChange={(event) => setOtherReason(event.target.value.slice(0, 500))}
              disabled={deleting}
              maxLength={500}
              rows={4}
              className="themed-field w-full resize-none rounded-[12px] border border-[#E5E7EB] bg-[#F8F9FB] px-4 py-3 text-sm text-[#1A1D23] outline-none transition-colors placeholder:text-[#9CA3AF] focus:border-[#C94F4F] focus:bg-white"
              placeholder="Conte em poucas palavras..."
            />
            <span className="mt-1 block text-right text-xs text-[#9CA3AF]">
              {otherReason.length}/500
            </span>
          </label>
        )}
      </section>

      <section className="themed-card mt-4 rounded-[18px] border border-[#F2CACA] bg-white p-5 animate-fade-up delay-2 dark:border-[#7A3A3A]/55">
        <h2 className="text-sm font-bold text-[#1A1D23]">
          Confirmação final
        </h2>
        <p className="mt-2 text-xs leading-relaxed text-[#6B7280]">
          Esta ação remove permanentemente seus dados. Para confirmar, digite{' '}
          <strong className="font-bold text-[#1A1D23]">{confirmationName}</strong>.
        </p>
        <input
          type="text"
          value={confirmText}
          onChange={(event) => setConfirmText(event.target.value)}
          autoComplete="off"
          disabled={deleting}
          className="themed-field mt-3 w-full rounded-[12px] border border-[#E6B8B8] bg-[#FDF0F0] px-4 py-3 text-sm font-semibold text-[#1A1D23] outline-none transition-colors placeholder:text-[#A97979] focus:border-[#C94F4F] focus:bg-white dark:border-[#7A3A3A]/65 dark:bg-[#3A1C22] dark:text-[#F5F7FA] dark:placeholder:text-[#B98A8A] dark:focus:border-[#D86A6A] dark:focus:bg-[#20151A]"
          placeholder={confirmationName}
        />
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting || !canDelete}
            className="gesture-button-danger flex flex-1 items-center justify-center gap-2 rounded-[12px] bg-[#C94F4F] py-3 text-sm font-bold text-white transition-colors hover:bg-[#B94545] disabled:cursor-not-allowed disabled:opacity-40 dark:bg-[#A84E4E] dark:hover:bg-[#B95B5B]"
          >
            {deleting ? (
              <>
                <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Excluindo...
              </>
            ) : (
              <>
                <Trash size={16} weight="bold" />
                Excluir conta
              </>
            )}
          </button>
          <Link
            href="/perfil"
            aria-disabled={deleting}
            className="gesture-button inline-flex items-center justify-center gap-2 rounded-[12px] border border-[#E5E7EB] px-5 py-3 text-sm font-bold text-[#6B7280] transition-colors hover:bg-[#F8F9FB] aria-disabled:pointer-events-none aria-disabled:opacity-60"
          >
            <X size={16} weight="bold" />
            Cancelar
          </Link>
        </div>
      </section>
    </main>
  );
}
