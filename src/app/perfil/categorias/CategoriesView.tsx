'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { CaretLeft, Check, X, Trash, Plus } from '@phosphor-icons/react';
import Icon from '@/components/Icon';
import type { Category } from '@/types';

interface CategoryWithMeta extends Category {
  is_default: boolean;
  sort_order: number;
}

const CATEGORY_ICONS = [
  'Hamburger', 'Car', 'GameController', 'Pill', 'House', 'Books',
  'Package', 'Briefcase', 'Rocket', 'TrendUp', 'Gift', 'Receipt',
] as const;

const COLOR_SWATCHES = [
  '#F59E0B', '#3B82F6', '#8B5CF6', '#EF4444', '#10B981', '#06B6D4', '#6B7280',
  '#F97316', '#EC4899', '#14B8A6', '#84CC16', '#6366F1', '#E11D48', '#0EA5E9',
];

const DEFAULT_COLOR = '#6B7280';
const DEFAULT_ICON = 'Package';

function slugify(text: string): string {
  return text.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

type Feedback = { kind: 'success' | 'error'; text: string } | null;

export default function CategoriesView() {
  const [categories, setCategories] = useState<CategoryWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit/create state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({ name: '', icon: DEFAULT_ICON, color: DEFAULT_COLOR, keywords: [] as string[] });
  const [keywordInput, setKeywordInput] = useState('');
  const [saving, setSaving] = useState(false);

  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Toast
  const [feedback, setFeedback] = useState<Feedback>(null);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/categories');
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? 'Erro ao carregar categorias');
      }
      const d = await res.json();
      setCategories(d.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  function resetForm() {
    setFormData({ name: '', icon: DEFAULT_ICON, color: DEFAULT_COLOR, keywords: [] });
    setKeywordInput('');
  }

  function startEdit(cat: CategoryWithMeta) {
    setEditingId(cat.id);
    setCreating(false);
    setDeletingId(null);
    setFeedback(null);
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
    setFeedback(null);
    const usedIcons = new Set(categories.map((c) => c.icon));
    const freeIcon = CATEGORY_ICONS.find((i) => !usedIcons.has(i)) ?? DEFAULT_ICON;
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
    setFeedback(null);

    try {
      if (creating) {
        const id = slugify(formData.name);
        const res = await fetch('/api/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'create', id, ...formData }),
        });
        const d = await res.json();
        if (!res.ok) throw new Error(d.error);
        setCategories((prev) => [...prev, { ...d.data, is_default: false, sort_order: 100 }]);
        setFeedback({ kind: 'success', text: 'Categoria criada.' });
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
        setCategories((prev) => prev.map((c) => c.id === editingId ? { ...c, ...d.data } : c));
        setFeedback({ kind: 'success', text: 'Categoria atualizada.' });
        setEditingId(null);
        resetForm();
      }
    } catch (e) {
      setFeedback({ kind: 'error', text: e instanceof Error ? e.message : 'Erro ao salvar.' });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setCategories((prev) => prev.filter((c) => c.id !== id));
      setFeedback({ kind: 'success', text: 'Categoria excluída.' });
      setDeletingId(null);
    } catch (e) {
      setFeedback({ kind: 'error', text: e instanceof Error ? e.message : 'Erro ao excluir.' });
    } finally {
      setSaving(false);
    }
  }

  const isFormValid = formData.name.trim().length > 0;

  return (
    <div className="max-w-lg mx-auto px-4 pb-24">
      {/* Header */}
      <header className="flex items-center gap-3 py-5">
        <Link
          href="/perfil"
          className="flex items-center justify-center w-8 h-8 rounded-full text-[#6B7280] hover:bg-[#F1F3F7] transition-colors"
          aria-label="Voltar"
        >
          <CaretLeft size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-heading text-[#1A1D23]">Gerenciar categorias</h1>
          <p className="text-xs text-[#6B7280] mt-0.5">{categories.length} categorias</p>
        </div>
      </header>

      {/* Error state */}
      {error && (
        <div className="bg-[#FDF0F0] border border-[#F4D7D7] rounded-[12px] p-4 mb-4">
          <p className="text-sm font-medium text-[#B14C4C]">{error}</p>
          <button
            type="button"
            onClick={fetchCategories}
            className="mt-2 text-xs font-semibold text-[#E07070] hover:underline"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center py-16 text-center">
          <span className="w-6 h-6 border-2 border-[#A8C5E0] border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-sm text-[#6B7280]">Carregando categorias…</p>
        </div>
      )}

      {/* Category list */}
      {!loading && !error && (
        <div className="space-y-2 mb-6">
          {categories.map((cat) => {
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
                      className="flex-1 py-2.5 rounded-[10px] text-xs font-bold text-white bg-[#E07070] disabled:opacity-60"
                    >
                      {saving ? 'Excluindo…' : 'Confirmar exclusão'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingId(null)}
                      disabled={saving}
                      className="px-5 py-2.5 rounded-[10px] text-xs font-bold text-[#6B7280] border border-[#E5E7EB] disabled:opacity-60"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              );
            }

            if (isEditing) {
              return (
                <div
                  key={cat.id}
                  className="bg-white rounded-[12px] p-4"
                  style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
                >
                  {renderForm()}
                </div>
              );
            }

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => startEdit(cat)}
                className="w-full bg-white rounded-[12px] p-3.5 flex items-center gap-3 text-left hover:bg-[#F8F9FB] transition-colors group"
                style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
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

      {/* Create form */}
      {creating && (
        <div
          className="bg-white rounded-[12px] p-4 mb-6"
          style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
        >
          {renderForm()}
        </div>
      )}

      {/* Add button */}
      {!creating && !loading && !error && (
        <button
          type="button"
          onClick={startCreate}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-[12px] text-sm font-semibold text-[#A8C5E0] border border-dashed border-[#D1D9E6] hover:border-[#A8C5E0] hover:bg-[#F8F9FB] transition-colors"
        >
          <Plus size={18} />
          Nova categoria
        </button>
      )}

      {/* Feedback toast */}
      {feedback && (
        <div
          role={feedback.kind === 'error' ? 'alert' : 'status'}
          className={`fixed bottom-20 left-4 right-4 z-50 rounded-[16px] px-5 py-4 shadow-lg animate-fade-up ${
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

  function renderForm() {
    return (
      <div className="space-y-4">
        {/* Name */}
        <div>
          <label className="block text-xs font-medium text-[#6B7280] mb-1.5">Nome</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
            placeholder="Ex: Assinaturas"
            maxLength={40}
            className="w-full px-3 py-2.5 rounded-[10px] bg-[#F8F9FB] border border-[#E5E7EB] text-sm text-[#1A1D23] placeholder:text-[#9CA3AF] outline-none focus:border-[#A8C5E0] transition-colors"
          />
          {creating && formData.name.trim().length > 0 && (
            <p className="text-[10px] text-[#9CA3AF] mt-1">
              ID: <span className="font-mono">{slugify(formData.name)}</span>
            </p>
          )}
        </div>

        {/* Icon picker */}
        <div>
          <label className="block text-xs font-medium text-[#6B7280] mb-1.5">Ícone</label>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORY_ICONS.map((iconName) => (
              <button
                key={iconName}
                type="button"
                onClick={() => setFormData((p) => ({ ...p, icon: iconName }))}
                className={`w-9 h-9 rounded-[10px] flex items-center justify-center transition-all duration-75 ${
                  formData.icon === iconName
                    ? 'bg-[#1A1D23] text-white scale-105'
                    : 'bg-[#F1F3F7] text-[#6B7280] hover:bg-[#E5E7EB]'
                }`}
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
                className={`w-7 h-7 rounded-full transition-all duration-75 flex items-center justify-center ${
                  formData.color === hex ? 'ring-2 ring-offset-2 ring-[#1A1D23] scale-110' : ''
                }`}
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
              className="px-3 py-2 rounded-[10px] text-xs font-semibold text-white bg-[#A8C5E0] disabled:opacity-40"
            >
              Adicionar
            </button>
          </div>
          {formData.keywords.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {formData.keywords.map((kw) => (
                <span
                  key={kw}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium bg-[#F1F3F7] text-[#6B7280]"
                >
                  {kw}
                  <button
                    type="button"
                    onClick={() => removeKeyword(kw)}
                    className="hover:text-[#E07070] transition-colors"
                    aria-label={`Remover ${kw}`}
                  >
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={handleSave}
            disabled={!isFormValid || saving}
            className="flex-1 py-2.5 rounded-[10px] text-sm font-bold text-white bg-[#5BBF8E] disabled:opacity-40 transition-opacity"
          >
            {saving ? 'Salvando…' : creating ? 'Criar categoria' : 'Salvar'}
          </button>
          <button
            type="button"
            onClick={cancelEdit}
            disabled={saving}
            className="px-5 py-2.5 rounded-[10px] text-sm font-bold text-[#6B7280] border border-[#E5E7EB] disabled:opacity-60"
          >
            Cancelar
          </button>
          {editingId && !categories.find((c) => c.id === editingId)?.is_default && (
            <button
              type="button"
              onClick={() => { setDeletingId(editingId); setEditingId(null); }}
              disabled={saving}
              className="px-3 py-2.5 rounded-[10px] text-sm font-bold text-[#E07070] border border-[#F4D7D7] hover:bg-[#FDF0F0] transition-colors disabled:opacity-60"
              aria-label="Excluir categoria"
            >
              <Trash size={16} />
            </button>
          )}
        </div>
      </div>
    );
  }
}
