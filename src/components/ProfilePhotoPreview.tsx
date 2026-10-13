'use client';

import Link from 'next/link';
import { X } from '@phosphor-icons/react';
import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react';

interface ProfilePhotoPreviewProps {
  src: string;
  alt: string;
  triggerLabel: string;
  className: string;
  children: ReactNode;
  profileHref?: string;
}

export default function ProfilePhotoPreview({
  src,
  alt,
  triggerLabel,
  className,
  children,
  profileHref,
}: ProfilePhotoPreviewProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (isOpen && dialog && !dialog.open) dialog.showModal();
  }, [isOpen]);

  useEffect(() => () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
  }, []);

  function closePreview() {
    if (closeTimerRef.current) return;
    setIsClosing(true);
    closeTimerRef.current = setTimeout(() => {
      const dialog = dialogRef.current;
      if (dialog?.open) dialog.close();
      setIsOpen(false);
      setIsClosing(false);
      closeTimerRef.current = null;
    }, 180);
  }

  function handleDialogClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) closePreview();
  }

  function handleDialogClose() {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = null;
    setIsOpen(false);
    setIsClosing(false);
  }

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={() => setIsOpen(true)}
        aria-label={triggerLabel}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        {children}
      </button>

      <dialog
        ref={dialogRef}
        className="profile-photo-lightbox"
        data-state={isClosing ? 'closing' : 'open'}
        aria-label="Foto de perfil ampliada"
        onCancel={(event) => {
          event.preventDefault();
          closePreview();
        }}
        onClick={handleDialogClick}
        onClose={handleDialogClose}
      >
        <div className="profile-photo-lightbox__content">
          <button
            type="button"
            className="profile-photo-lightbox__close"
            onClick={closePreview}
            aria-label="Fechar foto ampliada"
            autoFocus
          >
            <X size={21} weight="bold" aria-hidden="true" />
          </button>

          <div className="profile-photo-lightbox__image-wrap">
            {/* Use a URL original para não ampliar a miniatura otimizada do avatar. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="profile-photo-lightbox__image" src={src} alt={alt} />
          </div>

          {profileHref && (
            <Link
              className="profile-photo-lightbox__profile-link"
              href={profileHref}
              onClick={closePreview}
            >
              Abrir perfil
            </Link>
          )}
        </div>
      </dialog>
    </>
  );
}
