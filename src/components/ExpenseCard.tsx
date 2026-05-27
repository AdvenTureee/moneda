'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { DotsThree, Eye, Paperclip, PencilSimple, Trash, X } from '@phosphor-icons/react';
import Icon from '@/components/Icon';
import ReceiptViewerModal from '@/components/ReceiptViewerModal';
import { useToast } from '@/components/ToastProvider';
import { formatCurrency, formatDate, formatTime } from '@/lib/utils';
import type { Expense } from '@/types';
import type { MouseEvent } from 'react';

interface ExpenseCardProps {
  expense: Expense;
  variant?: 'compact' | 'full';
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onReceiptChanged?: () => void;
}

export default function ExpenseCard({
  expense,
  variant = 'full',
  onClick,
  onEdit,
  onDelete,
  onReceiptChanged,
}: ExpenseCardProps) {
  const category = expense.categoryData;
  const isCompact = variant === 'compact';
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const [receiptBusy, setReceiptBusy] = useState(false);
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const { showToast } = useToast();

  const hasCardActions = Boolean(onEdit || onDelete);
  const shouldShowMenu = Boolean(expense.receipt || onReceiptChanged || hasCardActions);
  const menuItemClass =
    'group flex min-h-10 w-full items-center gap-3 rounded-[11px] px-3.5 text-left text-sm font-medium text-[#F5F7FA] transition-[background,color,transform] duration-150 hover:bg-white/[0.075] active:scale-[0.985] disabled:opacity-50';
  const menuItemDangerClass =
    'group flex min-h-10 w-full items-center gap-3 rounded-[11px] px-3.5 text-left text-sm font-medium text-[#F28B8B] transition-[background,color,transform] duration-150 hover:bg-[#E07070]/12 active:scale-[0.985] disabled:opacity-50';
  const menuIconClass = 'shrink-0 text-[#9FB0C4] transition-colors group-hover:text-[#D7E2EF]';
  const menuDangerIconClass = 'shrink-0 text-[#F28B8B] transition-colors group-hover:text-[#FFB0B0]';

  function placeMenu() {
    const trigger = menuButtonRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const width = Math.min(264, window.innerWidth - 16);
    const actionsCount =
      (expense.receipt ? 3 : 1) + (!isCompact && onEdit ? 1 : 0) + (!isCompact && onDelete ? 1 : 0);
    const estimatedHeight = actionsCount * 40 + (!isCompact && hasCardActions ? 9 : 0) + 12;
    const left = Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8));
    const below = rect.bottom + 8;
    const top =
      below + estimatedHeight > window.innerHeight - 8
        ? Math.max(8, rect.top - estimatedHeight - 8)
        : below;

    setMenuPosition({ top, left });
  }

  function openActionMenu(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    placeMenu();
    setMenuOpen(true);
  }

  function closeActionMenu() {
    setMenuOpen(false);
  }

  function runMenuAction(action: () => void | Promise<void>) {
    closeActionMenu();
    void action();
  }

  useEffect(() => {
    if (!menuOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') closeActionMenu();
    }

    function handleViewportChange() {
      placeMenu();
    }

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
    };
  }, [menuOpen]);

  async function uploadReceipt(file: File) {
    setReceiptBusy(true);
    try {
      const formData = new FormData();
      formData.set('expenseId', expense.id);
      formData.set('file', file);
      const res = await fetch('/api/expenses/receipt', { method: 'POST', body: formData });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Não foi possível anexar o comprovante.');
      showToast('success', expense.receipt ? 'Comprovante atualizado' : 'Comprovante anexado');
      onReceiptChanged?.();
      window.dispatchEvent(new CustomEvent('expense-mutated'));
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'Erro ao anexar comprovante');
    } finally {
      setReceiptBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function openReceipt() {
    if (!expense.receipt) return;
    setReceiptBusy(true);
    try {
      const res = await fetch(`/api/expenses/receipt?expenseId=${expense.id}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) throw new Error(data.error ?? 'Não foi possível abrir o comprovante.');
      setReceiptPreviewUrl(data.url);
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'Erro ao abrir comprovante');
    } finally {
      setReceiptBusy(false);
    }
  }

  async function removeReceipt() {
    if (!expense.receipt) return;
    setReceiptBusy(true);
    try {
      const res = await fetch(`/api/expenses/receipt?expenseId=${expense.id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Não foi possível remover o comprovante.');
      showToast('success', 'Comprovante removido');
      onReceiptChanged?.();
      window.dispatchEvent(new CustomEvent('expense-mutated'));
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'Erro ao remover comprovante');
    } finally {
      setReceiptBusy(false);
    }
  }

  return (
    <>
      <div
        className={`themed-card w-full flex items-center gap-3 bg-white rounded-[10px] transition-all duration-75 ${
          isCompact ? 'px-3 py-2.5' : 'px-4 py-3'
        }`}
        role="group"
        aria-label={`${expense.description}, ${formatCurrency(expense.amount)}`}
      >
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) uploadReceipt(file);
        }}
      />
      <button
        onClick={onClick}
        className="flex items-center gap-3 flex-1 min-w-0 text-left"
      >
        <div
          className="flex items-center justify-center shrink-0 rounded-full text-lg"
          style={{
            width: isCompact ? 36 : 40,
            height: isCompact ? 36 : 40,
            backgroundColor: category ? `${category.color}22` : '#6B728022',
          }}
          aria-hidden
        >
          <Icon name={category?.icon ?? 'Package'} size={20} color={category?.color ?? '#6B7280'} />
        </div>

        <div className="flex-1 min-w-0">
          <p
            className={`font-medium text-[#1A1D23] truncate ${
              isCompact ? 'text-sm' : 'text-[15px]'
            }`}
          >
            {expense.description}
          </p>
          <p className="text-xs text-[#6B7280] mt-0.5">
            {category?.name ?? 'Outros'} · {formatTime(new Date(expense.createdAt))}
          </p>
        </div>

        <div className="flex flex-col items-end shrink-0">
          {isCompact && (
            <span className="text-[11px] text-[#9CA3AF] mb-0.5">
              {formatDate(new Date(expense.createdAt))}
            </span>
          )}
          <span
            className={`font-semibold tabular-nums ${
              isCompact ? 'text-sm' : 'text-[15px]'
            } text-[#E07070]`}
          >
            −{formatCurrency(expense.amount)}
          </span>
        </div>
      </button>

      {shouldShowMenu && (
        <button
          ref={menuButtonRef}
          type="button"
          onClick={openActionMenu}
          disabled={receiptBusy}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F1F3F7]/70 text-[#6B7280] transition-colors hover:bg-[#E9EDF3] active:scale-95 disabled:opacity-50 dark:bg-white/8 dark:text-[#CBD5E1] dark:hover:bg-white/12"
          aria-label="Mais opções do gasto"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
        >
          <DotsThree size={22} weight="bold" />
        </button>
      )}
      </div>

      {menuOpen && typeof document !== 'undefined' && createPortal(
        <>
          <button
            type="button"
            className="fixed inset-0 z-[80] cursor-default bg-transparent"
            aria-label="Fechar menu de opções"
            onClick={closeActionMenu}
          />
          <div
            role="menu"
            className="fixed z-[81] max-h-[calc(100dvh-16px)] w-[min(264px,calc(100vw-16px))] overflow-y-auto rounded-[18px] border border-white/[0.07] bg-[linear-gradient(180deg,rgba(23,30,39,0.98)_0%,rgba(14,19,26,0.98)_100%)] p-1.5 shadow-[0_16px_34px_rgba(2,6,23,0.32),inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-xl"
            style={{ top: menuPosition.top, left: menuPosition.left }}
            onClick={(event) => event.stopPropagation()}
          >
            {expense.receipt ? (
              <>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => runMenuAction(openReceipt)}
                  disabled={receiptBusy}
                  className={menuItemClass}
                >
                  <Eye size={17} className={menuIconClass} />
                  Ver comprovante
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => runMenuAction(() => fileInputRef.current?.click())}
                  disabled={receiptBusy}
                  className={menuItemClass}
                >
                  <Paperclip size={17} className={menuIconClass} />
                  Trocar comprovante
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => runMenuAction(removeReceipt)}
                  disabled={receiptBusy}
                  className={menuItemDangerClass}
                >
                  <X size={17} className={menuDangerIconClass} />
                  Remover comprovante
                </button>
              </>
            ) : (
              <button
                type="button"
                role="menuitem"
                onClick={() => runMenuAction(() => fileInputRef.current?.click())}
                disabled={receiptBusy}
                className={menuItemClass}
              >
                <Paperclip size={17} className={menuIconClass} />
                Adicionar comprovante
              </button>
            )}

            {!isCompact && hasCardActions && (
              <div className="my-1.5 h-px bg-white/[0.075]" />
            )}

            {!isCompact && onEdit && (
              <button
                type="button"
                role="menuitem"
                onClick={() => runMenuAction(onEdit)}
                className={menuItemClass}
              >
                <PencilSimple size={17} className={menuIconClass} />
                Editar gasto
              </button>
            )}

            {!isCompact && onDelete && (
              <button
                type="button"
                role="menuitem"
                onClick={() => runMenuAction(onDelete)}
                className={menuItemDangerClass}
              >
                <Trash size={17} className={menuDangerIconClass} />
                Excluir gasto
              </button>
            )}
          </div>
        </>,
        document.body
      )}

      <ReceiptViewerModal
        isOpen={receiptPreviewUrl !== null}
        onClose={() => setReceiptPreviewUrl(null)}
        url={receiptPreviewUrl}
        fileName={expense.receipt?.fileName ?? 'Comprovante'}
        mimeType={expense.receipt?.mimeType ?? 'application/octet-stream'}
      />
    </>
  );
}
