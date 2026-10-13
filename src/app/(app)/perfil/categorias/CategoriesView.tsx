'use client';

import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { ArrowLeft, Check, X, Trash, Plus, MagnifyingGlass } from '@phosphor-icons/react';
import Icon, { AVAILABLE_ICONS } from '@/components/Icon';
import { CategoriesListSkeleton } from '@/components/profile/ProfileSkeletons';
import { useToast } from '@/components/ToastProvider';
import { useCategories } from '@/hooks/useCategories';

const COLOR_SWATCHES = [
  '#F59E0B', '#3B82F6', '#8B5CF6', '#EF4444', '#10B981', '#06B6D4', '#6B7280',
  '#F97316', '#EC4899', '#14B8A6', '#84CC16', '#6366F1', '#E11D48', '#0EA5E9',
];

const DEFAULT_COLOR = '#6B7280';
const DEFAULT_ICON = 'Package';

type CategoryItem = ReturnType<typeof useCategories>['data'][number];

export default function CategoriesView() {
  const { data: categories, loading, error, refresh, invalidate } = useCategories();

  // Edit/create state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({ name: '', icon: DEFAULT_ICON, color: DEFAULT_COLOR, keywords: [] as string[] });
  const [keywordInput, setKeywordInput] = useState('');
  const [saving, setSaving] = useState(false);

  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Modal mount
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Toast
  const { showToast } = useToast();

  // Search
  const [search, setSearch] = useState('');
  const filteredCategories = useMemo(
    () => categories.filter((cat) => cat.name.toLowerCase().includes(search.toLowerCase())),
    [categories, search]
  );

  function resetForm() {
    setFormData({ name: '', icon: DEFAULT_ICON, color: DEFAULT_COLOR, keywords: [] });
    setKeywordInput('');
  }

  function startEdit(cat: CategoryItem) {
    setEditingId(cat.id);
    setCreating(false);
    setDeletingId(null);
    setFormData({ name: cat.name, icon: cat.icon, color: cat.color, keywords: [...cat.keywords] });
    setKeywordInput('');
  }

  function cancelEdit() {
    setEditingId(null);
    setCreating(false);
    resetForm();
  }

  function startCreate() {
    setCreating(true);
    setEditingId(null);
    setDeletingId(null);
    const usedIcons = new Set(categories.map((c) => c.icon));
    const freeIcon = AVAILABLE_ICONS.find((i) => !usedIcons.has(i)) ?? DEFAULT_ICON;
    setFormData({ name: '', icon: freeIcon, color: DEFAULT_COLOR, keywords: [] });
    setKeywordInput('');
  }

  function addKeyword() {
    const kw = keywordInput.trim().toLowerCase();
    if (kw && !formData.keywords.includes(kw)) {
      setFormData((prev) => ({ ...prev, keywords: [...prev.keywords, kw] }));
    }
    setKeywordInput('');
  }

  function removeKeyword(kw: string) {
    setFormData((prev) => ({ ...prev, keywords: prev.keywords.filter((k) => k !== kw) }));
  }

  async function handleSave() {
    if (!formData.name.trim()) return;
    setSaving(true);

    try {
      if (creating) {
        const res = await fetch('/api/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'create', ...formData }),
        });
        const d = await res.json();
        if (!res.ok) throw new Error(d.error);
        invalidate();
        await refresh();
        showToast('success', 'Categoria criada.');
        setCreating(false);
        resetForm();
      } else if (editingId) {
        const cat = categories.find((c) => c.id === editingId);
        if (cat?.is_default) throw new Error('Categorias padrão não podem ser editadas.');
        const res = await fetch('/api/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'update', id: editingId, ...formData }),
        });
        const d = await res.json();
        if (!res.ok) throw new Error(d.error);
        invalidate();
        await refresh();
        showToast('success', 'Categoria atualizada.');
        setEditingId(null);
        resetForm();
      }
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setSaving(true);
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      invalidate();
      await refresh();
      showToast('success', 'Categoria excluída.');
      setDeletingId(null);
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : 'Erro ao excluir.');
    } finally {
      setSaving(false);
    }
  }

  const editingCat = editingId ? categories.find((c) => c.id === editingId) : null;
  const readOnly = editingCat?.is_default === true;
  const isFormValid = formData.name.trim().length > 0;

  return (
    <div className="max-w-lg mx-auto px-4 pb-4 [scrollbar-gutter:stable]">
      {/* Header */}
      <header className="flex items-center gap-3 py-5 animate-fade-up delay-0">
        <Link
          href="/perfil"
          className="flex items-center justify-center w-8 h-8 rounded-full text-[#6B7280] hover:bg-[#F1F3F7] transition-colors"
          aria-label="Voltar"
        >
          <ArrowLeft size={18} weight="bold" />
        </Link>
        <div>
          <h1 className="text-xl font-heading text-[#1A1D23]">Gerenciar categorias</h1>
          <p className="text-xs text-[#6B7280] mt-0.5">{categories.length} categorias</p>
        </div>
      </header>

      {/* Search Bar */}
      <div className="relative mb-4 animate-fade-up delay-1">
        <MagnifyingGlass
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]"
          aria-hidden
        />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar categoria..."
          className="w-full pl-9 pr-4 py-2.5 rounded-[10px] bg-white border border-[#E5E7EB] text-sm text-[#1A1D23] placeholder:text-[#9CA3AF] outline-none focus:border-[#A8C5E0] transition-colors"
          aria-label="Buscar categorias"
        />
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-[#FDF0F0] border border-[#F4D7D7] rounded-[12px] p-4 mb-4">
          <p className="text-sm font-medium text-[#B14C4C]">{error}</p>
          <button
            type="button"
            onClick={() => refresh()}
            className="mt-2 text-xs font-semibold text-[#E07070] hover:underline"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="mb-6 animate-fade-up delay-2">
          <CategoriesListSkeleton />
        </div>
      )}

      {/* Add button */}
      {!creating && !loading && !error && (
        <div className="mb-3 animate-fade-up delay-2">
          <button
            type="button"
            onClick={startCreate}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-[12px] text-sm font-semibold text-[#A8C5E0] border border-dashed border-[#D1D9E6] hover:border-[#A8C5E0] hover:bg-[#F8F9FB] transition-colors"
          >
            <Plus size={18} />
            Nova categoria
          </button>
        </div>
      )}

      {/* Hint */}
      {!loading && !error && (
        <p className="text-[10px] font-medium text-[#9CA3AF] mb-2 flex items-center gap-1 px-1 animate-fade-up delay-2">
          <Icon name="HandTap" size={12} />
          Toque para editar
        </p>
      )}

      {/* Category list */}
      {!loading && !error && (
        <div className="space-y-2 mb-6 animate-fade-up delay-2">
          {filteredCategories.map((cat) => {
            const isEditing = editingId === cat.id;
            const isDeleting = deletingId === cat.id;

            if (isDeleting) {
              return (
                <div
                  key={cat.id}
                  className="bg-white rounded-[12px] p-4 border border-[#F4D7D7]"
                  style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-base" style={{ background: `${cat.color}22` }}>
                      <Icon name={cat.icon} size={18} />
                    </div>
                    <p className="text-sm font-semibold text-[#1A1D23]">{cat.name}</p>
                  </div>
                  <p className="text-xs text-[#6B7280] mb-3">
                    Excluir esta categoria? Esta ação não pode ser desfeita.
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleDelete(cat.id)}
                      disabled={saving}
                      className="gesture-button-danger flex-1 py-2.5 rounded-[10px] text-xs font-bold text-white bg-[#E07070] disabled:opacity-60"
                    >
                      {saving ? 'Excluindo…' : 'Confirmar exclusão'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingId(null)}
                      disabled={saving}
                      className="gesture-button px-5 py-2.5 rounded-[10px] text-xs font-bold text-[#6B7280] border border-[#E5E7EB] disabled:opacity-60"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => startEdit(cat)}
                className="themed-card group flex w-full items-center gap-3 rounded-[12px] p-3.5 text-left transition-[background-color,box-shadow,transform] duration-150 active:scale-[0.99] hover:shadow-[var(--shadow-card)]"
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: `${cat.color}22` }}
                >
                  <Icon name={cat.icon} size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-[#1A1D23]">{cat.name}</span>
                    {cat.is_default && (
                      <span className="text-[10px] font-medium text-[#9CA3AF] bg-[#F1F3F7] px-1.5 py-0.5 rounded-full">
                        padrão
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#6B7280] mt-0.5">{cat.keywords.length} palavras-chave</p>
                </div>
                <span
                  className="w-3 h-3 rounded-full shrink-0 border border-white/20"
                  style={{ background: cat.color }}
                  aria-hidden
                />
              </button>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && categories.length === 0 && (
        <div className="flex flex-col items-center py-12 text-center">
          <Icon name="Tag" size={48} className="mb-4 opacity-30" />
          <p className="text-base font-heading text-[#1A1D23]">Nenhuma categoria</p>
          <p className="text-sm text-[#6B7280] mt-1">Crie sua primeira categoria de gasto.</p>
        </div>
      )}

      {/* Empty search state */}
      {!loading && !error && search && filteredCategories.length === 0 && categories.length > 0 && (
        <div className="flex flex-col items-center py-12 text-center">
          <MagnifyingGlass size={36} className="text-[#9CA3AF] mb-3 opacity-40" />
          <p className="text-sm font-semibold text-[#1A1D23]">Nenhuma categoria encontrada</p>
          <p className="text-xs text-[#6B7280] mt-1">Tente buscar por outro termo.</p>
        </div>
      )}

      {/* Category modal */}
      {mounted && (creating || editingId) && createPortal(
        <div
          className="modal-wave-backdrop fixed inset-0 z-[70] flex items-end justify-center sm:items-center p-0 sm:p-4"
          onClick={cancelEdit}
        >
          <div
            role="dialog"
            aria-modal
            aria-label={creating ? 'Nova categoria' : 'Editar categoria'}
            className="w-full max-w-lg max-h-[88dvh] flex flex-col overflow-hidden rounded-t-[24px] sm:rounded-[24px] bg-white shadow-[var(--shadow-overlay)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 bg-white border-b border-[#F1F3F7] px-5 py-4 flex items-center justify-between rounded-t-[24px] sm:rounded-t-[24px]">
              <div>
                <h2 className="text-lg font-bold text-[#1A1D23]">
                  {creating ? 'Nova categoria' : 'Editar categoria'}
                </h2>
                <p className="text-xs text-[#6B7280] mt-0.5">
                  {creating
                    ? 'Crie uma categoria personalizada para organizar seus gastos.'
                    : 'Altere o nome, ícone, cor ou palavras-chave da categoria.'}
                </p>
              </div>
              <button
                type="button"
                onClick={cancelEdit}
                disabled={saving}
                aria-label="Fechar"
                className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-[#F1F3F7] transition-colors disabled:opacity-40"
              >
                <X size={18} className="text-[#6B7280]" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {renderFormBody()}
            </div>

            <div className="sticky bottom-0 z-10 bg-white border-t border-[#F1F3F7] p-5">
              <div className="flex gap-2 pt-1">
                {!readOnly && (
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={!isFormValid || saving}
                    className="gesture-button-primary flex-1 py-2.5 rounded-[10px] text-sm font-bold text-white bg-[#5BBF8E] disabled:opacity-40 transition-opacity"
                  >
                    {saving ? 'Salvando…' : creating ? 'Criar categoria' : 'Salvar'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={cancelEdit}
                  disabled={saving}
                  className={`gesture-button ${readOnly ? 'flex-1' : 'px-5'} py-2.5 rounded-[10px] text-sm font-bold text-[#6B7280] border border-[#E5E7EB] disabled:opacity-60`}
                >
                  {readOnly ? 'Fechar' : 'Cancelar'}
                </button>
                {editingId && !readOnly && !categories.find((c) => c.id === editingId)?.is_default && (
                  <button
                    type="button"
                    onClick={() => { setDeletingId(editingId); setEditingId(null); }}
                    disabled={saving}
                    className="gesture-icon-button px-3 py-2.5 rounded-[10px] text-sm font-bold text-[#E07070] border border-[#F4D7D7] hover:bg-[#FDF0F0] transition-colors disabled:opacity-60"
                    aria-label="Excluir categoria"
                  >
                    <Trash size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );

  function renderFormBody() {
    const inputBase =
      'w-full px-3 py-2.5 rounded-[10px] border border-[#E5E7EB] text-sm text-[#1A1D23] placeholder:text-[#9CA3AF] outline-none transition-colors';
    const inputEnabled = 'bg-[#F8F9FB] focus:border-[#A8C5E0]';
    const inputDisabled = 'bg-[#F1F3F7] cursor-not-allowed';

    return (
      <div className="space-y-4">
        {/* Read-only banner for default categories */}
        {readOnly && (
          <div className="rounded-[10px] bg-[#F1F3F7] border border-[#E5E7EB] px-3 py-2.5">
            <p className="text-xs text-[#6B7280]">
              <span className="font-semibold text-[#1A1D23]">Categoria padrão.</span>{' '}
              Nome, ícone, cor e palavras-chave não podem ser alterados.
            </p>
          </div>
        )}

        {/* Name */}
        <div>
          <label className="block text-xs font-medium text-[#6B7280] mb-1.5">Nome</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
            placeholder="Ex: Assinaturas"
            maxLength={40}
            disabled={readOnly}
            readOnly={readOnly}
            className={`${inputBase} ${readOnly ? inputDisabled : inputEnabled}`}
          />
        </div>

        {/* Icon picker */}
        <div>
          <label className="block text-xs font-medium text-[#6B7280] mb-1.5">Ícone</label>
          <div className="flex flex-wrap gap-1.5">
            {AVAILABLE_ICONS.map((iconName) => (
              <button
                key={iconName}
                type="button"
                onClick={() => setFormData((p) => ({ ...p, icon: iconName }))}
                disabled={readOnly}
                className={`w-9 h-9 rounded-[10px] flex items-center justify-center transition-all duration-75 ${
                  formData.icon === iconName
                    ? 'bg-[#1A1D23] text-white scale-105'
                    : 'bg-[#F1F3F7] text-[#6B7280] hover:bg-[#E5E7EB]'
                } ${readOnly ? 'opacity-60 cursor-not-allowed hover:bg-[#F1F3F7]' : ''}`}
                aria-label={iconName}
              >
                <Icon name={iconName} size={18} />
              </button>
            ))}
          </div>
        </div>

        {/* Color swatches */}
        <div>
          <label className="block text-xs font-medium text-[#6B7280] mb-1.5">Cor</label>
          <div className="flex flex-wrap gap-2">
            {COLOR_SWATCHES.map((hex) => (
              <button
                key={hex}
                type="button"
                onClick={() => setFormData((p) => ({ ...p, color: hex }))}
                disabled={readOnly}
                className={`w-7 h-7 rounded-full transition-all duration-75 flex items-center justify-center ${
                  formData.color === hex ? 'ring-2 ring-offset-2 ring-[#1A1D23] scale-110' : ''
                } ${readOnly ? 'opacity-60 cursor-not-allowed' : ''}`}
                style={{ background: hex }}
                aria-label={hex}
              >
                {formData.color === hex && <Check size={12} className="text-white" />}
              </button>
            ))}
          </div>
        </div>

        {/* Keywords */}
        <div>
          <label className="block text-xs font-medium text-[#6B7280] mb-1.5">Palavras-chave</label>
          {!readOnly && (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    addKeyword();
                  }
                }}
                placeholder="Digite e pressione Enter"
                className="flex-1 px-3 py-2 rounded-[10px] bg-[#F8F9FB] border border-[#E5E7EB] text-sm text-[#1A1D23] placeholder:text-[#9CA3AF] outline-none focus:border-[#A8C5E0] transition-colors"
              />
              <button
                type="button"
                onClick={addKeyword}
                disabled={!keywordInput.trim()}
                className="px-3 py-2 rounded-[10px] text-xs font-semibold text-white bg-[#5BBF8E] hover:bg-[#4AA77C] active:bg-[#3FA876] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Adicionar
              </button>
            </div>
          )}
          {formData.keywords.length > 0 && (
            <div className={`flex flex-wrap gap-1.5 ${readOnly ? '' : 'mt-2'}`}>
              {formData.keywords.map((kw) => (
                <span
                  key={kw}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium bg-[#F1F3F7] text-[#6B7280]"
                >
                  {kw}
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => removeKeyword(kw)}
                      className="hover:text-[#E07070] transition-colors"
                      aria-label={`Remover ${kw}`}
                    >
                      <X size={10} />
                    </button>
                  )}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }
}
