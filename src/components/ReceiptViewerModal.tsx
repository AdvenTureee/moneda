'use client';

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowSquareOut, DownloadSimple, FileText, X } from '@phosphor-icons/react';

type TransferProgress = {
  loaded: number;
  total: number | null;
};

type PreviewAsset = {
  blob: Blob;
  objectUrl: string;
};

interface ReceiptViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string | null;
  fileName: string;
  mimeType: string;
  sizeBytes?: number;
}

export default function ReceiptViewerModal({
  isOpen,
  onClose,
  url,
  fileName,
  mimeType,
  sizeBytes,
}: ReceiptViewerModalProps) {
  const [mounted, setMounted] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [previewAsset, setPreviewAsset] = useState<PreviewAsset | null>(null);
  const [previewProgress, setPreviewProgress] = useState<TransferProgress | null>(null);
  const [previewError, setPreviewError] = useState('');
  const [downloadProgress, setDownloadProgress] = useState<TransferProgress | null>(null);
  const [downloadError, setDownloadError] = useState('');

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (isOpen && url) {
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
  }, [isOpen, shouldRender, url]);

  const requestClose = useCallback(() => {
    setIsClosing(true);
    window.setTimeout(onClose, 180);
  }, [onClose]);

  useEffect(() => {
    if (!isOpen || !url) {
      setPreviewProgress(null);
      setPreviewError('');
      setPreviewAsset((asset) => {
        if (asset) URL.revokeObjectURL(asset.objectUrl);
        return null;
      });
      return;
    }

    const controller = new AbortController();
    let objectUrl: string | null = null;

    setPreviewError('');
    setDownloadError('');
    setPreviewAsset((asset) => {
      if (asset) URL.revokeObjectURL(asset.objectUrl);
      return null;
    });
    setPreviewProgress({ loaded: 0, total: sizeBytes && sizeBytes > 0 ? sizeBytes : null });

    fetchReceiptBlob({
      url,
      mimeType,
      sizeBytes,
      signal: controller.signal,
      onProgress: setPreviewProgress,
    })
      .then((blob) => {
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(blob);
        setPreviewAsset({ blob, objectUrl });
        setPreviewProgress(null);
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setPreviewProgress(null);
        setPreviewError('Nao foi possivel carregar o comprovante.');
      });

    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setPreviewProgress(null);
    };
  }, [isOpen, mimeType, sizeBytes, url]);

  const downloadReceipt = useCallback(async () => {
    if (!url || downloadProgress || previewProgress) return;

    setDownloadError('');

    if (previewAsset) {
      saveBlob(previewAsset.blob, fileName);
      return;
    }

    setDownloadProgress({ loaded: 0, total: sizeBytes && sizeBytes > 0 ? sizeBytes : null });

    try {
      const blob = await fetchReceiptBlob({
        url,
        mimeType,
        sizeBytes,
        onProgress: setDownloadProgress,
      });
      saveBlob(blob, fileName);
      setDownloadProgress(null);
    } catch {
      setDownloadProgress(null);
      setDownloadError('Nao foi possivel baixar o comprovante.');
    }
  }, [downloadProgress, fileName, mimeType, previewAsset, previewProgress, sizeBytes, url]);

  useEffect(() => {
    if (!isOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') requestClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, requestClose]);

  if (!mounted || !shouldRender || !url) return null;

  const isImage = mimeType.startsWith('image/');
  const isPdf = mimeType === 'application/pdf';
  const progressPercent = downloadProgress?.total
    ? Math.min(100, Math.round((downloadProgress.loaded / downloadProgress.total) * 100))
    : null;
  const progressLabel = downloadProgress
    ? progressPercent !== null
      ? `${progressPercent}%`
      : `${formatBytes(downloadProgress.loaded)} baixados`
    : '';
  const previewPercent = previewProgress?.total
    ? Math.min(100, Math.round((previewProgress.loaded / previewProgress.total) * 100))
    : null;
  const previewLabel = previewProgress
    ? previewPercent !== null
      ? `${previewPercent}%`
      : `${formatBytes(previewProgress.loaded)} baixados`
    : '';

  return createPortal(
    <div
      className="modal-wave-backdrop fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-6"
      data-state={isClosing ? 'closing' : 'open'}
      onClick={(event) => {
        if (event.target === event.currentTarget) requestClose();
      }}
    >
      <section
        className="modal-panel-pop flex h-full max-h-[88dvh] w-full max-w-3xl flex-col overflow-hidden rounded-[18px] bg-white shadow-2xl"
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
          <button
            type="button"
            onClick={downloadReceipt}
            disabled={downloadProgress !== null || previewProgress !== null}
            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-[#F1F3F7] disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Baixar comprovante"
            aria-busy={downloadProgress !== null || previewProgress !== null}
          >
            <DownloadSimple size={18} className="text-[#6B7280]" />
          </button>
          <button
            type="button"
            onClick={requestClose}
            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-[#F1F3F7]"
            aria-label="Fechar"
          >
            <X size={18} className="text-[#6B7280]" />
          </button>
        </header>
        {(downloadProgress || downloadError) && (
          <div className="shrink-0 border-b border-[#E5E7EB] bg-white px-4 py-2">
            {downloadProgress ? (
              <>
                <div className="flex items-center justify-between gap-3 text-xs font-semibold text-[#6B7280]">
                  <span>Baixando comprovante</span>
                  <span className="tabular-nums">{progressLabel}</span>
                </div>
                <div
                  className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#EEF2F7]"
                  role="progressbar"
                  aria-label="Progresso do download do comprovante"
                  aria-valuemin={0}
                  aria-valuemax={progressPercent !== null ? 100 : undefined}
                  aria-valuenow={progressPercent ?? undefined}
                >
                  <div
                    className={`h-full rounded-full bg-[#5BBF8E] transition-[width] duration-100 ${
                      progressPercent === null ? 'animate-pulse' : ''
                    }`}
                    style={{ width: progressPercent !== null ? `${progressPercent}%` : '42%' }}
                  />
                </div>
              </>
            ) : (
              <p className="text-xs font-semibold text-[#C94F4F]">{downloadError}</p>
            )}
          </div>
        )}

        <div className="min-h-0 flex-1 bg-[#10151C]">
          {previewProgress ? (
            <div className="flex h-full flex-col items-center justify-center p-6 text-center text-white">
              <FileText size={48} className="mb-4 opacity-70" />
              <p className="text-sm font-semibold">Carregando comprovante</p>
              <p className="mt-1 text-xs text-white/60">{previewLabel}</p>
              <div
                className="mt-4 h-1.5 w-full max-w-[280px] overflow-hidden rounded-full bg-white/15"
                role="progressbar"
                aria-label="Progresso de carregamento do comprovante"
                aria-valuemin={0}
                aria-valuemax={previewPercent !== null ? 100 : undefined}
                aria-valuenow={previewPercent ?? undefined}
              >
                <div
                  className={`h-full rounded-full bg-[#5BBF8E] transition-[width] duration-100 ${
                    previewPercent === null ? 'animate-pulse' : ''
                  }`}
                  style={{ width: previewPercent !== null ? `${previewPercent}%` : '42%' }}
                />
              </div>
            </div>
          ) : previewError ? (
            <div className="flex h-full flex-col items-center justify-center p-6 text-center text-white">
              <FileText size={48} className="mb-3 opacity-70" />
              <p className="text-sm font-semibold">{previewError}</p>
              <p className="mt-1 max-w-[260px] text-xs text-white/70">
                Tente abrir em uma nova aba ou baixar novamente.
              </p>
            </div>
          ) : isImage && previewAsset ? (
            <div className="flex h-full items-center justify-center overflow-auto p-3">
              <img
                src={previewAsset.objectUrl}
                alt={`Comprovante ${fileName}`}
                className="max-h-full max-w-full rounded-[10px] object-contain"
              />
            </div>
          ) : isPdf && previewAsset ? (
            <iframe
              src={previewAsset.objectUrl}
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

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(kb >= 100 ? 0 : 1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(mb >= 100 ? 0 : 1)} MB`;
}

async function fetchReceiptBlob({
  url,
  mimeType,
  sizeBytes,
  signal,
  onProgress,
}: {
  url: string;
  mimeType: string;
  sizeBytes?: number;
  signal?: AbortSignal;
  onProgress: (progress: TransferProgress) => void;
}) {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error('receipt fetch failed');

  const headerTotal = Number(response.headers.get('content-length'));
  const total = Number.isFinite(headerTotal) && headerTotal > 0
    ? headerTotal
    : sizeBytes && sizeBytes > 0
      ? sizeBytes
      : null;

  const reader = response.body?.getReader();
  if (!reader) {
    const blob = await response.blob();
    onProgress({ loaded: blob.size, total: total ?? blob.size });
    return blob;
  }

  const chunks: ArrayBuffer[] = [];
  let loaded = 0;
  onProgress({ loaded, total });

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    chunks.push(value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength) as ArrayBuffer);
    loaded += value.byteLength;
    onProgress({ loaded, total });
  }

  return new Blob(chunks, { type: mimeType || 'application/octet-stream' });
}

function saveBlob(blob: Blob, fileName: string) {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = fileName;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}
