'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle, CircleNotch, X, XCircle } from '@phosphor-icons/react';

type ToastKind = 'success' | 'error' | 'info';

interface ToastState {
  kind: ToastKind;
  text: string;
  id: number;
}

interface ToastContextValue {
  showToast: (kind: ToastKind, text: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const idRef = useRef(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const hideToast = useCallback(() => setToast(null), []);

  const showToast = useCallback(
    (kind: ToastKind, text: string) => {
      idRef.current += 1;
      setToast({ kind, text, id: idRef.current });
    },
    []
  );

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(hideToast, 3000);
    return () => clearTimeout(timer);
  }, [toast, hideToast]);

  const IconComponent =
    toast?.kind === 'error'
      ? XCircle
      : toast?.kind === 'info'
        ? CircleNotch
        : CheckCircle;

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {mounted && toast && createPortal(
        <div
          key={toast.id}
          role={toast.kind === 'error' ? 'alert' : 'status'}
          aria-live="polite"
          className={`toast-body toast-body--${toast.kind}`}
        >
          <IconComponent
            size={20}
            weight={toast.kind === 'info' ? 'bold' : 'fill'}
            className={`shrink-0 ${toast.kind === 'info' ? 'toast-spin' : ''}`}
          />
          <p className="toast-text">{toast.text}</p>
          <button
            type="button"
            onClick={hideToast}
            className="toast-close-btn"
            aria-label="Fechar"
          >
            <X size={14} />
          </button>
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used inside ToastProvider');
  }
  return context;
}
