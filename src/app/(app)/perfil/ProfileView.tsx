'use client';

import Link from 'next/link';
import { useState, useTransition, useRef } from 'react';
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
} from '@phosphor-icons/react';
import { useToast } from '@/components/ToastProvider';
import {
  updateDisplayName,
  updateEmail,
  signOut,
  deleteAccount,
  type ActionResult,
} from './actions';
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
  allowDelete: boolean;
  linkedProviders?: string[];
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
  allowDelete,
  linkedProviders = [],
}: ProfileViewProps) {
  const [name, setName] = useState(initialName);
  const [draftName, setDraftName] = useState(initialName);
  const [editing, setEditing] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);
  const [draftEmail, setDraftEmail] = useState(email);
  const { showToast } = useToast();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [savingName, startSaveName] = useTransition();
  const [savingEmail, startSaveEmail] = useTransition();
  const [signingOut, startSignOut] = useTransition();
  const [deleting, startDelete] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [linkingGoogle, setLinkingGoogle] = useState(false);
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string | null>(avatarUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isDark, toggleTheme } = useTheme();

  const initial = (name?.[0] ?? email?.[0] ?? '?').toUpperCase();
  const isGoogleLinked = linkedProviders.includes('google');
  const hasEmailIdentity = linkedProviders.includes('email');

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
    const fd = new FormData();
    fd.set('email', trimmed);
    startSaveEmail(async () => {
      const result = await updateEmail(fd);
      applyResult(result);
      if (result.ok) {
        setEditingEmail(false);
      }
    });
  }

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

  function handleDelete() {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    startDelete(async () => {
      const result = await deleteAccount();
      applyResult(result);
      setConfirmingDelete(false);
    });
  }

  const anyBusy = savingName || savingEmail || signingOut || deleting || uploading;

  return (
    <div className="max-w-lg mx-auto px-4 pb-24">
      <header className="py-6 animate-fade-up delay-0">
        <h1 className="text-2xl font-heading text-[#1A1D23]">Perfil</h1>
        <p className="text-sm text-[#6B7280] mt-1">Gerencie sua conta e preferências.</p>
      </header>

      {/* Identity card */}
      <section
        className="themed-card bg-white rounded-[16px] p-5 mb-6 animate-fade-up delay-1"
      >
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            {currentAvatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={currentAvatarUrl}
                alt=""
                className="w-16 h-16 rounded-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white"
                style={{ background: '#A8C5E0' }}
              >
                {initial}
              </div>
            )}
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
              accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml,image/heic,image/heif"
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
              {!editingEmail && (
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

        {editingEmail && (
          <div className="mt-4 flex items-center gap-2">
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
              disabled={savingEmail}
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
              }}
              disabled={savingEmail}
              className="w-10 h-10 rounded-[10px] flex items-center justify-center text-[#6B7280] border border-[#E5E7EB] disabled:opacity-60"
              aria-label="Cancelar"
            >
              <X size={18} />
            </button>
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
            <p className="text-sm font-semibold text-[#1A1D23]">Configurar orçamento</p>
            <p className="text-xs text-[#6B7280]">Defina quanto pretende gastar no mês</p>
          </div>
            <CaretRight size={18} className="text-[#E5E7EB] group-hover:text-[#9CA3AF] transition-colors" />
        </Link>
        <Link href="/perfil/ganhos" className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-[#F8F9FB] transition-colors group">
          <ProfileIcon tone="blue">
            <CurrencyDollar size={18} />
          </ProfileIcon>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#1A1D23]">Ganhos</p>
            <p className="text-xs text-[#6B7280]">Registre valores para abater estouros</p>
          </div>
          <CaretRight size={18} className="text-[#E5E7EB] group-hover:text-[#9CA3AF] transition-colors" />
        </Link>
        <Link href="/perfil/whatsapp" className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-[#F8F9FB] transition-colors group">
          <ProfileIcon tone="green">
            <WhatsappLogo size={18} weight="fill" />
          </ProfileIcon>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#1A1D23]">WhatsApp</p>
            <p className="text-xs text-[#6B7280]">Vincule seu telefone para lançar gastos</p>
          </div>
          <CaretRight size={18} className="text-[#E5E7EB] group-hover:text-[#9CA3AF] transition-colors" />
        </Link>
      </div>
      </div>

      {/* Categorias section */}
      <div className="animate-fade-up delay-3">
      <h2 className="text-xs font-heading uppercase tracking-wider text-[#9CA3AF] mb-2 px-1">
        Categorias
      </h2>
      <div
        className="themed-card bg-white rounded-[16px] overflow-hidden mb-6"
      >
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
      </div>
      </div>

      {/* Preferências section */}
      <div className="animate-fade-up delay-4">
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
            <p className="text-sm font-semibold text-[#1A1D23]">Modo escuro</p>
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
      </div>
      </div>

      {/* Dados section */}
      <div className="animate-fade-up delay-5">
      <h2 className="text-xs font-heading uppercase tracking-wider text-[#9CA3AF] mb-2 px-1">
        Dados
      </h2>
      <div
        className="themed-card bg-white rounded-[16px] overflow-hidden mb-6"
      >
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
      </div>
      </div>

      {/* Account actions */}
      <div className="animate-fade-up delay-6">
      <h2 className="text-xs font-heading uppercase tracking-wider text-[#9CA3AF] mb-2 px-1">
        Conta
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
              {hasEmailIdentity ? 'Senha e recuperação' : 'Definir senha'}
            </p>
            <p className="text-xs text-[#6B7280]">
              {hasEmailIdentity
                ? 'Alterar senha ou enviar link de redefinição'
                : 'Crie uma senha para entrar também via email'}
            </p>
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
        <section className="mb-8 animate-fade-up delay-7">
          <div
            className="themed-card bg-white rounded-[16px] p-5 border border-[#F4D7D7]"
          >
            <p className="text-xs font-bold uppercase tracking-widest text-[#E07070] mb-2">
              Zona de Perigo
            </p>
            <p className="text-sm text-[#6B7280] mb-4">
              Excluir sua conta remove permanentemente todos os seus dados. Esta ação não pode
              ser desfeita.
            </p>

            {confirmingDelete ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 py-3 rounded-[12px] text-sm font-bold text-white bg-[#E07070] disabled:opacity-60"
                >
                  {deleting ? 'Excluindo…' : 'Confirmar exclusão'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(false)}
                  disabled={deleting}
                  className="px-6 py-3 rounded-[12px] text-sm font-bold text-[#6B7280] border border-[#E5E7EB] disabled:opacity-60"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmingDelete(true)}
                disabled={anyBusy}
                className="danger-button disabled:opacity-60"
              >
                <Trash size={18} weight="bold" />
                Excluir conta
              </button>
            )}
          </div>
        </section>
      )}

      
    </div>
  );
}
