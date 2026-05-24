'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { CaretLeft, Check } from '@phosphor-icons/react';
import { updateCurrency } from '../actions';
import { formatCurrency } from '@/lib/utils';

interface CurrencyFormProps {
  initialCurrency: string;
}

const OPTIONS: { code: string; label: string; flag: string }[] = [
  { code: 'BRL', label: 'Real Brasileiro', flag: '🇧🇷' },
  { code: 'USD', label: 'Dólar Americano', flag: '🇺🇸' },
  { code: 'EUR', label: 'Euro', flag: '🇪🇺' },
  { code: 'GBP', label: 'Libra Esterlina', flag: '🇬🇧' },
];

export default function CurrencyForm({ initialCurrency }: CurrencyFormProps) {
  const [selected, setSelected] = useState(initialCurrency);
  const [saving, startSaving] = useTransition();
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  function handleSave() {
    if (selected === initialCurrency) return;
    const fd = new FormData();
    fd.set('currency', selected);
    startSaving(async () => {
      const result = await updateCurrency(fd);
      if (result.ok) {
        setFeedback({ kind: 'success', text: result.message ?? 'Salvo.' });
      } else {
        setFeedback({ kind: 'error', text: result.error });
      }
    });
  }

  return (
    <div className="max-w-lg mx-auto px-4 pb-24">
      <header className="py-6">
        <Link
          href="/perfil"
          className="inline-flex items-center gap-1 text-sm text-[#6B7280] hover:text-[#1A1D23] transition-colors mb-3"
        >
          <CaretLeft size={14} weight="bold" />
          Voltar
        </Link>
        <h1 className="text-2xl font-heading text-[#1A1D23]">Moeda</h1>
        <p className="text-sm text-[#6B7280] mt-1">
          Escolha como os valores serão formatados.
        </p>
      </header>

      <div
        className="bg-white rounded-[16px] overflow-hidden divide-y divide-[#F1F2F4] mb-6"
        style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
      >
        {OPTIONS.map((opt) => (
          <button
            key={opt.code}
            type="button"
            onClick={() => setSelected(opt.code)}
            disabled={saving}
            className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-[#F8F9FB] transition-colors disabled:opacity-60"
            aria-pressed={selected === opt.code}
          >
            <span className="text-2xl shrink-0" aria-hidden>
              {opt.flag}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#1A1D23]">{opt.label}</p>
              <p className="text-xs text-[#6B7280]">
                {opt.code} · ex: {formatCurrency(123456, opt.code)}
              </p>
            </div>
            {selected === opt.code && (
              <span className="w-6 h-6 rounded-full bg-[#5BBF8E] text-white flex items-center justify-center shrink-0">
                <Check size={14} weight="bold" />
              </span>
            )}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={saving || selected === initialCurrency}
        className="w-full py-3 rounded-[12px] text-sm font-semibold text-white bg-[#5BBF8E] hover:bg-[#4AA77C] active:bg-[#3FA876] transition-colors duration-150 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ boxShadow: '0 4px 14px rgba(91, 191, 142, 0.3)' }}
      >
        {saving ? 'Salvando…' : 'Salvar'}
      </button>

      <p className="text-xs text-[#9CA3AF] mt-4 text-center">
        A formatação de novos valores usará a moeda escolhida. Telas existentes podem precisar de reload.
      </p>

      {feedback && (
        <div
          role={feedback.kind === 'error' ? 'alert' : 'status'}
          className={`fixed bottom-20 left-4 right-4 z-50 rounded-[16px] px-5 py-4 shadow-lg ${
            feedback.kind === 'success'
              ? 'bg-[#EEF9F4] text-[#2E7D5B] border border-[#D1EBDD]'
              : 'bg-[#FDF0F0] text-[#B14C4C] border border-[#F4D7D7]'
          }`}
        >
          <p className="font-medium text-sm">{feedback.text}</p>
        </div>
      )}
    </div>
  );
}
