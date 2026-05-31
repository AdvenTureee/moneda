'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { ArrowLeft, Check, Envelope, LockKey } from '@phosphor-icons/react';
import { useToast } from '@/components/ToastProvider';
import { sendPasswordReset, setInitialPassword } from '../actions';

interface PasswordFormProps {
  email: string;
  hasEmailIdentity: boolean;
  isRecovery: boolean;
}

export default function PasswordForm({ email, hasEmailIdentity, isRecovery }: PasswordFormProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, startSaving] = useTransition();
  const [sendingReset, startSendingReset] = useTransition();
  const { showToast } = useToast();

  const canSave =
    newPassword.length >= 8 &&
    newPassword === confirmPassword &&
    (!hasEmailIdentity || isRecovery || currentPassword.length > 0);

  function handleSave() {
    if (!canSave) return;
    const formData = new FormData();
    formData.set('password', newPassword);
    if (currentPassword) formData.set('currentPassword', currentPassword);

    startSaving(async () => {
      const result = await setInitialPassword(formData);
      if (result.ok) {
        showToast('success', result.message ?? 'Senha atualizada.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        showToast('error', result.error);
      }
    });
  }

  function handleSendReset() {
    startSendingReset(async () => {
      const result = await sendPasswordReset();
      if (result.ok) showToast('success', result.message ?? 'Email enviado.');
      else showToast('error', result.error);
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
        <h1 className="text-2xl font-heading text-[#1A1D23]">Senha</h1>
        <p className="text-sm text-[#6B7280] mt-1">
          {hasEmailIdentity
            ? isRecovery
              ? 'Crie uma nova senha para concluir a redefinição.'
              : 'Altere sua senha ou envie um link de redefinição para seu email.'
            : 'Crie uma senha para entrar também com email.'}
        </p>
      </header>

      <section className="themed-card rounded-[20px] border border-[#F1F3F7] bg-white p-5 animate-fade-up delay-1">
        <div className="mb-4 flex items-start gap-3 rounded-[14px] bg-[#F8F9FB] p-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EEF9F4] text-[#5BBF8E]">
            <LockKey size={18} weight="bold" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-[#1A1D23]">
              {hasEmailIdentity ? 'Alterar senha' : 'Definir senha'}
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-[#6B7280]">
              {hasEmailIdentity
                ? isRecovery
                  ? 'Você entrou pelo link de recuperação. Escolha uma nova senha.'
                  : 'Por segurança, informe a senha atual antes de criar uma nova.'
                : 'Seu login atual não tem senha cadastrada. Isso adiciona o login por email.'}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {hasEmailIdentity && !isRecovery && (
            <PasswordField
              label="Senha atual"
              value={currentPassword}
              onChange={setCurrentPassword}
              autoComplete="current-password"
            />
          )}
          <PasswordField
            label="Nova senha"
            value={newPassword}
            onChange={setNewPassword}
            autoComplete="new-password"
          />
          <PasswordField
            label="Confirmar nova senha"
            value={confirmPassword}
            onChange={setConfirmPassword}
            autoComplete="new-password"
          />
        </div>

        {newPassword.length > 0 && newPassword.length < 8 && (
          <p className="mt-2 text-xs font-medium text-[#B14C4C]">
            A senha precisa ter pelo menos 8 caracteres.
          </p>
        )}
        {confirmPassword.length > 0 && newPassword !== confirmPassword && (
          <p className="mt-2 text-xs font-medium text-[#B14C4C]">
            As senhas não conferem.
          </p>
        )}

        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !canSave}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-[#5BBF8E] py-4 text-sm font-bold text-white transition-colors duration-150 hover:bg-[#4AA77C] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
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
              {hasEmailIdentity ? 'Atualizar senha' : 'Salvar senha'}
            </>
          )}
        </button>
      </section>

      {hasEmailIdentity && (
        <section className="themed-card mt-4 rounded-[18px] bg-white p-4 animate-fade-up delay-2">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EBF3FE] text-[#3B82F6]">
              <Envelope size={18} weight="bold" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-[#1A1D23]">Esqueceu a senha?</p>
              <p className="mt-0.5 text-xs leading-relaxed text-[#6B7280]">
                Envie um link de redefinição para {email || 'seu email'}.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSendReset}
            disabled={sendingReset}
            className="mt-3 w-full rounded-[12px] border border-[#E5E7EB] bg-white py-3 text-sm font-bold text-[#6B7280] transition-colors hover:bg-[#F8F9FB] disabled:opacity-50"
          >
            {sendingReset ? 'Enviando...' : 'Enviar link por email'}
          </button>
        </section>
      )}
    </div>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.06em] text-[#6B7280]">
        {label}
      </span>
      <input
        type="password"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        className="themed-field w-full rounded-[12px] border border-[#E5E7EB] bg-[#F8F9FB] px-4 py-3 text-sm text-[#1A1D23] outline-none transition-colors placeholder:text-[#9CA3AF] focus:border-[#A8C5E0] focus:bg-white"
      />
    </label>
  );
}
