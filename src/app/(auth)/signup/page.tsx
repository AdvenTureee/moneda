'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeSlash } from '@phosphor-icons/react';
import TermsModal from '@/components/TermsModal';
import { TERMS_VERSION } from '@/lib/legal';
import { PASSWORD_REQUIREMENTS_LABEL, isStrongPassword } from '@/lib/password';
import { createClient } from '@/lib/supabase/client';
import { isValidEmail } from '@/lib/utils';
import { useAuthMascot } from '../AuthMascotContext';

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
    </svg>
  );
}

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsModalOpen, setTermsModalOpen] = useState(false);
  const [passwordFocusCount, setPasswordFocusCount] = useState(0);
  const { setEyesClosed } = useAuthMascot();
  const passwordIsStrong = isStrongPassword(password);

  function handlePasswordFocus() {
    setPasswordFocusCount((count) => count + 1);
  }

  function handlePasswordBlur() {
    setPasswordFocusCount((count) => Math.max(0, count - 1));
  }

  useEffect(() => {
    setEyesClosed(passwordFocusCount > 0);
    return () => setEyesClosed(false);
  }, [passwordFocusCount, setEyesClosed]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!isValidEmail(email)) {
      setError('Informe um email válido.');
      return;
    }

    if (!passwordIsStrong) {
      setError(PASSWORD_REQUIREMENTS_LABEL);
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não conferem.');
      return;
    }

    if (!termsAccepted) {
      setError('Para criar sua conta, aceite os Termos de Uso e a Política de Proteção de Dados.');
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const acceptedAt = new Date().toISOString();

    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          terms_accepted: true,
          terms_version: TERMS_VERSION,
          terms_accepted_at: acceptedAt,
          privacy_accepted: true,
          privacy_accepted_at: acceptedAt,
        },
      },
    });

    if (authError) {
      console.error('[signup]', authError);
      setError(authError.message);
      setLoading(false);
      return;
    }

    if (!data.session) {
      setSuccess(true);
      setLoading(false);
      return;
    }

    await fetch('/api/pii/sync-profile', { method: 'POST' }).catch(() => null);
    router.push('/');
    router.refresh();
  }

  async function handleGoogleSignup() {
    setError('');
    if (!termsAccepted) {
      setError('Para criar sua conta com Google, aceite os Termos de Uso e a Política de Proteção de Dados.');
      return;
    }
    setGoogleLoading(true);
    const supabase = createClient();
    const callbackUrl = new URL('/auth/callback', window.location.origin);
    callbackUrl.searchParams.set('terms_accepted', '1');
    callbackUrl.searchParams.set('terms_version', TERMS_VERSION);
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: callbackUrl.toString() },
    });
    if (authError) {
      console.error('[signup:google]', authError);
      setError('Erro ao entrar com Google. Tente novamente.');
      setGoogleLoading(false);
    }
  }

  return (
    <div
      className="bg-white rounded-[20px] p-6"
      style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.07)' }}
    >
      {success ? (
        <div className="text-center py-4">
          <div className="w-14 h-14 rounded-full bg-[#EEF9F4] text-[#5BBF8E] flex items-center justify-center mx-auto mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h1 className="text-xl font-heading text-[#1A1D23] mb-2">Verifique seu email</h1>
          <p className="text-sm text-[#6B7280] leading-relaxed">
            Enviamos um link de confirmação para{' '}
            <span className="font-semibold text-[#1A1D23]">{email}</span>.
            Clique no link para ativar sua conta.
          </p>
          <p className="text-sm text-[#9CA3AF] mt-3">
            Não recebeu? Verifique a pasta de spam.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-block w-full py-3 rounded-[12px] text-sm font-semibold text-white text-center bg-[#5BBF8E] hover:bg-[#4AA77C] active:bg-[#3FA876] transition-colors duration-150"
            style={{ boxShadow: '0 4px 14px rgba(91, 191, 142, 0.3)' }}
          >
            Ir para o login
          </Link>
        </div>
      ) : (
        <>
          <h1 className="text-xl font-heading text-[#1A1D23] mb-1">Criar conta</h1>
          <p className="text-sm text-[#6B7280] mb-4">Comece a controlar seu dinheiro hoje.</p>

          <button
            type="button"
            onClick={handleGoogleSignup}
            disabled={googleLoading || loading}
            className="w-full flex items-center justify-center gap-2.5 py-2.5 rounded-[12px] border border-[#E5E7EB] bg-white text-sm font-medium text-[#1A1D23] hover:bg-[#F8F9FB] transition-colors disabled:opacity-60 mb-4"
          >
            <GoogleIcon />
            {googleLoading ? 'Redirecionando…' : 'Criar conta com Google'}
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-[#E5E7EB]" />
            <span className="text-xs text-[#9CA3AF]">ou</span>
            <div className="flex-1 h-px bg-[#E5E7EB]" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div className="grid gap-3.5 sm:grid-cols-2">
              <div>
              <label htmlFor="name" className="block text-xs font-medium text-[#6B7280] mb-1.5">
                Nome
              </label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome"
                className="w-full px-3.5 py-2.5 rounded-[10px] bg-[#F8F9FB] border border-[#E5E7EB] text-sm text-[#1A1D23] placeholder:text-[#9CA3AF] outline-none focus:border-[#A8C5E0] transition-colors"
              />
              </div>

              <div>
              <label htmlFor="email" className="block text-xs font-medium text-[#6B7280] mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="w-full px-3.5 py-2.5 rounded-[10px] bg-[#F8F9FB] border border-[#E5E7EB] text-sm text-[#1A1D23] placeholder:text-[#9CA3AF] outline-none focus:border-[#A8C5E0] transition-colors"
              />
              </div>
            </div>

            <div className="grid gap-3.5 sm:grid-cols-2">
              <div>
                <label htmlFor="password" className="block text-xs font-medium text-[#6B7280] mb-1.5">
                  Senha
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={handlePasswordFocus}
                    onBlur={handlePasswordBlur}
                    placeholder="Mín. 8 caracteres"
                    className="w-full px-3.5 py-2.5 pr-10 rounded-[10px] bg-[#F8F9FB] border border-[#E5E7EB] text-sm text-[#1A1D23] placeholder:text-[#9CA3AF] outline-none focus:border-[#A8C5E0] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((show) => !show)}
                    className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-[#6B7280] transition-colors hover:bg-[#EEF2F7] hover:text-[#1A1D23] dark:text-[#CBD5E1] dark:hover:bg-white/10 dark:hover:text-[#F5F7FA]"
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showPassword ? <EyeSlash size={17} weight="bold" /> : <Eye size={17} weight="bold" />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-xs font-medium text-[#6B7280] mb-1.5">
                  Confirmar senha
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onFocus={handlePasswordFocus}
                    onBlur={handlePasswordBlur}
                    placeholder="Repita a senha"
                    className="w-full px-3.5 py-2.5 pr-10 rounded-[10px] bg-[#F8F9FB] border border-[#E5E7EB] text-sm text-[#1A1D23] placeholder:text-[#9CA3AF] outline-none focus:border-[#A8C5E0] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((show) => !show)}
                    className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-[#6B7280] transition-colors hover:bg-[#EEF2F7] hover:text-[#1A1D23] dark:text-[#CBD5E1] dark:hover:bg-white/10 dark:hover:text-[#F5F7FA]"
                    aria-label={showConfirmPassword ? 'Ocultar confirmação de senha' : 'Mostrar confirmação de senha'}
                  >
                    {showConfirmPassword ? <EyeSlash size={17} weight="bold" /> : <Eye size={17} weight="bold" />}
                  </button>
                </div>
              </div>
            </div>

            <p className={`text-xs font-medium ${password.length > 0 && !passwordIsStrong ? 'text-[#E07070]' : 'text-[#6B7280]'}`}>
              {PASSWORD_REQUIREMENTS_LABEL}
            </p>

            {error && (
              <p className="text-xs font-medium text-[#E07070]" role="alert">
                {error}
              </p>
            )}

            <label className="flex items-start gap-2.5 rounded-[12px] border border-[#E5E7EB] bg-[#F8F9FB] p-3">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-[#5BBF8E]"
              />
              <span className="text-xs leading-relaxed text-[#6B7280]">
                Li e aceito os{' '}
                <button
                  type="button"
                  onClick={() => setTermsModalOpen(true)}
                  className="font-semibold text-[#5BBF8E] underline-offset-2 hover:underline"
                >
                  Termos de Uso e a Política de Proteção de Dados
                </button>
                .
              </span>
            </label>

            <button
              type="submit"
              disabled={loading || googleLoading || !passwordIsStrong}
              className="w-full py-3 rounded-[12px] text-sm font-semibold text-white bg-[#5BBF8E] hover:bg-[#4AA77C] active:bg-[#3FA876] transition-colors duration-150 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ boxShadow: '0 4px 14px rgba(91, 191, 142, 0.3)' }}
            >
              {loading ? 'Criando conta…' : 'Criar conta com email'}
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-[#6B7280]">
            Já tem conta?{' '}
            <Link href="/login" className="font-semibold text-[#A8C5E0]">
              Entrar
            </Link>
          </p>
          <TermsModal
            isOpen={termsModalOpen}
            onClose={() => setTermsModalOpen(false)}
          />
        </>
      )}
    </div>
  );
}
