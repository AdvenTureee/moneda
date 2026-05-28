'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ShieldCheck, X } from '@phosphor-icons/react';
import {
  TERMS_CONTACT_EMAIL,
  TERMS_SECTIONS,
  TERMS_SUMMARY,
  TERMS_UPDATED_LABEL,
  TERMS_VERSION,
  type TermsBlock,
} from '@/lib/legal';

interface TermsModalProps {
  isOpen: boolean;
  onClose?: () => void;
  mode?: 'read' | 'accept';
  onAccept?: () => void;
  acceptLoading?: boolean;
  acceptError?: string;
}

function renderBlock(block: TermsBlock) {
  if (block.type === 'paragraph') {
    const emailPrefix = 'E-mail: ';
    if (block.text.startsWith(emailPrefix)) {
      const email = block.text.slice(emailPrefix.length);
      return (
        <p className="terms-modal-body text-sm leading-relaxed">
          <strong>E-mail:</strong>{' '}
          <a className="terms-modal-link" href={`mailto:${email}`}>
            {email}
          </a>
        </p>
      );
    }

    return <p className="terms-modal-body text-sm leading-relaxed">{block.text}</p>;
  }

  if (block.type === 'subheading') {
    return <h4 className="terms-modal-subheading text-sm font-semibold">{block.text}</h4>;
  }

  if (block.type === 'list') {
    return (
      <ul className="terms-modal-list list-disc space-y-1 pl-5 text-sm leading-relaxed">
        {block.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    );
  }

  if (block.type === 'note') {
    return <blockquote className="terms-modal-note text-sm leading-relaxed">{block.text}</blockquote>;
  }

  if (block.type === 'highlight') {
    return <p className="terms-modal-highlight text-sm font-semibold">{block.text}</p>;
  }

  return (
    <div className="terms-modal-table-wrap">
      <table className="terms-modal-table text-sm">
        <thead>
          <tr>
            {block.headers.map((header) => (
              <th key={header}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row) => (
            <tr key={row.join('|')}>
              {row.map((cell, index) => (
                <td key={`${cell}-${index}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function TermsModal({
  isOpen,
  onClose,
  mode = 'read',
  onAccept,
  acceptLoading = false,
  acceptError = '',
}: TermsModalProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [hasReachedEnd, setHasReachedEnd] = useState(false);
  const canClose = Boolean(onClose);
  const requiresAccept = mode === 'accept';

  const updateReachedEnd = useCallback(() => {
    const element = scrollRef.current;
    if (!element) return;
    const distanceToBottom = element.scrollHeight - element.scrollTop - element.clientHeight;
    setHasReachedEnd(distanceToBottom <= 24);
  }, []);

  const scrollToEnd = useCallback(() => {
    const element = scrollRef.current;
    if (!element) return;
    element.scrollTo({ top: element.scrollHeight, behavior: 'smooth' });
  }, []);

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

  const requestClose = useCallback(() => {
    if (!onClose) return;
    setIsClosing(true);
    window.setTimeout(onClose, 180);
  }, [onClose]);

  useEffect(() => {
    if (!isOpen || !canClose) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') requestClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canClose, isOpen, requestClose]);

  useEffect(() => {
    if (!isOpen) return;
    setConfirmed(false);
    setHasReachedEnd(false);
    window.setTimeout(updateReachedEnd, 80);
  }, [isOpen, updateReachedEnd]);

  useEffect(() => {
    if (!isOpen) return;
    const element = scrollRef.current;
    if (!element) return;
    updateReachedEnd();
    element.addEventListener('scroll', updateReachedEnd, { passive: true });
    window.addEventListener('resize', updateReachedEnd);
    return () => {
      element.removeEventListener('scroll', updateReachedEnd);
      window.removeEventListener('resize', updateReachedEnd);
    };
  }, [isOpen, shouldRender, updateReachedEnd]);

  if (!mounted || !shouldRender) return null;

  return createPortal(
    <div
      className="modal-wave-backdrop fixed inset-0 z-[90] flex items-center justify-center p-3 sm:p-6"
      data-state={isClosing ? 'closing' : 'open'}
      onClick={(event) => {
        if (event.target === event.currentTarget && canClose) requestClose();
      }}
    >
      <section
        className="terms-modal-panel modal-panel-pop flex h-full max-h-[88dvh] w-full max-w-2xl flex-col overflow-hidden rounded-[22px] shadow-2xl"
        role="dialog"
        aria-modal
        aria-labelledby="terms-modal-title"
      >
        <header className="terms-modal-header flex shrink-0 items-start gap-3 px-5 py-4">
          <div className="terms-modal-icon mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
            <ShieldCheck size={22} weight="bold" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="terms-modal-kicker text-xs font-semibold uppercase tracking-[0.14em]">
              Proteção de dados
            </p>
            <h2 id="terms-modal-title" className="terms-modal-title mt-1 text-lg font-heading">
              Privacidade e Termos de Uso
            </h2>
            <p className="terms-modal-meta mt-1 text-xs">
              Versão {TERMS_VERSION} - Atualizado em {TERMS_UPDATED_LABEL}
            </p>
          </div>
          {canClose && (
            <button
              type="button"
              onClick={requestClose}
              className="terms-modal-close flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
              aria-label="Fechar termos"
            >
              <X size={18} />
            </button>
          )}
        </header>

        <div
          ref={scrollRef}
          onScroll={updateReachedEnd}
          className="relative min-h-0 flex-1 overflow-y-auto px-5 py-4"
        >
          <div className="terms-modal-summary rounded-[16px] p-4">
            <p className="terms-modal-summary-title text-sm font-semibold">Resumo de privacidade</p>
            {TERMS_SUMMARY.map((paragraph) => (
              <p key={paragraph} className="terms-modal-summary-body mt-1 text-sm leading-relaxed">
                {paragraph}
              </p>
            ))}
            <p className="terms-modal-summary-body mt-2 text-sm leading-relaxed">
              <strong>Contato:</strong>{' '}
              <a className="terms-modal-link" href={`mailto:${TERMS_CONTACT_EMAIL}`}>
                {TERMS_CONTACT_EMAIL}
              </a>
            </p>
          </div>

          <div className="mt-5 space-y-5">
            {TERMS_SECTIONS.map((section) => (
              <section key={section.title}>
                <h3 className="terms-modal-section-title text-sm font-semibold">{section.title}</h3>
                <div className="mt-2 space-y-2">
                  {section.blocks.map((block, index) => (
                    <div key={`${section.title}-${index}`}>{renderBlock(block)}</div>
                  ))}
                </div>
              </section>
            ))}
          </div>

          {!hasReachedEnd && (
            <div className="terms-modal-scroll-cta-wrap pointer-events-none sticky bottom-3 z-10 mt-4 flex justify-end">
              <button
                type="button"
                onClick={scrollToEnd}
                className="terms-modal-scroll-cta pointer-events-auto rounded-full px-4 py-2 text-xs font-semibold shadow-lg transition-transform active:scale-[0.98] sm:text-sm"
              >
                Rolar até o final
              </button>
            </div>
          )}
        </div>

        <footer className="terms-modal-footer shrink-0 px-5 py-4">
          {requiresAccept ? (
            <div className="space-y-3">
              <label
                className="terms-modal-checkbox-row flex items-start gap-3 rounded-[14px] p-3"
                aria-disabled={!hasReachedEnd}
              >
                <input
                  type="checkbox"
                  checked={confirmed}
                  disabled={!hasReachedEnd}
                  onChange={(event) => {
                    if (!hasReachedEnd) return;
                    setConfirmed(event.target.checked);
                  }}
                  className="mt-1 h-4 w-4 accent-[#5BBF8E]"
                />
                <span className="terms-modal-checkbox-text text-sm leading-relaxed">
                  {hasReachedEnd
                    ? 'Li e aceito os Termos de Uso e a Política de Proteção de Dados do Moneda.'
                    : 'Role até o final dos termos para habilitar o aceite.'}
                </span>
              </label>
              {acceptError && (
                <p className="text-xs font-medium text-[#E07070]" role="alert">
                  {acceptError}
                </p>
              )}
              <button
                type="button"
                onClick={onAccept}
                disabled={!confirmed || acceptLoading}
                className="terms-modal-accept w-full rounded-[12px] py-3 text-sm font-semibold transition-colors active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                style={{ boxShadow: '0 4px 14px rgba(91, 191, 142, 0.3)' }}
              >
                {acceptLoading ? 'Registrando aceite...' : 'Aceitar e continuar'}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={requestClose}
              className="terms-modal-accept w-full rounded-[12px] py-3 text-sm font-semibold transition-colors active:scale-[0.99]"
            >
              Entendi
            </button>
          )}
        </footer>
      </section>
    </div>,
    document.body,
  );
}
