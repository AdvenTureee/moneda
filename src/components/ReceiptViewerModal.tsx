'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowSquareOut, DownloadSimple, FileText, X } from '@phosphor-icons/react';

interface ReceiptViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string | null;
  fileName: string;
  mimeType: string;
}

export default function ReceiptViewerModal({
  isOpen,
  onClose,
  url,
  fileName,
  mimeType,
}: ReceiptViewerModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!isOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!mounted || !isOpen || !url) return null;

  const isImage = mimeType.startsWith('image/');
  const isPdf = mimeType === 'application/pdf';

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 p-3 sm:p-6"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="flex h-full max-h-[88dvh] w-full max-w-3xl flex-col overflow-hidden rounded-[18px] bg-white shadow-2xl"
        role="dialog"
        aria-modal
        aria-label="Comprovante do gasto"
      >
        <header className="flex shrink-0 items-center gap-3 border-b border-[#E5E7EB] px-4 py-3">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <FileText size={18} className="shrink-0 text-[#7AAECF]" />
            <div className="min-w-0">
              <h2 className="truncate text-sm font-semibold text-[#1A1D23]">Comprovante</h2>
              <p className="truncate text-xs text-[#6B7280]">{fileName}</p>
            </div>
          </div>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-[#F1F3F7]"
            aria-label="Abrir em nova aba"
          >
            <ArrowSquareOut size={18} className="text-[#6B7280]" />
          </a>
          <a
            href={url}
            download={fileName}
            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-[#F1F3F7]"
            aria-label="Baixar comprovante"
          >
            <DownloadSimple size={18} className="text-[#6B7280]" />
          </a>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-[#F1F3F7]"
            aria-label="Fechar"
          >
            <X size={18} className="text-[#6B7280]" />
          </button>
        </header>

        <div className="min-h-0 flex-1 bg-[#10151C]">
          {isImage ? (
            <div className="flex h-full items-center justify-center overflow-auto p-3">
              <img
                src={url}
                alt={`Comprovante ${fileName}`}
                className="max-h-full max-w-full rounded-[10px] object-contain"
              />
            </div>
          ) : isPdf ? (
            <iframe
              src={url}
              title={`Comprovante ${fileName}`}
              className="h-full w-full border-0 bg-white"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center p-6 text-center text-white">
              <FileText size={48} className="mb-3 opacity-70" />
              <p className="text-sm font-semibold">Pré-visualização indisponível</p>
              <p className="mt-1 max-w-[260px] text-xs text-white/70">
                Este formato pode ser aberto em uma nova aba ou baixado.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>,
    document.body,
  );
}
