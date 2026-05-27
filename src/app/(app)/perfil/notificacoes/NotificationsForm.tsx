'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { CaretLeft } from '@phosphor-icons/react';
import Toast from '@/components/Toast';
import { updateNotificationPrefs } from '../actions';
import type { NotificationPrefs } from '../notification-prefs';

interface NotificationsFormProps {
  initial: NotificationPrefs;
}

const ITEMS: { key: keyof NotificationPrefs; label: string; description: string }[] = [
  {
    key: 'email_summary_weekly',
    label: 'Resumo semanal por email',
    description: 'Receba aos domingos um resumo dos seus gastos da semana.',
  },
  {
    key: 'email_budget_alert',
    label: 'Alerta de orçamento por email',
    description: 'Avise quando seus gastos passarem do orçamento do mês.',
  },
  {
    key: 'push_budget_alert',
    label: 'Push de orçamento (em breve)',
    description: 'Notificação no navegador quando o orçamento estourar.',
  },
];

export default function NotificationsForm({ initial }: NotificationsFormProps) {
  const [prefs, setPrefs] = useState<NotificationPrefs>(initial);
  const [saving, startSaving] = useTransition();
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  function toggle(key: keyof NotificationPrefs) {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function handleSave() {
    const fd = new FormData();
    for (const item of ITEMS) {
      if (prefs[item.key]) fd.set(item.key, 'on');
    }
    startSaving(async () => {
      const result = await updateNotificationPrefs(fd);
      setFeedback(
        result.ok
          ? { kind: 'success', text: result.message ?? 'Salvo.' }
          : { kind: 'error', text: result.error },
      );
    });
  }

  const dirty =
    prefs.email_summary_weekly !== initial.email_summary_weekly ||
    prefs.email_budget_alert !== initial.email_budget_alert ||
    prefs.push_budget_alert !== initial.push_budget_alert;

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
        <h1 className="text-2xl font-heading text-[#1A1D23]">Notificações</h1>
        <p className="text-sm text-[#6B7280] mt-1">
          Escolha o que você quer receber.
        </p>
      </header>

      <div
        className="themed-card bg-white rounded-[16px] overflow-hidden divide-y divide-[#F1F2F4] mb-6"
      >
        {ITEMS.map((item) => {
          const checked = prefs[item.key];
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => toggle(item.key)}
              disabled={saving}
              className="w-full flex items-start gap-3 px-5 py-4 text-left hover:bg-[#F8F9FB] transition-colors disabled:opacity-60"
              role="switch"
              aria-checked={checked}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#1A1D23]">{item.label}</p>
                <p className="text-xs text-[#6B7280] mt-0.5">{item.description}</p>
              </div>
              <span
                className={`relative inline-flex shrink-0 w-10 h-6 rounded-full transition-colors ${
                  checked ? 'bg-[#5BBF8E]' : 'bg-[#E5E7EB]'
                }`}
                aria-hidden
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    checked ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={saving || !dirty}
        className="w-full py-3 rounded-[12px] text-sm font-semibold text-white bg-[#5BBF8E] hover:bg-[#4AA77C] active:bg-[#3FA876] transition-colors duration-150 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ boxShadow: '0 4px 14px rgba(91, 191, 142, 0.3)' }}
      >
        {saving ? 'Salvando…' : 'Salvar'}
      </button>

      <p className="text-xs text-[#9CA3AF] mt-4 text-center">
        O envio de emails depende de SMTP configurado no Supabase. Push notifications ainda não estão habilitadas.
      </p>

      {feedback && (
        <Toast
          kind={feedback.kind}
          text={feedback.text}
          onClose={() => setFeedback(null)}
        />
      )}
    </div>
  );
}
