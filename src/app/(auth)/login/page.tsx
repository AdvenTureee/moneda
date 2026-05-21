'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

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

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('error') === 'auth_callback_failed') {
      setError('Falha na autenticação com Google. Tente novamente.');
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setError('Email ou senha incorretos.');
      setLoading(false);
      return;
    }

    router.push('/');
    router.refresh();
  }

  async function handleGoogleLogin() {
    setError('');
    setGoogleLoading(true);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (authError) {
      setError('Erro ao entrar com Google. Tente novamente.');
      setGoogleLoading(false);
    }
  }

  return (
    <div
      className="bg-white rounded-[20px] p-6"
      style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.07)' }}
    >
      <h1 className="text-xl font-heading text-[#1A1D23] mb-1">Entrar</h1>
      <p className="text-sm text-[#6B7280] mb-6">Acesse sua conta para continuar.</p>

      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={googleLoading || loading}
        className="w-full flex items-center justify-center gap-2.5 py-2.5 rounded-[12px] border border-[#E5E7EB] bg-white text-sm font-medium text-[#1A1D23] hover:bg-[#F8F9FB] transition-colors disabled:opacity-60 mb-5"
      >
        <GoogleIcon />
        {googleLoading ? 'Redirecionando…' : 'Continuar com Google'}
      </button>

      <div className="flex items-center gap-3 mb-5">
        <div className="flex-1 h-px bg-[#E5E7EB]" />
        <span className="text-xs text-[#9CA3AF]">ou</span>
        <div className="flex-1 h-px bg-[#E5E7EB]" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-xs font-medium text-[#6B7280] mb-1.5">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            className="w-full px-3.5 py-2.5 rounded-[10px] bg-[#F8F9FB] border border-[#E5E7EB] text-sm text-[#1A1D23] placeholder:text-[#9CA3AF] outline-none focus:border-[#A8C5E0] transition-colors"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-xs font-medium text-[#6B7280] mb-1.5">
            Senha
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-3.5 py-2.5 rounded-[10px] bg-[#F8F9FB] border border-[#E5E7EB] text-sm text-[#1A1D23] placeholder:text-[#9CA3AF] outline-none focus:border-[#A8C5E0] transition-colors"
          />
        </div>

        {error && (
          <p className="text-xs font-medium text-[#E07070]" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || googleLoading}
          className="w-full py-3 rounded-[12px] text-sm font-semibold text-white transition-opacity disabled:opacity-60"
          style={{ background: '#A8C5E0' }}
        >
          {loading ? 'Entrando…' : 'Entrar com email'}
        </button>
      </form>

      <p className="mt-5 text-center text-xs text-[#6B7280]">
        Não tem conta?{' '}
        <Link href="/signup" className="font-semibold text-[#A8C5E0]">
          Criar conta
        </Link>
      </p>
    </div>
  );
}
