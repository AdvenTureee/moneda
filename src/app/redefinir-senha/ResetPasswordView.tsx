'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, Eye, EyeSlash, LockKey, WarningCircle } from '@phosphor-icons/react';
import { setInitialPassword } from '@/app/(app)/perfil/actions';
import { createClient } from '@/lib/supabase/client';
import { PASSWORD_REQUIREMENTS_LABEL, isStrongPassword } from '@/lib/password';

type LinkState = 'checking' | 'ready' | 'error';

export default function ResetPasswordView() {
  const router = useRouter();
  const [linkState, setLinkState] = useState<LinkState>('checking');
  const [message, setMessage] = useState('Validando link...');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [saving, startSaving] = useTransition();
  const passwordIsStrong = isStrongPassword(newPassword);
  const canSave = linkState === 'ready' && passwordIsStrong && newPassword === confirmPassword;

  useEffect(() => {
    let active = true;

    async function prepareRecoverySession() {
      const supabase = createClient();
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!active) return;
        window.history.replaceState({}, '', '/redefinir-senha');
        if (error) {
          console.error('[passwordRecovery:exchange]', error);
          setLinkState('error');
          setMessage('Link inválido ou expirado. Solicite um novo email de redefinição.');
          return;
        }
      }

      const { data, error } = await supabase.auth.getSession();
      if (!active) return;
      if (error || !data.session) {
        setLinkState('error');
        setMessage('Sessão de redefinição não encontrada. Solicite um novo link.');
        return;
      }

      setLinkState('ready');
      setMessage('Escolha uma nova senha para continuar.');
    }

    prepareRecoverySession();
    return () => {
      active = false;
    };
  }, []);

  function handleSave() {
    if (!canSave) return;
    const formData = new FormData();
    formData.set('password', newPassword);

    startSaving(async () => {
      const result = await setInitialPassword(formData);
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      setMessage(result.message ?? 'Senha atualizada.');
      setNewPassword('');
      setConfirmPassword('');
      router.push('/app');
      router.refresh();
    });
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-8">
      <section className="w-full max-w-md rounded-[20px] border border-[#E5E7EB] bg-white p-6 shadow-[0_2px_16px_rgba(0,0,0,0.07)]">
        <div className="mb-5 flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#EEF9F4] text-[#5BBF8E]">
            <LockKey size={22} weight="bold" />
          </span>
          <div>
            <h1 className="text-xl font-heading text-[#1A1D23]">Redefinir senha</h1>
            <p className="mt-1 text-sm leading-relaxed text-[#6B7280]">{message}</p>
          </div>
        </div>

        {linkState === 'error' ? (
          <div className="rounded-[14px] border border-[#F2CACA] bg-[#FDF0F0] p-4 text-sm text-[#8F3D3D]">
            <div className="flex items-start gap-2">
              <WarningCircle size={18} weight="bold" className="mt-0.5 shrink-0" />
              <p>Volte para o login e envie um novo link para seu email.</p>
            </div>
            <Link
              href="/login"
              className="mt-4 flex w-full items-center justify-center rounded-full bg-[#5BBF8E] py-3 text-sm font-bold text-white transition-colors hover:bg-[#4AA77C]"
            >
              Ir para login
            </Link>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              <PasswordField
                label="Nova senha"
                value={newPassword}
                onChange={setNewPassword}
                visible={showNewPassword}
                onToggleVisibility={() => setShowNewPassword((show) => !show)}
              />
              <PasswordField
                label="Confirmar nova senha"
                value={confirmPassword}
                onChange={setConfirmPassword}
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
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-[#5BBF8E] py-4 text-sm font-bold text-white transition-colors duration-150 hover:bg-[#4AA77C] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
              style={{ boxShadow: '0 6px 20px rgba(91, 191, 142, 0.35)' }}
            >
              {saving || linkState === 'checking' ? (
                <>
                  <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  {linkState === 'checking' ? 'Validando...' : 'Salvando...'}
                </>
              ) : (
                <>
                  <Check size={16} weight="bold" />
                  Atualizar senha
                </>
              )}
            </button>
          </>
        )}
      </section>
    </main>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  visible,
  onToggleVisibility,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  visible: boolean;
  onToggleVisibility: () => void;
}) {
  const inputId = `reset-${label.replace(/\s+/g, '-').toLowerCase()}`;

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
          autoComplete="new-password"
          disabled={false}
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
