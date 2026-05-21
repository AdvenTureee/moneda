'use client';

import Link from 'next/link';
import { useState, useTransition, useRef } from 'react';
import {
  SignOut,
  Envelope,
  PencilSimple,
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
} from '@phosphor-icons/react';
import {
  updateDisplayName,
  sendPasswordReset,
  signOut,
  deleteAccount,
  type ActionResult,
} from './actions';

interface ProfileViewProps {
  email: string;
  initialName: string;
  avatarUrl: string | null;
  allowDelete: boolean;
}

type Feedback = { kind: 'success' | 'error'; text: string } | null;

export default function ProfileView({
  email,
  initialName,
  avatarUrl,
  allowDelete,
}: ProfileViewProps) {
  const [name, setName] = useState(initialName);
  const [draftName, setDraftName] = useState(initialName);
  const [editing, setEditing] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [savingName, startSaveName] = useTransition();
  const [sendingReset, startSendReset] = useTransition();
  const [signingOut, startSignOut] = useTransition();
  const [deleting, startDelete] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string | null>(avatarUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initial = (name?.[0] ?? email?.[0] ?? '?').toUpperCase();

  function applyResult(result: ActionResult) {
    if (result.ok) {
      setFeedback({ kind: 'success', text: result.message ?? 'Pronto.' });
    } else {
      setFeedback({ kind: 'error', text: result.error });
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

  function handleSendReset() {
    setFeedback(null);
    startSendReset(async () => {
      const result = await sendPasswordReset();
      applyResult(result);
    });
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setFeedback(null);
    try {
      const formData = new FormData();
      formData.set('file', file);
      const res = await fetch('/api/upload-avatar', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ kind: 'error', text: data.error ?? 'Erro ao fazer upload.' });
        return;
      }
      setCurrentAvatarUrl(data.url);
      setFeedback({ kind: 'success', text: 'Foto atualizada.' });
    } catch {
      setFeedback({ kind: 'error', text: 'Erro ao conectar com o servidor.' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function handleSignOut() {
    setFeedback(null);
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

  const anyBusy = savingName || sendingReset || signingOut || deleting || uploading;

  return (
    <div className="max-w-lg mx-auto px-4 pb-24">
      <header className="py-6">
        <h1 className="text-2xl font-heading text-[#1A1D23]">Perfil</h1>
        <p className="text-sm text-[#6B7280] mt-1">Gerencie sua conta e preferências.</p>
      </header>

      {/* Identity card */}
      <section
        className="bg-white rounded-[16px] p-5 mb-6"
        style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
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
                    setFeedback(null);
                    setEditing(true);
                  }}
                  className="p-2 -mr-2 text-[#A8C5E0] hover:bg-[#F8F9FB] rounded-full transition-colors"
                  aria-label="Editar nome"
                >
                  <PencilSimple size={18} />
                </button>
              )}
            </div>
            <p className="text-sm text-[#6B7280] truncate">{email}</p>
          </div>
        </div>

        {editing && (
          <div className="mt-4 flex items-center gap-2">
            <input
              type="text"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              maxLength={80}
              autoFocus
              disabled={savingName}
              className="flex-1 px-3 py-2 rounded-[10px] bg-[#F8F9FB] border border-[#E5E7EB] text-sm text-[#1A1D23] outline-none focus:border-[#A8C5E0] transition-colors"
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
      <h2 className="text-xs font-heading uppercase tracking-wider text-[#9CA3AF] mb-2 px-1">
        Finanças
      </h2>
      <div
        className="bg-white rounded-[16px] overflow-hidden mb-6 divide-y divide-[#F1F2F4]"
        style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
      >
        <Link href="/perfil/orcamento" className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-[#F8F9FB] transition-colors group">
          <div className="w-9 h-9 rounded-full bg-[#EEF9F4] text-[#5BBF8E] flex items-center justify-center">
            <Wallet size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#1A1D23]">Configurar orçamento</p>
            <p className="text-xs text-[#6B7280]">Defina quanto pretende gastar no mês</p>
          </div>
            <CaretRight size={18} className="text-[#E5E7EB] group-hover:text-[#9CA3AF] transition-colors" />
        </Link>
        <Link href="/perfil/ganhos" className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-[#F8F9FB] transition-colors group">
          <div className="w-9 h-9 rounded-full bg-[#EBF3FE] text-[#3B82F6] flex items-center justify-center">
            <CurrencyDollar size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#1A1D23]">Ganhos e receitas</p>
            <p className="text-xs text-[#6B7280]">Registre e gerencie suas fontes de renda</p>
          </div>
          <CaretRight size={18} className="text-[#E5E7EB] group-hover:text-[#9CA3AF] transition-colors" />
        </Link>
      </div>

      {/* Categorias section */}
      <h2 className="text-xs font-heading uppercase tracking-wider text-[#9CA3AF] mb-2 px-1">
        Categorias
      </h2>
      <div
        className="bg-white rounded-[16px] overflow-hidden mb-6"
        style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
      >
        <Link
          href="/perfil/categorias"
          className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-[#F8F9FB] transition-colors group"
        >
          <div className="w-9 h-9 rounded-full bg-[#F4F6F8] text-[#5B7FA8] flex items-center justify-center">
            <Tag size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#1A1D23]">Gerenciar categorias</p>
            <p className="text-xs text-[#6B7280]">Crie ou edite categorias de gastos</p>
          </div>
          <CaretRight size={18} className="text-[#E5E7EB] group-hover:text-[#9CA3AF] transition-colors" />
        </Link>
      </div>

      {/* Preferências section */}
      <h2 className="text-xs font-heading uppercase tracking-wider text-[#9CA3AF] mb-2 px-1">
        Preferências
      </h2>
      <div
        className="bg-white rounded-[16px] overflow-hidden divide-y divide-[#F1F2F4] mb-6"
        style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
      >
        <button className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-[#F8F9FB] transition-colors group">
          <div className="w-9 h-9 rounded-full bg-[#FEF6EB] text-[#F0A855] flex items-center justify-center">
            <Bell size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#1A1D23]">Notificações</p>
            <p className="text-xs text-[#6B7280]">Alertas de orçamento e lembretes</p>
          </div>
          <CaretRight size={18} className="text-[#E5E7EB] group-hover:text-[#9CA3AF] transition-colors" />
        </button>
        <button className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-[#F8F9FB] transition-colors group">
          <div className="w-9 h-9 rounded-full bg-[#F1F3F7] text-[#6B7280] flex items-center justify-center">
            <CurrencyDollar size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#1A1D23]">Moeda</p>
            <p className="text-xs text-[#6B7280]">Real Brasileiro (BRL)</p>
          </div>
          <CaretRight size={18} className="text-[#E5E7EB] group-hover:text-[#9CA3AF] transition-colors" />
        </button>
      </div>

      {/* Dados section */}
      <h2 className="text-xs font-heading uppercase tracking-wider text-[#9CA3AF] mb-2 px-1">
        Dados
      </h2>
      <div
        className="bg-white rounded-[16px] overflow-hidden mb-6"
        style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
      >
        <button className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-[#F8F9FB] transition-colors group">
          <div className="w-9 h-9 rounded-full bg-[#F3E8FF] text-[#9333EA] flex items-center justify-center">
            <DownloadSimple size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#1A1D23]">Exportar dados</p>
            <p className="text-xs text-[#6B7280]">Baixar todos os seus gastos em CSV</p>
          </div>
          <CaretRight size={18} className="text-[#E5E7EB] group-hover:text-[#9CA3AF] transition-colors" />
        </button>
      </div>

      {/* Account actions */}
      <h2 className="text-xs font-heading uppercase tracking-wider text-[#9CA3AF] mb-2 px-1">
        Conta
      </h2>
      <div
        className="bg-white rounded-[16px] overflow-hidden divide-y divide-[#F1F2F4] mb-8"
        style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
      >
        <button
          type="button"
          onClick={handleSendReset}
          disabled={anyBusy}
          className="w-full flex items-center gap-3 px-5 py-4 text-left disabled:opacity-60 hover:bg-[#F8F9FB] transition-colors"
        >
          <div className="w-9 h-9 rounded-full bg-[#EEF3F8] text-[#5B7FA8] flex items-center justify-center">
            <Envelope size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#1A1D23]">
              {sendingReset ? 'Enviando…' : 'Redefinir senha'}
            </p>
            <p className="text-xs text-[#6B7280]">Enviar link de reset para seu email</p>
          </div>
        </button>

        <button
          type="button"
          onClick={handleSignOut}
          disabled={anyBusy}
          className="w-full flex items-center gap-3 px-5 py-4 text-left disabled:opacity-60 hover:bg-[#F8F9FB] transition-colors"
        >
          <div className="w-9 h-9 rounded-full bg-[#F4EEF8] text-[#8B6BB0] flex items-center justify-center">
            <SignOut size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#1A1D23]">
              {signingOut ? 'Saindo…' : 'Sair da conta'}
            </p>
            <p className="text-xs text-[#6B7280]">Desconectar deste dispositivo</p>
          </div>
        </button>
      </div>

      {/* Delete account */}
      {allowDelete && (
        <section className="mb-8">
          <div
            className="bg-white rounded-[16px] p-5 border border-[#F4D7D7]"
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
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
                className="w-full flex items-center justify-center gap-2 py-3 rounded-[12px] text-sm font-bold text-[#E07070] border border-[#F4D7D7] hover:bg-[#FDF0F0] transition-colors disabled:opacity-60"
              >
                <Trash size={16} />
                Excluir conta
              </button>
            )}
          </div>
        </section>
      )}

      {feedback && (
        <div
          role={feedback.kind === 'error' ? 'alert' : 'status'}
          className={`fixed bottom-20 left-4 right-4 z-50 rounded-[16px] px-5 py-4 shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-300 ${
            feedback.kind === 'success'
              ? 'bg-[#EEF9F4] text-[#2E7D5B] border border-[#D1EBDD]'
              : 'bg-[#FDF0F0] text-[#B14C4C] border border-[#F4D7D7]'
          }`}
        >
          <div className="flex items-center gap-3">
            {feedback.kind === 'success' ? <Check size={18} /> : <X size={18} />}
            <p className="font-medium text-sm">{feedback.text}</p>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="absolute top-4 right-4 text-current opacity-60 hover:opacity-100"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

