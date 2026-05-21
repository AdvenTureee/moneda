'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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

  return (
    <div
      className="bg-white rounded-[20px] p-6"
      style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.07)' }}
    >
      <h1 className="text-xl font-bold text-[#1A1D23] mb-1">Entrar</h1>
      <p className="text-sm text-[#6B7280] mb-6">Acesse sua conta para continuar.</p>

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
          disabled={loading}
          className="w-full py-3 rounded-[12px] text-sm font-semibold text-white transition-opacity disabled:opacity-60"
          style={{ background: '#A8C5E0' }}
        >
          {loading ? 'Entrando…' : 'Entrar'}
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
