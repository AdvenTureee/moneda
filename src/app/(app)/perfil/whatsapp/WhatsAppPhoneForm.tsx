'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { ArrowLeft, Check, Info, Trash, WhatsappLogo } from '@phosphor-icons/react';
import { useToast } from '@/components/ToastProvider';
import { formatWhatsappPhone, normalizeWhatsappPhone } from '@/lib/phone';
import { formatDate } from '@/lib/utils';
import { updateWhatsappPhone } from '../actions';

interface WhatsAppPhoneFormProps {
  initialPhone: string | null;
  updatedAt: string | null;
}

export default function WhatsAppPhoneForm({
  initialPhone,
  updatedAt,
}: WhatsAppPhoneFormProps) {
  const [phone, setPhone] = useState(formatWhatsappPhone(initialPhone));
  const [savedPhone, setSavedPhone] = useState(normalizeWhatsappPhone(initialPhone));
  const [saving, startSaving] = useTransition();
  const { showToast } = useToast();

  const normalizedPhone = normalizeWhatsappPhone(phone);
  const hasInvalidPhone = phone.trim().length > 0 && !normalizedPhone;
  const hasChanges = normalizedPhone !== savedPhone || (!phone.trim() && savedPhone !== null);

  function handleSave() {
    if (saving || hasInvalidPhone || !hasChanges) return;
    startSaving(async () => {
      const result = await updateWhatsappPhone(phone);
      if (result.ok) {
        const nextPhone = normalizeWhatsappPhone(phone);
        setSavedPhone(nextPhone);
        setPhone(formatWhatsappPhone(nextPhone));
        showToast('success', result.message ?? 'Telefone atualizado.');
      } else {
        showToast('error', result.error);
      }
    });
  }

  function handleClear() {
    if (saving) return;
    setPhone('');
    startSaving(async () => {
      const result = await updateWhatsappPhone(null);
      if (result.ok) {
        setSavedPhone(null);
        showToast('success', result.message ?? 'Telefone removido.');
      } else {
        showToast('error', result.error);
      }
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
          <h1 className="text-xl font-heading text-[#1A1D23]">WhatsApp</h1>
          <p className="text-xs text-[#6B7280] mt-0.5">
            Vincule seu telefone para lançar gastos por mensagem.
          </p>
        </div>
      </header>

      <section className="ai-insight-banner rounded-[20px] p-5 mb-5 text-white shadow-md animate-fade-up delay-1">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/18">
            <WhatsappLogo size={23} weight="fill" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider opacity-85">
              Telefone atual
            </p>
            <p className="mt-0.5 truncate text-2xl font-extrabold tabular-nums">
              {savedPhone ? formatWhatsappPhone(savedPhone) : 'Não informado'}
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
          Telefone com DDD
        </label>
        <div className="flex items-center gap-2 rounded-[14px] border-2 border-[#E5E7EB] px-4 py-4 transition-colors focus-within:border-[#5BBF8E]">
          <WhatsappLogo size={20} weight="fill" className="shrink-0 text-[#2E8F67]" />
          <input
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="(11) 99999-9999"
            className="min-w-0 flex-1 bg-transparent text-lg font-semibold text-[#1A1D23] outline-none placeholder:text-[#9CA3AF]"
            aria-label="Telefone do WhatsApp"
          />
        </div>

        {hasInvalidPhone && (
          <p className="mt-2 text-sm font-medium text-[#B14C4C]">
            Informe um telefone válido com DDD.
          </p>
        )}
        {normalizedPhone && (
          <p className="mt-2 text-sm font-medium text-[#2E8F67]">
            Vamos salvar como {formatWhatsappPhone(normalizedPhone)}.
          </p>
        )}

        <div className="mt-4 flex items-start gap-2 rounded-[14px] bg-[#F8F9FB] p-3">
          <Info size={17} weight="bold" className="mt-0.5 shrink-0 text-[#7AAECF]" />
          <p className="text-xs leading-relaxed text-[#6B7280]">
            O telefone é opcional. O lançamento pelo WhatsApp ainda não está ativo; quando o WhatsApp Business estiver pronto, o código de confirmação será enviado pelo número do Moneda.
          </p>
        </div>
      </section>

      <div className="mt-5 grid grid-cols-[1fr_auto] gap-2 animate-fade-up delay-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || hasInvalidPhone || !hasChanges}
          className="flex items-center justify-center gap-2 rounded-full bg-[#5BBF8E] py-4 text-sm font-bold text-white transition-colors duration-150 hover:bg-[#4AA77C] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
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
              Salvar telefone
            </>
          )}
        </button>
        <button
          type="button"
          onClick={handleClear}
          disabled={saving || !savedPhone}
          className="flex h-12 w-12 items-center justify-center rounded-full border border-[#E5E7EB] text-[#B14C4C] transition-colors hover:bg-[#FDF0F0] disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Remover telefone"
        >
          <Trash size={17} weight="bold" />
        </button>
      </div>
    </div>
  );
}
