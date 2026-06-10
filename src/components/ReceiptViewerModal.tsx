'use client';

import { type PointerEvent, type TouchEvent, type WheelEvent, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowSquareOut,
  DownloadSimple,
  FileText,
  MagnifyingGlassMinus,
  MagnifyingGlassPlus,
  X,
} from '@phosphor-icons/react';

type TransferProgress = {
  loaded: number;
  total: number | null;
};

type PreviewAsset = {
  blob: Blob;
  objectUrl: string;
};

type PanState = {
  pointerId: number;
  startX: number;
  startY: number;
  scrollLeft: number;
  scrollTop: number;
  locked: boolean;
};

type SheetGestureState = {
  pointerId: number;
  startX: number;
  startY: number;
  startTime: number;
  locked: boolean;
};

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.25;
const DOUBLE_TAP_MS = 280;
const DOUBLE_TAP_MAX_DISTANCE = 28;
const GESTURE_LOCK_DISTANCE = 12;
const SWIPE_CLOSE_DISTANCE = 80;
const SWIPE_CLOSE_VELOCITY = 0.65;
const RECEIPT_HINT_KEY = 'moneda:receipt-gesture-hint-seen';
const IMAGE_BASE_SIZE = 'min(100%, calc(100dvh - 170px))';

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
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [sheetDragY, setSheetDragY] = useState(0);
  const [isSheetDragging, setIsSheetDragging] = useState(false);
  const [showGestureHint, setShowGestureHint] = useState(false);
  const [imageAspectRatio, setImageAspectRatio] = useState<number | null>(null);
  const previewViewportRef = useRef<HTMLDivElement | null>(null);
  const panStateRef = useRef<PanState | null>(null);
  const sheetGestureRef = useRef<SheetGestureState | null>(null);
  const pinchDistanceRef = useRef<number | null>(null);
  const isPinchingRef = useRef(false);
  const lastTapRef = useRef<{ time: number; x: number; y: number } | null>(null);
  const suppressClickUntilRef = useRef(0);

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
    setSheetDragY(0);
    setIsSheetDragging(false);
    sheetGestureRef.current = null;
    window.setTimeout(onClose, 180);
  }, [onClose]);

  useEffect(() => {
    if (!isOpen || !url) {
      setPreviewProgress(null);
      setPreviewError('');
      setZoom(1);
      setIsPanning(false);
      setSheetDragY(0);
      setIsSheetDragging(false);
      setImageAspectRatio(null);
      panStateRef.current = null;
      sheetGestureRef.current = null;
      pinchDistanceRef.current = null;
      isPinchingRef.current = false;
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
    setZoom(1);
    setIsPanning(false);
    setSheetDragY(0);
    setIsSheetDragging(false);
    setImageAspectRatio(null);
    panStateRef.current = null;
    sheetGestureRef.current = null;
    pinchDistanceRef.current = null;
    isPinchingRef.current = false;
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

  const changeZoom = useCallback((nextZoom: number | ((currentZoom: number) => number)) => {
    setZoom((currentZoom) => {
      const value = typeof nextZoom === 'function' ? nextZoom(currentZoom) : nextZoom;
      return clamp(value, MIN_ZOOM, MAX_ZOOM);
    });
  }, []);

  const zoomIn = useCallback(() => changeZoom((currentZoom) => currentZoom + ZOOM_STEP), [changeZoom]);
  const zoomOut = useCallback(() => changeZoom((currentZoom) => currentZoom - ZOOM_STEP), [changeZoom]);

  const centerPreview = useCallback(() => {
    requestAnimationFrame(() => {
      const viewport = previewViewportRef.current;
      if (!viewport) return;
      viewport.scrollLeft = Math.max(0, (viewport.scrollWidth - viewport.clientWidth) / 2);
      viewport.scrollTop = Math.max(0, (viewport.scrollHeight - viewport.clientHeight) / 2);
    });
  }, []);

  useEffect(() => {
    if (!isOpen || !mimeType.startsWith('image/')) return;
    if (window.sessionStorage.getItem(RECEIPT_HINT_KEY) === '1') return;

    setShowGestureHint(true);
    window.sessionStorage.setItem(RECEIPT_HINT_KEY, '1');
    const timer = window.setTimeout(() => setShowGestureHint(false), 3600);
    return () => window.clearTimeout(timer);
  }, [isOpen, mimeType]);

  useEffect(() => {
    if (zoom <= MIN_ZOOM) {
      panStateRef.current = null;
      setIsPanning(false);
      requestAnimationFrame(() => {
        const viewport = previewViewportRef.current;
        if (!viewport) return;
        viewport.scrollLeft = 0;
        viewport.scrollTop = 0;
      });
    } else {
      centerPreview();
    }
  }, [centerPreview, zoom]);

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
      if (event.key === 'Escape') {
        requestClose();
        return;
      }

      if (!mimeType.startsWith('image/') || (!event.ctrlKey && !event.metaKey)) return;

      if (event.key === '+' || event.key === '=') {
        event.preventDefault();
        zoomIn();
      } else if (event.key === '-' || event.key === '_') {
        event.preventDefault();
        zoomOut();
      } else if (event.key === '0') {
        event.preventDefault();
        changeZoom(1);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [changeZoom, isOpen, mimeType, requestClose, zoomIn, zoomOut]);

  const handlePreviewWheel = useCallback((event: WheelEvent<HTMLDivElement>) => {
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault();
    changeZoom((currentZoom) => currentZoom + (event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP));
  }, [changeZoom]);

  const handlePreviewPointerDown = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (isPinchingRef.current || (zoom <= MIN_ZOOM && !event.ctrlKey && !event.metaKey)) return;

    const viewport = previewViewportRef.current;
    if (!viewport) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    panStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      scrollLeft: viewport.scrollLeft,
      scrollTop: viewport.scrollTop,
      locked: false,
    };
  }, [zoom]);

  const handlePreviewPointerMove = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const panState = panStateRef.current;
    const viewport = previewViewportRef.current;
    if (!panState || !viewport || panState.pointerId !== event.pointerId) return;

    const dx = event.clientX - panState.startX;
    const dy = event.clientY - panState.startY;
    if (!panState.locked) {
      if (Math.hypot(dx, dy) < GESTURE_LOCK_DISTANCE) return;
      panState.locked = true;
      setIsPanning(true);
    }

    event.preventDefault();
    viewport.scrollLeft = panState.scrollLeft - dx;
    viewport.scrollTop = panState.scrollTop - dy;
  }, []);

  const stopPreviewPan = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const panState = panStateRef.current;
    if (panState?.pointerId !== event.pointerId) return;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (panState.locked) {
      suppressClickUntilRef.current = performance.now() + 160;
      lastTapRef.current = null;
    }
    panStateRef.current = null;
    setIsPanning(false);
  }, []);

  const handlePreviewTouchStart = useCallback((event: TouchEvent<HTMLDivElement>) => {
    if (event.touches.length !== 2) {
      pinchDistanceRef.current = null;
      isPinchingRef.current = false;
      return;
    }

    panStateRef.current = null;
    setIsPanning(false);
    isPinchingRef.current = true;
    pinchDistanceRef.current = getTouchDistance(event.touches);
  }, []);

  const handlePreviewTouchMove = useCallback((event: TouchEvent<HTMLDivElement>) => {
    if (event.touches.length !== 2) return;

    event.preventDefault();
    const distance = getTouchDistance(event.touches);
    const previousDistance = pinchDistanceRef.current;
    pinchDistanceRef.current = distance;

    if (!previousDistance || previousDistance <= 0) return;
    changeZoom((currentZoom) => currentZoom * (distance / previousDistance));
  }, [changeZoom]);

  const handlePreviewTouchEnd = useCallback((event: TouchEvent<HTMLDivElement>) => {
    if (event.touches.length < 2) {
      pinchDistanceRef.current = null;
      isPinchingRef.current = false;
    }
  }, []);

  const handlePreviewClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (performance.now() < suppressClickUntilRef.current) return;
    if (!mimeType.startsWith('image/') || !previewAsset || isPanning || isPinchingRef.current) return;

    const now = performance.now();
    const previousTap = lastTapRef.current;
    lastTapRef.current = { time: now, x: event.clientX, y: event.clientY };

    if (
      !previousTap ||
      now - previousTap.time > DOUBLE_TAP_MS ||
      Math.hypot(event.clientX - previousTap.x, event.clientY - previousTap.y) > DOUBLE_TAP_MAX_DISTANCE
    ) {
      return;
    }

    event.preventDefault();
    lastTapRef.current = null;
    const viewport = previewViewportRef.current;
    const nextZoom = zoom > 1 ? 1 : 2;

    if (viewport && nextZoom > 1) {
      const rect = viewport.getBoundingClientRect();
      const xRatio = (event.clientX - rect.left + viewport.scrollLeft) / Math.max(viewport.scrollWidth, 1);
      const yRatio = (event.clientY - rect.top + viewport.scrollTop) / Math.max(viewport.scrollHeight, 1);
      changeZoom(nextZoom);
      requestAnimationFrame(() => {
        viewport.scrollLeft = xRatio * viewport.scrollWidth - viewport.clientWidth / 2;
        viewport.scrollTop = yRatio * viewport.scrollHeight - viewport.clientHeight / 2;
      });
      return;
    }

    changeZoom(nextZoom);
  }, [changeZoom, isPanning, mimeType, previewAsset, zoom]);

  const handleSheetPointerDown = useCallback((event: PointerEvent<HTMLElement>) => {
    if (event.pointerType === 'mouse' || zoom > MIN_ZOOM || isPinchingRef.current) return;
    if (isInteractiveTarget(event.target)) return;

    sheetGestureRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startTime: performance.now(),
      locked: false,
    };
  }, [zoom]);

  const handleSheetPointerMove = useCallback((event: PointerEvent<HTMLElement>) => {
    const gesture = sheetGestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;

    const dx = event.clientX - gesture.startX;
    const dy = event.clientY - gesture.startY;
    if (!gesture.locked) {
      if (Math.hypot(dx, dy) < GESTURE_LOCK_DISTANCE) return;
      if (dy <= 0 || Math.abs(dx) > dy) {
        sheetGestureRef.current = null;
        return;
      }

      gesture.locked = true;
      setIsSheetDragging(true);
      event.currentTarget.setPointerCapture(event.pointerId);
    }

    event.preventDefault();
    setSheetDragY(Math.max(0, dy));
  }, []);

  const stopSheetGesture = useCallback((event: PointerEvent<HTMLElement>) => {
    const gesture = sheetGestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;

    const finalDragY = sheetDragY;
    const elapsed = Math.max(performance.now() - gesture.startTime, 1);
    const velocity = finalDragY / elapsed;
    sheetGestureRef.current = null;
    setIsSheetDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (finalDragY > SWIPE_CLOSE_DISTANCE || velocity > SWIPE_CLOSE_VELOCITY) {
      requestClose();
      return;
    }

    setSheetDragY(0);
  }, [requestClose, sheetDragY]);

  const cancelSheetGesture = useCallback((event: PointerEvent<HTMLElement>) => {
    if (sheetGestureRef.current?.pointerId === event.pointerId && event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    sheetGestureRef.current = null;
    setIsSheetDragging(false);
    setSheetDragY(0);
  }, []);

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
        style={{
          transform: sheetDragY > 0 ? `translateY(${sheetDragY}px)` : undefined,
          transition: isSheetDragging ? 'none' : undefined,
        }}
        role="dialog"
        aria-modal
        aria-label="Comprovante do gasto"
        onPointerDown={handleSheetPointerDown}
        onPointerMove={handleSheetPointerMove}
        onPointerUp={stopSheetGesture}
        onPointerCancel={cancelSheetGesture}
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
            className="gesture-icon-button flex h-9 w-9 items-center justify-center rounded-full hover:bg-[#F1F3F7]"
            aria-label="Abrir em nova aba"
          >
            <ArrowSquareOut size={18} className="text-[#6B7280]" />
          </a>
          {isImage && (
            <div className="flex shrink-0 items-center rounded-full bg-[#F6F7FA] p-0.5">
              <button
                type="button"
                onClick={zoomOut}
                disabled={zoom <= MIN_ZOOM}
                className="gesture-icon-button flex h-8 w-8 items-center justify-center rounded-full hover:bg-white disabled:cursor-not-allowed disabled:opacity-45"
                aria-label="Diminuir zoom"
              >
                <MagnifyingGlassMinus size={17} className="text-[#6B7280]" />
              </button>
              <span className="min-w-10 px-1 text-center text-[11px] font-semibold tabular-nums text-[#6B7280]">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={zoomIn}
                disabled={zoom >= MAX_ZOOM}
                className="gesture-icon-button flex h-8 w-8 items-center justify-center rounded-full hover:bg-white disabled:cursor-not-allowed disabled:opacity-45"
                aria-label="Aumentar zoom"
              >
                <MagnifyingGlassPlus size={17} className="text-[#6B7280]" />
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={downloadReceipt}
            disabled={downloadProgress !== null || previewProgress !== null}
            className="gesture-icon-button flex h-9 w-9 items-center justify-center rounded-full hover:bg-[#F1F3F7] disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Baixar comprovante"
            aria-busy={downloadProgress !== null || previewProgress !== null}
          >
            <DownloadSimple size={18} className="text-[#6B7280]" />
          </button>
          <button
            type="button"
            onClick={requestClose}
            className="gesture-icon-button flex h-9 w-9 items-center justify-center rounded-full hover:bg-[#F1F3F7]"
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

        <div className="relative min-h-0 flex-1 bg-[#10151C]">
          {showGestureHint && isImage && (
            <div className="pointer-events-none absolute left-1/2 top-3 z-10 -translate-x-1/2 rounded-full bg-black/58 px-3 py-1.5 text-[11px] font-semibold text-white shadow-lg backdrop-blur">
              Pinça para ampliar · toque duplo para zoom
            </div>
          )}
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
            <div
              ref={previewViewportRef}
              className={`h-full overflow-auto overscroll-contain p-3 ${
                isPanning ? 'cursor-grabbing' : 'cursor-grab'
              }`}
              style={{ touchAction: zoom > MIN_ZOOM ? 'none' : 'pan-y pinch-zoom' }}
              onPointerDown={handlePreviewPointerDown}
              onPointerMove={handlePreviewPointerMove}
              onPointerUp={stopPreviewPan}
              onPointerCancel={stopPreviewPan}
              onPointerLeave={stopPreviewPan}
              onClick={handlePreviewClick}
              onWheel={handlePreviewWheel}
              onTouchStart={handlePreviewTouchStart}
              onTouchMove={handlePreviewTouchMove}
              onTouchEnd={handlePreviewTouchEnd}
              onTouchCancel={handlePreviewTouchEnd}
            >
              <div
                className="grid min-h-full min-w-full place-items-center"
                style={{
                  padding: zoom > MIN_ZOOM ? '32px' : 0,
                }}
              >
                <div
                  className="flex shrink-0 items-center justify-center transition-[height,width] duration-100"
                  style={{
                    aspectRatio: imageAspectRatio ?? 1,
                    height: imageAspectRatio && imageAspectRatio < 1
                      ? `calc(${IMAGE_BASE_SIZE} * ${zoom})`
                      : 'auto',
                    width: !imageAspectRatio || imageAspectRatio >= 1
                      ? `calc(${IMAGE_BASE_SIZE} * ${zoom})`
                      : 'auto',
                  }}
                >
                  <img
                    src={previewAsset.objectUrl}
                    alt={`Comprovante ${fileName}`}
                    className="h-full w-full rounded-[10px] object-contain"
                    draggable={false}
                    onLoad={(event) => {
                      const { naturalWidth, naturalHeight } = event.currentTarget;
                      if (naturalWidth > 0 && naturalHeight > 0) {
                        setImageAspectRatio(naturalWidth / naturalHeight);
                        centerPreview();
                      }
                    }}
                  />
                </div>
              </div>
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

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getTouchDistance(touches: TouchEvent<HTMLDivElement>['touches']) {
  const first = touches.item(0);
  const second = touches.item(1);
  if (!first || !second) return 0;

  return Math.hypot(first.clientX - second.clientX, first.clientY - second.clientY);
}

function isInteractiveTarget(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest('a,button,input,select,textarea,[role="button"],[role="menuitem"]'));
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
