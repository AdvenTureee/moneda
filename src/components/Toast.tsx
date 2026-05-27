'use client';

import { useEffect } from 'react';
import { CheckCircle, X, XCircle } from '@phosphor-icons/react';

interface ToastProps {
  kind: 'success' | 'error';
  text: string;
  onClose: () => void;
  duration?: number;
}

export default function Toast({ kind, text, onClose, duration = 3000 }: ToastProps) {
  useEffect(() => {
    if (duration <= 0) return;
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const IconComponent = kind === 'success' ? CheckCircle : XCircle;

  return (
    <div
      role={kind === 'error' ? 'alert' : 'status'}
      aria-live="polite"
      className={`toast-body toast-body--${kind}`}
    >
      <IconComponent size={20} weight="fill" className="shrink-0" />
      <p className="toast-text">{text}</p>
      <button
        type="button"
        onClick={onClose}
        className="toast-close-btn"
        aria-label="Fechar"
      >
        <X size={14} />
      </button>
    </div>
  );
}
