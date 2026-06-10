'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { ArrowLeft, Check, Envelope, Eye, EyeSlash, LockKey } from '@phosphor-icons/react';
import { useToast } from '@/components/ToastProvider';
import { PASSWORD_REQUIREMENTS_LABEL, isStrongPassword } from '@/lib/password';
import { sendPasswordReset, setInitialPassword } from '../actions';

interface PasswordFormProps {
  email: string;
  hasPassword: boolean;
  isRecovery: boolean;
}

export default function PasswordForm({ email, hasPassword, isRecovery }: PasswordFormProps) {
  const [passwordEnabled, setPasswordEnabled] = useState(hasPassword);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [saving, startSaving] = useTransition();
  const [sendingReset, startSendingReset] = useTransition();
  const { showToast } = useToast();
  const passwordIsStrong = isStrongPassword(newPassword);

  const canSave =
    passwordIsStrong &&
    newPassword === confirmPassword &&
    (!passwordEnabled || isRecovery);

  function handleSave() {
    if (!canSave) return;
    const formData = new FormData();
    formData.set('password', newPassword);

    startSaving(async () => {
      const result = await setInitialPassword(formData);
      if (result.ok) {
        showToast('success', result.message ?? 'Senha atualizada.');
        setPasswordEnabled(true);
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
      <header className="flex items-center gap-3 py-5 animate-fade-up delay-0">
        <Link
          href="/perfil"
          className="flex h-9 w-9 items-center justify-center rounded-full text-[#1A1D23] transition-colors hover:bg-[#F1F3F7]"
          aria-label="Voltar para Perfil"
        >
          <ArrowLeft size={20} weight="bold" />
        </Link>
        <div>
          <h1 className="text-xl font-heading text-[#1A1D23]">Senha</h1>
          <p className="text-xs text-[#6B7280] mt-0.5">
            {passwordEnabled
              ? isRecovery
                ? 'Crie uma nova senha para concluir a redefinição.'
                : 'Altere sua senha pelo link seguro enviado para seu email.'
              : 'Crie uma senha para entrar também com email.'}
          </p>
        </div>
      </header>

      {passwordEnabled && !isRecovery ? (
        <section className="themed-card rounded-[20px] border border-[#F1F3F7] bg-white p-5 animate-fade-up delay-1">
          <div className="mb-4 flex items-start gap-3 rounded-[14px] bg-[#F8F9FB] p-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EBF3FE] text-[#3B82F6]">
              <Envelope size={18} weight="bold" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-[#1A1D23]">Alterar senha</p>
              <p className="mt-0.5 text-xs leading-relaxed text-[#6B7280]">
                Enviaremos um link de redefinição para {email || 'seu email'}. Verifique sua caixa de entrada ou spam.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSendReset}
            disabled={sendingReset}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-[#5BBF8E] py-4 text-sm font-bold text-white transition-colors duration-150 hover:bg-[#4AA77C] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            style={{ boxShadow: '0 6px 20px rgba(91, 191, 142, 0.35)' }}
          >
            {sendingReset ? (
              <>
                <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Envelope size={16} weight="bold" />
                Enviar link por email
              </>
            )}
          </button>
        </section>
      ) : (
        <section className="themed-card rounded-[20px] border border-[#F1F3F7] bg-white p-5 animate-fade-up delay-1">
          <div className="mb-4 flex items-start gap-3 rounded-[14px] bg-[#F8F9FB] p-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EEF9F4] text-[#5BBF8E]">
              <LockKey size={18} weight="bold" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-[#1A1D23]">
                {passwordEnabled ? 'Alterar senha' : 'Definir senha'}
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-[#6B7280]">
                {passwordEnabled
                  ? isRecovery
                    ? 'Você entrou pelo link de recuperação. Escolha uma nova senha.'
                    : 'Use o link de redefinição para escolher uma nova senha.'
                  : 'Seu login atual não tem senha cadastrada. Isso adiciona o login por email.'}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <PasswordField
              label="Nova senha"
              value={newPassword}
              onChange={setNewPassword}
              autoComplete="new-password"
              visible={showNewPassword}
              onToggleVisibility={() => setShowNewPassword((show) => !show)}
            />
            <PasswordField
              label="Confirmar nova senha"
              value={confirmPassword}
              onChange={setConfirmPassword}
              autoComplete="new-password"
              visible={showConfirmPassword}
              onToggleVisibility={() => setShowConfirmPassword((show) => !show)}
            />
          </div>

          <p className={`mt-2 text-xs font-medium ${newPassword.length > 0 && !passwordIsStrong ? 'text-[#B14C4C]' : 'text-[#6B7280]'}`}>
            {PASSWORD_REQUIREMENTS_LABEL}
          </p>
          {confirmPassword.length > 0 && newPassword !== confirmPassword && (
            <p className="mt-2 text-xs font-medium text-[#B14C4C]">
              As senhas não conferem.
            </p>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !canSave}
            className="gesture-button-primary mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-[#5BBF8E] py-4 text-sm font-bold text-white transition-colors duration-150 hover:bg-[#4AA77C] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
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
                {passwordEnabled ? 'Atualizar senha' : 'Salvar senha'}
              </>
            )}
          </button>
        </section>
      )}

      {passwordEnabled && isRecovery && (
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
  visible,
  onToggleVisibility,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  visible: boolean;
  onToggleVisibility: () => void;
}) {
  const inputId = `password-${autoComplete}-${label.replace(/\s+/g, '-').toLowerCase()}`;

  return (
    <div className="block">
      <label htmlFor={inputId} className="mb-1.5 block text-xs font-bold uppercase tracking-[0.06em] text-[#6B7280]">
        {label}
      </label>
      <span className="relative block">
        <input
          id={inputId}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          className="themed-field w-full rounded-[12px] border border-[#E5E7EB] bg-[#F8F9FB] px-4 py-3 pr-11 text-sm text-[#1A1D23] outline-none transition-colors placeholder:text-[#9CA3AF] focus:border-[#A8C5E0] focus:bg-white"
        />
        <button
          type="button"
          onClick={onToggleVisibility}
          className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-[#6B7280] transition-colors hover:bg-[#EEF2F7] hover:text-[#1A1D23] dark:text-[#CBD5E1] dark:hover:bg-white/10 dark:hover:text-[#F5F7FA]"
          aria-label={visible ? `Ocultar ${label.toLowerCase()}` : `Mostrar ${label.toLowerCase()}`}
        >
          {visible ? <EyeSlash size={17} weight="bold" /> : <Eye size={17} weight="bold" />}
        </button>
      </span>
    </div>
  );
}
