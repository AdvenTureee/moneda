'use client';

import Link from 'next/link';
import { useState, useTransition, useRef, useEffect } from 'react';
import {
  SignOut,
  PencilSimple,
  At,
  Trash,
  Check,
  X,
  CaretRight,
  Wallet,
  Tag,
  Bell,
  DownloadSimple,
  CurrencyDollar,
  Camera,
  Moon,
  Sun,
  LockKey,
  WhatsappLogo,
  CalendarBlank,
  Envelope,
} from '@phosphor-icons/react';
import { useToast } from '@/components/ToastProvider';
import PageHeader from '@/components/PageHeader';
import {
  updateDisplayName,
  sendEmailChangeOtp,
  confirmEmailChangeOtp,
  signOut,
  type ActionResult,
} from './actions';
import { isValidEmail } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { useTheme } from '@/components/ThemeProvider';

function GoogleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
    </svg>
  );
}

interface ProfileViewProps {
  email: string;
  initialName: string;
  avatarUrl: string | null;
  currency: string;
  billingClosingDay: number | null;
  allowDelete: boolean;
  linkedProviders?: string[];
  hasPassword: boolean;
}

const CURRENCY_LABELS: Record<string, string> = {
  BRL: 'Real Brasileiro (BRL)',
  USD: 'Dólar Americano (USD)',
  EUR: 'Euro (EUR)',
  GBP: 'Libra Esterlina (GBP)',
};

type ProfileIconTone =
  | 'green'
  | 'blue'
  | 'neutral'
  | 'warning'
  | 'purple'
  | 'danger'
  | 'brand'
  | 'google';

function ProfileIcon({
  tone,
  children,
}: {
  tone: ProfileIconTone;
  children: React.ReactNode;
}) {
  return (
    <div className={`profile-icon profile-icon--${tone}`}>
      {children}
    </div>
  );
}

export default function ProfileView({
  email,
  initialName,
  avatarUrl,
  currency,
  billingClosingDay,
  allowDelete,
  linkedProviders = [],
  hasPassword,
}: ProfileViewProps) {
  const [name, setName] = useState(initialName);
  const [draftName, setDraftName] = useState(initialName);
  const [editing, setEditing] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);
  const [draftEmail, setDraftEmail] = useState(email);
  const [otpStep, setOtpStep] = useState(false);
  const [otpEmail, setOtpEmail] = useState('');
  const [otpValue, setOtpValue] = useState('');
  const [otpExpiresAt, setOtpExpiresAt] = useState(0);
  const [otpTimer, setOtpTimer] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const { showToast } = useToast();
  const [savingName, startSaveName] = useTransition();
  const [savingEmail, startSaveEmail] = useTransition();
  const [savingOtp, startSaveOtp] = useTransition();
  const [signingOut, startSignOut] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [linkingGoogle, setLinkingGoogle] = useState(false);
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string | null>(avatarUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isDark, toggleTheme } = useTheme();

  const initial = (name?.[0] ?? email?.[0] ?? '?').toUpperCase();
  const isGoogleLinked = linkedProviders.includes('google');

  async function handleLinkGoogle() {
    setLinkingGoogle(true);
    const supabase = createClient();
    const { error } = await supabase.auth.linkIdentity({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/perfil` },
    });
    if (error) {
      console.error('[linkIdentity:google]', error);
      showToast('error', 'Não foi possível vincular o Google. Tente novamente.');
      setLinkingGoogle(false);
    }
    // se ok, navegação acontece via OAuth — sem reset de estado aqui.
  }

  function applyResult(result: ActionResult) {
    if (result.ok) {
      showToast('success', result.message ?? 'Pronto.');
    } else {
      showToast('error', result.error);
    }
  }

  function handleSaveName() {
    const trimmed = draftName.trim();
    if (trimmed === name) {
      setEditing(false);
      return;
    }
    const fd = new FormData();
    fd.set('name', trimmed);
    startSaveName(async () => {
      const result = await updateDisplayName(fd);
      applyResult(result);
      if (result.ok) {
        setName(trimmed);
        setEditing(false);
      }
    });
  }

  function handleSaveEmail() {
    const trimmed = draftEmail.trim().toLowerCase();
    if (trimmed === email.toLowerCase()) {
      setEditingEmail(false);
      return;
    }
    if (!isValidEmail(trimmed)) {
      showToast('error', 'Informe um email válido.');
      return;
    }
    const fd = new FormData();
    fd.set('email', trimmed);
    if (hasPassword) {
      fd.set('currentPassword', currentPassword);
    }
    startSaveEmail(async () => {
      const result = await sendEmailChangeOtp(fd);
      applyResult(result);
      if (result.ok) {
        setOtpEmail(trimmed);
        setOtpStep(true);
        setOtpExpiresAt(Date.now() + 10 * 60 * 1000);
        setEditingEmail(false);
      }
      setCurrentPassword('');
    });
  }

  function handleConfirmOtp() {
    const fd = new FormData();
    fd.set('email', otpEmail);
    fd.set('otp', otpValue);
    startSaveOtp(async () => {
      const result = await confirmEmailChangeOtp(fd);
      if (result.ok) {
        setOtpStep(false);
        setOtpValue('');
        setOtpEmail('');
        setOtpTimer('');
      } else {
        setOtpValue('');
      }
      applyResult(result);
    });
  }

  useEffect(() => {
    if (!otpStep || !otpExpiresAt) return;
    const tick = () => {
      const left = Math.max(0, Math.floor((otpExpiresAt - Date.now()) / 1000));
      if (left <= 0) {
        setOtpTimer('Expirado');
        setOtpExpiresAt(0);
        setOtpValue('');
        return;
      }
      const min = String(Math.floor(left / 60)).padStart(2, '0');
      const sec = String(left % 60).padStart(2, '0');
      setOtpTimer(`${min}:${sec}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [otpStep, otpExpiresAt]);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.set('file', file);
      const res = await fetch('/api/upload-avatar', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) {
        showToast('error', data.error ?? 'Erro ao fazer upload.');
        return;
      }
      setCurrentAvatarUrl(data.url);
      showToast('success', 'Foto atualizada.');
    } catch {
      showToast('error', 'Erro ao conectar com o servidor.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function handleSignOut() {
    startSignOut(() => {
      void signOut();
    });
  }

  const anyBusy = savingName || savingEmail || savingOtp || signingOut || uploading;

  return (
    <div className="max-w-lg mx-auto px-4 pb-4">
      <PageHeader title="Perfil" subtitle="Gerencie sua conta e preferências." />

      {/* Identity card */}
      <section
        className="themed-card bg-white rounded-[16px] p-5 mb-6 animate-fade-up delay-1"
      >
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            <div className="profile-avatar-frame">
              {currentAvatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={currentAvatarUrl}
                  alt=""
                  className="h-full w-full rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center rounded-full text-2xl font-bold text-white">
                  {initial}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-white border border-[#E5E7EB] flex items-center justify-center shadow-sm hover:bg-[#F8F9FB] transition-colors disabled:opacity-60"
              aria-label="Alterar foto"
            >
              {uploading ? (
                <span className="w-3 h-3 border-2 border-[#9CA3AF] border-t-transparent rounded-full animate-spin" />
              ) : (
                <Camera size={12} className="text-[#6B7280]" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-lg font-bold text-[#1A1D23] truncate">
                {name || 'Sem nome'}
              </p>
              {!editing && (
                <button
                  type="button"
                  onClick={() => {
                    setDraftName(name);
                    setEditing(true);
                  }}
                  className="w-8 h-8 -mr-1 flex items-center justify-center text-[#A8C5E0] hover:bg-[#F8F9FB] rounded-full transition-colors shrink-0"
                  aria-label="Editar nome"
                >
                  <PencilSimple size={16} />
                </button>
              )}
            </div>
            <div className="flex items-center justify-between gap-2 mt-0.5">
              <p className="text-sm text-[#6B7280] truncate">{email}</p>
              {!editingEmail && !otpStep && (
                <button
                  type="button"
                  onClick={() => {
                    setDraftEmail(email);
                    setEditingEmail(true);
                  }}
                  className="w-8 h-8 -mr-1 flex items-center justify-center text-[#A8C5E0] hover:bg-[#F8F9FB] rounded-full transition-colors shrink-0"
                  aria-label="Alterar email"
                >
                  <At size={16} weight="bold" />
                </button>
              )}
            </div>
          </div>
        </div>

        {otpStep ? (
          <div className="mt-4 rounded-[14px] border border-[#E5E7EB] bg-[#F8F9FB] p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EBF3FE] text-[#3B82F6]">
                <Envelope size={16} weight="bold" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-[#1A1D23]">Código enviado</p>
                <p className="mt-1 text-xs leading-relaxed text-[#6B7280]">
                  Digite o código enviado para <strong className="font-semibold text-[#1A1D23]">{otpEmail}</strong>.
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <input
                type="tel"
                inputMode="numeric"
                maxLength={8}
                value={otpValue}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, '').slice(0, 8);
                  setOtpValue(digits);
                }}
                autoFocus
                disabled={savingOtp}
                className="themed-field flex-1 px-3 py-3 rounded-[10px] bg-white border border-[#E5E7EB] text-center text-lg font-bold tracking-[0.3em] text-[#1A1D23] outline-none focus:border-[#A8C5E0] transition-colors placeholder:text-[#9CA3AF]"
                placeholder="00000000"
                aria-label="Código de verificação"
              />
              <button
                type="button"
                onClick={handleConfirmOtp}
                disabled={savingOtp || otpValue.length < 6 || otpValue.length > 8}
                className="w-10 h-10 rounded-[10px] flex items-center justify-center text-white disabled:opacity-60 bg-[#5BBF8E]"
                aria-label="Confirmar código"
              >
                {savingOtp ? (
                  <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                ) : (
                  <Check size={18} />
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setOtpStep(false);
                  setOtpValue('');
                  setOtpEmail('');
                }}
                disabled={savingOtp}
                className="w-10 h-10 rounded-[10px] flex items-center justify-center text-[#6B7280] border border-[#E5E7EB] disabled:opacity-60"
                aria-label="Cancelar"
              >
                <X size={18} />
              </button>
            </div>
            <div className="mt-3 flex items-center justify-between gap-2">
              <span className={`text-xs font-semibold ${otpTimer === 'Expirado' ? 'text-red-500' : 'text-[#6B7280]'}`}>
                {otpTimer ? `Código expira em ${otpTimer}` : 'Aguardando código…'}
              </span>
              <button
                type="button"
                onClick={() => {
                  const fd = new FormData();
                  fd.set('email', otpEmail);
                  if (hasPassword) {
                    fd.set('currentPassword', currentPassword);
                  }
                  startSaveEmail(async () => {
                    const result = await sendEmailChangeOtp(fd);
                    if (result.ok) {
                      setOtpExpiresAt(Date.now() + 10 * 60 * 1000);
                      setOtpValue('');
                    }
                    applyResult(result);
                  });
                }}
                disabled={savingEmail || savingOtp}
                className="text-xs font-semibold text-[#A8C5E0] hover:text-[#7AAECF] transition-colors disabled:opacity-60"
              >
                {savingEmail ? 'Reenviando…' : 'Reenviar código'}
              </button>
            </div>
          </div>
        ) : editingEmail && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="email"
                value={draftEmail}
                onChange={(e) => setDraftEmail(e.target.value)}
                autoComplete="email"
                autoFocus
                disabled={savingEmail}
                className="themed-field flex-1 px-3 py-2 rounded-[10px] bg-[#F8F9FB] border border-[#E5E7EB] text-sm text-[#1A1D23] outline-none focus:border-[#A8C5E0] transition-colors"
                placeholder="novo@email.com"
              />
              <button
                type="button"
                onClick={handleSaveEmail}
                disabled={savingEmail || !draftEmail.trim() || (hasPassword && !currentPassword.trim())}
                className="w-10 h-10 rounded-[10px] flex items-center justify-center text-white disabled:opacity-60 bg-[#5BBF8E]"
                aria-label="Confirmar troca de email"
              >
                <Check size={18} />
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingEmail(false);
                  setDraftEmail(email);
                  setCurrentPassword('');
                }}
                disabled={savingEmail}
                className="w-10 h-10 rounded-[10px] flex items-center justify-center text-[#6B7280] border border-[#E5E7EB] disabled:opacity-60"
                aria-label="Cancelar"
              >
                <X size={18} />
              </button>
            </div>
            {hasPassword && (
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                disabled={savingEmail}
                placeholder="Digite sua senha atual para confirmar"
                className="themed-field w-full px-3 py-2 rounded-[10px] bg-[#F8F9FB] border border-[#E5E7EB] text-sm text-[#1A1D23] outline-none focus:border-[#A8C5E0] transition-colors placeholder:text-[#9CA3AF]"
              />
            )}
            {hasPassword && currentPassword.trim() && !draftEmail.trim() && (
              <p className="text-xs text-[#E07070]">Informe um email para troca.</p>
            )}
            {hasPassword && draftEmail.trim() && !currentPassword.trim() && (
              <p className="text-xs text-[#E07070]">Digite sua senha atual para confirmar.</p>
            )}
          </div>
        )}

        {editing && (
          <div className="mt-4 flex items-center gap-2">
            <input
              type="text"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              maxLength={80}
              autoFocus
              disabled={savingName}
              className="themed-field flex-1 px-3 py-2 rounded-[10px] bg-[#F8F9FB] border border-[#E5E7EB] text-sm text-[#1A1D23] outline-none focus:border-[#A8C5E0] transition-colors"
              placeholder="Seu nome"
            />
            <button
              type="button"
              onClick={handleSaveName}
              disabled={savingName}
              className="w-10 h-10 rounded-[10px] flex items-center justify-center text-white disabled:opacity-60 bg-[#5BBF8E]"
            >
              <Check size={18} />
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setDraftName(name);
              }}
              disabled={savingName}
              className="w-10 h-10 rounded-[10px] flex items-center justify-center text-[#6B7280] border border-[#E5E7EB] disabled:opacity-60"
            >
              <X size={18} />
            </button>
          </div>
        )}
      </section>

      {/* Finanças section */}
      <div className="animate-fade-up delay-2">
      <h2 className="text-xs font-heading uppercase tracking-wider text-[#9CA3AF] mb-2 px-1">
        Finanças
      </h2>
      <div
        className="themed-card bg-white rounded-[16px] overflow-hidden mb-6 divide-y divide-[#F1F2F4]"
      >
        <Link href="/perfil/orcamento" className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-[#F8F9FB] transition-colors group">
          <ProfileIcon tone="green">
            <Wallet size={18} />
          </ProfileIcon>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#1A1D23]">Orçamento</p>
            <p className="text-xs text-[#6B7280]">Defina quanto pretende gastar no mês</p>
          </div>
            <CaretRight size={18} className="text-[#E5E7EB] group-hover:text-[#9CA3AF] transition-colors" />
        </Link>
        <Link href="/perfil/ganhos" className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-[#F8F9FB] transition-colors group">
          <ProfileIcon tone="blue">
            <CurrencyDollar size={18} />
          </ProfileIcon>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#1A1D23]">Ganhos e receitas</p>
            <p className="text-xs text-[#6B7280]">Registre valores para abater estouros</p>
          </div>
          <CaretRight size={18} className="text-[#E5E7EB] group-hover:text-[#9CA3AF] transition-colors" />
        </Link>
        <Link
          href="/perfil/categorias"
          className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-[#F8F9FB] transition-colors group"
        >
          <ProfileIcon tone="brand">
            <Tag size={18} />
          </ProfileIcon>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#1A1D23]">Gerenciar categorias</p>
            <p className="text-xs text-[#6B7280]">Crie ou edite categorias de gastos</p>
          </div>
          <CaretRight size={18} className="text-[#E5E7EB] group-hover:text-[#9CA3AF] transition-colors" />
        </Link>
        <Link href="/perfil/moeda" className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-[#F8F9FB] transition-colors group">
          <ProfileIcon tone="neutral">
            <CurrencyDollar size={18} />
          </ProfileIcon>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#1A1D23]">Moeda</p>
            <p className="text-xs text-[#6B7280]">{CURRENCY_LABELS[currency] ?? currency}</p>
          </div>
          <CaretRight size={18} className="text-[#E5E7EB] group-hover:text-[#9CA3AF] transition-colors" />
        </Link>
        <Link href="/perfil/fechamento" className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-[#F8F9FB] transition-colors group">
          <ProfileIcon tone="neutral">
            <CalendarBlank size={18} />
          </ProfileIcon>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#1A1D23]">Fechamento do cartão</p>
            <p className="text-xs text-[#6B7280]">
              {billingClosingDay ? `Fecha dia ${billingClosingDay}` : 'Informe o dia de fechamento'}
            </p>
          </div>
          <CaretRight size={18} className="text-[#E5E7EB] group-hover:text-[#9CA3AF] transition-colors" />
        </Link>
      </div>
      </div>

      {/* Preferências section */}
      <div className="animate-fade-up delay-3">
      <h2 className="text-xs font-heading uppercase tracking-wider text-[#9CA3AF] mb-2 px-1">
        Preferências
      </h2>
      <div
        className="themed-card bg-white rounded-[16px] overflow-hidden divide-y divide-[#F1F2F4] mb-6"
      >
        <button
          type="button"
          onClick={toggleTheme}
          role="switch"
          aria-checked={isDark}
          className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-[#F8F9FB] transition-colors group"
        >
          <ProfileIcon tone="neutral">
            {isDark ? <Moon size={18} weight="bold" /> : <Sun size={18} weight="bold" />}
          </ProfileIcon>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#1A1D23]">Aparência</p>
            <p className="text-xs text-[#6B7280]">
              {isDark ? 'Interface em tons escuros' : 'Interface clara padrão'}
            </p>
          </div>
          <span
            className={`relative inline-flex h-6 w-10 shrink-0 rounded-full transition-colors duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              isDark ? 'bg-[#5BBF8E]' : 'bg-[#E5E7EB]'
            }`}
            aria-hidden
          >
            <span
              className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                isDark ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </span>
        </button>
        <Link href="/perfil/notificacoes" className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-[#F8F9FB] transition-colors group">
          <ProfileIcon tone="warning">
            <Bell size={18} />
          </ProfileIcon>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#1A1D23]">Notificações</p>
            <p className="text-xs text-[#6B7280]">Alertas de orçamento e lembretes</p>
          </div>
          <CaretRight size={18} className="text-[#E5E7EB] group-hover:text-[#9CA3AF] transition-colors" />
        </Link>
      </div>
      </div>

      {/* Conexões section */}
      <div className="animate-fade-up delay-4">
      <h2 className="text-xs font-heading uppercase tracking-wider text-[#9CA3AF] mb-2 px-1">
        Conexões
      </h2>
      <div
        className="themed-card bg-white rounded-[16px] overflow-hidden divide-y divide-[#F1F2F4] mb-6"
      >
        <Link href="/perfil/whatsapp" className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-[#F8F9FB] transition-colors group">
          <ProfileIcon tone="green">
            <WhatsappLogo size={18} weight="fill" />
          </ProfileIcon>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#1A1D23]">WhatsApp para lançamentos</p>
            <p className="text-xs text-[#6B7280]">Vincule seu telefone para lançar gastos</p>
          </div>
          <CaretRight size={18} className="text-[#E5E7EB] group-hover:text-[#9CA3AF] transition-colors" />
        </Link>

        <button
          type="button"
          onClick={handleLinkGoogle}
          disabled={anyBusy || linkingGoogle || isGoogleLinked}
          className="w-full flex items-center gap-3 px-5 py-4 text-left disabled:opacity-60 hover:bg-[#F8F9FB] transition-colors"
        >
          <ProfileIcon tone="google">
            <GoogleIcon />
          </ProfileIcon>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#1A1D23]">
              {isGoogleLinked
                ? 'Google vinculado'
                : linkingGoogle
                  ? 'Redirecionando…'
                  : 'Vincular conta Google'}
            </p>
            <p className="text-xs text-[#6B7280]">
              {isGoogleLinked
                ? 'Você já pode entrar com Google ou email.'
                : 'Entre tanto via email quanto via Google.'}
            </p>
          </div>
          {isGoogleLinked && <Check size={16} className="text-[#5BBF8E]" />}
        </button>
      </div>
      </div>

      {/* Account actions */}
      <div className="animate-fade-up delay-5">
      <h2 className="text-xs font-heading uppercase tracking-wider text-[#9CA3AF] mb-2 px-1">
        Conta e segurança
      </h2>
      <div
        className="themed-card bg-white rounded-[16px] overflow-hidden divide-y divide-[#F1F2F4] mb-8"
      >
        <Link
          href="/perfil/senha"
          className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-[#F8F9FB] transition-colors group"
        >
          <ProfileIcon tone="brand">
            <LockKey size={16} />
          </ProfileIcon>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#1A1D23]">
              {hasPassword ? 'Alterar senha' : 'Definir senha'}
            </p>
            <p className="text-xs text-[#6B7280]">
              {hasPassword
                ? 'Enviar link de redefinição para o email'
                : 'Crie uma senha para entrar também via email'}
            </p>
          </div>
          <CaretRight size={18} className="text-[#E5E7EB] group-hover:text-[#9CA3AF] transition-colors" />
        </Link>

        <a
          href="/api/export"
          download
          className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-[#F8F9FB] transition-colors group"
        >
          <ProfileIcon tone="purple">
            <DownloadSimple size={18} />
          </ProfileIcon>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#1A1D23]">Exportar dados</p>
            <p className="text-xs text-[#6B7280]">Baixar todos os seus gastos em CSV</p>
          </div>
          <CaretRight size={18} className="text-[#E5E7EB] group-hover:text-[#9CA3AF] transition-colors" />
        </a>

        <button
          type="button"
          onClick={handleSignOut}
          disabled={anyBusy}
          className="w-full flex items-center gap-3 px-5 py-4 text-left disabled:opacity-60 hover:bg-[#F8F9FB] transition-colors"
        >
          <ProfileIcon tone="purple">
            <SignOut size={16} />
          </ProfileIcon>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#1A1D23]">
              {signingOut ? 'Saindo…' : 'Sair da conta'}
            </p>
            <p className="text-xs text-[#6B7280]">Desconectar deste dispositivo</p>
          </div>
        </button>
      </div>
      </div>

      {/* Delete account */}
      {allowDelete && (
        <section className="mb-8 animate-fade-up delay-6">
          <h2 className="text-xs font-heading uppercase tracking-wider text-[#D85C5C] mb-2 px-1 dark:text-[#FF8A8A]">
            Zona de perigo
          </h2>
          <div className="themed-card bg-white rounded-[16px] overflow-hidden border border-[#F2CACA] dark:border-[#7A3A3A]/55">
            <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[#1A1D23]">Excluir conta</p>
                <p className="text-xs text-[#6B7280]">
                  Remove permanentemente seus dados. Esta ação não pode ser desfeita.
                </p>
              </div>
              <Link
                href={anyBusy ? '/perfil' : '/perfil/excluir-conta'}
                aria-disabled={anyBusy}
                className="gesture-button-danger inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-[12px] bg-[#C94F4F] px-4 text-sm font-bold text-white transition-colors hover:bg-[#B94545] aria-disabled:pointer-events-none aria-disabled:opacity-60 dark:bg-[#A84E4E] dark:hover:bg-[#B95B5B]"
              >
                <Trash size={16} weight="bold" />
                Excluir conta
              </Link>
            </div>
          </div>
        </section>
      )}

      
    </div>
  );
}
