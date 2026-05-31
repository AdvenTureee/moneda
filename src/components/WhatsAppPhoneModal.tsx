'use client';

import { useEffect, useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { WhatsappLogo, X } from '@phosphor-icons/react';
import { updateWhatsappPhone } from '@/app/(app)/perfil/actions';
import { formatWhatsappPhone, normalizeWhatsappPhone } from '@/lib/phone';
import { useToast } from '@/components/ToastProvider';

interface WhatsAppPhoneModalProps {
  isOpen: boolean;
  onSaved: () => void;
  onLater: () => void;
}

export default function WhatsAppPhoneModal({
  isOpen,
  onSaved,
  onLater,
}: WhatsAppPhoneModalProps) {
  const [mounted, setMounted] = useState(false);
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();
  const { showToast } = useToast();

  useEffect(() => setMounted(true), []);

  const normalizedPhone = normalizeWhatsappPhone(phone);
  const hasInvalidPhone = phone.trim().length > 0 && !normalizedPhone;

  function save() {
    if (!normalizedPhone || pending) return;
    setError('');
    startTransition(async () => {
      const result = await updateWhatsappPhone(normalizedPhone);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      showToast('success', result.message ?? 'Telefone atualizado.');
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
        aria-labelledby="whatsapp-phone-title"
      >
        <div className="flex items-start justify-between gap-3 px-5 pt-5">
          <div className="flex min-w-0 gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#EEF9F4] text-[#2E8F67]">
              <WhatsappLogo size={23} weight="fill" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#6B7280]">
                WhatsApp
              </p>
              <h2 id="whatsapp-phone-title" className="mt-1 text-xl font-heading text-[#1A1D23]">
                Identifique seu telefone
              </h2>
            </div>
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
            Esse passo é opcional. Usamos o número apenas para reconhecer suas mensagens e lançar gastos na conta certa. Sem essa identificação, os gastos enviados pelo WhatsApp não poderão ser registrados.
          </p>

          <div className="mt-4 flex items-center gap-2 rounded-[14px] border-2 border-[#E5E7EB] px-4 py-4 transition-colors focus-within:border-[#5BBF8E]">
            <WhatsappLogo size={20} weight="fill" className="shrink-0 text-[#2E8F67]" />
            <input
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(event) => {
                setPhone(event.target.value);
                if (error) setError('');
              }}
              placeholder="(11) 99999-9999"
              className="min-w-0 flex-1 bg-transparent text-lg font-semibold text-[#1A1D23] outline-none placeholder:text-[#9CA3AF]"
              aria-label="Telefone do WhatsApp"
              autoFocus
            />
          </div>

          {hasInvalidPhone && (
            <p className="mt-2 text-sm font-medium text-[#B14C4C]" role="alert">
              Informe um telefone válido com DDD.
            </p>
          )}
          {normalizedPhone && (
            <p className="mt-2 text-sm font-medium text-[#2E8F67]">
              Vamos salvar como {formatWhatsappPhone(normalizedPhone)}.
            </p>
          )}
          <p className="mt-3 rounded-[12px] bg-[#FFF7E8] px-3 py-2 text-xs leading-relaxed text-[#8A5A12]">
            O lançamento pelo WhatsApp ainda não está ativo. Quando o WhatsApp Business estiver pronto, o código de confirmação será enviado pelo número do Moneda.
          </p>
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
              Agora não
            </button>
            <button
              type="button"
              onClick={save}
              disabled={!normalizedPhone || pending || hasInvalidPhone}
              className="flex-1 rounded-full bg-[#5BBF8E] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#4AA77C] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {pending ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
