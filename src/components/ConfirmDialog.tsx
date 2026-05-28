'use client';

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'default';
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'default',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [mounted, setMounted] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      setIsClosing(false);
      return;
    }
    if (!shouldRender) return;
    setIsClosing(true);
    const timer = window.setTimeout(() => {
      setShouldRender(false);
      setIsClosing(false);
    }, 180);
    return () => window.clearTimeout(timer);
  }, [isOpen, shouldRender]);

  const requestCancel = useCallback(() => {
    setIsClosing(true);
    window.setTimeout(onCancel, 180);
  }, [onCancel]);

  if (!shouldRender || !mounted) return null;

  return createPortal(
    <div
      className="modal-wave-backdrop fixed inset-0 z-[60] flex items-center justify-center p-6"
      data-state={isClosing ? 'closing' : 'open'}
      onClick={(e) => { if (e.target === e.currentTarget) requestCancel(); }}
    >
      <div
        className="modal-panel-pop w-full max-w-sm bg-white rounded-[20px] p-6"
        role="alertdialog"
        aria-modal
        aria-label={title}
      >
        <h3 className="text-lg font-semibold text-[#1A1D23] mb-2">
          {title}
        </h3>
        <p className="text-sm text-[#6B7280] leading-relaxed mb-6">
          {message}
        </p>
        <div className="flex gap-2">
          <button
            onClick={requestCancel}
            className="flex-1 rounded-full py-3 text-sm font-semibold text-[#6B7280] bg-[#F1F3F7] hover:bg-[#E5E7EB] transition-colors active:scale-[0.97]"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-full py-3 text-sm font-semibold text-white transition-colors active:scale-[0.97]"
            style={{
              background: variant === 'danger' ? '#E07070' : '#5BBF8E',
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
